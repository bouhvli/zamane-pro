import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupNameOf, totals as totalsOf, type ListItem } from "../../../shared/shopping-list.ts";
import { setTitle } from "../../lib/announce.ts";
import { isApiError } from "../../lib/api.ts";
import { day } from "../../lib/goals.ts";
import { focusHeading, useArrival } from "../../lib/nav.ts";
import { useOnline } from "../../lib/online.ts";
import {
  clearBoughtItems,
  deleteShoppingItem,
  dropShoppingItems,
  invalidateShopping,
  putShoppingItems,
  removeQueuedAdd,
  restoreShoppingItems,
  useShoppingData,
  useShoppingWrites,
  type NewItem,
  type ShoppingItem,
} from "../../lib/shopping.ts";
import { Icon } from "../Icon.tsx";
import { useShopConfirm } from "./Confirm.tsx";
import { ItemForm, type FinishOpts, type FormHandle } from "./ItemForm.tsx";
import { ItemSheet } from "./ItemSheet.tsx";
import { DoneView, GroupView, Summary } from "./ListParts.tsx";
import { ShopToast, type ShopToastHandle } from "./ShopToast.tsx";
import { useFrozenOrder } from "./useFrozenOrder.ts";
import { announce, focusAdd, focusRow, motionOk, neighbourOf, plural } from "./util.ts";

/**
 * The Shopping list (.ux-forge/shopping list.js, direction A · Aisle ledger). The add row (docked above the bottom nav
 * on phones, in the masthead from 48 rem), the summary ("7 left to buy · 243 MAD" with a By group breakdown, a sticky
 * rail from 64 rem), category groups with dotted-leader heads and subtotals, and the Bought group with Clear bought.
 * The order is frozen while the list is on screen (useFrozenOrder; Tidy up rebuilds it). States: loading, error, empty,
 * all bought, offline (cached rows; an add and a tick still queue), stale (a refresh failed), solo (no avatars).
 * The item sheet has one history entry (location.state.shopSheet), a confirmation has another (shopConfirm), the form
 * is the URL (?item=new|<id>[&name=]). Phase 5 (realtime) will call invalidateShopping from the socket and name the
 * partner in announcements; today a partner's changes arrive with the next refetch and are announced politely.
 */
/** "Updated 12 min ago" for a list the device couldn't refresh. */
function updatedAgo(at: number): string {
  const m = Math.floor((Date.now() - at) / 60_000);
  if (m < 1) return "";
  if (m < 60) return `Updated ${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `Updated ${h} h ago` : `Updated ${day(new Date(at))}`;
}

export interface ShoppingSearch {
  item?: string;
  name?: string;
}

export function ShoppingList({ search }: { search: ShoppingSearch }) {
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate({ from: "/shopping" });
  const online = useOnline();
  const { q, items, people } = useShoppingData();
  const writes = useShoppingWrites();
  const confirm = useShopConfirm();
  const toast = useRef<ShopToastHandle>(null);
  const order = useFrozenOrder(items);
  const { layout } = order;

  const view: "loading" | "error" | "ready" = items ? "ready" : q.isError ? "error" : "loading";
  const stale = !!items && q.isRefetchError && online;
  const offline = !!items && !online;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ---------- arrival, title, busy ----------
  useArrival((first) => {
    if (!first) focusHeading();
  });
  const empty = view === "ready" && items!.length === 0;
  useEffect(() => {
    setTitle(
      view === "loading"
        ? "Loading"
        : view === "error"
          ? "Can't load Shopping"
          : offline
            ? "Shopping (offline)"
            : "Shopping",
    );
  }, [view, offline]);
  useEffect(() => {
    const main = document.getElementById("main");
    main?.setAttribute("aria-busy", view === "loading" ? "true" : "false");
    return () => main?.removeAttribute("aria-busy");
  }, [view]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (view !== "loading") {
      setStatus("");
      return;
    }
    const t = setTimeout(() => setStatus("Loading the list"), 150);
    return () => clearTimeout(t);
  }, [view]);

  // ---------- derived ----------
  const live = useMemo(() => (items ?? []) as ListItem[], [items]);
  const totals = useMemo(() => (items ? totalsOf(live) : null), [items, live]);
  const map = useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items]);
  const moves = items ? order.moves(map) : 0;
  const syncing = !!items?.some((i) => i.pending);
  const boughtCount = totals?.boughtCount ?? 0;
  const rowsOf = (ids: string[]) => ids.map((id) => order.byId(id)).filter((i): i is ShoppingItem => !!i);

  // ---------- adding: the form is the only way in (the floating button opens it) ----------
  const addItem = useCallback(
    (f: NewItem) => {
      const it = writes.addItem(f, itemsRef.current ?? []);
      order.markMine([it.id]);
      toast.current?.show({
        msg: it.pending ? `Added ${it.name}` : `Added ${it.name} to ${it.category || "Other"}`,
        ms: 4000,
      });
      return it;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- order markMine is stable
    [writes],
  );

  // ---------- ticks ----------
  const tickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** One polite sentence per burst of ticks, with the new count. The toast stays silent. */
  const announceTick = useCallback((name: string, bought: boolean) => {
    clearTimeout(tickTimer.current);
    tickTimer.current = setTimeout(() => {
      const left = totalsOf((itemsRef.current ?? []) as ListItem[]).left;
      announce(
        `${name}${bought ? " bought. " : " put back. "}${left === 0 ? "Nothing left to buy." : `${left} left to buy.`}`,
      );
    }, 400);
  }, []);
  useEffect(() => () => clearTimeout(tickTimer.current), []);
  const onTick = useCallback(
    (it: ShoppingItem, want: boolean) => {
      writes.setBought(it.id, want);
      announceTick(it.name, want);
      if (want)
        toast.current?.show({
          msg: `Bought ${it.name}`,
          undoLabel: `Undo: Bought ${it.name}`,
          silent: true,
          undo: () => {
            writes.setBought(it.id, false);
            announceTick(it.name, false);
            focusRow(it.id);
          },
        });
    },
    [writes, announceTick],
  );

  // ---------- the summary, Tidy up, Bought ----------
  const [doneChoice, setDoneChoice] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const tidyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(tidyTimer.current), []);
  const tidy = (silent = false) => {
    if (!layout || !moves) return 0;
    const n = moves;
    const apply = () => {
      order.tidy();
      setLeaving(new Set());
      if (!silent) {
        const el = document.querySelector<HTMLElement>("#sum .sum-toggle, #sum .sum-count");
        setTimeout(() => el && document.contains(el) && el.focus({ preventScroll: true }), 0);
      }
      announce(`Moved ${n} ${plural(n, "item", "items")}.`);
    };
    if (silent || !motionOk()) {
      apply();
      return n;
    }
    setLeaving(
      new Set(
        [...layout.groups.flatMap((g) => g.ids), ...layout.done].filter((id) => {
          const it = map.get(id);
          return it && (layout.done.includes(id) ? !it.boughtAt : !!it.boughtAt);
        }),
      ),
    );
    tidyTimer.current = setTimeout(apply, 150);
    return n;
  };

  // ---------- history: the sheet and the confirmations ----------
  const locState = useRouterState({ select: (s) => s.location.state });
  const sheetId = locState.shopSheet;
  const lastSheetItem = useRef<ShoppingItem | null>(null);
  const sheetItem = sheetId ? (map.get(sheetId) ?? null) : null;
  if (sheetItem) lastSheetItem.current = sheetItem;
  if (!sheetId) lastSheetItem.current = null;
  const [sheetBusy, setSheetBusy] = useState(false);
  const sheetAlert = useRef<HTMLParagraphElement>(null);
  const skipFocus = useRef(false);
  const prevSheet = useRef<string | undefined>(undefined);
  const openSheet = useCallback(
    (id: string) => {
      if (router.history.location.state?.shopSheet) return;
      const loc = router.state.location;
      router.history.push(loc.href, { ...loc.state, shopSheet: id });
    },
    [router],
  );
  const closeSheet = useCallback(
    (o?: { noFocus?: boolean }) => {
      if (o?.noFocus) skipFocus.current = true;
      if (router.history.location.state?.shopSheet) router.history.back();
    },
    [router],
  );
  // Focus returns to the row when the sheet closes (Back included)
  useEffect(() => {
    const prev = prevSheet.current;
    prevSheet.current = sheetId;
    if (prev && !sheetId) {
      setSheetBusy(false);
      if (skipFocus.current) skipFocus.current = false;
      else focusRow(prev);
    }
  }, [sheetId]);
  // A stale history entry (a reload after the row was deleted): drop it
  useEffect(() => {
    if (sheetId && items && !sheetItem && !lastSheetItem.current) {
      const loc = router.state.location;
      router.history.replace(loc.href, { ...loc.state, shopSheet: undefined });
    }
  }, [sheetId, items, sheetItem, router]);
  useEffect(() => {
    if (router.history.location.state?.shopConfirm && !confirm.isOpen()) {
      const loc = router.state.location;
      router.history.replace(loc.href, { ...loc.state, shopConfirm: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  // ---------- Undo of a delete or of clear bought: restore ----------
  const restoreRows = useCallback(
    async (rows: ShoppingItem[], okMsg: (n: number) => string) => {
      if (!navigator.onLine) {
        toast.current?.show({ msg: "Undo needs a connection.", ms: 4000 });
        return;
      }
      try {
        const r = await restoreShoppingItems(rows);
        order.markMine(r.items.map((i) => i.id));
        putShoppingItems(qc, r.items);
        invalidateShopping(qc);
        const first = r.items[0]?.id;
        setTimeout(() => focusRow(first), 80);
        toast.current?.show({ msg: okMsg(r.items.length), ms: 4000 });
      } catch {
        toast.current?.show({ msg: "Couldn't undo. Try again.", ms: 4000 });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc],
  );

  // ---------- the sheet's actions ----------
  const whoAdded = (it: ShoppingItem) => (it.createdBy === people.meId ? "You" : people.name(it.createdBy));
  async function deleteFromSheet() {
    const it = lastSheetItem.current;
    if (!it || sheetBusy) return;
    const near = neighbourOf(it.id);
    const yes = await confirm.ask({
      title: `Delete ${it.name}?`,
      body: [
        `${whoAdded(it)} added it ${day(it.createdAt)}. It will be removed${people.solo ? "." : " for both of you."}`,
      ],
      confirm: "Delete",
      cancel: "Keep it",
      okLabel: `Delete ${it.name}`,
    });
    if (!yes) return;
    setSheetBusy(true);
    try {
      await deleteShoppingItem(it.id);
      order.markMine([it.id]);
      closeSheet({ noFocus: true });
      dropShoppingItems(qc, [it.id]);
      invalidateShopping(qc);
      setTimeout(() => focusRow(near), 80);
      toast.current?.show({
        msg: `Deleted ${it.name}`,
        undoLabel: `Undo: Deleted ${it.name}`,
        undo: () => void restoreRows([it], () => `Restored ${it.name}`),
      });
    } catch (e) {
      setSheetBusy(false);
      if (isApiError(e, "not_found")) {
        closeSheet({ noFocus: true });
        dropShoppingItems(qc, [it.id]);
        invalidateShopping(qc);
        setTimeout(() => focusRow(near), 80);
        toast.current?.show({ msg: `${it.name} was already removed.`, ms: 4000 });
        return;
      }
      const l = sheetAlert.current;
      if (l) {
        l.textContent = "";
        setTimeout(() => (l.textContent = "Couldn't delete. Try again."), 50);
      }
    }
  }
  /** A queued, unsynced add (or one the server refused): cancel it, offline too; no confirm, it never reached the partner. */
  function removeQueued() {
    const it = lastSheetItem.current;
    if (!it) return;
    const near = neighbourOf(it.id);
    order.markMine([it.id]);
    removeQueuedAdd(qc, it.id);
    dropShoppingItems(qc, [it.id]);
    closeSheet({ noFocus: true });
    setTimeout(() => focusRow(near), 80);
    toast.current?.show({
      msg: `Removed ${it.name}`,
      undoLabel: `Undo: Removed ${it.name}`,
      undo: () => {
        order.markMine([it.id]);
        writes.readd(it);
        setTimeout(() => focusRow(it.id), 80);
        toast.current?.show({ msg: `Restored ${it.name}`, ms: 4000 });
      },
    });
  }
  function putBack() {
    const it = lastSheetItem.current;
    if (!it) return;
    writes.setBought(it.id, false);
    closeSheet({ noFocus: true });
    setTimeout(() => {
      focusRow(it.id);
      announce(`${it.name} is back on the list.`);
    }, 80);
  }
  function editFromSheet() {
    const it = lastSheetItem.current;
    if (!it) return;
    skipFocus.current = true;
    // The sheet's entry becomes the form's: Back from the form returns to the list
    router.history.replace(`${router.state.location.pathname}?item=${encodeURIComponent(it.id)}`, {});
  }

  // ---------- Clear bought ----------
  const clearing = useRef(0);
  const clearTexts = (n: number) => ({
    title: plural(n, `Clear ${n} bought item?`, `Clear ${n} bought items?`),
    confirm: plural(n, `Clear ${n} item`, `Clear ${n} items`),
    cancel: plural(n, "Keep it", "Keep them"),
  });
  async function clearBought() {
    if (clearing.current) return;
    if (moves) tidy(true); // the dialog's count and the group must agree
    const btn = document.querySelector<HTMLElement>('#main [data-act="clear"]');
    btn?.focus({ preventScroll: true }); // Keep it returns here
    const n = boughtCount;
    if (!n) return;
    clearing.current = n;
    const t = clearTexts(n);
    const yes = await confirm.ask({
      title: t.title,
      body: [people.solo ? "They'll be removed." : "They'll be removed for both of you."],
      confirm: t.confirm,
      cancel: t.cancel,
    });
    clearing.current = 0;
    if (!yes) return;
    try {
      const r = await clearBoughtItems();
      order.markMine(r.items.map((i) => i.id));
      dropShoppingItems(
        qc,
        r.items.map((i) => i.id),
      );
      invalidateShopping(qc);
      focusAdd();
      const c = r.items.length;
      const msg = plural(c, "Cleared 1 item", `Cleared ${c} items`);
      toast.current?.show({
        msg,
        undoLabel: `Undo: ${msg}`,
        undo: () => void restoreRows(r.items, (b) => plural(b, "Restored 1 item", `Restored ${b} items`)),
      });
    } catch {
      toast.current?.show({ msg: "Couldn't clear. Try again.", ms: 4000 });
    }
  }
  // The partner ticks (or clears) while the confirmation is open: the count follows and is announced.
  useEffect(() => {
    if (!clearing.current || boughtCount === clearing.current) return;
    if (!boughtCount) {
      confirm.dismiss();
      announce("There is nothing left to clear.");
      return;
    }
    clearing.current = boughtCount;
    const t = clearTexts(boughtCount);
    confirm.update({ title: t.title, confirm: t.confirm, cancel: t.cancel });
    announce(`The list changed. Now clearing ${boughtCount} bought ${plural(boughtCount, "item", "items")}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the count
  }, [boughtCount]);

  // ---------- the form follows the URL ----------
  const formRef = useRef<FormHandle>(null);
  const [shown, setShown] = useState<{ key: string; nameParam: string } | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const settling = useRef<{ opts: FinishOpts; key: string } | null>(null);
  const urlKey = search.item;
  const leaveUrl = useCallback(
    (replace: boolean) =>
      void navigate({
        search: (p) => ({ ...p, item: undefined, name: undefined }),
        replace,
        resetScroll: false,
      }),
    [navigate],
  );
  const settle = useCallback(() => {
    const s = settling.current;
    if (!s) return;
    settling.current = null;
    setTimeout(() => {
      s.opts.before?.();
      if (s.key !== "new" && itemsRef.current?.some((i) => i.id === s.key)) focusRow(s.key);
      else focusAdd();
      if (s.opts.say) announce(s.opts.say);
    }, 0);
  }, []);
  useEffect(() => {
    const cur = shownRef.current;
    if (urlKey) {
      if (cur && cur.key === urlKey) return;
      if (settling.current) return; // a finished form is still leaving the URL
      if (!items) return; // the list shows its own loading or error state
      const rec = urlKey === "new" ? true : (map.get(urlKey) ?? null);
      if (!rec || (rec !== true && (rec.unsynced || rec.failed))) {
        leaveUrl(true); // a deleted row, or one that hasn't synced: nothing to open
        return;
      }
      if (router.history.location.state?.shopSheet) {
        const loc = router.state.location;
        router.history.replace(loc.href, { ...loc.state, shopSheet: undefined });
      }
      setShown({ key: urlKey, nameParam: urlKey === "new" ? (search.name ?? "") : "" });
      return;
    }
    if (!cur) return;
    if (settling.current) {
      setShown(null);
      settle();
      return;
    }
    // Back removed the query: a form with changes pushes it again and asks; otherwise it closes
    formRef.current?.urlGone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the URL and the data arriving
  }, [urlKey, !!items]);
  const onFinish = useCallback(
    (o: FinishOpts) => {
      const cur = shownRef.current;
      if (!cur) return;
      settling.current = { opts: o, key: cur.key };
      const inUrl = !!router.state.location.search && (router.state.location.search as ShoppingSearch).item != null;
      if (!o.noNav && inUrl) {
        // Close and leave the query: back when opening pushed the entry, else replace
        if (router.history.canGoBack()) router.history.back();
        else leaveUrl(true);
      } else {
        setShown(null);
        settle();
      }
      setTimeout(() => {
        if (settling.current) {
          setShown(null);
          settle();
        }
      }, 1000);
    },
    [router, leaveUrl, settle],
  );
  const repush = useCallback(() => {
    const cur = shownRef.current;
    if (!cur) return;
    void navigate({
      search: (p) => ({
        ...p,
        item: cur.key,
        name: cur.key === "new" ? cur.nameParam || undefined : undefined,
      }),
      resetScroll: false,
    });
  }, [navigate]);
  // ---------- notices ----------
  const refresh = useCallback(() => void q.refetch(), [q]);
  const [retrying, setRetrying] = useState(false);
  const retry = useCallback(async () => {
    setRetrying(true);
    await q.refetch();
    setRetrying(false);
    focusHeading();
  }, [q]);
  const staleText = !!items && (offline || stale) ? updatedAgo(q.dataUpdatedAt) : "";

  // ---------- render ----------
  const hasGroups = !!layout && layout.groups.length > 0;
  const doneRows = layout ? rowsOf(layout.done) : [];
  const doneOpen = !hasGroups ? true : (doneChoice ?? doneRows.length <= 5);
  const sumHidden = view === "error" || (view === "ready" && !totals?.any);

  const body = () => {
    if (view === "loading")
      return (
        <div className="list-sk" aria-hidden="true">
          <span className="sk sk-h2" />
          <SkRow />
          <SkRow />
          <SkRow />
          <span className="sk sk-h2" />
          <SkRow />
          <SkRow />
        </div>
      );
    if (view === "error")
      return (
        <div className="list-error">
          <div role="alert">
            <h2 className="title">The list didn&apos;t load.</h2>
            <p>You can still add items. They&apos;ll show up here once the list loads.</p>
          </div>
          <button
            className="btn-sec"
            type="button"
            aria-disabled={retrying || undefined}
            onClick={() => !retrying && void retry()}
          >
            {retrying ? "Trying again" : "Try again"}
          </button>
        </div>
      );
    return (
      <>
        {offline && (
          <p className="notice list-notice">
            <Icon name="cloud-off" />
            <span>
              You&apos;re offline. Showing the latest data on this phone. Adding items and ticking them off still work
              and sync when you&apos;re back online. Editing, deleting and clearing bought items need a connection.
            </span>
          </p>
        )}
        {stale && (
          <div className="notice list-notice notice-stale">
            <Icon name="refresh" />
            <span>Couldn&apos;t refresh. Showing the latest data on this phone.</span>
            <button className="link-btn" type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}
        {staleText && <p className="stale-note caption">{staleText}</p>}
        {empty ? (
          <div className="empty">
            <h2 className="title">Nothing on the list yet.</h2>
            <p>{people.solo ? "Add what you need." : "Add what you need and you'll both see it."}</p>
          </div>
        ) : (
          layout && (
            <>
              {!hasGroups && layout.done.length > 0 && (
                <p className="allbought">
                  Everything on the list is bought. Add more below, or clear the bought items.
                </p>
              )}
              {hasGroups && (
                <section className="groups" aria-label="Shopping list">
                  {layout.groups.map((g, i) => (
                    <GroupView
                      key={g.key || "other"}
                      index={i}
                      keyOf={g.key}
                      name={groupNameOf(rowsOf(g.ids))}
                      rows={rowsOf(g.ids)}
                      fresh={order.fresh}
                      leaving={leaving}
                      onTick={onTick}
                      onOpen={openSheet}
                    />
                  ))}
                </section>
              )}
              <DoneView
                rows={doneRows}
                hasGroups={hasGroups}
                open={doneOpen}
                offline={offline}
                syncing={syncing}
                fresh={order.fresh}
                leaving={leaving}
                onToggle={() => setDoneChoice(!doneOpen)}
                onClear={() => void clearBought()}
                onTick={onTick}
                onOpen={openSheet}
              />
            </>
          )
        )}
      </>
    );
  };

  const sheetOpen = !!sheetId && !!lastSheetItem.current;
  const sheetGone = sheetOpen && !sheetItem && !sheetBusy ? { by: people.partnerId } : null;

  return (
    <div className="list-view">
      <a
        className="skip skip-add"
        href="#primary"
        onClick={(e) => {
          e.preventDefault();
          focusAdd();
        }}
      >
        Skip to add item
      </a>
      <div className="masthead">
        <h1 className="title-lg" id="list-h1" tabIndex={-1}>
          Shopping
        </h1>
        {view === "ready" && (
          <div className="dock">
            <Link className="btn-primary" id="primary" to="/shopping" search={{ item: "new" }}>
              <Icon name="plus" />
              Add item
            </Link>
          </div>
        )}
      </div>
      <div className="list-layout">
        <div id="sum" className="sum" hidden={sumHidden}>
          <Summary loading={view === "loading"} totals={totals} moves={moves} onTidy={() => tidy()} />
        </div>
        <div id="body" className="list-body" aria-busy={view === "loading"}>
          {body()}
        </div>
      </div>
      <p className="vh" id="list-status" role="status">
        {status}
      </p>

      <ItemSheet
        open={sheetOpen}
        item={lastSheetItem.current}
        gone={sheetGone}
        people={people}
        online={online}
        busy={sheetBusy}
        alertRef={sheetAlert}
        onClose={() => closeSheet()}
        onEdit={editFromSheet}
        onDelete={() => void deleteFromSheet()}
        onRemoveQueued={removeQueued}
        onRetry={() => lastSheetItem.current && writes.retryAdd(lastSheetItem.current.id)}
        onPutBack={putBack}
      />
      {shown && items && (
        <ItemForm
          key={shown.key}
          ref={formRef}
          targetKey={shown.key}
          nameParam={shown.nameParam}
          items={items}
          people={people}
          online={online}
          ask={confirm.ask}
          onAdd={(f) => addItem(f)}
          onFinish={onFinish}
          onRepush={repush}
        />
      )}
      {confirm.node}
      <ShopToast ref={toast} onHiddenWithFocus={focusAdd} />
    </div>
  );
}

function SkRow() {
  return (
    <div className="sk-row">
      <span className="sk sk-tick" />
      <span className="sk-text">
        <span className="sk sk-line" />
        <span className="sk sk-line short" />
      </span>
    </div>
  );
}
