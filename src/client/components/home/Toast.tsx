import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { say } from "../../lib/announce.ts";

/**
 * Home's toast (home.html): above the floating button on phones, centred from 48rem. 10 s, paused while hovered or
 * focused, restarted after that (WCAG 2.2.1); Esc dismisses it unless the sheet is open. Placed right after the
 * primary in the DOM so Undo is one Tab away. Announced politely, with "Undo is the next button." when it has one.
 */
export interface ToastOptions {
  title?: string;
  msg: string;
  done?: boolean;
  undo?: () => void;
  undoLabel?: string;
}
export interface ToastHandle {
  show: (o: ToastOptions) => void;
  hide: () => void;
}

const TOAST_MS = 10_000;

export const Toast = forwardRef<ToastHandle, { onHiddenWithFocus: () => void }>(function Toast(
  { onHiddenWithFocus },
  ref,
) {
  const [t, setT] = useState<ToastOptions | null>(null);
  const [entering, setEntering] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const paused = useRef(false);

  const hide = useCallback(() => {
    const had = !!el.current?.contains(document.activeElement);
    clearTimeout(timer.current);
    setT(null);
    document.documentElement.classList.remove("toast-open");
    if (had) onHiddenWithFocus();
  }, [onHiddenWithFocus]);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(function tick() {
      if (!paused.current) hide();
      else timer.current = setTimeout(tick, TOAST_MS);
    }, TOAST_MS);
  }, [hide]);

  useImperativeHandle(
    ref,
    () => ({
      show(o) {
        setT(o);
        setEntering(true);
        document.documentElement.classList.add("toast-open");
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
        say((o.title ? `${o.title} ` : "") + o.msg + (o.undo ? " Undo is the next button." : ""));
        schedule();
      },
      hide,
    }),
    [hide, schedule],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !t) return;
      if (document.querySelector("#qa-sheet[open]")) return;
      hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [t, hide]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div
      id="toast"
      ref={el}
      className={`toast${t?.done ? " is-done" : ""}${entering ? " is-entering" : ""}`}
      hidden={!t}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div className="toast-text">
        <span className="toast-title">{t?.title ?? ""}</span>
        <span className="toast-msg">{t?.msg ?? ""}</span>
      </div>
      <button
        className="toast-undo"
        type="button"
        hidden={!t?.undo}
        aria-label={t?.undo ? (t.undoLabel ?? "Undo") : undefined}
        onClick={() => t?.undo?.()}
      >
        Undo
      </button>
    </div>
  );
});
