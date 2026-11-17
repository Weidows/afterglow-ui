/**
 * Toasts: a single lazily created region, newest on top, hover/focus pauses
 * the countdown, exit animation before removal, and a FLIP pass so the stack
 * closes the gap smoothly instead of jumping.
 */
import { el } from "../core/dom";
import { icon, type IconName } from "../core/icons";
import { animationEndNamed } from "../core/raf";

export type ToastTone = "info" | "ok" | "warn" | "err";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  description?: string;
  tone?: ToastTone;
  /** ms before auto-dismiss; 0 keeps it until dismissed. */
  duration?: number;
  action?: ToastAction;
  icon?: IconName;
  dismissible?: boolean;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  info: "info",
  ok: "check",
  warn: "alert",
  err: "alert",
};

let region: HTMLElement | null = null;
const active = new Set<() => void>();

function toaster(): HTMLElement {
  if (region?.isConnected) return region;
  region = el("div", {
    class: "ag-toaster",
    role: "region",
    "aria-label": "Notifications",
    "aria-live": "polite",
    "aria-relevant": "additions",
  });
  document.body.appendChild(region);
  return region;
}

/** Show a toast. Returns a function that dismisses it early. */
export function toast(message: string, options: ToastOptions = {}): () => void {
  const tone = options.tone ?? "info";
  const duration = options.duration ?? 4800;
  const host = toaster();

  // Keep the stack readable: the oldest one leaves when a fifth arrives.
  const visible = [...host.children] as HTMLElement[];
  if (visible.length >= 4) visible[0]?.dispatchEvent(new CustomEvent("ag-dismiss"));

  const body = el("div", { class: "ag-toast__body" });
  body.appendChild(el("div", { class: "ag-toast__title" }, options.title ?? message));
  if (options.title && options.title !== message) {
    // `message` is the body when a title is supplied.
    body.appendChild(el("div", { class: "ag-toast__desc" }, message));
  }
  if (options.description) {
    body.appendChild(el("div", { class: "ag-toast__desc" }, options.description));
  }
  if (options.action) {
    const action = el(
      "button",
      { class: "ag-toast__action", type: "button" },
      options.action.label,
    );
    action.addEventListener("click", () => {
      options.action?.onClick();
      dismiss();
    });
    body.appendChild(action);
  }

  const node = el("div", {
    class: "ag-toast",
    role: tone === "err" ? "alert" : "status",
    dataset: { tone },
  });
  node.appendChild(el("div", { class: "ag-toast__icon", html: icon(options.icon ?? TONE_ICON[tone], { size: 16 }) }));

  const close = el("button", {
    class: "ag-toast__close",
    type: "button",
    "aria-label": "关闭通知",
    html: icon("x", { size: 12 }),
  });
  node.append(body, close);

  const bar = el("div", { class: "ag-toast__bar" });
  bar.style.animation = "none";
  node.appendChild(bar);

  let timer = 0;
  let remaining = duration;
  let startedAt = 0;
  let closing = false;
  let flow: Animation | null = null;

  const proceed = (): void => {
    if (remaining <= 0) {
      dismiss();
      return;
    }
    startedAt = performance.now();
    timer = window.setTimeout(dismiss, remaining);
    if (duration > 0) {
      flow = bar.animate(
        [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
        { duration: remaining, easing: "linear", fill: "forwards" },
      );
    }
  };

  const pause = (): void => {
    if (!timer || closing) return;
    remaining -= performance.now() - startedAt;
    clearTimeout(timer);
    timer = 0;
    flow?.pause();
  };

  const resume = (): void => {
    if (timer || closing || duration === 0) return;
    flow?.cancel();
    proceed();
  };

  function dismiss(): void {
    if (closing) return;
    closing = true;
    clearTimeout(timer);
    timer = 0;
    active.delete(dismiss);
    flow?.cancel();
    const siblings = ([...host.children] as HTMLElement[]).filter((child) => child !== node);
    const before = new Map<HTMLElement, number>();
    for (const sibling of siblings) before.set(sibling, sibling.getBoundingClientRect().top);

    node.dataset.closing = "true";
    const remove = (): void => {
      if (!node.isConnected) return;
      node.remove();
      for (const sibling of siblings) {
        if (!sibling.isConnected) continue;
        const delta = (before.get(sibling) ?? 0) - sibling.getBoundingClientRect().top;
        if (!delta) continue;
        sibling.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }],
          { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        );
      }
    };
    void animationEndNamed(node, "ag-toast-out", 240).then(remove);
  }

  node.addEventListener("pointerenter", pause);
  node.addEventListener("pointerleave", resume);
  node.addEventListener("focusin", pause);
  node.addEventListener("focusout", resume);
  node.addEventListener("ag-dismiss", dismiss);
  close.addEventListener("click", dismiss);

  host.prepend(node);
  active.add(dismiss);
  proceed();

  return dismiss;
}

export function dismissAllToasts(): void {
  for (const dismiss of [...active]) dismiss();
}
