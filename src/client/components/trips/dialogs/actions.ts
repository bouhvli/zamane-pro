import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { localToday } from "../../../../shared/trip-days.ts";
import { days, entryOf, itemsOf } from "../../../../shared/trip-plan.ts";
import { day } from "../../../lib/goals.ts";
import {
  addPlaceKey,
  deleteEntry,
  deleteItem,
  deletePlace,
  dropEntry,
  dropItem,
  dropPlace,
  groupName,
  invalidateTrip,
  tripKey,
  type AddPlaceVars,
  type ChecklistItem,
  type EntryItem,
  type PlaceItem,
  type TripData,
} from "../../../lib/trips.ts";
import type { ToastOptions } from "../../Toast.tsx";
import { sel } from "./common.tsx";
import { C } from "./copy.ts";
import type { AskOptions } from "./Confirm.tsx";

/**
 * Deletes, confirmations and the toasts with Undo (dialogs.js "confirmations and deletes", "toasts with Undo"),
 * shared by the read sheets and the forms. Deletes are optimistic (ia §4.6): the cache drops the row at once and is
 * restored if the server refuses. A place that hasn't synced is removed by cancelling its queued add.
 */
export interface DeleteResult {
  focus: string[];
  toast: ToastOptions;
}

/** Cancels a queued (paused) place add so it never reaches the server; false when it was already sent. */
export function cancelQueuedPlace(qc: QueryClient, id: string): boolean {
  const cache = qc.getMutationCache();
  const m = cache.getAll().find((x) => {
    const k = x.options.mutationKey;
    return (
      k?.[0] === addPlaceKey[0] &&
      k?.[1] === addPlaceKey[1] &&
      (x.state.variables as AddPlaceVars | undefined)?.id === id &&
      (x.state.isPaused || x.state.status === "idle")
    );
  });
  if (!m) return false;
  cache.remove(m);
  return true;
}

const neighbours = (list: { id: string }[], i: number, act: string): string[] => {
  const out: string[] = [];
  if (list[i + 1]) out.push(sel(act, list[i + 1]!.id));
  if (list[i - 1]) out.push(sel(act, list[i - 1]!.id));
  return out;
};

export function useTripActions(tripId: string, toast: (o: ToastOptions) => void) {
  const qc = useQueryClient();
  return useMemo(() => {
    const data = () => qc.getQueryData<TripData>(tripKey(tripId));
    const online = () => navigator.onLine;
    const restore = (before: TripData | undefined) => {
      if (before) qc.setQueryData(tripKey(tripId), before);
    };

    // ----- confirmations -----
    const confirmEntry = (e: EntryItem): AskOptions => {
      const place = e.placeId ? data()?.places.find((p) => p.id === e.placeId) : null;
      const lines = ["It's removed from the plan for both of you."];
      if (place)
        lines.push(
          e.doneAt
            ? `${place.title} goes back to your ideas and is no longer visited.`
            : `${place.title} goes back to your ideas.`,
        );
      lines.push(C.final);
      return { title: `Delete ${e.title}?`, body: lines, confirm: C.del, cancel: C.keepIt };
    };
    const confirmPlace = (p: PlaceItem, partner: string | null): AskOptions => {
      if (p.pending)
        return {
          title: `Remove ${p.title}?`,
          body: [partner ? `It hasn't synced, so ${partner} never saw it.` : "It hasn't synced yet."],
          confirm: C.remove,
          cancel: C.keepIt,
        };
      const en = entryOf(p, data()?.entries ?? []);
      const lines = ["It's removed from Places for both of you."];
      if (en)
        lines.push(en.date ? `Its plan item on ${day(en.date)} stays.` : "Its plan item stays, with no date yet.");
      lines.push(C.final);
      return { title: `Delete ${p.title}?`, body: lines, confirm: C.del, cancel: C.keepIt };
    };
    const confirmItem = (it: ChecklistItem): AskOptions => ({
      title: `Delete ${it.title} from ${groupName(it.group)}?`,
      body: ["It's removed for both of you.", C.final],
      confirm: C.del,
      cancel: C.keepIt,
    });

    // ----- deletes (focus targets are computed before the row goes: the next row, else the previous, else Add) -----
    async function deleteEntryNow(e: EntryItem): Promise<DeleteResult | null> {
      const d = data();
      const focus: string[] = [];
      if (d) {
        const dl = days(d.trip, d.entries, localToday());
        for (const g of [...dl.days.map((x) => x.entries), dl.outside, dl.unscheduled]) {
          const i = g.findIndex((x) => x.id === e.id);
          if (i > -1) focus.push(...neighbours(g, i, "entry"));
        }
      }
      if (e.date) focus.push(sel("day-add", e.date));
      focus.push('[data-act="new-entry"]');
      const before = dropEntry(qc, tripId, e.id);
      try {
        await deleteEntry(tripId, e.id);
      } catch {
        restore(before);
        return null;
      }
      invalidateTrip(qc, tripId);
      return { focus, toast: { msg: `Deleted ${e.title} from the plan` } };
    }
    async function deletePlaceNow(p: PlaceItem): Promise<DeleteResult | null> {
      const d = data();
      const state = (x: PlaceItem) => {
        const e = d ? entryOf(x, d.entries) : null;
        return !e ? "idea" : e.doneAt ? "visited" : "plan";
      };
      const list = (d?.places ?? [])
        .filter((x) => state(x) === state(p))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const focus = [
        ...neighbours(
          list,
          list.findIndex((x) => x.id === p.id),
          "place",
        ),
        '[data-act="new-place"]',
      ];
      const queued = !!p.pending;
      const before = dropPlace(qc, tripId, p.id);
      if (queued && cancelQueuedPlace(qc, p.id)) {
        invalidateTrip(qc, tripId);
        return { focus, toast: { msg: `Removed ${p.title} from Places` } };
      }
      try {
        await deletePlace(tripId, p.id);
      } catch {
        restore(before);
        return null;
      }
      invalidateTrip(qc, tripId);
      return { focus, toast: { msg: queued ? `Removed ${p.title} from Places` : `Deleted ${p.title} from Places` } };
    }
    async function deleteItemNow(it: ChecklistItem): Promise<DeleteResult | null> {
      const d = data();
      const list = itemsOf(d?.items ?? [], it.group);
      const i = list.findIndex((x) => x.id === it.id);
      const focus = [...neighbours(list, i, "item"), sel("add-open", it.group)];
      const before = dropItem(qc, tripId, it.id);
      try {
        await deleteItem(tripId, it.id);
      } catch {
        restore(before);
        return null;
      }
      invalidateTrip(qc, tripId);
      return { focus, toast: { msg: `Deleted ${it.title} from ${groupName(it.group)}` } };
    }

    // ----- toasts with Undo (my own just-made adds, D14) -----
    const undoEntry = (id: string, title: string, msg: string) => async () => {
      if (!data()?.entries.some((x) => x.id === id)) return;
      if (!online()) {
        toast({ msg: `Couldn't undo. ${title} is still in the plan.` });
        return;
      }
      const before = dropEntry(qc, tripId, id);
      try {
        await deleteEntry(tripId, id);
        invalidateTrip(qc, tripId);
        toast({ msg });
      } catch {
        restore(before);
        toast({ msg: `Couldn't undo. ${title} is still in the plan.` });
      }
    };
    const entryAddedToast = (e: EntryItem): ToastOptions => ({
      msg: e.date ? `Added ${e.title} to ${day(e.date)}` : `Added ${e.title} to the plan, with no date yet`,
      undoLabel: `Undo: remove ${e.title} from the plan`,
      undo: () => void undoEntry(e.id, e.title, `Removed ${e.title} from the plan`)(),
    });
    const scheduledToast = (title: string, e: EntryItem): ToastOptions => ({
      msg: e.date ? `${title} is on ${day(e.date)}` : `${title} is in the plan, with no date yet`,
      undoLabel: `Undo: take ${title} out of the plan`,
      undo: () => void undoEntry(e.id, title, `${title} is back in your ideas`)(),
    });
    const placeAddedToast = (p: PlaceItem, queued: boolean): ToastOptions => ({
      msg: queued ? `Added ${p.title} to Places. Will sync when you're back online.` : `Added ${p.title} to Places`,
      undoLabel: `Undo: remove ${p.title} from Places`,
      undo: () => {
        const cur = data()?.places.find((x) => x.id === p.id);
        if (!cur) return;
        if (!online() && !cur.pending) {
          toast({ msg: `Couldn't undo. Delete ${p.title} from Places.` });
          return;
        }
        void deletePlaceNow(cur).then((r) =>
          toast(r ? { msg: `Removed ${p.title} from Places` } : { msg: "Couldn't delete this. Try again." }),
        );
      },
    });

    return {
      confirmEntry,
      confirmPlace,
      confirmItem,
      deleteEntryNow,
      deletePlaceNow,
      deleteItemNow,
      entryAddedToast,
      scheduledToast,
      placeAddedToast,
    };
  }, [qc, tripId, toast]);
}
export type TripActions = ReturnType<typeof useTripActions>;
