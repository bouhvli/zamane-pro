import { registerSW } from "virtual:pwa-register";

/**
 * Service worker registration with registerType "prompt" (§9): a waiting worker shows "New version available —
 * Reload", which posts SKIP_WAITING and reloads. There's no silent skipWaiting. Production builds only.
 */
export function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      showUpdatePrompt(() => void update(true));
    },
  });
}

function showUpdatePrompt(reload: () => void) {
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
  btn.addEventListener("click", reload);
  bar.append(text, btn);
  document.body.append(bar);
}
