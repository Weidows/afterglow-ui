/**
 * A ~1.5 kB reactive core: signals, computed values and effects.
 *
 * Design notes
 * - Push-invalidate, pull-read: setting a signal only marks downstream
 *   computeds dirty and schedules effects on a microtask. Values are read
 *   once per flush, never per notification.
 * - No proxies, no virtual DOM. Bind the result to a DOM property and the
 *   node writes only when the value actually changed.
 * - Dependencies are re-collected on every effect run, so conditional reads
 *   work without manual bookkeeping.
 */

export type Dispose = () => void;

export interface ReadonlySignal<T> {
  (): T;
  /** Read without registering a dependency. */
  peek(): T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  set(value: T): void;
  update(fn: (current: T) => T): void;
}

interface Reader {
  readonly sources: Set<Source>;
  invalidate(): void;
}

interface Source {
  readonly readers: Set<Reader>;
}

let active: Reader | null = null;

function track(source: Source): void {
  if (!active) return;
  source.readers.add(active);
  active.sources.add(source);
}

class SignalNode<T> implements Source {
  readonly readers = new Set<Reader>();
  constructor(private value: T, private readonly equals: (a: T, b: T) => boolean) {}

  read(): T {
    track(this);
    return this.value;
  }

  peek(): T {
    return this.value;
  }

  set(next: T): void {
    if (this.equals(this.value, next)) return;
    this.value = next;
    // Copy before iterating: an effect may detach itself while we walk.
    for (const reader of [...this.readers]) reader.invalidate();
  }
}

class ComputedNode<T> implements Source, Reader {
  readonly readers = new Set<Reader>();
  readonly sources = new Set<Source>();
  private value!: T;
  private stale = true;
  private computed = false;

  constructor(private readonly fn: () => T, private readonly equals: (a: T, b: T) => boolean) {}

  read(): T {
    if (this.stale) this.recompute();
    track(this);
    return this.value;
  }

  peek(): T {
    if (this.stale) this.recompute();
    return this.value;
  }

  invalidate(): void {
    if (this.stale) return;
    this.stale = true;
    for (const reader of this.readers) reader.invalidate();
  }

  dispose(): void {
    for (const source of this.sources) source.readers.delete(this);
    this.sources.clear();
    this.readers.clear();
    this.stale = true;
  }

  private recompute(): void {
    for (const source of this.sources) source.readers.delete(this);
    this.sources.clear();
    const previous = active;
    active = this;
    try {
      const next = this.fn();
      this.value = this.computed && this.equals(this.value, next) ? this.value : next;
      this.computed = true;
    } finally {
      active = previous;
      this.stale = false;
    }
  }
}

class EffectNode implements Reader {
  readonly sources = new Set<Source>();
  private cleanups: Array<() => void> = [];
  private closed = false;

  constructor(private readonly fn: () => void | Dispose) {}

  invalidate(): void {
    queue(this);
  }

  run(): void {
    if (this.closed) return;
    for (const source of this.sources) source.readers.delete(this);
    this.sources.clear();
    this.runCleanups();
    const previous = active;
    active = this;
    try {
      const cleanup = this.fn();
      if (typeof cleanup === "function") this.cleanups.push(cleanup);
    } finally {
      active = previous;
    }
  }

  addCleanup(fn: Dispose): void {
    this.cleanups.push(fn);
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const source of this.sources) source.readers.delete(this);
    this.sources.clear();
    this.runCleanups();
  }

  private runCleanups(): void {
    if (!this.cleanups.length) return;
    const list = this.cleanups;
    this.cleanups = [];
    for (const fn of list) {
      try {
        fn();
      } catch (error) {
        console.error("[afterglow] effect cleanup failed", error);
      }
    }
  }
}

const queueSet = new Set<EffectNode>();
let flushQueued = false;

function queue(effect: EffectNode): void {
  queueSet.add(effect);
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(flushEffects);
}

/** Run every queued effect now. Handy in tests and in frame budgets. */
export function flushEffects(): void {
  flushQueued = false;
  const list = [...queueSet];
  queueSet.clear();
  for (const effect of list) effect.run();
}

export function signal<T>(
  initial: T,
  options: { equals?: (a: T, b: T) => boolean } = {},
): Signal<T> {
  const node = new SignalNode(initial, options.equals ?? Object.is);
  const read = (() => node.read()) as Signal<T>;
  read.peek = () => node.peek();
  read.set = (value: T) => node.set(value);
  read.update = (fn: (current: T) => T) => node.set(fn(node.peek()));
  return read;
}

export interface Computed<T> extends ReadonlySignal<T> {
  dispose(): void;
}

export function computed<T>(
  fn: () => T,
  options: { equals?: (a: T, b: T) => boolean } = {},
): Computed<T> {
  const node = new ComputedNode(fn, options.equals ?? Object.is);
  const read = (() => node.read()) as Computed<T>;
  read.peek = () => node.peek();
  read.dispose = () => node.dispose();
  return read;
}

/** Run `fn` now and again whenever a signal it read changes. */
export function effect(fn: () => void | Dispose): Dispose {
  const node = new EffectNode(fn);
  node.run();
  return () => node.dispose();
}

/** Register cleanup for the effect currently running. No-op outside one. */
export function onCleanup(fn: Dispose): void {
  if (active instanceof EffectNode) active.addCleanup(fn);
}

/** Read signals without subscribing the current effect to them. */
export function untracked<T>(fn: () => T): T {
  const previous = active;
  active = null;
  try {
    return fn();
  } finally {
    active = previous;
  }
}

/**
 * Property-level binding. The writer sees the value only when it changes, so
 * `el.textContent = v` never fires for an identical frame sample.
 */
export function bind<T>(source: ReadonlySignal<T>, write: (value: T) => void): Dispose {
  let first = true;
  let last: T;
  return effect(() => {
    const value = source();
    if (!first && Object.is(value, last)) return;
    first = false;
    last = value;
    write(value);
  });
}
