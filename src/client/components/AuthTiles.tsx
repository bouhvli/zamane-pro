import type { CSSProperties } from "react";
import { Lockup } from "./AuthShell.tsx";

/**
 * The zellige wall of the signed-out screens (auth-zellige.css). A field of khatam stars laid in diamond rings
 * around one centre, the doorway: the rings take the two partners' glazes in turn, two rings each, with a saffron
 * course between them. Each ring is one group, so the wall can lay itself outward on arrival, pulse while a request runs, and
 * leave the second partner's rings unfired on Create account until there is a partner code.
 *
 * Everything but the lockup is decoration: aria-hidden, no text on it.
 */

const U = 48; // the star's own box
const COLS = 25;
const ROWS = 33;
const STAR =
  "M48 24L40.97 31.03 40.97 40.97 31.03 40.97 24 48 16.97 40.97 7.03 40.97 7.03 31.03 0 24 7.03 16.97 7.03 7.03 16.97 7.03 24 0 31.03 7.03 40.97 7.03 40.97 16.97Z";
const ARCH = "M0 132V120C0 62 38 40 100 0C162 40 200 62 200 120V132";
/** The glaze each ring takes, from the doorway outward: two of partner A, saffron, two of partner B, saffron. */
const COURSE = ["a", "a", "s", "b", "b", "s"] as const;
/** Rings past this one arrive together, so the wall is whole in about a second. */
const LAST_STEP = 14;

const RINGS: { d: number; tiles: { x: number; y: number }[] }[] = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const d = Math.abs(col - (COLS - 1) / 2) + Math.abs(row - (ROWS - 1) / 2);
    (RINGS[d] ??= { d, tiles: [] }).tiles.push({ x: col * U, y: row * U });
  }
}

function Tiles() {
  return (
    <svg className="az-tiles" viewBox={`0 0 ${COLS * U} ${ROWS * U}`} aria-hidden="true" focusable="false">
      <defs>
        <path id="az-star" d={STAR} />
      </defs>
      {RINGS.map((ring) => (
        <g
          key={ring.d}
          className={`az-ring az-ring-${COURSE[ring.d % COURSE.length]}`}
          style={{ "--d": Math.min(ring.d, LAST_STEP) } as CSSProperties}
        >
          {ring.tiles.map((t) => (
            <use key={`${t.x}-${t.y}`} href="#az-star" x={t.x} y={t.y} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** The wall and its doorway. `solo`: the second partner's rings are unfired. */
export function TileWall({ solo }: { solo: boolean }) {
  return (
    <div className={`az-wall${solo ? " is-solo" : ""}`}>
      <Tiles />
      <div className="az-arch">
        <svg className="az-cap" viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="az-cap-fill" d={`${ARCH}Z`} />
          <path className="az-cap-grout" d={ARCH} />
          <path className="az-cap-line" d={ARCH} />
        </svg>
        <div className="az-door" />
        <span className="brand az-brand">
          <Lockup />
        </span>
      </div>
    </div>
  );
}
