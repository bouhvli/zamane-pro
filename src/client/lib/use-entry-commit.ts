import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RefObject } from "react";
import { v7 as uuidv7 } from "uuid";
import { isComplete } from "../../shared/completion.ts";
import { formatAmount } from "../../shared/money.ts";
import type { ToastHandle } from "../components/Toast.tsx";
import {
  entriesKey,
  goalAfterEntry,
  goalsKey,
  isDone,
  restoreGoalCaches,
  type GoalCaches,
  type EntryItem,
  type GoalItem,
  type GoalsData,
} from "./goals.ts";
import {
  addEntryKey,
  homeKey,
  removeEntryKey,
  type AddEntryVars,
  type HomeData,
  type RemoveEntryVars,
} from "./home.ts";

/**
 * The quick-add sheet's commit on a goal's page (shared.js Z.commitAdd): the entry goes through the offline queue
 * (home.ts), then a toast with Undo. Undo removes my own just-added entry: dropped from the queue when it hasn't
 * been sent, otherwise removed right behind it.
 */
export function useEntryCommit({
  toast,
  myId,
  currency,
  focusPrimary,
  onCompleted,
}: {
  toast: RefObject<ToastHandle | null>;
  myId: string;
  currency: string;
  focusPrimary: () => void;
  onCompleted?: (goalId: string) => void;
}) {
  const qc = useQueryClient();
  const add = useMutation<unknown, Error, AddEntryVars>({ mutationKey: addEntryKey });
  const remove = useMutation<unknown, Error, RemoveEntryVars>({ mutationKey: removeEntryKey });
  const amt = (minor: number) => formatAmount(minor, currency);

  return function commit(goal: GoalItem, value: number, note: string, o: { onDetail: boolean }) {
    const money = goal.kind === "money";
    const beforePct = goal.progress;
    const queued = !navigator.onLine;
    const vars: AddEntryVars = {
      goalId: goal.id,
      id: uuidv7(),
      ...(money ? { amount: value } : { percent: value }),
      ...(note ? { note } : {}),
      actorId: myId,
      at: new Date().toISOString(),
    };
    const snapshot: GoalCaches = {
      goals: qc.getQueryData<GoalsData>(goalsKey),
      entries: qc.getQueryData<EntryItem[]>(entriesKey(goal.id)),
    };
    const homeBefore = qc.getQueryData<HomeData>(homeKey);
    const after = goalAfterEntry(goal, vars, queued);
    const completed = !isDone(goal) && isComplete(after.kind, after.progress, after.target);
    add.mutate(vars);
    if (completed) onCompleted?.(goal.id);

    const amountText = money ? amt(value) : "";
    const undoLabel = money
      ? `Undo: remove ${amountText} from ${goal.title}`
      : `Undo: set ${goal.title} back to ${beforePct}%`;
    const undo = () => {
      restoreGoalCaches(qc, goal.id, snapshot);
      if (homeBefore) qc.setQueryData(homeKey, homeBefore);
      focusPrimary();
      toast.current?.show({
        msg: money ? `Removed ${amountText} from ${goal.title}` : `${goal.title} is back to ${beforePct}%`,
      });
      const cache = qc.getMutationCache();
      const m = cache.getAll().find((x) => (x.state.variables as AddEntryVars | undefined)?.id === vars.id);
      if (m && m.state.isPaused && m.state.status === "pending") {
        cache.remove(m);
        return;
      }
      remove.mutate({ goalId: goal.id, id: vars.id, applied: true });
    };

    focusPrimary();
    if (completed) {
      toast.current?.show({
        done: true,
        title: "Goal reached.",
        msg: queued
          ? "Goal reached once this syncs."
          : o.onDetail
            ? money
              ? `${amt(goal.target ?? 0)} together.`
              : "At 100%."
            : money
              ? `${goal.title}: ${amt(goal.target ?? 0)} together.`
              : `${goal.title} is at 100%.`,
        undo,
        undoLabel,
      });
    } else if (money) {
      toast.current?.show({
        msg: `Added ${amountText} to ${goal.title}${queued ? ". Will sync when you're back online." : ""}`,
        undo,
        undoLabel,
      });
    } else {
      toast.current?.show({
        msg: queued
          ? `${goal.title} set to ${value}%. Will sync when you're back online.`
          : `${goal.title} is now at ${value}%`,
        undo,
        undoLabel,
      });
    }
  };
}
