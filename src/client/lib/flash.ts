import type { ToastOptions } from "../components/Toast.tsx";

/**
 * The prototype's Z.flash: something to show on the next screen after a navigation (a toast such as "Changes
 * saved" or "Wedding fund deleted"), plus the element to focus there (after saving or cancelling Edit, the
 * goal's Edit button, #gd-edit). The destination takes it once, on mount.
 */
export interface Flash {
  toast?: ToastOptions;
  /** id of the element to focus on arrival. */
  focus?: string;
}

let pending: Flash | null = null;

export function setFlash(f: Flash) {
  pending = f;
}

/** Returns the waiting flash (once) and forgets it. */
export function takeFlash(): Flash | null {
  const f = pending;
  pending = null;
  return f;
}
