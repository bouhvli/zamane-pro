import type { GoalKind } from "./enums.ts";

/**
 * Goal completion (§4.3). Money: progress >= target. General: progress = 100. Crossing up records when and who;
 * dropping back below clears both. The worker calls this inside the transaction that changed the progress.
 */
export function isComplete(kind: GoalKind, progress: number, target: number | null): boolean {
  if (kind === "money") return target !== null && target > 0 && progress >= target;
  return progress >= 100;
}

export interface CompletionState {
  completedAt: Date | null;
  completedBy: string | null;
}

/** The new completion fields, or null when nothing changes. */
export function nextCompletion(
  current: CompletionState,
  complete: boolean,
  actor: string,
  now: Date,
): CompletionState | null {
  if (complete && current.completedAt === null) return { completedAt: now, completedBy: actor };
  if (!complete && current.completedAt !== null) return { completedAt: null, completedBy: null };
  return null;
}

/** Progress as a ratio for ordering and bars: 0..1 (money capped at 1). */
export function progressRatio(kind: GoalKind, progress: number, target: number | null): number {
  if (kind === "money") return target && target > 0 ? Math.min(1, progress / target) : 0;
  return Math.min(1, progress / 100);
}
