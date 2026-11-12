// The build-time constants of src/worker/index.ts, for the API tests. Vitest 4 no longer substitutes a project's
// `define` in server code, so they are plain globals here.
Object.assign(globalThis, { __E2E__: false, __APP_VERSION__: "test" });
