import type { ChecklistGroup } from "../../shared/enums.ts";

/**
 * The checklist every new trip starts with (D24, English; one file to translate later). The titles are the
 * prototype's (.ux-forge/trips shared.js SEED); positions count up inside each group.
 */
export const CHECKLIST_SEED: readonly (readonly [ChecklistGroup, string])[] = [
  ["packing", "Walking shoes"],
  ["packing", "Phone chargers"],
  ["packing", "Toiletries"],
  ["packing", "Medicines"],
  ["documents", "ID cards or passports"],
  ["documents", "Travel insurance"],
  ["documents", "Booking confirmations"],
  ["bookings", "Accommodation"],
  ["bookings", "Transport"],
  ["todo", "Ask someone to water the plants"],
  ["todo", "Withdraw some cash"],
];

/** The seed as rows: { group, title, position }. */
export function checklistSeedRows(): { group: ChecklistGroup; title: string; position: number }[] {
  const next: Partial<Record<ChecklistGroup, number>> = {};
  return CHECKLIST_SEED.map(([group, title]) => {
    const position = (next[group] = (next[group] ?? 0) + 1);
    return { group, title, position };
  });
}
