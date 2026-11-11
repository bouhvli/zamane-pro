import { useEffect, useRef, type ReactNode } from "react";
import { day, time, toDate, type EntryItem, type GoalItem } from "../../../lib/goals.ts";
import { Icon } from "../../Icon.tsx";
import { PartnerAvatarSm } from "../Avatar.tsx";
import type { People } from "./Feeds.tsx";

/** A native modal driven by `open`; backdrop dismissal only when the press starts and ends outside (WCAG 2.5.2). */
function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressed = useRef(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const outside = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  return {
    ref,
    props: {
      onPointerDown: (e: React.PointerEvent<HTMLDialogElement>) =>
        (pressed.current = e.target === ref.current && outside(e)),
      onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === ref.current && pressed.current && outside(e)) onClose();
        pressed.current = false;
      },
      onCancel: (e: React.SyntheticEvent) => {
        e.preventDefault();
        onClose();
      },
    },
  };
}

const LIVE = <p className="vh dlg-live" role="status" />;

/** "Sat 7 Nov 2026": the entry sheet wants the full year. */
function fullDay(at: string) {
  const d = toDate(at);
  const s = day(d);
  return d.getFullYear() === new Date().getFullYear() ? `${s} ${d.getFullYear()}` : s;
}

/** The entry sheet (D5, F4): who, what, when, the note, and Delete. */
export function EntrySheet({
  open,
  goal,
  entry,
  p,
  offline,
  onClose,
  onDelete,
}: {
  open: boolean;
  goal: GoalItem;
  entry: EntryItem | null;
  p: People;
  offline: boolean;
  onClose: () => void;
  onDelete: (blocked: boolean) => void;
}) {
  const m = useModal(open, onClose);
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open) head.current?.focus();
  }, [open]);
  const money = goal.kind === "money";
  let body: ReactNode = null;
  if (entry) {
    const name = p.name(entry.userId);
    const blocked = offline && !entry.pending; // a queued entry can still be removed offline (D8)
    body = (
      <>
        <div className="gd-ent">
          <PartnerAvatarSm slot={p.slot(entry.userId)} name={name} size="lg" />
          <div className="gd-ent-text">
            <p className="title">
              {money ? `${name} added ${p.mad(entry.amount ?? 0)}` : `${name} moved it to ${entry.percent}%`}
            </p>
            {entry.pending ? (
              <p className="gd-ent-when">
                <Icon name="cloud-off" />
                Waiting to sync
              </p>
            ) : (
              <p className="gd-ent-when">
                {fullDay(entry.at)} at {time(entry.at)}
              </p>
            )}
            {entry.note && (
              <p className="gd-ent-note" dir="auto">
                {entry.note}
              </p>
            )}
          </div>
        </div>
        <div className="sheet-actions">
          <button
            className="btn-danger"
            type="button"
            data-act="delete"
            id="gd-entry-delete"
            aria-disabled={blocked ? true : undefined}
            aria-describedby={blocked ? "gd-entry-why" : undefined}
            onClick={() => onDelete(blocked)}
          >
            <Icon name="trash" />
            {entry.pending ? "Remove" : money ? "Delete contribution" : "Delete update"}
          </button>
          {blocked && (
            <p className="help" id="gd-entry-why">
              Deleting needs a connection.
            </p>
          )}
        </div>
      </>
    );
  }
  return (
    <dialog ref={m.ref} className="sheet gd-sheet" id="gd-entry" aria-labelledby="gd-entry-h" {...m.props}>
      <div className="sheet-head">
        <h2 id="gd-entry-h" tabIndex={-1} ref={head}>
          {money ? "Contribution" : "Update"}
        </h2>
        <button className="icon-btn" type="button" data-act="close" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      {body}
      {LIVE}
    </dialog>
  );
}

/** The photo viewer: full screen on phones, centred from 48rem. */
export function PhotoViewer({
  open,
  src,
  alt,
  onClose,
}: {
  open: boolean;
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  const m = useModal(open, onClose);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) close.current?.focus();
  }, [open]);
  return (
    <dialog ref={m.ref} className="gd-viewer" id="gd-viewer" aria-label="Photo" {...m.props}>
      {open && (
        <>
          <button
            ref={close}
            className="icon-btn gd-viewer-close"
            type="button"
            data-act="close"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
          <figure className="gd-viewer-fig">{src && <img src={src} alt={alt} />}</figure>
          {LIVE}
        </>
      )}
    </dialog>
  );
}
