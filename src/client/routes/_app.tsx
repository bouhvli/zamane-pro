import { createFileRoute, Outlet } from "@tanstack/react-router";
import { appOnly } from "../lib/guards.ts";

/** The app: members only. Signed out → /sign-in?redirect=…; no space → /setup. */
export const Route = createFileRoute("/_app")({
  beforeLoad: appOnly,
  component: Outlet,
});
