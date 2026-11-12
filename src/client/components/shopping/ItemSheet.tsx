import { useEffect, useRef, type MouseEvent } from "react";
import { dayTime, day } from "../../lib/goals.ts";
import { qtyText, type ShopPeople, type ShoppingItem } from "../../lib/shopping.ts";
import { Icon } from "../Icon.tsx";
import { initial } from "../Seat.tsx";
import { useDialog } from "../trips/dialogs/modal.ts";
import { announce } from "./util.ts";

/**
 * The item sheet (.ux-forge/shopping dialogs.js #item-sheet): the read view of one row. A bottom sheet on phones,
 * centred 28 rem from 48 rem. It has no URL, but it has one history entry, so Back closes it (the host owns that).
 * Actions: Put back on the list (bought) · Edit · Delete. Offline, Edit and Delete are aria-disabled with the reason
 * beside them, read again on press. A queued add can only be removed from the queue; a row the server refused offers
 * Try again / Remove. A partner's edit re-renders it in place; a partner's delete swaps the body to a message.
 */
const C = {
  close: "Close",
  edit: "Edit",
  del: "Delete",
  putBack: "Put back on the list",
  remove: "Remove from the queue",
  retry: "Try again",
  failedBody: "This item couldn't sync. Try again, or remove it.",
  category: "Category",
  other: "Other",
  notes: "Notes",
  queued: "Waiting to sync",
  rEdit: "Editing needs a connection.",
  rQueued: "This item hasn't synced yet.",
  rDelete: "Deleting needs a connection.",
};

export interface SheetProps {
  /** The sheet is shown. */
  open: boolean;
  /** The row (the last one seen when it was just deleted). */
  item: ShoppingItem | null;
  /** The row is gone and somebody else removed it: their id (null = unknown, shown as "was deleted"). */
  gone: { by: string | null } | null;
  people: ShopPeople;
  online: boolean;
  /** A write from this sheet is running: the actions wait. */
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveQueued: () => void;
  onRetry: () => void;
  onPutBack: () => void;
  /** Where the destructive confirmation or a failure is spoken: the sheet's own alert. */
  alertRef?: React.RefObject<HTMLParagraphElement | null>;
}

function Avatar({ id, people }: { id: string; people: ShopPeople }) {
  if (people.solo) return null;
  return (
    <span className={`zm-av zm-av-${people.slot(id)} zm-av-xs`} aria-hidden="true">
      {initial(people.name(id)) || "?"}
    </span>
  );
}

export function ItemSheet(p: SheetProps) {
  const { item: it, people, online } = p;
  const dlg = useDialog(p.open, p.onClose, "sheet");
  const title = useRef<HTMLHeadingElement>(null);
  const goneClose = useRef<HTMLButtonElement>(null);
  const was = useRef(false);

  useEffect(() => {
    if (p.open && !was.current) {
      title.current?.closest("dialog")?.scrollTo(0, 0);
      title.current?.focus({ preventScroll: true }); // the title names the sheet
    }
    was.current = p.open;
  }, [p.open]);
  // The row was deleted by the partner while the sheet is open: focus goes to Close.
  useEffect(() => {
    if (p.gone && p.open) goneClose.current?.focus();
  }, [p.gone, p.open]);

  const reasonText = (e: MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    if (el.getAttribute("aria-disabled") !== "true") return false;
    e.preventDefault();
    const id = (el.getAttribute("aria-describedby") ?? "").split(" ")[0];
    const r = id ? document.getElementById(id) : null;
    if (r) announce(r.textContent ?? "");
    return true;
  };
  const act = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    if (reasonText(e)) return;
    fn();
  };

  const head = (name: string) => (
    <div className="ish-head">
      <h2 id="ish-h" ref={title} className="ish-title" tabIndex={-1} dir="auto">
        {name}
      </h2>
      <button type="button" className="icon-btn" aria-label={C.close} onClick={p.onClose}>
        <Icon name="x" />
      </button>
    </div>
  );

  let body = null;
  if (p.open && p.gone && it) {
    const who = !p.gone.by || people.solo ? null : people.name(p.gone.by);
    body = (
      <>
        {head(it.name)}
        <p className="ish-gone" id="ish-gone">
          {who ? `${who} deleted ${it.name}.` : `${it.name} was deleted.`}
        </p>
        <div className="ish-acts">
          <button ref={goneClose} type="button" className="btn-sec" aria-describedby="ish-gone" onClick={p.onClose}>
            {C.close}
          </button>
        </div>
      </>
    );
  } else if (p.open && it) {
    const blocked = p.busy;
    let editOff = false;
    let delOff = false;
    const why: [string, string][] = [];
    if (!it.failed) {
      if (it.unsynced) {
        editOff = true;
        why.push(["ish-why-edit", C.rQueued]);
      } else if (!online) {
        editOff = delOff = true;
        why.push(["ish-why-edit", C.rEdit], ["ish-why-del", C.rDelete]);
      }
    }
    body = (
      <>
        {head(it.name)}
        <p className="ish-sum">
          <span className="num">{qtyText(it.quantity, it.unit)}</span>
        </p>
        <dl className="ish-facts">
          <div className="ish-row">
            <dt>{C.category}</dt>
            <dd dir="auto">{it.category || C.other}</dd>
          </div>
        </dl>
        {it.notes && (
          <div className="ish-notes">
            <h3 className="ish-label">{C.notes}</h3>
            <p dir="auto">{it.notes}</p>
          </div>
        )}
        <p className="ish-by">
          <Avatar id={it.createdBy} people={people} />
          <span>{`Added by ${people.who(it.createdBy)} · ${day(it.createdAt)}`}</span>
        </p>
        {it.boughtAt && (
          <p className="ish-by ish-done">
            <Icon name="check" />
            <span>
              {`Bought by ${!people.solo && it.boughtBy === people.meId ? "you" : people.who(it.boughtBy)} · ${dayTime(it.boughtAt)}`}
            </span>
          </p>
        )}
        {it.pending && (
          <p className="queued ish-queued">
            <Icon name="cloud-off" />
            <span>{C.queued}</span>
          </p>
        )}
        {it.failed ? (
          <>
            <div className="notice notice-danger ish-failed" role="group" aria-label={it.name}>
              <Icon name="alert" />
              <span>{C.failedBody}</span>
            </div>
            <div className="ish-acts">
              <button
                type="button"
                className="btn-sec"
                aria-label={`Try again: ${it.name}`}
                aria-disabled={blocked || undefined}
                onClick={act(p.onRetry)}
              >
                <Icon name="refresh" />
                {C.retry}
              </button>
              <button
                type="button"
                className="btn-danger"
                aria-label={`Remove ${it.name} from the queue`}
                onClick={act(p.onRemoveQueued)}
              >
                <Icon name="trash" />
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ish-acts">
              {it.boughtAt && (
                <button
                  type="button"
                  className="btn-sec"
                  aria-label={`${C.putBack}: ${it.name}`}
                  aria-disabled={blocked || undefined}
                  onClick={act(p.onPutBack)}
                >
                  {C.putBack}
                </button>
              )}
              <button
                type="button"
                className="btn-sec"
                aria-label={`Edit ${it.name}`}
                aria-disabled={editOff || blocked || undefined}
                aria-describedby={editOff ? "ish-why-edit" : undefined}
                onClick={act(p.onEdit)}
              >
                <Icon name="pencil" />
                {C.edit}
              </button>
              {it.unsynced ? (
                <button
                  type="button"
                  className="btn-danger ish-del"
                  aria-label={`Remove ${it.name} from the queue`}
                  onClick={act(p.onRemoveQueued)}
                >
                  <Icon name="trash" />
                  {C.remove}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-danger ish-del"
                  aria-label={`Delete ${it.name}`}
                  aria-disabled={delOff || blocked || undefined}
                  aria-describedby={delOff ? "ish-why-del" : undefined}
                  onClick={act(p.onDelete)}
                >
                  <Icon name="trash" />
                  {C.del}
                </button>
              )}
            </div>
            {why.length > 0 && (
              <p className="ish-reasons">
                {why.map(([id, text]) => (
                  <span key={id} id={id}>
                    <Icon name="cloud-off" />
                    {text}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <dialog ref={dlg.ref} id="item-sheet" className="sheet ish" aria-labelledby="ish-h" {...dlg.props}>
      <div className="ish-body" id="ish-body">
        {body}
      </div>
      <p className="vh dlg-live" role="status" />
      <p className="vh" role="alert" ref={p.alertRef} />
    </dialog>
  );
}
