/**
 * The database guard (§10). Runs before db:seed, before db:migrate when a pending migration is destructive, and
 * before db:studio. It refuses unless:
 *   - APP_ENV (default "development" for local scripts) is "development", and
 *   - the Neon branch behind DATABASE_URL is not "main", not the project default and not protected.
 * The branch is looked up through the Neon API from the endpoint id in the host. Without NEON_API_KEY and
 * NEON_PROJECT_ID it can't look it up, so it refuses and says so. It never prints the URL or a key.
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export class GuardRefusal extends Error {
  override name = "GuardRefusal";
}

function loadEnv() {
  if (existsSync(".env")) process.loadEnvFile(".env");
}

export function endpointId(databaseUrl: string): string {
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new GuardRefusal("DATABASE_URL isn't a valid URL.");
  }
  const first = host.split(".")[0] ?? "";
  if (!/^ep-[a-z0-9-]+$/.test(first)) throw new GuardRefusal("DATABASE_URL doesn't point at a Neon endpoint.");
  return first.replace(/-pooler$/, "");
}

async function neonApi<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`https://console.neon.tech/api/v2${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new GuardRefusal(`The Neon API answered ${res.status} for ${path.replace(/\/[^/]+$/, "/…")}.`);
  return (await res.json()) as T;
}

/** Resolves the branch and refuses when it isn't safe. Returns the branch name for the log. */
export async function assertSafeBranch(): Promise<string> {
  loadEnv();
  const appEnv = process.env.APP_ENV || "development";
  if (appEnv !== "development") throw new GuardRefusal(`APP_ENV is "${appEnv}", not "development".`);
  const url = process.env.DATABASE_URL;
  if (!url) throw new GuardRefusal("DATABASE_URL is not set.");
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  if (!key || !project) {
    throw new GuardRefusal(
      "NEON_API_KEY and NEON_PROJECT_ID are needed to check which branch DATABASE_URL points at. " +
        "Add them to .env (Neon console → Account settings → API keys; the project id is in Settings).",
    );
  }
  const ep = endpointId(url);
  const { endpoint } = await neonApi<{ endpoint: { branch_id: string } }>(`/projects/${project}/endpoints/${ep}`, key);
  const { branch } = await neonApi<{ branch: { name: string; default: boolean; protected: boolean } }>(
    `/projects/${project}/branches/${endpoint.branch_id}`,
    key,
  );
  if (branch.name === "main") throw new GuardRefusal('DATABASE_URL points at the "main" branch.');
  if (branch.default) throw new GuardRefusal(`DATABASE_URL points at the project's default branch ("${branch.name}").`);
  if (branch.protected) throw new GuardRefusal(`DATABASE_URL points at a protected branch ("${branch.name}").`);
  return branch.name;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const name = await assertSafeBranch();
    console.log(`db guard: OK, branch "${name}".`);
  } catch (e) {
    console.error(`db guard: refused. ${e instanceof Error ? e.message : "unknown error"}`);
    process.exit(1);
  }
}
