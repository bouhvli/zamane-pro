import { createFileRoute, Outlet } from "@tanstack/react-router";
import { setupOnly } from "../lib/guards.ts";

/** Space setup: signed in, without a space (or a solo member switching, D33). */
export const Route = createFileRoute("/_setup")({
  beforeLoad: setupOnly,
  component: Outlet,
});
