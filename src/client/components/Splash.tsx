import { useEffect, useState } from "react";
import { Lockup } from "./AuthShell.tsx";
import { Loader } from "./Loader.tsx";

/**
 * The launch splash (prototype #/launch "loading"): the mark on surface, and after 1 s the loader (three turning
 * zellige shapes, with "Loading Zamane" said but never drawn). With `status`, the loader shows at once and the
 * status is what is said (the invite resolver's "Opening your invite").
 */
export function Splash({ label = "Loading Zamane", status }: { label?: string; status?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), status ? 60 : 1000);
    return () => clearTimeout(t);
  }, [status]);
  return (
    <div className="splash">
      <section className="splash-mark" aria-label={label} aria-busy="true">
        <Lockup decorative />
      </section>
      <div className="splash-status">{show && <Loader label={status ?? "Loading Zamane"} size={20} />}</div>
    </div>
  );
}
