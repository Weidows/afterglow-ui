/**
 * Range input enhancement: paints the filled track from --ag-pct and shows a
 * value bubble while dragging or focused. The input itself stays native, so
 * keyboard, form and screen-reader behavior are untouched.
 */
import { el, qsa } from "../core/dom";

export interface SliderOptions {
  format?: (value: number) => string;
}

export interface SliderController {
  refresh(): void;
  destroy(): void;
}

const registry = new WeakMap<HTMLInputElement, SliderController>();

function defaultFormat(value: number, input: HTMLInputElement): string {
  const step = Number(input.step || 1);
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
  return value.toFixed(decimals) + (input.dataset.unit ?? "");
}

export function enhanceRange(input: HTMLInputElement, options: SliderOptions = {}): SliderController {
  const existing = registry.get(input);
  if (existing) return existing;

  input.classList.add("ag-range");

  let wrapper = input.closest<HTMLElement>(".ag-slider");
  let created = false;
  if (!wrapper) {
    wrapper = el("div", { class: "ag-slider" });
    input.parentNode?.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    created = true;
  }

  const bubble = el("span", { class: "ag-slider__bubble", "aria-hidden": "true" });
  if (!wrapper.querySelector(".ag-slider__bubble")) wrapper.appendChild(bubble);

  const refresh = (): void => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const ratio = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
    const percent = `${(ratio * 100).toFixed(2)}%`;
    wrapper?.style.setProperty("--ag-pct", percent);
    bubble.style.left = percent;
    const text = options.format ? options.format(value) : defaultFormat(value, input);
    bubble.textContent = text;
    input.setAttribute("aria-valuetext", text);
  };

  const setActive = (active: boolean): void => {
    if (!wrapper) return;
    wrapper.dataset.drag = String(active);
  };

  const onInput = (): void => refresh();
  const onPointerDown = (): void => setActive(true);
  const onPointerUp = (): void => setActive(false);
  const onFocus = (): void => setActive(true);
  const onBlur = (): void => setActive(false);

  input.addEventListener("input", onInput);
  input.addEventListener("change", onInput);
  input.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  input.addEventListener("focus", onFocus);
  input.addEventListener("blur", onBlur);
  window.addEventListener("resize", refresh);

  refresh();

  const controller: SliderController = {
    refresh,
    destroy: () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      input.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", refresh);
      input.classList.remove("ag-range");
      bubble.remove();
      if (created && wrapper) {
        wrapper.parentNode?.insertBefore(input, wrapper);
        wrapper.remove();
      }
      registry.delete(input);
    },
  };

  registry.set(input, controller);
  return controller;
}

export function enhanceRanges(root: ParentNode = document): () => void {
  const controllers = qsa<HTMLInputElement>("input[type=range].ag-range, input[type=range][data-ag-range]", root)
    .map((input) => enhanceRange(input));
  return () => {
    for (const controller of controllers) controller.destroy();
  };
}
