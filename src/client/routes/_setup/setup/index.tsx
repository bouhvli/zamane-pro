import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AuthShell, PageHead } from "../../../components/AuthShell.tsx";
import { Icon } from "../../../components/Icon.tsx";
import { initial, Seat, SeatPair } from "../../../components/Seat.tsx";
import { ConnNotice, SignedUpAs } from "../../../components/SetupBits.tsx";
import { say, setTitle } from "../../../lib/announce.ts";
import { focusHeading, useArrival } from "../../../lib/nav.ts";
import { useSignOut } from "../../../lib/use-sign-out.ts";

/** Set up your space: the choice (setup.js "setup"). Two equal cards; neither is pre-selected. */
export const Route = createFileRoute("/_setup/setup/")({ component: Choose });

const C = {
  title: "Set up your space",
  gloss: "Your shared place for goals, trips and shopping. One of you starts it; the other joins with a code.",
  startTitle: "Start our space",
  startBody: "I'm first. I'll invite my partner with a code. Only one of you starts.",
  joinTitle: "Join with a code",
  joinBody: "My partner already started. I have their code.",
  offline: "You're offline. Setting up needs a connection.",
  online: "Back online.",
};

function Choose() {
  const { me } = Route.useRouteContext();
  const { signOut, offline } = useSignOut();
  const firstName = me.user.displayName;
  const i = initial(firstName);

  useArrival((first) => {
    setTitle(C.title);
    if (!first) focusHeading();
  });
  const wasOffline = useRef(offline);
  useEffect(() => {
    if (wasOffline.current && !offline) say(C.online);
    wasOffline.current = offline;
  }, [offline]);

  return (
    <AuthShell route="setup" header={{ account: { firstName, onSignOut: signOut, offline } }}>
      <PageHead
        title={C.title}
        seats={
          <SeatPair>
            <Seat role="neutral" initial={i} />
          </SeatPair>
        }
      />
      <p className="lede">{C.gloss}</p>
      <ConnNotice id="choose" offline={offline}>
        {C.offline}
      </ConnNotice>
      <div className="choices-wrap">
        <ul className="choices">
          <li className="choice card">
            <SeatPair>
              <Seat role="a" initial={i} />
              <Seat role="empty" />
            </SeatPair>
            <p className="choice-title">
              <Link to="/setup/start" aria-describedby="choose-start-desc">
                {C.startTitle}
              </Link>
            </p>
            <Icon name="chevron-right" className="chev" />
            <p className="choice-desc" id="choose-start-desc">
              {C.startBody}
            </p>
          </li>
          <li className="choice card">
            <SeatPair>
              <Seat role="taken" />
              <Seat role="b" initial={i} />
            </SeatPair>
            <p className="choice-title">
              <Link to="/setup/join" aria-describedby="choose-join-desc">
                {C.joinTitle}
              </Link>
            </p>
            <Icon name="chevron-right" className="chev" />
            <p className="choice-desc" id="choose-join-desc">
              {C.joinBody}
            </p>
          </li>
        </ul>
      </div>
      <SignedUpAs email={me.user.email} onSignOut={signOut} offline={offline} />
    </AuthShell>
  );
}
