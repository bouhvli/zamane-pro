import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { say } from "../../lib/announce.ts";
import { useOnline } from "../../lib/online.ts";
import { applyUpdate, checkForUpdate, useUpdateState } from "../../lib/sw.ts";
import { useSignOut } from "../../lib/use-sign-out.ts";
import { Button } from "../Button.tsx";
import { Loader } from "../Loader.tsx";
import { CardHead, TileStar } from "./Zellige.tsx";

/**
 * The update row: "Check for updates" asks the service worker for a newly deployed version; when one is waiting (found
 * here or announced by the "New version available" bar) the button becomes "Update now", which installs it and reloads.
 * Hidden where there is no service worker (the dev server).
 */
function UpdateRow() {
  const u = useUpdateState();
  const offline = !useOnline();
  useEffect(() => {
    if (u.ready) say("A new version is ready to install.");
    else if (u.result === "latest") say("You're on the latest version.");
    else if (u.result === "failed") say("Couldn't check for updates.");
  }, [u.ready, u.result]);
  if (!u.supported) return null;

  const status = u.ready
    ? "A new version is ready. Updating reloads the app."
    : u.result === "latest"
      ? "You're on the latest version."
      : u.result === "failed"
        ? "Couldn't check. Try again when you're online."
        : offline
          ? "Checking needs a connection."
          : null;

  return (
    <div className="pf-upd">
      <button
        type="button"
        className={`pf-zl-btn${u.ready ? " is-ready" : ""}`}
        id="check-update"
        aria-disabled={u.checking || (!u.ready && offline) || undefined}
        aria-describedby={status ? "pf-upd-status" : undefined}
        data-busy={u.checking || undefined}
        onClick={() => {
          if (u.checking) return;
          if (u.ready) applyUpdate();
          else if (!offline) void checkForUpdate();
        }}
      >
        <span className="pf-zl-tile zl" aria-hidden="true">
          <TileStar />
        </span>
        <span className="pf-zl-label">
          {u.checking ? <Loader label="Checking for updates" /> : u.ready ? "Update now" : "Check for updates"}
        </span>
      </button>
      {status && (
        <p className="muted" id="pf-upd-status">
          {status}
        </p>
      )}
    </div>
  );
}

export function AboutCard() {
  const { signOut, offline } = useSignOut();
  return (
    <section className="pf-card" aria-labelledby="pf-about-h">
      <CardHead id="pf-about-h">About and sign out</CardHead>
      <ul className="pf-about">
        <li>
          <Link to="/privacy" className="pf-link">
            Privacy
          </Link>
        </li>
        <li className="muted">Version {__APP_VERSION__}</li>
      </ul>
      <UpdateRow />
      <div className="pf-out">
        <p className="muted">Signs you out on this device.</p>
        <Button variant="secondary" id="sign-out" disabledReason={offline ? "signout-reason" : null} onClick={signOut}>
          Sign out
        </Button>
        {offline && (
          <p className="help" id="signout-reason">
            Signing out needs a connection.
          </p>
        )}
      </div>
    </section>
  );
}
