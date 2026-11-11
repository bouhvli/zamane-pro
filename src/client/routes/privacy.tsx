// TEMP: awaiting design. The privacy page has no design or copy yet; this placeholder only keeps the
// "Read how we handle your data" link on Create account from going nowhere. Built from existing components.
import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, PageHead } from "../components/AuthShell.tsx";
import { setTitle } from "../lib/announce.ts";
import { focusHeading, useArrival } from "../lib/nav.ts";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  useArrival((first) => {
    setTitle("How we handle your data");
    if (!first) focusHeading();
  });
  return (
    <AuthShell route="privacy">
      <PageHead title="How we handle your data" className="has-lede" />
      <p className="lede">This page isn&apos;t written yet.</p>
      <div className="alt-links">
        <p>
          <Link className="link-btn" to="/create-account">
            Create your account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
