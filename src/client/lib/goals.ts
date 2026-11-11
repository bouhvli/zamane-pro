import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { isComplete } from "../../shared/completion.ts";
import type {
  CreateGoalInput,
  EntryView,
  GoalStats,
  GoalsResponse,
  GoalView,
  NoteBlock,
  NoteView,
  UpdateGoalInput,
} from "../../shared/schemas/goals.ts";
import { api } from "./api.ts";

/**
 * Goals data (§5, .ux-forge/goals): the list, one goal's entries, notes and stats. Derived values follow the
 * prototype's shared layer (shared.js): ratio, done, the D1 order, the total saved. Entries are added through the
 * offline queue in home.ts; patchEntryAdd / patchEntryRemove keep these caches in step optimistically.
 */
export const goalsKey = ["goals"] as const;
export const goalKey = (id: string) => ["goals", id] as const;
export const entriesKey = (id: string) => ["goals", id, "entries"] as const;
export const notesKey = (id: string) => ["goals", id, "notes"] as const;
export const statsKey = (id: string) => ["goals", id, "stats"] as const;

/** A goal as the client holds it: the server's, plus a mark while its latest entry waits to sync. */
export type GoalItem = GoalView & { pendingSync?: boolean };
export type GoalsData = Omit<GoalsResponse, "goals"> & { goals: GoalItem[] };
export type EntryItem = EntryView & { pending?: boolean };

export const goalsQuery = queryOptions({
  queryKey: goalsKey,
  queryFn: () => api<GoalsResponse>("/api/goals") as Promise<GoalsData>,
  staleTime: 15_000,
});
export const entriesQuery = (id: string) =>
  queryOptions({
    queryKey: entriesKey(id),
    queryFn: async () => (await api<{ entries: EntryView[] }>(`/api/goals/${id}/entries`)).entries as EntryItem[],
    staleTime: 15_000,
  });
export const notesQuery = (id: string) =>
  queryOptions({
    queryKey: notesKey(id),
    queryFn: async () => (await api<{ notes: NoteView[] }>(`/api/goals/${id}/notes`)).notes,
    staleTime: 15_000,
  });
export const statsQuery = (id: string) =>
  queryOptions({
    queryKey: statsKey(id),
    queryFn: () => api<GoalStats>(`/api/goals/${id}/stats`),
    staleTime: 15_000,
  });

/** The list's query, for pages that only need its members, currency or image settings. */
export function useGoalsData() {
  return useQuery(goalsQuery);
}

// ---------- derived values (shared.js) ----------

type GoalLike = Pick<GoalView, "kind" | "progress" | "target">;
/** 0..n, uncapped (the D1 order uses it). */
export function ratio(g: GoalLike): number {
  return g.kind === "money" ? (g.target ? g.progress / g.target : 0) : g.progress / 100;
}
/** 0..100, capped, rounded (bars and labels). */
export function pct(g: GoalLike): number {
  return Math.round(Math.min(1, ratio(g)) * 100);
}
export function isDone(g: GoalLike & Pick<GoalView, "completedAt">): boolean {
  return g.completedAt !== null || isComplete(g.kind, g.progress, g.target);
}
function lastActivity(g: GoalView): number {
  return new Date(g.last?.at ?? g.createdAt).getTime();
}
/** D1: open goals closest to done first; ties go to the most recent activity. */
export function openGoals(gs: GoalItem[]): GoalItem[] {
  return gs.filter((g) => !isDone(g)).sort((a, b) => ratio(b) - ratio(a) || lastActivity(b) - lastActivity(a));
}
/** Reached goals, newest first. */
export function doneGoals(gs: GoalItem[]): GoalItem[] {
  return gs
    .filter((g) => isDone(g))
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());
}
export function totalSaved(gs: GoalItem[]): number {
  return gs.filter((g) => g.kind === "money").reduce((s, g) => s + g.progress, 0);
}

// ---------- optimistic entry patches (used by the entry mutations in home.ts) ----------

export interface EntryPatch {
  goalId: string;
  id: string;
  amount?: number;
  percent?: number;
  note?: string;
  actorId: string;
  at: string;
}

export function goalAfterEntry<G extends GoalItem>(g: G, v: EntryPatch, pendingSync: boolean): G {
  const progress = g.kind === "money" ? g.progress + (v.amount ?? 0) : (v.percent ?? g.progress);
  const complete = isComplete(g.kind, progress, g.target);
  return {
    ...g,
    progress,
    completedAt: complete ? (g.completedAt ?? v.at) : null,
    completedBy: complete ? (g.completedBy ?? v.actorId) : null,
    last: {
      id: v.id,
      userId: v.actorId,
      amount: v.amount ?? null,
      percent: v.percent ?? null,
      note: v.note ?? null,
      at: v.at,
    },
    entryCount: g.entryCount + 1,
    pendingSync,
  };
}

export type GoalCaches = {
  goals?: GoalsData;
  entries?: EntryItem[];
};

/** Applies an entry to the goals list and the goal's entries; returns what was there, for a rollback. */
export function patchEntryAdd(qc: QueryClient, v: EntryPatch, pending: boolean): GoalCaches {
  const before: GoalCaches = {
    goals: qc.getQueryData<GoalsData>(goalsKey),
    entries: qc.getQueryData<EntryItem[]>(entriesKey(v.goalId)),
  };
  if (before.goals) {
    qc.setQueryData<GoalsData>(goalsKey, {
      ...before.goals,
      goals: before.goals.goals.map((g) => (g.id === v.goalId ? goalAfterEntry(g, v, pending) : g)),
    });
  }
  if (before.entries) {
    const e: EntryItem = {
      id: v.id,
      userId: v.actorId,
      amount: v.amount ?? null,
      percent: v.percent ?? null,
      note: v.note ?? null,
      at: v.at,
      pending,
    };
    qc.setQueryData<EntryItem[]>(entriesKey(v.goalId), [e, ...before.entries]);
  }
  return before;
}

/** Removes an entry from the caches (an Undo or a delete from the entry sheet). */
export function patchEntryRemove(qc: QueryClient, goalId: string, entryId: string): GoalCaches {
  const before: GoalCaches = {
    goals: qc.getQueryData<GoalsData>(goalsKey),
    entries: qc.getQueryData<EntryItem[]>(entriesKey(goalId)),
  };
  const rest = before.entries?.filter((e) => e.id !== entryId);
  if (rest) qc.setQueryData<EntryItem[]>(entriesKey(goalId), rest);
  if (before.goals) {
    qc.setQueryData<GoalsData>(goalsKey, {
      ...before.goals,
      goals: before.goals.goals.map((g) => {
        if (g.id !== goalId) return g;
        const gone = before.entries?.find((e) => e.id === entryId);
        const last = rest ? (rest[0] ?? null) : g.last?.id === entryId ? null : g.last;
        const progress =
          g.kind === "money"
            ? Math.max(0, g.progress - (gone?.amount ?? (g.last?.id === entryId ? (g.last.amount ?? 0) : 0)))
            : (last?.percent ?? 0);
        const complete = isComplete(g.kind, progress, g.target);
        return {
          ...g,
          progress,
          last,
          entryCount: Math.max(0, g.entryCount - 1),
          completedAt: complete ? g.completedAt : null,
          completedBy: complete ? g.completedBy : null,
          pendingSync: false,
        };
      }),
    });
  }
  return before;
}

export function restoreGoalCaches(qc: QueryClient, goalId: string, before: GoalCaches) {
  if (before.goals) qc.setQueryData(goalsKey, before.goals);
  if (before.entries) qc.setQueryData(entriesKey(goalId), before.entries);
}

/** After any write to a goal: the list, the goal's feeds and stats, and Home are fetched again. */
export function invalidateGoal(qc: QueryClient, goalId?: string) {
  void qc.invalidateQueries({ queryKey: goalsKey, exact: true });
  if (goalId) void qc.invalidateQueries({ queryKey: goalKey(goalId) });
  void qc.invalidateQueries({ queryKey: ["home"] });
}

// ---------- goal and note writes (online only; the forms say so when offline) ----------

export function createGoal(input: CreateGoalInput) {
  return api<{ goal: GoalView }>("/api/goals", { body: input as Record<string, unknown> });
}
export function updateGoal(id: string, input: UpdateGoalInput) {
  return api<{ goal: GoalView; completed: boolean; reopened: boolean }>(`/api/goals/${id}`, {
    method: "PATCH",
    body: input as Record<string, unknown>,
  });
}
export function deleteGoal(id: string) {
  return api<void>(`/api/goals/${id}`, { method: "DELETE" });
}
export function createNote(goalId: string, input: { id: string; blocks: NoteBlock[] }) {
  return api<{ note: NoteView }>(`/api/goals/${goalId}/notes`, { body: input as unknown as Record<string, unknown> });
}
export function updateNote(goalId: string, noteId: string, input: { blocks: NoteBlock[]; updatedAt: string }) {
  return api<{ note: NoteView }>(`/api/goals/${goalId}/notes/${noteId}`, {
    method: "PUT",
    body: input as unknown as Record<string, unknown>,
  });
}
export function deleteNote(goalId: string, noteId: string) {
  return api<void>(`/api/goals/${goalId}/notes/${noteId}`, { method: "DELETE" });
}

/** Puts a saved goal into the list cache (create and edit), so the next screen shows it at once. */
export function putGoal(qc: QueryClient, goal: GoalView) {
  const d = qc.getQueryData<GoalsData>(goalsKey);
  if (!d) return;
  const has = d.goals.some((g) => g.id === goal.id);
  qc.setQueryData<GoalsData>(goalsKey, {
    ...d,
    goals: has ? d.goals.map((g) => (g.id === goal.id ? goal : g)) : [...d.goals, goal],
  });
}
export function dropGoal(qc: QueryClient, id: string) {
  const d = qc.getQueryData<GoalsData>(goalsKey);
  if (d) qc.setQueryData<GoalsData>(goalsKey, { ...d, goals: d.goals.filter((g) => g.id !== id) });
  qc.removeQueries({ queryKey: goalKey(id) });
}

// ---------- words (shared.js formatting) ----------

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** A date-only string (YYYY-MM-DD) as a local date; anything else as an instant. */
export function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date(d);
}
const yearSuffix = (d: Date, now = new Date()) => (d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`);
/** "Sat 7 Nov", with the year when it isn't this year. */
export function day(v: string | Date): string {
  const d = toDate(v);
  return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}${yearSuffix(d)}`;
}
/** "19:42" */
export function time(v: string | Date): string {
  const d = toDate(v);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export const dayTime = (v: string | Date) => `${day(v)}, ${time(v)}`;
/** "November", with the year when it isn't this year. */
export function month(v: string | Date): string {
  const d = toDate(v);
  return MONTH[d.getMonth()]! + yearSuffix(d);
}
export function monthKey(v: string | Date): string {
  const d = toDate(v);
  return `${d.getFullYear()}-${d.getMonth()}`;
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** "just now" · "today" · "yesterday" · "2 days ago" · "Sat 7 Nov" (shared.js Z.ago). */
export function ago(v: string | Date, now = new Date()): string {
  const d = toDate(v);
  if ((now.getTime() - d.getTime()) / 60000 < 1) return "just now";
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 864e5);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return day(d);
}
/** YYYY-MM-DD in the device's calendar. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);
