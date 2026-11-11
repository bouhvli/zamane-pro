import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell.tsx";
import { appOnly } from "../lib/guards.ts";

/** The app: members only. Signed out → /sign-in?redirect=…; no space → /setup. Every page sits under the nav bar. */
export const Route = createFileRoute("/_app")({
  beforeLoad: appOnly,
  component: AppLayout,
});

function AppLayout() {
  const { me } = Route.useRouteContext();
  return (
    <AppShell me={{ displayName: me.user.displayName, slot: me.space.slot }}>
      <Outlet />
    </AppShell>
  );
}
