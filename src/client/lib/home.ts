import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { isComplete, progressRatio } from "../../shared/completion.ts";
import type { EntryResponse, HomeGoal, HomeResponse } from "../../shared/schemas/home.ts";
import { api } from "./api.ts";
import { invalidateGoal, patchEntryAdd, patchEntryRemove, restoreGoalCaches, type GoalCaches } from "./goals.ts";

export const homeKey = ["home"] as const;

/** A goal as Home holds it: the server's, plus a mark while its latest entry waits to sync. */
export type HomeGoalView = HomeGoal & { pendingSync?: boolean };
export type HomeData = Omit<HomeResponse, "goals"> & { goals: HomeGoalView[] };

export const homeQuery = queryOptions({
  queryKey: homeKey,
  queryFn: () => api<HomeResponse>("/api/home") as Promise<HomeData>,
  staleTime: 15_000,
});

export function goalRatio(g: Pick<HomeGoal, "kind" | "progress" | "target">): number {
  return progressRatio(g.kind, g.progress, g.target);
}
export function goalDone(g: Pick<HomeGoal, "kind" | "progress" | "target" | "completedAt">): boolean {
  return g.completedAt !== null || isComplete(g.kind, g.progress, g.target);
}

// ---------- the offline-capable mutation (§9): ['goalEntries', 'add'] ----------

export const addEntryKey = ["goalEntries", "add"] as const;
export const removeEntryKey = ["goalEntries", "remove"] as const;
/**
 * One queue for every goal-entry write: they run one at a time, in order, so an Undo (remove) always runs after
 * its add, even across a reload (a mutation waiting in the queue is paused, so it's persisted with the cache).
 */
const entryScope = { id: "goalEntries" };

export interface RemoveEntryVars {
  goalId: string;
  id: string;
  /** The caller already patched the caches (an Undo restores its own snapshot). */
  applied?: boolean;
}

/** JSON-only, so a paused mutation survives a reload in IndexedDB. */
export interface AddEntryVars {
  goalId: string;
  id: string;
  amount?: number;
  percent?: number;
  note?: string;
  actorId: string;
  at: string;
  /** The caller already patched the Goals caches. */
  applied?: boolean;
}

/** Home after an entry, as the optimistic update and the toasts see it. */
export function applyEntry(data: HomeData, v: AddEntryVars, pendingSync: boolean): HomeData {
  return {
    ...data,
    total: data.total + (v.amount ?? 0),
    goals: data.goals.map((g) => {
      if (g.id !== v.goalId) return g;
      const progress = g.kind === "money" ? g.progress + (v.amount ?? 0) : (v.percent ?? g.progress);
      const complete = isComplete(g.kind, progress, g.target);
      return {
        ...g,
        progress,
        completedAt: complete ? (g.completedAt ?? v.at) : null,
        last: {
          userId: v.actorId,
          amount: v.amount ?? null,
          percent: v.percent ?? null,
          note: v.note ?? null,
          at: v.at,
        },
        pendingSync,
      };
    }),
  };
}

/**
 * Registered before the persisted cache is restored, so a paused mutation rehydrated from IndexedDB finds its
 * mutationFn and replays in order once the phone is back online.
 */
export function registerHomeMutations(qc: QueryClient) {
  qc.setMutationDefaults(addEntryKey, {
    scope: entryScope,
    mutationFn: (v: AddEntryVars) =>
      api<EntryResponse>(`/api/goals/${v.goalId}/entries`, {
        body: {
          id: v.id,
          ...(v.amount !== undefined ? { amount: v.amount } : { percent: v.percent }),
          ...(v.note ? { note: v.note } : {}),
        },
      }),
    onMutate: async (v: AddEntryVars) => {
      await qc.cancelQueries({ queryKey: homeKey });
      await qc.cancelQueries({ queryKey: ["goals"] });
      const before = qc.getQueryData<HomeData>(homeKey);
      if (before) qc.setQueryData<HomeData>(homeKey, applyEntry(before, v, !navigator.onLine));
      // The Goals screens show the same entry at once (the list, the goal's history); undone by onError.
      const goals = v.applied ? undefined : patchEntryAdd(qc, v, !navigator.onLine);
      return { before, goals };
    },
    onError: (_e: unknown, v: AddEntryVars, ctx: { before?: HomeData; goals?: GoalCaches } | undefined) => {
      if (ctx?.before) qc.setQueryData(homeKey, ctx.before);
      if (ctx?.goals) restoreGoalCaches(qc, v.goalId, ctx.goals);
    },
    onSettled: (_d: unknown, _e: unknown, v: AddEntryVars) => {
      void qc.invalidateQueries({ queryKey: homeKey });
      invalidateGoal(qc, v.goalId);
    },
  });
  qc.setMutationDefaults(removeEntryKey, {
    scope: entryScope,
    mutationFn: (v: RemoveEntryVars) => api(`/api/goals/${v.goalId}/entries/${v.id}`, { method: "DELETE" }),
    onMutate: (v: RemoveEntryVars) => {
      if (!v.applied) patchEntryRemove(qc, v.goalId, v.id);
    },
    onSettled: (_d: unknown, _e: unknown, v: RemoveEntryVars) => {
      void qc.invalidateQueries({ queryKey: homeKey });
      invalidateGoal(qc, v.goalId);
    },
  });
}

// ---------- words ----------

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "2 days ago", from the device's calendar. */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const secs = (now.getTime() - then.getTime()) / 1000;
  if (secs < 60) return "just now";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days === 0) {
    if (secs < 3600) return RTF.format(-Math.floor(secs / 60), "minute");
    return RTF.format(-Math.floor(secs / 3600), "hour");
  }
  if (days < 30) return RTF.format(-days, "day");
  const months = Math.round(days / 30);
  if (months < 12) return RTF.format(-months, "month");
  return RTF.format(-Math.round(days / 365), "year");
}

/** "Mon 9 Nov" */
export function todayCaption(now = new Date()): string {
  return now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);
