/**
 * Dialogs on native <dialog>: the browser owns focus trapping, the top layer
 * and Esc semantics; this module only adds an exit animation and the usual
 * conveniences (backdrop click, declarative close buttons, a confirm helper).
 */
import { el } from "../core/dom";
import { animationEndNamed } from "../core/raf";
import { icon } from "../core/icons";

export interface DialogBindingOptions {
  /** Clicking the backdrop closes the dialog. Default true. */
  dismissOnBackdrop?: boolean;
  /** Esc closes with the exit animation. Default true. */
  dismissOnEscape?: boolean;
  onClose?: () => void;
}

export function openDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  delete dialog.dataset.closing;
  dialog.showModal();
}

export async function closeDialog(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open || dialog.dataset.closing === "true") return;
  dialog.dataset.closing = "true";
  await animationEndNamed(dialog, "ag-dialog-out", 260);
  delete dialog.dataset.closing;
  if (dialog.open) dialog.close();
}

export interface DialogController {
  open(): void;
  close(): Promise<void>;
  destroy(): void;
}

/** Wire backdrop click, Esc and `[data-dialog-close]` for one dialog. */
export function bindDialog(
  dialog: HTMLDialogElement,
  options: DialogBindingOptions = {},
): DialogController {
  const { dismissOnBackdrop = true, dismissOnEscape = true, onClose } = options;

  if (!dialog.classList.contains("ag-dialog")) dialog.classList.add("ag-dialog");

  const onCancel = (event: Event): void => {
    if (!dismissOnEscape) return;
    event.preventDefault();
    void closeDialog(dialog);
  };
  const onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest("[data-dialog-close]")) {
      event.preventDefault();
      void closeDialog(dialog);
      return;
    }
    if (dismissOnBackdrop && target === dialog) void closeDialog(dialog);
  };
  const onClosed = (): void => {
    delete dialog.dataset.closing;
    onClose?.();
  };

  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onClick);
  dialog.addEventListener("close", onClosed);

  return {
    open: () => openDialog(dialog),
    close: () => closeDialog(dialog),
    destroy: () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onClick);
      dialog.removeEventListener("close", onClosed);
    },
  };
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

/** Promise-based confirmation dialog, mounted and disposed on demand. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const dialog = el("dialog", { class: "ag-dialog", dataset: { size: "sm" } });
  const head = el("div", { class: "ag-dialog__head" });
  const heading = el("div", { class: "ag-spacer" });
  heading.appendChild(el("h2", { class: "ag-dialog__title" }, options.title));
  if (options.message) heading.appendChild(el("p", { class: "ag-dialog__desc" }, options.message));
  head.appendChild(heading);

  const body = el("div", { class: "ag-dialog__body" });
  if (options.detail) body.appendChild(el("p", { class: "ag-hint" }, options.detail));

  const foot = el("div", { class: "ag-dialog__foot" });
  const cancel = el("button", { class: "ag-btn", type: "button", "data-dialog-close": "" }, options.cancelLabel ?? "取消");
  const confirm = el(
    "button",
    {
      class: "ag-btn",
      type: "button",
      "data-variant": options.tone === "danger" ? "danger" : "primary",
    },
    options.confirmLabel ?? "确定",
  );
  foot.append(cancel, confirm);
  dialog.append(head, body, foot);

  document.body.appendChild(dialog);
  const controller = bindDialog(dialog, { onClose: () => dialog.remove() });
  controller.open();

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    confirm.addEventListener("click", () => {
      finish(true);
      void controller.close();
    });
    dialog.addEventListener("close", () => finish(false));
  });
}

/** Small helper for dialog headers that need a close affordance. */
export function dialogCloseButton(label = "关闭"): HTMLButtonElement {
  return el("button", {
    class: "ag-iconbtn",
    type: "button",
    "aria-label": label,
    "data-dialog-close": "",
    html: icon("x", { size: 15 }),
  });
}
