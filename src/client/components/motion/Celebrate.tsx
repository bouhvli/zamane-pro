import type { CSSProperties } from "react";
import { starPath } from "../../lib/motion.ts";

const COLORS = ["var(--saffron)", "var(--majorelle)", "var(--terracotta)", "var(--zellige)"];
const STAR = starPath(9);

/**
 * Eight small zellige stars that fly out once and fade: a goal reached. It bursts from its parent's top-left corner,
 * so put it in a zero-size positioned box at the point it should come from (`.zm-burst-at`). `fire` 0 shows nothing;
 * each new number plays the burst once (pass the count from useBecameTrue or a counter). Decorative; hidden with
 * reduced motion.
 */
export function Celebrate({ fire, size = "sm" }: { fire: number; size?: "sm" | "lg" }) {
  if (!fire) return null;
  const reach = size === "lg" ? 96 : 56;
  return (
    <span key={fire} className="zm-burst" data-size={size} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const r = i % 2 ? reach * 0.75 : reach;
        const style = {
          "--dx": `${(Math.cos(a) * r).toFixed(1)}px`,
          "--dy": `${(Math.sin(a) * r).toFixed(1)}px`,
          "--rot": `${i % 2 ? 90 : -90}deg`,
          color: COLORS[i % COLORS.length],
          animationDelay: `${(i % 2) * 50}ms`,
        } as CSSProperties;
        return (
          <svg key={i} className="zm-burst-star" viewBox="-10 -10 20 20" style={style}>
            <path d={STAR} fill="currentColor" />
          </svg>
        );
      })}
    </span>
  );
}
