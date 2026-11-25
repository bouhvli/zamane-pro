import { useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { duration, easing, prefersReducedMotion } from "../../lib/motion.ts";

type ItemProps = { className?: string } & Record<`data-${string}`, string | undefined>;

/**
 * A list whose items animate when they come, go or change place (from the zamane-motion kit):
 * - added: fade and rise in (staggered on first mount when `appear`);
 * - removed: collapse to nothing, then unmount (hidden from assistive tech and inert meanwhile);
 * - moved: slide from the old place to the new one (FLIP).
 * Reduced motion: everything happens at once. Renders `<ul role="list">` of `<li>` by default.
 */
export function AnimatedList<T>({
  items,
  getKey,
  children,
  appear = false,
  as,
  itemAs,
  className,
  itemProps,
}: {
  items: readonly T[];
  getKey: (item: T) => string;
  children: (item: T, index: number) => ReactNode;
  /** Stagger the items in on first mount (Home's cards). Default false. */
  appear?: boolean;
  as?: ElementType;
  itemAs?: ElementType;
  className?: string;
  /** className and data-* attributes for each item's element. */
  itemProps?: (item: T) => ItemProps;
}) {
  const Root: ElementType = as ?? "ul";
  const Item: ElementType = itemAs ?? "li";
  const els = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, { top: number; left: number }>());
  const prevItems = useRef(items);
  const exiting = useRef(new Map<string, { item: T; index: number }>());
  const exitStarted = useRef(new Set<string>());
  const mounted = useRef(false);
  const [, rerender] = useState(0);

  // Which items left since the last render: they stay on screen while they collapse.
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

  const rows = items.map((item) => ({ key: getKey(item), item, exiting: false }));
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
        if (reduced || typeof el.animate !== "function") {
          done();
          continue;
        }
        el.style.overflow = "hidden";
        el.animate(
          [
            { height: el.offsetHeight + "px", opacity: 1 },
            {
              height: "0px",
              opacity: 0,
              paddingTop: "0px",
              paddingBottom: "0px",
              marginTop: "0px",
              marginBottom: "0px",
            },
          ],
          { duration: duration.slow, easing: easing.inOut, fill: "forwards" },
        ).onfinish = done;
        continue;
      }

      const now = { top: el.offsetTop, left: el.offsetLeft };
      const before = positions.current.get(row.key);
      positions.current.set(row.key, now);
      if (reduced || typeof el.animate !== "function") continue;

      if (!before) {
        if (first && !appear) continue;
        const delay = first ? Math.min(order++, 8) * 45 : 0;
        el.animate(
          [
            { opacity: 0, transform: "translateY(12px) scale(0.98)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: duration.slower, easing: easing.out, delay, fill: "backwards" },
        );
        continue;
      }

      const dx = before.left - now.left;
      const dy = before.top - now.top;
      if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
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
    <Root className={className} role={Root === "ul" || Root === "ol" ? "list" : undefined}>
      {rows.map((row, index) => (
        <Item
          key={row.key}
          {...itemProps?.(row.item)}
          data-exiting={row.exiting || undefined}
          aria-hidden={row.exiting || undefined}
          inert={row.exiting || undefined}
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
