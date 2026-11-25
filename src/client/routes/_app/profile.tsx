import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import type { MySpace } from "../../../shared/schemas/spaces.ts";
import { AboutCard } from "../../components/profile/AboutCard.tsx";
import { AppearanceCard } from "../../components/profile/AppearanceCard.tsx";
import { CoupleCard } from "../../components/profile/CoupleCard.tsx";
import { DataCard } from "../../components/profile/DataCard.tsx";
import { SecurityCard } from "../../components/profile/SecurityCard.tsx";
import { SettingsIndex } from "../../components/profile/SettingsIndex.tsx";
import { spaceKey } from "../../components/profile/space.ts";
import { YouCard } from "../../components/profile/YouCard.tsx";
import { ZelligeDefs } from "../../components/profile/Zellige.tsx";
import { api } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { focusHeading, useArrival } from "../../lib/nav.ts";
import { meKey, meQuery } from "../../lib/session.ts";

/** `?email=updated` comes back from the confirmation link of a change of email; `error` is Better Auth's. */
export const Route = createFileRoute("/_app/profile")({
  component: Profile,
  validateSearch: (s: Record<string, unknown>): { email?: "updated"; error?: string } => ({
    email: s.email === "updated" ? "updated" : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
});

/**
 * Profile and Settings. The couple card first (.ux-forge/profile, direction B "Set tiles": who is in the space, its
 * name, and the invite code while the partner hasn't joined), then the settings (.ux-forge/settings, "Index + rows"):
 * You, Appearance, Security, Your data, About, each a section of rows, and Sign out last. From 48rem a sticky index
 * sits beside the sections.
 */
function Profile() {
  useArrival((first) => {
    setTitle("Profile");
    if (!first) focusHeading();
  });
  const { me: routeMe } = Route.useRouteContext();
  const search = Route.useSearch();
  const qc = useQueryClient();
  // The session query is the live copy (a changed email shows here); the route's copy is what the guard saw.
  const meQ = useQuery(meQuery);
  const me = meQ.data?.space ? meQ.data : routeMe;
  // Always fresh on open: until realtime (Phase 5), nothing else tells this page that the partner joined.
  const space = useQuery({
    queryKey: spaceKey,
    queryFn: () => api<{ space: MySpace }>("/api/spaces/mine"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const emailChanged = search.email === "updated" && !search.error ? "updated" : search.error ? "failed" : null;
  useEffect(() => {
    if (emailChanged === "updated") {
      void qc.invalidateQueries({ queryKey: meKey });
      say("Your email address was changed.");
    } else if (emailChanged === "failed") say("That confirmation link doesn't work any more.");
  }, [emailChanged, qc]);

  return (
    <div className="pf">
      <ZelligeDefs />
      <h1 className="title-lg">Profile</h1>
      <CoupleCard space={space} />
      <div className="pf-settings">
        <SettingsIndex />
        <div className="pf-sections">
          <YouCard displayName={me.user.displayName} email={me.user.email} emailChanged={emailChanged} />
          <AppearanceCard />
          <SecurityCard />
          <DataCard me={me} space={space.data?.space} />
          <AboutCard />
        </div>
      </div>
    </div>
  );
}
