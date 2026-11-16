import type { ReactNode } from "react";
import { LOGOS, useLogo } from "../lib/logo.ts";
import { useChrome } from "../lib/nav.ts";
import { TileWall } from "./AuthTiles.tsx";
import { Icon } from "./Icon.tsx";

/** The intrinsic size of each lockup at 36px tall (the CSS sets the height; width follows). */
export const LOCKUP_SIZE = { classic: { width: 125, height: 36 }, tiles: { width: 143, height: 36 } } as const;

/**
 * The lockup of the logo chosen on this device (lib/logo.ts): light and dark files, switched by the theme.
 * Not a link on these screens; the app bar wraps it in one.
 */
export function Lockup({ decorative, className = "lockup" }: { decorative?: boolean; className?: string }) {
  const logo = useLogo();
  const f = LOGOS[logo];
  const alt = decorative ? "" : "Zamane";
  return (
    <>
      <img className={`${className} logo-light`} src={f.lockup} alt={alt} {...LOCKUP_SIZE[logo]} />
      <img className={`${className} logo-dark`} src={f.lockupDark} alt={alt} {...LOCKUP_SIZE[logo]} />
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
 *
 * `tiles` puts the screen in the zellige frame (auth-zellige.css): a tile wall above the form on phones and beside
 * it from 64rem, with the lockup standing in its doorway (so the header is not drawn). "pair" fires both glazes;
 * "solo" leaves the second unfired (an account with no partner yet).
 */
export function AuthShell({
  route,
  header,
  tiles,
  children,
}: {
  route: string;
  header?: HeaderOptions | false;
  tiles?: "pair" | "solo";
  children: ReactNode;
}) {
  useChrome("auth", route);
  const page = (
    <>
      {header !== false && !tiles && <AuthHeader {...(header ?? {})} />}
      <main id="main" className="auth-wrap" tabIndex={-1}>
        <div key={route} className={`view view--${route.replace(/\//g, "-")}`}>
          {children}
        </div>
      </main>
    </>
  );
  if (!tiles) return page;
  return (
    <div className="az">
      <TileWall solo={tiles === "solo"} />
      <div className="az-col">{page}</div>
    </div>
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
