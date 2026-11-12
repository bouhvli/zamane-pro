import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { MeResponse } from "../../shared/schemas/spaces.ts";
import { api, isApiError } from "./api.ts";
import { carry } from "./carry.ts";
import { clearQueryCache } from "./query.ts";
import { clearAllShoppingDrafts } from "../components/shopping/drafts.ts";
import { clearAllTripDrafts } from "../components/trips/form/drafts.ts";
import { failedAdds } from "./shopping.ts";
import { clearAllGoalDrafts } from "./goal-drafts.ts";
import { clearNoteDrafts } from "./note-drafts.ts";

export const meKey = ["me"] as const;

/** GET /api/me is the one router decision (§2.1 of the designs): only a 401 means signed out. */
export const meQuery = queryOptions({
  queryKey: meKey,
  queryFn: async (): Promise<MeResponse | null> => {
    try {
      return await api<MeResponse>("/api/me");
    } catch (e) {
      if (isApiError(e) && e.status === 401) return null;
      throw e;
    }
  },
  staleTime: 60_000,
});

/** A same-origin path (starts with "/", not "//") or nothing. */
export function safeRedirect(path: unknown): string | undefined {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
    ? path
    : undefined;
}

/** Where a signed-in person without a space goes: the Join form when they have a code or said they do. */
export function setupTarget(): "/setup" | "/setup/join" {
  return carry.get("intent") === "join" || carry.get("code") ? "/setup/join" : "/setup";
}

/** After sign-in or sign-up: drop anything cached for the previous user, then load the new session. */
export async function startSession(qc: QueryClient): Promise<MeResponse | null> {
  await clearQueryCache();
  return qc.fetchQuery({ ...meQuery, staleTime: 0 });
}

/**
 * What this phone keeps for the space it was in: the query cache (and its persisted copy) and the drafts typed
 * for it. Used when the person leaves the space, and by every way of ending a session.
 */
export async function clearSpaceData(): Promise<void> {
  await clearQueryCache();
  clearAllGoalDrafts();
  clearAllTripDrafts();
  clearAllShoppingDrafts();
  failedAdds.clearAll();
  clearNoteDrafts();
}

/** The session is over (signed out, or the account deleted): forget everything this phone held for the person. */
export async function endLocalSession(qc: QueryClient): Promise<void> {
  await clearSpaceData();
  qc.setQueryData(meKey, null);
  carry.clearAll();
  // Phase 5: closeRealtime();
}

/**
 * Sign out on this device (§9): end the session, clear the query cache, remove the persisted IndexedDB cache and
 * close the socket (Phase 5). Clears what was carried between auth screens, and the drafts typed on this phone
 * (they belong to this person, goals.html: cleared on logout).
 */
export async function signOut(qc: QueryClient): Promise<void> {
  await api("/api/auth/sign-out", { method: "POST", body: {} });
  await endLocalSession(qc);
}

/** After leaving the space: the same account with no space, so the app routes it to the setup flow. */
export async function afterLeavingSpace(qc: QueryClient, me: MeResponse): Promise<void> {
  await clearSpaceData();
  qc.setQueryData(meKey, { ...me, space: null } satisfies MeResponse);
}
