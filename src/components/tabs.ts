/**
 * Tabs with one shared indicator. The indicator is positioned from
 * offsetLeft/offsetTop (scroll-independent) and moved with transform, so
 * selection changes repaint two properties instead of relayouting the list.
 */
import { el, qsa } from "../core/dom";

export interface TabsOptions {
  initial?: number;
  onChange?: (id: string, index: number) => void;
}

export interface TabsController {
  select(index: number, focus?: boolean): void;
  current(): number;
  refresh(): void;
  destroy(): void;
}

let uid = 0;

function ensureIndicator(list: HTMLElement): HTMLElement {
  const existing = list.querySelector<HTMLElement>(".ag-tablist__indicator");
  if (existing) return existing;
  const indicator = el("span", { class: "ag-tablist__indicator", "aria-hidden": "true" });
  list.appendChild(indicator);
  return indicator;
}

export function tabs(root: HTMLElement, options: TabsOptions = {}): TabsController {
  const list = root.querySelector<HTMLElement>(".ag-tablist");
  if (!list) throw new Error("[afterglow] tabs(): missing .ag-tablist");
  const buttons = qsa<HTMLElement>('[role="tab"]', list);
  if (!buttons.length) throw new Error("[afterglow] tabs(): no [role=tab] found");

  const vertical = root.dataset.orientation === "vertical";
  const indicator = ensureIndicator(list);
  const panels = qsa<HTMLElement>('[role="tabpanel"]', root);
  const scope = ++uid;

  buttons.forEach((button, index) => {
    if (!button.id) button.id = `ag-tab-${scope}-${index}`;
    button.setAttribute("tabindex", "-1");
    const target = button.getAttribute("aria-controls");
    const panel = target ? document.getElementById(target) : panels[index];
    if (panel && !panel.hasAttribute("role")) panel.setAttribute("role", "tabpanel");
    if (panel) {
      panel.id ||= `ag-tabpanel-${scope}-${index}`;
      button.setAttribute("aria-controls", panel.id);
      if (!panel.hasAttribute("aria-labelledby")) panel.setAttribute("aria-labelledby", button.id);
    }
  });

  const panelOf = (index: number): HTMLElement | null => {
    const id = buttons[index]?.getAttribute("aria-controls");
    return id ? document.getElementById(id) : (panels[index] ?? null);
  };

  let current = -1;

  const paint = (): void => {
    const active = buttons[current];
    if (!active) return;
    if (vertical) {
      indicator.style.transform = `translateY(${active.offsetTop}px)`;
      indicator.style.height = `${active.offsetHeight}px`;
    } else {
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      indicator.style.width = `${active.offsetWidth}px`;
    }
  };

  const select = (index: number, focus = false): void => {
    const next = Math.max(0, Math.min(buttons.length - 1, index));
    if (next === current) {
      if (focus) buttons[next]?.focus({ preventScroll: true });
      return;
    }
    const previous = current;
    current = next;

    buttons.forEach((button, i) => {
      const selected = i === next;
      button.setAttribute("aria-selected", String(selected));
      button.setAttribute("tabindex", selected ? "0" : "-1");
      const panel = panelOf(i);
      if (panel) panel.hidden = !selected;
    });

    paint();
    if (focus) buttons[next]?.focus({ preventScroll: true });
    if (previous !== -1) {
      const id = buttons[next]?.id ?? String(next);
      options.onChange?.(id, next);
    }
  };

  const onClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLElement>('[role="tab"]');
    if (!button) return;
    const index = buttons.indexOf(button);
    if (index >= 0) select(index);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const key = event.key;
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    const forward = vertical ? "ArrowDown" : "ArrowRight";

    if (key === back || key === forward) {
      event.preventDefault();
      const step = key === forward ? 1 : -1;
      select((current + step + buttons.length) % buttons.length, true);
    } else if (key === "Home") {
      event.preventDefault();
      select(0, true);
    } else if (key === "End") {
      event.preventDefault();
      select(buttons.length - 1, true);
    }
  };

  list.addEventListener("click", onClick);
  list.addEventListener("keydown", onKeydown);

  const observer = new ResizeObserver(paint);
  observer.observe(list);
  for (const button of buttons) observer.observe(button);

  const initial = options.initial ??
    buttons.findIndex((button) => button.getAttribute("aria-selected") === "true");
  select(initial >= 0 ? initial : 0);
  paint();
  void document.fonts?.ready.then(() => paint());

  return {
    select,
    current: () => current,
    refresh: paint,
    destroy: () => {
      list.removeEventListener("click", onClick);
      list.removeEventListener("keydown", onKeydown);
      observer.disconnect();
    },
  };
}

/** Auto-wire every `[data-ag-tabs]` element under `root`. */
export function initTabs(root: ParentNode = document): () => void {
  const controllers: TabsController[] = [];
  for (const host of qsa<HTMLElement>("[data-ag-tabs]", root)) {
    try {
      controllers.push(tabs(host));
    } catch (error) {
      console.error(error);
    }
  }
  return () => {
    for (const controller of controllers) controller.destroy();
  };
}
