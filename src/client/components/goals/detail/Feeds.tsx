import { useEffect, useState, type ReactNode } from "react";
import type { NoteView } from "../../../../shared/schemas/goals.ts";
import { ago, day, month, monthKey, type EntryItem, type GoalItem } from "../../../lib/goals.ts";
import { photoUrl } from "../../../lib/uploads.ts";
import { Icon } from "../../Icon.tsx";
import { PartnerAvatarSm } from "../Avatar.tsx";

/**
 * The detail's feeds (detail.js historyHTML, journalHTML, noteHTML): History grouped by month with month totals,
 * and the Journal set like an album page. Tabs below 64rem, side by side from 64rem (CSS).
 */
export interface People {
  name: (userId: string) => string;
  slot: (userId: string) => "a" | "b";
  mad: (minor: number) => string;
  myId: string;
}

const count = (n: number, one: string, other: string) => `${n} ${n === 1 ? one : other}`;
/** A "0" badge encodes nothing: empty feeds show no count. */
const Badge = ({ n }: { n: number }) => (n ? <span className="gd-count num">{n}</span> : null);
export const rowWhen = (at: string) => (ago(at) === "just now" ? "just now" : day(at));

export function Tabs({
  goal,
  partial,
  tab,
  entries,
  notes,
  onSelect,
  onKey,
}: {
  goal: GoalItem;
  partial: boolean;
  tab: "history" | "journal";
  entries: number;
  notes: number;
  onSelect: (t: "history" | "journal") => void;
  onKey: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="gd-tabs" role="tablist" aria-label="History and journal" id="gd-tabs">
      {(["history", "journal"] as const).map((t) => {
        const n = t === "history" ? entries : notes;
        const lbl = partial
          ? undefined
          : t === "journal"
            ? `Journal, ${count(n, "note", "notes")}`
            : `History, ${goal.kind === "money" ? count(n, "contribution", "contributions") : count(n, "update", "updates")}`;
        return (
          <button
            key={t}
            className="gd-tab"
            type="button"
            role="tab"
            id={`gd-tab-${t}`}
            aria-controls={`gd-panel-${t}`}
            aria-label={lbl}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => onSelect(t)}
            onKeyDown={onKey}
          >
            <span className="gd-tab-text">{t === "history" ? "History" : "Journal"}</span>
            {partial || !n ? null : (
              <span className="gd-count num" aria-hidden="true">
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SkRows({ n }: { n: number }) {
  return (
    <span className="gd-sk-rows" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="sk gd-sk-row" />
      ))}
    </span>
  );
}

export function History({
  goal,
  entries,
  limit,
  p,
  onOpen,
  onMore,
}: {
  goal: GoalItem;
  entries: EntryItem[];
  limit: number;
  p: People;
  onOpen: (id: string) => void;
  onMore: () => void;
}) {
  const money = goal.kind === "money";
  const h = (
    <h2 className="gd-feed-h" id="gd-h-history" tabIndex={-1}>
      History
      <Badge n={entries.length} />
    </h2>
  );
  if (!entries.length)
    return (
      <>
        {h}
        <p className="gd-empty">
          {money
            ? "No contributions yet. Add the first one with Add to this goal."
            : "No updates yet. Add the first one with Update progress."}
        </p>
      </>
    );
  // Month totals come from every entry in the month, not only the loaded page.
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(monthKey(e.at), (totals.get(monthKey(e.at)) ?? 0) + (e.amount ?? 0));
  const groups: { key: string; at: string; rows: EntryItem[] }[] = [];
  for (const e of entries.slice(0, limit)) {
    const k = monthKey(e.at);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.rows.push(e);
    else groups.push({ key: k, at: e.at, rows: [e] });
  }
  return (
    <>
      {h}
      {groups.map((g) => (
        <div className="gd-group" key={g.key}>
          <h3 className="gd-month">
            <span>{month(g.at)}</span>
            {money && (
              <>
                <span className="vh"> · </span>
                <span className="num gd-month-total" dir="ltr">
                  {p.mad(totals.get(g.key) ?? 0)}
                </span>
              </>
            )}
          </h3>
          <ul className="gd-rows" role="list">
            {g.rows.map((e) => (
              <Row key={e.id} e={e} money={money} p={p} onOpen={onOpen} />
            ))}
          </ul>
        </div>
      ))}
      {entries.length > limit && (
        <button
          className="btn-sec gd-older"
          type="button"
          data-act="more-history"
          aria-label="Show older contributions"
          onClick={onMore}
        >
          Show older
        </button>
      )}
    </>
  );
}

function Row({ e, money, p, onOpen }: { e: EntryItem; money: boolean; p: People; onOpen: (id: string) => void }) {
  const name = p.name(e.userId);
  const when = rowWhen(e.at);
  const what: ReactNode = money ? (
    <>
      {name} added{" "}
      <b className="num" dir="ltr">
        {p.mad(e.amount ?? 0)}
      </b>
    </>
  ) : (
    <>
      {name} moved it to <b className="num">{e.percent}%</b>
    </>
  );
  // The name follows the visible order: what, when, then the note.
  const label = money
    ? `${name} added ${p.mad(e.amount ?? 0)}, ${when}${e.note ? `, ${e.note}` : ""}`
    : `${name} moved it to ${e.percent}%, ${when}`;
  return (
    <li data-key={e.id}>
      <button
        className="gd-row"
        type="button"
        data-act="entry"
        data-id={e.id}
        aria-label={label}
        aria-describedby={e.pending ? `gd-pend-${e.id}` : undefined}
        onClick={() => onOpen(e.id)}
      >
        <PartnerAvatarSm slot={p.slot(e.userId)} name={name} />
        <span className="gd-row-what">{what}</span>
        <span className="gd-row-when">{when}</span>
        {e.pending ? (
          <span className="gd-row-pending" id={`gd-pend-${e.id}`}>
            <Icon name="cloud-off" />
            Waiting to sync
          </span>
        ) : e.note ? (
          <span className="gd-row-sub" dir="auto">
            {e.note}
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function Journal({
  goal,
  done,
  notes,
  limit,
  p,
  offline,
  cloudName,
  openNotes,
  onWrite,
  onEdit,
  onPhoto,
  onToggle,
  onMore,
}: {
  goal: GoalItem;
  done: boolean;
  notes: NoteView[];
  limit: number;
  p: People;
  offline: boolean;
  cloudName: string | null;
  openNotes: Record<string, boolean>;
  onWrite: () => void;
  onEdit: (id: string) => void;
  onPhoto: (noteId: string, block: number) => void;
  onToggle: (id: string) => void;
  onMore: () => void;
}) {
  const write = (
    <button
      className="btn-sec gd-write"
      type="button"
      data-act="write"
      aria-describedby={offline ? "gd-write-help" : undefined}
      onClick={onWrite}
    >
      <Icon name="note" />
      Write a note
    </button>
  );
  const help = offline ? (
    <p className="help gd-write-help" id="gd-write-help">
      You&apos;re offline. You can write a note now and save it when you&apos;re back online.
    </p>
  ) : null;
  const h2 = (
    <h2 className="gd-feed-h" id="gd-h-journal" tabIndex={-1}>
      Journal
      <Badge n={notes.length} />
    </h2>
  );
  // On a done goal the primary is "Write a note", so the journal's own button hides (D4).
  if (!notes.length)
    return (
      <>
        <div className="gd-journal-head">{h2}</div>
        <div className="gd-empty-j">
          <p className="gd-empty">
            {cloudName ? "No notes yet. Write about this goal, or add a photo." : "No notes yet. Write the first one."}
          </p>
          {!done && (
            <>
              {write}
              {help}
            </>
          )}
        </div>
      </>
    );
  return (
    <>
      <div className="gd-journal-head">
        {h2}
        {!done && write}
      </div>
      {!done && help}
      <div className="gd-notes">
        {notes.slice(0, limit).map((n) => (
          <Note
            key={n.id}
            n={n}
            p={p}
            offline={offline}
            cloudName={cloudName}
            open={!!openNotes[n.id]}
            goalTitle={goal.title}
            onEdit={onEdit}
            onPhoto={onPhoto}
            onToggle={onToggle}
          />
        ))}
        {notes.length > limit && (
          <button className="btn-sec gd-older" type="button" data-act="more-notes" onClick={onMore}>
            Show older notes
          </button>
        )}
      </div>
    </>
  );
}

function Note({
  n,
  p,
  offline,
  cloudName,
  open,
  onEdit,
  onPhoto,
  onToggle,
}: {
  n: NoteView;
  p: People;
  offline: boolean;
  cloudName: string | null;
  open: boolean;
  goalTitle: string;
  onEdit: (id: string) => void;
  onPhoto: (noteId: string, block: number) => void;
  onToggle: (id: string) => void;
}) {
  const name = p.name(n.userId);
  const date = day(n.at);
  const mine = n.userId === p.myId;
  return (
    <article className={`gd-note${open ? " is-open" : ""}`} data-key={n.id} aria-labelledby={`note-${n.id}-h`}>
      <header className="gd-note-head">
        <PartnerAvatarSm slot={p.slot(n.userId)} name={name} size="md" />
        <h3 className="gd-note-h" id={`note-${n.id}-h`} tabIndex={-1}>
          {name}
          <span className="gd-note-date"> · {date}</span>
        </h3>
        {mine && (
          <button
            className="btn-ghost btn-sm gd-note-edit"
            type="button"
            data-act="edit-note"
            data-id={n.id}
            aria-label={`Edit your note from ${date}`}
            onClick={() => onEdit(n.id)}
          >
            <Icon name="pencil" />
            Edit
          </button>
        )}
      </header>
      <div className="gd-note-body" id={`note-${n.id}-body`}>
        {n.blocks.map((b, i) =>
          b.type === "text" ? (
            <p key={i} className="gd-text" dir="auto">
              {b.text}
            </p>
          ) : (
            <Photo
              key={i}
              noteId={n.id}
              block={i}
              alt={b.alt || `Photo from a note by ${name}, ${date}`}
              src={cloudName ? photoUrl(cloudName, b.image, 448, 560) : null}
              offline={offline}
              onPhoto={onPhoto}
            />
          ),
        )}
      </div>
      <button
        className="link-btn gd-readmore"
        type="button"
        data-act="readmore"
        data-id={n.id}
        aria-expanded={open}
        aria-controls={`note-${n.id}-body`}
        hidden={!open}
        onClick={() => onToggle(n.id)}
      >
        {open ? "Show less" : "Read more"}
      </button>
    </article>
  );
}

function Photo({
  noteId,
  block,
  alt,
  src,
  offline,
  onPhoto,
}: {
  noteId: string;
  block: number;
  alt: string;
  src: string | null;
  offline: boolean;
  onPhoto: (noteId: string, block: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!offline) setFailed(false);
  }, [offline]);
  if (!src)
    return (
      <div className="gd-photo-off arch">
        <Icon name="image" />
        <span>Photo unavailable</span>
      </div>
    );
  // Offline, a photo that was never cached can't be shown.
  if (failed && offline)
    return (
      <div className="gd-photo-off arch">
        <Icon name="cloud-off" />
        <span>Photo not available offline</span>
      </div>
    );
  const did = `gd-ph-${noteId}-${block}`;
  return (
    <button
      className="gd-photo arch"
      type="button"
      data-act="photo"
      data-id={noteId}
      data-block={block}
      aria-label="View photo"
      aria-describedby={did}
      onClick={() => onPhoto(noteId, block)}
    >
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      <span hidden id={did}>
        {alt}
      </span>
    </button>
  );
}
