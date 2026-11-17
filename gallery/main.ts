import "../src/styles/afterglow.css";
import "./gallery.css";

import {
  NumberFlow,
  Sparkline,
  VirtualList,
  applyBrand,
  applyDensity,
  applyTheme,
  bindDialog,
  closeDialog,
  closePopover,
  confirmDialog,
  el,
  enhanceRanges,
  enhanceSelects,
  icon,
  initTooltips,
  isPopoverOpen,
  menu,
  mountFpsHud,
  openPopover,
  prefersReducedMotion,
  qsa,
  resolveTheme,
  segmented,
  setText,
  springs,
  tabs,
  toast,
} from "../src/index";
import type { BrandName, Density, IconName, ThemeName } from "../src/index";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`[gallery] missing ${selector}`);
  return node;
};

/* ---------------- icons ---------------- */
function paintIcons(root: ParentNode = document): void {
  for (const node of qsa<HTMLElement>("[data-icon]", root)) {
    const name = node.dataset.icon as IconName | undefined;
    if (!name) continue;
    node.innerHTML = icon(name, { size: Number(node.dataset.size ?? 16) });
  }
}
paintIcons();

/* ---------------- theme ---------------- */
const storedTheme = localStorage.getItem("afterglow:theme");
let theme: ThemeName =
  document.documentElement.dataset.agTheme === "light" || document.documentElement.dataset.agTheme === "dark"
    ? (document.documentElement.dataset.agTheme as ThemeName)
    : storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : resolveTheme();

applyTheme(theme);

const themeButton = $<HTMLButtonElement>("#theme-toggle");
function paintThemeButton(): void {
  themeButton.innerHTML = icon(theme === "dark" ? "sun" : "moon", { size: 15 });
  themeButton.setAttribute("aria-label", theme === "dark" ? "切换到浅色" : "切换到深色");
  themeButton.dataset.tip = theme === "dark" ? "切换到浅色" : "切换到深色";
}

function setTheme(next: ThemeName): void {
  theme = next;
  applyTheme(theme);
  localStorage.setItem("afterglow:theme", theme);
  paintThemeButton();
  toast(theme === "dark" ? "已切换到深色" : "已切换到浅色", {
    tone: "info",
    duration: 1600,
    icon: theme === "dark" ? "moon" : "sun",
  });
}

function switchTheme(next: ThemeName, trigger: HTMLElement): void {
  if (prefersReducedMotion()) {
    setTheme(next);
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const veil = document.createElement("div");
  veil.className = "theme-veil";
  veil.style.left = `${x - 12}px`;
  veil.style.top = `${y - 12}px`;
  veil.style.background = next === "light" ? "#eef1f6" : "#07080b";
  document.body.appendChild(veil);

  const grow = veil.animate(
    [{ transform: "scale(0)" }, { transform: `scale(${radius / 12})` }],
    { duration: 300, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" },
  );
  void grow.finished
    .then(() => {
      setTheme(next);
      return veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out" }).finished;
    })
    .catch(() => undefined)
    .finally(() => veil.remove());
}

paintThemeButton();
themeButton.addEventListener("click", () => {
  switchTheme(theme === "dark" ? "light" : "dark", themeButton);
});

/* ---------------- brand + density ---------------- */
const brandButtons = qsa<HTMLButtonElement>(".brand-dot");
function setBrand(brand: BrandName): void {
  applyBrand(brand);
  localStorage.setItem("afterglow:brand", brand);
  for (const button of brandButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.brand === brand));
  }
}
const initialBrand = (localStorage.getItem("afterglow:brand") ?? "cyan") as BrandName;
setBrand(initialBrand);
for (const button of brandButtons) {
  button.addEventListener("click", () => setBrand(button.dataset.brand as BrandName));
}

const storedDensity = localStorage.getItem("afterglow:density");
const initialDensity: Density =
  storedDensity === "compact" || storedDensity === "comfortable" ? storedDensity : "default";
applyDensity(initialDensity);

const density = segmented($("#density-demo"), {
  onChange: (values) => {
    const next = values[0] as Density | undefined;
    if (!next) return;
    applyDensity(next);
    localStorage.setItem("afterglow:density", next);
  },
});
density.setActive(initialDensity);

/* ---------------- search ---------------- */
const searchInput = $<HTMLInputElement>("#gallery-search");
const sections = qsa<HTMLElement>(".spec");
const tocLinks = qsa<HTMLAnchorElement>(".toc a");
const noResults = el("div", { class: "no-results", hidden: true }, "没有匹配的组件。试试 button、table 或 toast。");
document.querySelector(".foot")?.before(noResults);

function filterSections(raw: string): void {
  const needle = raw.trim().toLowerCase();
  let visible = 0;
  for (const section of sections) {
    const haystack = `${section.id} ${section.dataset.keywords ?? ""} ${section.querySelector("h2")?.textContent ?? ""}`.toLowerCase();
    const show = !needle || haystack.includes(needle);
    section.hidden = !show;
    if (show) visible++;
  }
  noResults.hidden = visible > 0;
  for (const link of tocLinks) {
    const id = link.getAttribute("href")?.slice(1);
    const section = id ? document.getElementById(id) : null;
    link.hidden = section instanceof HTMLElement && section.hidden;
  }
}

searchInput.addEventListener("input", () => filterSections(searchInput.value));

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  } else if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    filterSections("");
    searchInput.blur();
  }
});

/* ---------------- copy buttons ---------------- */
for (const button of qsa<HTMLElement>("[data-copy]")) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selector = button.dataset.copy;
    const source = selector ? document.querySelector(selector) : null;
    const text = (source?.querySelector("code")?.textContent ?? source?.textContent ?? "").trim();
    void navigator.clipboard
      .writeText(text)
      .then(() => toast("已复制到剪贴板", { tone: "ok", duration: 1600 }))
      .catch(() => toast("复制失败，请手动选择文本", { tone: "err" }));
  });
}

/* ---------------- scroll spy ---------------- */
const doc = $("#doc");
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const link = tocLinks.find((candidate) => candidate.getAttribute("href") === `#${entry.target.id}`);
      if (!link) continue;
      tocLinks.forEach((candidate) => candidate.classList.toggle("active", candidate === link));
    }
  },
  { root: doc, rootMargin: "-18% 0px -66% 0px", threshold: 0 },
);
for (const section of sections) spy.observe(section);

/* ---------------- controls ---------------- */
enhanceSelects(document);
enhanceRanges(document);
initTooltips(document);

/* ---------------- tabs + segmented ---------------- */
tabs($("#demo-tabs"));

segmented($("#segmented-demo"), {
  onChange: (values) => setText($("#segmented-out"), `选中：${values.join(" / ") || "无"}`),
});

/* ---------------- menus ---------------- */
const menuTrigger = $("[data-menu='menu-actions']");
const menuPanel = $("#menu-actions");
menu(menuTrigger, menuPanel, {
  onSelect: (item) => {
    const clone = item.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".ag-menu__key").forEach((node) => node.remove());
    const label = clone.textContent?.trim() || "已执行";
    toast(label, {
      tone: item.dataset.tone === "danger" ? "warn" : "ok",
      duration: 2200,
    });
  },
});

/* ---------------- dialogs ---------------- */
const dialog = $<HTMLDialogElement>("#demo-dialog");
bindDialog(dialog, {
  onClose: () => console.log("[gallery] dialog closed"),
});
$("#open-dialog").addEventListener("click", () => dialog.showModal());
$("#dialog-start").addEventListener("click", () => {
  void closeDialog(dialog).then(() =>
    toast("预检通过，正在接管磁盘 3", { tone: "ok", description: "盘符会在 1–2 秒内由 iSCSI 回交。" }),
  );
});

$("#confirm-stop").addEventListener("click", () => {
  void confirmDialog({
    title: "强制停止加速？",
    message: "跳过 iSCSI 登出与脏块回写，可能损坏正在写入的文件。",
    detail: "只有在优雅停止卡住超过 30 秒时才应该走这里。",
    confirmLabel: "强制停止",
    tone: "danger",
  }).then((ok) => {
    toast(ok ? "已请求强制停止" : "已取消", {
      tone: ok ? "warn" : "info",
      duration: 2600,
    });
  });
});

$("#confirm-safe").addEventListener("click", () => {
  void confirmDialog({
    title: "重新生成账本？",
    message: "旧账本会保留 24 小时，之后自动清理。",
    confirmLabel: "重新生成",
  }).then((ok) => {
    toast(ok ? "账本已重建" : "保持现状", { tone: ok ? "ok" : "info", duration: 2200 });
  });
});

/* ---------------- toasts ---------------- */
for (const button of qsa<HTMLElement>("[data-toast]")) {
  button.addEventListener("click", () => {
    const tone = (button.dataset.toast ?? "info") as "ok" | "warn" | "err" | "info";
    toast(button.dataset.message ?? "示例通知", {
      tone,
      duration: tone === "err" ? 0 : 4600,
      description:
        tone === "err"
          ? "点击关闭，或先处理占用该盘的进程后重试。"
          : tone === "warn"
            ? "释放空间后可继续写入缓存。"
            : undefined,
      action:
        tone === "warn"
          ? { label: "清理账本", onClick: () => toast("已清理 1.2 GiB 账本", { tone: "ok" }) }
          : undefined,
    });
  });
}

$("#toast-action").addEventListener("click", () => {
  toast("L2 卷剩余空间不足 8%", {
    tone: "warn",
    duration: 0,
    description: "写入会回落到直写模式，命中率将下降。",
    action: {
      label: "立即清理",
      onClick: () => toast("已清理 1.2 GiB", { tone: "ok", duration: 1800 }),
    },
  });
});

/* ---------------- anchored popover ---------------- */
const popoverAnchor = $("#popover-demo");
let anchored: HTMLElement | null = null;
popoverAnchor.addEventListener("click", () => {
  if (!anchored) {
    anchored = el("div", { class: "ag-popover", popover: "manual", style: { width: "240px" } });
    anchored.append(
      el("div", { class: "ag-menu__label" }, "锚定浮层"),
      el("p", { class: "ag-hint", style: { padding: "0 8px 8px" } }, "由 JS 测量位置并夹在视口内；Esc 或点外部关闭。"),
    );
    const action = el("button", { class: "ag-menu__item", role: "menuitem", html: `${icon("bolt", { size: 14 })}<span>执行一次采样</span>` });
    action.addEventListener("click", () => {
      toast("已采样", { tone: "ok", duration: 1400 });
      void closePopover(anchored as HTMLElement);
    });
    anchored.appendChild(action);
    document.body.appendChild(anchored);

    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!anchored) return;
        const target = event.target as Node;
        if (anchored.contains(target) || popoverAnchor.contains(target)) return;
        void closePopover(anchored);
      },
      true,
    );
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && anchored && isPopoverOpen(anchored)) void closePopover(anchored);
    });
  }
  if (isPopoverOpen(anchored)) void closePopover(anchored);
  else openPopover(anchored, popoverAnchor, { placement: "bottom-start" });
});

/* ---------------- data simulations ---------------- */
const clamp01 = (value: number): number => Math.max(0.03, Math.min(0.98, value));

const flow = new NumberFlow($("#kpi-flow"), { decimals: 2, suffix: " GB/s" });
const spark = new Sparkline($<HTMLCanvasElement>("#spark"), { maxPoints: 64 });
const tabSpark = new Sparkline($<HTMLCanvasElement>("#tab-spark"), { maxPoints: 64 });

let bandwidth = 4.26;
const history = Array.from({ length: 44 }, () => 2.4 + Math.random() * 3.2);
spark.setData(history);
tabSpark.setData(history);
flow.set(bandwidth);

const ringNodes = qsa<HTMLElement>("[data-ring]");
const ringLabels = qsa<HTMLElement>("[data-ring-value]");

function tickData(): void {
  bandwidth = Math.max(0.6, Math.min(9.6, bandwidth + (Math.random() - 0.48) * 1.1));
  flow.set(bandwidth);
  spark.push(bandwidth);
  tabSpark.push(Math.max(0.4, bandwidth * (0.72 + Math.random() * 0.5)));
  setText($("#spark-readout"), `${bandwidth.toFixed(2)} GB/s · 60 s`);

  const values = [clamp01(0.2 + Math.random() * 0.6), clamp01(0.45 + Math.random() * 0.4), clamp01(0.1 + Math.random() * 0.5)];
  ringNodes.forEach((ring, index) => {
    const value = values[index] ?? 0.3;
    ring.style.setProperty("--ag-v", value.toFixed(3));
    const wrap = ring.parentElement;
    if (wrap) {
      if (value > 0.85) wrap.dataset.tone = "danger";
      else if (value > 0.68) wrap.dataset.tone = "warn";
      else delete wrap.dataset.tone;
    }
    const label = ringLabels[index];
    if (label) setText(label, `${Math.round(value * 100)}%`);
  });
}

let dataTimer = 0;
function startData(): void {
  stopData();
  tickData();
  dataTimer = window.setInterval(tickData, 1200);
}
function stopData(): void {
  if (dataTimer) window.clearInterval(dataTimer);
  dataTimer = 0;
}
document.addEventListener("visibilitychange", () => (document.hidden ? stopData() : startData()));
startData();

/* range readout */
const l1 = $<HTMLInputElement>("#d-l1");
const l1Readout = $("#l1-readout");
const syncL1 = (): void => setText(l1Readout, `${l1.value} MiB`);
l1.addEventListener("input", syncL1);
syncL1();

/* ---------------- virtual list ---------------- */
interface Proc {
  id: number;
  name: string;
  pid: number;
  cpu: number;
  mem: number;
  disk: number;
  state: "run" | "idle" | "lock";
}

const names = ["Cacab.exe", "msedge.exe", "explorer.exe", "SearchIndexer.exe", "dwm.exe", "System", "audiodg.exe", "svchost.exe", "TelemetryHost.exe", "Code.exe"];
const states: Proc["state"][] = ["run", "idle", "lock"];

const procs: Proc[] = Array.from({ length: 1000 }, (_, index) => ({
  id: index,
  name: names[index % names.length] as string,
  pid: 1024 + index * 3,
  cpu: Math.random() * 42,
  mem: 24 + Math.random() * 780,
  disk: Math.random() * 100,
  state: states[index % states.length] as Proc["state"],
}));

const vlistHost = $("#vlist");
const vlistRange = $("#vlist-range");

const vlist = new VirtualList<Proc>(vlistHost, {
  rowHeight: 26,
  overscan: 5,
  create: () => {
    const row = document.createElement("div");
    row.className = "vrow";
    row.setAttribute("role", "row");

    const name = document.createElement("span");
    name.className = "vrow__name";
    const dot = document.createElement("i");
    dot.className = "vrow__dot";
    const label = document.createElement("span");
    label.className = "vrow__label ag-ellipsis";
    name.append(dot, label);

    const pid = document.createElement("span");
    pid.className = "vrow__num";
    const cpu = document.createElement("span");
    cpu.className = "vrow__num";
    const mem = document.createElement("span");
    mem.className = "vrow__num";
    const disk = document.createElement("span");
    disk.className = "vrow__num";
    const state = document.createElement("span");
    state.className = "vrow__state";

    row.append(name, pid, cpu, mem, disk, state);
    return row;
  },
  update: (row, proc) => {
    const cells = row.children;
    const name = cells[0] as HTMLElement;
    const dot = name.querySelector<HTMLElement>(".vrow__dot");
    const label = name.querySelector<HTMLElement>(".vrow__label");
    if (dot) dot.dataset.state = proc.state;
    if (label) setText(label, proc.name);
    setText(cells[1] as HTMLElement, String(proc.pid));
    setText(cells[2] as HTMLElement, `${proc.cpu.toFixed(1)}%`);
    setText(cells[3] as HTMLElement, `${Math.round(proc.mem)}M`);
    setText(cells[4] as HTMLElement, `${proc.disk.toFixed(0)}%`);
    const state = cells[5] as HTMLElement;
    state.dataset.state = proc.state;
    state.textContent = proc.state === "run" ? "运行" : proc.state === "lock" ? "锁页" : "空闲";
  },
});

function paintVlistRange(): void {
  const { start, end } = vlist.visibleRange;
  setText(vlistRange, `${start + 1}–${end} / ${procs.length} 行已挂载`);
}

vlist.setItems(procs);
paintVlistRange();
vlistHost.addEventListener("scroll", paintVlistRange, { passive: true });

window.setInterval(() => {
  for (let index = 0; index < 18; index++) {
    const proc = procs[Math.floor(Math.random() * procs.length)];
    if (!proc) continue;
    proc.cpu = Math.max(0, Math.min(99, proc.cpu + (Math.random() - 0.5) * 18));
    proc.disk = Math.max(0, Math.min(100, proc.disk + (Math.random() - 0.5) * 12));
  }
  vlist.setItems(procs);
  paintVlistRange();
}, 2000);

/* ---------------- spring demo ---------------- */
const springPlay = $("#spring-play");
function playSprings(): void {
  for (const ball of qsa<HTMLElement>(".spring-ball")) {
    const track = ball.parentElement;
    if (!track) continue;
    const spring = springs[(ball.dataset.spring ?? "soft") as keyof typeof springs];
    const distance = Math.max(0, track.clientWidth - ball.offsetWidth - 10);
    ball.getAnimations().forEach((animation) => animation.cancel());
    const forward = ball.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }],
      { duration: spring.duration, easing: spring.easing, fill: "forwards" },
    );
    void forward.finished
      .then(() => {
        if (!ball.isConnected) return undefined;
        return ball.animate(
          [{ transform: `translateX(${distance}px)` }, { transform: "translateX(0)" }],
          { duration: spring.duration, easing: spring.easing, fill: "forwards" },
        ).finished;
      })
      .catch(() => undefined);
  }
}
springPlay.addEventListener("click", playSprings);
for (const ball of qsa<HTMLElement>(".spring-ball")) {
  ball.addEventListener("click", playSprings);
}

/* ---------------- fps ---------------- */
mountFpsHud($("#fps"));

/* initial active nav */
tocLinks[0]?.classList.add("active");
