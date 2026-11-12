import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The shared confirmation for destructive acts (Z.confirm): an alertdialog, the safe button first and focused, Esc
 * keeps, no backdrop dismissal. It has its own history entry (fix pass A3): Back closes the confirmation and nothing
 * under it, and the promise resolves once that entry is really gone, so a caller that navigates next sees the right
 * history. While it is up the sheet underneath steps back (html.confirm-open). `ask()` resolves true when the danger
 * button is pressed; `update()` changes the words while it is open (the count follows the partner's ticks).
 */
export interface AskOptions {
  title: string;
  body: string[];
  confirm: string;
  cancel?: string;
  /** The danger button's accessible name when it needs more than its text ("Delete Mint"). */
  okLabel?: string;
}
interface Asking {
  opts: AskOptions;
  resolve: (yes: boolean) => void;
  finished: boolean;
  opener: Element | null;
}

export interface ShopConfirm {
  ask: (o: AskOptions) => Promise<boolean>;
  update: (patch: Partial<AskOptions>) => void;
  /** Answer "keep" from code. */
  dismiss: () => void;
  isOpen: () => boolean;
  node: ReactNode;
}

export function useShopConfirm(): ShopConfirm {
  const router = useRouter();
  const [view, setView] = useState<{ opts: AskOptions } | null>(null);
  const cur = useRef<Asking | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);

  const flagged = useCallback(() => !!router.history.location.state?.shopConfirm, [router]);

  const finish = useCallback(
    (yes: boolean) => {
      const a = cur.current;
      if (!a || a.finished) return;
      a.finished = true;
      cur.current = null;
      dlg.current?.close();
      setView(null);
      document.documentElement.classList.remove("confirm-open");
      const done = () => {
        a.resolve(yes);
        if (!yes && a.opener instanceof HTMLElement && a.opener.isConnected) a.opener.focus({ preventScroll: true });
      };
      if (!flagged()) {
        done();
        return;
      }
      // Resolve once our entry is really gone.
      let ran = false;
      const off = router.history.subscribe(() => go());
      const t = setTimeout(go, 300);
      function go() {
        if (ran) return;
        ran = true;
        off();
        clearTimeout(t);
        done();
      }
      router.history.back();
    },
    [flagged, router],
  );

  // Back removed our entry: that is a "keep".
  useEffect(
    () =>
      router.history.subscribe(() => {
        if (cur.current && !cur.current.finished && !flagged()) finish(false);
      }),
    [router, flagged, finish],
  );

  const ask = useCallback(
    (opts: AskOptions) =>
      new Promise<boolean>((resolve) => {
        if (cur.current) {
          resolve(false);
          return;
        }
        cur.current = { opts, resolve, finished: false, opener: document.activeElement };
        const loc = router.state.location;
        router.history.push(loc.href, { ...loc.state, shopConfirm: true });
        setView({ opts });
      }),
    [router],
  );
  const update = useCallback((patch: Partial<AskOptions>) => {
    if (!cur.current) return;
    cur.current.opts = { ...cur.current.opts, ...patch };
    setView({ opts: cur.current.opts });
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d || !view || d.open) return;
    document.documentElement.classList.add("confirm-open");
    d.showModal();
    keep.current?.focus();
  }, [view]);
  useEffect(
    () => () => {
      document.documentElement.classList.remove("confirm-open");
    },
    [],
  );

  const o = view?.opts;
  const node = (
    <dialog
      ref={dlg}
      id="confirm"
      className="sheet confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sc-confirm-h"
      aria-describedby="sc-confirm-body"
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
    >
      <h2 id="sc-confirm-h">{o?.title}</h2>
      <div id="sc-confirm-body" className="confirm-body">
        {o?.body.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <div className="sheet-actions">
        <button ref={keep} type="button" className="btn-sec" onClick={() => finish(false)}>
          {o?.cancel ?? "Keep it"}
        </button>
        <button type="button" className="btn-danger" aria-label={o?.okLabel} onClick={() => finish(true)}>
          {o?.confirm}
        </button>
      </div>
      <p className="vh dlg-live" role="status" />
    </dialog>
  );
  return { ask, update, dismiss: () => finish(false), isOpen: () => !!cur.current, node };
}
