import { useLayoutEffect, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { duration, easing, prefersReducedMotion } from '../../lib/motion';

export interface AnimatedListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  children: (item: T, index: number) => ReactNode;
  /** Items that just arrived from the partner (a realtime notice) glow saffron as they slide in. */
  isRemote?: (item: T) => boolean;
  /** Stagger the items in on first mount (Home's cards, a freshly opened list). Default false. */
  appear?: boolean;
  as?: ElementType;
  itemAs?: ElementType;
  className?: string;
  itemClassName?: string;
}

type Row<T> = { key: string; item: T; exiting: boolean };

/**
 * A list whose items animate when they come, go or change place.
 * - added: fade and rise in (staggered on first mount when `appear`)
 * - removed: collapse to nothing, then unmount
 * - moved: slide from the old place to the new one (FLIP)
 * Reduced motion: everything happens at once.
 */
export function AnimatedList<T>({
  items,
  getKey,
  children,
  isRemote,
  appear = false,
  as,
  itemAs,
  className,
  itemClassName,
}: AnimatedListProps<T>) {
  const Root: ElementType = as ?? 'div';
  const Item: ElementType = itemAs ?? 'div';
  const els = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, { top: number; left: number }>());
  const prevItems = useRef(items);
  const exiting = useRef(new Map<string, { item: T; index: number }>());
  const exitStarted = useRef(new Set<string>());
  const mounted = useRef(false);
  const [, rerender] = useState(0);

  // Work out which items left since the last render; they stay on screen while they collapse.
  if (prevItems.current !== items) {
    const now = new Set(items.map(getKey));
    prevItems.current.forEach((item, index) => {
      const key = getKey(item);
      if (!now.has(key) && !exiting.current.has(key)) exiting.current.set(key, { item, index });
    });
    for (const key of [...exiting.current.keys()]) {
      if (now.has(key)) {
        exiting.current.delete(key);
        exitStarted.current.delete(key);
      }
    }
    prevItems.current = items;
  }

  const rows: Row<T>[] = items.map((item) => ({ key: getKey(item), item, exiting: false }));
  [...exiting.current.entries()]
    .sort((a, b) => a[1].index - b[1].index)
    .forEach(([key, { item, index }]) => rows.splice(Math.min(index, rows.length), 0, { key, item, exiting: true }));

  const remember = () => {
    for (const [key, el] of els.current) {
      if (!exiting.current.has(key)) positions.current.set(key, { top: el.offsetTop, left: el.offsetLeft });
    }
  };

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const first = !mounted.current;
    mounted.current = true;
    let order = 0;

    for (const row of rows) {
      const el = els.current.get(row.key);
      if (!el) continue;

      if (row.exiting) {
        if (exitStarted.current.has(row.key)) continue;
        exitStarted.current.add(row.key);
        const done = () => {
          exiting.current.delete(row.key);
          exitStarted.current.delete(row.key);
          remember(); // the rows below have already slid up: start from where they are
          rerender((n) => n + 1);
        };
        if (reduced || typeof el.animate !== 'function') {
          done();
          continue;
        }
        el.style.overflow = 'hidden';
        el.style.pointerEvents = 'none';
        el.animate(
          [
            { height: el.offsetHeight + 'px', opacity: 1 },
            { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' },
          ],
          { duration: duration.slow, easing: easing.inOut, fill: 'forwards' },
        ).onfinish = done;
        continue;
      }

      const now = { top: el.offsetTop, left: el.offsetLeft };
      const before = positions.current.get(row.key);
      positions.current.set(row.key, now);
      if (reduced || typeof el.animate !== 'function') continue;

      if (!before) {
        if (first && !appear) continue;
        const delay = first ? Math.min(order++, 8) * 45 : 0;
        el.animate(
          [
            { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: duration.slower, easing: easing.out, delay, fill: 'backwards' },
        );
        if (!first && isRemote?.(row.item)) {
          el.classList.remove('zm-arrived');
          void el.offsetWidth; // restart the glow if it was already running
          el.classList.add('zm-arrived');
          el.addEventListener('animationend', () => el.classList.remove('zm-arrived'), { once: true });
        }
        continue;
      }

      const dx = before.left - now.left;
      const dy = before.top - now.top;
      if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: duration.slow,
          easing: easing.out,
        });
      }
    }

    for (const key of [...positions.current.keys()]) {
      if (!els.current.has(key)) positions.current.delete(key);
    }
  });

  return (
    <Root className={className} style={{ position: 'relative' }}>
      {rows.map((row, index) => (
        <Item
          key={row.key}
          className={itemClassName}
          data-exiting={row.exiting || undefined}
          aria-hidden={row.exiting || undefined}
          ref={(el: HTMLElement | null) => {
            if (el) els.current.set(row.key, el);
            else els.current.delete(row.key);
          }}
        >
          {children(row.item, index)}
        </Item>
      ))}
    </Root>
  );
}
