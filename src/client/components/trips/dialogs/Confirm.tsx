import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { P } from "./common.tsx";
import { C } from "./copy.ts";

/**
 * The shared confirmation for destructive acts (Z.confirm): an alertdialog, the safe button first and focused, Esc
 * keeps, no backdrop dismissal. While it is up the sheet underneath steps back (html.confirm-open, critique F7).
 * `ask()` resolves true when the danger button is pressed. A confirmed answer leaves focus to the caller.
 */
export interface AskOptions {
  title: string;
  body: string[];
  confirm: string;
  cancel?: string;
}
interface Asking extends AskOptions {
  resolve: (yes: boolean) => void;
}

export function useConfirm(): { ask: (o: AskOptions) => Promise<boolean>; node: ReactNode } {
  const [asking, setAsking] = useState<Asking | null>(null);
  const ask = useCallback(
    (o: AskOptions) =>
      new Promise<boolean>((resolve) => {
        setAsking({ ...o, resolve });
      }),
    [],
  );
  return { ask, node: <ConfirmView asking={asking} done={() => setAsking(null)} /> };
}

function ConfirmView({ asking, done }: { asking: Asking | null; done: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const answer = useRef<boolean>(false);
  useEffect(() => {
    const d = ref.current;
    if (!d || !asking) return;
    opener.current = document.activeElement;
    answer.current = false;
    document.documentElement.classList.add("confirm-open");
    d.showModal();
    keep.current?.focus();
    return () => {
      document.documentElement.classList.remove("confirm-open");
    };
  }, [asking]);
  function finish(yes: boolean) {
    const a = asking;
    if (!a) return;
    answer.current = yes;
    ref.current?.close();
    done();
    a.resolve(yes);
    if (!yes && opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus();
  }
  return (
    <dialog
      ref={ref}
      className="sheet confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dg-confirm-h"
      aria-describedby="dg-confirm-body"
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
    >
      <h2 id="dg-confirm-h">{asking?.title}</h2>
      <div id="dg-confirm-body" className="confirm-body">
        {asking && <P lines={asking.body} />}
      </div>
      <div className="sheet-actions">
        <button ref={keep} type="button" className="btn-sec" onClick={() => finish(false)}>
          {asking?.cancel ?? C.keepIt}
        </button>
        <button type="button" className="btn-danger" onClick={() => finish(true)}>
          {asking?.confirm}
        </button>
      </div>
      <p className="vh dlg-live" role="status" />
    </dialog>
  );
}
