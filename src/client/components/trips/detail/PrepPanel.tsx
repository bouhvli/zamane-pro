import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ChecklistGroup } from "../../../../shared/enums.ts";
import { TRIP_LIMITS } from "../../../../shared/schemas/trips.ts";
import { prep as prepOf, prepCounts, type PrepGroup } from "../../../../shared/trip-plan.ts";
import { say } from "../../../lib/announce.ts";
import { focusEl } from "../../../lib/nav.ts";
import {
  createItem,
  groupName,
  invalidateTrip,
  moveItem,
  putGroup,
  putItem,
  type ChecklistItem,
} from "../../../lib/trips.ts";
import { Icon } from "../../Icon.tsx";
import { Tally } from "../Bits.tsx";
import { useTripDialogs } from "../TripDialogs.tsx";
import { Av, GroupIcon, NotCached, PanelHead, Reason, SkRows, useDetail, when } from "./shared.tsx";

/** Prep: the checklist in four groups, with an inline add and a per-group reorder mode (detail.js prepHTML, ia D9). */
export function PrepPanel() {
  const c = useDetail();
  const qc = useQueryClient();
  const tripId = c.trip.id;
  const [adding, setAdding] = useState<{ group: ChecklistGroup; value: string } | null>(null);
  const [reorder, setReorder] = useState<ChecklistGroup | null>(null);
  const [reasons, setReasons] = useState<Record<string, boolean>>({});
  const lastMoved = useRef<string | null>(null);
  const focusNext = useRef<(() => void) | null>(null);
  const busy = useRef(false);

  // Focus work queued by an action runs after the re-render it caused.
  useEffect(() => {
    const f = focusNext.current;
    focusNext.current = null;
    f?.();
  });

  const counts = prepCounts(c.items);
  const head = (
    <PanelHead tab="prep" caption={c.mode === "ready" ? `${counts.done} of ${counts.total} done` : undefined} />
  );
  if (c.mode === "partial")
    return (
      <>
        {head}
        <SkRows n={4} announce="Loading prep" />
      </>
    );
  if (c.mode === "notcached")
    return (
      <>
        {head}
        <NotCached />
      </>
    );

  const q = (sel: string) => document.querySelector<HTMLElement>(`#td-panel-prep ${sel}`);
  const pressDisabled = (key: string, text: string) => {
    setReasons((r) => ({ ...r, [key]: true }));
    say(text);
  };

  function openAdd(g: ChecklistGroup) {
    setAdding({ group: g, value: "" });
    focusNext.current = () => focusEl(document.getElementById(`pr-in-${g}`));
  }
  function closeAdd(focusBtn: boolean) {
    if (!adding) return;
    const g = adding.group;
    setAdding(null);
    if (focusBtn) focusNext.current = () => focusEl(q(`[data-act="add-open"][data-id="${g}"]`));
  }
  async function submitAdd(g: ChecklistGroup) {
    const input = document.getElementById(`pr-in-${g}`) as HTMLInputElement | null;
    if (!input || !adding) return;
    const title = input.value.trim();
    if (!title) {
      focusEl(input); // empty Enter: nothing added, the field stays
      return;
    }
    if (c.offline) {
      say("Adding to the checklist needs a connection.");
      focusEl(input);
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const focusInput = document.activeElement !== input;
    setAdding({ group: g, value: "" });
    try {
      const r = await createItem(tripId, { id: crypto.randomUUID(), group: g, title });
      putItem(qc, tripId, r.item);
      invalidateTrip(qc, tripId);
      say(`Added ${title} to ${groupName(g)}.`);
      if (focusInput) focusNext.current = () => focusEl(document.getElementById(`pr-in-${g}`));
    } catch {
      setAdding({ group: g, value: title });
      say("Couldn't add this. Try again.");
    } finally {
      busy.current = false;
    }
  }
  function toggleReorder(g: ChecklistGroup, disabled: boolean) {
    if (disabled) {
      pressDisabled(`reorder-${g}`, "Reordering needs a connection.");
      return;
    }
    const on = reorder !== g;
    setReorder(on ? g : null);
    const moved = lastMoved.current;
    if (!on && moved && c.items.find((i) => i.id === moved)?.group === g) {
      focusNext.current = () => focusEl(q(`[data-act="item"][data-id="${moved}"]`));
      lastMoved.current = null;
    } else {
      focusNext.current = () => focusEl(q(`[data-act="reorder"][data-id="${g}"]`));
    }
    say(on ? `Reordering ${groupName(g)}. Use Move up and Move down.` : "Done reordering.");
  }
  async function move(it: ChecklistItem, dir: "up" | "down", why: string) {
    if (why) {
      say(why);
      return;
    }
    try {
      const r = await moveItem(tripId, it.id, dir);
      putGroup(qc, tripId, it.group, r.items);
      lastMoved.current = it.id;
      const pos = r.items.findIndex((x) => x.id === it.id);
      const total = r.items.length;
      focusNext.current = () => {
        const same = q(`[data-act="${dir}"][data-id="${it.id}"]`);
        const other = q(`[data-act="${dir === "up" ? "down" : "up"}"][data-id="${it.id}"]`);
        focusEl(same?.getAttribute("aria-disabled") === "true" ? other : same);
      };
      say(`${it.title} moved to ${pos + 1} of ${total}.`);
    } catch {
      say("Couldn't move this. Try again.");
    }
  }

  const groups = prepOf(c.items);
  return (
    <>
      {head}
      <p className="td-intro">What to pack, bring and book.</p>
      {groups.map((g) => (
        <Group
          key={g.group}
          g={g}
          adding={adding?.group === g.group ? adding : null}
          reordering={reorder === g.group}
          reasons={reasons}
          onValue={(v) => setAdding((a) => (a ? { ...a, value: v } : a))}
          openAdd={openAdd}
          closeAdd={closeAdd}
          submitAdd={submitAdd}
          onBlurField={() =>
            setTimeout(() => {
              const f = document.querySelector(".pr-field");
              if (f && f.contains(document.activeElement)) return;
              setAdding((a) => (a && !a.value.trim() ? null : a));
            }, 0)
          }
          toggleReorder={toggleReorder}
          move={move}
        />
      ))}
    </>
  );
}

function Group({
  g,
  adding,
  reordering,
  reasons,
  onValue,
  openAdd,
  closeAdd,
  submitAdd,
  onBlurField,
  toggleReorder,
  move,
}: {
  g: PrepGroup;
  adding: { group: ChecklistGroup; value: string } | null;
  reordering: boolean;
  reasons: Record<string, boolean>;
  onValue: (v: string) => void;
  openAdd: (g: ChecklistGroup) => void;
  closeAdd: (focusBtn: boolean) => void;
  submitAdd: (g: ChecklistGroup) => void;
  onBlurField: () => void;
  toggleReorder: (g: ChecklistGroup, disabled: boolean) => void;
  move: (it: ChecklistItem, dir: "up" | "down", why: string) => void;
}) {
  const c = useDetail();
  const name = groupName(g.group);
  const key = `reorder-${g.group}`;
  const why = c.offline && !reordering ? "Reordering needs a connection." : "";
  const off = c.offline;
  return (
    <div className="pr-group" data-group={g.group}>
      <div className="pr-head">
        <h3 className="pr-h" id={`pr-h-${g.group}`}>
          <GroupIcon group={g.group} />
          <span>
            {name} ·{" "}
            <span className="nowrap">
              {g.done} of {g.total}
            </span>
          </span>
        </h3>
        <Tally done={g.done} total={g.total} />
        {g.total > 1 && (
          <>
            <button
              className="btn-ghost pr-reorder"
              type="button"
              data-act="reorder"
              data-id={g.group}
              aria-label={reordering ? `Done reordering ${name}` : `Reorder ${name}`}
              aria-disabled={why ? true : undefined}
              aria-describedby={why ? `why-${key}` : undefined}
              onClick={() => toggleReorder(g.group, !!why)}
            >
              {reordering ? (
                <>
                  <Icon name="check" />
                  Done
                </>
              ) : (
                <>
                  <Icon name="list-order" />
                  Reorder
                </>
              )}
            </button>
            {why ? <Reason id={key} text={why} shown={!!reasons[key]} /> : null}
          </>
        )}
      </div>
      {g.items.length ? (
        <ul className={`pr-rows${reordering ? " is-reordering" : ""}`} role="list">
          {g.items.map((it, i) => (
            <Item key={it.id} it={it} idx={i} total={g.items.length} reordering={reordering} move={move} />
          ))}
        </ul>
      ) : (
        <p className="td-empty">Nothing here.</p>
      )}
      {adding ? (
        <div className="pr-field" data-group={g.group} onBlur={onBlurField}>
          <label className="vh" htmlFor={`pr-in-${g.group}`}>
            Add an item to {name}
          </label>
          <div className="pr-fieldrow">
            <div className="field pr-input">
              <input
                id={`pr-in-${g.group}`}
                type="text"
                placeholder="Add an item"
                autoComplete="off"
                enterKeyHint="enter"
                maxLength={TRIP_LIMITS.item}
                value={adding.value}
                aria-describedby={`pr-help-${g.group}`}
                onChange={(e) => onValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitAdd(g.group);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    closeAdd(true);
                  }
                }}
              />
            </div>
            <button
              className="btn-primary pr-submit"
              type="button"
              data-act="add-submit"
              data-id={g.group}
              aria-label={`Add to ${name}`}
              aria-disabled={off ? true : undefined}
              onClick={() => (off ? say("Adding to the checklist needs a connection.") : submitAdd(g.group))}
            >
              Add
            </button>
            <button
              className="btn-sec pr-close"
              type="button"
              data-act="add-close"
              data-id={g.group}
              aria-label={`Close, ${name}`}
              onClick={() => closeAdd(true)}
            >
              Close
            </button>
          </div>
          <p className="help" id={`pr-help-${g.group}`}>
            {off ? "Adding to the checklist needs a connection." : "Press Enter to add it and keep going."}
          </p>
        </div>
      ) : (
        <button
          className="link-btn pr-add"
          type="button"
          data-act="add-open"
          data-id={g.group}
          onClick={() => openAdd(g.group)}
        >
          <Icon name="plus" />
          Add to {name}
        </button>
      )}
    </div>
  );
}

function Item({
  it,
  idx,
  total,
  reordering,
  move,
}: {
  it: ChecklistItem;
  idx: number;
  total: number;
  reordering: boolean;
  move: (it: ChecklistItem, dir: "up" | "down", why: string) => void;
}) {
  const c = useDetail();
  const dlg = useTripDialogs();
  const packing = it.group === "packing";
  const bid = `pr-by-${it.id}`;
  const hasBy = !!it.doneAt || !it.seeded;
  const g = groupName(it.group);
  const upWhy = c.offline ? "Reordering needs a connection." : idx === 0 ? `First in ${g}` : "";
  const dnWhy = c.offline ? "Reordering needs a connection." : idx === total - 1 ? `Last in ${g}` : "";
  return (
    <li className={`pr-row${it.doneAt ? " is-done" : ""}`} data-key={it.id}>
      <button
        className="tick"
        type="button"
        role="checkbox"
        aria-checked={!!it.doneAt}
        aria-label={`${it.title}${packing ? " packed" : " done"}`}
        aria-describedby={hasBy ? bid : undefined}
        data-act="itick"
        data-id={it.id}
        onClick={() =>
          c.writes.setItemDone({
            tripId: c.trip.id,
            id: it.id,
            done: !it.doneAt,
            actorId: c.myId,
            at: new Date().toISOString(),
          })
        }
      >
        <Icon name="check" />
      </button>
      <button className="pr-btn" type="button" data-act="item" data-id={it.id} onClick={() => dlg.itemSheet(it.id)}>
        <span className="pr-title" dir="auto">
          {it.title}
        </span>
        {it.doneAt ? (
          <span className="pr-by is-done" id={bid}>
            <Av id={it.doneBy} p={c.people} />
            <span>
              {packing ? "Packed by " : "Done by "}
              {c.people.name(it.doneBy)} · {when(it.doneAt, c.today)}
            </span>
          </span>
        ) : !it.seeded ? (
          <span className="pr-by" id={bid}>
            <Av id={it.createdBy} p={c.people} />
            <span>Added by {c.people.name(it.createdBy)}</span>
          </span>
        ) : null}
        {it.pending && (
          <span className="queued">
            <Icon name="cloud-off" />
            Waiting to sync
          </span>
        )}
      </button>
      {reordering && (
        <span className="pr-move">
          <button
            className="btn-sec pr-mv"
            type="button"
            data-act="up"
            data-id={it.id}
            aria-label={`Move up, ${it.title}`}
            aria-disabled={upWhy ? true : undefined}
            aria-describedby={upWhy ? `why-up-${it.id}` : undefined}
            onClick={() => move(it, "up", upWhy)}
          >
            <Icon name="arrow-up" />
            <span className="pr-mv-t" aria-hidden="true">
              Move up
            </span>
          </button>
          <button
            className="btn-sec pr-mv"
            type="button"
            data-act="down"
            data-id={it.id}
            aria-label={`Move down, ${it.title}`}
            aria-disabled={dnWhy ? true : undefined}
            aria-describedby={dnWhy ? `why-down-${it.id}` : undefined}
            onClick={() => move(it, "down", dnWhy)}
          >
            <Icon name="arrow-down" />
            <span className="pr-mv-t" aria-hidden="true">
              Move down
            </span>
          </button>
          {upWhy ? (
            <span className="vh" id={`why-up-${it.id}`}>
              {upWhy}
            </span>
          ) : null}
          {dnWhy ? (
            <span className="vh" id={`why-down-${it.id}`}>
              {dnWhy}
            </span>
          ) : null}
        </span>
      )}
    </li>
  );
}
