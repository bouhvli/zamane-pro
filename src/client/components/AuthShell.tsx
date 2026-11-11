import type { ReactNode } from "react";
import logoDark from "../assets/brand/zamane-logo-dark.svg";
import logo from "../assets/brand/zamane-logo.svg";
import { useChrome } from "../lib/nav.ts";
import { Icon } from "./Icon.tsx";

/** The lockup: light and dark files, switched by the theme. Not a link on these screens. */
export function Lockup({ decorative }: { decorative?: boolean }) {
  const alt = decorative ? "" : "Zamane";
  return (
    <>
      <img className="lockup logo-light" src={logo} alt={alt} width={125} height={36} />
      <img className="lockup logo-dark" src={logoDark} alt={alt} width={125} height={36} />
    </>
  );
}

export interface HeaderOptions {
  /** Setup screens: "Signed in as {firstName}" and Sign out. */
  account?: { firstName: string; onSignOut: () => void; offline?: boolean } | null;
  /** Start and Join: "‹ Back" instead of the lockup. */
  back?: { label: string; onClick?: () => void; href?: string; render?: ReactNode } | null;
}

/** Port of A.header: the lockup leads signed-out screens; setup adds the account line. */
export function AuthHeader({ account, back }: HeaderOptions) {
  const setup = !!(account || back);
  return (
    <div className="auth-wrap auth-head-wrap">
      <header id="auth-head" className={`auth-head ${setup ? "is-setup" : "is-hero"}`}>
        <div className="auth-head-row">
          {back ? (
            back.render
          ) : (
            <span className="brand">
              <Lockup />
            </span>
          )}
          {account && (
            <p className="account">
              <span className="account-name">
                Signed in as <span className="nowrap">{account.firstName}</span>
              </span>
              <button
                className="link-btn"
                type="button"
                id="sign-out"
                aria-disabled={account.offline || undefined}
                aria-describedby={account.offline ? "signout-reason" : undefined}
                onClick={account.onSignOut}
              >
                Sign out
              </button>
            </p>
          )}
        </div>
        {account?.offline && (
          <p id="signout-reason" className="signout-reason">
            Signing out needs a connection.
          </p>
        )}
      </header>
    </div>
  );
}

export function BackIcon() {
  return <Icon name="chevron-left" />;
}

/**
 * The auth page frame (auth.html): header slot, then <main id="main"> holding the view. The view is keyed by the
 * path so the route fade (.view) replays on every screen.
 */
export function AuthShell({
  route,
  header,
  children,
}: {
  route: string;
  header?: HeaderOptions | false;
  children: ReactNode;
}) {
  useChrome("auth", route);
  return (
    <>
      {header !== false && <AuthHeader {...(header ?? {})} />}
      <main id="main" className="auth-wrap" tabIndex={-1}>
        <div key={route} className={`view view--${route.replace(/\//g, "-")}`}>
          {children}
        </div>
      </main>
    </>
  );
}

export function PageHead({ title, seats, className }: { title: ReactNode; seats?: ReactNode; className?: string }) {
  return (
    <div className={`page-head${className ? ` ${className}` : ""}`}>
      <h1 className="title-lg">{title}</h1>
      {seats}
    </div>
  );
}
