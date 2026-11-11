import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { setTitle } from "../lib/announce.ts";
import { useChrome } from "../lib/nav.ts";

/**
 * An area that's built in a later phase: only its name. The link to Profile is a TEMP way around until the nav bar
 * (designed in .ux-forge/nav-bar) is built.
 */
export function Placeholder({ name, route }: { name: string; route: string }) {
  useChrome("app", route);
  useEffect(() => setTitle(name), [name]);
  return (
    <main id="main" className="wrap placeholder" tabIndex={-1}>
      <h1 className="title-lg">{name}</h1>
      {route !== "profile" && (
        <p className="placeholder-links">
          <Link className="link-btn" to="/profile">
            Profile
          </Link>
        </p>
      )}
    </main>
  );
}
