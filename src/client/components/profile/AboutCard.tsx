import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { say } from "../../lib/announce.ts";
import { useOnline } from "../../lib/online.ts";
import { applyUpdate, checkForUpdate, useUpdateState } from "../../lib/sw.ts";
import { useSignOut } from "../../lib/use-sign-out.ts";
import { Button } from "../Button.tsx";
import { Loader } from "../Loader.tsx";
import { Section, TileStar } from "./Zellige.tsx";

/**
 * The version row. "Check for updates" asks the service worker for a newly deployed version; when one is waiting
 * (found here or announced by the "New version available" bar) the button becomes "Update now", which installs it
 * and reloads. Where there is no service worker (the dev server) the row shows the version alone.
 */
function VersionRow() {
  const u = useUpdateState();
  const offline = !useOnline();
  useEffect(() => {
    if (!u.supported) return;
    if (u.ready) say("A new version is ready to install.");
    else if (u.result === "latest") say("You're on the latest version.");
    else if (u.result === "failed") say("Couldn't check for updates.");
  }, [u.supported, u.ready, u.result]);

  const status = !u.supported
    ? null
    : u.ready
      ? "A new version is ready. Updating reloads the app."
      : u.result === "latest"
        ? "You're on the latest version."
        : u.result === "failed"
          ? "Couldn't check. Try again when you're online."
          : offline
            ? "Checking needs a connection."
            : null;

  return (
    <div className="pf-item pf-item-ver">
      <div className="pf-item-text">
        <h3 className="pf-h3">Version</h3>
        <p className="pf-item-val num">{__APP_VERSION__}</p>
      </div>
      {u.supported && (
        <button
          type="button"
          className={`pf-zl-btn pf-item-act${u.ready ? " is-ready" : ""}`}
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
      )}
      {status && (
        <p className="pf-status" id="pf-upd-status">
          {status}
        </p>
      )}
    </div>
  );
}

/** About: the version and the privacy page; then Sign out on its own, the last thing on the page. */
export function AboutCard() {
  const { signOut, offline } = useSignOut();
  return (
    <Section id="pf-about" title="About">
      <div className="pf-list">
        <VersionRow />
        <div className="pf-item">
          <Link to="/privacy" className="pf-link">
            Privacy
          </Link>
        </div>
      </div>
      <div className="pf-out">
        <Button variant="secondary" id="sign-out" disabledReason={offline ? "signout-reason" : null} onClick={signOut}>
          Sign out
        </Button>
        <p className="help" id={offline ? "signout-reason" : undefined}>
          {offline ? "Signing out needs a connection." : "Signs you out on this device."}
        </p>
      </div>
    </Section>
  );
}
