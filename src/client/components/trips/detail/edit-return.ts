/**
 * Back from a trip's edit form (Save or Cancel), focus returns to that trip's Edit link (IA 6.3, detail.js). The
 * detail page marks which trip's Edit was followed; the next arrival on that trip consumes the mark.
 */
let editFrom: string | null = null;

export function markTripEditFrom(tripId: string) {
  editFrom = tripId;
}

export function consumeTripEditReturn(tripId: string): boolean {
  const hit = editFrom === tripId;
  editFrom = null;
  return hit;
}
