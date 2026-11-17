/**
 * Odometer-style rolling numbers. Each digit is a 10-cell strip moved with
 * transform, so a value change animates on the compositor and unchanged
 * digits cost nothing. A structural change (digit count, separators) rebuilds.
 */
import { el } from "../core/dom";

export interface NumberFlowOptions {
  decimals?: number;
  group?: boolean;
  prefix?: string;
  suffix?: string;
  locale?: string;
}

interface Digit {
  strip: HTMLElement;
  value: number;
}

export class NumberFlow {
  private digits: Digit[] = [];
  private layout = "";
  private last = "";
  private visual: HTMLElement;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: NumberFlowOptions = {},
  ) {
    host.classList.add("ag-flow");
    this.visual = el("span", { class: "ag-flow__visual", "aria-hidden": "true" });
    host.appendChild(this.visual);
  }

  set(value: number): void {
    const decimals = this.options.decimals ?? 0;
    const safe = Number.isFinite(value) ? value : 0;
    const formatted = new Intl.NumberFormat(this.options.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: this.options.group ?? true,
    }).format(safe);

    this.host.setAttribute(
      "aria-label",
      `${this.options.prefix ?? ""}${formatted}${this.options.suffix ?? ""}`,
    );
    if (formatted === this.last) return;
    this.last = formatted;

    const layout = formatted.replace(/\d/g, "#");
    if (layout !== this.layout) this.rebuild(formatted);
    else this.update(formatted);
    this.layout = layout;
  }

  private rebuild(formatted: string): void {
    this.visual.replaceChildren();
    this.digits = [];

    if (this.options.prefix) {
      this.visual.appendChild(el("span", { class: "ag-flow__sep" }, this.options.prefix));
    }

    for (const char of formatted) {
      if (char >= "0" && char <= "9") {
        const digit = Number(char);
        const strip = el("span", { class: "ag-flow__strip" });
        for (let value = 0; value <= 9; value++) {
          strip.appendChild(el("i", {}, String(value)));
        }
        strip.style.transition = "none";
        strip.style.transform = `translateY(-${digit}em)`;
        const column = el("span", { class: "ag-flow__digit" });
        column.appendChild(strip);
        this.visual.appendChild(column);
        this.digits.push({ strip, value: digit });
      } else {
        this.visual.appendChild(el("span", { class: "ag-flow__sep" }, char));
      }
    }

    if (this.options.suffix) {
      this.visual.appendChild(el("span", { class: "ag-flow__unit" }, this.options.suffix));
    }

    // Re-enable transitions after the initial paint.
    requestAnimationFrame(() => {
      for (const digit of this.digits) digit.strip.style.transition = "";
    });
  }

  private update(formatted: string): void {
    let cursor = 0;
    for (const char of formatted) {
      if (char < "0" || char > "9") continue;
      const digit = this.digits[cursor++];
      if (!digit) return;
      const next = Number(char);
      if (next === digit.value) continue;
      digit.value = next;
      digit.strip.style.transform = `translateY(-${next}em)`;
    }
  }
}
