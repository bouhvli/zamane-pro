// Zamane motion — timing tokens and the small hooks every animated component uses.
// No dependencies besides React. Pairs with styles/motion.css (same token names).
import { useEffect, useRef, useState } from 'react';

/** Milliseconds. Mirrors --dur-* in motion.css. */
export const duration = { instant: 80, fast: 120, base: 200, slow: 320, slower: 480, count: 700 } as const;

/** CSS easing strings for the Web Animations API. Mirrors --ease-* in motion.css. */
export const easing = {
  out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  back: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}

const REDUCED = '(prefers-reduced-motion: reduce)';

/** True when the person asked their device for less motion. Read at call time. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED).matches;
}

/** The same, as state that follows the setting while the app is open. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCED);
    if (!mq) return;
    const update = () => setReduced(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Web Animations call that jumps straight to the end when reduced motion is on. */
export function animate(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  if (typeof el.animate !== 'function') return null;
  const a = el.animate(keyframes, options);
  if (prefersReducedMotion()) a.finish();
  return a;
}

/** A short tap on Android (iOS ignores it). Use for confirmations: a tick, a goal reached. */
export function haptic(ms = 10): void {
  try {
    if (!prefersReducedMotion()) navigator.vibrate?.(ms);
  } catch {
    /* not allowed here: fine */
  }
}

/**
 * A number that counts from its last value to the new one (700 ms, eased out).
 * The first render shows the value as is: nothing counts up on page load.
 */
export function useCountUp(value: number, ms: number = duration.count): number {
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
      const v = from + (value - from) * easeOutCubic(p);
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/**
 * Counts how many times `flag` has gone from false to true since mount.
 * 0 until the first time, so a goal that was already done on load never celebrates.
 * Use the number as a React `key` to replay a one-off animation.
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

/**
 * The value, `ms` later. Used to let a tick be seen before the row moves:
 * group shopping items by `useLagged(item.bought, 650)` instead of `item.bought`.
 */
export function useLagged<T>(value: T, ms: number): T {
  const [lagged, setLagged] = useState(value);
  useEffect(() => {
    if (Object.is(value, lagged)) return;
    const id = setTimeout(() => setLagged(value), ms);
    return () => clearTimeout(id);
  }, [value, lagged, ms]);
  return lagged;
}

/**
 * Keeps something mounted while it animates out.
 * `state` is 'open' while `open` is true, then 'closing' for `exitMs` before `mounted` turns false.
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; state: 'open' | 'closing' } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const id = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(id);
  }, [open, mounted, exitMs]);
  return { mounted: open || mounted, state: open ? 'open' : 'closing' };
}

/** An eight-point star path centred on (0,0): the brand's tile, used by the spinner and the burst. */
export function starPath(R: number, rot = Math.PI / 8, inner = 0.6): string {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? R : R * inner;
    const a = rot + (i * Math.PI) / 8;
    d += (i ? 'L' : 'M') + (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}
