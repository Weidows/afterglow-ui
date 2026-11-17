/** Frame scheduling helpers. Everything visual goes through here. */

export function frameThrottle<A extends unknown[]>(fn: (...args: A) => void): ((...args: A) => void) & { cancel(): void } {
  let frame = 0;
  let pending: A | null = null;

  const run = (): void => {
    frame = 0;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };

  const wrapped = (...args: A): void => {
    pending = args;
    if (frame) return;
    frame = requestAnimationFrame(run);
  };

  wrapped.cancel = (): void => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
  };

  return wrapped;
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Run `fn` every frame until the returned disposer is called. */
export function onFrame(fn: (time: number, delta: number) => void): () => void {
  let frame = 0;
  let previous = performance.now();
  const tick = (time: number): void => {
    const delta = time - previous;
    previous = time;
    fn(time, delta);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolve when an element's entrance animation ends, or after `fallback` ms. */
export function animationEnd(el: Element, fallback = 400): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, fallback);
    el.addEventListener("animationend", finish, { once: true });
  });
}

/** Like animationEnd, but only for the named animation (and not a child's). */
export function animationEndNamed(el: Element, name: string, fallback = 400): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", onEnd as EventListener);
      clearTimeout(timer);
      resolve();
    };
    const onEnd = (event: AnimationEvent): void => {
      if (event.target === el && event.animationName === name) finish();
    };
    const timer = setTimeout(finish, fallback);
    el.addEventListener("animationend", onEnd as EventListener);
  });
}
