import { useRef, type ReactNode } from "react";
import type { PlanEntryView } from "../../../../shared/schemas/trips.ts";
import { days as daysOf, type DayGroup } from "../../../../shared/trip-plan.ts";
import { day } from "../../../lib/goals.ts";
import { range, rangeSr, timeRange, timeRangeSr, typeName, type EntryItem } from "../../../lib/trips.ts";
import { Icon } from "../../Icon.tsx";
import { useTripDialogs } from "../TripDialogs.tsx";
import { Amount, Av, Join, NotCached, PanelHead, SkRows, TypeIcon, useDetail, when, type NowNext } from "./shared.tsx";

/** Plan: the day list (detail.js planHTML). Rows are [data-act="entry"][data-id]; the tick is its own button. */
export function PlanPanel() {
  const c = useDetail();
  const { trip: t, kind } = c;
  const jump = useRef<HTMLSelectElement>(null);
  if (c.mode === "partial")
    return (
      <>
        <PanelHead tab="plan" />
        <SkRows n={4} announce="Loading the plan" />
      </>
    );
  if (c.mode === "notcached")
    return (
      <>
        <PanelHead tab="plan" />
        <NotCached />
      </>
    );
  const d = daysOf(t, c.entries, c.today);
  const total = c.entries.length;
  const ctx: Ctx = { kind, nn: c.nn, outside: false, noDate: false };

  let earlierBlock = null;
  let dayList: DayGroup[] = d.days;
  if (kind === "now") {
    const earlier = d.days.filter((x) => x.date < c.today);
    dayList = d.days.filter((x) => x.date >= c.today);
    if (earlier.length) {
      const es = earlier.flatMap((x) => x.entries);
      const doneN = es.filter((e) => e.doneAt).length;
      const first = earlier[0]!.date;
      const last = earlier[earlier.length - 1]!.date;
      earlierBlock = (
        <div className="pl-earlier">
          <button
            className="pl-fold"
            type="button"
            id="pl-fold"
            data-act="earlier"
            aria-expanded={c.earlierOpen}
            aria-controls="pl-earlier"
            onClick={() => c.setEarlierOpen(!c.earlierOpen)}
          >
            <Icon name="chevron-right" />
            <span className="pl-fold-text">
              <span className="pl-fold-k">Earlier days</span>
              <span className="pl-fold-sum">
                <span aria-hidden="true">{range(first, last)}</span>
                <span className="vh">{rangeSr(first, last)}</span>
                {` · ${doneN} of ${es.length} done`}
              </span>
            </span>
          </button>
          <div className="pl-earlier-days" id="pl-earlier" hidden={!c.earlierOpen}>
            <Days days={earlier} ctx={ctx} />
          </div>
        </div>
      );
    }
  }

  return (
    <>
      <PanelHead tab="plan" />
      <div className="pl">
        {t.startDate && d.days.length > 7 && (
          <div className="pl-jump">
            <label className="field-label" htmlFor="pl-jump">
              Jump to a day
            </label>
            <div className="pl-jumprow">
              <select id="pl-jump" className="pl-select" ref={jump}>
                {d.days.map((x) => (
                  <option key={x.date} value={x.date}>
                    {day(x.date)} · Day {x.n}
                  </option>
                ))}
              </select>
              <button
                className="btn-sec"
                type="button"
                data-act="jump"
                aria-label="Go to day"
                onClick={() => {
                  const iso = jump.current?.value;
                  if (!iso) return;
                  if (kind === "now" && iso < c.today && !c.earlierOpen) c.setEarlierOpen(true);
                  requestAnimationFrame(() => {
                    const h = document.getElementById(`pl-day-${iso}`);
                    if (!h) return;
                    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    h.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
                    h.focus({ preventScroll: true });
                  });
                }}
              >
                Go
              </button>
            </div>
          </div>
        )}
        {earlierBlock}
        <Days days={dayList} ctx={ctx} />
        {d.outside.length > 0 && (
          <div className="pl-group">
            <h3 className="pl-gh" id="pl-outside">
              Outside the trip dates
            </h3>
            <p className="pl-intro">
              Planned for dates that aren&apos;t in the trip. Edit one to move it into the trip.
            </p>
            <Entries list={d.outside} ctx={{ ...ctx, outside: true }} />
          </div>
        )}
        {d.unscheduled.length > 0 && (
          <div className="pl-group">
            <h3 className="pl-gh" id="pl-nodate">
              No date yet
            </h3>
            <Entries list={d.unscheduled} ctx={{ ...ctx, noDate: true }} />
          </div>
        )}
        {!total && !t.startDate && (
          <p className="td-empty">Nothing planned yet. Add the first thing with Add to the plan.</p>
        )}
        {!total && kind === "past" && <p className="td-empty">Nothing was planned for this trip.</p>}
        {/* Plan's own add sits at the end, so Today stays inside the fold; hidden while it's the primary. */}
        {(!c.primary || c.primary.act !== "new-entry") && (
          <button className="btn-sec td-paneladd" type="button" data-act="new-entry" onClick={() => c.openEntryForm()}>
            <Icon name="plus" />
            Add to the plan
          </button>
        )}
      </div>
    </>
  );
}

type Ctx = { kind: string; nn: NowNext; outside: boolean; noDate: boolean };

function Days({ days, ctx }: { days: DayGroup[]; ctx: Ctx }) {
  // Runs of 3 or more empty days: one 48 px line each (ia D7).
  const empty = days.map((d) => !d.entries.length);
  return (
    <>
      {days.map((d, i) => {
        let len = 0;
        if (empty[i]) {
          for (let j = i; j >= 0 && empty[j]; j--) len++;
          for (let j = i + 1; j < empty.length && empty[j]; j++) len++;
        }
        return <DayBlock key={d.date} d={d} ctx={ctx} run={len >= 3} />;
      })}
    </>
  );
}

function DayBlock({ d, ctx, run }: { d: DayGroup; ctx: Ctx; run: boolean }) {
  const c = useDetail();
  const label = day(d.date);
  const today = ctx.kind === "now" && d.isToday;
  const big = today ? "Today" : label;
  const cap = !c.trip.startDate ? "" : today ? `${label} · Day ${d.n}` : `Day ${d.n}`;
  const empty = !d.entries.length;
  const add = (
    <button
      className="btn-ghost pl-dayadd"
      type="button"
      data-act="day-add"
      data-id={d.date}
      aria-label={`Add to ${label}`}
      onClick={() => c.openEntryForm(d.date)}
    >
      <Icon name="plus" />
      Add
    </button>
  );
  const nx = ctx.nn.next;
  return (
    <div
      className={`pl-day${today ? " is-today" : ""}${empty ? " is-empty" : ""}${run ? " is-run" : ""}`}
      data-day={d.date}
    >
      <div className="pl-dayhead">
        <h3 className="pl-dayh" id={`pl-day-${d.date}`} tabIndex={-1}>
          <span className="pl-big">{big}</span>
          {cap && (
            <>
              <span className="vh"> · </span>
              <span className="pl-cap">{cap}</span>
            </>
          )}
        </h3>
        {empty ? null : add}
      </div>
      {empty ? (
        <div className={`pl-well${run ? " is-run" : ""}`}>
          <p>{today ? "Nothing planned today" : "Nothing planned"}</p>
          {add}
        </div>
      ) : (
        <>
          {today && ctx.nn.nothingLeft && (
            <p className="pl-left">
              Nothing else planned today
              {nx ? (
                <>
                  .{" "}
                  <button
                    className="link-btn pl-leftnext"
                    type="button"
                    data-act="entry"
                    data-id={nx.id}
                    onClick={() => c.showEntry(nx.id)}
                  >
                    Next: <span dir="auto">{nx.title}</span>, tomorrow {nx.start}
                  </button>
                </>
              ) : null}
            </p>
          )}
          <Entries list={d.entries} ctx={ctx} />
        </>
      )}
    </div>
  );
}

/** Untimed entries come first in a day; "Any time" captions only them (ia D7). */
function Entries({ list, ctx }: { list: PlanEntryView[]; ctx: Ctx }) {
  const rows = (xs: PlanEntryView[]) =>
    xs.length ? (
      <ul className="pl-rows" role="list">
        {xs.map((e) => (
          <Row key={e.id} e={e as EntryItem} ctx={ctx} />
        ))}
      </ul>
    ) : null;
  const n = ctx.outside || ctx.noDate ? 0 : list.filter((e) => !e.start).length;
  if (!n) return rows(list);
  return (
    <>
      <p className="pl-anytime">Any time</p>
      {rows(list.slice(0, n))}
      {rows(list.slice(n))}
    </>
  );
}

function Row({ e, ctx }: { e: EntryItem; ctx: Ctx }) {
  const c = useDetail();
  const dlg = useTripDialogs();
  const { trip: t, today } = c;
  const leaving = c.leaving === e.id;
  // While the light leaves the row it still looks like the Now row, unticked, with a filled box.
  const done = !!e.doneAt && !leaving;
  const isNow = leaving || ctx.nn.now?.id === e.id;
  const isNext = ctx.nn.next?.id === e.id;
  const running = ctx.kind === "now";
  const bid = `pl-by-${e.id}`;
  const place = e.placeId ? c.places.find((p) => p.id === e.placeId) : null;

  const parts: ReactNode[] = [];
  // A done row during the trip keeps only its title and who ticked it: today's plan is about what's left.
  if (!(done && running)) {
    if (isNext) parts.push(<b className="pl-next">Next</b>);
    if (ctx.outside) parts.push(<span>{day(e.date!)}</span>);
    if (e.start && !isNow)
      parts.push(
        <>
          <span className="num" aria-hidden="true">
            {timeRange(e)}
          </span>
          <span className="vh">{timeRangeSr(e)}</span>
        </>,
      );
    if (e.location)
      parts.push(
        <span className="pl-loc" dir="auto">
          {e.location}
        </span>,
      );
    if (e.cost != null) parts.push(<Amount n={e.cost} mad={c.mad} />);
    if (place)
      parts.push(
        <span>
          From Places: <span dir="auto">{place.title}</span>
        </span>,
      );
  }
  const by = e.doneAt ? (
    <span className="pl-by" id={bid}>
      <Av id={e.doneBy} p={c.people} />
      <span>
        Done by {c.people.name(e.doneBy)} · {when(e.doneAt, today)}
      </span>
    </span>
  ) : (
    <span className="vh" id={bid}>
      Added by {c.people.name(e.createdBy)}
    </span>
  );
  const outsideSub = ctx.outside ? (
    <span className="pl-sub">{e.date! < (t.startDate ?? "") ? "Before the trip" : "After the trip"}</span>
  ) : null;
  const cls = `pl-row${done ? " is-done" : ""}${isNow ? " is-now" : ""}${isNext ? " is-next" : ""}`;
  return (
    <li className={cls} data-key={e.id}>
      <button
        className="tick"
        type="button"
        role="checkbox"
        aria-checked={!!e.doneAt}
        aria-label={`${e.title} done`}
        aria-describedby={bid}
        data-act="tick"
        data-id={e.id}
        onClick={() => c.tickEntry(e)}
      >
        <Icon name="check" />
      </button>
      <button
        className={`pl-card commit${isNow ? " is-now" : ""}${leaving ? " is-leaving" : ""}`}
        type="button"
        data-act="entry"
        data-id={e.id}
        onClick={() => dlg.entrySheet(e.id)}
      >
        {isNow && (
          <span className="pl-cell">
            <span className="pl-cell-k">Now</span>
            {e.start && (
              <span className="pl-cell-t num" aria-hidden="true">
                {e.start}
              </span>
            )}
            {e.end && (
              <span className="pl-cell-e num" aria-hidden="true">
                –{e.end}
              </span>
            )}
            <span className="vh">{e.start ? `, ${timeRangeSr(e)}, ` : ", "}</span>
          </span>
        )}
        <span className="pl-body">
          {!done && (
            <span className="pl-av">
              <Av id={e.createdBy} p={c.people} />
            </span>
          )}
          <span className="pl-title">
            <span className="pl-ic">
              <TypeIcon type={e.type} />
            </span>
            <span className="vh">{typeName(e.type)}, </span>
            <span dir="auto">{e.title}</span>
          </span>
          {parts.length > 0 && (
            <span className="pl-meta">
              <Join parts={parts} />
            </span>
          )}
          {outsideSub}
          {by}
          {e.pending && (
            <span className="queued pl-queued">
              <Icon name="cloud-off" />
              Waiting to sync
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
