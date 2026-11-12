import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { MySpace } from "../../../shared/schemas/spaces.ts";
import { AboutCard } from "../../components/profile/AboutCard.tsx";
import { AppearanceCard } from "../../components/profile/AppearanceCard.tsx";
import { CoupleCard } from "../../components/profile/CoupleCard.tsx";
import { NameCard } from "../../components/profile/NameCard.tsx";
import { SecurityCard } from "../../components/profile/SecurityCard.tsx";
import { spaceKey } from "../../components/profile/space.ts";
import { ZelligeDefs } from "../../components/profile/Zellige.tsx";
import { api } from "../../lib/api.ts";
import { setTitle } from "../../lib/announce.ts";
import { focusHeading, useArrival } from "../../lib/nav.ts";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

/**
 * Profile and Settings (.ux-forge/profile, direction B "Set tiles"): the couple card first (who is in the space and
 * the invite code), then You, Appearance, Security, About and sign out. 2x2 card grid from 48rem.
 */
function Profile() {
  useArrival((first) => {
    setTitle("Profile");
    if (!first) focusHeading();
  });
  const { me } = Route.useRouteContext();
  // Always fresh on open: until realtime (Phase 5), nothing else tells this page that the partner joined.
  const space = useQuery({
    queryKey: spaceKey,
    queryFn: () => api<{ space: MySpace }>("/api/spaces/mine"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <div className="pf">
      <ZelligeDefs />
      <h1 className="title-lg">Profile</h1>
      <CoupleCard space={space} />
      <div className="pf-grid">
        <NameCard displayName={me.user.displayName} />
        <AppearanceCard />
        <SecurityCard />
        <AboutCard />
      </div>
    </div>
  );
}
