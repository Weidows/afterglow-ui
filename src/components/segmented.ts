/**
 * Segmented control. Single-select by default (aria-pressed + a sliding
 * thumb); add data-multi="true" for independent toggles, in which case CSS
 * paints the pressed cells and the thumb is not used.
 */
import { el, qsa } from "../core/dom";

export interface SegmentedOptions {
  multi?: boolean;
  onChange?: (values: string[]) => void;
}

export interface SegmentedController {
  active(): string[];
  setActive(values: string[] | string): void;
  refresh(): void;
  destroy(): void;
}

function valueOf(button: HTMLElement): string {
  return button.dataset.value ?? button.getAttribute("value") ?? (button.textContent ?? "").trim();
}

export function segmented(root: HTMLElement, options: SegmentedOptions = {}): SegmentedController {
  const buttons = qsa<HTMLElement>(".ag-seg", root);
  if (!buttons.length) throw new Error("[afterglow] segmented(): no .ag-seg found");
  const multi = options.multi ?? root.dataset.multi === "true";

  buttons.forEach((button, index) => {
    if (!button.hasAttribute("aria-pressed")) {
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    }
    if (!button.hasAttribute("type")) button.setAttribute("type", "button");
    if (!button.hasAttribute("tabindex")) button.setAttribute("tabindex", index === 0 ? "0" : "-1");
  });

  let thumb: HTMLElement | null = null;
  if (!multi) {
    thumb = root.querySelector<HTMLElement>(".ag-segmented__thumb");
    if (!thumb) {
      thumb = el("span", { class: "ag-segmented__thumb", "aria-hidden": "true" });
      root.prepend(thumb);
    }
  }

  const paint = (): void => {
    const active = buttons.find((button) => button.getAttribute("aria-pressed") === "true");
    for (const button of buttons) {
      button.setAttribute("tabindex", button === (active ?? buttons[0]) ? "0" : "-1");
    }
    if (!thumb) return;
    if (!active) {
      thumb.style.width = "0px";
      thumb.style.opacity = "0";
      return;
    }
    thumb.style.opacity = "1";
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
  };

  const select = (next: HTMLElement): void => {
    if (multi) {
      next.setAttribute("aria-pressed", next.getAttribute("aria-pressed") === "true" ? "false" : "true");
    } else {
      for (const button of buttons) button.setAttribute("aria-pressed", String(button === next));
    }
    paint();
    options.onChange?.(active());
  };

  const active = (): string[] =>
    buttons.filter((button) => button.getAttribute("aria-pressed") === "true").map(valueOf);

  const onClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLElement>(".ag-seg");
    if (!button || !root.contains(button)) return;
    select(button);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = buttons[(index + 1) % buttons.length];
      next?.focus({ preventScroll: true });
      if (next && !multi) select(next);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = buttons[(index - 1 + buttons.length) % buttons.length];
      next?.focus({ preventScroll: true });
      if (next && !multi) select(next);
    } else if (event.key === "Home") {
      event.preventDefault();
      buttons[0]?.focus({ preventScroll: true });
      if (buttons[0] && !multi) select(buttons[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = buttons[buttons.length - 1];
      last?.focus({ preventScroll: true });
      if (last && !multi) select(last);
    }
  };

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  const observer = new ResizeObserver(paint);
  observer.observe(root);
  for (const button of buttons) observer.observe(button);
  paint();

  return {
    active,
    setActive: (values) => {
      const wanted = new Set(Array.isArray(values) ? values : [values]);
      buttons.forEach((button, index) => {
        const on = wanted.has(valueOf(button));
        button.setAttribute("aria-pressed", String(multi ? on : on && index >= 0));
      });
      if (!multi) {
        // Guarantee exactly one pressed cell for single-select.
        const pressed = buttons.filter((button) => button.getAttribute("aria-pressed") === "true");
        if (pressed.length !== 1) {
          buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === 0)));
        }
      }
      paint();
    },
    refresh: paint,
    destroy: () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      observer.disconnect();
    },
  };
}

export function initSegmented(root: ParentNode = document): () => void {
  const controllers: SegmentedController[] = [];
  for (const host of qsa<HTMLElement>(".ag-segmented", root)) {
    try {
      controllers.push(segmented(host));
    } catch (error) {
      console.error(error);
    }
  }
  return () => {
    for (const controller of controllers) controller.destroy();
  };
}
