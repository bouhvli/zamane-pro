import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { duration, easing, usePresence } from '../../lib/motion';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Read out as the dialog's name and shown as its heading. */
  title: string;
  children: ReactNode;
}

/**
 * A bottom sheet: springs up, slides away, and can be dragged down to close.
 * Escape and a tap on the backdrop close it too. Focus moves into it and back to
 * where it was when it closes; the page behind doesn't scroll while it's open.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const { mounted, state } = usePresence(open, 240);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!mounted || typeof document === 'undefined') return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const p = panel.current;
    if (!d || !p) return;
    d.dy = Math.max(0, e.clientY - d.y);
    p.style.transform = `translateY(${d.dy}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    const p = panel.current;
    drag.current = null;
    if (!d || !p) return;
    const speed = d.dy / Math.max(1, performance.now() - d.t); // px per ms
    if (d.dy > 120 || (d.dy > 24 && speed > 0.5)) {
      close.current(); // keeps the inline offset, so the exit continues from where the finger let go
      return;
    }
    p.style.transform = '';
    p.animate([{ transform: `translateY(${d.dy}px)` }, { transform: 'translateY(0)' }], {
      duration: duration.slow,
      easing: easing.back,
    });
  };

  return createPortal(
    <div className="zm-sheet-layer" data-state={state}>
      <div className="zm-sheet-backdrop" onClick={() => close.current()} />
      <div ref={panel} className="zm-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div
          className="zm-sheet-handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span />
        </div>
        <h2 className="zm-sheet-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
