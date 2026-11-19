import { useEffect, useState, type MouseEvent } from "react";
import { TileStar } from "./Zellige.tsx";

/** The settings sections in page order: the Section ids and the index's labels. */
export const SECTIONS = [
  ["pf-you", "You"],
  ["pf-look", "Appearance"],
  ["pf-security", "Security"],
  ["pf-data", "Your data"],
  ["pf-about", "About"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

/** Pixels below the viewport top where a section counts as "the one you're in" (top bar 60 + room). */
const LINE = 140;

/** The section whose heading last crossed LINE; the last one when the page can't scroll any further. */
function useCurrentSection(): SectionId {
  const [current, setCurrent] = useState<SectionId>(SECTIONS[0][0]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let next: SectionId = SECTIONS[0][0];
      for (const [id] of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= LINE) next = id;
      }
      const root = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
        next = SECTIONS[SECTIONS.length - 1]![0];
      }
      setCurrent(next);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return current;
}

function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  document.getElementById(`${id}-h`)?.focus({ preventScroll: true });
}

/**
 * From 48rem: the sticky "Settings" index beside the sections. The section you're in carries the glazed star
 * (the nav bar's marker, in the tile's shape). Hidden on phones, where the sections simply follow each other.
 */
export function SettingsIndex() {
  const current = useCurrentSection();
  return (
    <nav className="pf-index" aria-labelledby="pf-index-h">
      <p className="pf-index-h" id="pf-index-h">
        Settings
      </p>
      <ul>
        {SECTIONS.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} aria-current={current === id ? "true" : undefined} onClick={(e) => jump(e, id)}>
              <TileStar />
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
