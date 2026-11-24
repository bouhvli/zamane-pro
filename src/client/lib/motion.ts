/**
 * Zamane motion (from the zamane-motion kit): timing tokens and the small hooks the animated pieces use. Pairs with
 * styles/motion.css (same token names). Everything here respects prefers-reduced-motion: counts land at once, bursts
 * don't play, haptics stay quiet.
 */
import { useEffect, useRef, useState } from "react";

/** Milliseconds. Mirrors --dur-* in motion.css. */
export const duration = { instant: 80, fast: 120, base: 200, slow: 320, slower: 480, count: 700 } as const;

/** CSS easing strings for the Web Animations API. Mirrors --ease-* in motion.css. */
export const easing = {
  out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  back: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

const REDUCED = "(prefers-reduced-motion: reduce)";

/** True when the person asked their device for less motion. Read at call time. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.(REDUCED).matches;
}

/** A short tap on Android (iOS ignores it). For confirmations: a tick, a goal reached. */
export function haptic(ms = 10): void {
  try {
    if (!prefersReducedMotion()) navigator.vibrate?.(ms);
  } catch {
    /* not allowed here: fine */
  }
}

/**
 * A number that counts from its last value to the new one (700 ms, eased out), and whether it is counting now.
 * The first render shows the value as is: nothing counts up on page load.
 */
export function useCountUp(value: number, ms: number = duration.count): { shown: number; counting: boolean } {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === value || prefersReducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const v = p < 1 ? from + (value - from) * easeOutCubic(p) : value;
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return { shown, counting: shown !== value };
}

/**
 * Counts how many times `flag` has gone from false to true since mount: 0 until the first time, so something that
 * was already true on load never celebrates. Use the number as a React `key` to replay a one-off animation.
 */
export function useBecameTrue(flag: boolean): number {
  const [count, setCount] = useState(0);
  const prev = useRef(flag);
  useEffect(() => {
    if (flag && !prev.current) setCount((c) => c + 1);
    prev.current = flag;
  }, [flag]);
  return count;
}

/** An eight-point star path centred on (0,0): the brand's tile, used by the burst. */
export function starPath(R: number, rot = Math.PI / 8, inner = 0.6): string {
  let d = "";
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? R : R * inner;
    const a = rot + (i * Math.PI) / 8;
    d += (i ? "L" : "M") + (r * Math.cos(a)).toFixed(2) + " " + (r * Math.sin(a)).toFixed(2);
  }
  return d + "Z";
}
