import { useEffect, useRef } from "react";
import type { Totals } from "../../../shared/shopping-list.ts";
import { day, time } from "../../lib/goals.ts";
import { qtyText, type ShoppingItem } from "../../lib/shopping.ts";
import { Icon } from "../Icon.tsx";
import { plural } from "./util.ts";

/** The pieces of the list view (.ux-forge/shopping list.js): the summary, groups and rows, the Bought group. */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** "Today, 14:32" · "Yesterday, 09:05" · "Mon 9 Nov, 18:20" (the year only when it isn't this year). */
export function whenText(iso: string, lower = false): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 864e5);
  const t = time(d);
  const lead = days === 0 ? "Today" : days === 1 ? "Yesterday" : day(d);
  return `${lower && days <= 1 ? lead.toLowerCase() : lead}, ${t}`;
}
const addedWhen = (it: ShoppingItem) => whenText(it.createdAt);
const boughtWhen = (it: ShoppingItem) => `Bought ${whenText(it.boughtAt!, true)}`;

function descText(it: ShoppingItem, inDone: boolean) {
  const parts: string[] = [`${qtyText(it.quantity, it.unit)}.`];
  if (inDone) parts.push(`${it.category || "Other"}.`);
  if (it.notes) parts.push(`${it.notes.replace(/[.!?]$/, "")}.`);
  parts.push(`${it.boughtAt ? boughtWhen(it) : `Added ${addedWhen(it)}`}.`);
  if (it.failed) parts.push("Couldn't sync.");
  else if (it.pending) parts.push("Waiting to sync.");
  return parts.join(" ");
}

// ---------- a row ----------

/**
 * [tick] [name / meta line] [quantity and unit]. The tick is a native checkbox that is never replaced: a tick changes
 * the row in place, so nothing moves under the thumb. The checkbox flips itself; the data follows through the effect.
 * The meta line says when it was added (who added it is in the sheet).
 */
export function Row({
  item: it,
  inDone,
  fresh,
  leaving,
  onTick,
  onOpen,
}: {
  item: ShoppingItem;
  inDone: boolean;
  fresh: boolean;
  leaving: boolean;
  onTick: (it: ShoppingItem, want: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const box = useRef<HTMLInputElement>(null);
  const bought = !!it.boughtAt;
  useEffect(() => {
    if (box.current) box.current.checked = bought;
  }, [bought]);
  const cls = `row${bought ? " is-bought" : ""}${it.pending ? " is-pending" : ""}${it.failed ? " is-failed" : ""}${fresh ? " is-new" : ""}${leaving ? " is-leaving" : ""}`;
  const qty = qtyText(it.quantity, it.unit);
  const when = bought ? boughtWhen(it) : addedWhen(it);
  return (
    <li className={cls} data-id={it.id}>
      <input
        ref={box}
        className="tick"
        type="checkbox"
        id={`tick-${it.id}`}
        data-act="tick"
        data-id={it.id}
        aria-label={`${it.name}, ${qty}`}
        defaultChecked={bought}
        disabled={it.failed}
        onChange={(e) => onTick(it, e.currentTarget.checked)}
      />
      <button
        className="row-body"
        type="button"
        data-act="open"
        data-id={it.id}
        aria-label={`${it.name}, details`}
        aria-describedby={`d-${it.id}`}
        onClick={() => onOpen(it.id)}
      >
        <span className="r-head">
          <span className="r-title" dir="auto">
            {it.name}
          </span>
        </span>
        <span className="r-price num">{qty}</span>
        <span className="r-meta">
          {!inDone && it.notes && (
            <span className="r-notes" dir="auto">
              {it.notes}
            </span>
          )}
          <span className="r-who">
            <span className="r-whotext">{inDone ? `${it.category || "Other"} · ${when}` : when}</span>
          </span>
          {it.failed ? (
            <span className="r-flag is-failed">
              <Icon name="x" />
              Couldn&apos;t sync
            </span>
          ) : it.pending ? (
            <span className="r-flag">
              <Icon name="cloud-off" />
              Waiting to sync
            </span>
          ) : null}
        </span>
      </button>
      <span className="vh r-desc" id={`d-${it.id}`}>
        {descText(it, inDone)}
      </span>
    </li>
  );
}

// ---------- a group ----------

/** The head is the leader line: the name, a dotted run, the item count flush right. */
export function GroupView({
  index,
  name,
  rows,
  fresh,
  leaving,
  onTick,
  onOpen,
  keyOf: gkey,
}: {
  index: number;
  name: string;
  keyOf: string;
  rows: ShoppingItem[];
  fresh: ReadonlySet<string>;
  leaving: ReadonlySet<string>;
  onTick: (it: ShoppingItem, want: boolean) => void;
  onOpen: (id: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <section className="grp" data-key={gkey} aria-labelledby={`gh-${index}`}>
      <h2 className="g-head" id={`gh-${index}`}>
        <span className="g-name">{name || "Other"}</span>
        <span className="g-lead" aria-hidden="true" />
        {/* The rows on screen: a ticked row stays until Tidy up */}
        <span className="g-count num">
          {rows.length} {plural(rows.length, "item", "items")}
        </span>
      </h2>
      <ul className="rows" role="list">
        {rows.map((it) => (
          <Row
            key={it.id}
            item={it}
            inDone={false}
            fresh={fresh.has(it.id)}
            leaving={leaving.has(it.id)}
            onTick={onTick}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}

// ---------- the Bought group ----------

export function DoneView({
  rows,
  hasGroups,
  open,
  offline,
  syncing,
  fresh,
  leaving,
  onToggle,
  onClear,
  onTick,
  onOpen,
}: {
  rows: ShoppingItem[];
  hasGroups: boolean;
  open: boolean;
  offline: boolean;
  syncing: boolean;
  fresh: ReadonlySet<string>;
  leaving: ReadonlySet<string>;
  onToggle: () => void;
  onClear: () => void;
  onTick: (it: ShoppingItem, want: boolean) => void;
  onOpen: (id: string) => void;
}) {
  if (!rows.length) return null;
  const n = rows.filter((r) => r.boughtAt).length;
  let why = "";
  if (n) {
    if (offline) why = "Clearing needs a connection.";
    else if (syncing) why = "Syncing… try again in a moment.";
  }
  const label = <span className="done-name">Bought · {n}</span>;
  return (
    <section className="done" aria-labelledby="done-h">
      <div className="done-top">
        <div className="done-head">
          <h2 className="done-h" id="done-h">
            {/* With no groups there is nothing to collapse: the heading is plain text, not a button */}
            {hasGroups ? (
              <button
                className="done-toggle"
                type="button"
                data-act="done-toggle"
                aria-expanded={open}
                aria-controls="done-rows"
                onClick={onToggle}
              >
                <Icon name="chevron-right" />
                {label}
              </button>
            ) : (
              <span className="done-toggle is-static">{label}</span>
            )}
          </h2>
          {n > 0 && (
            <button
              className="clear-btn"
              type="button"
              data-act="clear"
              aria-disabled={why ? true : undefined}
              aria-describedby={why ? "clear-why" : undefined}
              onClick={() => {
                if (why) return;
                onClear();
              }}
            >
              Clear bought
              <span className="vh">
                , {n} {plural(n, "item", "items")}
              </span>
            </button>
          )}
        </div>
        {why && (
          <p className="done-why caption" id="clear-why">
            {why}
          </p>
        )}
      </div>
      <ul className="rows" id="done-rows" role="list" aria-label="Bought items" hidden={!open}>
        {rows.map((it) => (
          <Row
            key={it.id}
            item={it}
            inDone
            fresh={fresh.has(it.id)}
            leaving={leaving.has(it.id)}
            onTick={onTick}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}

// ---------- the summary: "how many are left?" ----------

export function Summary({
  loading,
  totals: t,
  moves,
  onTidy,
}: {
  loading: boolean;
  totals: Totals | null;
  moves: number;
  onTidy: () => void;
}) {
  if (loading)
    return (
      <p className="sum-line">
        <span className="sum-count">Loading…</span>
      </p>
    );
  if (!t || !t.any) return null;
  return (
    <div className="sum-line">
      <b className="sum-count" tabIndex={-1}>
        {t.left === 0 ? "Nothing left to buy" : `${t.left} left to buy`}
      </b>
      {t.boughtCount > 0 && (
        <>
          <span className="sum-sep" aria-hidden="true">
            ·
          </span>
          <span className="sum-note">{t.boughtCount} bought</span>
        </>
      )}
      {moves > 0 && (
        <button className="btn-ghost btn-sm tidy" type="button" data-act="tidy" onClick={onTidy}>
          Tidy up ({moves})
          <span className="vh">
            , move {moves} {plural(moves, "item", "items")}
          </span>
        </button>
      )}
    </div>
  );
}
