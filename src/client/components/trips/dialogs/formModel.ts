import { TRIP_ITEM_TYPES, type TripItemType } from "../../../../shared/enums.ts";
import { day } from "../../../lib/goals.ts";
import { typeName } from "../../../lib/trips.ts";
import {
  isIso,
  maxErr,
  minorToInput,
  moneyError,
  moneyNorm,
  moneyShown,
  readMoney,
  textDef,
  urlErr,
} from "./common.tsx";
import { C, MAX } from "./copy.ts";
import type { Canon, Cfg, Def } from "./engine.ts";

/**
 * The plan-item, place and schedule forms' model: one value object (what is typed), and per form the fields the
 * merge compares (defs), how each reads to / writes from a canonical value, and the validators (dialogs.js
 * `registry`, `textDef`, `moneyDef`, `entryDayDef`, ...).
 */
export type FKind = "entry" | "place" | "schedule";

export interface FV {
  title: string;
  type: TripItemType;
  /** A day option: an ISO date, "none", "another" (entry) or "" (schedule: not chosen yet). */
  day: string;
  /** The "Another date…" input. */
  date: string;
  start: string;
  end: string;
  location: string;
  cost: string;
  url: string;
  notes: string;
  mustDo: boolean;
  area: string;
  estimate: string;
}
export const EMPTY: FV = {
  title: "",
  type: "other",
  day: "none",
  date: "",
  start: "",
  end: "",
  location: "",
  cost: "",
  url: "",
  notes: "",
  mustDo: false,
  area: "",
  estimate: "",
};

const timeDef = (id: string, label: string): Def => ({ ...textDef(id, label), norm: (v) => String(v ?? "").trim() });

export interface Ctx {
  currency: string;
  /** The ISO days the Day select lists. */
  dayOpts: string[];
}

function defsFor(kind: FKind, ctx: Ctx): Record<string, Def> {
  const money = (id: string, label: string): Def => ({
    ...textDef(id, label, true),
    norm: moneyNorm,
    shown: moneyShown(ctx.currency),
  });
  const type: Def = {
    label: C.type,
    markId: "dgf-type-mark",
    norm: (v) => String(v ?? ""),
    shown: (v) => typeName(v as TripItemType),
  };
  if (kind === "entry")
    return {
      title: textDef("dgf-title", C.title),
      type,
      date: {
        label: C.day,
        markId: "dgf-day-mark",
        norm: (v) => String(v ?? ""),
        shown: (v) => (v ? day(String(v)) : C.noDate),
      },
      start: timeDef("dgf-start", C.start),
      end: timeDef("dgf-end", C.end),
      location: textDef("dgf-location", C.location, true),
      cost: money("dgf-cost", C.cost),
      url: textDef("dgf-url", C.link, true),
      notes: textDef("dgf-notes", C.notes, true),
    };
  if (kind === "place")
    return {
      title: textDef("dgf-title", C.title),
      type,
      mustDo: {
        label: C.mustDo,
        markId: "dgf-mustdo-mark",
        norm: (v) => (v ? "1" : ""),
        shown: (v) => (v ? C.mustDo : C.emptyValue),
      },
      area: textDef("dgf-area", C.area, true),
      estimate: money("dgf-estimate", C.estimate),
      url: textDef("dgf-url", C.link, true),
      notes: textDef("dgf-notes", C.notes, true),
    };
  return {
    date: {
      label: C.day,
      markId: "dgf-day-mark",
      norm: (v) => (v == null ? "none" : String(v)),
      shown: (v) => (v ? day(String(v)) : C.noDate),
    },
    start: timeDef("dgf-start", C.start),
    end: timeDef("dgf-end", C.end),
  };
}

/** The Day select's value for a canonical date (writeDay). */
export function dayFields(kind: FKind, v: FV, canon: Canon, opts: string[]): FV {
  if (canon == null) return { ...v, day: "none" };
  const s = String(canon);
  if (s === "") return { ...v, day: kind === "schedule" ? "" : "another" };
  if (opts.includes(s)) return { ...v, day: s };
  if (kind === "entry") return { ...v, day: "another", date: s };
  return v;
}

export function cfgFor(kind: FKind, ctx: Ctx): Cfg<FV> {
  const cur = ctx.currency;
  return {
    defs: defsFor(kind, ctx),
    read(v): Record<string, Canon> {
      const time = (s: string) => (s ? s : null);
      if (kind === "schedule") return { date: v.day === "none" ? null : v.day, start: time(v.start), end: time(v.end) };
      if (kind === "entry")
        return {
          title: v.title.trim(),
          type: v.type,
          date: v.day === "none" ? null : v.day === "another" ? v.date || "" : v.day,
          start: time(v.start),
          end: time(v.end),
          location: v.location.trim(),
          cost: readMoney(v.cost, cur),
          url: v.url.trim(),
          notes: v.notes.trim(),
        };
      return {
        title: v.title.trim(),
        type: v.type,
        mustDo: v.mustDo,
        area: v.area.trim(),
        estimate: readMoney(v.estimate, cur),
        url: v.url.trim(),
        notes: v.notes.trim(),
      };
    },
    write(v, f, c) {
      const txt = String(c ?? "");
      switch (f) {
        case "title":
        case "location":
        case "url":
        case "notes":
        case "area":
          return { ...v, [f]: txt };
        case "type":
          return { ...v, type: (TRIP_ITEM_TYPES as readonly string[]).includes(txt) ? (txt as TripItemType) : "other" };
        case "mustDo":
          return { ...v, mustDo: !!c };
        case "start":
        case "end":
          return { ...v, [f]: txt };
        case "cost":
        case "estimate":
          return { ...v, [f]: typeof c === "number" ? minorToInput(c, cur) : txt };
        case "date":
          return dayFields(kind, v, c, ctx.dayOpts);
        default:
          return v;
      }
    },
    validate(v): Record<string, string> {
      const title = (empty: string) => {
        const t = v.title.trim();
        return !t ? empty : t.length > MAX.title ? `Use ${MAX.title} characters or fewer for the title.` : "";
      };
      const end = v.end && !v.start ? C.eEnd : "";
      if (kind === "schedule") return { date: v.day === "" ? C.sEDay : "", end };
      if (kind === "entry")
        return {
          title: title(C.eTitle),
          date: v.day === "another" ? (!v.date ? C.eDate : !isIso(v.date) ? C.eDateBad : "") : "",
          end,
          location: maxErr(v.location, MAX.location, "location"),
          cost: moneyError(v.cost, cur, C.eCost),
          url: urlErr(v.url, MAX.url),
          notes: maxErr(v.notes, MAX.notes, "notes"),
        };
      return {
        title: title(C.plETitle),
        area: maxErr(v.area, MAX.area, "area"),
        estimate: moneyError(v.estimate, cur, C.plEEst),
        url: urlErr(v.url, MAX.url),
        notes: maxErr(v.notes, MAX.notes, "notes"),
      };
    },
  };
}
