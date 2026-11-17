/**
 * Progressive enhancement for a native <select>: the real element stays in the
 * form and keeps its value/change semantics, while a styled combobox in the
 * top layer handles the visible list. Keyboard follows the select-only
 * combobox pattern (arrows, Home/End, typeahead, Esc).
 */
import { el, qsa } from "../core/dom";
import { closePopover, isPopoverOpen, openPopover } from "./popover";

export interface SelectController {
  open(): void;
  close(): void;
  refresh(): void;
  destroy(): void;
}

const registry = new WeakMap<HTMLSelectElement, SelectController>();
let uid = 0;

export function enhanceSelect(select: HTMLSelectElement): SelectController {
  const existing = registry.get(select);
  if (existing) return existing;

  const wrapper = el("div", { class: "ag-select" });
  select.parentNode?.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  select.classList.add("ag-select__native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const label = select.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(select.id)}"]`)
    : null;
  const trigger = el("button", {
    class: "ag-select__trigger",
    type: "button",
    role: "combobox",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
  });
  const labelText = label?.textContent?.trim();
  const selectLabel = select.getAttribute("aria-label");
  if (labelText) trigger.setAttribute("aria-label", labelText);
  else if (selectLabel) trigger.setAttribute("aria-label", selectLabel);

  const valueText = el("span", { class: "ag-select__value ag-ellipsis" });
  const chevron = el("span", { class: "ag-select__chevron", html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9.5l6 6 6-6"/></svg>' });
  trigger.append(valueText, chevron);

  const panelId = `ag-select-${++uid}`;
  const panel = el("div", {
    class: "ag-popover ag-listbox",
    popover: "manual",
    role: "listbox",
    id: panelId,
    tabindex: "-1",
  });
  trigger.setAttribute("aria-controls", panelId);

  wrapper.append(trigger, panel);

  let options: HTMLElement[] = [];
  let active = -1;
  let typeahead = "";
  let typeaheadTimer = 0;

  const syncValue = (): void => {
    const option = select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    valueText.textContent = option?.textContent?.trim() ?? "";
    valueText.classList.toggle("ag-dim", !valueText.textContent);
    trigger.disabled = select.disabled;
  };

  const buildOptions = (): void => {
    panel.replaceChildren();
    options = [];
    for (let index = 0; index < select.options.length; index++) {
      const source = select.options[index] as HTMLOptionElement;
      const option = el("div", {
        class: "ag-option",
        role: "option",
        id: `${panelId}-${index}`,
        "aria-selected": String(index === select.selectedIndex),
        "aria-disabled": source.disabled ? "true" : undefined,
        dataset: { index: String(index), label: source.textContent ?? "" },
      });
      option.appendChild(el("span", { class: "ag-ellipsis" }, source.textContent ?? ""));
      if (source.dataset.note) option.appendChild(el("span", { class: "ag-option__note" }, source.dataset.note));
      if (source.disabled) option.style.opacity = "0.45";
      panel.appendChild(option);
      options.push(option);
    }
    active = select.selectedIndex;
    highlight(active, false);
  };

  const highlight = (index: number, scroll = true): void => {
    if (index < 0 || index >= options.length) return;
    for (const option of options) delete option.dataset.active;
    const option = options[index];
    if (!option) return;
    active = index;
    option.dataset.active = "true";
    trigger.setAttribute("aria-activedescendant", option.id);
    if (scroll) option.scrollIntoView({ block: "nearest" });
  };

  const enabledIndex = (from: number, step: 1 | -1): number => {
    let index = from;
    for (let guard = 0; guard < options.length; guard++) {
      index += step;
      if (index < 0) index = options.length - 1;
      if (index >= options.length) index = 0;
      const option = options[index];
      if (option && option.getAttribute("aria-disabled") !== "true") return index;
    }
    return from;
  };

  const commit = (index: number): void => {
    if (index < 0 || index >= select.options.length) return;
    const option = select.options[index] as HTMLOptionElement;
    if (option.disabled) return;
    select.selectedIndex = index;
    syncValue();
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    for (const item of options) item.setAttribute("aria-selected", String(item === options[index]));
    close(true);
  };

  const open = (): void => {
    if (select.disabled || isPopoverOpen(panel)) return;
    buildOptions();
    openPopover(panel, trigger, { placement: "bottom-start", matchWidth: true });
    wrapper.dataset.open = "true";
    trigger.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => panel.focus({ preventScroll: true }));
  };

  const close = (returnFocus = false): void => {
    if (!isPopoverOpen(panel)) return;
    void closePopover(panel);
    delete wrapper.dataset.open;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-activedescendant");
    if (returnFocus) trigger.focus({ preventScroll: true });
  };

  const toggle = (): void => {
    if (isPopoverOpen(panel)) close(true);
    else open();
  };

  const typeaheadMatch = (key: string): void => {
    typeahead += key.toLowerCase();
    clearTimeout(typeaheadTimer);
    typeaheadTimer = window.setTimeout(() => (typeahead = ""), 500);
    const found = options.findIndex((option) =>
      (option.dataset.label ?? "").trim().toLowerCase().startsWith(typeahead) &&
      option.getAttribute("aria-disabled") !== "true",
    );
    if (found >= 0) highlight(found);
  };

  const onTriggerClick = (event: Event): void => {
    event.preventDefault();
    toggle();
  };

  const onTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        requestAnimationFrame(() => highlight(enabledIndex(select.selectedIndex, step as 1 | -1)));
      }
    }
  };

  const onPanelKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        highlight(enabledIndex(active, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        highlight(enabledIndex(active, -1));
        break;
      case "Home":
        event.preventDefault();
        highlight(0);
        break;
      case "End":
        event.preventDefault();
        highlight(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(active);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) typeaheadMatch(event.key);
    }
  };

  const onPanelClick = (event: MouseEvent): void => {
    const option = (event.target as Element).closest<HTMLElement>(".ag-option");
    if (!option) return;
    commit(Number(option.dataset.index));
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (!isPopoverOpen(panel)) return;
    const target = event.target as Node;
    if (panel.contains(target) || wrapper.contains(target)) return;
    close(false);
  };

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && isPopoverOpen(panel)) close(true);
  };

  trigger.addEventListener("click", onTriggerClick);
  trigger.addEventListener("keydown", onTriggerKeydown);
  panel.addEventListener("keydown", onPanelKeydown);
  panel.addEventListener("click", onPanelClick);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onDocumentKeydown);
  select.addEventListener("change", () => {
    syncValue();
    if (isPopoverOpen(panel)) buildOptions();
  });

  const observer = new MutationObserver(() => {
    syncValue();
    if (isPopoverOpen(panel)) buildOptions();
  });
  observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true });

  syncValue();

  const controller: SelectController = {
    open,
    close: () => close(false),
    refresh: syncValue,
    destroy: () => {
      observer.disconnect();
      close(false);
      trigger.removeEventListener("click", onTriggerClick);
      trigger.removeEventListener("keydown", onTriggerKeydown);
      panel.removeEventListener("keydown", onPanelKeydown);
      panel.removeEventListener("click", onPanelClick);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onDocumentKeydown);
      select.classList.remove("ag-select__native");
      select.removeAttribute("aria-hidden");
      select.tabIndex = 0;
      wrapper.parentNode?.insertBefore(select, wrapper);
      wrapper.remove();
      registry.delete(select);
    },
  };

  registry.set(select, controller);
  return controller;
}

/** Enhance every `select.ag-select` (or `select[data-ag-select]`) under root. */
export function enhanceSelects(root: ParentNode = document): () => void {
  const controllers = qsa<HTMLSelectElement>("select.ag-select, select[data-ag-select]", root).map(enhanceSelect);
  return () => {
    for (const controller of controllers) controller.destroy();
  };
}
