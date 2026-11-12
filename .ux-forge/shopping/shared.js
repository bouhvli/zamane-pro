/* Zamane Shopping prototype: the shared layer (window.Z).
   Plain script, no modules (file:// must work). Loaded first by shopping.html; list.js registers the view with
   Z.view('list', {...}); part 2 (dialogs.js, form.js) replaces the Z.dialogs stub below.
   Adapted from .ux-forge/trips/shared.js: the plumbing (toast, confirm, focus, dialog helpers, routing, offline) is the
   same; the data, derived values and writes are Shopping's. Direction: A · Aisle ledger + C's pencil stroke (decision.md).

   ─── API summary (read this, not the whole file) ──────────────────────────────────────────
   Flags (set once from ?state=, global for the session):
     Z.state            the raw ?state= value ('populated' if none). Fixtures: populated · empty · all-bought · loading ·
                        error · error-cached · stale · offline · solo · live · long · frozen; the part-2 fixtures
                        (item-sheet, item-form, item-form-conflict, clear-bought-confirm, delete-confirm, …) show the
                        populated list and Z.state tells the dialogs what to open.
     Z.offline          true for 'offline' or any '*-offline'. Z.setOffline(off, {silent, message})
     Z.syncing          true while queued rows drain after going back online
     Z.solo             'solo': the partner hasn't joined (Z.members.b is null; everything is Sara's)
     Z.fixture(view)    the ?state= value if this mount is the initial route's view, else null
     Z.offlineMessage / Z.onlineMessage: a view sets its own sentence on mount (string or fn(queuedCount))
   Time: Z.now() is Mon 9 Nov 2026 13:20 (brief.md), ticking from page load. Z.today() ISO · Z.nowHM() 'HH:MM'
   Members: Z.me = 'a' (Sara). Z.members.a / .b = {id, name, initial}. Z.name(id) · Z.av(id, 'xs'|'sm'|'md'|'lg')
   Data shape (timestamps are Date):
     item  {id, name, quantity (int 1..9999), unit ('piece'|'l'|'g'|'kg'), category (display spelling as typed|null), notes,
            boughtAt|null, boughtBy|null, createdBy, createdAt, updatedAt,
            pending (an add or a tick is queued offline: "Waiting to sync"), unsynced (the ADD itself is queued),
            failed (the server rejected the queued add: "Couldn't sync")}
     "bought" = boughtAt != null. A tick does NOT bump updatedAt (ia A4), so a partner's tick never 409s an open edit.
   Reads: Z.items() (all, a copy of the array) · Z.item(id) · Z.queued() (rows with pending)
   Z.shop (derived values and helpers; ia.md §6.4):
     Z.shop.key(text)          the category key: NFKD, no diacritics, lower-case, no whitespace ('' for none = Other)
     Z.shop.spelling(text)     the stored spelling when that key exists (latest updatedAt wins), else the trimmed text
     Z.shop.categories()       [{key, name}] distinct categories, latest spelling, A→Z (the combobox suggestions)
     Z.shop.guess(name)        category of the latest earlier item with the same name key (bought items included), or null
     Z.shop.duplicate(name)    the unbought item with the same name key, or null (the "already on the list" hint)
     Z.shop.groups()           FRESH S3 order: {groups:[{key, name, items[]}], done:[items]}
                               groups A→Z (Collator base), Other (key '') last, items oldest first (createdAt, id);
                               done = bought, newest bought first. A bought item is never in a group.
     Z.shop.totals()           {any, left, boughtCount} computed from item state (not from row positions): ticked rows
                               are excluded from left at once.
     Z.shop.units / unitLabel(code) / qtyText(qty, unit)   the four units and the display string ('2 L', '500 g', '1 kg', '3 pcs', '1 pc')
     Z.shop.focusRow(id)       focus that row's body button, else the Add item button (call after a dialog closes / a delete)
     Z.shop.neighbour(id)      the id of the next row in the DOM (else the previous), or null: read it BEFORE deleting
     Z.shop.stamp(date[, lower]) 'Today, 14:32' | 'Yesterday, 09:05' | 'Mon 9 Nov, 18:20' (+ year when not this year);
                               lower = true lower-cases Today / Yesterday for "Bought today, 15:10"   Z.shop.who(id) 'Sara' | 'you' (solo)
   Writes (each returns a result and emits 'change' {type, item|items, by, source, done?}; Z.partner.* = Youssef's):
     Z.addItem({id?, name, quantity?, unit?, category?, notes?}, {pending?}) → {item, group}
          category undefined → copied from an earlier same-name item (Tesler default of the add row);
          category '' / null → none (Other); a typed spelling is replaced by the existing spelling of its key.
          Idempotent on id. Offline (or {pending:true}) the row is pending+unsynced. Emits type 'added'.
     Z.setBought(id, bought, {pending?}) → {item} | {item, noop:true} | {notFound:true}
          Set state, not toggle (replayable). Ticking an already-bought row is a no-op that KEEPS the first buyer (A1).
          Offline the row is pending. Emits 'bought' {done}.
     Z.updateItem(id, {name, quantity, unit, category, notes}, {updatedAt}) → {item} | {conflict:true, current} | {notFound:true}
          409 when updatedAt differs from the row's. Bumps updatedAt. Emits 'updated'. (The form gates offline.)
     Z.deleteItem(id) → {item: copy of the removed row} | {notFound:true}. Emits 'deleted'.
     Z.clearBought() → {items:[copies of the removed rows]}. Emits 'cleared' {items}.
     Z.restore(items) → {items} re-inserts those rows verbatim (same ids and attribution, skips ids that exist) for the
          Undo of delete / clear. Emits 'restored' {items}.
     Z.on('change'|'connection'|'route', fn) / Z.off(…)   'connection' {offline, synced}; 'change' also emits
          type 'synced' {item} when a queued row reaches the server.
   Formatting: Z.esc · Z.fmt(n) '9,200' · Z.day(d|iso) 'Sat 7 Nov' (+ year if not this year) · Z.time(Date) · Z.plural(n, one, other)
     Z.svg(icon[, cls]) with Z.ICON names (Lucide 1.75: basket, check, plus, minus, x, trash, pencil, cloudOff, refresh,
     chevron, chevronLeft, alert …)
   Page chrome: Z.title(text) · Z.footnote(text) · Z.setChrome('task'|'') (unused here)
   UI services: Z.announce(msg) · Z.toast({title, msg, undo, undoLabel, ms, silent}) · Z.hideToast()
        silent: no live announcement (the tick toast: the checkbox announces itself); ms: how long (default 10 s)
     Z.confirm({title, body, confirm, cancel, danger}) → Promise<boolean>; alertdialog #confirm, focus on cancel
     Z.focus(el) · Z.focusPrimary() (the Add item button) · Z.focusHeading() · Z.keepFocus(root, fn) · Z.usedPointer()
     Z.backdropClose(dialog[, onClose]) · Z.placeSheet(dialog) · Z.isPhone() · Z.topDialog()
     Dialogs: give every <dialog> a visually hidden <p class="dlg-live vh" role="status"> so Z.announce reaches it.
   Dialogs (the contract with part 2; shared.js ships a no-op stub, dialogs.js replaces it):
     Z.dialogs.itemSheet(id)               opens the READ sheet for that item (no URL)
     Z.dialogs.itemForm({id|null})         opens the form at ?item=new|<id>
     Z.dialogs.fromRoute(route)            true if it opened (or kept open) a URL dialog for ?item=; called by the list in
                                           mount() and update()
     Z.dialogs.closeAll()
     Optional: Z.dialogs.clearBought()     if present the list calls it instead of its built-in Clear bought confirm.
     Forms close by popping their query: Z.closeQuery('item'). After they add or change an item they only call the
     writes above; the list reacts to 'change' (layout, toast "Added … to …", announcements).
   Routing (hash): #/shopping, query inside the hash (?focus=add, ?item=new|<id>).
     Z.route = {view, path, query} · Z.go(hash, {replace}) · Z.canGoBack() · Z.back()
     Z.withQuery(changes) → hash for the current path with query keys set/removed (null removes)
     Z.closeQuery(key) pops a dialog's query (history.back when we pushed it, else replace)
   Views: Z.view(name, {mount(root, route), update?(route) → true if handled, unmount?()})
   ───────────────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var Z = window.Z = {};
  var P = new URLSearchParams(location.search);
  Z.state = P.get('state') || 'populated';
  Z.offline = /(^|-)offline$/.test(Z.state);
  Z.syncing = false;
  Z.solo = Z.state === 'solo';
  function $(s, r) { return (r || document).querySelector(s); }
  Z.$ = $;

  // ---------- events ----------
  var handlers = {};
  Z.on = function (t, fn) { (handlers[t] = handlers[t] || []).push(fn); };
  Z.off = function (t, fn) { handlers[t] = (handlers[t] || []).filter(function (f) { return f !== fn; }); };
  Z.emit = function (t, detail) { (handlers[t] || []).slice().forEach(function (fn) { fn(detail); }); };

  // ---------- time ----------
  var BASE = new Date(2026, 10, 9, 13, 20);
  var LOADED = Date.now();
  Z.now = function () { return new Date(BASE.getTime() + (Date.now() - LOADED)); };
  function D(y, m, d, h, mi) { return new Date(y, m - 1, d, h == null ? 12 : h, mi || 0); }
  Z.D = D;
  function pad(n) { return String(n).padStart(2, '0'); }
  Z.isoDate = function (d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  Z.dateOf = function (iso) { if (iso instanceof Date) return iso; var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0); };
  Z.today = function () { return Z.isoDate(Z.now()); };
  Z.nowHM = function () { var n = Z.now(); return pad(n.getHours()) + ':' + pad(n.getMinutes()); };
  function dayDiff(a, b) { return Math.round((Z.dateOf(b) - Z.dateOf(a)) / 864e5); }
  Z.dayDiff = dayDiff;

  // ---------- formatting ----------
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  Z.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  Z.fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  Z.plural = function (n, one, other) { return n === 1 ? one : other; };
  function yearSuffix(d) { return d.getFullYear() === Z.now().getFullYear() ? '' : ' ' + d.getFullYear(); }
  Z.day = function (d) { d = typeof d === 'string' ? Z.dateOf(d) : new Date(d); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()] + yearSuffix(d); };
  Z.time = function (d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  // ---------- icons (Lucide, stroke 1.75) ----------
  Z.ICON = {
    chevron: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    cloudOff: '<path d="M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057"/><path d="M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78"/><path d="m2 2 20 20"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    basket: '<path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/>',
    other: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>'
  };
  Z.svg = function (name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (Z.ICON[name] || Z.ICON.other) + '</svg>'; };

  // ---------- members ----------
  Z.me = 'a';
  Z.members = { a: { id: 'a', name: 'Sara', initial: 'S' }, b: Z.solo ? null : { id: 'b', name: 'Youssef', initial: 'Y' } };
  Z.name = function (id) { var m = Z.members[id]; return m ? m.name : 'Youssef'; };
  Z.av = function (id, size) { return '<span class="zm-av zm-av-' + id + ' zm-av-' + (size || 'sm') + '" aria-hidden="true">' + (id === 'a' ? 'S' : 'Y') + '</span>'; };

  // ---------- the shop namespace ----------
  var Shop = Z.shop = {};
  Shop.key = function (s) { return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ''); };
  var collator = new Intl.Collator('en', { sensitivity: 'base' });
  Shop.who = function (id) { return Z.solo ? 'you' : Z.name(id); };
  // The row's date and hour: "Today, 14:32" · "Yesterday, 09:05" · "Mon 9 Nov, 18:20" (year only when not this year).
  // lower: "Bought today, 15:10" (only Today / Yesterday change case).
  Shop.stamp = function (d, lower) {
    d = new Date(d);
    var diff = dayDiff(Z.isoDate(d), Z.isoDate(Z.now())), day = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : Z.day(d);
    if (lower && diff >= 0 && diff <= 1) day = day.toLowerCase();
    return day + ', ' + Z.time(d);
  };
  // Units (stored codes) and how a quantity reads: "2 L", "500 g", "1 kg", "3 pcs", "1 pc".
  Shop.units = [{ code: 'piece', label: 'Piece' }, { code: 'l', label: 'Litre (L)' }, { code: 'g', label: 'Gram (g)' }, { code: 'kg', label: 'Kilogram (kg)' }];
  Shop.unitLabel = function (code) { var u = Shop.units.filter(function (x) { return x.code === code; })[0]; return u ? u.label : 'Piece'; };
  Shop.qtyText = function (q, unit) {
    var n = Z.fmt(q);
    return unit === 'l' ? n + ' L' : unit === 'g' ? n + ' g' : unit === 'kg' ? n + ' kg' : n + (+q === 1 ? ' pc' : ' pcs');
  };

  // ---------- example data (brief.md). Every figure adds up; all of it is labelled on screen. ----------
  var seq = 100;
  function uid() { return 's' + (++seq); }
  function I(o) {
    return { id: o.id || uid(), name: o.name, quantity: o.qty || 1, unit: o.unit || 'piece', category: o.cat || null, notes: o.notes || '',
      boughtAt: o.boughtAt || null, boughtBy: o.boughtBy || null, createdBy: o.by || 'a', createdAt: o.at, updatedAt: o.at, pending: false, unsynced: false, failed: false };
  }
  // 7 left to buy (3 bought). Quantities carry a unit; nothing has a price.
  function seed(state) {
    var items = [
      I({ id: 'milk', name: 'Milk', qty: 2, unit: 'l', cat: 'Dairy', by: 'b', at: D(2026, 11, 4, 19, 5), boughtAt: D(2026, 11, 8, 10, 42), boughtBy: 'b' }),
      I({ id: 'coffee', name: 'Coffee', qty: 500, unit: 'g', cat: 'Pantry', by: 'a', at: D(2026, 11, 5, 20, 0), boughtAt: D(2026, 11, 9, 9, 15), boughtBy: 'a' }),
      I({ id: 'sponges', name: 'Sponges', qty: 3, cat: 'Home', by: 'a', at: D(2026, 11, 5, 20, 10), boughtAt: D(2026, 11, 7, 11, 5), boughtBy: 'a' }),
      I({ id: 'butter', name: 'Butter', qty: 250, unit: 'g', cat: 'Dairy', by: 'a', at: D(2026, 11, 7, 18, 20) }),
      I({ id: 'tomatoes', name: 'Tomatoes', qty: 1, unit: 'kg', cat: 'Fruit & Veg', by: 'a', at: D(2026, 11, 7, 18, 22) }),
      I({ id: 'olive-oil', name: 'Olive oil', qty: 2, unit: 'l', cat: 'Pantry', notes: 'extra virgin, the 5 L tin if on offer', by: 'a', at: D(2026, 11, 7, 18, 25) }),
      I({ id: 'mint', name: 'Mint', qty: 1, cat: 'Fruit & Veg', notes: 'fresh, big bunch', by: 'b', at: D(2026, 11, 8, 19, 5) }),
      I({ id: 'dish-soap', name: 'Dish soap', qty: 1, cat: 'Home', by: 'a', at: D(2026, 11, 8, 19, 10) }),
      I({ id: 'rice', name: 'Rice', qty: 1, unit: 'kg', cat: 'Pantry', by: 'b', at: D(2026, 11, 8, 19, 12) }),
      I({ id: 'batteries', name: 'Batteries AA', qty: 4, by: 'b', at: D(2026, 11, 9, 8, 30) })
    ];
    if (state === 'empty') items = [];
    if (state === 'all-bought') { // 7 items, all bought
      var ids = ['milk', 'coffee', 'sponges', 'butter', 'tomatoes', 'olive-oil', 'mint'];
      items = items.filter(function (x) { return ids.indexOf(x.id) > -1; });
      items.forEach(function (x, i) { if (!x.boughtAt) { x.boughtAt = D(2026, 11, 9, 12, 40 - i * 4); x.boughtBy = i % 2 ? 'b' : 'a'; } });
    }
    if (state === 'offline') { // one queued add; the queued tick is applied by the list after it has built its layout
      var eggs = I({ id: 'eggs', name: 'Eggs', qty: 12, cat: 'Dairy', by: 'a', at: new Date(BASE.getTime() - 5 * 60000) });
      eggs.pending = true; eggs.unsynced = true;
      items.push(eggs);
    }
    if (state === 'long') {
      items.push(I({ id: 'long-name', name: 'Sparkling mineral water in glass bottles, the small ones for the picnic basket and the big ones for the weekend visitors', qty: 1250, unit: 'l',
        cat: 'Fresh fruit and vegetables from the Thursday souk stalls', by: 'b', at: D(2026, 11, 9, 9, 0),
        notes: 'Ask for the ones with the blue label, not the green one, and check the date on the cap before it goes in the basket; the stall near the fountain has them cold and the other one never does.' }));
      items.push(I({ id: 'long-cat', name: 'Figs', qty: 500, unit: 'g', cat: 'Fresh fruit and vegetables from the Thursday souk stalls', by: 'a', at: D(2026, 11, 9, 9, 5) }));
    }
    if (state === 'solo') items.forEach(function (x) { x.createdBy = 'a'; if (x.boughtBy) x.boughtBy = 'a'; });
    return items;
  }
  Z.data = { items: seed(Z.state) };
  function find(id) { for (var i = 0; i < Z.data.items.length; i++) if (Z.data.items[i].id === id) return Z.data.items[i]; return null; }
  Z.items = function () { return Z.data.items.slice(); };
  Z.item = find;

  // ---------- derived (ia.md §6.4) ----------
  function key(it) { return Shop.key(it.category); }
  function newest(a, b) { return (b.updatedAt - a.updatedAt) || (b.createdAt - a.createdAt); }
  Shop.spelling = function (text) {
    var t = String(text == null ? '' : text).trim(), k = Shop.key(t);
    if (!k) return '';
    var same = Z.data.items.filter(function (x) { return x.category && key(x) === k; }).sort(newest);
    return same.length ? same[0].category : t;
  };
  Shop.categories = function () {
    var seen = {}, out = [];
    Z.data.items.filter(function (x) { return x.category; }).sort(newest).forEach(function (x) { var k = key(x); if (k && !seen[k]) { seen[k] = 1; out.push({ key: k, name: x.category }); } });
    return out.sort(function (a, b) { return collator.compare(a.name, b.name); });
  };
  Shop.guess = function (name) {
    var k = Shop.key(name); if (!k) return null;
    var m = Z.data.items.filter(function (x) { return x.category && Shop.key(x.name) === k; }).sort(newest);
    return m.length ? m[0].category : null;
  };
  Shop.duplicate = function (name) {
    var k = Shop.key(name); if (!k) return null;
    return Z.data.items.filter(function (x) { return !x.boughtAt && Shop.key(x.name) === k; }).sort(function (a, b) { return a.createdAt - b.createdAt; })[0] || null;
  };
  function oldest(a, b) { return (a.createdAt - b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }
  Shop.groups = function () {
    var by = {}, order = [], done = [];
    Z.data.items.forEach(function (x) {
      if (x.boughtAt) { done.push(x); return; }
      var k = key(x);
      if (!by[k]) { by[k] = { key: k, items: [] }; order.push(by[k]); }
      by[k].items.push(x);
    });
    order.forEach(function (g) {
      g.items.sort(oldest);
      var named = g.items.filter(function (x) { return x.category; }).sort(newest)[0];
      g.name = named ? named.category : '';
    });
    order.sort(function (a, b) { if (!a.key) return 1; if (!b.key) return -1; return collator.compare(a.name, b.name); });
    done.sort(function (a, b) { return (b.boughtAt - a.boughtAt) || (b.id < a.id ? -1 : 1); });
    return { groups: order, done: done };
  };
  Shop.totals = function () {
    var g = Shop.groups(), left = 0;
    g.groups.forEach(function (gr) { left += gr.items.length; });
    return { any: Z.data.items.length > 0, left: left, boughtCount: g.done.length };
  };
  Shop.focusRow = function (id) {
    var b = id && $('#view [data-act="open"][data-id="' + CSS.escape(id) + '"]');
    if (b) Z.focus(b); else Z.focusPrimary();
  };
  Shop.neighbour = function (id) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('#view li.row[data-id]')), i = -1;
    rows.forEach(function (li, n) { if (li.dataset.id === id) i = n; });
    if (i < 0) return null;
    var n = rows[i + 1] || rows[i - 1];
    return n ? n.dataset.id : null;
  };

  // ---------- writes ----------
  function actor(source, o) { return (o && o.by) || (source === 'partner' ? 'b' : Z.me); }
  function copy(x) { return JSON.parse(JSON.stringify(x), function (k, v) { return /At$/.test(k) && v ? new Date(v) : v; }); }
  function unitOf(u) { return Shop.units.some(function (x) { return x.code === u; }) ? u : 'piece'; }
  function clean(s) { return String(s == null ? '' : s).trim(); }
  function write(source) {
    function emit(type, by, extra) { var ev = { type: type, by: by, source: source }; Object.keys(extra || {}).forEach(function (k) { ev[k] = extra[k]; }); Z.emit('change', ev); }
    function offlineMe(o) { return !!(o && o.pending) || (source === 'me' && Z.offline); }
    return {
      addItem: function (f, o) {
        var by = actor(source, o), ex = f.id && find(f.id);
        if (ex) return { item: ex, group: ex.category || null };
        var cat = f.category === undefined ? Shop.guess(f.name) : Shop.spelling(f.category);
        var qty = Math.min(9999, Math.max(1, Math.floor(Number(f.quantity) || 1)));
        var it = I({ id: f.id, name: clean(f.name), qty: qty, unit: unitOf(f.unit), cat: cat || null, notes: clean(f.notes), by: by, at: Z.now() });
        if (offlineMe(o)) { it.pending = true; it.unsynced = true; }
        Z.data.items.push(it);
        emit('added', by, { item: it });
        return { item: it, group: it.category };
      },
      setBought: function (id, bought, o) {
        var it = find(id); if (!it) return { notFound: true };
        var by = actor(source, o);
        if (bought === !!it.boughtAt) return { item: it, noop: true }; // keeps the first buyer (ia A1)
        it.boughtAt = bought ? Z.now() : null; it.boughtBy = bought ? by : null;
        if (offlineMe(o)) it.pending = true;
        emit('bought', by, { item: it, done: !!bought });
        return { item: it };
      },
      updateItem: function (id, f, o) {
        var it = find(id); if (!it) return { notFound: true };
        if (o && o.updatedAt && +new Date(o.updatedAt) !== +it.updatedAt) return { conflict: true, current: copy(it) };
        if ('name' in f) it.name = clean(f.name);
        if ('quantity' in f) it.quantity = Math.min(9999, Math.max(1, Math.floor(Number(f.quantity) || 1)));
        if ('unit' in f) it.unit = unitOf(f.unit);
        if ('category' in f) it.category = Shop.spelling(f.category) || null;
        if ('notes' in f) it.notes = clean(f.notes);
        it.updatedAt = Z.now();
        var by = actor(source, o);
        emit('updated', by, { item: it, fields: Object.keys(f) });
        return { item: it };
      },
      deleteItem: function (id, o) {
        var it = find(id); if (!it) return { notFound: true };
        var c = copy(it);
        Z.data.items = Z.data.items.filter(function (x) { return x !== it; });
        emit('deleted', actor(source, o), { item: c });
        return { item: c };
      },
      clearBought: function (o) {
        var gone = Z.data.items.filter(function (x) { return x.boughtAt; }).map(copy);
        Z.data.items = Z.data.items.filter(function (x) { return !x.boughtAt; });
        emit('cleared', actor(source, o), { items: gone });
        return { items: gone };
      },
      restore: function (items, o) {
        var back = [];
        (items || []).forEach(function (r) { if (!find(r.id)) { var c = copy(r); Z.data.items.push(c); back.push(c); } });
        if (back.length) emit('restored', actor(source, o), { items: back });
        return { items: back };
      }
    };
  }
  var mine = write('me');
  Object.keys(mine).forEach(function (k) { Z[k] = mine[k]; });
  Z.partner = write('partner');

  // ---------- connection ----------
  // Queued offline: adds and ticks (ARCH §9). Everything else waits for a connection.
  Z.queued = function () { return Z.data.items.filter(function (x) { return x.pending; }); };
  Z.setOffline = function (off, o) {
    o = o || {};
    if (Z.offline === off) return;
    Z.offline = off;
    var q = Z.queued();
    if (!off && q.length) {
      Z.syncing = true;
      q.sort(oldest).forEach(function (it, i) { // the queue drains in order, row by row; no toast
        setTimeout(function () {
          it.pending = false; it.unsynced = false;
          if (i === q.length - 1) Z.syncing = false;
          Z.emit('change', { type: 'synced', item: it, by: Z.me, source: 'me' });
        }, 500 + i * 300);
      });
    }
    Z.emit('connection', { offline: off, synced: off ? 0 : q.length });
    if (o.silent) return;
    var msg = o.message || (off ? Z.offlineMessage : Z.onlineMessage);
    Z.announce(msg ? (typeof msg === 'function' ? msg(q.length) : msg) : off ? 'You\'re offline. Adding items and ticking them off still work.' : 'Back online.');
  };

  // ---------- page chrome ----------
  Z.title = function (t) { document.title = t; };
  Z.footnote = function (t) { var f = $('#footnote'); f.textContent = t || ''; };
  Z.setChrome = function (c) { if (c) document.documentElement.dataset.chrome = c; else delete document.documentElement.dataset.chrome; };
  Z.afterRender = function () { placeToast(); };

  // ---------- focus ----------
  var lastPointer = false;
  window.addEventListener('pointerdown', function () { lastPointer = true; }, true);
  window.addEventListener('keydown', function () { lastPointer = false; }, true);
  Z.usedPointer = function () { return lastPointer; };
  Z.focus = function (el) { if (el) el.focus({ preventScroll: true, focusVisible: !lastPointer }); };
  Z.focusPrimary = function () { var p = $('#primary'); if (p && p.offsetParent !== null) Z.focus(p); else Z.focusHeading(); };
  Z.focusHeading = function () { var h = $('#view h1'); if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } };
  // Re-render a region without losing keyboard focus (WCAG 2.4.3). Keys by id, then data-act + data-id, then href.
  Z.keepFocus = function (root, fn) {
    var a = document.activeElement, key = null;
    if (a && root.contains(a) && a !== root) {
      var sel = a.id ? '#' + CSS.escape(a.id)
        : a.dataset && a.dataset.act ? '[data-act="' + a.dataset.act + '"]' + (a.dataset.id ? '[data-id="' + CSS.escape(a.dataset.id) + '"]' : '')
        : a.getAttribute('href') ? 'a[href="' + a.getAttribute('href') + '"]' : null;
      key = sel ? { sel: sel, idx: Array.prototype.indexOf.call(root.querySelectorAll(sel), a) } : null;
    }
    fn();
    if (key) { var list = root.querySelectorAll(key.sel), n = list[key.idx] || list[0]; if (n) n.focus({ preventScroll: true }); else Z.focusPrimary(); }
  };

  // ---------- live region and toast ----------
  var dlgStack = [], nativeShow = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () {
    var d = this; nativeShow.apply(d, arguments);
    dlgStack = dlgStack.filter(function (x) { return x !== d; }); dlgStack.push(d);
    d.addEventListener('close', function () { dlgStack = dlgStack.filter(function (x) { return x !== d; }); }, { once: true });
  };
  Z.topDialog = function () { var open = dlgStack.filter(function (d) { return d.open; }); return open[open.length - 1] || document.querySelector('dialog[open]'); };
  Z.announce = function (msg) {
    var open = Z.topDialog();
    var l = (open && open.querySelector('.dlg-live')) || $('#live');
    l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 50);
  };
  var toastTimer = null, toastHover = false, toastFocus = false, toastUndo = null, TOAST_MS = 10000, UNDO_MS = 30000, toastMs = TOAST_MS, toastEl = null;
  // The toast is the last thing in main (fix pass A2): a keyboard user reaches Undo after the list, and Esc / Ctrl+Z work from anywhere.
  function placeToast() {
    var t = toastEl, m = $('#main'); if (!t || !m) return;
    if (t.parentNode !== m || m.lastElementChild !== t) m.appendChild(t);
  }
  Z.toast = function (o) {
    var t = toastEl;
    placeToast();
    t.querySelector('.toast-title').textContent = o.title || '';
    t.querySelector('.toast-msg').textContent = o.msg;
    var u = t.querySelector('.toast-undo');
    toastUndo = o.undo || null; u.hidden = !toastUndo;
    u.textContent = o.undoText || 'Undo';
    if (toastUndo) u.setAttribute('aria-label', o.undoLabel || 'Undo'); else u.removeAttribute('aria-label');
    // An Undo toast stays 30 s for everyone (WCAG 2.2.1), paused while hovered or focused; a plain toast keeps its short life.
    toastMs = o.ms || (toastUndo ? UNDO_MS : TOAST_MS);
    t.hidden = false; t.classList.add('is-entering'); document.documentElement.classList.add('toast-open');
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove('is-entering'); }); });
    if (!o.silent) Z.announce((o.title ? o.title + ' ' : '') + String(o.msg).replace(/[.!?]$/, '') + (toastUndo ? '. Undo available. Press Escape to dismiss.' : ''));
    schedule();
  };
  function schedule() { clearTimeout(toastTimer); toastTimer = setTimeout(function () { if (!toastHover && !toastFocus) Z.hideToast(); }, toastMs); }
  function unpause() { if (toastEl && !toastEl.hidden && !toastHover && !toastFocus) schedule(); }
  Z.hideToast = function () {
    var t = toastEl; if (!t || t.hidden) return;
    var had = t.contains(document.activeElement);
    clearTimeout(toastTimer); toastHover = toastFocus = false;
    t.hidden = true; toastUndo = null; document.documentElement.classList.remove('toast-open');
    if (had) Z.focusPrimary();
  };
  function runUndo() { var u = toastUndo; Z.hideToast(); if (u) u(); }

  // ---------- shared dialog behaviour ----------
  var phone = window.matchMedia('(max-width: 47.99rem)');
  Z.isPhone = function () { return phone.matches; };
  function outside(dlg, e) { var r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; }
  Z.backdropClose = function (dlg, onClose) {
    var pressed = false;
    dlg.addEventListener('pointerdown', function (e) { pressed = e.target === dlg && outside(dlg, e); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && pressed && outside(dlg, e)) { if (onClose) onClose(); else dlg.close(); } pressed = false; });
  };
  Z.placeSheet = function (dlg) {
    if (dlg.hasAttribute('data-no-place')) return;
    if (!window.visualViewport || !dlg.open || !phone.matches || visualViewport.scale > 1.01) { dlg.style.bottom = ''; dlg.style.maxHeight = ''; return; }
    var kb = Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop);
    dlg.style.bottom = kb > 0 ? kb + 'px' : '';
    dlg.style.maxHeight = (visualViewport.height - 8) + 'px';
  };
  if (window.visualViewport) {
    var place = function () { document.querySelectorAll('dialog.sheet[open]').forEach(Z.placeSheet); };
    visualViewport.addEventListener('resize', place); visualViewport.addEventListener('scroll', place);
  }

  // ---------- confirm (alertdialog) ----------
  Z.confirm = function (o) {
    return new Promise(function (resolve) {
      var dlg = $('#confirm');
      $('#confirm-h').textContent = o.title;
      $('#confirm-body').innerHTML = o.body || '';
      var ok = $('#confirm-ok'), no = $('#confirm-cancel');
      ok.textContent = o.confirm; no.textContent = o.cancel || 'Keep it';
      ok.className = o.danger === false ? 'btn-primary' : 'btn-danger';
      var opener = document.activeElement, result = false, pushed = true;
      function done(v) { result = v; dlg.close(); }
      // The confirm has its own history entry (fix pass A3): Back dismisses it and nothing under it.
      function onPop() { if (pushed && dlg.open && !(history.state && history.state.confirm)) { pushed = false; done(false); } }
      ok.onclick = function () { done(true); };
      no.onclick = function () { done(false); };
      dlg.onclose = function () {
        dlg.onclose = null; window.removeEventListener('popstate', onPop);
        document.documentElement.classList.remove('confirm-open');
        function fin() { resolve(result); if (!result && opener && document.contains(opener)) Z.focus(opener); }
        if (!pushed) { fin(); return; }
        pushed = false;
        var ran = false;
        function go() { if (ran) return; ran = true; window.removeEventListener('popstate', go); fin(); } // resolve once our entry is really gone
        window.addEventListener('popstate', go); setTimeout(go, 300);
        history.back();
      };
      document.documentElement.classList.add('confirm-open'); // the sheet underneath steps back
      var hs = history.state || {};
      history.pushState({ zIdx: (hs.zIdx || 1) + 1, pushedQuery: false, confirm: 1 }, '', location.href);
      window.addEventListener('popstate', onPop);
      dlg.showModal();
      Z.focus(no);
    });
  };

  // ---------- dialogs: part 2 (dialogs.js, form.js) replaces this stub ----------
  Z.dialogs = { itemSheet: function (id) {}, itemForm: function (opts) {}, fromRoute: function (route) { return false; }, closeAll: function () {} };

  // ---------- routing ----------
  var views = {}, current = null, mounts = 0, zIdx = 0;
  Z.view = function (name, def) { views[name] = def; };
  function parse(hash) {
    var h = (hash || '').replace(/^#/, '') || '/shopping';
    var qi = h.indexOf('?'), path = qi > -1 ? h.slice(0, qi) : h, query = {};
    if (qi > -1) new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { query[k] = v; });
    if (path === '/shopping' || path === '/shopping/') return { view: 'list', path: '/shopping', query: query };
    return { view: 'elsewhere', path: path, query: query };
  }
  Z.parse = parse;
  Z.fixture = function (viewName) { return mounts === 1 && current && current.view === viewName && Z.state !== 'populated' ? Z.state : null; };
  Z.canGoBack = function () { return history.state && history.state.zIdx > 1; };
  Z.back = function () { history.back(); };
  Z.go = function (hash, o) {
    if (o && o.replace) { history.replaceState({ zIdx: (history.state && history.state.zIdx) || ++zIdx, pushedQuery: history.state && history.state.pushedQuery }, '', location.pathname + location.search + hash); handle(); }
    else { pendingPush = true; location.hash = hash; }
  };
  Z.withQuery = function (changes) {
    var r = Z.route, q = {};
    Object.keys(r.query || {}).forEach(function (k) { q[k] = r.query[k]; });
    Object.keys(changes).forEach(function (k) { if (changes[k] == null) delete q[k]; else q[k] = changes[k]; });
    var s = new URLSearchParams(q).toString();
    return '#' + r.path + (s ? '?' + s : '');
  };
  // Close a URL-backed dialog: go back when this entry was pushed by opening it, else replace (deep link).
  Z.closeQuery = function (key) {
    var keys = Array.isArray(key) ? key : [key], ch = {};
    keys.forEach(function (k) { ch[k] = null; });
    if (history.state && history.state.pushedQuery && Z.canGoBack()) history.back();
    else Z.go(Z.withQuery(ch), { replace: true });
  };
  var pendingPush = false;
  function handle() {
    if (!history.state || history.state.zIdx == null) history.replaceState({ zIdx: ++zIdx, pushedQuery: pendingPush && current && parse(location.hash).path === current.path }, '', location.href);
    else zIdx = Math.max(zIdx, history.state.zIdx);
    pendingPush = false;
    if (location.hash && location.hash.charAt(1) !== '/') return;
    var r = parse(location.hash);
    if (r.view === 'elsewhere') { elsewhere(r); return; }
    var same = current && current.view === r.view;
    var prev = current; Z.prevRoute = prev; current = r; Z.route = r;
    if (same && views[r.view] && views[r.view].update && views[r.view].update(r)) { Z.emit('route', r); return; }
    if (prev && views[prev.view] && views[prev.view].unmount) views[prev.view].unmount();
    Z.hideToast();
    Z.dialogs.closeAll();
    document.querySelectorAll('dialog[open]').forEach(function (d) { d.close(); });
    Z.offlineMessage = null; Z.onlineMessage = null;
    Z.setChrome('');
    Z.footnote('');
    mounts++;
    var root = $('#view'); root.innerHTML = ''; root.className = '';
    var res = views[r.view] ? views[r.view].mount(root, r) : null;
    window.scrollTo(0, 0);
    if (res !== 'focus-handled' && mounts > 1) Z.focusHeading();
    Z.afterRender();
    Z.emit('route', r);
  }
  function elsewhere(r) {
    if (current && views[current.view] && views[current.view].unmount) views[current.view].unmount();
    current = r; Z.route = r; Z.setChrome('');
    $('#view').innerHTML = '<h1 class="title-lg" tabindex="-1">Not in this prototype</h1><p>This prototype covers Shopping only. <a href="#/shopping">Go to Shopping</a>, <a href="../trips/trips.html#/trips">open Trips</a>, <a href="../goals/goals.html#/goals">open Goals</a> or <a href="../home/home.html">open Home</a>.</p>';
    Z.footnote(''); Z.title('Not in this prototype – Zamane'); if (mounts++ > 0) Z.focusHeading();
  }

  // ---------- start ----------
  Z.start = function () {
    toastEl = $('#toast');
    $('.skip').addEventListener('click', function (e) { e.preventDefault(); var m = $('#main'); m.focus(); m.scrollIntoView(); });
    var t = toastEl;
    var sa = $('.skip-add'); if (sa) sa.addEventListener('click', function (e) { e.preventDefault(); Z.focusPrimary(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !e.defaultPrevented && !t.hidden && !document.querySelector('dialog[open]')) { Z.hideToast(); return; }
      // Ctrl/Cmd+Z runs the visible Undo, except where it means "undo typing" (fix pass A2)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !e.isComposing && (e.key === 'z' || e.key === 'Z') && !t.hidden && toastUndo && !document.querySelector('dialog[open]')) {
        var tg = e.target;
        if (tg && tg.closest && tg.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]),textarea,select,[contenteditable]')) return;
        e.preventDefault(); runUndo();
      }
    });
    t.addEventListener('mouseenter', function () { toastHover = true; });
    t.addEventListener('mouseleave', function () { toastHover = false; unpause(); });
    t.addEventListener('focusin', function () { toastFocus = true; });
    t.addEventListener('focusout', function () { toastFocus = false; unpause(); });
    t.querySelector('.toast-undo').addEventListener('click', function (e) { if (e.currentTarget.getAttribute('aria-disabled') === 'true') return; runUndo(); });
    // The Shopping tab on the list scrolls to the top (nav-bar convention) and does not rebuild the list.
    document.querySelector('.nav-link[href="#/shopping"]').addEventListener('click', function (e) {
      if (current && current.view === 'list') { e.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    });
    window.addEventListener('online', function () { Z.setOffline(false); });
    window.addEventListener('offline', function () { Z.setOffline(true); });
    window.addEventListener('hashchange', handle);
    handle();
  };
})();
