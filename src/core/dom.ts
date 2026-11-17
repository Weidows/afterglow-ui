/** Tiny DOM helpers. No framework, no virtual DOM — just typed shortcuts. */

export type Child = Node | string | number | null | undefined | false;

type AttrValue = string | number | boolean | null | undefined | ((event: Event) => void) | Record<string, string | number>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [name, raw] of Object.entries(attrs)) {
    if (raw == null || raw === false) continue;
    if (name === "class" || name === "className") {
      node.className = String(raw);
      continue;
    }
    if (name === "style" && typeof raw === "object") {
      for (const [property, value] of Object.entries(raw)) {
        node.style.setProperty(property, String(value));
      }
      continue;
    }
    if (name === "dataset" && typeof raw === "object") {
      for (const [key, value] of Object.entries(raw)) node.dataset[key] = String(value);
      continue;
    }
    if (name === "html") {
      // Escape hatch for static markup (icon sprites, trusted templates).
      // Never pass user or remote data here; use textContent for that.
      node.innerHTML = String(raw);
      continue;
    }
    if (name.startsWith("on") && typeof raw === "function") {
      node.addEventListener(name.slice(2).toLowerCase(), raw as EventListener);
      continue;
    }
    if (raw === true) {
      node.setAttribute(name, "");
      continue;
    }
    node.setAttribute(name, String(raw));
  }

  append(node, children);
  return node;
}

export function append(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child == null || child === false) continue;
    parent.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
  }
}

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

export function qsa<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

export function setText(node: Element, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

/** Delegated listener; returns its own disposer. */
export function delegate<K extends keyof HTMLElementEventMap>(
  root: ParentNode,
  type: K,
  selector: string,
  handler: (event: HTMLElementEventMap[K], target: HTMLElement) => void,
): () => void {
  const listener = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
    if (!target || !root.contains(target)) return;
    handler(event as HTMLElementEventMap[K], target);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

/** One-shot flag for entrance animations that must not replay. */
export function once<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  const wrapped = (event: Event): void => {
    target.removeEventListener(type, wrapped as EventListener);
    handler(event as HTMLElementEventMap[K]);
  };
  target.addEventListener(type, wrapped as EventListener, options);
  return () => target.removeEventListener(type, wrapped as EventListener);
}
