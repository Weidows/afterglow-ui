/**
 * Keyed list reconciliation for plain DOM. Reorders existing nodes instead of
 * rebuilding them, so a table that re-sorts every second keeps its focus,
 * scroll position and compositor layers.
 */

export type Key = string | number;

export interface KeyedOptions<T> {
  key: (item: T) => Key;
  create: (item: T) => HTMLElement;
  /** Called on reused and freshly created nodes alike. Write only what changed. */
  update?: (el: HTMLElement, item: T, index: number) => void;
  remove?: (el: HTMLElement) => void;
}

export class KeyedList<T> {
  private nodes = new Map<Key, HTMLElement>();
  private keys: Key[] = [];

  constructor(
    private readonly parent: HTMLElement,
    private readonly options: KeyedOptions<T>,
  ) {}

  set(items: readonly T[]): void {
    const { key, create, update, remove } = this.options;
    const nextEls: HTMLElement[] = [];
    const nextKeys: Key[] = [];
    const keep = new Set<Key>();

    for (let index = 0; index < items.length; index++) {
      const item = items[index] as T;
      const id = key(item);
      keep.add(id);
      const existing = this.nodes.get(id);
      const node = existing ?? create(item);
      update?.(node, item, index);
      nextEls.push(node);
      nextKeys.push(id);
    }

    for (const [id, node] of this.nodes) {
      if (keep.has(id)) continue;
      remove?.(node);
      node.remove();
    }

    // Longest increasing subsequence of previous positions: those nodes are
    // already in the right relative order and never move.
    const previous = new Map<Key, number>();
    for (let index = 0; index < this.keys.length; index++) previous.set(this.keys[index] as Key, index);
    const sequence = nextKeys.map((id) => previous.get(id) ?? -1);
    const stable = lisIndices(sequence);

    let anchor: HTMLElement | null = null;
    for (let index = nextEls.length - 1; index >= 0; index--) {
      const node = nextEls[index] as HTMLElement;
      if (!stable.has(index)) this.parent.insertBefore(node, anchor);
      anchor = node;
    }

    this.nodes = new Map();
    for (let index = 0; index < nextEls.length; index++) {
      this.nodes.set(nextKeys[index] as Key, nextEls[index] as HTMLElement);
    }
    this.keys = nextKeys;
  }

  get(key: Key): HTMLElement | undefined {
    return this.nodes.get(key);
  }

  get size(): number {
    return this.nodes.size;
  }

  clear(): void {
    for (const node of this.nodes.values()) {
      this.options.remove?.(node);
      node.remove();
    }
    this.nodes.clear();
    this.keys = [];
  }
}

/**
 * Indices (into `sequence`) of one longest strictly increasing subsequence,
 * ignoring negative sentinels. Classic patience sorting with back-pointers.
 */
export function lisIndices(sequence: readonly number[]): Set<number> {
  const previous = new Int32Array(sequence.length).fill(-1);
  const tails: number[] = [];

  for (let index = 0; index < sequence.length; index++) {
    const value = sequence[index] as number;
    if (value < 0) continue;

    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((sequence[tails[mid] as number] as number) < value) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) previous[index] = tails[lo - 1] as number;
    tails[lo] = index;
  }

  const result = new Set<number>();
  let cursor = tails.length ? (tails[tails.length - 1] as number) : -1;
  while (cursor >= 0) {
    result.add(cursor);
    cursor = previous[cursor] as number;
  }
  return result;
}
