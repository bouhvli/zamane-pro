import { useRef, useState, type ReactNode } from "react";
import { entryOf, visited } from "../../../../shared/trip-plan.ts";
import { say } from "../../../lib/announce.ts";
import { day } from "../../../lib/goals.ts";
import { typeName, type PlaceItem } from "../../../lib/trips.ts";
import { Icon } from "../../Icon.tsx";
import { useTripDialogs } from "../TripDialogs.tsx";
import { Av, Join, NotCached, PanelHead, Reason, SkRows, TypeIcon, useDetail } from "./shared.tsx";

type Group = "ideas" | "plan" | "visited";

/** Places: ideas, the ones in the plan, the visited ones (detail.js placesHTML). Cards are [data-act="place"]. */
export function PlacesPanel() {
  const c = useDetail();
  const { entries, places } = c;
  const frozen = useRef<{ group: Map<string, Group>; order: string[] } | null>(null);
  const [reasons, setReasons] = useState<Record<string, boolean>>({});

  const ideasN = places.filter((p) => !entryOf(p, entries)).length;
  const head = (
    <PanelHead tab="places" caption={c.mode === "ready" ? `${ideasN} ${ideasN === 1 ? "idea" : "ideas"}` : undefined} />
  );
  if (c.mode === "partial")
    return (
      <>
        {head}
        <SkRows n={3} announce="Loading places" />
      </>
    );
  if (c.mode === "notcached")
    return (
      <>
        {head}
        <NotCached />
      </>
    );

  const live = (p: PlaceItem): Group => {
    const e = entryOf(p, entries);
    return !e ? "ideas" : e.doneAt ? "visited" : "plan";
  };
  // Groups are fixed while the view is on screen; a place scheduled or visited here moves next visit (ia D8).
  if (!frozen.current) {
    const by: Record<Group, PlaceItem[]> = { ideas: [], plan: [], visited: [] };
    for (const p of places) by[live(p)].push(p);
    by.ideas.sort((a, b) => Number(b.mustDo) - Number(a.mustDo) || a.createdAt.localeCompare(b.createdAt));
    const key = (p: PlaceItem) => {
      const e = entryOf(p, entries)!;
      return `${e.date ?? "9999"} ${e.start ?? "99:99"}`;
    };
    by.plan.sort((a, b) => (key(a) < key(b) ? -1 : 1));
    by.visited.sort((a, b) => entryOf(a, entries)!.doneAt!.localeCompare(entryOf(b, entries)!.doneAt!));
    const group = new Map<string, Group>();
    const order: string[] = [];
    for (const g of ["ideas", "plan", "visited"] as Group[])
      for (const p of by[g]) {
        group.set(p.id, g);
        order.push(p.id);
      }
    frozen.current = { group, order };
  }
  const fz = frozen.current;
  for (const p of places)
    if (!fz.group.has(p.id)) {
      fz.group.set(p.id, live(p));
      fz.order.push(p.id);
    }

  const add =
    !c.primary || c.primary.act !== "new-place" ? (
      <button className="btn-sec td-paneladd" type="button" data-act="new-place" onClick={() => c.openPlaceForm()}>
        <Icon name="plus" />
        Add a place
      </button>
    ) : null;
  const intro = <p className="td-intro">Ideas for the trip. Schedule one to put it in the plan.</p>;
  if (!places.length)
    return (
      <>
        {head}
        {intro}
        <p className="td-empty">No places yet. Add the ideas you don&apos;t want to forget.</p>
        {add}
      </>
    );

  const byId = new Map(places.map((p) => [p.id, p]));
  const groups: Record<Group, PlaceItem[]> = { ideas: [], plan: [], visited: [] };
  for (const id of fz.order) {
    const p = byId.get(id);
    if (p) groups[fz.group.get(id)!].push(p);
  }
  const pressDisabled = (key: string, text: string) => {
    setReasons((r) => ({ ...r, [key]: true }));
    say(text);
  };

  return (
    <>
      {head}
      {intro}
      {add}
      {(
        [
          ["ideas", "Ideas"],
          ["plan", "In the plan"],
          ["visited", "Visited"],
        ] as [Group, string][]
      ).map(([g, label]) => {
        const list = groups[g];
        if (!list.length && g !== "ideas") return null;
        return (
          <div className="pc-group" key={g}>
            <h3 className="pc-gh" id={`pc-h-${g}`}>
              {label}
            </h3>
            {list.length ? (
              <ul className="pc-list" role="list">
                {list.map((p) => (
                  <PlaceCard key={p.id} p={p} reasons={reasons} pressDisabled={pressDisabled} />
                ))}
              </ul>
            ) : (
              <p className="td-empty">Every idea is in the plan.</p>
            )}
          </div>
        );
      })}
    </>
  );
}

function PlaceCard({
  p,
  reasons,
  pressDisabled,
}: {
  p: PlaceItem;
  reasons: Record<string, boolean>;
  pressDisabled: (key: string, text: string) => void;
}) {
  const c = useDetail();
  const dlg = useTripDialogs();
  const e = entryOf(p, c.entries);
  const isVisited = visited(p, c.entries);
  const key = `sched-${p.id}`;
  const meta: ReactNode[] = [];
  if (p.area) meta.push(<span dir="auto">{p.area}</span>);
  // A zero estimate is "Free", never "About 0 MAD".
  if (p.estimate === 0) meta.push(<span>Free</span>);
  else if (p.estimate != null)
    meta.push(
      <>
        <span className="num" dir="ltr" aria-hidden="true">
          ~{c.mad(p.estimate)}
        </span>
        <span className="vh">About {c.mad(p.estimate)}</span>
      </>,
    );
  let act: ReactNode = null;
  if (!e) {
    const why = p.pending ? "This place hasn't synced yet." : c.offline ? "Scheduling needs a connection." : "";
    act = (
      <>
        <button
          className="btn-sec pc-sched"
          type="button"
          data-act="schedule"
          data-id={p.id}
          aria-label={`Schedule ${p.title}`}
          aria-disabled={why ? true : undefined}
          aria-describedby={why ? `why-${key}` : undefined}
          onClick={() => (why ? pressDisabled(key, why) : c.openScheduleForm(p.id))}
        >
          <Icon name="calendar" />
          Schedule
        </button>
        {why ? <Reason id={key} text={why} shown={!!reasons[key]} /> : null}
      </>
    );
  } else if (!isVisited) {
    const w = e.date ? day(e.date) + (e.start ? `, ${e.start}` : "") : "no date yet";
    act = (
      <a
        className="pc-inplan"
        href="#plan"
        data-act="inplan"
        data-id={p.id}
        onClick={(ev) => {
          ev.preventDefault();
          c.showEntry(e.id);
        }}
      >
        In the plan · {w}
      </a>
    );
  }
  return (
    <li className={`pc idea${isVisited ? " is-visited" : ""}`} data-key={p.id}>
      <button className="pc-main" type="button" data-act="place" data-id={p.id} onClick={() => dlg.placeSheet(p.id)}>
        <span className="pc-line">
          <span className="pl-ic">
            <TypeIcon type={p.type} />
          </span>
          <span className="vh">{typeName(p.type)}, </span>
          <span className="pc-title" dir="auto">
            {p.title}
          </span>
        </span>
        {meta.length > 0 && (
          <span className="pc-meta">
            <Join parts={meta} />
          </span>
        )}
        <span className="pc-tags">
          {p.mustDo && (
            <span className="must">
              <Icon name="star" />
              Must-do
            </span>
          )}
          <Av id={p.createdBy} p={c.people} />
          <span className="vh">Added by {c.people.name(p.createdBy)}</span>
          {p.pending && (
            <span className="queued">
              <Icon name="cloud-off" />
              Waiting to sync
            </span>
          )}
        </span>
        {isVisited && e && (
          <span className="pc-visited">
            <Icon name="check" />
            <span>
              Visited · {day(new Date(e.doneAt!))} · {c.people.name(e.doneBy)}
            </span>
          </span>
        )}
        {!e && <span className="vh">, Idea</span>}
      </button>
      {act ? <div className="pc-act">{act}</div> : null}
    </li>
  );
}
