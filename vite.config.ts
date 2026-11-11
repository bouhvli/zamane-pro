import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/**
 * D30: vite-plugin-pwa doesn't know Vite's Environment API, so every one of its plugins is limited to the client
 * environment. Otherwise it could emit service-worker files into the Worker build too.
 */
function clientOnly(plugins: PluginOption): Plugin[] {
  return (plugins as Plugin[]).flat().map((p) => ({
    ...p,
    applyToEnvironment: (env) => env.name === "client",
  }));
}

export default defineConfig(({ mode }) => {
  const production = mode === "production";
  // The test-only reset-link route exists only in a dev server started with E2E=1, never in a production build.
  const e2e = !production && process.env.E2E === "1";

  return {
    server: { port: 3000, strictPort: true },
    preview: { port: 3000, strictPort: true },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __E2E__: JSON.stringify(e2e),
    },
    environments: {
      client: { build: { outDir: "dist/client" } },
    },
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: "src/client/routes",
        generatedRouteTree: "src/client/routeTree.gen.ts",
      }),
      react(),
      cloudflare(),
      ...clientOnly(
        VitePWA({
          strategies: "injectManifest",
          srcDir: "src/client",
          filename: "sw.ts",
          registerType: "prompt",
          injectRegister: false,
          manifest: {
            name: "Zamane",
            short_name: "Zamane",
            display: "standalone",
            start_url: "/",
            scope: "/",
            theme_color: "#1d4e89",
            background_color: "#f8f3ea",
            icons: [
              { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
              { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
              { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          },
          injectManifest: {
            globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
          },
          devOptions: { enabled: false },
        }),
      ),
    ],
  };
});
