import type { ReactNode } from "react";

/**
 * Seats (direction C · Two seats): the partner avatars are the only imagery on these screens. Always aria-hidden;
 * the text carries the meaning. Port of the prototype's A.seat / A.pair / A.initial.
 */
export type SeatRole = "a" | "b" | "neutral" | "empty" | "taken";

/** The first grapheme, upper-cased ("É" from "élodie", not "E"). */
export function initial(name: string | null | undefined): string {
  const s = String(name ?? "").trim();
  if (!s) return "";
  try {
    const first = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment.toLocaleUpperCase();
  } catch {
    /* no Segmenter */
  }
  return s.charAt(0).toLocaleUpperCase();
}

export function Seat({
  role = "neutral",
  initial: letter,
  size = "md",
  filling,
}: {
  role?: SeatRole;
  initial?: string;
  size?: "md" | "sm";
  filling?: boolean;
}) {
  let r = role;
  const txt = r === "empty" || r === "taken" ? "" : (letter ?? "");
  if (!txt && (r === "a" || r === "b" || r === "neutral")) r = r === "neutral" ? "empty" : r; // never a "?"
  return <span className={`seat${filling ? " is-filling" : ""} seat--${r} seat--${size}`}>{txt}</span>;
}

export function SeatPair({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`seat-pair ${className ?? ""}`} aria-hidden="true">
      {children}
    </span>
  );
}
