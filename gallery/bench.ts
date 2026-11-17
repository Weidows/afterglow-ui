import "../src/styles/afterglow.css";
import "./bench.css";

import {
  FpsProbe,
  VirtualList,
  el,
  enhanceSelects,
  icon,
  onFrame,
  qsa,
  segmented,
  setText,
} from "../src/index";
import type { IconName } from "../src/index";

for (const node of qsa<HTMLElement>("[data-icon]")) {
  const name = node.dataset.icon as IconName | undefined;
  if (name) node.innerHTML = icon(name, { size: Number(node.dataset.size ?? 16) });
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`[bench] missing ${selector}`);
  return node;
};

enhanceSelects(document);

/* ---------------- frame probe ---------------- */
const probe = new FpsProbe();
probe.start();

const fpsValue = $("#stat-fps");
const p50Value = $("#stat-p50");
const p95Value = $("#stat-p95");
const p99Value = $("#stat-p99");
const droppedValue = $("#stat-dropped");
const longValue = $("#stat-long");
const longestValue = $("#stat-longest");

window.setInterval(() => {
  const stats = probe.stats();
  setText(fpsValue, stats.samples ? stats.fps.toFixed(0) : "—");
  setText(p50Value, stats.samples ? `p50 ${stats.p50.toFixed(1)} ms · ${stats.samples} 帧` : "等待采样");
  setText(p95Value, stats.samples ? `${stats.p95.toFixed(1)} ms` : "—");
  setText(p99Value, stats.samples ? `p99 ${stats.p99.toFixed(1)} ms` : "p99 —");
  setText(droppedValue, String(stats.dropped));
  setText(longValue, String(stats.longTasks));
  setText(longestValue, stats.longTasks ? `最长 ${stats.longestTask.toFixed(1)} ms` : "最长 —");
}, 400);

$("#bench-reset").addEventListener("click", () => {
  probe.reset();
  setText(fpsValue, "—");
  setText(p50Value, "等待采样");
  setText(p95Value, "—");
  setText(p99Value, "p99 —");
  setText(droppedValue, "—");
  setText(longValue, "—");
  setText(longestValue, "最长 —");
});

/* ---------------- virtual list ---------------- */
interface BenchRow {
  id: number;
  name: string;
  value: number;
  load: number;
}

let items: BenchRow[] = makeItems(100_000);
const listHost = $("#bench-list");
const rowsBadge = $("#bench-rows-badge");

const list = new VirtualList<BenchRow>(listHost, {
  rowHeight: 26,
  overscan: 8,
  create: () => {
    const row = document.createElement("div");
    row.className = "brow";
    row.setAttribute("role", "row");

    const index = document.createElement("span");
    index.className = "brow__idx";
    const name = document.createElement("span");
    name.className = "brow__name ag-ellipsis";
    const value = document.createElement("span");
    value.className = "brow__val";
    const meter = document.createElement("div");
    meter.className = "ag-meter";
    const track = document.createElement("div");
    track.className = "ag-meter__track";
    const fill = document.createElement("div");
    fill.className = "ag-meter__fill";
    track.appendChild(fill);
    meter.appendChild(track);

    row.append(index, name, value, meter);
    return row;
  },
  update: (row, item) => {
    const cells = row.children;
    setText(cells[0] as HTMLElement, String(item.id));
    setText(cells[1] as HTMLElement, item.name);
    setText(cells[2] as HTMLElement, `${item.value.toFixed(1)}%`);
    const fill = (cells[3] as HTMLElement).querySelector<HTMLElement>(".ag-meter__fill");
    if (fill) fill.style.setProperty("--ag-v", (item.load / 100).toFixed(3));
  },
});

function makeItems(count: number): BenchRow[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    name: `proc-${id.toString(36)}.exe`,
    value: Math.random() * 100,
    load: Math.random() * 100,
  }));
}

function applyCount(count: number): void {
  items = makeItems(count);
  list.setItems(items);
  setText(rowsBadge, `${count.toLocaleString("en-US")} rows`);
}

list.setItems(items);

const rowsSelect = $<HTMLSelectElement>("#bench-rows");
rowsSelect.addEventListener("change", () => applyCount(Number(rowsSelect.value) || 100_000));

/* ---------------- streaming ---------------- */
let streamTimer = 0;
let running = true;

function streamTick(): void {
  // Mutate a few hundred rows; only the visible window is re-rendered.
  for (let index = 0; index < 400; index++) {
    const row = items[Math.floor(Math.random() * items.length)];
    if (!row) continue;
    row.value = Math.max(0, Math.min(100, row.value + (Math.random() - 0.5) * 12));
    row.load = Math.max(0, Math.min(100, row.load + (Math.random() - 0.5) * 9));
  }
  list.setItems(items);
}

function startStream(): void {
  stopStream();
  streamTimer = window.setInterval(streamTick, 50);
}

function stopStream(): void {
  if (streamTimer) window.clearInterval(streamTimer);
  streamTimer = 0;
}

startStream();

segmented($("#bench-stream"), {
  onChange: (values) => {
    running = values[0] !== "off";
    if (running) startStream();
    else stopStream();
  },
});

/* ---------------- 240 meters at rAF ---------------- */
const meterHost = $("#bench-meters");
interface Cell {
  fill: HTMLElement;
  label: HTMLElement;
}
const cells: Cell[] = [];

for (let index = 0; index < 240; index++) {
  const cell = el("div", { class: "meter-cell" });
  const bar = el("div", { class: "meter-cell__bar" });
  const fill = el("div", { class: "meter-cell__fill" });
  bar.appendChild(fill);
  const label = el("span", { class: "meter-cell__idx" }, String(index));
  cell.append(bar, label);
  meterHost.appendChild(cell);
  cells.push({ fill, label });
}

let frameCount = 0;
onFrame((time) => {
  if (!running) return;
  frameCount++;
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index] as Cell;
    const value = 0.18 + 0.78 * Math.abs(Math.sin(time / 620 + index * 0.37));
    cell.fill.style.setProperty("--v", value.toFixed(3));
    if (frameCount % 12 === 0) setText(cell.label, String(Math.round(value * 100)));
  }
});

/* ---------------- naive vs keyed ---------------- */
function measureNaive(rows: number, rounds: number): number {
  const host = el("div", {
    class: "bench-list",
    style: { position: "fixed", left: "-20000px", top: "0", width: "560px", height: "360px" },
  });
  document.body.appendChild(host);
  const start = performance.now();
  for (let round = 0; round < rounds; round++) {
    let html = "";
    for (let index = 0; index < rows; index++) {
      html += `<div class="brow"><span class="brow__idx">${index}</span><span class="brow__name">proc-${index}.exe</span><span class="brow__val">${(index * 7 + round) % 100}%</span><span class="brow__val">${(index * 3) % 64}</span></div>`;
    }
    host.innerHTML = html;
  }
  const perRound = (performance.now() - start) / rounds;
  host.remove();
  return perRound;
}

function measurePatched(rows: number, rounds: number): number {
  const host = el("div", {
    class: "bench-list",
    style: { position: "fixed", left: "-20000px", top: "0", width: "560px", height: "360px" },
  });
  const targets: HTMLElement[] = [];
  for (let index = 0; index < rows; index++) {
    const row = el("div", { class: "brow" });
    row.append(
      el("span", { class: "brow__idx" }, String(index)),
      el("span", { class: "brow__name" }, `proc-${index}.exe`),
      el("span", { class: "brow__val" }, `${(index * 7) % 100}%`),
      el("span", { class: "brow__val" }, `${(index * 3) % 64}`),
    );
    const target = row.children[2] as HTMLElement;
    targets.push(target);
    host.appendChild(row);
  }
  document.body.appendChild(host);

  const start = performance.now();
  for (let round = 0; round < rounds; round++) {
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index] as HTMLElement;
      target.textContent = `${(index * 7 + round) % 100}%`;
    }
  }
  const perRound = (performance.now() - start) / rounds;
  host.remove();
  return perRound;
}

$("#bench-compare").addEventListener("click", () => {
  const rounds = 10;
  const rows = 2000;
  const naive = measureNaive(rows, rounds);
  const patched = measurePatched(rows, rounds);
  setText($("#bench-naive"), naive.toFixed(2));
  setText($("#bench-patched"), patched.toFixed(2));
  setText($("#bench-gain"), (naive / Math.max(patched, 0.01)).toFixed(1) + "×");
  setText(
    $("#bench-verdict"),
    `${rows.toLocaleString("en-US")} 行 × ${rounds} 轮：整表重建 ${naive.toFixed(1)} ms/轮，键控复用并只改文本 ${patched.toFixed(1)} ms/轮。`,
  );
});
