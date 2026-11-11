/// <reference lib="webworker" />
/**
 * The service worker (§9), injectManifest mode:
 * - precaches the app shell;
 * - navigations fall back to index.html, except /api/*;
 * - Cloudinary images: StaleWhileRevalidate (200 entries, 30 days);
 * - /api/* is never cached here: TanStack Query's persisted cache owns data;
 * - no silent skipWaiting: the page asks first (SKIP_WAITING).
 */
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/api\//] }));

registerRoute(
  ({ url }) => url.origin === "https://res.cloudinary.com" && /^\/[^/]+\/image\//.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: "cloudinary-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data && (event.data as { type?: string }).type === "SKIP_WAITING") void self.skipWaiting();
});
