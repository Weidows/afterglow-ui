/**
 * One shared tooltip for every `[data-tip]` element. Plain text only, so user
 * data can never inject markup. Shows after a short delay, flips when it would
 * leave the viewport, hides on scroll and Escape.
 */
const SHOW_DELAY = 420;
const HIDE_DELAY = 120;

let tip: HTMLElement | null = null;
let current: HTMLElement | null = null;
let showTimer = 0;
let hideTimer = 0;
let restoreDescription: { el: HTMLElement; value: string | null } | null = null;
let uid = 0;

function tooltip(): HTMLElement {
  if (tip?.isConnected) return tip;
  tip = document.createElement("div");
  tip.className = "ag-tooltip";
  tip.id = `ag-tooltip-${++uid}`;
  tip.setAttribute("role", "tooltip");
  tip.dataset.show = "false";
  document.body.appendChild(tip);
  tip.addEventListener("transitionend", () => {
    if (tip?.dataset.show === "false") tip.style.visibility = "hidden";
  });
  return tip;
}

function place(trigger: HTMLElement): void {
  const node = tooltip();
  const rect = trigger.getBoundingClientRect();
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const viewW = document.documentElement.clientWidth;

  let side: "top" | "bottom" = "top";
  let top = rect.top - height - 8;
  if (top < 8) {
    side = "bottom";
    top = rect.bottom + 8;
  }

  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, viewW - width - 8));
  const arrow = Math.max(10, Math.min(width - 10, rect.left + rect.width / 2 - left));

  node.style.left = `${Math.round(left)}px`;
  node.style.top = `${Math.round(top)}px`;
  node.style.setProperty("--ag-arrow-x", `${Math.round(arrow)}px`);
  node.dataset.side = side;
}

function show(trigger: HTMLElement): void {
  const node = tooltip();
  const text = trigger.dataset.tip ?? "";
  if (!text) return;
  node.textContent = text;
  node.style.visibility = "hidden";
  node.dataset.show = "true";
  place(trigger);
  node.style.visibility = "";

  current = trigger;
  const previous = trigger.getAttribute("aria-describedby");
  restoreDescription = { el: trigger, value: previous };
  trigger.setAttribute("aria-describedby", previous ? `${previous} ${node.id}` : node.id);
}

function hide(): void {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
  if (!tip) return;
  tip.dataset.show = "false";
  if (restoreDescription) {
    const { el: trigger, value } = restoreDescription;
    if (value == null) trigger.removeAttribute("aria-describedby");
    else trigger.setAttribute("aria-describedby", value);
    restoreDescription = null;
  }
  current = null;
}

/** Wire tooltips once per page. Returns a disposer. */
export function initTooltips(root: ParentNode = document): () => void {
  const onEnter = (event: Event): void => {
    const trigger = (event.target as Element | null)?.closest?.<HTMLElement>("[data-tip]");
    if (!trigger || !root.contains(trigger)) return;
    if (current === trigger) return;
    hide();
    const delay = Number(trigger.dataset.tipDelay ?? SHOW_DELAY);
    showTimer = window.setTimeout(() => show(trigger), Number.isFinite(delay) ? delay : SHOW_DELAY);
  };

  const onLeave = (event: Event): void => {
    const trigger = (event.target as Element | null)?.closest?.<HTMLElement>("[data-tip]");
    if (!trigger || trigger !== current) {
      // Leaving before the tooltip appeared simply cancels it.
      const related = (event as PointerEvent).relatedTarget as Element | null;
      if (!related?.closest?.("[data-tip]")) {
        window.clearTimeout(showTimer);
        if (!current) hide();
      }
      return;
    }
    hideTimer = window.setTimeout(hide, HIDE_DELAY);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && tip?.dataset.show === "true") hide();
  };

  const onScroll = (): void => {
    if (tip?.dataset.show === "true") hide();
  };

  root.addEventListener("pointerover", onEnter);
  root.addEventListener("pointerout", onLeave);
  root.addEventListener("focusin", onEnter);
  root.addEventListener("focusout", onLeave);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("scroll", onScroll, true);

  return () => {
    root.removeEventListener("pointerover", onEnter);
    root.removeEventListener("pointerout", onLeave);
    root.removeEventListener("focusin", onEnter);
    root.removeEventListener("focusout", onLeave);
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("scroll", onScroll, true);
    hide();
    tip?.remove();
    tip = null;
  };
}
