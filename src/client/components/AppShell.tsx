import { Link, useLocation } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";
import logoDark from "../assets/brand/zamane-logo-dark.svg";
import logo from "../assets/brand/zamane-logo.svg";
import { useChrome } from "../lib/nav.ts";
import { initial } from "./Seat.tsx";

/**
 * The app frame with the nav bar, ported from .ux-forge/nav-bar/nav-bar.html ("the ز dot").
 * Phones: a fixed bottom tab bar of five equal columns, icon over label. From 48rem: a sticky top bar with the
 * lockup (a link to Home) and the same items, Profile pushed to the far end. The current destination gets
 * aria-current="page", the majorelle colour, a heavier stroke and the ز dot on the bar's hairline. Tapping the tab
 * you're already on scrolls back to the top. Each page focuses its own h1 on an in-app arrival (useArrival), once
 * its code has loaded.
 */
type Dest = "/" | "/goals" | "/trips" | "/shopping" | "/profile";

/** Lucide icons as drawn in the prototype (stroke width comes from the CSS: 1.75, or 2.25 when current). */
const ICONS: Record<Exclude<Dest, "/profile">, ReactNode> = {
  "/": (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  "/goals": (
    <>
      <path d="M12 13V2l8 4-8 4" />
      <path d="M20.561 10.222a9 9 0 1 1-12.55-5.29" />
      <path d="M8.002 9.997a5 5 0 1 0 8.9 2.02" />
    </>
  ),
  "/trips": (
    <>
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </>
  ),
  "/shopping": (
    <>
      <path d="m15 11-1 9" />
      <path d="m19 11-4-7" />
      <path d="M2 11h20" />
      <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" />
      <path d="M4.5 15.5h15" />
      <path d="m5 11 4-7" />
      <path d="m9 11 1 9" />
    </>
  ),
};

const ITEMS: { to: Dest; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/goals", label: "Goals" },
  { to: "/trips", label: "Trips" },
  { to: "/shopping", label: "Shopping" },
  { to: "/profile", label: "Profile" },
];

/** Which destination a path belongs to: /goals/123 is still Goals. */
function destOf(pathname: string): Dest | null {
  if (pathname === "/") return "/";
  const d = ITEMS.find((i) => i.to !== "/" && (pathname === i.to || pathname.startsWith(`${i.to}/`)));
  return d?.to ?? null;
}

function scrollTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function AppShell({ me, children }: { me: { displayName: string; slot: "a" | "b" }; children: ReactNode }) {
  const { pathname } = useLocation();
  const current = destOf(pathname);
  // Create and edit a goal or a trip are task pages: no bottom nav on phones (goals.html, decision (a)).
  const task = /^\/(goals|trips)\/(new|[^/]+\/edit)\/?$/.test(pathname);
  useChrome(task ? "task" : "app", (current ?? pathname).replace(/^\//, "") || "home");

  // Tapping the tab you're already on (at its top level) scrolls back to the top (iOS / Android convention).
  const onTab = (to: Dest) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === to) {
      e.preventDefault();
      scrollTop();
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="wrap bar">
          <Link className="brand" to="/" onClick={onTab("/")}>
            <img className="logo-light" src={logo} alt="Zamane" width={125} height={36} />
            <img className="logo-dark" src={logoDark} alt="Zamane" width={125} height={36} />
          </Link>
          <nav className="nav" aria-label="Main">
            <ul className="nav-list">
              {ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    className="nav-link"
                    to={item.to}
                    aria-current={current === item.to ? "page" : undefined}
                    activeOptions={{ exact: item.to === "/" }}
                    onClick={onTab(item.to)}
                  >
                    {item.to === "/profile" ? (
                      <span className={`zm-av zm-av-${me.slot} zm-av-sm`} aria-hidden="true">
                        {initial(me.displayName)}
                      </span>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {ICONS[item.to]}
                      </svg>
                    )}
                    <span className="nav-label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
