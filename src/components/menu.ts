/**
 * Menus: a trigger plus a popover panel. Roving focus, arrow/Home/End keys,
 * typeahead, Escape to return focus, outside pointerdown to dismiss. Attach
 * with `menu(trigger, panel)` or declaratively via `[data-menu="panel-id"]`.
 */
import { qsa } from "../core/dom";
import type { PopoverOptions } from "./popover";
import { closePopover, isPopoverOpen, openPopover } from "./popover";

export interface MenuOptions extends PopoverOptions {
  onSelect?: (item: HTMLElement) => void;
  /** Focus the first item on open. Default true. */
  focusFirst?: boolean;
}

export interface MenuController {
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
}

function items(panel: HTMLElement): HTMLElement[] {
  return qsa<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]), .ag-menu__item:not([disabled])', panel)
    .filter((item) => item.getClientRects().length > 0);
}

export function menu(trigger: HTMLElement, panel: HTMLElement, options: MenuOptions = {}): MenuController {
  if (!panel.id) panel.id = `ag-menu-${Math.random().toString(36).slice(2, 8)}`;
  panel.setAttribute("popover", "manual");
  panel.classList.add("ag-popover");
  if (panel.classList.contains("ag-menu")) panel.setAttribute("role", "menu");
  else if (!panel.hasAttribute("role")) panel.setAttribute("role", "menu");

  for (const item of items(panel)) {
    if (!item.hasAttribute("role")) item.setAttribute("role", "menuitem");
  }

  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", panel.id);

  let active: HTMLElement | null = null;
  let typeahead = "";
  let typeaheadTimer = 0;

  const setActive = (next: HTMLElement | null): void => {
    if (active && active !== next) delete active.dataset.active;
    active = next;
    if (active) {
      active.dataset.active = "true";
      active.focus({ preventScroll: true });
      active.scrollIntoView({ block: "nearest" });
    }
  };

  const open = (): void => {
    if (isPopoverOpen(panel)) return;
    openPopover(panel, trigger, { placement: options.placement ?? "bottom-start", ...options });
    trigger.setAttribute("aria-expanded", "true");
    if (options.focusFirst !== false) {
      requestAnimationFrame(() => {
        const list = items(panel);
        setActive(list[0] ?? null);
        if (!list.length) panel.focus({ preventScroll: true });
      });
    }
  };

  const close = (returnFocus = true): void => {
    if (!isPopoverOpen(panel)) return;
    void closePopover(panel);
    trigger.setAttribute("aria-expanded", "false");
    if (active) delete active.dataset.active;
    active = null;
    if (returnFocus) trigger.focus({ preventScroll: true });
  };

  const toggle = (): void => {
    if (isPopoverOpen(panel)) close();
    else open();
  };

  const onTriggerClick = (event: Event): void => {
    event.preventDefault();
    toggle();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (!isPopoverOpen(panel)) return;
    const target = event.target as Node;
    if (panel.contains(target) || trigger.contains(target)) return;
    close(false);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isPopoverOpen(panel)) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
      return;
    }

    const list = items(panel);
    const index = active ? list.indexOf(active) : -1;

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        setActive(list[Math.min(list.length - 1, index + 1)] ?? null);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive(list[Math.max(0, index - 1)] ?? null);
        break;
      case "Home":
        event.preventDefault();
        setActive(list[0] ?? null);
        break;
      case "End":
        event.preventDefault();
        setActive(list[list.length - 1] ?? null);
        break;
      case "Enter":
      case " ":
        if (active) {
          event.preventDefault();
          active.click();
        }
        break;
      default: {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        typeahead += event.key.toLowerCase();
        clearTimeout(typeaheadTimer);
        typeaheadTimer = window.setTimeout(() => (typeahead = ""), 500);
        const match = list.find((item) =>
          (item.dataset.label ?? item.textContent ?? "").trim().toLowerCase().startsWith(typeahead),
        );
        if (match) setActive(match);
      }
    }
  };

  const onPanelClick = (event: MouseEvent): void => {
    const item = (event.target as Element).closest<HTMLElement>('[role="menuitem"], .ag-menu__item');
    if (!item || !panel.contains(item)) return;
    options.onSelect?.(item);
    if (item.hasAttribute("data-menu-keep-open")) return;
    close();
  };

  trigger.addEventListener("click", onTriggerClick);
  trigger.addEventListener("keydown", onKeydown);
  panel.addEventListener("keydown", onKeydown);
  panel.addEventListener("click", onPanelClick);
  document.addEventListener("pointerdown", onPointerDown, true);

  return {
    open,
    close,
    toggle,
    destroy: () => {
      close(false);
      trigger.removeEventListener("click", onTriggerClick);
      trigger.removeEventListener("keydown", onKeydown);
      panel.removeEventListener("keydown", onKeydown);
      panel.removeEventListener("click", onPanelClick);
      document.removeEventListener("pointerdown", onPointerDown, true);
      trigger.setAttribute("aria-expanded", "false");
    },
  };
}

/** Auto-wire every `[data-menu="panel-id"]` trigger under `root`. */
export function initMenus(root: ParentNode = document): () => void {
  const controllers: MenuController[] = [];
  for (const trigger of qsa<HTMLElement>("[data-menu]", root)) {
    const id = trigger.dataset.menu;
    if (!id) continue;
    const panel = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!panel) continue;
    controllers.push(menu(trigger, panel));
  }
  return () => {
    for (const controller of controllers) controller.destroy();
  };
}
