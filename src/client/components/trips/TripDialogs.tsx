import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isApiError } from "../../lib/api.ts";
import { useOnline } from "../../lib/online.ts";
import { tripQuery } from "../../lib/trips.ts";
import type { ToastOptions } from "../Toast.tsx";
import { useTripActions } from "./dialogs/actions.ts";
import { captureOpener, land, sel, usePeople, type Opener } from "./dialogs/common.tsx";
import { useConfirm } from "./dialogs/Confirm.tsx";
import { FormDialog, type FinishOpts, type FormHandle, type FormTarget } from "./dialogs/FormDialog.tsx";
import { ReadSheet, type SheetNav, type SheetState } from "./dialogs/ReadSheet.tsx";

/**
 * The in-trip dialogs (.ux-forge/trips dialogs.js, Z.dialogs): read sheets for a plan item, a place and a
 * checklist item (opened by id, not in the URL) and the URL-backed forms (?entry=new|<id>[&date=], ?place=new|<id>,
 * ?schedule=<placeId>). The trip page wraps its content in <TripDialogsHost> and opens sheets through
 * useTripDialogs(); the host renders the dialogs and follows the URL's query.
 *
 * This file is the contract between the detail page and the dialogs; the dialogs' implementation fills the host.
 * The detail page owns the one Toast (it sits right after the floating primary in the DOM) and hands the host a
 * `toast` function, so a dialog's "Removed X from the plan" shows there.
 */
export interface TripDialogsApi {
  entrySheet(id: string): void;
  placeSheet(id: string): void;
  itemSheet(id: string): void;
  closeAll(): void;
}

const none: TripDialogsApi = { entrySheet() {}, placeSheet() {}, itemSheet() {}, closeAll() {} };
export const TripDialogsContext = createContext<TripDialogsApi>(none);
export const useTripDialogs = () => useContext(TripDialogsContext);

const ROUTE_ID = "/_app/trips/$tripId/" as const;
const FULL_PATH = "/trips/$tripId/" as const;

/** Which form the URL names (entry before place before schedule, like keyOf). */
function targetOf(s: { entry?: string; place?: string; schedule?: string; date?: string }): FormTarget | null {
  if (s.entry) return { kind: "entry", key: s.entry, dateParam: s.date };
  if (s.place) return { kind: "place", key: s.place };
  if (s.schedule) return { kind: "schedule", key: s.schedule };
  return null;
}
const sameTarget = (a: FormTarget | null, b: FormTarget | null) => a?.kind === b?.kind && a?.key === b?.key;

export function TripDialogsHost({
  tripId,
  toast,
  children,
}: {
  tripId: string;
  toast: (o: ToastOptions) => void;
  children: ReactNode;
}) {
  const search = useSearch({ from: ROUTE_ID });
  const navigate = useNavigate({ from: FULL_PATH });
  const router = useRouter();
  const q = useQuery(tripQuery(tripId));
  const data = q.data;
  const tripGone = q.isError && isApiError(q.error, "not_found");
  const online = useOnline();
  const people = usePeople();
  const actions = useTripActions(tripId, toast);
  const confirm = useConfirm();

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const formRef = useRef<FormHandle>(null);
  const nextOpener = useRef<Opener | null>(null);
  const settling = useRef<{ opener: Opener | null; o: FinishOpts; timer?: ReturnType<typeof setTimeout> } | null>(null);

  // ----- the form follows the URL -----
  const urlTarget = targetOf(search);
  const [shown, setShown] = useState<{ target: FormTarget; opener: Opener | null } | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const urlKey = urlTarget ? `${urlTarget.kind}:${urlTarget.key}:${urlTarget.dateParam ?? ""}` : "";
  const leaveUrl = useCallback(
    (replace: boolean, kind: FormTarget["kind"] | null) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          entry: kind === "entry" || kind === null ? undefined : prev.entry,
          date: kind === "entry" || kind === null ? undefined : prev.date,
          place: kind === "place" || kind === null ? undefined : prev.place,
          schedule: kind === "schedule" || kind === null ? undefined : prev.schedule,
        }),
        replace,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const settle = useCallback(() => {
    const p = settling.current;
    if (!p) return;
    settling.current = null;
    clearTimeout(p.timer);
    setTimeout(() => {
      // after the detail has re-rendered
      if (p.o.toast) toast(p.o.toast); // first, so the toast's scroll padding applies to the reveal
      if (p.o.after) p.o.after();
      else land(p.o.focus ?? null, p.opener, p.o.reveal);
    }, 0);
  }, [toast]);

  useEffect(() => {
    const cur = shownRef.current;
    if (urlTarget) {
      if (cur && sameTarget(cur.target, urlTarget)) return;
      if (settling.current) return; // a finished form is still leaving the URL
      if (!data) return; // the detail shows its own loading / not-found state
      // forms and sheets don't stack: close the sheet, open the form
      if (sheetRef.current) setSheet(null);
      const kind = urlTarget.kind;
      const rec =
        kind === "entry" && urlTarget.key !== "new"
          ? data.entries.find((e) => e.id === urlTarget.key)
          : kind === "place" && urlTarget.key !== "new"
            ? data.places.find((p) => p.id === urlTarget.key)
            : kind === "schedule"
              ? data.places.find((p) => p.id === urlTarget.key)
              : true;
      if (
        !rec ||
        (kind !== "entry" && rec !== true && rec.pending && (kind === "schedule" || urlTarget.key !== "new"))
      ) {
        leaveUrl(true, kind); // a deleted record, or one that hasn't synced: nothing to open
        return;
      }
      const opener = nextOpener.current ?? captureOpener();
      nextOpener.current = null;
      setShown({ target: urlTarget, opener });
      return;
    }
    if (!cur) return;
    if (settling.current) {
      // our own finish removed the query: the form is gone, settle focus
      setShown(null);
      settle();
      return;
    }
    // Back removed the query: a dirty form pushes it again and asks; otherwise it closes
    formRef.current?.urlGone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the URL and the data arriving
  }, [urlKey, !!data]);

  const onFinish = useCallback(
    (o: FinishOpts, opener: Opener | null) => {
      const cur = shownRef.current;
      if (!cur) return;
      const kind = cur.target.kind;
      settling.current = { opener, o, timer: setTimeout(() => settle(), 1000) };
      const inUrl = targetOf(router.state.location.search as Record<string, string | undefined>);
      if (!o.noNav && inUrl && inUrl.kind === kind) {
        // Close and leave the query: back if the entry was pushed by opening the form, else replace (Z.closeQuery).
        if (router.history.canGoBack()) router.history.back();
        else leaveUrl(true, kind);
      } else {
        setShown(null);
        setTimeout(settle, 0);
      }
    },
    [leaveUrl, router, settle],
  );
  // Back already removed the query (noNav): the effect above settles it; make sure it runs even if the URL was gone.
  useEffect(() => {
    if (!urlTarget && shown && settling.current) {
      setShown(null);
      settle();
    }
  }, [urlTarget, shown, settle]);

  const repush = useCallback(() => {
    const cur = shownRef.current;
    if (!cur) return;
    const t = cur.target;
    void navigate({
      search: (prev) => ({ ...prev, [t.kind]: t.key, date: t.kind === "entry" ? t.dateParam : prev.date }),
      resetScroll: false,
    });
  }, [navigate]);

  // ----- "Show in the plan": the Plan tab on phones, then the row -----
  const showInPlan = useCallback(
    (entryId: string) => {
      const s = sel("entry", entryId);
      const find = () => document.getElementById("main")?.querySelector<HTMLElement>(s);
      const visibleRow = () => {
        const el = find();
        return el && el.getClientRects().length > 0 ? el : null;
      };
      if (!visibleRow())
        void navigate({ search: (prev) => ({ ...prev, view: "plan" }), replace: true, resetScroll: false });
      setTimeout(() => {
        const el = visibleRow() ?? find();
        if (el) {
          el.scrollIntoView({ block: "center" });
          el.focus({ preventScroll: true });
        } else land(null, null);
      }, 50);
    },
    [navigate],
  );

  // ----- the sheets -----
  const openSheet = useCallback((kind: SheetState["kind"], id: string, opener?: Opener | null) => {
    if (shownRef.current) return; // forms and sheets don't stack (ia §6.5)
    setSheet({ kind, id, opener: opener !== undefined ? opener : (sheetRef.current?.opener ?? captureOpener()) });
  }, []);
  const closeSheet = useCallback((o?: { noFocus?: boolean }) => {
    const s = sheetRef.current;
    if (!s) return;
    setSheet(null);
    if (!o?.noFocus) setTimeout(() => land(null, s.opener), 0);
  }, []);
  const api = useMemo<TripDialogsApi>(
    () => ({
      entrySheet: (id) => openSheet("entry", id),
      placeSheet: (id) => openSheet("place", id),
      itemSheet: (id) => openSheet("item", id),
      closeAll: () => closeSheet({ noFocus: true }),
    }),
    [openSheet, closeSheet],
  );
  const nav: SheetNav = {
    edit(kind, id, opener) {
      closeSheet({ noFocus: true });
      nextOpener.current = opener; // the form returns focus to the row, not to the closed sheet
      void navigate({ search: (prev) => ({ ...prev, [kind]: id }), resetScroll: false });
    },
    schedule(id, opener) {
      closeSheet({ noFocus: true });
      nextOpener.current = opener;
      void navigate({ search: (prev) => ({ ...prev, schedule: id }), resetScroll: false });
    },
    showInPlan(entryId) {
      closeSheet({ noFocus: true });
      showInPlan(entryId);
    },
    fromPlace(placeId) {
      openSheet("place", placeId, sheetRef.current?.opener ?? null);
    },
  };

  // The trip itself deleted while a sheet is open: sheets close (the detail swaps to its own message).
  useEffect(() => {
    if (tripGone && sheetRef.current) closeSheet({ noFocus: true });
  }, [tripGone, closeSheet]);

  return (
    <TripDialogsContext.Provider value={api}>
      {children}
      <ReadSheet
        tripId={tripId}
        sheet={sheet}
        data={data}
        people={people}
        online={online}
        actions={actions}
        ask={confirm.ask}
        toast={toast}
        nav={nav}
        close={closeSheet}
      />
      {shown && data && (
        <FormDialog
          key={`${shown.target.kind}:${shown.target.key}`}
          ref={formRef}
          tripId={tripId}
          target={shown.target}
          data={data}
          people={people}
          online={online}
          actions={actions}
          ask={confirm.ask}
          opener={shown.opener}
          onFinish={onFinish}
          onRepush={repush}
          onShowInPlan={showInPlan}
          tripGone={tripGone}
        />
      )}
      {confirm.node}
    </TripDialogsContext.Provider>
  );
}
