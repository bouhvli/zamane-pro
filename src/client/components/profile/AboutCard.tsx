import { Link } from "@tanstack/react-router";
import { useSignOut } from "../../lib/use-sign-out.ts";
import { Button } from "../Button.tsx";
import { CardHead } from "./Zellige.tsx";

export function AboutCard() {
  const { signOut, offline } = useSignOut();
  return (
    <section className="pf-card" aria-labelledby="pf-about-h">
      <CardHead id="pf-about-h">About and sign out</CardHead>
      <ul className="pf-about">
        <li>
          <Link to="/privacy" className="pf-link">
            Privacy
          </Link>
        </li>
        <li className="muted">Version {__APP_VERSION__}</li>
      </ul>
      <div className="pf-out">
        <p className="muted">Signs you out on this device.</p>
        <Button variant="secondary" id="sign-out" disabledReason={offline ? "signout-reason" : null} onClick={signOut}>
          Sign out
        </Button>
        {offline && (
          <p className="help" id="signout-reason">
            Signing out needs a connection.
          </p>
        )}
      </div>
    </section>
  );
}
