import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

/** TanStack Query owns data; the service worker never caches /api (§9). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 7 * 24 * 60 * 60 * 1000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

const PERSIST_KEY = "zamane.query-cache";

const persister = createAsyncStoragePersister({
  key: PERSIST_KEY,
  // Queued writes (an add, its Undo) reach IndexedDB within a quarter-second, so a reload rarely loses one.
  throttleTime: 250,
  storage: {
    getItem: (k) => get<string>(k).then((v) => v ?? null),
    setItem: (k, v: string) => set(k, v),
    removeItem: (k) => del(k),
  },
});

/**
 * Restores the persisted cache (IndexedDB, 7 days) before the first render, then keeps it in sync.
 * The buster is the app version; a different user's cache is never kept, because sign-in and sign-out clear it.
 */
export async function restoreQueryCache(): Promise<void> {
  try {
    const [, restored] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      buster: __APP_VERSION__,
    });
    await restored;
    // What was saved on this phone shows at once, but it is never treated as fresh: every screen refetches on
    // mount. Otherwise a write that settled just before a reload could leave an old total for the staleTime.
    void queryClient.invalidateQueries({ refetchType: "none" });
    await queryClient.resumePausedMutations();
  } catch {
    /* private window or IndexedDB unavailable: run without persistence */
  }
}

/** Logout (§9): clear the in-memory cache and remove the persisted one. */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  try {
    await persister.removeClient();
    await del(PERSIST_KEY);
  } catch {
    /* nothing persisted */
  }
}
