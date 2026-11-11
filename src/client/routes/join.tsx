import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseInviteCode } from "../../shared/invite-code.ts";
import { AuthShell } from "../components/AuthShell.tsx";
import { Splash } from "../components/Splash.tsx";
import { carry } from "../lib/carry.ts";
import { meQuery } from "../lib/session.ts";

/**
 * The invite link, /join#code=K7QM-4XPA (setup.js "join"). The fragment keeps the code out of server logs. The
 * code is kept on this device and stripped from the URL; then: signed out → Create account (with the code),
 * signed in without a space → Join (prefilled), already in a space → Home (the code is dropped).
 * A malformed code is ignored: there's no error on a link the person didn't write.
 */
export const Route = createFileRoute("/join")({
  beforeLoad: async ({ context }) => {
    const raw = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("code");
    const code = parseInviteCode(raw);
    if (code.ok) carry.set("code", code.display);
    history.replaceState(history.state, "", window.location.pathname); // strip the code
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/create-account", replace: true });
    if (!me.space) throw redirect({ to: "/setup/join", replace: true });
    carry.clear("code");
    throw redirect({ to: "/", replace: true });
  },
  component: () => (
    <AuthShell route="join" header={false}>
      <Splash label="Opening your invite" status="Opening your invite" />
    </AuthShell>
  ),
});
