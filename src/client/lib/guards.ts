import type { QueryClient } from "@tanstack/react-query";
import { redirect, type ParsedLocation } from "@tanstack/react-router";
import type { MeResponse } from "../../shared/schemas/spaces.ts";
import { meQuery, safeRedirect, setupTarget } from "./session.ts";

/**
 * Route guards (TanStack Router beforeLoad). The session comes from the cached /api/me query, which main.tsx
 * resolves before the first paint, so a guard never flashes the wrong screen.
 *
 * | class       | signed out                         | signed in, no space | signed in, with a space |
 * | public-only | render                             | → setup             | → Home                  |
 * | setup       | → /sign-in                         | render              | → Home (switch: render) |
 * | app         | → /sign-in?redirect=<path>         | → /setup            | render                  |
 */
type Ctx = { context: { queryClient: QueryClient }; location: ParsedLocation };

async function me(qc: QueryClient): Promise<MeResponse | null> {
  return qc.ensureQueryData(meQuery);
}

export async function publicOnly({ context }: Ctx) {
  const m = await me(context.queryClient);
  if (m?.space) throw redirect({ to: "/", replace: true });
  if (m) throw redirect({ to: setupTarget(), replace: true });
}

export async function setupOnly({ context, location }: Ctx) {
  const m = await me(context.queryClient);
  if (!m) throw redirect({ to: "/sign-in", replace: true });
  if (m.space) {
    // The switch: someone alone in the space they started may join their partner's instead (D33).
    const sw = location.pathname === "/setup/join" && (location.search as { switch?: unknown }).switch === true;
    if (!(sw && m.space.memberCount === 1)) throw redirect({ to: "/", replace: true });
  }
  return { me: m };
}

export async function appOnly({ context, location }: Ctx) {
  const m = await me(context.queryClient);
  if (!m) {
    const target = safeRedirect(location.href);
    throw redirect({ to: "/sign-in", search: target && target !== "/" ? { redirect: target } : {}, replace: true });
  }
  if (!m.space) throw redirect({ to: "/setup", replace: true });
  return { me: m as MeResponse & { space: NonNullable<MeResponse["space"]> } };
}
