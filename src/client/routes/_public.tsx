import { createFileRoute, Outlet } from "@tanstack/react-router";
import { publicOnly } from "../lib/guards.ts";

/** Sign in, Create account, Forgot password: signed-in visitors are sent on (setup or Home). */
export const Route = createFileRoute("/_public")({
  beforeLoad: publicOnly,
  component: Outlet,
});
