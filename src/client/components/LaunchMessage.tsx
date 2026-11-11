import { useEffect, useRef, useState } from "react";
import { say, setTitle } from "../lib/announce.ts";
import { useOnline } from "../lib/online.ts";
import { AuthShell, PageHead } from "./AuthShell.tsx";
import { Button } from "./Button.tsx";

/**
 * The launch screen when GET /api/me can't be answered and nothing is cached (prototype #/launch "offline" and
 * "error"). Try again re-runs the launch; coming back online announces it and retries by itself.
 */
const COPY = {
  offline: {
    title: "You're offline",
    body: "Zamane needs a connection to open on this phone for the first time.",
  },
  error: {
    title: "Zamane didn't open",
    body: "Something went wrong on our side. Try again in a moment.",
  },
};

export function LaunchMessage({ kind, retry }: { kind: "offline" | "error"; retry: () => Promise<boolean> }) {
  const [pending, setPending] = useState(false);
  const online = useOnline();
  const wasOnline = useRef(online);
  const btn = useRef<HTMLButtonElement>(null);
  const c = COPY[kind];

  useEffect(() => setTitle(c.title), [c.title]);

  async function run() {
    if (pending) return;
    setPending(true);
    const ok = await retry();
    if (!ok) setPending(false);
  }

  useEffect(() => {
    if (kind === "offline" && online && !wasOnline.current) {
      say("Back online. Opening Zamane.");
      btn.current?.focus();
      void run();
    }
    wasOnline.current = online;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the connection only
  }, [online]);

  return (
    <>
      <AuthShell route="launch">
        <div className="launch-msg">
          <PageHead title={c.title} />
          <p className="lede">{c.body}</p>
          <Button ref={btn} variant="primary" block id="launch-retry" pending={pending && "Trying again"} onClick={run}>
            Try again
          </Button>
        </div>
      </AuthShell>
      <div id="live" className="vh" role="status" aria-live="polite" />
    </>
  );
}
