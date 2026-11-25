import { useSyncExternalStore } from 'react';

type Partner = 'a' | 'b';
export interface ToastOptions {
  /** Shows the partner's avatar: "Youssef added Mint". */
  who?: { name: string; partner: Partner };
  /** Milliseconds on screen. Default: one second plus 60 ms a character, 3–6 s. */
  duration?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
  text: string;
  leaving?: boolean;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => items;

/** Show a short message at the bottom of the screen. Returns its id. */
export function toast(text: string, options: ToastOptions = {}): number {
  const id = ++seq;
  items = [...items, { id, text, ...options }].slice(-3);
  emit();
  const ms = options.duration ?? Math.min(6000, Math.max(3000, 1000 + text.length * 60));
  setTimeout(() => dismissToast(id), ms);
  return id;
}

export function dismissToast(id: number): void {
  if (!items.some((t) => t.id === id && !t.leaving)) return;
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 240);
}

/** Mount once, near the root of the app. */
export function ToastViewport() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <div className="zm-toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="zm-toast" data-state={t.leaving ? 'closing' : 'open'} onClick={() => dismissToast(t.id)}>
          {t.who && (
            <span className={`zm-av zm-av-${t.who.partner} zm-av-sm`} aria-hidden="true">
              {t.who.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
