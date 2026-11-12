/**
 * A person who left the space (or deleted their account) stays in the history: their contributions, ticks and notes
 * keep pointing at their user id, which the members list no longer carries. Everything that resolves an id to a
 * name or an avatar falls back here instead of crashing: the name "Former partner" and a neutral avatar (no
 * partner colour). Before the members list has loaded the old neutral wording stays, so nothing flashes "Former".
 */
export const FORMER_PARTNER = "Former partner";

/** The avatar's colour class suffix: a partner slot, or "former" for someone who left. */
export type AvatarSlot = "a" | "b" | "former";

/** The name for an id that isn't in the members list and isn't the signed-in person. */
export const unknownName = (membersLoaded: boolean) => (membersLoaded ? FORMER_PARTNER : "Your partner");

/** The avatar slot for such an id; `fallback` is what was used before there were former partners. */
export const unknownSlot = (membersLoaded: boolean, fallback: "a" | "b"): AvatarSlot =>
  membersLoaded ? "former" : fallback;
