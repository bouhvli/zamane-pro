import { defineConfig, devices } from "@playwright/test";

/**
 * Two projects on one dev server (port 3000, started with E2E=1 so the test-only reset-link route exists):
 * - e2e: the app end to end against the real API (Node, via the Vite dev server) and the Neon dev/PR branch;
 * - visual: each prototype state (.ux-forge/auth, over file://) next to the matching React route (API mocked),
 *   at 390×844 and 360×780, light and dark, pixel-diffed into tests/visual/report/.
 */
export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E: "1" },
    stdout: "pipe",
  },
  projects: [
    { name: "e2e", testDir: "tests/e2e", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "visual", testDir: "tests/visual", timeout: 30 * 60_000, use: { browserName: "chromium" } },
  ],
});
