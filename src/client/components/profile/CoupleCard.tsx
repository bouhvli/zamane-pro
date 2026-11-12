import type { UseQueryResult } from "@tanstack/react-query";
import type { MySpace } from "../../../shared/schemas/spaces.ts";
import { Button } from "../Button.tsx";
import { Loader } from "../Loader.tsx";
import { PartnerAvatar } from "../PartnerAvatar.tsx";
import { InviteCode } from "./InviteCode.tsx";
import { SpaceSettings } from "./SpaceSettings.tsx";
import { TileStar } from "./Zellige.tsx";

type Slot = "a" | "b";

function Plate({ slot, name }: { slot: Slot; name: string }) {
  return (
    <li className={`pf-plate pf-plate-${slot}`}>
      <PartnerAvatar name={name} partner={slot} />
      <span className="pf-who">
        <span className="pf-name">{name}</span>
      </span>
    </li>
  );
}

function WaitingPlate() {
  return (
    <li className="pf-plate pf-plate-b pf-plate-wait">
      <span className="pf-empty" aria-hidden="true">
        <TileStar />
      </span>
      <span className="pf-who">
        <span className="pf-name">Waiting for your partner</span>
      </span>
    </li>
  );
}

/**
 * The couple card: a 104px field of star-and-cross tessellation (Sara's glaze left, Youssef's right, unglazed
 * until he joins), the two name plates over its lower edge, the space name (editable) with its currency and time
 * zone. Only a space whose partner has not joined shows the invite code; once there are two, the code is gone.
 */
export function CoupleCard({ space }: { space: UseQueryResult<{ space: MySpace }> }) {
  const data = space.data?.space;
  const members = data?.members ?? [];
  const a = members.find((m) => m.slot === "a");
  const b = members.find((m) => m.slot === "b");
  const solo = !!data && members.length < 2;
  return (
    <section className={`pf-card pf-couple${solo ? " is-solo" : ""}`} aria-labelledby="pf-space-h">
      <div className={`zl pf-field${solo ? " is-solo" : ""}`} aria-hidden="true" />
      {data && (
        <ul className="pf-plates">
          {a ? <Plate slot="a" name={a.displayName} /> : <li />}
          {b ? <Plate slot="b" name={b.displayName} /> : <WaitingPlate />}
        </ul>
      )}
      <div className="pf-body">
        <h2 className="title-lg pf-space" id="pf-space-h">
          {data ? data.name : "Your space"}
        </h2>
        {data ? (
          <>
            {solo && data.inviteCode && <InviteCode space={data} code={data.inviteCode} />}
            <SpaceSettings key={data.id} space={data} />
          </>
        ) : space.isError ? (
          <div className="pf-state">
            <p className="muted" role="status">
              Couldn&apos;t load your space.
            </p>
            <Button variant="secondary" pending={space.isFetching && "Loading…"} onClick={() => void space.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="pf-state">
            <Loader label="Loading your space" />
          </div>
        )}
      </div>
    </section>
  );
}
