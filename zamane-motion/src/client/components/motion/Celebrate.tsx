import type { CSSProperties } from 'react';
import { starPath } from '../../lib/motion';

const COLORS = ['var(--saffron)', 'var(--majorelle)', 'var(--terracotta)', 'var(--zellige)'];
const STAR = starPath(9);

export interface CelebrateProps {
  /** 0 shows nothing. Each new number plays the burst once (pass the count from useBecameTrue). */
  fire: number;
  size?: 'sm' | 'lg';
}

/**
 * Eight small zellige stars that fly out once and fade: a goal reached.
 * Place it inside a positioned element; it bursts from that element's top-left corner,
 * so wrap it in a zero-size box at the point it should come from.
 * Hidden entirely when reduced motion is on.
 */
export function Celebrate({ fire, size = 'sm' }: CelebrateProps) {
  if (!fire) return null;
  const reach = size === 'lg' ? 96 : 56;
  return (
    <span key={fire} className="zm-burst" data-size={size} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const r = i % 2 ? reach * 0.75 : reach;
        const style = {
          '--dx': `${(Math.cos(a) * r).toFixed(1)}px`,
          '--dy': `${(Math.sin(a) * r).toFixed(1)}px`,
          '--rot': `${i % 2 ? 90 : -90}deg`,
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
