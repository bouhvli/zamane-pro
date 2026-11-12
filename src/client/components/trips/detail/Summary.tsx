import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { budget as budgetOf, status, type Budget } from "../../../../shared/trip-plan.ts";
import { plural } from "../../../lib/goals.ts";
import { range, rangeSr, typeName } from "../../../lib/trips.ts";
import { Icon } from "../../Icon.tsx";
import { BudgetBar, LightBand, TripDoorway } from "../Bits.tsx";
import { Amount, Join, TypeIcon, useDetail, usePhone, useWide } from "./shared.tsx";

const BUDGET_KEY = "zamane.trips.budgetOpen";
const load = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: not remembered */
  }
};

/** The `.td-top` row: the up-link and Edit (the form is a task page of its own). */
export function Top({ onEdit }: { onEdit?: () => void }) {
  const c = useDetail();
  return (
    <>
      <Link className="td-back" to="/trips" aria-label="Back to Trips">
        <Icon name="chevron-left" />
        <span>Trips</span>
      </Link>
      <Link
        className="btn-sec btn-sm td-edit"
        id="td-edit"
        data-act="edit"
        {...c.editTo()}
        aria-label={`Edit ${c.trip.title}`}
        onClick={onEdit}
      >
        Edit
      </Link>
    </>
  );
}

export function Identity() {
  const c = useDetail();
  const t = c.trip;
  const s = status(t, c.today);
  const now = s.kind === "now";
  const parts: ReactNode[] = [];
  if (t.destination) parts.push(<span dir="auto">{t.destination}</span>);
  if (t.startDate)
    parts.push(
      <>
        <span aria-hidden="true">{range(t.startDate, t.endDate)}</span>
        <span className="vh">{rangeSr(t.startDate, t.endDate)}</span>
      </>,
    );
  else parts.push(<span>No dates yet</span>);
  return (
    <>
      <div className="td-titlerow">
        {now && <TripDoorway title={t.title} cover={t.cover} size="thumb" cloudName={c.cloudName} />}
        <h1 className={`${now ? "title-lg" : "display"} td-title`} id="td-title" tabIndex={-1} dir="auto">
          {t.title}
        </h1>
      </div>
      {s.kind === "now" && (
        <p className="td-nowtext">
          Day {s.day} of {s.total}
          <span className="sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <span className="vh">, </span>
          {s.last ? "Last day" : "Happening now"}
        </p>
      )}
      <p className="td-meta">
        <Join parts={parts} />
        {!t.startDate && (
          <Link className="btn-ghost td-adddates" {...c.editTo("dates")} aria-label={`Add dates to ${t.title}`}>
            <Icon name="calendar" />
            Add dates
          </Link>
        )}
      </p>
    </>
  );
}

export function Door() {
  const c = useDetail();
  if (c.kind === "now") return null;
  return <TripDoorway title={c.trip.title} cover={c.trip.cover} size="detail" cloudName={c.cloudName} />;
}

export function When({ isNextTrip }: { isNextTrip: boolean }) {
  const c = useDetail();
  if (c.kind === "upcoming") return <LightBand trip={c.trip} today={c.today} lead={isNextTrip} nights />;
  if (c.kind === "past") return <LightBand trip={c.trip} today={c.today} />;
  return null;
}

/** Notes clamp to two lines; "More" shows only when they overflow (ia D3). */
export function Notes({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const p = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = p.current;
    if (!el) return;
    const measure = () => {
      if (!open) setOver(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);
  return (
    <div className="td-notesrow">
      <p className={`td-notes-text${open ? " is-open" : ""}`} id="td-notes-text" dir="auto" ref={p}>
        {text}
      </p>
      <button
        className="td-more"
        type="button"
        data-act="notes"
        aria-expanded={open}
        aria-controls="td-notes-text"
        aria-label={open ? "Less notes" : "More notes"}
        hidden={!open && !over}
        onClick={() => setOpen(!open)}
      >
        {open ? "Less" : "More"}
      </button>
    </div>
  );
}

/** What's left: prep items not ticked, must-do places not in the plan; before the trip and undated only. */
export function Left() {
  const c = useDetail();
  if (c.kind !== "upcoming" && c.kind !== "undated") return null;
  const prep = c.items.filter((i) => !i.doneAt).length;
  const mustDo = c.places.filter((p) => p.mustDo && !c.entries.some((e) => e.placeId === p.id)).length;
  const links: ReactNode[] = [];
  if (prep)
    links.push(
      <a
        key="prep"
        className="td-leftlink"
        href="?view=prep"
        data-act="left"
        data-id="prep"
        onClick={(e) => {
          e.preventDefault();
          c.reveal("prep");
        }}
      >
        {prep} {plural(prep, "prep item left", "prep items left")}
      </a>,
    );
  if (mustDo)
    links.push(
      <a
        key="places"
        className="td-leftlink"
        href="?view=places"
        data-act="left"
        data-id="places"
        onClick={(e) => {
          e.preventDefault();
          c.reveal("places");
        }}
      >
        {mustDo} {plural(mustDo, "must-do not in the plan yet", "must-dos not in the plan yet")}
      </a>,
    );
  return (
    <>
      <h2 className="vh" id="td-left-h">
        What&apos;s left
      </h2>
      <p className="td-leftline">
        {links.length
          ? links.flatMap((l, i) => [
              i > 0 ? (
                <span key={`s${i}`} className="td-leftsep" aria-hidden="true">
                  ·
                </span>
              ) : null,
              l,
            ])
          : "Nothing left to sort out."}
      </p>
    </>
  );
}

/**
 * Budget (D10 + the ink-and-pencil bar). Phones: a disclosure inside the h2. During the trip on phones it compacts to
 * one 44 px row (fold rule 3). From 64rem it is always open.
 */
export function BudgetBlock() {
  const c = useDetail();
  const t = c.trip;
  const wide = useWide();
  const phone = usePhone();
  const [open, setOpen] = useState(() => load(BUDGET_KEY) === "1");
  const b = budgetOf(t, c.entries, c.places);
  const queued = c.places.some((p) => p.pending && !c.entries.some((e) => e.placeId === p.id));
  const compact = phone && c.kind === "now";
  const mad = c.mad;
  const fig =
    b.budget != null
      ? `Planned ${mad(b.planned)} of ${mad(b.budget)}`
      : b.planned
        ? `Planned ${mad(b.planned)}`
        : "Nothing costed yet";
  const state =
    b.budget == null ? null : b.over ? (
      <span className="budget-over">Over by {mad(b.over)}</span>
    ) : (
      `${mad(b.left)} left`
    );
  const set =
    b.budget == null ? (
      <Link className="btn-ghost td-setbud" {...c.editTo("budget")} aria-label={`Set a budget for ${t.title}`}>
        Set a budget
      </Link>
    ) : null;
  const head = <span className="td-bud-k">Budget</span>;
  if (!b.planned && b.budget == null)
    return (
      <>
        <h2 className="td-bud-h">{head}</h2>
        <p className="td-bud-fig">{fig}</p>
        {set}
      </>
    );
  const bar = <BudgetBar budget={b} currency={c.currency} label="Budget" />;
  if (wide) {
    return (
      <>
        <h2 className="td-bud-h">{head}</h2>
        <p className="td-bud-fig">
          <span dir="ltr">{fig}</span>
          {state ? (
            <>
              <span className="sep" aria-hidden="true">
                {" "}
                ·{" "}
              </span>
              <span className="vh">, </span>
              {state}
            </>
          ) : null}
        </p>
        {bar}
        <Breakdown b={b} queued={queued} open fig={null} wide />
        {set}
      </>
    );
  }
  const toggle = () => {
    const n = !open;
    setOpen(n);
    save(BUDGET_KEY, n ? "1" : "0");
  };
  const btn = (
    <button
      className="td-bud-btn"
      type="button"
      id="td-bud-btn"
      data-act="budget"
      aria-expanded={open}
      aria-controls="td-bd"
      onClick={toggle}
    >
      <span className="td-bud-fig" dir="ltr">
        {compact ? (state ?? fig) : fig}
      </span>
      <Icon name="chevron-down" />
    </button>
  );
  if (compact)
    return (
      <>
        <div className="td-bud-row">
          <h2 className="td-bud-h">
            {head}
            {btn}
          </h2>
          {bar}
        </div>
        <Breakdown b={b} queued={queued} open={open} fig={fig} wide={false} />
        {set}
      </>
    );
  return (
    <>
      <h2 className="td-bud-h">
        {head}
        {btn}
      </h2>
      {bar}
      {state ? <p className="td-bud-state">{state}</p> : null}
      {set}
      <Breakdown b={b} queued={queued} open={open} fig={null} wide={false} />
    </>
  );
}

function Breakdown({
  b,
  queued,
  open,
  fig,
  wide,
}: {
  b: Budget;
  queued: boolean;
  open: boolean;
  fig: string | null;
  wide: boolean;
}) {
  const c = useDetail();
  const mad = c.mad;
  const explain = "Planned adds up the costs in the plan and the estimates for ideas that aren't in the plan yet.";
  const places = `${b.ideasCount} ${plural(b.ideasCount, "place", "places")}`;
  return (
    <div className="td-bd" id="td-bd" hidden={!open}>
      {fig ? (
        <p className="td-bd-fig" dir="ltr">
          {fig}
        </p>
      ) : null}
      {wide ? (
        <details className="td-bd-why">
          <summary>What counts</summary>
          <p className="caption td-bd-explain">{explain}</p>
        </details>
      ) : (
        <p className="caption td-bd-explain">{explain}</p>
      )}
      <ul className="td-bd-list" role="list">
        {b.byType.map((r) => (
          <li key={r.type}>
            <TypeIcon type={r.type} />
            <span>
              {typeName(r.type)} · <Amount n={r.amount} mad={mad} />
            </span>
          </li>
        ))}
        {b.ideasCount > 0 && b.ideas > 0 && (
          <li className="td-bd-ideas">
            <span aria-hidden="true">
              Ideas not in the plan yet · {places} ·{" "}
              <span className="num" dir="ltr">
                ~{mad(b.ideas)}
              </span>
            </span>
            <span className="vh">
              Ideas not in the plan yet: {places}, about {mad(b.ideas)}
            </span>
            {queued && (
              <span className="queued">
                <Icon name="cloud-off" />
                Waiting to sync
              </span>
            )}
          </li>
        )}
        {b.uncosted > 0 && (
          <li className="td-bd-nocost">
            <Icon name="other" />
            <span>
              No cost yet on {b.uncosted} {plural(b.uncosted, "plan item", "plan items")}
            </span>
          </li>
        )}
      </ul>
      {b.budget != null && (
        <Link
          className="link-btn td-bd-change"
          {...c.editTo("budget")}
          aria-label={`Change budget for ${c.trip.title}`}
        >
          Change budget
        </Link>
      )}
    </div>
  );
}
