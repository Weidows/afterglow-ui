/**
 * Physics-derived CSS easing. `linear()` takes sampled progress values, so a
 * real spring can be handed straight to a transition or the Web Animations
 * API without shipping a physics loop at runtime.
 */

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  samples?: number;
  /** Returned duration is clamped to this range, in ms. */
  minDuration?: number;
  maxDuration?: number;
}

export interface SpringEasing {
  easing: string;
  duration: number;
}

export function springEasing(options: SpringOptions = {}): SpringEasing {
  const stiffness = options.stiffness ?? 260;
  const damping = options.damping ?? 26;
  const mass = options.mass ?? 1;
  const samples = Math.max(8, options.samples ?? 40);
  const minDuration = options.minDuration ?? 120;
  const maxDuration = options.maxDuration ?? 1200;

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const omegaD = omega0 * Math.sqrt(Math.max(0, 1 - zeta * zeta));

  const progress = (t: number): number => {
    if (zeta >= 1) {
      // Critically damped: no oscillation.
      return 1 - Math.exp(-omega0 * t) * (1 + omega0 * t);
    }
    return 1 - Math.exp(-zeta * omega0 * t) *
      (Math.cos(omegaD * t) + (zeta * omega0 / omegaD) * Math.sin(omegaD * t));
  };

  const envelope = zeta > 0 ? 8 / (zeta * omega0) : 0.6;
  let duration = Math.min(maxDuration, Math.max(minDuration, envelope * 1000));
  // Trim the tail where the curve is already settled.
  while (duration > minDuration && Math.abs(1 - progress(duration / 1000)) < 0.0008) {
    duration -= 5;
  }

  const values: string[] = [];
  for (let index = 0; index < samples; index++) {
    const t = (duration / 1000) * (index / (samples - 1));
    const v = index === 0 ? 0 : index === samples - 1 ? 1 : progress(t);
    values.push(format(v));
  }

  return { easing: `linear(${values.join(", ")})`, duration: Math.round(duration) };
}

/** Units used by the shipped CSS tokens (keep in sync with tokens.css). */
export const springs = {
  snap: springEasing({ stiffness: 700, damping: 38 }),
  soft: springEasing({ stiffness: 260, damping: 26 }),
  bounce: springEasing({ stiffness: 420, damping: 22 }),
} as const;

function format(value: number): string {
  if (value === 0 || value === 1) return String(value);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
