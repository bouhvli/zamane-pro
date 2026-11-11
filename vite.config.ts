import { getRequestListener } from "@hono/node-server";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, type Plugin, type PluginOption, type ViteDevServer } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/**
 * Local /api (D56): the dev server hands every /api/* request to the Hono app, loaded through Vite so server code
 * reloads on save. .env is read into process.env first (the server reads its configuration from there); values
 * already in the environment win. Nothing here is part of a build.
 */
function devApi(): Plugin {
  return {
    name: "zamane-dev-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      if (existsSync(".env")) {
        for (const [k, v] of Object.entries(parseEnv(readFileSync(".env", "utf8")))) process.env[k] ??= v;
      }
      process.env.APP_ENV ??= "development";
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/") && req.url !== "/api") return next();
        server
          .ssrLoadModule("/src/worker/index.ts")
          .then((mod) =>
            getRequestListener((mod.default as { fetch: (r: Request) => Promise<Response> }).fetch)(req, res),
          )
          .catch(next);
      });
    },
  };
}

/** D30: vite-plugin-pwa runs for the client (browser) build only, never for the server code Vite loads in dev. */
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
    build: { outDir: "dist/client" },
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: "src/client/routes",
        generatedRouteTree: "src/client/routeTree.gen.ts",
      }),
      react(),
      devApi(),
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
