import type { ReactNode } from "react";

/**
 * The zellige motif (.ux-forge/profile/directions.md, direction B). Everything here is decoration: aria-hidden,
 * no text on it. The tiling field is the `.zl` CSS mask engine in profile.css; the single star is a symbol.
 */

/** The khatam star as one symbol, rendered once per page and referenced by <TileStar />. */
export function ZelligeDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <symbol id="zl-star" viewBox="0 0 48 48">
        <path d="M48 24L40.97 31.03 40.97 40.97 31.03 40.97 24 48 16.97 40.97 7.03 40.97 7.03 31.03 0 24 7.03 16.97 7.03 7.03 16.97 7.03 24 0 31.03 7.03 40.97 7.03 40.97 16.97Z" />
      </symbol>
    </svg>
  );
}

/** One star in `currentColor`; its size follows the font size. */
export function TileStar() {
  return (
    <svg className="pf-star" aria-hidden="true" focusable="false">
      <use href="#zl-star" />
    </svg>
  );
}

/** A section card's heading: the serif h2, nothing else (the tile field lives on the couple card only). */
export function CardHead({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 className="pf-h2" id={id}>
      {children}
    </h2>
  );
}
