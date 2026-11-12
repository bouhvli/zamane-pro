import { useEffect, useRef, type PointerEvent, type MouseEvent, type SyntheticEvent } from "react";

const phone = () => window.matchMedia("(max-width: 47.99rem)").matches;

/** Z.placeSheet: a bottom sheet rides the on-screen keyboard (the visual viewport). */
function placeSheet(d: HTMLDialogElement) {
  if (d.hasAttribute("data-no-place")) return;
  const vv = window.visualViewport;
  if (!vv || !d.open || !phone() || vv.scale > 1.01) {
    d.style.bottom = "";
    d.style.maxHeight = "";
    return;
  }
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  d.style.bottom = kb > 0 ? `${kb}px` : "";
  d.style.maxHeight = `${vv.height - 8}px`;
}

/** The form dialog on phones is the visual viewport itself: its footer and submit ride the keyboard. */
function placeForm(d: HTMLDialogElement) {
  if (!d.open) return;
  const vv = window.visualViewport;
  if (!vv || !phone() || vv.scale > 1.01) {
    d.style.top = d.style.height = d.style.bottom = d.style.maxHeight = "";
    return;
  }
  d.style.top = `${vv.offsetTop}px`;
  d.style.bottom = "auto";
  d.style.height = `${vv.height}px`;
  d.style.maxHeight = "none";
}

/**
 * A native modal driven by `open`: showModal / close in step with the flag, keyboard-aware placement, and backdrop
 * dismissal only when the press starts and ends outside (WCAG 2.5.2). Esc and the close watcher go to `onRequestClose`
 * (the discard guard), never straight to close.
 */
export function useDialog(open: boolean, onRequestClose: () => void, kind: "sheet" | "form") {
  const ref = useRef<HTMLDialogElement>(null);
  const pressed = useRef(false);
  const place = kind === "sheet" ? placeSheet : placeForm;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) {
      d.style.top = d.style.height = d.style.bottom = d.style.maxHeight = "";
      return;
    }
    place(d);
    const on = () => place(d);
    window.visualViewport?.addEventListener("resize", on);
    window.visualViewport?.addEventListener("scroll", on);
    window.addEventListener("resize", on);
    return () => {
      window.visualViewport?.removeEventListener("resize", on);
      window.visualViewport?.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [open, place]);
  const outside = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  return {
    ref,
    props: {
      onPointerDown: (e: PointerEvent<HTMLDialogElement>) => {
        pressed.current = e.target === ref.current && outside(e);
      },
      onClick: (e: MouseEvent<HTMLDialogElement>) => {
        if (e.target === ref.current && pressed.current && outside(e)) onRequestClose();
        pressed.current = false;
      },
      onCancel: (e: SyntheticEvent) => {
        e.preventDefault();
        onRequestClose();
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        // Esc goes through the guard; caught on keydown so the close watcher can't skip it.
        if (e.key === "Escape" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onRequestClose();
        }
      },
    },
  };
}
