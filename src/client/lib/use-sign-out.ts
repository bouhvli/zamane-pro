import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { say } from "./announce.ts";
import { useOnline } from "./online.ts";
import { signOut } from "./session.ts";

export const SIGN_OUT_OFFLINE = "Signing out needs a connection.";

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
      } finally {
        busy.current = false;
      }
      await navigate({ to: "/sign-in", replace: true, state: { notice: "signed-out" } });
    },
  };
}
