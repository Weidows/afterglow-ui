import { describe, expect, it } from "vitest";
import { computed, effect, flushEffects, signal, untracked, bind } from "../src/core/signal";
import { lisIndices } from "../src/core/keyed";
import { springEasing, springs } from "../src/core/spring";

describe("signals", () => {
  it("runs effects once and coalesces a burst of writes", () => {
    const value = signal(0);
    const seen: number[] = [];
    effect(() => {
      seen.push(value());
    });
    value.set(1);
    value.set(2);
    value.set(3);
    flushEffects();
    expect(seen).toEqual([0, 3]);
  });

  it("recomputes only when a dependency changed", () => {
    const a = signal(2);
    let runs = 0;
    const doubled = computed(() => {
      runs++;
      return a() * 2;
    });
    expect(doubled()).toBe(4);
    expect(doubled()).toBe(4);
    expect(runs).toBe(1);
    a.set(3);
    expect(doubled()).toBe(6);
    expect(runs).toBe(2);
  });

  it("re-collects dependencies on every run", () => {
    const chooseA = signal(true);
    const a = signal(1);
    const b = signal(10);
    let runs = 0;
    effect(() => {
      runs++;
      chooseA() ? a() : b();
    });
    b.set(11);
    flushEffects();
    expect(runs).toBe(1);
    chooseA.set(false);
    flushEffects();
    expect(runs).toBe(2);
    a.set(2);
    flushEffects();
    expect(runs).toBe(2);
    b.set(12);
    flushEffects();
    expect(runs).toBe(3);
  });

  it("supports cleanup, disposal and untracked reads", () => {
    const value = signal(1);
    let runs = 0;
    let cleanups = 0;
    const stop = effect(() => {
      runs++;
      value();
      untracked(() => value.peek());
      return () => {
        cleanups++;
      };
    });
    value.set(2);
    flushEffects();
    expect(runs).toBe(2);
    stop();
    expect(cleanups).toBe(2);
    value.set(3);
    flushEffects();
    expect(runs).toBe(2);
  });

  it("binds only on actual changes", () => {
    const width = signal(10);
    const seen: number[] = [];
    bind(width, (value) => seen.push(value));
    width.set(10);
    flushEffects();
    width.set(12);
    flushEffects();
    expect(seen).toEqual([10, 12]);
  });
});

describe("keyed list LIS", () => {
  it("keeps an already ordered list stable", () => {
    expect([...lisIndices([0, 1, 2, 3])].sort()).toEqual([0, 1, 2, 3]);
  });

  it("finds a longest increasing subsequence after a rotation", () => {
    const sequence = [2, 3, 0, 1];
    const stable = lisIndices(sequence);
    const values = [...stable].sort((a, b) => a - b).map((index) => sequence[index] as number);
    expect(stable.size).toBe(2);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("ignores new-item sentinels", () => {
    const stable = lisIndices([-1, 0, -1, 1]);
    expect([...stable].sort()).toEqual([1, 3]);
  });

  it("handles an empty sequence", () => {
    expect(lisIndices([]).size).toBe(0);
  });
});

describe("spring easing", () => {
  it("starts at 0, ends at 1 and stays inside a sane duration", () => {
    for (const spring of Object.values(springs)) {
      expect(spring.easing.startsWith("linear(0,")).toBe(true);
      expect(spring.easing.endsWith(", 1)")).toBe(true);
      expect(spring.duration).toBeGreaterThan(100);
      expect(spring.duration).toBeLessThanOrEqual(1200);
    }
  });

  it("overshoots for an underdamped spring", () => {
    const bouncy = springEasing({ stiffness: 420, damping: 22 });
    const values = bouncy.easing
      .replace(/^linear\(|\)$/g, "")
      .split(", ")
      .map(Number);
    expect(Math.max(...values)).toBeGreaterThan(1);
  });

  it("does not overshoot when critically damped", () => {
    const plain = springEasing({ stiffness: 200, damping: 60 });
    const values = plain.easing
      .replace(/^linear\(|\)$/g, "")
      .split(", ")
      .map(Number);
    expect(Math.max(...values)).toBeLessThanOrEqual(1.001);
  });
});
