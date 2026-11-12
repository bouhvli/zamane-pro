import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import type { ChecklistGroup, TripItemType } from "../../../../shared/enums.ts";
import type { PlanEntryView, TripView } from "../../../../shared/schemas/trips.ts";
import { addDays, nowNext as baseNowNext, status, type StatusKind } from "../../../../shared/trip-plan.ts";
import { day, isoDate, time } from "../../../lib/goals.ts";
import type { ChecklistItem, EntryItem, PlaceItem, useTripWrites } from "../../../lib/trips.ts";
import { Icon, type IconName } from "../../Icon.tsx";
import { initial } from "../../Seat.tsx";
import type { AvatarSlot } from "../../../lib/people.ts";

/** What every part of the trip page shares: the data, the device's clock, the people and the page-level actions. */
export const TAB_NAME = { plan: "Plan", places: "Places", prep: "Prep" } as const;
export type Tab = keyof typeof TAB_NAME;
export const TABS = ["plan", "places", "prep"] as const;

export interface People {
  name: (id: string | null) => string;
  slot: (id: string | null) => AvatarSlot;
}

export type NowNext = { now: PlanEntryView | null; next: PlanEntryView | null; nothingLeft: boolean };

export interface Primary {
  act: "new-entry" | "new-place";
  text: string;
}

export interface DetailCtx {
  trip: TripView;
  mode: "ready" | "partial" | "notcached";
  entries: EntryItem[];
  places: PlaceItem[];
  items: ChecklistItem[];
  kind: StatusKind;
  today: string;
  nn: NowNext;
  offline: boolean;
  currency: string;
  /** Null when uploads are off: covers aren't shown. */
  cloudName: string | null;
  mad: (minor: number) => string;
  people: People;
  myId: string;
  primary: Primary | null;
  /** The plan entry being ticked now: its row keeps the Now cell until the light has left (--dur-light). */
  leaving: string | null;
  earlierOpen: boolean;
  setEarlierOpen: (v: boolean) => void;
  tickEntry: (e: EntryItem) => void;
  writes: ReturnType<typeof useTripWrites>;
  openEntryForm: (date?: string) => void;
  openPlaceForm: () => void;
  openScheduleForm: (placeId: string) => void;
  /** Selects the Plan tab (phones), opens a folded day if needed, and focuses the entry's row. */
  showEntry: (id: string) => void;
  /** Selects a tab (replace, never push) and brings its heading into view and focus. */
  reveal: (tab: Tab, el?: HTMLElement | null) => void;
  editTo: (focus?: "dates" | "budget") => { to: "/trips/$tripId/edit"; params: { tripId: string }; search: never };
}

export const DetailContext = createContext<DetailCtx | null>(null);
export function useDetail(): DetailCtx {
  const c = useContext(DetailContext);
  if (!c) throw new Error("useDetail outside the trip page");
  return c;
}

// ---------- small pieces ----------

export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}
export const useWide = () => useMedia("(min-width: 64rem)");
export const usePhone = () => useMedia("(max-width: 47.99rem)");
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The partner avatar, decorative (Z.av): the name is always in the text next to it. */
export function Av({ id, p }: { id: string | null; p: People }) {
  return (
    <span className={`zm-av zm-av-${p.slot(id)} zm-av-sm`} aria-hidden="true">
      {initial(p.name(id)) || "?"}
    </span>
  );
}

const Dot = () => (
  <>
    <span className="sep" aria-hidden="true">
      {" "}
      ·{" "}
    </span>
    <span className="vh">, </span>
  </>
);
/** Parts joined by a dot that is silent and read as a comma (detail.js join). */
export function Join({ parts }: { parts: (ReactNode | false | null | undefined | "")[] }) {
  const list = parts.filter(Boolean);
  return (
    <>
      {list.map((x, i) => (
        <Fragment key={i}>
          {i > 0 && <Dot />}
          {x}
        </Fragment>
      ))}
    </>
  );
}

export function Amount({ n, mad }: { n: number; mad: (n: number) => string }) {
  return (
    <span className="num" dir="ltr">
      {mad(n)}
    </span>
  );
}

export const TypeIcon = ({ type }: { type: TripItemType }) => <Icon name={type as IconName} />;
export const GroupIcon = ({ group }: { group: ChecklistGroup }) => <Icon name={group as IconName} />;

/** "14:05" for something from today, else "Sat 7 Nov" (detail.js when). */
export function when(iso: string, today: string): string {
  const d = new Date(iso);
  return isoDate(d) === today ? time(d) : day(d);
}

export function PanelHead({ tab, caption }: { tab: Tab; caption?: string }) {
  return (
    <div className="td-phead">
      <h2 className="td-ph" id={`td-h-${tab}`} tabIndex={-1}>
        {TAB_NAME[tab]}
      </h2>
      {caption ? <p className="td-pcap">{caption}</p> : null}
    </div>
  );
}
export function SkRows({ n, announce }: { n: number; announce?: string }) {
  return (
    <>
      <div className="td-sk-rows" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="sk td-sk-row" />
        ))}
      </div>
      {announce ? (
        <p className="vh" role="status">
          {announce}
        </p>
      ) : null}
    </>
  );
}
export const NotCached = () => (
  <p className="td-empty">This isn&apos;t on this phone yet. It loads when you&apos;re back online.</p>
);

/**
 * A press on an aria-disabled control changes nothing but shows its reason beside it and announces it once
 * (detail.js reasonHTML / pressDisabled).
 */
export function Reason({ id, text, shown }: { id: string; text: string; shown: boolean }) {
  return (
    <>
      <span className="vh" id={`why-${id}`}>
        {text}
      </span>
      {shown ? (
        <p className="help td-why" aria-hidden="true">
          {text}
        </p>
      ) : null}
    </>
  );
}

/** Now / Next, plus the evening rule: with nothing timed left today, tomorrow's first is Next (ia D6). */
export function nowNextWithEvening(
  t: Pick<TripView, "startDate" | "endDate">,
  entries: PlanEntryView[],
  today: string,
  hm: string,
): NowNext {
  const r = baseNowNext(t, entries, today, hm);
  const out: NowNext = { ...r, nothingLeft: false };
  if (status(t, today).kind !== "now" || r.now || r.next) return out;
  if (!entries.some((e) => e.date === today)) return out;
  out.nothingLeft = true;
  const tomorrow = addDays(today, 1);
  if (t.endDate && tomorrow <= t.endDate) {
    out.next =
      entries
        .filter((e) => e.date === tomorrow && e.start && !e.doneAt)
        .sort((a, b) => (a.start! < b.start! ? -1 : 1))[0] ?? null;
  }
  return out;
}

/** The CSS duration token in ms (the light leaves the row over --dur-light). */
export function tokenMs(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (parseFloat(v) || 0) * (/ms$/.test(v) ? 1 : 1000);
}
