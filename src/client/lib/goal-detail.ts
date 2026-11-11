/**
 * Back from a goal's edit form (Save or Cancel), focus returns to that goal's Edit link (IA 6.3, detail.js). The
 * detail page marks which goal's Edit was followed; the next arrival on that goal consumes the mark.
 */
let editFrom: string | null = null;

export function markEditFrom(goalId: string) {
  editFrom = goalId;
}

export function consumeEditReturn(goalId: string): boolean {
  const hit = editFrom === goalId;
  editFrom = null;
  return hit;
}
