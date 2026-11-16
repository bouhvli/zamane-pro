import { useSyncExternalStore } from "react";
import classicDark from "../assets/brand/zamane-logo-dark.svg";
import classic from "../assets/brand/zamane-logo.svg";
import tilesDark from "../assets/brand/zamane-tiles-logo-dark.svg";
import tiles from "../assets/brand/zamane-tiles-logo.svg";

/**
 * The logo, chosen per device like the theme (D23): "classic" (the calligraphy lockup and the majorelle app icon)
 * or "tiles" (two interlaced star tiles, from assets/New logo). It changes the lockup in the app, the favicon, and the
 * web app manifest the browser installs from, so the home-screen icon follows. public/theme-init.js applies it
 * before first paint with the same key and file paths; keep the two in step.
 *
 * Both manifests share one `id`, so the browser treats a switch as the same app with new icons: Chrome (Android and
 * desktop) picks the new icon up on its next update check of the installed app. iOS keeps the icon it was added
 * with until the app is removed and added to the home screen again.
 */
export type Logo = "classic" | "tiles";
const KEY = "zamane.logo";

interface LogoFiles {
  lockup: string;
  lockupDark: string;
  /** The app icon as installed (full-bleed square), also the SVG favicon. */
  icon: string;
  ico: string;
  appleTouch: string;
  manifest: string;
}

export const LOGOS: Record<Logo, LogoFiles> = {
  classic: {
    lockup: classic,
    lockupDark: classicDark,
    icon: "/favicon.svg",
    ico: "/favicon.ico",
    appleTouch: "/apple-touch-icon-180x180.png",
    manifest: "/manifest.webmanifest",
  },
  tiles: {
    lockup: tiles,
    lockupDark: tilesDark,
    icon: "/icons/tiles/favicon.svg",
    ico: "/icons/tiles/favicon.ico",
    appleTouch: "/icons/tiles/apple-touch-icon-180x180.png",
    manifest: "/manifest-tiles.webmanifest",
  },
};

const read = (): Logo => {
  try {
    return localStorage.getItem(KEY) === "tiles" ? "tiles" : "classic";
  } catch {
    return "classic";
  }
};

let current: Logo = read();
const listeners = new Set<() => void>();

/** Points the page's icon and manifest links at the logo's files, and marks <html> for the static splash. */
function apply(logo: Logo) {
  const f = LOGOS[logo];
  const root = document.documentElement;
  if (logo === "classic") root.removeAttribute("data-logo");
  else root.setAttribute("data-logo", logo);
  const set = (selector: string, href: string) => {
    const el = document.head.querySelector<HTMLLinkElement>(selector);
    if (el && el.getAttribute("href") !== href) el.setAttribute("href", href);
  };
  set('link[rel="icon"][type="image/svg+xml"]', f.icon);
  set('link[rel="icon"]:not([type])', f.ico);
  set('link[rel="apple-touch-icon"]', f.appleTouch);
  set('link[rel="manifest"]', f.manifest);
}

function update(logo: Logo) {
  if (logo === current) return;
  current = logo;
  apply(logo);
  listeners.forEach((l) => l());
}

// Another tab of the app changed it: follow along.
window.addEventListener("storage", (e) => {
  if (e.key === KEY || e.key === null) update(read());
});

export function getLogo(): Logo {
  return current;
}

export function setLogo(logo: Logo) {
  try {
    if (logo === "classic") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, logo);
  } catch {
    /* applied for this visit only */
  }
  update(logo);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useLogo(): Logo {
  return useSyncExternalStore(subscribe, getLogo);
}

/** The installed app's icon can only change through the browser: iOS never updates it once added. */
export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}
