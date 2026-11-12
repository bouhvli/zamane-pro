import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { say } from "../../lib/announce.ts";

/**
 * Shopping's toast (.ux-forge/shopping shared.js Z.toast): the last child of `main`, so a keyboard user reaches Undo
 * after the list. A toast with Undo stays 30 s (WCAG 2.2.1) and is paused while hovered or focused; a plain one keeps
 * its short life. It is announced with how to dismiss it ("Undo available. Press Escape to dismiss."); `silent` leaves
 * the announcing to the control itself (a tick's checkbox). Esc dismisses it unless a dialog is open; Ctrl/Cmd+Z runs
 * the visible Undo except where it means "undo typing".
 */
export interface ShopToastOptions {
  msg: string;
  undo?: () => void;
  undoLabel?: string;
  /** How long it stays; default 10 s, 30 s with Undo. */
  ms?: number;
  silent?: boolean;
}
export interface ShopToastHandle {
  show: (o: ShopToastOptions) => void;
  hide: () => void;
}

const TOAST_MS = 10_000;
const UNDO_MS = 30_000;

export const ShopToast = forwardRef<ShopToastHandle, { onHiddenWithFocus: () => void }>(function ShopToast(
  { onHiddenWithFocus },
  ref,
) {
  const [t, setT] = useState<ShopToastOptions | null>(null);
  const [entering, setEntering] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hover = useRef(false);
  const focus = useRef(false);
  const ms = useRef(TOAST_MS);
  const undo = useRef<(() => void) | undefined>(undefined);

  const hide = useCallback(() => {
    if (!el.current || el.current.hidden) return;
    const had = el.current.contains(document.activeElement);
    clearTimeout(timer.current);
    hover.current = focus.current = false;
    undo.current = undefined;
    setT(null);
    document.documentElement.classList.remove("toast-open");
    if (had) onHiddenWithFocus();
  }, [onHiddenWithFocus]);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!hover.current && !focus.current) hide();
    }, ms.current);
  }, [hide]);
  const unpause = useCallback(() => {
    if (!hover.current && !focus.current && el.current && !el.current.hidden) schedule();
  }, [schedule]);

  const runUndo = useCallback(() => {
    const u = undo.current;
    hide();
    u?.();
  }, [hide]);

  useImperativeHandle(
    ref,
    () => ({
      show(o) {
        undo.current = o.undo;
        ms.current = o.ms ?? (o.undo ? UNDO_MS : TOAST_MS);
        setT(o);
        setEntering(true);
        document.documentElement.classList.add("toast-open");
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
        if (!o.silent) say(o.msg.replace(/[.!?]$/, "") + (o.undo ? ". Undo available. Press Escape to dismiss." : ""));
        schedule();
      },
      hide,
    }),
    [hide, schedule],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!el.current || el.current.hidden) return;
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector("dialog[open]")) {
        hide();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        !e.isComposing &&
        (e.key === "z" || e.key === "Z") &&
        undo.current &&
        !document.querySelector("dialog[open]")
      ) {
        const target = e.target as Element | null;
        if (
          target?.closest?.(
            'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]),textarea,select,[contenteditable]',
          )
        )
          return;
        e.preventDefault();
        runUndo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hide, runUndo]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      document.documentElement.classList.remove("toast-open");
    },
    [],
  );

  return (
    <div
      id="toast"
      ref={el}
      className={`toast${entering ? " is-entering" : ""}`}
      hidden={!t}
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => {
        hover.current = false;
        unpause();
      }}
      onFocus={() => (focus.current = true)}
      onBlur={() => {
        focus.current = false;
        unpause();
      }}
    >
      <div className="toast-text">
        <span className="toast-title" />
        <span className="toast-msg">{t?.msg ?? ""}</span>
      </div>
      <button
        className="toast-undo"
        type="button"
        hidden={!t?.undo}
        aria-label={t?.undo ? (t.undoLabel ?? "Undo") : undefined}
        onClick={runUndo}
      >
        Undo
      </button>
    </div>
  );
});
