import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

function Root() {
  return (
    <>
      <Outlet />
      {/* The one polite live region for status messages (lib/announce.ts). */}
      <div id="live" className="vh" role="status" aria-live="polite" />
    </>
  );
}
