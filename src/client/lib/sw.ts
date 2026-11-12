import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * Service worker registration with registerType "prompt" (§9): a waiting worker means a new version was deployed.
 * Two places ask the person: the floating "New version available — Reload" bar (anywhere in the app), and the
 * Profile page's update row, which can also look for an update on request. Both post SKIP_WAITING and reload;
 * there is no silent skipWaiting. Production builds only.
 */
export type UpdateState = {
  /** A new version is installed and waiting for the person's go-ahead. */
  ready: boolean;
  /** "Check for updates" is running. */
  checking: boolean;
  /** What the last manual check found: nothing new, or it couldn't tell (offline). */
  result: "idle" | "latest" | "failed";
  /** False in dev and in browsers without service workers: there is nothing to update. */
  supported: boolean;
};

const supported = !import.meta.env.DEV && typeof navigator !== "undefined" && "serviceWorker" in navigator;
let state: UpdateState = { ready: false, checking: false, result: "idle", supported };
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let apply: ((reload?: boolean) => Promise<void>) | undefined;

function set(patch: Partial<UpdateState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function registerServiceWorker() {
  if (!supported) return;
  const update = registerSW({
    onNeedRefresh() {
      set({ ready: true, checking: false, result: "idle" });
      showUpdatePrompt();
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
      // A deploy while the app sits open: look again whenever the person comes back to it.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) void reg?.update().catch(() => {});
      });
    },
  });
  apply = update;
}

/** Install the waiting version and reload into it. */
export function applyUpdate() {
  void apply?.(true);
}

/** Looks for a newly deployed version. `ready` turns true (and the bar appears) when there is one. */
export async function checkForUpdate() {
  if (!registration || state.checking) return;
  set({ checking: true, result: "idle" });
  try {
    await registration.update();
    // The new worker installs after the script is fetched; wait for it (or for it to give up).
    const installing = registration.installing;
    if (installing) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" || installing.state === "redundant") done();
        });
        setTimeout(done, 15000);
      });
    }
    // onNeedRefresh (above) has normally fired by now when a version was waiting; this covers a missed event.
    if (registration.waiting) set({ checking: false, ready: true, result: "idle" });
    else set({ checking: false, result: state.ready ? "idle" : "latest" });
  } catch {
    set({ checking: false, result: "failed" });
  }
}

function showUpdatePrompt() {
  if (document.getElementById("sw-update")) return;
  const bar = document.createElement("div");
  bar.id = "sw-update";
  bar.className = "notice sw-update";
  bar.setAttribute("role", "status");
  const text = document.createElement("p");
  text.textContent = "New version available";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "link-btn";
  btn.textContent = "Reload";
  btn.addEventListener("click", applyUpdate);
  bar.append(text, btn);
  document.body.append(bar);
}
