/**
 * DPR-aware canvas sparkline: one path, one gradient fill, no axes. Redraws
 * are coalesced to a frame, so pushing a sample from a polling loop cannot
 * cause more than 60 draws a second.
 */
import { frameThrottle } from "../core/raf";

export interface SparklineOptions {
  stroke?: string;
  fill?: string;
  lineWidth?: number;
  min?: number;
  max?: number;
  padding?: number;
  maxPoints?: number;
  area?: boolean;
}

export class Sparkline {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly options: SparklineOptions;
  private readonly observer: ResizeObserver;
  private data: number[] = [];
  private frame = 0;
  private width = 0;
  private height = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: SparklineOptions = {},
  ) {
    this.options = {
      lineWidth: 1.6,
      padding: 3,
      maxPoints: 120,
      area: true,
      ...options,
    };
    canvas.classList.add("ag-spark");
    this.ctx = canvas.getContext("2d");
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  setData(data: readonly number[]): void {
    this.data = data.slice(-(this.options.maxPoints ?? 120));
    this.schedule();
  }

  push(value: number): void {
    this.data.push(value);
    const max = this.options.maxPoints ?? 120;
    if (this.data.length > max) this.data.splice(0, this.data.length - max);
    this.schedule();
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
  }

  private readonly schedule = frameThrottle((): void => this.draw());

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.width || !this.height) return;

    ctx.clearRect(0, 0, this.width, this.height);
    const values = this.data;
    if (values.length < 2) return;

    const style = getComputedStyle(this.canvas);
    const stroke = this.options.stroke ?? style.color ?? "#63c6ff";
    const pad = this.options.padding ?? 3;
    const top = pad;
    const bottom = this.height - pad;
    const left = 0;
    const right = this.width;

    let min = this.options.min;
    let max = this.options.max;
    if (min == null || max == null) {
      let dataMin = Infinity;
      let dataMax = -Infinity;
      for (const value of values) {
        if (value < dataMin) dataMin = value;
        if (value > dataMax) dataMax = value;
      }
      min ??= dataMin;
      max ??= dataMax;
    }
    const span = max - min || 1;
    const stepX = (right - left) / (values.length - 1);
    const y = (value: number): number => bottom - ((value - min) / span) * (bottom - top);

    ctx.beginPath();
    ctx.moveTo(left, y(values[0] as number));
    for (let index = 1; index < values.length; index++) {
      ctx.lineTo(left + index * stepX, y(values[index] as number));
    }

    if (this.options.area !== false) {
      ctx.save();
      ctx.lineTo(right, this.height);
      ctx.lineTo(left, this.height);
      ctx.closePath();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = this.options.fill ?? stroke;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(left, y(values[0] as number));
      for (let index = 1; index < values.length; index++) {
        ctx.lineTo(left + index * stepX, y(values[index] as number));
      }
    }

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = this.options.lineWidth ?? 1.6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    const lastY = y(values[values.length - 1] as number);
    ctx.beginPath();
    ctx.arc(right - 1.5, lastY, 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke;
    ctx.fill();
  }
}
