import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SIGN_OUT_OFFLINE } from "../lib/use-sign-out.ts";
import { Icon } from "./Icon.tsx";

/** "‹ Back" in the setup header (Start, Join): its accessible name contains the visible "Back". */
export function BackLink({
  to,
  label,
  search,
}: {
  to: "/setup" | "/";
  label: string;
  search?: Record<string, unknown>;
}) {
  return (
    <Link className="link-btn back" to={to} search={search as never} aria-label={label}>
      <Icon name="chevron-left" />
      <span>Back</span>
    </Link>
  );
}

/** "Signed up as {email}. Not right? Sign out and create your account again." (the email shown back). */
export function SignedUpAs({ email, onSignOut, offline }: { email: string; onSignOut: () => void; offline: boolean }) {
  return (
    <p className="signed-up">
      Signed up as{" "}
      <b>
        <span className="email-addr" dir="ltr">
          {email}
        </span>
      </b>
      . Not right?{" "}
      <button
        className="link-btn inline-btn js-signout"
        type="button"
        aria-disabled={offline || undefined}
        aria-describedby={offline ? "signout-reason" : undefined}
        onClick={onSignOut}
      >
        Sign out
      </button>{" "}
      and create your account again.
    </p>
  );
}

/** The offline notice slot used by the setup screens (#{id}-conn). */
export function ConnNotice({ id, offline, children }: { id: string; offline: boolean; children: ReactNode }) {
  return (
    <div id={`${id}-conn`}>
      {offline ? (
        <div className="notice page-notice" id={`${id}-offline`}>
          <Icon name="wifi-off" />
          <p id={`${id}-offline-msg`}>{children}</p>
        </div>
      ) : null}
    </div>
  );
}

export { SIGN_OUT_OFFLINE };
