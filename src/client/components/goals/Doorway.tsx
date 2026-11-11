import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ImageAsset } from "../../../shared/schemas/goals.ts";
import { pct } from "../../lib/goals.ts";
import { photoUrl } from "../../lib/uploads.ts";

/**
 * The doorway (shared.js Z.doorway): the arch holding the goal's cover, or the title's initial. Decorative (the
 * title is always next to it). When the goal is done the zellige surround closes around it; `closing` plays the
 * closing animation once (the moment it was reached on this screen).
 */
export type DoorSize = "detail" | "tile" | "row" | "form";

/** CSS width of each size, for the delivery URL (× device pixel ratio). Heights follow the arch's ratio. */
const PX: Record<DoorSize, { w: number; h: (w: number) => number }> = {
  detail: { w: 360, h: (w) => Math.round((w * 2) / 3) },
  form: { w: 360, h: (w) => Math.round((w * 2) / 3) },
  tile: { w: 240, h: (w) => Math.round((w * 4) / 5) },
  row: { w: 32, h: () => 40 },
};

export function Doorway({
  title,
  cover,
  size,
  done,
  closing,
  cloudName,
  src,
}: {
  title: string;
  cover: ImageAsset | null;
  size: DoorSize;
  done: boolean;
  closing?: boolean;
  /** Null when uploads are off: covers aren't shown. */
  cloudName: string | null;
  /** A local preview (the form, while a new cover uploads). */
  src?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isClosing, setClosing] = useState(!!closing);
  useEffect(() => setClosing(!!closing), [closing]);
  const url = src ?? (cover && cloudName ? photoUrl(cloudName, cover, PX[size].w, PX[size].h(PX[size].w)) : null);
  const cls = `door door--${size}${url ? " has-photo" : ""}${done ? " is-done" : ""}${isClosing && done ? " is-closing" : ""}`;
  return (
    <div ref={ref} className={cls} aria-hidden="true" onAnimationEnd={() => setClosing(false)}>
      {url ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <span className="door-initial">{title.trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

/**
 * The design system's progress bar (shared.js Z.bar): role=progressbar with a spoken value. `from` animates the
 * fill from an earlier percentage after the first paint (a contribution just landed).
 */
export function Bar({
  goal,
  label,
  from,
  valueText,
}: {
  goal: { kind: "money" | "general"; progress: number; target: number | null; title: string };
  label?: string;
  from?: number | null;
  valueText: string;
}) {
  const to = pct(goal);
  const [w, setW] = useState(from ?? to);
  useLayoutEffect(() => {
    if (from == null || from === to) {
      setW(to);
      return;
    }
    setW(from);
    let b = 0;
    const a = requestAnimationFrame(() => (b = requestAnimationFrame(() => setW(to))));
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [from, to]);
  return (
    <div
      className="track"
      role="progressbar"
      aria-label={label ?? goal.title}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={to}
      aria-valuetext={valueText}
    >
      <div className="fill" style={{ width: `${w}%` }} />
    </div>
  );
}
