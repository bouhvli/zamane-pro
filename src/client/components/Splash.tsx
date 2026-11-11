import { useEffect, useState } from "react";
import { Lockup } from "./AuthShell.tsx";

/**
 * The launch splash (prototype #/launch "loading"): the mark on surface, and the status line "Loading Zamane"
 * after 1 s. With `status`, a hidden status is said at once (the invite resolver's "Opening your invite").
 */
export function Splash({ label = "Loading Zamane", status }: { label?: string; status?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setText(status ?? "Loading Zamane"), status ? 60 : 1000);
    return () => clearTimeout(t);
  }, [status]);
  return (
    <div className="splash">
      <section className="splash-mark" aria-label={label} aria-busy="true">
        <Lockup decorative />
      </section>
      <p className={`splash-status${status ? " vh" : ""}`} role="status">
        {text}
      </p>
    </div>
  );
}
