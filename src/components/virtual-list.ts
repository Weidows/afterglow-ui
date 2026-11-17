/**
 * Fixed-row virtual list. Only the visible window (plus overscan) exists in
 * the DOM; rows are recycled through a pool, so scrolling a 100k-row table
 * allocates nothing after warm-up.
 */
import { el } from "../core/dom";
import { KeyedList } from "../core/keyed";
import { frameThrottle } from "../core/raf";

export interface VirtualListOptions<T> {
  rowHeight?: number;
  overscan?: number;
  create: () => HTMLElement;
  update: (row: HTMLElement, item: T, index: number) => void;
}

interface WindowRow<T> {
  index: number;
  item: T;
}

export class VirtualList<T> {
  readonly host: HTMLElement;
  private readonly sizer: HTMLElement;
  private readonly rowsHost: HTMLElement;
  private readonly list: KeyedList<WindowRow<T>>;
  private readonly options: Required<Pick<VirtualListOptions<T>, "rowHeight" | "overscan">> & VirtualListOptions<T>;
  private readonly pool: HTMLElement[] = [];
  private readonly observer: ResizeObserver;
  private items: readonly T[] = [];
  private start = -1;
  private end = -1;
  private count = -1;

  constructor(host: HTMLElement, options: VirtualListOptions<T>) {
    this.host = host;
    this.options = {
      rowHeight: options.rowHeight ?? 28,
      overscan: options.overscan ?? 4,
      create: options.create,
      update: options.update,
    };

    host.classList.add("ag-vlist");
    host.style.setProperty("--ag-row-h", `${this.options.rowHeight}px`);

    this.sizer = el("div", { class: "ag-vlist__sizer" });
    this.rowsHost = el("div", { class: "ag-vlist__rows" });
    this.sizer.appendChild(this.rowsHost);
    host.appendChild(this.sizer);

    this.list = new KeyedList<WindowRow<T>>(this.rowsHost, {
      key: (row) => row.index,
      create: (row) => {
        const reused = this.pool.pop();
        const node = reused ?? this.options.create();
        node.classList.add("ag-vlist__row");
        node.dataset.index = String(row.index);
        return node;
      },
      update: (node, row) => {
        node.dataset.index = String(row.index);
        this.options.update(node, row.item, row.index);
      },
      remove: (node) => {
        if (this.pool.length < 64) this.pool.push(node);
      },
    });

    host.addEventListener("scroll", this.onScroll, { passive: true });
    this.observer = new ResizeObserver(() => this.render(true));
    this.observer.observe(host);
  }

  setItems(items: readonly T[]): void {
    this.items = items;
    this.sizer.style.height = `${items.length * this.options.rowHeight}px`;
    this.render(true);
  }

  refresh(): void {
    this.render(true);
  }

  scrollToIndex(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.items.length - 1));
    this.host.scrollTop = clamped * this.options.rowHeight;
    this.render(true);
  }

  get visibleRange(): { start: number; end: number } {
    return { start: Math.max(0, this.start), end: Math.max(0, this.end) };
  }

  destroy(): void {
    this.observer.disconnect();
    this.host.removeEventListener("scroll", this.onScroll);
    this.list.clear();
    this.pool.length = 0;
    this.sizer.remove();
    this.host.classList.remove("ag-vlist");
  }

  private readonly onScroll = frameThrottle((): void => {
    this.render(false);
  });

  private render(force: boolean): void {
    const count = this.items.length;
    const height = this.host.clientHeight || this.options.rowHeight * 20;
    const scrollTop = this.host.scrollTop;
    const rowHeight = this.options.rowHeight;

    const first = Math.floor(scrollTop / rowHeight);
    const visible = Math.ceil(height / rowHeight) + 1;
    const start = Math.max(0, first - this.options.overscan);
    const end = Math.min(count, first + visible + this.options.overscan);

    if (!force && start === this.start && end === this.end && count === this.count) return;
    this.start = start;
    this.end = end;
    this.count = count;

    this.rowsHost.style.transform = `translateY(${start * rowHeight}px)`;

    const rows: WindowRow<T>[] = [];
    for (let index = start; index < end; index++) {
      rows.push({ index, item: this.items[index] as T });
    }
    this.list.set(rows);
  }
}
