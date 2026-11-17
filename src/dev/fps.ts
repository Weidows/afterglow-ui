/**
 * Frame probe for the gallery and for perf tests: measures rAF deltas,
 * counts dropped frames and reports percentiles. Not shipped in any
 * component's critical path.
 */
import { el } from "../core/dom";

export interface FpsStats {
  samples: number;
  fps: number;
  p50: number;
  p95: number;
  p99: number;
  dropped: number;
  longTasks: number;
  longestTask: number;
}

export class FpsProbe {
  private deltas: number[] = [];
  private frame = 0;
  private last = 0;
  private running = false;
  private longTasks = 0;
  private longestTask = 0;
  private observer: PerformanceObserver | null = null;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);

    if (typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasks++;
          if (entry.duration > this.longestTask) this.longestTask = entry.duration;
        }
      });
      this.observer.observe({ entryTypes: ["longtask"] });
    }
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.last = 0;
    this.observer?.disconnect();
    this.observer = null;
  }

  reset(): void {
    this.deltas.length = 0;
    this.longTasks = 0;
    this.longestTask = 0;
  }

  stats(): FpsStats {
    if (!this.deltas.length) {
      return { samples: 0, fps: 0, p50: 0, p95: 0, p99: 0, dropped: 0, longTasks: this.longTasks, longestTask: this.longestTask };
    }
    const sorted = [...this.deltas].sort((a, b) => a - b);
    const p50 = percentile(sorted, 0.5);
    const budget = p50 > 0 ? p50 : 16.7;
    let dropped = 0;
    for (const delta of sorted) if (delta > budget * 1.5) dropped++;
    return {
      samples: sorted.length,
      fps: p50 > 0 ? 1000 / p50 : 0,
      p50,
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99),
      dropped,
      longTasks: this.longTasks,
      longestTask: this.longestTask,
    };
  }

  private readonly tick = (time: number): void => {
    if (this.last) {
      this.deltas.push(time - this.last);
      if (this.deltas.length > 240) this.deltas.shift();
    }
    this.last = time;
    if (this.running) this.frame = requestAnimationFrame(this.tick);
  };
}

function percentile(sorted: number[], ratio: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index] as number;
}

/** Tiny HUD: live fps plus p95 frame time and dropped-count. */
export function mountFpsHud(target: HTMLElement): () => void {
  const probe = new FpsProbe();
  probe.start();

  const value = el("b", { class: "ag-fps__value" }, "—");
  const label = el("span", { class: "ag-fps__label" }, "fps");
  const detail = el("span", { class: "ag-fps__detail" }, "measuring");
  target.replaceChildren(value, label, detail);
  target.classList.add("ag-fps");

  const timer = window.setInterval(() => {
    const stats = probe.stats();
    value.textContent = stats.samples ? stats.fps.toFixed(0) : "—";
    detail.textContent = stats.samples
      ? `p95 ${stats.p95.toFixed(1)} ms · ${stats.dropped} dropped`
      : "measuring";
  }, 500);

  return () => {
    window.clearInterval(timer);
    probe.stop();
    target.replaceChildren();
    target.classList.remove("ag-fps");
  };
}
