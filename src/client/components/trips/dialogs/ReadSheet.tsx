import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatAmount } from "../../../../shared/money.ts";
import { CHECKLIST_GROUPS, type ChecklistGroup } from "../../../../shared/enums.ts";
import { entryOf } from "../../../../shared/trip-plan.ts";
import { isApiError } from "../../../lib/api.ts";
import { day, time } from "../../../lib/goals.ts";
import {
  groupName,
  invalidateTrip,
  putItem,
  tripQuery,
  typeName,
  updateItem,
  type ChecklistItem,
  type EntryItem,
  type PlaceItem,
  type TripData,
} from "../../../lib/trips.ts";
import type { ToastOptions } from "../../Toast.tsx";
import { Icon } from "../../Icon.tsx";
import { PartnerAvatarSm } from "../../goals/Avatar.tsx";
import type { TripActions } from "./actions.ts";
import type { AskOptions } from "./Confirm.tsx";
import {
  alertIn,
  announceIn,
  describedBy,
  Err,
  host,
  isIso,
  land,
  MarkView,
  textDef,
  validUrl,
  type Opener,
  type People,
} from "./common.tsx";
import { C, MAX, nounOf, tooLong, type Kind } from "./copy.ts";
import { useEngine, type Def } from "./engine.ts";
import { useDialog } from "./modal.ts";

export interface SheetState {
  kind: Kind;
  id: string;
  opener: Opener | null;
}
export interface SheetNav {
  edit(kind: "entry" | "place", id: string, opener: Opener | null): void;
  schedule(id: string, opener: Opener | null): void;
  showInPlan(entryId: string): void;
  fromPlace(placeId: string): void;
}

// ---------- words ----------

const whenText = (e: EntryItem) =>
  !e.date
    ? C.noDate
    : !e.start
      ? `${day(e.date)} · ${C.anyTime}`
      : `${day(e.date)}, ${e.end ? `${e.start}–${e.end}` : e.start}`;
const whenSr = (e: EntryItem) => (e.date && e.start && e.end ? `${day(e.date)}, ${e.start} to ${e.end}` : whenText(e));
const inPlanWhen = (e: EntryItem) => (e.date ? day(e.date) + (e.start ? `, ${e.start}` : "") : "no date yet");
const overnight = (e: EntryItem) => !!(e.start && e.end && e.end < e.start);

function By({ people, who, text }: { people: People; who: string; text: string }) {
  return (
    <p className="dg-by">
      <PartnerAvatarSm slot={people.slot(who)} name={people.name(who)} />
      <span>{text}</span>
    </p>
  );
}
const added = (people: People, r: { createdBy: string; createdAt: string }) =>
  `Added by ${people.name(r.createdBy)} · ${day(r.createdAt)}`;
const doneText = (people: People, r: { doneBy: string | null; doneAt: string | null }) =>
  `Done by ${people.name(r.doneBy)} · ${day(r.doneAt!)} at ${time(r.doneAt!)}`;
const Done = ({ text }: { text: string }) => (
  <p className="dg-done">
    <Icon name="check" />
    <span>{text}</span>
  </p>
);
const Queued = () => (
  <p className="queued dg-queued">
    <Icon name="cloud-off" />
    <span>{C.queued}</span>
  </p>
);
function Link({ url }: { url: string }) {
  if (!validUrl(url)) return <span dir="auto">{url}</span>;
  return (
    <a className="dg-link" href={url} target="_blank" rel="noopener noreferrer">
      <span dir="ltr">{host(url) || C.openLink}</span>
      <span className="vh"> {C.newTab}</span>
      <Icon name="external" />
    </a>
  );
}
const Row = ({ label, cls, children }: { label: string; cls?: string; children: ReactNode }) => (
  <div className="dg-row">
    <dt>{label}</dt>
    <dd className={cls}>{children}</dd>
  </div>
);
function Head({ title, cls, onClose }: { title: string; cls: string; onClose: () => void }) {
  return (
    <div className="dg-sh-head">
      <h2 id="dg-sh-h" className={cls} tabIndex={-1} dir="auto">
        {title}
      </h2>
      <button type="button" className="icon-btn dg-x" data-act="close" aria-label={C.close} onClick={onClose}>
        <Icon name="x" />
      </button>
    </div>
  );
}
/** A control that is off while offline stays focusable and says why when pressed (aria-disabled + reason). */
function Act({
  className,
  act,
  label,
  off,
  onPress,
  children,
}: {
  className: string;
  act: string;
  label: string;
  off?: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      data-act={act}
      aria-label={label}
      aria-disabled={off ? true : undefined}
      aria-describedby={off ? `dg-why-${act}` : undefined}
      onClick={() => {
        if (off) announceIn(document.getElementById("dg-sheet"), off);
        else onPress();
      }}
    >
      {children}
    </button>
  );
}

// ---------- the sheet ----------

export function ReadSheet({
  tripId,
  sheet,
  data,
  people,
  online,
  actions,
  ask,
  toast,
  nav,
  close,
}: {
  tripId: string;
  sheet: SheetState | null;
  data: TripData | undefined;
  people: People;
  online: boolean;
  actions: TripActions;
  ask: (o: AskOptions) => Promise<boolean>;
  toast: (o: ToastOptions) => void;
  nav: SheetNav;
  close: (o?: { noFocus?: boolean }) => void;
}) {
  const guard = useRef<{ asking?: boolean; saving?: boolean; dirty?: () => boolean; busy?: boolean }>({});
  const request = async () => {
    const g = guard.current;
    if (!sheet || g.asking || g.saving) return;
    if (sheet.kind === "item" && g.dirty?.()) {
      g.asking = true;
      const title = data?.items.find((i) => i.id === sheet.id)?.title ?? "";
      const yes = await ask({
        title: C.discardEditTitle,
        body: [`Your changes to ${title} won't be saved.`],
        confirm: C.discard,
        cancel: C.keepEditing,
      });
      g.asking = false;
      if (yes) close();
      return;
    }
    close();
  };
  const dlg = useDialog(!!sheet, () => void request(), "sheet");
  useEffect(() => {
    if (sheet) {
      guard.current = {};
      document.getElementById("dg-sh-h")?.focus({ preventScroll: true });
      const d = document.getElementById("dg-sheet");
      if (d) d.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opened sheet
  }, [sheet?.kind, sheet?.id]);

  const rec: EntryItem | PlaceItem | ChecklistItem | undefined = !sheet
    ? undefined
    : sheet.kind === "entry"
      ? data?.entries.find((e) => e.id === sheet.id)
      : sheet.kind === "place"
        ? data?.places.find((p) => p.id === sheet.id)
        : data?.items.find((i) => i.id === sheet.id);
  // The row going away while the sheet is open (the partner deleted it; the list refetched): say so (ia §4.6).
  const lastTitle = useRef("");
  if (rec) lastTitle.current = rec.title;
  const gone = !!sheet && !rec && !guard.current.busy && !!data;

  useEffect(() => {
    if (gone) {
      const msg = `${people.name(null)} deleted this ${nounOf(sheet!.kind)}.`;
      announceIn(dlg.ref.current, msg);
      document.querySelector<HTMLElement>('[data-f="gone-close"]')?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- announce once when it goes
  }, [gone]);

  const del = async () => {
    if (!sheet || !rec) return;
    const k = sheet.kind;
    guard.current.asking = true;
    const partner = people.name(null) === "Your partner" ? null : people.name(null);
    const opts =
      k === "entry"
        ? actions.confirmEntry(rec as EntryItem)
        : k === "place"
          ? actions.confirmPlace(rec as PlaceItem, partner)
          : actions.confirmItem(rec as ChecklistItem);
    const yes = await ask(opts);
    guard.current.asking = false;
    if (!yes) return;
    guard.current.busy = true;
    const opener = sheet.opener;
    close({ noFocus: true }); // optimistic close (ia §4.6)
    const res = await (k === "entry"
      ? actions.deleteEntryNow(rec as EntryItem)
      : k === "place"
        ? actions.deletePlaceNow(rec as PlaceItem)
        : actions.deleteItemNow(rec as ChecklistItem));
    setTimeout(() => {
      if (!res) {
        land(null, opener);
        toast({ msg: "Couldn't delete this. Try again." });
        return;
      }
      land(res.focus, null, true);
      toast(res.toast);
    }, 0);
  };

  let body: ReactNode = null;
  if (sheet && (gone || !rec)) {
    body = (
      <>
        <Head title={lastTitle.current} cls={sheet.kind === "item" ? "dg-h2" : "dg-title"} onClose={() => close()} />
        <p className="dg-gone">{`${people.name(null)} deleted this ${nounOf(sheet.kind)}.`}</p>
        <div className="dg-acts">
          <button type="button" className="btn-sec" data-act="close" data-f="gone-close" onClick={() => close()}>
            {C.close}
          </button>
        </div>
      </>
    );
  } else if (sheet && rec) {
    const cur = data?.trip.id === tripId ? data : undefined;
    if (sheet.kind === "entry") {
      const e = rec as EntryItem;
      const place = e.placeId ? cur?.places.find((p) => p.id === e.placeId) : undefined;
      const vis = whenText(e);
      const sr = whenSr(e);
      body = (
        <>
          <Head title={e.title} cls="dg-title" onClose={() => close()} />
          <div className="commit dg-card">
            <p className="dg-type">
              <Icon name={e.type} />
              <span>{typeName(e.type)}</span>
            </p>
            <dl className="dg-dl">
              <Row label={C.when} cls="dg-strong num">
                {vis !== sr ? (
                  <>
                    <span aria-hidden="true">{vis}</span>
                    <span className="vh">{sr}</span>
                  </>
                ) : (
                  vis
                )}
                {overnight(e) && <span className="dg-cap">{C.overnightSheet}</span>}
              </Row>
              {e.location && (
                <Row label={C.where}>
                  <span dir="auto">{e.location}</span>
                </Row>
              )}
              <Row label={C.cost} cls="num">
                {e.cost == null ? C.noCost : <span dir="ltr">{formatAmount(e.cost, people.currency)}</span>}
              </Row>
              {e.url && (
                <Row label={C.link}>
                  <Link url={e.url} />
                </Row>
              )}
            </dl>
            {e.doneAt && <Done text={doneText(people, e)} />}
          </div>
          {e.notes && (
            <div className="dg-notes">
              <h3 className="dg-label">{C.notes}</h3>
              <p dir="auto">{e.notes}</p>
            </div>
          )}
          {place && (
            <p className="dg-from">
              <button
                type="button"
                className="link-btn"
                data-act="from-place"
                data-id={place.id}
                onClick={() => nav.fromPlace(place.id)}
              >
                From Places: {place.title}
              </button>
            </p>
          )}
          <By people={people} who={e.createdBy} text={added(people, e)} />
          {e.pending && <Queued />}
          <div className="dg-acts">
            <Act
              className="btn-sec"
              act="edit"
              label={`Edit ${e.title}`}
              onPress={() => nav.edit("entry", e.id, sheet.opener)}
            >
              <Icon name="pencil" />
              {C.edit}
            </Act>
            <Act
              className="btn-danger dg-del"
              act="delete"
              label={`Delete ${e.title}`}
              off={online ? undefined : C.rDelete}
              onPress={del}
            >
              <Icon name="trash" />
              {C.del}
            </Act>
          </div>
          {!online && (
            <p className="dg-reasons">
              <span id="dg-why-delete">{C.rDelete}</span>
            </p>
          )}
        </>
      );
    } else if (sheet.kind === "place") {
      const p = rec as PlaceItem;
      const en = cur ? entryOf(p, cur.entries) : null;
      const visitedNow = !!en?.doneAt;
      const q = !!p.pending;
      const status = q ? (
        <Queued />
      ) : visitedNow ? (
        <Done text={`Visited · ${day(en!.doneAt!)} · ${people.name(en!.doneBy)}`} />
      ) : en ? (
        <p className="dg-status">{`In the plan · ${inPlanWhen(en)}`}</p>
      ) : (
        <p className="dg-status">{C.idea}</p>
      );
      body = (
        <>
          <Head title={p.title} cls="dg-title" onClose={() => close()} />
          <div className="idea dg-card">
            <p className="dg-type">
              <Icon name={p.type} />
              <span>{typeName(p.type)}</span>
              {p.mustDo && (
                <span className="must">
                  <Icon name="star" />
                  {C.mustDo}
                </span>
              )}
            </p>
            <dl className="dg-dl">
              {p.area && (
                <Row label={C.area}>
                  <span dir="auto">{p.area}</span>
                </Row>
              )}
              <Row label={C.estimate} cls="num">
                {p.estimate == null ? (
                  C.noEstimate
                ) : (
                  <span dir="ltr">About {formatAmount(p.estimate, people.currency)}</span>
                )}
              </Row>
              {p.url && (
                <Row label={C.link}>
                  <Link url={p.url} />
                </Row>
              )}
            </dl>
            {status}
            {en && !q && (
              <>
                <p className="dg-inplan">
                  <button
                    type="button"
                    className="link-btn"
                    data-act="show-in-plan"
                    onClick={() => nav.showInPlan(en.id)}
                  >
                    {C.showInPlan}
                  </button>
                </p>
                {!visitedNow && <p className="caption">{C.reschedule}</p>}
              </>
            )}
          </div>
          {p.notes && (
            <div className="dg-notes">
              <h3 className="dg-label">{C.notes}</h3>
              <p dir="auto">{p.notes}</p>
            </div>
          )}
          <By people={people} who={p.createdBy} text={added(people, p)} />
          {en && !q && (
            <p className="caption dg-editnote" id="dg-editnote">
              {C.editNote}
            </p>
          )}
          <div className="dg-acts">
            {q ? (
              <>
                <Act
                  className="btn-sec"
                  act="schedule"
                  label={`Schedule ${p.title}`}
                  off={C.rQueued}
                  onPress={() => {}}
                >
                  <Icon name="calendar" />
                  {C.schedule}
                </Act>
                <Act className="btn-sec" act="edit" label={`Edit ${p.title}`} off={C.rQueued} onPress={() => {}}>
                  <Icon name="pencil" />
                  {C.edit}
                </Act>
                <Act className="btn-danger dg-del" act="remove" label={`Remove ${p.title}`} onPress={del}>
                  <Icon name="trash" />
                  {C.remove}
                </Act>
              </>
            ) : (
              <>
                {!en && (
                  <Act
                    className="btn-sec"
                    act="schedule"
                    label={`Schedule ${p.title}`}
                    off={online ? undefined : C.rSchedule}
                    onPress={() => nav.schedule(p.id, sheet.opener)}
                  >
                    <Icon name="calendar" />
                    {C.schedule}
                  </Act>
                )}
                <button
                  type="button"
                  className="btn-sec"
                  data-act="edit"
                  aria-label={`Edit ${p.title}`}
                  aria-describedby={en ? "dg-editnote" : undefined}
                  onClick={() => nav.edit("place", p.id, sheet.opener)}
                >
                  <Icon name="pencil" />
                  {C.edit}
                </button>
                <Act
                  className="btn-danger dg-del"
                  act="delete"
                  label={`Delete ${p.title}`}
                  off={online ? undefined : C.rDelete}
                  onPress={del}
                >
                  <Icon name="trash" />
                  {C.del}
                </Act>
              </>
            )}
          </div>
          <p className="dg-reasons">
            {q && <span id="dg-why-q">{C.rQueued}</span>}
            {!q && !online && !en && <span id="dg-why-schedule">{C.rSchedule}</span>}
            {!q && !online && <span id="dg-why-delete">{C.rDelete}</span>}
          </p>
        </>
      );
    } else {
      body = (
        <ItemForm
          key={rec.id}
          tripId={tripId}
          item={rec as ChecklistItem}
          people={people}
          online={online}
          guard={guard}
          dlg={dlg.ref}
          close={close}
          opener={sheet.opener}
          toast={toast}
          del={del}
        />
      );
    }
  }

  return (
    <dialog
      ref={dlg.ref}
      id="dg-sheet"
      className="sheet dg-sheet"
      aria-labelledby="dg-sh-h"
      data-kind={sheet?.kind}
      {...dlg.props}
      onClose={() => {
        // Something else closed it (a forced close): the state follows.
        if (sheet && !guard.current.busy) close({ noFocus: true });
      }}
    >
      <div className="dg-sh" id="dg-sh">
        {body}
      </div>
      <p className="vh dlg-live" role="status" />
      <p className="vh" role="alert" />
    </dialog>
  );
}

// ---------- the checklist item: rename, move to another group, delete ----------

interface IV {
  title: string;
  group: ChecklistGroup;
}
const defs: Record<string, Def> = {
  title: textDef("dg-i-title", C.title),
  group: {
    label: C.group,
    markId: "dg-i-group-mark",
    norm: (v) => String(v ?? ""),
    shown: (v) => groupName(v as ChecklistGroup),
  },
};

function ItemForm({
  tripId,
  item,
  people,
  online,
  guard,
  dlg,
  close,
  opener,
  toast,
  del,
}: {
  tripId: string;
  item: ChecklistItem;
  people: People;
  online: boolean;
  guard: React.RefObject<{ asking?: boolean; saving?: boolean; dirty?: () => boolean; busy?: boolean }>;
  dlg: React.RefObject<HTMLDialogElement | null>;
  close: (o?: { noFocus?: boolean }) => void;
  opener: Opener | null;
  toast: (o: ToastOptions) => void;
  del: () => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const en = useEngine<IV>(
    {
      defs,
      read: (v) => ({ title: v.title.trim(), group: v.group }),
      write: (v, f, c) => (f === "title" ? { ...v, title: String(c ?? "") } : { ...v, group: c as ChecklistGroup }),
      validate: (v) => {
        const t = v.title.trim();
        return { title: !t ? C.itemErr : t.length > MAX.title ? tooLong(MAX.title, "title") : "" };
      },
    },
    () => ({
      vals: { title: item.title, group: item.group },
      base: { title: item.title, group: item.group },
      updatedAt: item.updatedAt,
    }),
  );
  guard.current!.dirty = () => en.dirty();
  const s = en.s;

  // The partner changed this item while the sheet was open (the list refetched): merge like a 409 would.
  useEffect(() => {
    if (saving || item.updatedAt === en.s.updatedAt) return;
    const n = en.merge({ title: item.title, group: item.group }, item.updatedAt, { kind: "other" }, "item", false);
    if (n) announceIn(dlg.current, en.s.notice?.text ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the row's version only
  }, [item.updatedAt]);

  const focusField = (f: string) => {
    if (f === "title") document.getElementById("dg-i-title")?.focus();
    else
      (
        document.querySelector<HTMLInputElement>('input[name="dg-i-group"]:checked') ??
        document.querySelector<HTMLInputElement>('input[name="dg-i-group"]')
      )?.focus();
  };
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (s.notice?.focus) noticeRef.current?.focus();
  }, [s.notice]);

  async function submit() {
    if (guard.current!.saving) return;
    if (!online) {
      announceIn(dlg.current, C.rSave);
      return;
    }
    const first = en.validateAll();
    if (first) {
      focusField(first);
      return;
    }
    if (!en.dirty()) {
      close();
      return;
    }
    guard.current!.saving = true;
    setSaving(true);
    try {
      const v = en.values();
      const r = await updateItem(tripId, item.id, {
        title: String(v.title),
        group: v.group as ChecklistGroup,
        updatedAt: en.s.updatedAt!,
      });
      putItem(qc, tripId, r.item);
      invalidateTrip(qc, tripId);
      guard.current!.saving = false;
      close({ noFocus: true });
      setTimeout(() => {
        land([`[data-act="item"][data-id="${CSS.escape(item.id)}"]`], opener, true);
        toast({ msg: C.saved });
      }, 0);
    } catch (e) {
      guard.current!.saving = false;
      setSaving(false);
      if (isApiError(e, "not_found")) {
        void qc.invalidateQueries({ queryKey: ["trips", tripId] });
        return;
      }
      if (isApiError(e, "conflict")) {
        const fresh = await qc.fetchQuery({ ...tripQuery(tripId), staleTime: 0 }).catch(() => null);
        const cur = fresh?.items.find((i) => i.id === item.id);
        if (cur) {
          const n = en.merge({ title: cur.title, group: cur.group }, cur.updatedAt, { kind: "other" }, "item", true);
          if (!n) void submit();
          return;
        }
      }
      alertIn(dlg.current, C.pFailedEdit);
    }
  }

  return (
    <form
      className="dg-item"
      id="dg-item-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="dg-sh-head">
        <h2 id="dg-sh-h" className="dg-h2" tabIndex={-1} dir="auto">
          {C.itemHeading}
        </h2>
        <button type="button" className="icon-btn dg-x" data-act="close" aria-label={C.close} onClick={() => close()}>
          <Icon name="x" />
        </button>
      </div>
      <div className="dg-slot" id="dg-i-merge">
        {s.notice && (
          <p className="notice dg-notice" id="dg-i-merge-text" tabIndex={-1} ref={noticeRef}>
            <Icon name="refresh" />
            <span>{s.notice.text}</span>
          </p>
        )}
      </div>
      <div className="dg-fields">
        <div className="dg-fg">
          <label className="field-label" htmlFor="dg-i-title">
            {C.title}
          </label>
          <div className={`field${s.errors.title ? " is-invalid" : ""}`}>
            <input
              id="dg-i-title"
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              required
              dir="auto"
              value={s.vals.title}
              aria-invalid={s.errors.title ? true : undefined}
              aria-describedby={describedBy(
                s.errors.title && "dg-i-title-err",
                s.marks.title && "dg-i-title-mark-text",
              )}
              onChange={(e) => en.change("title", { ...s.vals, title: e.target.value })}
              onBlur={() => en.blur("title")}
            />
          </div>
          <Err id="dg-i-title-err" msg={s.errors.title ?? ""} />
          <div className="dg-mark-slot" id="dg-i-title-mark">
            <MarkView
              id="dg-i-title-mark"
              mark={s.marks.title}
              label={C.title}
              text={en.markText("title")}
              onUseTheirs={() => {
                if (en.useTheirs("title")) {
                  announceIn(dlg.current, C.resolved);
                  focusField("title");
                }
              }}
            />
          </div>
        </div>
        <fieldset
          className="dg-fg"
          id="dg-i-group"
          aria-describedby={describedBy("dg-i-group-help", s.marks.group && "dg-i-group-mark-text")}
        >
          <legend className="field-label">{C.group}</legend>
          <div className="dg-chips dg-chips--grid">
            {CHECKLIST_GROUPS.map((g) => (
              <label className="dg-chip" key={g}>
                <input
                  type="radio"
                  name="dg-i-group"
                  value={g}
                  checked={s.vals.group === g}
                  onChange={() => en.change("group", { ...s.vals, group: g })}
                />
                <Icon name={g} />
                <span>{groupName(g)}</span>
              </label>
            ))}
          </div>
          <p className="help" id="dg-i-group-help">
            {C.groupHelp}
          </p>
          <div className="dg-mark-slot" id="dg-i-group-mark">
            <MarkView
              id="dg-i-group-mark"
              mark={s.marks.group}
              label={C.group}
              text={en.markText("group")}
              onUseTheirs={() => {
                if (en.useTheirs("group")) {
                  announceIn(dlg.current, C.resolved);
                  focusField("group");
                }
              }}
            />
          </div>
        </fieldset>
        <div className="dg-attr" id="dg-i-attr">
          {!item.seeded && <By people={people} who={item.createdBy} text={added(people, item)} />}
          {item.doneAt && <Done text={doneText(people, item)} />}
          {item.pending && <Queued />}
        </div>
      </div>
      <div className="dg-acts">
        <button
          type="submit"
          className="btn-primary"
          id="dg-i-save"
          aria-disabled={!online || saving ? true : undefined}
          aria-describedby={!online ? "dg-why-save" : undefined}
        >
          {saving ? C.saving : C.save}
        </button>
        <Act
          className="btn-danger dg-del"
          act="delete"
          label={`Delete ${item.title}`}
          off={online ? undefined : C.rDelete}
          onPress={del}
        >
          <Icon name="trash" />
          {C.del}
        </Act>
      </div>
      {!online && (
        <p className="dg-reasons">
          <span id="dg-why-save">{C.rSave}</span> <span id="dg-why-delete">{C.rDelete}</span>
        </p>
      )}
    </form>
  );
}

export { isIso };
