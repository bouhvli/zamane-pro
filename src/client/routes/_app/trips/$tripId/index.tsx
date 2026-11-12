import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatAmount } from "../../../../../shared/money.ts";
import { localToday } from "../../../../../shared/trip-days.ts";
import { status } from "../../../../../shared/trip-plan.ts";
import { Icon } from "../../../../components/Icon.tsx";
import { consumeTripEditReturn, markTripEditFrom } from "../../../../components/trips/detail/edit-return.ts";
import { PlacesPanel } from "../../../../components/trips/detail/PlacesPanel.tsx";
import { PlanPanel } from "../../../../components/trips/detail/PlanPanel.tsx";
import { PrepPanel } from "../../../../components/trips/detail/PrepPanel.tsx";
import {
  DetailContext,
  nowNextWithEvening,
  reducedMotion,
  TAB_NAME,
  TABS,
  tokenMs,
  useWide,
  type DetailCtx,
  type People,
  type Primary,
  type Tab,
} from "../../../../components/trips/detail/shared.tsx";
import { BudgetBlock, Door, Identity, Left, Notes, Top, When } from "../../../../components/trips/detail/Summary.tsx";
import { TripDialogsHost } from "../../../../components/trips/TripDialogs.tsx";
import { Toast, type ToastHandle } from "../../../../components/Toast.tsx";
import { isApiError } from "../../../../lib/api.ts";
import { say, setTitle } from "../../../../lib/announce.ts";
import { takeFlash, type Flash } from "../../../../lib/flash.ts";
import { focusEl, focusHeading, useArrival, useNoFab } from "../../../../lib/nav.ts";
import { useOnline } from "../../../../lib/online.ts";
import { unknownName, unknownSlot } from "../../../../lib/people.ts";
import { nowHM, tripQuery, tripsQuery, useTripWrites, type EntryItem } from "../../../../lib/trips.ts";

/**
 * A trip (.ux-forge/trips detail.js, direction B · Saffron light). The URL carries the view and the open form (the
 * prototype's hash query): ?view=plan|places|prep · ?entry=new|<id>[&date=YYYY-MM-DD] · ?place=new|<id> ·
 * ?schedule=<placeId>.
 * - Summary: up-link and Edit, doorway (before, after, undated), h1 (+ the thumb during the trip), status text, the
 *   light band, notes with More, What's left, Budget, the primary (floating on phones).
 * - Plan · Places · Prep: ARIA tabs below 64rem (?view= replaced, never pushed); columns from 64rem.
 * - The one motion: ticking the Now entry, the light leaves the row (--dur-light); instant with reduced motion.
 * States: loading, error, not found, partial (the trip is known from the list, its rows are loading), not cached
 * (offline, never opened), ready, offline. Realtime (a partner's changes arriving live) is Phase 5.
 */
export type TripSearch = {
  view?: "plan" | "places" | "prep";
  entry?: string;
  date?: string;
  place?: string;
  schedule?: string;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/_app/trips/$tripId/")({
  validateSearch: (s: Record<string, unknown>): TripSearch => ({
    view: s.view === "plan" || s.view === "places" || s.view === "prep" ? s.view : undefined,
    entry: str(s.entry),
    date: typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : undefined,
    place: str(s.place),
    schedule: str(s.schedule),
  }),
  component: TripDetail,
});

function TripDetail() {
  const { tripId } = Route.useParams();
  return <Detail key={tripId} tripId={tripId} />;
}

function Detail({ tripId }: { tripId: string }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { me } = Route.useRouteContext();
  const online = useOnline();
  const offline = !online;
  const listQ = useQuery(tripsQuery);
  const fullQ = useQuery(tripQuery(tripId));
  const full = fullQ.data;
  const listTrip = listQ.data?.trips.find((t) => t.id === tripId) ?? null;
  const writes = useTripWrites();
  const toast = useRef<ToastHandle>(null);
  const wide = useWide();
  const [now, setNow] = useState(() => new Date());
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const flash = useRef<Flash | null>(null);

  // ---------- which state ----------
  const notFound = fullQ.isError && isApiError(fullQ.error, "not_found");
  const view: "loading" | "error" | "notfound" | "ready" | "partial" | "notcached" = full
    ? "ready"
    : notFound
      ? "notfound"
      : listTrip
        ? fullQ.isError
          ? offline
            ? "notcached"
            : "error"
          : "partial"
        : fullQ.isError
          ? "error"
          : "loading";
  const trip = full?.trip ?? listTrip;
  const ready = view === "ready" || view === "partial" || view === "notcached";
  const mode = view === "ready" || view === "partial" || view === "notcached" ? view : "ready";

  // ---------- the device's clock: status, Now / Next and the day list move on their own ----------
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  const today = localToday(now);
  const hm = nowHM(now);

  const entries = useMemo(() => full?.entries ?? [], [full]);
  const places = useMemo(() => full?.places ?? [], [full]);
  const items = useMemo(() => full?.items ?? [], [full]);
  const kind = trip ? status(trip, today).kind : "undated";
  const nn = trip ? nowNextWithEvening(trip, entries, today, hm) : { now: null, next: null, nothingLeft: false };
  const nextUp = [...(listQ.data?.trips ?? [])]
    .filter((t) => status(t, today).kind === "upcoming")
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))[0];
  const isNextTrip = !!trip && nextUp?.id === trip.id;

  const primary: Primary | null =
    view === "notcached" || !ready
      ? null
      : kind === "upcoming"
        ? { act: "new-entry", text: "Add to the plan" }
        : kind === "now" || kind === "undated"
          ? { act: "new-place", text: "Add a place" }
          : null;
  useNoFab(!primary);

  // ---------- people, money ----------
  const members = new Map(listQ.data?.members.map((m) => [m.userId, m]) ?? []);
  const people: People = {
    name: (id) => (id ? (members.get(id)?.displayName ?? unknownName(members.size > 0)) : "Your partner"),
    slot: (id) =>
      id ? (members.get(id)?.slot ?? (id === me.user.id ? me.space.slot : unknownSlot(members.size > 0, "b"))) : "b",
  };
  const currency = listQ.data?.currency ?? me.space.currency;
  const cloudName = listQ.data?.images?.cloudName ?? null;
  const mad = useCallback((minor: number) => formatAmount(minor, currency), [currency]);

  // ---------- arrival, title, focus ----------
  const dialogOpen = !!(search.entry || search.place || search.schedule);
  useArrival((first) => {
    flash.current = takeFlash();
    const editReturn = consumeTripEditReturn(tripId);
    if (flash.current?.focus) return;
    // Back from this trip's edit form (Save or Cancel), focus returns to Edit (IA 6.3).
    if (editReturn && !dialogOpen) {
      requestAnimationFrame(() => focusEl(document.getElementById("td-edit")));
      return;
    }
    if (!first) focusHeading();
  });
  useEffect(() => {
    if (dialogOpen) return; // the form dialogs own the title while open
    if (view === "loading") setTitle("Loading");
    else if (view === "error") setTitle("Can't load trip");
    else if (view === "notfound") setTitle("Trip not found");
    else if (trip) setTitle(`${trip.title}${offline ? " (offline)" : ""}`);
  }, [view, trip, offline, dialogOpen]);
  useEffect(() => {
    const f = flash.current;
    if (!f || !ready) return;
    flash.current = null;
    requestAnimationFrame(() => {
      if (f.focus) focusEl(document.getElementById(f.focus));
      if (f.toast) toast.current?.show(f.toast);
    });
  }, [ready]);
  const wasOnline = useRef(online);
  useEffect(() => {
    if (wasOnline.current && !online && ready) say("You're offline. Ticking things off and adding places still work.");
    wasOnline.current = online;
  }, [online, ready]);
  const focusPrimary = useCallback(() => {
    const p = document.getElementById("primary");
    if (p && p.offsetParent !== null) focusEl(p);
    else focusHeading();
  }, []);

  // ---------- tabs (< 64rem) / columns ----------
  const tab: Tab = search.view ?? "plan";
  function selectTab(t: Tab, o: { focus?: boolean; user?: boolean } = {}) {
    const changed = t !== tab;
    if (search.view !== t) void navigate({ search: (s) => ({ ...s, view: t }), replace: true });
    if (o.focus) focusEl(document.getElementById(`td-tab-${t}`));
    if (changed && o.user) requestAnimationFrame(scrollTabsIntoView);
  }
  function scrollTabsIntoView() {
    const list = document.getElementById("td-tabs");
    if (!list || !list.offsetParent) return;
    const min = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const top = list.getBoundingClientRect().top;
    if (top < min)
      window.scrollTo({ top: window.scrollY + top - min - 8, behavior: reducedMotion() ? "auto" : "smooth" });
  }
  // The in-page links: select the tab on phones (replace), scroll the column on wide; never push history (ia §2).
  function reveal(t: Tab, el?: HTMLElement | null, find?: () => HTMLElement | null) {
    if (!wide) selectTab(t);
    setTimeout(() => {
      const target = el ?? find?.() ?? document.getElementById(`td-h-${t}`);
      if (!target) return;
      const heading = target.classList.contains("td-ph");
      target.scrollIntoView({
        block: wide || heading ? "start" : "center",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
      if (!wide && heading) scrollTabsIntoView();
      focusEl(target);
    }, 60);
  }
  function showEntry(id: string) {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    if (kind === "now" && e.date && e.date < today && !earlierOpen) setEarlierOpen(true);
    reveal("plan", null, () => document.querySelector<HTMLElement>(`[data-act="entry"][data-id="${CSS.escape(id)}"]`));
  }
  function onTabKey(ev: React.KeyboardEvent<HTMLButtonElement>) {
    const i = TABS.indexOf(ev.currentTarget.id.replace("td-tab-", "") as Tab);
    const rtl = getComputedStyle(ev.currentTarget).direction === "rtl";
    let n: number | null = null;
    if (ev.key === "ArrowRight") n = rtl ? i - 1 : i + 1;
    else if (ev.key === "ArrowLeft") n = rtl ? i + 1 : i - 1;
    else if (ev.key === "Home") n = 0;
    else if (ev.key === "End") n = TABS.length - 1;
    if (n === null) return;
    ev.preventDefault();
    selectTab(TABS[(n + TABS.length) % TABS.length]!, { focus: true, user: true });
  }
  // Resizing across 64 rem hides the tablist: focus moves to the column's h2 (a11y minor 5). A panel with nothing
  // focusable in it gets a Tab stop of its own (ARIA tabs pattern).
  const wasWide = useRef(wide);
  useLayoutEffect(() => {
    if (wide && !wasWide.current && document.activeElement?.getAttribute("role") === "tab")
      focusEl(document.getElementById(`td-h-${tab}`));
    wasWide.current = wide;
    for (const t of TABS) {
      const panel = document.getElementById(`td-panel-${t}`);
      if (!panel) continue;
      if (!wide && !panel.querySelector("button:not([hidden]), a[href], input, select")) panel.tabIndex = 0;
      else panel.removeAttribute("tabindex");
    }
  });

  // ---------- the tick: the light leaves the row ----------
  function tickEntry(e: EntryItem) {
    if (!trip) return;
    const done = !e.doneAt;
    if (done && nn.now?.id === e.id && !reducedMotion()) {
      setLeaving(e.id);
      setTimeout(() => setLeaving(null), tokenMs("--dur-light"));
    }
    writes.setEntryDone({ tripId, id: e.id, done, actorId: me.user.id, at: new Date().toISOString() });
  }

  async function retryPage() {
    if (retrying) return;
    setRetrying(true);
    await Promise.all([fullQ.refetch(), listQ.refetch()]);
    setRetrying(false);
    requestAnimationFrame(focusHeading);
  }

  // ---------- states without a trip ----------
  const upLink = (
    <div className="td-top">
      <Link className="td-back" to="/trips" aria-label="Back to Trips">
        <Icon name="chevron-left" />
        <span>Trips</span>
      </Link>
    </div>
  );
  const toastEl = <Toast ref={toast} onHiddenWithFocus={focusPrimary} />;
  if (view === "loading") return <Loading />;
  if (view === "error")
    return (
      <div className="td td--state">
        {upLink}
        <div className="td-state">
          <h1 className="title-lg" tabIndex={-1}>
            This trip didn&apos;t load
          </h1>
          <p>Check your connection and try again.</p>
          <button
            className="btn-primary"
            type="button"
            data-act="retry"
            data-id="page"
            aria-disabled={retrying ? true : undefined}
            onClick={retryPage}
          >
            <Icon name="refresh" />
            {retrying ? "Trying again" : "Try again"}
          </button>
          <p className="vh" role="alert">
            This trip didn&apos;t load. Try again.
          </p>
        </div>
        {toastEl}
      </div>
    );
  if (view === "notfound" || !trip)
    return (
      <div className="td td--state">
        <div className="td-state">
          <h1 className="title-lg" tabIndex={-1}>
            This trip isn&apos;t here any more
          </h1>
          <p>It may have been deleted.</p>
          <Link className="btn-primary" to="/trips">
            Back to Trips
          </Link>
        </div>
        {toastEl}
      </div>
    );

  const ctx: DetailCtx = {
    trip,
    mode,
    entries,
    places,
    items,
    kind,
    today,
    nn,
    offline,
    currency,
    cloudName,
    mad,
    people,
    myId: me.user.id,
    primary,
    leaving,
    earlierOpen,
    setEarlierOpen,
    tickEntry,
    writes,
    openEntryForm: (date) => void navigate({ search: (s) => ({ ...s, entry: "new", date }) }),
    openPlaceForm: () => void navigate({ search: (s) => ({ ...s, place: "new" }) }),
    openScheduleForm: (id) => void navigate({ search: (s) => ({ ...s, schedule: id }) }),
    showEntry,
    reveal: (t, el) => reveal(t, el),
    // The edit route's `focus` search (dates | budget) is the form's to declare.
    editTo: (focus) => ({
      to: "/trips/$tripId/edit",
      params: { tripId },
      search: (focus ? { focus } : {}) as never,
    }),
  };
  const partial = mode === "partial";
  const cached = mode === "notcached";

  return (
    <TripDialogsHost tripId={tripId} toast={(o) => toast.current?.show(o)}>
      <DetailContext.Provider value={ctx}>
        <div className={`td td--${kind}${partial ? " is-partial" : ""}`}>
          <section className="td-sum" aria-label="Summary">
            <div className="td-top" id="td-top">
              <Top onEdit={() => markTripEditFrom(tripId)} />
            </div>
            <div className="td-door" id="td-door">
              <Door />
            </div>
            <div className="td-id" id="td-id">
              <Identity />
            </div>
            <div className="td-when" id="td-when">
              <When isNextTrip={isNextTrip} />
            </div>
            {/* The list holds identity and status only: no notes, What's left or budget until the trip loads. */}
            <div className="td-notes" id="td-notes">
              {!cached && trip.notes ? <Notes text={trip.notes} /> : null}
            </div>
            <div className="td-left" id="td-left">
              {partial ? <span className="sk td-sk-line" aria-hidden="true" /> : cached ? null : <Left />}
            </div>
            <div className="td-bud" id="td-bud">
              {partial ? (
                <>
                  <span className="sk td-sk-line" aria-hidden="true" />
                  <span className="sk td-sk-bar" aria-hidden="true" />
                </>
              ) : cached ? null : (
                <BudgetBlock />
              )}
            </div>
            <div className="dock" id="td-dock" hidden={!primary}>
              <button
                className="btn-primary"
                type="button"
                id="primary"
                data-act={primary?.act}
                onClick={() => (primary?.act === "new-entry" ? ctx.openEntryForm() : ctx.openPlaceForm())}
              >
                {primary && (
                  <>
                    <Icon name="plus" />
                    {primary.text}
                  </>
                )}
              </button>
            </div>
            {toastEl}
          </section>
          <div className="td-notice" id="td-notice">
            {offline && (
              <p className="notice">
                <Icon name="cloud-off" />
                <span>
                  <span className="td-notice-short">Offline. Ticks and new places sync later.</span>
                  <span className="td-notice-full">
                    <span className="td-notice-line">
                      You&apos;re offline. Showing the latest data on this phone. Ticking things off and adding places
                      still work and sync when you&apos;re back online.
                    </span>
                    <span className="td-notice-line">
                      Adding to the plan or the checklist, editing and deleting need a connection.
                    </span>
                  </span>
                </span>
              </p>
            )}
          </div>
          <div className="td-tabs" role="tablist" aria-label="Plan, places and prep" id="td-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className="td-tab"
                type="button"
                role="tab"
                id={`td-tab-${t}`}
                aria-controls={`td-panel-${t}`}
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => selectTab(t, { user: true })}
                onKeyDown={onTabKey}
              >
                {TAB_NAME[t]}
              </button>
            ))}
          </div>
          <div className="td-panels">
            {(
              [
                ["plan", <PlanPanel key="plan" />],
                ["places", <PlacesPanel key="places" />],
                ["prep", <PrepPanel key="prep" />],
              ] as const
            ).map(([t, panel]) => (
              <section
                key={t}
                className={`td-panel td-panel--${t}${tab === t ? " is-selected" : ""}`}
                id={`td-panel-${t}`}
                role={wide ? undefined : "tabpanel"}
                aria-labelledby={wide ? undefined : `td-tab-${t}`}
              >
                {panel}
              </section>
            ))}
          </div>
        </div>
      </DetailContext.Provider>
    </TripDialogsHost>
  );
}

/** The loading skeleton (detail.js renderLoading), announced after a beat. */
function Loading() {
  const { tripId } = Route.useParams();
  const listQ = useQuery(tripsQuery);
  const t = listQ.data?.trips.find((x) => x.id === tripId);
  const photo = !!t?.cover && !!listQ.data?.images;
  const [text, setText] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setText("Loading trip"), 50);
    return () => clearTimeout(id);
  }, []);
  useNoFab(true);
  return (
    <div className="td td--loading" aria-busy="true">
      <section className="td-sum" aria-label="Summary">
        <div className="td-top">
          <Link className="td-back" to="/trips" aria-label="Back to Trips">
            <Icon name="chevron-left" />
            <span>Trips</span>
          </Link>
        </div>
        <div className="td-door" aria-hidden="true">
          <div className={`door door--detail td-sk-door${photo ? " has-photo" : ""}`} />
        </div>
        <div className="td-id">
          <h1 className="vh" tabIndex={-1}>
            Loading trip
          </h1>
          <span className="sk td-sk-title" aria-hidden="true" />
          <span className="sk td-sk-line" aria-hidden="true" />
        </div>
        <div className="td-when" aria-hidden="true">
          <span className="sk td-sk-band" />
        </div>
        <div className="td-bud" aria-hidden="true">
          <span className="sk td-sk-line" />
          <span className="sk td-sk-bar" />
        </div>
      </section>
      <div className="td-panels">
        <div className="td-sk-rows" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="sk td-sk-row" />
          ))}
        </div>
      </div>
      <p className="vh" role="status" id="td-status">
        {text}
      </p>
    </div>
  );
}
