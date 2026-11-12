import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { say } from "./announce.ts";
import { useOnline } from "./online.ts";
import { signOut } from "./session.ts";

export const SIGN_OUT_OFFLINE = "Signing out needs a connection.";

/** Drafts typed in the trip dialogs and the trip form stay on this phone, so they go with the session (D55). */
function clearTripDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("zamane.trips.draft")) localStorage.removeItem(k);
    }
  } catch {
    /* nothing to clear */
  }
}

/** The same for the shopping item form's drafts (zamane.shopping.draft). */
function clearShoppingDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("zamane.shopping.draft")) localStorage.removeItem(k);
    }
  } catch {
    /* nothing to clear */
  }
}

/**
 * Sign out on this device, then Sign in with the "You're signed out." notice. Offline, the control stays
 * focusable and only says why (prototype setup.js guardSignOut).
 */
export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const online = useOnline();
  const busy = useRef(false);
  return {
    offline: !online,
    signOut: async () => {
      if (!online) {
        say(SIGN_OUT_OFFLINE);
        return;
      }
      if (busy.current) return;
      busy.current = true;
      try {
        await signOut(qc);
        clearTripDrafts();
        clearShoppingDrafts();
      } finally {
        busy.current = false;
      }
      await navigate({ to: "/sign-in", replace: true, state: { notice: "signed-out" } });
    },
  };
}
