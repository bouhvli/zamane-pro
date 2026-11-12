import { TRIP_LIMITS } from "../../../../shared/schemas/trips.ts";
import type { AvatarSlot } from "../../../lib/people.ts";

/**
 * The dialogs' words, verbatim from .ux-forge/trips dialogs.js (C, tooLong, sNotice...). Currency-bearing
 * sentences are built where the currency is known.
 */
export const C = {
  close: "Close",
  cancel: "Cancel",
  keepIt: "Keep it",
  del: "Delete",
  remove: "Remove",
  edit: "Edit",
  save: "Save",
  saving: "Saving…",
  adding: "Adding…",
  saveChanges: "Save changes",
  final: "You can't undo this.",
  keepEditing: "Keep editing",
  discard: "Discard",
  copyText: "Copy text",
  copied: "Text copied",
  copyFailed: "Couldn't copy. Select the text and copy it by hand.",
  restored: "Draft restored.",
  discardDraft: "Discard draft",
  useTheirs: "Use theirs",
  emptyValue: "(empty)",
  resolved: "Their version is in the field.",
  optional: "Optional details",
  when: "When",
  where: "Where",
  cost: "Cost",
  link: "Link",
  notes: "Notes",
  area: "Area",
  estimate: "Estimated cost",
  noDate: "No date yet",
  anyTime: "Any time",
  overnightSheet: "Ends the next day",
  noCost: "No cost yet",
  noEstimate: "No estimate",
  openLink: "Open link",
  newTab: "(opens in a new tab)",
  queued: "Waiting to sync",
  mustDo: "Must-do",
  idea: "Idea. Not in the plan yet.",
  showInPlan: "Show in the plan",
  reschedule: "To move it to another day, edit its plan item.",
  schedule: "Schedule",
  editNote: "Changes here don't change its plan item.",
  itemHeading: "Edit item",
  title: "Title",
  group: "Group",
  groupHelp: "Moving it puts it at the end of the new group.",
  itemErr: "Enter a title for the item.",
  saved: "Changes saved",
  rDelete: "Deleting needs a connection.",
  rSchedule: "Scheduling needs a connection.",
  rQueued: "This place hasn't synced yet.",
  rSave: "You're offline. You can save your changes when you're back online. What you've changed stays here.",
  rAdd: "You're offline. You can add this when you're back online. What you've typed stays here.",
  placeOfflineNew: "You're offline. This place will be added when you're back online.",
  onAdd: "Back online. You can add this now.",
  onSave: "Back online. You can save your changes now.",
  onSchedule: "Back online. You can schedule this now.",
  // plan item form
  pHeadNew: "Add to the plan",
  pHeadEdit: "Edit plan item",
  pSubmitNew: "Add to the plan",
  pTitleHelp: "For example, Dinner on the square",
  type: "Type",
  day: "Day",
  another: "Another date…",
  date: "Date",
  outside: "This is outside the trip dates.",
  time: "Time",
  timeHelp: "Optional. Leave it empty if it can happen any time.",
  start: "Start time",
  end: "End time",
  overnight: "Ends the next day.",
  location: "Location",
  locationHelp: "Optional. An address or a name you'd recognise.",
  costHelp: "Optional. For example 350 or 350,50",
  urlHelp: "Optional. A booking or a page about it.",
  notesHelp: "Optional.",
  eTitle: "Enter a title, for example Dinner on the square.",
  eDate: "Choose a date, or pick another day.",
  eDateBad: "Enter a valid date.",
  eEnd: "Add a start time first.",
  eCost: "Use numbers only, for example 350 or 350,50.",
  eUrl: "Use a web address starting with https://",
  pDiscardTitle: "Discard this plan item?",
  discardBody: "What you've typed will be lost.",
  discardEditTitle: "Discard your changes?",
  pMissing: "This plan item was deleted. Your changes weren't saved.",
  pFailed: "Couldn't add this. Try again.",
  pFailedEdit: "Couldn't save the changes. Try again.",
  // place form
  plHeadNew: "New place",
  plHeadEdit: "Edit place",
  plSubmitNew: "Add place",
  plTitleHelp: "For example, Pena Palace",
  mustHelp: "Something you don't want to miss.",
  areaHelp: "Optional. A neighbourhood or town, for example old medina.",
  estHelp: "Optional. A rough guess is fine. It counts toward the budget until the place is in the plan.",
  plETitle: "Enter a title, for example Pena Palace.",
  plEEst: "Use numbers only, for example 150 or 150,50.",
  plDiscardTitle: "Discard this place?",
  plMissing: "This place was deleted. Your changes weren't saved.",
  plFailed: "Couldn't add the place. Try again.",
  // schedule
  sHead: "Schedule this place",
  sPlaceholder: "Choose a day",
  sNote: "The cost is copied from the estimate. You can change it in the plan.",
  sSubmit: "Add to the plan",
  sEDay: "Choose a day, or No date yet.",
  sFailed: "Couldn't schedule this. Try again.",
} as const;

export const MAX = {
  title: TRIP_LIMITS.title,
  location: TRIP_LIMITS.location,
  area: TRIP_LIMITS.area,
  url: TRIP_LIMITS.url,
  notes: TRIP_LIMITS.notes,
} as const;

export const fmtInt = (n: number) => n.toLocaleString("en-US");
export const tooLong = (n: number, what: string) => `Use ${fmtInt(n)} characters or fewer for the ${what}.`;

export type Kind = "entry" | "place" | "item";
export const nounOf = (k: Kind) => (k === "entry" ? "plan item" : k === "place" ? "place" : "item");

/** Who changed a record while it was open (Goals §6.7): the partner, this person elsewhere, or unknown. */
export type Actor = { kind: "partner"; name: string; slot: AvatarSlot } | { kind: "self" } | { kind: "other" };

export function sNotice(a: Actor, noun: string): string {
  const tail = " while you were editing. Check the marked fields, then save again.";
  if (a.kind === "partner") return `${a.name} changed this ${noun}${tail}`;
  if (a.kind === "self") return `This ${noun} changed on your other device${tail}`;
  return `This ${noun} changed on another phone${tail}`;
}
export const sChangedBy = (a: Actor) =>
  a.kind === "partner"
    ? `Changed by ${a.name}`
    : a.kind === "self"
      ? "Changed on your other device"
      : "Changed on another phone";
export function sConflict(a: Actor, v: string): string {
  const q = `"${v}".`;
  return a.kind === "partner"
    ? `${a.name} changed this to ${q}`
    : a.kind === "self"
      ? `Your other device changed this to ${q}`
      : `Another phone changed this to ${q}`;
}
