import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button.tsx";

/**
 * The shared confirmation for destructive acts (the prototype's #confirm alertdialog): the safe button first and
 * focused; Esc keeps; no backdrop dismissal. While `pending`, the dialog stays open, Esc is blocked and the
 * danger button shows its pending label.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  ok,
  cancel = "Keep it",
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  ok: string;
  cancel?: string;
  pending?: string | false;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
      keep.current?.focus();
    } else if (!open && d.open) {
      d.close();
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      id="confirm"
      className="sheet confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-h"
      aria-describedby="confirm-body"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <h2 id="confirm-h">{title}</h2>
      <div id="confirm-body" className="confirm-body">
        {body}
      </div>
      <div className="sheet-actions">
        <Button
          ref={keep}
          variant="secondary"
          id="confirm-cancel"
          aria-disabled={pending ? true : undefined}
          onClick={() => {
            if (!pending) onCancel();
          }}
        >
          {cancel}
        </Button>
        <Button variant="danger" id="confirm-ok" pending={pending} onClick={onConfirm}>
          {ok}
        </Button>
      </div>
    </dialog>
  );
}
