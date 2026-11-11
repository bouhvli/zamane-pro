import { setTitle } from "../lib/announce.ts";
import { focusHeading, useArrival } from "../lib/nav.ts";

/** An area that's built in a later phase: only its name, under the nav bar (AppShell). */
export function Placeholder({ name }: { name: string; route?: string }) {
  // A new screen: back to the top (useArrival) and, after an in-app navigation, focus on its h1.
  useArrival((first) => {
    setTitle(name);
    if (!first) focusHeading();
  });
  return (
    <section className="screen placeholder" aria-labelledby="page-h">
      <h1 className="title-lg" id="page-h">
        {name}
      </h1>
    </section>
  );
}
