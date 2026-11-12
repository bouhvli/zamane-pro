import { say } from "../../lib/announce.ts";

/** Plural helper, the prototype's Z.plural. */
export const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

/** The topmost open dialog, if any. */
export function topDialog(): HTMLDialogElement | null {
  const open = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")];
  return open[open.length - 1] ?? null;
}

/** Polite status into the open dialog's own live region (Z.announce), else the page's #live. */
export function announce(msg: string) {
  const l = topDialog()?.querySelector<HTMLElement>(".dlg-live");
  if (!l) return say(msg);
  l.textContent = "";
  setTimeout(() => {
    l.textContent = msg;
  }, 50);
}
/** An urgent message into the dialog's role=alert (Z.say(..., true)); polite when there is none. */
export function alertIn(dlg: HTMLElement | null, msg: string) {
  const l = dlg?.querySelector<HTMLElement>('[role="alert"]');
  if (!l) return announce(msg);
  l.textContent = "";
  setTimeout(() => {
    l.textContent = msg;
  }, 50);
}

export const visible = (el: Element | null): el is HTMLElement =>
  !!el && el.isConnected && (el as HTMLElement).getClientRects().length > 0 && !el.closest("[hidden],[inert]");

const rowButton = (id: string) =>
  document.querySelector<HTMLElement>(`#main [data-act="open"][data-id="${CSS.escape(id)}"]`);

/** The add field (the page's primary). */
export function focusAdd() {
  const p = document.getElementById("primary");
  if (p && visible(p)) p.focus({ preventScroll: true });
  else document.querySelector<HTMLElement>("#main h1")?.focus({ preventScroll: true });
}
/** Focus a row's body button, else the add field (Shop.focusRow). */
export function focusRow(id: string | null | undefined) {
  const b = id ? rowButton(id) : null;
  if (b) b.focus({ preventScroll: true });
  else focusAdd();
}
/** The id of the next row in the DOM, else the previous: read it BEFORE deleting (Shop.neighbour). */
export function neighbourOf(id: string): string | null {
  const rows = [...document.querySelectorAll<HTMLElement>("#main li.row[data-id]")];
  const i = rows.findIndex((li) => li.dataset.id === id);
  if (i < 0) return null;
  return (rows[i + 1] ?? rows[i - 1])?.dataset.id ?? null;
}

export const motionOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
