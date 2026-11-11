import { useLayoutEffect, useRef } from "react";

/**
 * The prototype's focus rule: the first load moves nothing; an in-app arrival moves focus to the screen's target
 * (its h1 by default). `navState.first` turns false on the first navigation after load (see main.tsx).
 */
export const navState = { first: true };

export function focusEl(el: HTMLElement | null | undefined) {
  if (!el) return;
  if (!el.matches("a,button,input,select,textarea,[tabindex]")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: false });
}

export function focusHeading() {
  const h = document.querySelector<HTMLElement>("#main h1");
  if (h) {
    h.setAttribute("tabindex", "-1");
    h.focus();
  }
}

/** Runs once per mount: `land(target)` focuses only on an in-app arrival. Returns whether this was the first load. */
export function useArrival(onArrive: (first: boolean) => void) {
  const done = useRef(false);
  useLayoutEffect(() => {
    if (done.current) return;
    done.current = true;
    onArrive(navState.first);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, like the prototype's mount()
  }, []);
}

/** Sets <html data-chrome> and <html data-route> (the prototype's selectors key off them). */
export function useChrome(chrome: "auth" | "app", route: string) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.chrome = chrome;
    root.dataset.route = route;
  }, [chrome, route]);
}
