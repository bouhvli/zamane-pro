import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { formatAmount, minorUnits, parseMoney } from "../../../../shared/money.ts";
import { TRIP_LIMITS } from "../../../../shared/schemas/trips.ts";
import { say } from "../../../lib/announce.ts";
import { tripsQuery } from "../../../lib/trips.ts";
import { Icon } from "../../Icon.tsx";
import { PartnerAvatarSm } from "../../goals/Avatar.tsx";
import { unknownName, unknownSlot, type AvatarSlot } from "../../../lib/people.ts";
import { C, tooLong, type Actor } from "./copy.ts";
import type { Canon, Def } from "./engine.ts";

// ---------- drafts: this phone only (dialogs.js `store`, D55) ----------

export const DRAFT = "zamane.trips.draft:";
export const draftStore = {
  get(k: string): unknown {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage blocked: the draft lives only in the open form */
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage blocked */
    }
  },
};
// ---------- people ----------

/** Names and slots of the two people (from the cached Trips list), and which one is this person. */
export function usePeople() {
  const { me } = useRouteContext({ from: "/_app" });
  const q = useQuery(tripsQuery);
  return useMemo(() => {
    const members = new Map((q.data?.members ?? []).map((m) => [m.userId, m]));
    const loaded = members.size > 0;
    const name = (id: string | null | undefined) =>
      !id
        ? "Your partner"
        : id === me.user.id
          ? me.user.displayName
          : (members.get(id)?.displayName ?? unknownName(loaded));
    const slot = (id: string): AvatarSlot =>
      id === me.user.id
        ? me.space.slot
        : (members.get(id)?.slot ?? unknownSlot(loaded, me.space.slot === "a" ? "b" : "a"));
    const actor = (id: string): Actor =>
      id === me.user.id ? { kind: "self" } : { kind: "partner", name: name(id), slot: slot(id) };
    return { meId: me.user.id, currency: me.space.currency, name, slot, actor };
  }, [me, q.data]);
}
export type People = ReturnType<typeof usePeople>;

// ---------- announcing and focus ----------

/** Polite status into the open dialog's own live region (Z.announce), else the page's. */
export function announceIn(dlg: HTMLElement | null, msg: string) {
  const l = dlg?.querySelector<HTMLElement>(".dlg-live");
  if (!l) return say(msg);
  l.textContent = "";
  setTimeout(() => {
    l.textContent = msg;
  }, 50);
}
/** An urgent message into the dialog's role=alert (Z.say(…, true)). */
export function alertIn(dlg: HTMLElement | null, msg: string) {
  const l = dlg?.querySelector<HTMLElement>('[role="alert"]');
  if (!l) return announceIn(dlg, msg);
  l.textContent = "";
  setTimeout(() => {
    l.textContent = msg;
  }, 50);
}

export const visible = (el: Element | null): el is HTMLElement =>
  !!el && el.isConnected && (el as HTMLElement).getClientRects().length > 0 && !el.closest("[hidden],[inert]");

const root = () => document.getElementById("main");
export const sel = (act: string, id: string) => `[data-act="${act}"][data-id="${CSS.escape(id)}"]`;
function firstVisible(sels: string[]): HTMLElement | null {
  for (const s of sels) {
    for (const el of root()?.querySelectorAll<HTMLElement>(s) ?? []) if (visible(el)) return el;
  }
  return null;
}
export interface Opener {
  el: HTMLElement | null;
  id: string | null;
  act: string | null;
  did: string | null;
  at: number;
}
export function describeEl(el: HTMLElement): Opener {
  return { el, id: el.id || null, act: el.getAttribute("data-act"), did: el.getAttribute("data-id"), at: Date.now() };
}
let lastActivated: Opener | null = null;
if (typeof document !== "undefined") {
  const mark = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("#main button, #main a[href], #main [data-act]");
    if (el) lastActivated = describeEl(el);
  };
  document.addEventListener("click", mark, true);
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const a = document.activeElement as HTMLElement | null;
      if (a?.closest("#main") && a.id !== "main") lastActivated = describeEl(a);
    },
    true,
  );
}
/** What opened this dialog: the focused control on the page, else what was just activated. */
export function captureOpener(): Opener | null {
  const a = document.activeElement as HTMLElement | null;
  const m = root();
  if (a && m && m.contains(a) && a !== m && a.tagName !== "H1") return describeEl(a);
  if (lastActivated && Date.now() - lastActivated.at < 4000) return lastActivated;
  return null;
}
/** The page re-renders on changes: find the same control again by id, then by [data-act][data-id]. */
function refind(op: Opener | null): HTMLElement | null {
  if (!op) return null;
  if (visible(op.el)) return op.el;
  const q = op.id ? document.getElementById(op.id) : null;
  if (visible(q)) return q;
  if (op.act)
    return firstVisible([`[data-act="${CSS.escape(op.act)}"]${op.did ? `[data-id="${CSS.escape(op.did)}"]` : ""}`]);
  return null;
}
const FALLBACK = ["#primary", "#td-gone", 'a[href="/trips"]'];
function focusEl(el: HTMLElement) {
  el.focus({ preventScroll: true });
}
/** Where focus lands when a dialog closes: the named controls, else the opener, else a fallback (ia §6.3). */
export function land(sels: string[] | null, opener: Opener | null, reveal = false) {
  const el = (sels && firstVisible(sels)) || refind(opener) || firstVisible(FALLBACK);
  if (!el) {
    const h = document.querySelector<HTMLElement>("#main h1");
    if (h) {
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    }
    return;
  }
  if (reveal) el.scrollIntoView({ block: "center" }); // clear of the toast and the floating primary (2.4.11)
  focusEl(el);
}

// ---------- money ----------

/** A minor-unit amount as typed: no grouping, trailing zeros dropped ("1200", "12.5"). */
export function minorToInput(minor: number | null, currency: string): string {
  if (minor == null) return "";
  const d = minorUnits(currency);
  return d ? String(Number((minor / 10 ** d).toFixed(d))) : String(minor);
}
/** Canonical money: minor units, "" (nothing typed) as null, or the typed text when it isn't an amount. */
export function readMoney(raw: string, currency: string): number | string | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseMoney(t, currency);
  return n == null ? t : n;
}
export const moneyNorm = (v: Canon) => (v == null || v === "" ? "" : String(v).trim());
export const moneyShown = (currency: string) => (v: Canon) =>
  v == null || v === "" ? C.emptyValue : typeof v === "number" ? formatAmount(v, currency) : String(v);
export function moneyError(raw: string, currency: string, fmtErr: string): string {
  const v = readMoney(raw, currency);
  if (typeof v === "string") return fmtErr;
  if (v != null && v > TRIP_LIMITS.moneyMax * 10 ** minorUnits(currency))
    return `That amount is too large. Enter ${formatAmount(TRIP_LIMITS.moneyMax * 10 ** minorUnits(currency), currency)} or less.`;
  return "";
}
export function maxErr(v: string, n: number, what: string) {
  return v.trim().length > n ? tooLong(n, what) : "";
}
export function validUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
export function urlErr(raw: string, max: number) {
  const v = raw.trim();
  return !v ? "" : !validUrl(v) ? C.eUrl : v.length > max ? tooLong(max, "link") : "";
}
export function host(s: string): string {
  try {
    return new URL(s).host.replace(/^www\./, "");
  } catch {
    return s;
  }
}
export const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// ---------- small pieces ----------

export const textDef = (id: string, label: string, inDetails = false): Def => ({
  label,
  markId: `${id}-mark`,
  inDetails,
  norm: (v) => String(v ?? "").trim(),
  shown: (v) => {
    const s = String(v ?? "").trim();
    return !s ? C.emptyValue : s.length > 60 ? `${s.slice(0, 57).trim()}…` : s;
  },
});

/** "Changed by Youssef" / "Youssef changed this to "x". Use theirs" under a field. */
export function MarkView({
  id,
  mark,
  label,
  text,
  withLabel,
  onUseTheirs,
}: {
  id: string;
  mark: { type: "changed" | "conflict"; actor: Actor } | undefined;
  label: string;
  text: string;
  withLabel?: boolean;
  onUseTheirs: () => void;
}) {
  if (!mark) return null;
  const av =
    mark.actor.kind === "partner" ? (
      <PartnerAvatarSm slot={mark.actor.slot} name={mark.actor.name} />
    ) : (
      <Icon name="refresh" />
    );
  const pre = withLabel ? <b>{label}: </b> : null;
  if (mark.type === "changed")
    return (
      <p className="dg-mark">
        {av}
        <span id={`${id}-text`}>
          {pre}
          {text}
        </span>
      </p>
    );
  return (
    <div className="dg-mark dg-mark-conflict">
      {av}
      <span className="dg-mark-text" id={`${id}-text`}>
        {pre}
        {text}
      </span>
      <button
        type="button"
        className="link-btn"
        data-act="use-theirs"
        aria-label={`${C.useTheirs}: ${label}`}
        aria-describedby={`${id}-text`}
        onClick={onUseTheirs}
      >
        {C.useTheirs}
      </button>
    </div>
  );
}

export function Err({ id, msg }: { id: string; msg: string }) {
  return (
    <p className="err" id={id} hidden={!msg}>
      {msg && (
        <>
          <Icon name="alert" />
          <span>{msg}</span>
        </>
      )}
    </p>
  );
}

export const describedBy = (...ids: (string | false | null | undefined)[]) => {
  const s = ids.filter(Boolean).join(" ");
  return s || undefined;
};

export function P({ lines }: { lines: string[] }): ReactNode {
  return lines.map((l) => <p key={l}>{l}</p>);
}
