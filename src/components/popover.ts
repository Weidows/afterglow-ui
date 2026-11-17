/**
 * Anchored overlays on the native popover API: the panel lives in the top
 * layer, so no ancestor overflow or z-index can clip it. Positioning is
 * viewport-clamped and flipped on demand; no dependency on CSS anchor
 * positioning being available.
 */
import { animationEndNamed, frameThrottle } from "../core/raf";

export type Placement =
  | "bottom-start" | "bottom" | "bottom-end"
  | "top-start" | "top" | "top-end"
  | "right-start" | "left-start";

export interface PopoverOptions {
  placement?: Placement;
  gap?: number;
  padding?: number;
  matchWidth?: boolean;
}

interface Session {
  dispose: () => void;
}

const sessions = new WeakMap<HTMLElement, Session>();

export function isPopoverOpen(panel: HTMLElement): boolean {
  return panel.matches(":popover-open");
}

export function positionPopover(
  panel: HTMLElement,
  anchor: HTMLElement,
  options: PopoverOptions = {},
): void {
  const gap = options.gap ?? 6;
  const pad = options.padding ?? 8;
  const rect = anchor.getBoundingClientRect();
  const width = panel.offsetWidth || 200;
  const height = panel.offsetHeight || 100;
  const viewW = document.documentElement.clientWidth;
  const viewH = document.documentElement.clientHeight;

  if (options.matchWidth) {
    panel.style.minWidth = `${Math.round(rect.width)}px`;
  }

  let [side, align = "start"] = (options.placement ?? "bottom-start").split("-") as [
    "bottom" | "top" | "right" | "left",
    "start" | "end" | "center" | undefined,
  ];

  const fitsBelow = rect.bottom + gap + height <= viewH - pad;
  const fitsAbove = rect.top - gap - height >= pad;
  const fitsRight = rect.right + gap + width <= viewW - pad;
  const fitsLeft = rect.left - gap - width >= pad;

  if (side === "bottom" && !fitsBelow && fitsAbove) side = "top";
  else if (side === "top" && !fitsAbove && fitsBelow) side = "bottom";
  else if (side === "right" && !fitsRight && fitsLeft) side = "left";
  else if (side === "left" && !fitsLeft && fitsRight) side = "right";

  let left = rect.left;
  let top = rect.bottom + gap;

  if (side === "top" || side === "bottom") {
    if (side === "top") top = rect.top - height - gap;
    if (align === "end") left = rect.right - width;
    else if (align === "center") left = rect.left + (rect.width - width) / 2;
  } else if (side === "right") {
    left = rect.right + gap;
    top = align === "end" ? rect.bottom - height : rect.top;
  } else {
    left = rect.left - width - gap;
    top = align === "end" ? rect.bottom - height : rect.top;
  }

  const maxLeft = viewW - width - pad;
  const maxTop = viewH - height - pad;
  left = Math.max(pad, Math.min(left, Math.max(pad, maxLeft)));
  top = Math.max(pad, Math.min(top, Math.max(pad, maxTop)));

  const originY = side === "top" ? "bottom" : side === "bottom" ? "top" : "center";
  const originX = side === "left" ? "right" : side === "right" ? "left" : align === "end" ? "right" : align === "center" ? "center" : "left";

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.setProperty("--ag-origin", `${originY} ${originX}`);
  panel.dataset.side = side;
}

function ensurePopover(panel: HTMLElement): void {
  if (!panel.hasAttribute("popover")) panel.setAttribute("popover", "manual");
  if (!panel.classList.contains("ag-popover")) panel.classList.add("ag-popover");
}

function clearSession(panel: HTMLElement): void {
  sessions.get(panel)?.dispose();
  sessions.delete(panel);
}

export function closePopover(panel: HTMLElement): Promise<void> {
  clearSession(panel);
  if (!isPopoverOpen(panel)) return Promise.resolve();
  if (panel.dataset.closing === "true") return Promise.resolve();

  panel.dataset.closing = "true";
  return animationEndNamed(panel, "ag-pop-out", 220).then(() => {
    delete panel.dataset.closing;
    if (isPopoverOpen(panel)) panel.hidePopover();
  });
}

export function openPopover(
  panel: HTMLElement,
  anchor: HTMLElement,
  options: PopoverOptions = {},
): void {
  ensurePopover(panel);
  delete panel.dataset.closing;
  if (!isPopoverOpen(panel)) panel.showPopover();

  // Measure without a flash at the default centered position.
  const previousVisibility = panel.style.visibility;
  panel.style.visibility = "hidden";
  positionPopover(panel, anchor, options);
  panel.style.visibility = previousVisibility;

  clearSession(panel);
  const reposition = frameThrottle(() => {
    if (!isPopoverOpen(panel) || !anchor.isConnected) return;
    positionPopover(panel, anchor, options);
  });
  const onScroll = (): void => reposition();
  window.addEventListener("resize", onScroll);
  window.addEventListener("scroll", onScroll, true);

  const observer = new ResizeObserver(() => reposition());
  observer.observe(panel);
  observer.observe(anchor);

  const onToggle = (event: Event): void => {
    const state = (event as Event & { newState?: string }).newState;
    if (state !== "closed") return;
    clearSession(panel);
    panel.removeEventListener("toggle", onToggle);
  };
  panel.addEventListener("toggle", onToggle);

  sessions.set(panel, {
    dispose: () => {
      reposition.cancel();
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      observer.disconnect();
      panel.removeEventListener("toggle", onToggle);
    },
  });
}

export function togglePopover(
  panel: HTMLElement,
  anchor: HTMLElement,
  options: PopoverOptions = {},
): boolean {
  if (isPopoverOpen(panel)) {
    void closePopover(panel);
    return false;
  }
  openPopover(panel, anchor, options);
  return true;
}
