import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { LaunchMessage } from "./components/LaunchMessage.tsx";
import { isApiError, isNetworkError, setUnauthenticatedHandler } from "./lib/api.ts";
import { navState } from "./lib/nav.ts";
import { registerHomeMutations } from "./lib/home.ts";
import { queryClient, restoreQueryCache } from "./lib/query.ts";
import { meKey, meQuery } from "./lib/session.ts";
import { registerServiceWorker } from "./lib/sw.ts";
import { routeTree } from "./routeTree.gen.ts";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/auth.css";
import "./styles/account.css";
import "./styles/setup.css";
import "./styles/nav.css";
import "./styles/home.css";
import "./styles/goals.css";
import "./styles/goals-detail.css";
import "./styles/goals-composer.css";
import "./styles/goals-form.css";
import "./styles/app.css";

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    /** A one-off notice for the screen being opened (never in the URL). */
    notice?: "signed-out" | "session-ended" | "reset-done" | "created" | "joined";
  }
}

// The focus rule's "first load": any navigation after the first one is an in-app arrival.
router.subscribe("onBeforeNavigate", (e) => {
  if (e.fromLocation && e.fromLocation.href !== e.toLocation.href) navState.first = false;
});

// Any 401 mid-session: the session was revoked (a reset on another device) or expired.
setUnauthenticatedHandler(() => {
  queryClient.setQueryData(meKey, null);
  const here = router.state.location.href;
  void router.navigate({
    to: "/sign-in",
    search: { redirect: here },
    state: { notice: "session-ended" },
    replace: true,
  });
});

// Keyboard up (prototype A8): keep the primary above the on-screen keyboard. --kb feeds scroll-padding-bottom.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () =>
    document.documentElement.style.setProperty(
      "--kb",
      `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
    );
  vv.addEventListener("resize", fit);
  fit();
}

// Offline-capable mutations get their mutationFn before the persisted cache (and its paused mutations) is restored.
registerHomeMutations(queryClient);

type Boot = "ready" | "offline" | "error";

/**
 * Decide before the first React paint (the static splash in index.html is on screen meanwhile): restore the
 * persisted cache, then GET /api/me. With a cached session the app opens from the cache when the network fails;
 * without one, the launch screen says what's true (offline, or the server failed). Only a 401 means signed out.
 */
async function boot(): Promise<Boot> {
  const status = document.getElementById("boot-status");
  const t = setTimeout(() => {
    if (status) status.textContent = "Loading Zamane";
  }, 1000);
  try {
    await restoreQueryCache();
    try {
      await queryClient.fetchQuery({ ...meQuery, staleTime: 0, retry: 0 });
      return "ready";
    } catch (e) {
      if (queryClient.getQueryData(meKey) !== undefined) return "ready"; // open from the cache
      return isNetworkError(e) || !navigator.onLine ? "offline" : isApiError(e) ? "error" : "error";
    }
  } finally {
    clearTimeout(t);
  }
}

function App({ initial }: { initial: Boot }) {
  const [state, setState] = useState<Boot>(initial);
  if (state !== "ready") {
    return (
      <LaunchMessage
        kind={state}
        retry={async () => {
          const next = await boot();
          setState(next);
          return next === "ready";
        }}
      />
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const initial = await boot();
if (initial === "ready") await router.load();
// React replaces the static splash in the same commit (flushSync), so the screen goes straight from the splash
// to the right route, with no empty frame and no flash of the wrong screen.
const root = createRoot(document.getElementById("root")!);
flushSync(() =>
  root.render(
    <StrictMode>
      <App initial={initial} />
    </StrictMode>,
  ),
);
registerServiceWorker();
