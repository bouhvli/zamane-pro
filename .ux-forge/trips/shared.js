/* Zamane Trips prototype: the shared layer (window.Z).
   Plain script, no modules (file:// must work). Loaded first by trips.html; each view file
   (list.js, detail.js, dialogs.js, form.js) registers itself with Z.view(name, {...}) or Z.dialogs.
   Adapted from .ux-forge/goals/shared.js: the plumbing (toast, confirm, focus, dialogs, routing) is the same;
   the data, derived values and components are Trips'. Direction: B · Saffron light (decision.md).

   ─── API summary (read this, not the whole file) ──────────────────────────────────────────
   Flags (set once from ?state=, global for the session):
     Z.state            the raw ?state= value ('populated' if none)
     Z.offline          true for 'offline' or any '*-offline'. Z.setOffline(off, {silent, message})
     Z.uploadsEnabled   false for 'uploads-off'
     Z.solo             'solo': the partner hasn't joined (Z.members.b is null; everything is Sara's)
     Z.scenario         true for 'trip-now' | 'now-last-day' | 'now-nothing-left': Lisbon shows on the list
     Z.fixture(view)    the ?state= value if this mount is the initial route's view, else null
     Z.offlineMessage / Z.onlineMessage: a view sets its own sentence on mount (string or fn(queuedCount))
   Time: Z.now() is Mon 9 Nov 2026 13:20 (ia.md §8), ticking from page load.
     'now-last-day' → Tue 10 Nov 19:00 · 'now-nothing-left' → Mon 9 Nov 21:00.
     Z.today() ISO 'YYYY-MM-DD' · Z.nowHM() 'HH:MM'
   Members: Z.me = 'a' (Sara). Z.members.a / .b = {id, name, initial}. Z.name(id) · Z.av(id, 'sm'|'md'|'lg')
   Data shapes (dates are ISO 'YYYY-MM-DD' strings, times 'HH:MM' strings, timestamps are Date):
     trip  {id, title, destination, start, end, budget|null, notes, cover {example:true}|null,
            createdBy, createdAt, updatedAt, scenario?}
     entry {id, tripId, type, title, date|null, start|null, end|null, location, cost|null, url, notes,
            doneAt|null, doneBy|null, placeId|null, createdBy, createdAt, updatedAt, pending?}
            pending: the done tick is queued offline
     place {id, tripId, type, title, area, notes, url, estimate|null, mustDo, createdBy, createdAt, updatedAt, pending?}
            pending: the add itself is queued offline
     item  {id, tripId, group, title, position, doneAt|null, doneBy|null, seeded, createdBy, createdAt, updatedAt, pending?}
   Reads: Z.trip(id) · Z.trips() (all) · Z.listTrips() (what the list shows: Lisbon only in a scenario)
     Z.entries(tripId) · Z.entry(id) · Z.places(tripId) · Z.place(id) · Z.items(tripId[, group]) · Z.item(id)
   Derived (ARCHITECTURE §4.3; trip-days on the device):
     Z.status(trip) → {kind:'upcoming'|'now'|'past'|'undated', days (to go), day, total, last, ago}
     Z.sections() → [{key:'now'|'upcoming'|'undated'|'past', trips:[…]}] non-empty, in order (ia D2)
     Z.leadTrip() → the first 'now' trip, else the first 'upcoming', else null
     Z.days(trip) → {days:[{date, n, isToday, entries}], outside:[entries], unscheduled:[entries]}
                    Undated trip: days are the distinct dates of its dated entries (n = null), outside = [].
                    Entries in a day: "any time" first, then by start.
     Z.nowNext(trip) → {now: entry|null, next: entry|null} (today only; not-done entries; no end = 60 min, ia §7 f)
     Z.budget(trip) → {plan, ideas, ideasCount, ideasQueued, planned, budget, over, left, ratio, uncosted,
                       byType:[{type, amount}] (non-zero, largest first)}
     Z.entryOf(place) the plan entry scheduled from it, or null · Z.visited(place)
     Z.prep(trip) → [{group, items, done, total}] in Z.GROUPS order · Z.prepCounts(trip) → {done, total}
     Z.left(trip) → {prep, mustDo} (prep items not done; must-do places not in the plan)
   Writes (each returns a result and emits 'change' {type, tripId, by, source, …}; Z.partner.* = Youssef's):
     createTrip(f) → trip (seeds the checklist) · updateTrip(id, f, {updatedAt}) → {trip}|{conflict, current}|{notFound}
     deleteTrip(id) → {trip}
     addEntry(tripId, f) → {entry} · updateEntry(id, f, {updatedAt}) → {entry}|{conflict, current}|{notFound}
     deleteEntry(id) → {entry} (its place goes back to the ideas) · setEntryDone(id, done, {pending}) → {entry}
     addPlace(tripId, f, {pending}) → {place} · updatePlace(id, f, {updatedAt}) → … · deletePlace(id) → {place}
     schedulePlace(placeId, {date, start, end}) → {entry} | {taken: entry} (ia A1) | {notFound}
     addItem(tripId, group, title) → {item} · updateItem(id, f) → {item} · deleteItem(id) → {item}
     setItemDone(id, done, {pending}) → {item} · moveItem(id, -1|+1) → {item, position, total}
     Ticks don't bump updatedAt (ia A3 default), so a partner's tick never 409s an open edit.
     Z.on('change'|'connection'|'route', fn) / Z.off(…)
   Formatting: Z.esc · Z.fmt(n) '9,200' · Z.mad(n) '9,200 MAD' · Z.dateOf(iso) → Date
     Z.day(d|iso) 'Sat 21 Nov' (+ year if not this year) · Z.time(Date) · Z.dayTime(d) · Z.ago(d)
     Z.range(start, end) 'Sat 21 – Wed 25 Nov' (visual) · Z.rangeSr(start, end) 'Sat 21 Nov to Wed 25 Nov'
     Z.timeRange(entry) '08:00–12:15' | '20:00' | '' · Z.timeRangeSr(entry) '08:00 to 12:15'
     Z.plural(n, one, other) · Z.svg(icon[, cls]) with Z.ICON names · Z.typeName(t) · Z.typeIcon(t)
     Z.TYPES (7, ia A10 one enum) · Z.GROUPS ['packing','documents','bookings','todo'] · Z.groupName(g) · Z.groupIcon(g)
   Components (return HTML strings):
     Z.doorway(trip, size) size = 'detail'|'tile'|'row'|'form'|'thumb' (Goals' doorway; no done ring in Trips)
     Z.lightBand(trip, {lead}) the one saffron block: count + kicker; past = sunken; undated/now-in-detail = ''
         Use it on the list's lead tile (lead:true) and the detail before the trip. During the trip the detail
         uses saffron-ink TEXT (Z.statusText) and the Now cell instead (decision.md).
     Z.statusText(trip) 'Day 3 of 4 · Happening now' | '12 days to go' | 'Tomorrow' | 'No dates yet' | 'Ended 64 days ago'
     Z.budgetBar(trip, {label}) the ink-and-pencil bar (C graft): solid plan, dashed ideas, ink mark; all danger when over.
         '' when the trip has no budget and nothing planned. role=progressbar with the copy's valuetext.
     Z.tally(done, total) the Prep zellige tiles, aria-hidden, '' over 12
     Z.afterRender() call after EVERY render: re-places the toast after the dock
   Page chrome: Z.title(text) · Z.footnote(text[, scenarioText]) · Z.setFab(bool) · Z.setChrome('task'|'')
   UI services: Z.announce(msg) · Z.toast({title, msg, done, undo, undoLabel}) · Z.hideToast() · Z.flash(opts)
     Z.confirm({title, body, confirm, cancel, danger}) → Promise<boolean>; alertdialog, focus on cancel
     Z.focus(el) · Z.focusPrimary() · Z.focusHeading() · Z.keepFocus(root, fn) · Z.usedPointer()
     Z.backdropClose(dialog[, onClose]) · Z.placeSheet(dialog) · Z.isPhone() · Z.isWide() (≥ 64 rem)
     Dialogs: give every <dialog> a visually hidden <p class="dlg-live vh" role="status"> so Z.announce reaches it.
     Z.parseMoney(raw) → {value}|{error} (0 allowed: "no cost" is null, a 0 cost is free) · Z.validUrl(s)
   In-trip dialogs (registered by dialogs.js as Z.dialogs):
     Z.dialogs.entrySheet(id) · .placeSheet(id) · .itemSheet(id)             read sheets, not in the URL
     Z.dialogs.fromRoute(route) → true if it opened (or kept open) a URL dialog for ?entry= | ?place= | ?schedule=
     Z.dialogs.closeAll()
     The detail calls fromRoute() in mount() and update(). Forms close by popping their query (Z.closeQuery()).
   Routing (hash): #/trips · #/trips/new · #/trips/:id · #/trips/:id/edit, query inside the hash
     (?view=plan|places|prep, ?entry=new|<id>[&date=YYYY-MM-DD], ?place=new|<id>, ?schedule=<placeId>, ?focus=dates|budget).
     Z.route = {view, id, mode, query, path} · Z.go(hash, {replace}) · Z.canGoBack() · Z.back()
     Z.withQuery(changes) → hash for the current path with query keys set/removed (null removes)
     Z.closeQuery(key) pops a dialog's query (history.back when we pushed it, else replace)
   Views: Z.view(name, {mount(root, route), update?(route) → true if handled, unmount?()})
     mount() renders into #view. Return 'focus-handled' if the view set focus itself.
   ───────────────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var Z = window.Z = {};
  var P = new URLSearchParams(location.search);
  Z.state = P.get('state') || 'populated';
  Z.offline = /(^|-)offline$/.test(Z.state);
  Z.uploadsEnabled = Z.state !== 'uploads-off';
  Z.solo = Z.state === 'solo';
  Z.scenario = ['trip-now', 'now-last-day', 'now-nothing-left'].indexOf(Z.state) > -1;
  function $(s, r) { return (r || document).querySelector(s); }
  Z.$ = $;

  // ---------- events ----------
  var handlers = {};
  Z.on = function (t, fn) { (handlers[t] = handlers[t] || []).push(fn); };
  Z.off = function (t, fn) { handlers[t] = (handlers[t] || []).filter(function (f) { return f !== fn; }); };
  Z.emit = function (t, detail) { (handlers[t] || []).slice().forEach(function (fn) { fn(detail); }); };

  // ---------- time ----------
  var BASE = Z.state === 'now-last-day' ? new Date(2026, 10, 10, 19, 0) : Z.state === 'now-nothing-left' ? new Date(2026, 10, 9, 21, 0) : new Date(2026, 10, 9, 13, 20);
  var LOADED = Date.now();
  Z.now = function () { return new Date(BASE.getTime() + (Date.now() - LOADED)); };
  function D(y, m, d, h, mi) { return new Date(y, m - 1, d, h == null ? 12 : h, mi || 0); }
  Z.D = D;
  function pad(n) { return String(n).padStart(2, '0'); }
  Z.isoDate = function (d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  Z.dateOf = function (iso) { if (iso instanceof Date) return iso; var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0); };
  Z.today = function () { return Z.isoDate(Z.now()); };
  Z.nowHM = function () { var n = Z.now(); return pad(n.getHours()) + ':' + pad(n.getMinutes()); };
  function dayDiff(a, b) { return Math.round((Z.dateOf(b) - Z.dateOf(a)) / 864e5); } // b − a, in days
  Z.dayDiff = dayDiff;
  Z.addDays = function (iso, n) { var d = Z.dateOf(iso); d.setDate(d.getDate() + n); return Z.isoDate(d); };
  function mins(hm) { if (!hm) return null; var p = hm.split(':'); return +p[0] * 60 + +p[1]; }
  Z.mins = mins;

  // ---------- formatting ----------
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  Z.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  Z.fmt = function (n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); };
  Z.mad = function (n) { return Z.fmt(n) + ' MAD'; }; // no-break space: the unit never wraps away (critique F5)
  Z.plural = function (n, one, other) { return n === 1 ? one : other; };
  function yearSuffix(d) { return d.getFullYear() === Z.now().getFullYear() ? '' : ' ' + d.getFullYear(); }
  // Goals decision: the year is added when a date isn't in the current year.
  Z.day = function (d) { d = typeof d === 'string' ? Z.dateOf(d) : new Date(d); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()] + yearSuffix(d); };
  Z.time = function (d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  Z.dayTime = function (d) { return Z.day(d) + ', ' + Z.time(d); };
  Z.ago = function (d) {
    d = new Date(d);
    var now = Z.now(), m = (now - d) / 60000;
    if (m < 1) return 'just now';
    var days = dayDiff(Z.isoDate(d), Z.isoDate(now));
    if (days === 0) return Z.time(d);
    if (days === 1) return 'yesterday';
    return Z.day(d);
  };
  // "Sat 21 – Wed 25 Nov" · "Sat 31 Oct – Tue 3 Nov" · year once at the end when not this year
  Z.range = function (s, e) {
    if (!s) return '';
    var a = Z.dateOf(s), b = Z.dateOf(e || s);
    if (s === (e || s)) return Z.day(a);
    var sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    var left = WD[a.getDay()] + ' ' + a.getDate() + (sameMonth ? '' : ' ' + MO[a.getMonth()]) + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '');
    return left + ' – ' + Z.day(b);
  };
  Z.rangeSr = function (s, e) { if (!s) return ''; return s === (e || s) ? Z.day(s) : Z.day(s) + ' to ' + Z.day(e); };
  Z.timeRange = function (en) { if (!en.start) return ''; return en.end ? en.start + '–' + en.end : en.start; };
  Z.timeRangeSr = function (en) { if (!en.start) return ''; return en.end ? en.start + ' to ' + en.end : en.start; };

  // ---------- icons (Lucide, stroke 1.75; paths from lucide 0.562) ----------
  Z.ICON = {
    chevron: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    cloudOff: '<path d="M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057"/><path d="M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78"/><path d="m2 2 20 20"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    imagePlus: '<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    listOrder: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    moreH: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    clock: '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    // plan and place types (design system icon table)
    flight: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    transport: '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
    stay: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    sight: '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
    activity: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    other: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
    // checklist groups
    packing: '<path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"/><path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"/><path d="M10 20h4"/><circle cx="16" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>',
    documents: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    bookings: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    todo: '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>'
  };
  Z.svg = function (name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (Z.ICON[name] || Z.ICON.other) + '</svg>'; };
  Z.TYPES = ['flight', 'transport', 'stay', 'food', 'sight', 'activity', 'other'];
  var TYPE_NAME = { flight: 'Flight', transport: 'Transport', stay: 'Stay', food: 'Food', sight: 'Sight', activity: 'Activity', other: 'Other' };
  Z.typeName = function (t) { return TYPE_NAME[t] || 'Other'; };
  Z.typeIcon = function (t, cls) { return Z.svg(TYPE_NAME[t] ? t : 'other', cls); };
  Z.GROUPS = ['packing', 'documents', 'bookings', 'todo'];
  var GROUP_NAME = { packing: 'Packing', documents: 'Documents', bookings: 'Bookings', todo: 'To-do' };
  Z.groupName = function (g) { return GROUP_NAME[g] || 'Other'; };
  Z.groupIcon = function (g, cls) { return Z.svg(GROUP_NAME[g] ? g : 'todo', cls); };

  // ---------- members ----------
  Z.me = 'a';
  Z.members = { a: { id: 'a', name: 'Sara', initial: 'S' }, b: Z.solo ? null : { id: 'b', name: 'Youssef', initial: 'Y' } };
  Z.name = function (id) { var m = Z.members[id]; return m ? m.name : 'Youssef'; };
  Z.av = function (id, size) { return '<span class="zm-av zm-av-' + id + ' zm-av-' + (size || 'sm') + '" aria-hidden="true">' + (id === 'a' ? 'S' : 'Y') + '</span>'; };

  // ---------- example data (ia.md §8). Every figure adds up; all of it is labelled on screen. ----------
  var seq = 100;
  function uid(p) { return p + (++seq); }
  // The example seed (ARCH D24 holds the real list): 11 items. Items created with the trip are 'seeded'
  // and carry no "Added by" (ia A5).
  var SEED = [['packing', 'Walking shoes'], ['packing', 'Phone chargers'], ['packing', 'Toiletries'], ['packing', 'Medicines'],
    ['documents', 'ID cards or passports'], ['documents', 'Travel insurance'], ['documents', 'Booking confirmations'],
    ['bookings', 'Accommodation'], ['bookings', 'Transport'],
    ['todo', 'Ask someone to water the plants'], ['todo', 'Withdraw some cash']];
  function seedItems(tripId, by, at) {
    var pos = {};
    return SEED.map(function (s) {
      pos[s[0]] = (pos[s[0]] || 0) + 1;
      return { id: uid('i'), tripId: tripId, group: s[0], title: s[1], position: pos[s[0]], doneAt: null, doneBy: null, seeded: true, createdBy: by, createdAt: at, updatedAt: at };
    });
  }
  function E(tripId, o) {
    return { id: o.id || uid('e'), tripId: tripId, type: o.type || 'other', title: o.title, date: o.date || null, start: o.start || null, end: o.end || null,
      location: o.location || '', cost: o.cost == null ? null : o.cost, url: o.url || '', notes: o.notes || '', doneAt: o.doneAt || null, doneBy: o.doneBy || null,
      placeId: o.placeId || null, createdBy: o.by || 'a', createdAt: o.at || D(2026, 10, 20), updatedAt: o.at || D(2026, 10, 20) };
  }
  function PL(tripId, o) {
    return { id: o.id || uid('p'), tripId: tripId, type: o.type || 'other', title: o.title, area: o.area || '', notes: o.notes || '', url: o.url || '',
      estimate: o.estimate == null ? null : o.estimate, mustDo: !!o.mustDo, createdBy: o.by || 'a', createdAt: o.at || D(2026, 10, 20), updatedAt: o.at || D(2026, 10, 20) };
  }
  function seed(state) {
    var d = { trips: [], entries: [], places: [], items: [] };
    // Chefchaouen (coming up) · Sat 21 – Wed 25 Nov
    d.trips.push({ id: 'chefchaouen', title: 'Chefchaouen', destination: 'Rif mountains', start: '2026-11-21', end: '2026-11-25', budget: 8000,
      notes: 'The riad has no heating. Pack warm layers.', cover: { example: true }, createdBy: 'a', createdAt: D(2026, 10, 12, 21, 0), updatedAt: D(2026, 11, 2, 20, 0) });
    var c = 'chefchaouen';
    d.places.push(PL(c, { id: 'ras-el-maa', type: 'sight', title: 'Ras El Maa viewpoint', area: 'old medina', estimate: 0, mustDo: true, by: 'a', at: D(2026, 10, 14, 20, 0) }));
    d.places.push(PL(c, { id: 'spanish-mosque', type: 'sight', title: 'Spanish Mosque', area: 'east hill', estimate: 0, by: 'b', at: D(2026, 10, 14, 20, 30) }));
    d.places.push(PL(c, { id: 'goat-cheese', type: 'food', title: 'Goat cheese tasting', area: 'Outa el Hammam', estimate: 150, by: 'b', at: D(2026, 10, 20, 19, 0) }));
    d.places.push(PL(c, { id: 'kasbah-museum', type: 'sight', title: 'Kasbah museum', area: 'Outa el Hammam', estimate: 100, by: 'a', at: D(2026, 10, 22, 21, 0) }));
    [
      { id: 'train-fes', date: '2026-11-20', type: 'transport', title: 'Train to Fes', start: '15:10', end: '19:20', location: 'Casa Voyageurs', cost: 380, by: 'b' },
      { id: 'riad', date: '2026-11-21', type: 'stay', title: 'Riad in the medina', cost: 4400, by: 'a', notes: 'Check-in from 14:00. 4 nights.' },
      { id: 'bus-chef', date: '2026-11-21', type: 'transport', title: 'Bus to Chefchaouen', start: '08:00', end: '12:15', location: 'CTM station, Fes', cost: 160, by: 'b' },
      { id: 'dinner-square', date: '2026-11-21', type: 'food', title: 'Dinner on the square', start: '20:00', location: 'Outa el Hammam', cost: 350, by: 'a' },
      { id: 'akchour', date: '2026-11-22', type: 'activity', title: 'Akchour waterfalls', start: '08:30', end: '17:00', location: 'Akchour', cost: 1200, by: 'b' },
      { id: 'cooking', date: '2026-11-24', type: 'activity', title: 'Cooking class', start: '10:00', end: '13:00', cost: 1400, by: 'a' },
      { id: 'hike-mosque', date: '2026-11-24', type: 'sight', title: 'Hike to the Spanish Mosque', start: '17:30', end: '19:00', location: 'east hill', cost: 0, by: 'b', placeId: 'spanish-mosque' },
      { id: 'bus-back', date: '2026-11-25', type: 'transport', title: 'Bus back to Fes', start: '15:00', end: '19:15', cost: 160, by: 'b' },
      { id: 'hammam', date: null, type: 'activity', title: 'Hammam and massage', cost: 900, by: 'a' }
    ].forEach(function (o, i) { o.at = D(2026, 10, 15 + i, 20, 0); d.entries.push(E(c, o)); });
    var ci = seedItems(c, 'a', D(2026, 10, 12, 21, 0));
    ci.splice(4, 0, { id: 'warm-layers', tripId: c, group: 'packing', title: 'Warm layers for the evenings', position: 5, doneAt: null, doneBy: null, seeded: false, createdBy: 'a', createdAt: D(2026, 11, 2, 20, 0), updatedAt: D(2026, 11, 2, 20, 0) });
    ci.push({ id: 'cooking-booking', tripId: c, group: 'bookings', title: 'Cooking class', position: 3, doneAt: D(2026, 11, 7, 18, 30), doneBy: 'a', seeded: false, createdBy: 'b', createdAt: D(2026, 11, 3, 19, 0), updatedAt: D(2026, 11, 3, 19, 0) });
    ci.forEach(function (it) {
      if (it.title === 'ID cards or passports') { it.doneAt = D(2026, 11, 8, 10, 15); it.doneBy = 'a'; }
      if (it.title === 'Travel insurance') { it.doneAt = D(2026, 11, 6, 21, 40); it.doneBy = 'b'; }
      if (it.title === 'Accommodation') { it.doneAt = D(2026, 11, 5, 20, 5); it.doneBy = 'b'; }
    });
    d.items = d.items.concat(ci);

    // Lisbon weekend (happening now) · Sat 7 – Tue 10 Nov · always in the data; on the list only in a scenario (D1)
    d.trips.push({ id: 'lisbon', title: 'Lisbon weekend', destination: 'Portugal', start: '2026-11-07', end: '2026-11-10', budget: 6000,
      notes: '', cover: null, createdBy: 'b', createdAt: D(2026, 9, 20, 21, 0), updatedAt: D(2026, 11, 1, 19, 0), scenario: true });
    var l = 'lisbon';
    d.places.push(PL(l, { id: 'belem-tower', type: 'sight', title: 'Belém Tower', area: 'Belém', estimate: 100, by: 'b', at: D(2026, 10, 2, 20, 0) }));
    d.places.push(PL(l, { id: 'pena-palace', type: 'sight', title: 'Pena Palace', area: 'Sintra', estimate: 110, mustDo: true, by: 'a', at: D(2026, 10, 4, 20, 0) }));
    d.places.push(PL(l, { id: 'miradouro', type: 'sight', title: 'Miradouro da Senhora do Monte', area: 'Graça', estimate: 0, by: 'b', at: D(2026, 10, 9, 20, 0) }));
    [
      { id: 'flight-out', date: '2026-11-07', type: 'flight', title: 'Flight to Lisbon', start: '07:05', end: '08:10', location: 'Casablanca → Lisbon', cost: 2800, by: 'b', notes: 'Return included', doneAt: D(2026, 11, 7, 8, 20), doneBy: 'a' },
      { id: 'alfama', date: '2026-11-07', type: 'stay', title: 'Apartment in Alfama', cost: 1800, by: 'a', doneAt: D(2026, 11, 7, 12, 30), doneBy: 'b' },
      { id: 'belem', date: '2026-11-08', type: 'sight', title: 'Belém Tower', start: '10:00', end: '11:30', location: 'Belém', cost: 100, by: 'b', placeId: 'belem-tower', doneAt: D(2026, 11, 8, 11, 40), doneBy: 'b' },
      { id: 'pasteis', date: '2026-11-08', type: 'food', title: 'Pastéis de Belém', start: '11:45', end: '12:15', cost: 60, by: 'a', doneAt: D(2026, 11, 8, 12, 10), doneBy: 'a' },
      { id: 'lx-factory', date: '2026-11-09', type: 'sight', title: 'LX Factory', start: '10:00', end: '12:00', location: 'Alcântara', cost: null, by: 'a', doneAt: D(2026, 11, 9, 12, 5), doneBy: 'a' },
      { id: 'time-out', date: '2026-11-09', type: 'food', title: 'Lunch at Time Out Market', start: '12:45', end: '14:00', location: 'Cais do Sodré', cost: 250, by: 'b' },
      { id: 'tram-28', date: '2026-11-09', type: 'transport', title: 'Tram 28', start: '15:00', end: '16:00', location: 'Martim Moniz', cost: 30, by: 'b' },
      { id: 'fado', date: '2026-11-09', type: 'activity', title: 'Fado dinner', start: '20:30', end: '22:30', location: 'Alfama', cost: 450, by: 'a' },
      { id: 'flight-home', date: '2026-11-10', type: 'flight', title: 'Flight home', start: '18:40', end: '21:45', location: 'Lisbon airport', cost: null, by: 'b' }
    ].forEach(function (o, i) { o.at = D(2026, 10, 1 + i, 20, 0); d.entries.push(E(l, o)); });
    if (state === 'now-nothing-left') { // 21:00 on Mon 9 Nov: everything today is ticked
      d.entries.forEach(function (e) {
        if (e.id === 'time-out') { e.doneAt = D(2026, 11, 9, 14, 2); e.doneBy = 'b'; }
        if (e.id === 'tram-28') { e.doneAt = D(2026, 11, 9, 16, 5); e.doneBy = 'a'; }
        if (e.id === 'fado') { e.doneAt = D(2026, 11, 9, 20, 40); e.doneBy = 'a'; }
      });
    }
    if (state === 'now-last-day') { // Tue 10 Nov 19:00: every earlier entry is ticked; the flight home is now
      d.entries.forEach(function (e) {
        if (e.tripId === 'lisbon' && e.date === '2026-11-09' && !e.doneAt) { e.doneAt = D(2026, 11, 9, 22, 40); e.doneBy = e.id === 'tram-28' ? 'a' : 'b'; }
      });
    }
    var li = seedItems(l, 'b', D(2026, 9, 20, 21, 0));
    li.forEach(function (it, i) { if (it.title !== 'Withdraw some cash') { it.doneAt = D(2026, 11, 6, 19 + (i % 3), 10 + i); it.doneBy = i % 2 ? 'b' : 'a'; } });
    d.items = d.items.concat(li);

    // Weekend in Fes (no dates) · example data
    d.trips.push({ id: 'fes', title: 'Weekend in Fes', destination: 'Fes', start: null, end: null, budget: null, notes: '', cover: null, createdBy: 'b', createdAt: D(2026, 11, 3, 21, 15), updatedAt: D(2026, 11, 3, 21, 15) });
    d.entries.push(E('fes', { id: 'train-casa', type: 'transport', title: 'Train from Casablanca', cost: 380, by: 'a', at: D(2026, 11, 4, 20, 0) }));
    d.places.push(PL('fes', { id: 'chouara', type: 'sight', title: 'Chouara tannery', area: 'Fes el-Bali', estimate: 20, mustDo: true, by: 'b', at: D(2026, 11, 3, 21, 20) }));
    d.places.push(PL('fes', { id: 'bou-inania', type: 'sight', title: 'Bou Inania madrasa', area: 'Talaa Kebira', estimate: 40, by: 'a', at: D(2026, 11, 4, 20, 5) }));
    d.items = d.items.concat(seedItems('fes', 'b', D(2026, 11, 3, 21, 15)));

    // Essaouira (past) · Wed 2 – Sun 6 Sep
    d.trips.push({ id: 'essaouira', title: 'Essaouira', destination: 'Atlantic coast', start: '2026-09-02', end: '2026-09-06', budget: 5000, notes: '', cover: null, createdBy: 'a', createdAt: D(2026, 7, 15, 20, 0), updatedAt: D(2026, 8, 30, 20, 0) });
    d.places.push(PL('essaouira', { id: 'skala', type: 'sight', title: 'Skala de la Ville', area: 'medina', estimate: 0, by: 'a', at: D(2026, 7, 20, 20, 0) }));
    [
      { date: '2026-09-02', type: 'transport', title: 'Bus to Essaouira', start: '08:00', end: '11:00', cost: 300, by: 'b', notes: 'Return', done: [D(2026, 9, 2, 11, 5), 'b'] },
      { date: '2026-09-02', type: 'stay', title: 'Riad', cost: 2800, by: 'a', done: [D(2026, 9, 2, 14, 0), 'a'] },
      { date: '2026-09-03', type: 'sight', title: 'Sunset on the Skala', start: '18:00', cost: 0, by: 'a', placeId: 'skala', done: [D(2026, 9, 3, 19, 0), 'a'] },
      { date: '2026-09-03', type: 'food', title: 'Grilled fish at the port', start: '19:30', cost: 250, by: 'b', done: [D(2026, 9, 3, 21, 0), 'b'] },
      { date: '2026-09-04', type: 'activity', title: 'Surf lesson', start: '10:00', end: '12:00', cost: 600, by: 'b', done: [D(2026, 9, 4, 12, 10), 'b'] },
      { date: '2026-09-05', type: 'activity', title: 'Day at Sidi Kaouki', cost: 400, by: 'a', done: [D(2026, 9, 5, 18, 0), 'a'] },
      { date: '2026-09-06', type: 'transport', title: 'Bus home', start: '16:00', end: '19:00', cost: 300, by: 'b', done: [D(2026, 9, 6, 19, 10), 'a'] }
    ].forEach(function (o, i) { o.at = D(2026, 8, 10 + i, 20, 0); o.doneAt = o.done[0]; o.doneBy = o.done[1]; d.entries.push(E('essaouira', o)); });
    var ei = seedItems('essaouira', 'a', D(2026, 7, 15, 20, 0));
    ei.forEach(function (it, i) { it.doneAt = D(2026, 9, 1, 18, i * 4); it.doneBy = i % 2 ? 'a' : 'b'; });
    d.items = d.items.concat(ei);

    if (state === 'empty') { d.trips = []; d.entries = []; d.places = []; d.items = []; }
    if (state === 'only-past') {
      var keep = ['essaouira', 'lisbon'];
      d.trips = d.trips.filter(function (t) { return keep.indexOf(t.id) > -1; });
      d.entries = d.entries.filter(function (x) { return keep.indexOf(x.tripId) > -1; });
      d.places = d.places.filter(function (x) { return keep.indexOf(x.tripId) > -1; });
      d.items = d.items.filter(function (x) { return keep.indexOf(x.tripId) > -1; });
    }
    if (state === 'solo') {
      d.trips.forEach(function (x) { x.createdBy = 'a'; });
      [d.entries, d.places, d.items].forEach(function (arr) { arr.forEach(function (x) { x.createdBy = 'a'; if (x.doneBy) x.doneBy = 'a'; }); });
    }
    return d;
  }
  Z.data = seed(Z.state);
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  // ---------- reads ----------
  Z.trips = function () { return Z.data.trips.slice(); };
  Z.trip = function (id) { return find(Z.data.trips, id); };
  Z.listTrips = function () { return Z.data.trips.filter(function (t) { return !t.scenario || Z.scenario; }); };
  Z.entries = function (tripId) { return Z.data.entries.filter(function (e) { return e.tripId === tripId; }); };
  Z.entry = function (id) { return find(Z.data.entries, id); };
  Z.places = function (tripId) { return Z.data.places.filter(function (p) { return p.tripId === tripId; }).sort(function (a, b) { return a.createdAt - b.createdAt; }); };
  Z.place = function (id) { return find(Z.data.places, id); };
  Z.items = function (tripId, group) {
    return Z.data.items.filter(function (i) { return i.tripId === tripId && (!group || i.group === group); })
      .sort(function (a, b) { return (Z.GROUPS.indexOf(a.group) - Z.GROUPS.indexOf(b.group)) || (a.position - b.position); });
  };
  Z.item = function (id) { return find(Z.data.items, id); };

  // ---------- derived: trip-days (computed on the device, ARCH §4.3) ----------
  Z.status = function (t) {
    if (!t.start) return { kind: 'undated' };
    var today = Z.today(), end = t.end || t.start;
    if (today < t.start) return { kind: 'upcoming', days: dayDiff(today, t.start) };
    if (today > end) return { kind: 'past', ago: dayDiff(end, today) };
    var day = dayDiff(t.start, today) + 1, total = dayDiff(t.start, end) + 1;
    return { kind: 'now', day: day, total: total, last: day === total };
  };
  Z.statusText = function (t) {
    var s = Z.status(t);
    if (s.kind === 'undated') return 'No dates yet';
    if (s.kind === 'upcoming') return s.days === 1 ? 'Tomorrow' : s.days + ' days to go';
    if (s.kind === 'past') return s.ago === 1 ? 'Ended yesterday' : 'Ended ' + s.ago + ' days ago';
    return 'Day ' + s.day + ' of ' + s.total + ' · ' + (s.last ? 'Last day' : 'Happening now');
  };
  Z.sections = function () {
    var ts = Z.listTrips(), by = { now: [], upcoming: [], undated: [], past: [] };
    ts.forEach(function (t) { by[Z.status(t).kind].push(t); });
    by.now.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    by.upcoming.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    by.undated.sort(function (a, b) { return b.createdAt - a.createdAt; });
    by.past.sort(function (a, b) { return a.end > b.end ? -1 : 1; });
    return ['now', 'upcoming', 'undated', 'past'].filter(function (k) { return by[k].length; }).map(function (k) { return { key: k, trips: by[k] }; });
  };
  Z.leadTrip = function () {
    var s = Z.sections().filter(function (x) { return x.key === 'now' || x.key === 'upcoming'; })[0];
    return s ? s.trips[0] : null;
  };
  function byTime(a, b) {
    if (!a.start && b.start) return -1;
    if (a.start && !b.start) return 1;
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    return a.createdAt - b.createdAt;
  }
  Z.days = function (t) {
    var es = Z.entries(t.id), today = Z.today();
    var unscheduled = es.filter(function (e) { return !e.date; }).sort(function (a, b) { return a.createdAt - b.createdAt; });
    var dated = es.filter(function (e) { return e.date; });
    var days = [], outside = [];
    if (t.start) {
      var end = t.end || t.start, n = dayDiff(t.start, end) + 1;
      for (var i = 0; i < n; i++) {
        var iso = Z.addDays(t.start, i);
        days.push({ date: iso, n: i + 1, isToday: iso === today, entries: dated.filter(function (e) { return e.date === iso; }).sort(byTime) });
      }
      outside = dated.filter(function (e) { return e.date < t.start || e.date > end; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : byTime(a, b); });
    } else {
      var seen = {};
      dated.forEach(function (e) { seen[e.date] = true; });
      days = Object.keys(seen).sort().map(function (iso) { return { date: iso, n: null, isToday: iso === today, entries: dated.filter(function (e) { return e.date === iso; }).sort(byTime) }; });
    }
    return { days: days, outside: outside, unscheduled: unscheduled };
  };
  Z.nowNext = function (t) {
    if (Z.status(t).kind !== 'now') return { now: null, next: null };
    var today = Z.today(), m = mins(Z.nowHM());
    var list = Z.entries(t.id).filter(function (e) { return e.date === today && e.start && !e.doneAt; }).sort(byTime);
    var now = null, next = null;
    list.forEach(function (e) {
      var s = mins(e.start), en = e.end ? mins(e.end) : s + 60;
      if (!now && s <= m && m < en) now = e;
    });
    list.forEach(function (e) { if (!next && e !== now && mins(e.start) > m) next = e; });
    return { now: now, next: next };
  };

  // ---------- derived: places and budget (ARCH §4.3, D11) ----------
  Z.entryOf = function (p) { return Z.data.entries.filter(function (e) { return e.placeId === p.id; })[0] || null; };
  Z.visited = function (p) { var e = Z.entryOf(p); return !!(e && e.doneAt); };
  Z.budget = function (t) {
    var es = Z.entries(t.id), ps = Z.places(t.id).filter(function (p) { return !Z.entryOf(p); });
    var plan = es.reduce(function (s, e) { return s + (e.cost || 0); }, 0);
    var ideas = ps.reduce(function (s, p) { return s + (p.estimate || 0); }, 0);
    var types = {};
    es.forEach(function (e) { if (e.cost) types[e.type] = (types[e.type] || 0) + e.cost; });
    var planned = plan + ideas, budget = t.budget == null ? null : t.budget;
    return {
      plan: plan, ideas: ideas, ideasCount: ps.length, ideasQueued: ps.some(function (p) { return p.pending; }),
      planned: planned, budget: budget, over: budget != null && planned > budget ? planned - budget : 0,
      left: budget != null && planned <= budget ? budget - planned : 0, ratio: budget ? planned / budget : null,
      uncosted: es.filter(function (e) { return e.cost == null; }).length,
      byType: Object.keys(types).map(function (k) { return { type: k, amount: types[k] }; }).sort(function (a, b) { return b.amount - a.amount; })
    };
  };
  Z.prep = function (t) {
    return Z.GROUPS.map(function (g) {
      var its = Z.items(t.id, g);
      return { group: g, items: its, total: its.length, done: its.filter(function (i) { return i.doneAt; }).length };
    });
  };
  Z.prepCounts = function (t) { var its = Z.items(t.id); return { total: its.length, done: its.filter(function (i) { return i.doneAt; }).length }; };
  Z.left = function (t) {
    var pc = Z.prepCounts(t);
    return { prep: pc.total - pc.done, mustDo: Z.places(t.id).filter(function (p) { return p.mustDo && !Z.entryOf(p); }).length };
  };

  // ---------- writes ----------
  function actor(source, o) { return (o && o.by) || (source === 'partner' ? 'b' : Z.me); }
  function stale(row, o) { return o && o.updatedAt && +new Date(o.updatedAt) !== +row.updatedAt; }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function write(source) {
    function emit(type, tripId, by, extra) { var ev = { type: type, tripId: tripId, by: by, source: source }; Object.keys(extra || {}).forEach(function (k) { ev[k] = extra[k]; }); Z.emit('change', ev); }
    return {
      createTrip: function (f, o) {
        var by = actor(source, o);
        var base = String(f.title || 'trip').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip', id = base, n = 2;
        while (Z.trip(id) || id === 'new') id = base + '-' + (n++);
        var t = { id: id, title: f.title, destination: f.destination || '', start: f.start || null, end: f.start ? (f.end || f.start) : null, budget: f.budget == null ? null : f.budget,
          notes: f.notes || '', cover: f.cover || null, createdBy: by, createdAt: Z.now(), updatedAt: Z.now() };
        Z.data.trips.push(t);
        Z.data.items = Z.data.items.concat(seedItems(id, by, Z.now()));  // atomic with the trip (ARCH §5)
        emit('trip-created', id, by, { trip: t });
        return t;
      },
      updateTrip: function (id, f, o) {
        var t = Z.trip(id); if (!t) return { notFound: true };
        if (stale(t, o)) return { conflict: true, current: copy(t) };
        ['title', 'destination', 'start', 'end', 'budget', 'notes', 'cover'].forEach(function (k) { if (k in f) t[k] = f[k]; });
        t.updatedAt = Z.now();
        var by = actor(source, o); emit('trip-updated', id, by, { trip: t, fields: Object.keys(f) });
        return { trip: t };
      },
      deleteTrip: function (id, o) {
        var t = Z.trip(id); if (!t) return { notFound: true };
        Z.data.trips = Z.data.trips.filter(function (x) { return x !== t; });
        ['entries', 'places', 'items'].forEach(function (k) { Z.data[k] = Z.data[k].filter(function (x) { return x.tripId !== id; }); });
        emit('trip-deleted', id, actor(source, o), { trip: t });
        return { trip: t };
      },
      addEntry: function (tripId, f, o) {
        if (!Z.trip(tripId)) return { notFound: true };
        var by = actor(source, o), e = E(tripId, { type: f.type, title: f.title, date: f.date, start: f.start, end: f.end, location: f.location, cost: f.cost, url: f.url, notes: f.notes, placeId: f.placeId, by: by, at: Z.now() });
        Z.data.entries.push(e);
        emit('entry-added', tripId, by, { entry: e });
        return { entry: e };
      },
      updateEntry: function (id, f, o) {
        var e = Z.entry(id); if (!e) return { notFound: true };
        if (stale(e, o)) return { conflict: true, current: copy(e) };
        ['type', 'title', 'date', 'start', 'end', 'location', 'cost', 'url', 'notes'].forEach(function (k) { if (k in f) e[k] = f[k]; });
        e.updatedAt = Z.now();
        emit('entry-updated', e.tripId, actor(source, o), { entry: e });
        return { entry: e };
      },
      deleteEntry: function (id, o) {
        var e = Z.entry(id); if (!e) return { notFound: true };
        Z.data.entries = Z.data.entries.filter(function (x) { return x !== e; });
        emit('entry-deleted', e.tripId, actor(source, o), { entry: e, place: e.placeId ? Z.place(e.placeId) : null });
        return { entry: e };
      },
      setEntryDone: function (id, done, o) {
        var e = Z.entry(id); if (!e) return { notFound: true };
        var by = actor(source, o);
        e.doneAt = done ? Z.now() : null; e.doneBy = done ? by : null; e.pending = !!(o && o.pending);
        emit('entry-done', e.tripId, by, { entry: e, done: done });
        return { entry: e };
      },
      addPlace: function (tripId, f, o) {
        if (!Z.trip(tripId)) return { notFound: true };
        var by = actor(source, o), p = PL(tripId, { type: f.type, title: f.title, area: f.area, notes: f.notes, url: f.url, estimate: f.estimate, mustDo: f.mustDo, by: by, at: Z.now() });
        p.pending = !!(o && o.pending);
        Z.data.places.push(p);
        emit('place-added', tripId, by, { place: p });
        return { place: p };
      },
      updatePlace: function (id, f, o) {
        var p = Z.place(id); if (!p) return { notFound: true };
        if (stale(p, o)) return { conflict: true, current: copy(p) };
        ['type', 'title', 'area', 'notes', 'url', 'estimate', 'mustDo'].forEach(function (k) { if (k in f) p[k] = f[k]; });
        p.updatedAt = Z.now();
        emit('place-updated', p.tripId, actor(source, o), { place: p });
        return { place: p };
      },
      deletePlace: function (id, o) {
        var p = Z.place(id); if (!p) return { notFound: true };
        var e = Z.entryOf(p);
        Z.data.places = Z.data.places.filter(function (x) { return x !== p; });
        if (e) e.placeId = null; // ON DELETE SET NULL: the plan entry stays
        emit('place-deleted', p.tripId, actor(source, o), { place: p, entry: e });
        return { place: p };
      },
      // Scheduling copies the place into a new plan entry, cost pre-filled from the estimate (D11).
      schedulePlace: function (placeId, f, o) {
        var p = Z.place(placeId); if (!p) return { notFound: true };
        var taken = Z.entryOf(p); if (taken) return { taken: taken };
        var by = actor(source, o);
        var e = E(p.tripId, { type: p.type, title: p.title, date: f.date || null, start: f.start || null, end: f.end || null, location: p.area, cost: p.estimate, url: p.url, notes: p.notes, placeId: p.id, by: by, at: Z.now() });
        Z.data.entries.push(e);
        emit('place-scheduled', p.tripId, by, { place: p, entry: e });
        return { entry: e };
      },
      addItem: function (tripId, group, title, o) {
        if (!Z.trip(tripId)) return { notFound: true };
        var by = actor(source, o), pos = Z.items(tripId, group).reduce(function (m, i) { return Math.max(m, i.position); }, 0) + 1;
        var it = { id: uid('i'), tripId: tripId, group: group, title: title, position: pos, doneAt: null, doneBy: null, seeded: false, createdBy: by, createdAt: Z.now(), updatedAt: Z.now() };
        Z.data.items.push(it);
        emit('item-added', tripId, by, { item: it });
        return { item: it };
      },
      updateItem: function (id, f, o) {
        var it = Z.item(id); if (!it) return { notFound: true };
        if (stale(it, o)) return { conflict: true, current: copy(it) };
        if ('group' in f && f.group !== it.group) { it.position = Z.items(it.tripId, f.group).reduce(function (m, i) { return Math.max(m, i.position); }, 0) + 1; it.group = f.group; }
        if ('title' in f) it.title = f.title;
        it.updatedAt = Z.now();
        emit('item-updated', it.tripId, actor(source, o), { item: it });
        return { item: it };
      },
      deleteItem: function (id, o) {
        var it = Z.item(id); if (!it) return { notFound: true };
        Z.data.items = Z.data.items.filter(function (x) { return x !== it; });
        emit('item-deleted', it.tripId, actor(source, o), { item: it });
        return { item: it };
      },
      setItemDone: function (id, done, o) {
        var it = Z.item(id); if (!it) return { notFound: true };
        var by = actor(source, o);
        it.doneAt = done ? Z.now() : null; it.doneBy = done ? by : null; it.pending = !!(o && o.pending);
        emit('item-done', it.tripId, by, { item: it, done: done });
        return { item: it };
      },
      moveItem: function (id, dir, o) {
        var it = Z.item(id); if (!it) return { notFound: true };
        var list = Z.items(it.tripId, it.group), i = list.indexOf(it), j = i + dir;
        if (j < 0 || j >= list.length) return { item: it, position: i + 1, total: list.length };
        var other = list[j], p = it.position; it.position = other.position; other.position = p;
        emit('item-moved', it.tripId, actor(source, o), { item: it });
        return { item: it, position: j + 1, total: list.length };
      }
    };
  }
  var mine = write('me');
  Object.keys(mine).forEach(function (k) { Z[k] = mine[k]; });
  Z.partner = write('partner');

  // ---------- connection ----------
  // Queued offline: done ticks (plan and prep) and place adds (ARCH §9). Everything else waits for a connection.
  function queued() {
    return Z.data.entries.filter(function (e) { return e.pending; }).concat(Z.data.items.filter(function (i) { return i.pending; }), Z.data.places.filter(function (p) { return p.pending; }));
  }
  Z.queued = queued;
  Z.setOffline = function (off, o) {
    o = o || {};
    if (Z.offline === off) return;
    Z.offline = off;
    var q = queued();
    if (!off) q.forEach(function (x) { x.pending = false; });
    Z.emit('connection', { offline: off, synced: off ? 0 : q.length });
    if (o.silent) return;
    var screenMsg = o.message || (off ? Z.offlineMessage : Z.onlineMessage);
    Z.announce(screenMsg ? (typeof screenMsg === 'function' ? screenMsg(q.length) : screenMsg)
      : off ? 'You\'re offline. Ticking things off and adding places still work.' : (q.length ? 'Back online. Syncing your changes.' : 'Back online.'));
    if (!off && q.length) setTimeout(function () { Z.toast({ msg: q.length + ' ' + Z.plural(q.length, 'change', 'changes') + ' synced' }); }, 600);
  };

  // ---------- components ----------
  // The doorway: a cover in the arch, or the title's initial. Decorative (the title is always next to it).
  Z.doorway = function (t, size) {
    var cover = Z.uploadsEnabled && t.cover;
    var inner;
    if (cover && cover.url) inner = '<img src="' + Z.esc(cover.url) + '" alt="" loading="lazy">';
    else if (cover) inner = '<span class="door-example">' + Z.svg('image') + '<span>Example photo</span></span>';
    else inner = '<span class="door-initial">' + Z.esc((t.title || '').trim().charAt(0).toUpperCase()) + '</span>';
    return '<div class="door door--' + size + (cover ? ' has-photo' : '') + '" aria-hidden="true">' + inner + '</div>';
  };
  // The light band: TripCountdown laid flat (direction B). The one saffron block on a screen.
  // Read in order it says "12 days to go · Next trip" (the numeral is not aria-hidden, copy.md).
  Z.lightBand = function (t, o) {
    o = o || {};
    var s = Z.status(t), count, words, kicker;
    if (s.kind === 'undated') return '';
    if (s.kind === 'upcoming') {
      if (s.days === 1) { count = ''; words = 'Tomorrow'; }
      else { count = String(s.days); words = 'days to go'; }
      var nights = t.end ? dayDiff(t.start, t.end) : 0;
      kicker = (o.lead !== false ? 'Next trip' : '') + (o.nights && nights ? (o.lead !== false ? ' · ' : '') + nights + ' ' + Z.plural(nights, 'night', 'nights') : '');
    } else if (s.kind === 'now') {
      count = 'Day ' + s.day; words = 'of ' + s.total; kicker = s.last ? 'Last day' : 'Happening now';
    } else {
      count = ''; words = s.ago === 1 ? 'Ended yesterday' : 'Ended ' + s.ago + ' days ago'; kicker = '';
    }
    return '<p class="light' + (s.kind === 'past' ? ' light--past' : '') + (s.kind === 'now' ? ' light--now' : '') + '">' +
      (count ? '<b class="light-count num">' + Z.esc(count) + '</b> ' : '') +
      '<span class="light-words">' + Z.esc(words) + '</span>' +
      (kicker ? '<span class="light-sep" aria-hidden="true"> · </span><span class="light-kicker">' + Z.esc(kicker) + '</span>' : '') + '</p>';
  };
  // The ink-and-pencil budget bar (C graft onto B). Track spans max(planned, budget).
  Z.budgetBar = function (t, o) {
    o = o || {};
    var b = Z.budget(t);
    // No budget, no bar: a full bar announced as 100 would claim a limit that doesn't exist (critique F4).
    if (b.budget == null) return '';
    var span = Math.max(b.planned, b.budget || 0) || 1;
    var planPct = b.plan / span * 100, ideaPct = b.ideas / span * 100, markPct = b.budget != null ? b.budget / span * 100 : null;
    var vt = b.budget == null ? Z.fmt(b.planned) + ' MAD planned'
      : Z.fmt(b.planned) + ' MAD planned' + (b.ideas ? ', of which about ' + Z.fmt(b.ideas) + ' MAD are ideas,' : '') + ' of ' + Z.fmt(b.budget) + ' MAD' + (b.over ? ', over by ' + Z.fmt(b.over) + ' MAD' : '');
    var now = b.budget ? Math.min(100, Math.round(b.planned / b.budget * 100)) : 100;
    return '<div class="bbar' + (b.over ? ' is-over' : '') + (b.budget == null ? ' no-budget' : '') + '" role="progressbar" aria-label="' + Z.esc(o.label || 'Budget') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + now + '" aria-valuetext="' + Z.esc(vt) + '">' +
      '<span class="bbar-ink" style="width:' + planPct.toFixed(2) + '%"></span>' +
      (b.ideas ? '<span class="bbar-pencil" style="width:max(12px,' + ideaPct.toFixed(2) + '%)"></span>' : '') +
      (markPct != null ? '<span class="bbar-mark" style="inset-inline-start:' + markPct.toFixed(2) + '%"></span>' : '') + '</div>';
  };
  Z.tally = function (done, total) {
    if (!total || total > 12) return '';
    var h = '<span class="tally" aria-hidden="true">';
    for (var i = 0; i < total; i++) h += '<i' + (i < done ? ' class="on"' : '') + '></i>';
    return h + '</span>';
  };
  Z.afterRender = function () { placeToast(); };

  // ---------- page chrome ----------
  Z.title = function (t) { document.title = t; };
  Z.footnote = function (t, scenario) { var f = $('#footnote'); f.innerHTML = t ? Z.esc(t) + (scenario ? '<br>' + Z.esc(scenario) : '') : ''; };
  Z.setFab = function (on) { document.body.classList.toggle('no-fab', !on); };
  Z.setChrome = function (c) { if (c) document.documentElement.dataset.chrome = c; else delete document.documentElement.dataset.chrome; };

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
        : a.dataset && a.dataset.act ? '[data-act="' + a.dataset.act + '"]' + (a.dataset.id ? '[data-id="' + a.dataset.id + '"]' : '')
        : a.getAttribute('href') ? 'a[href="' + a.getAttribute('href') + '"]' : null;
      key = sel ? { sel: sel, idx: Array.prototype.indexOf.call(root.querySelectorAll(sel), a) } : null;
    }
    fn();
    if (key) { var list = root.querySelectorAll(key.sel), n = list[key.idx] || list[0]; if (n) n.focus({ preventScroll: true }); else Z.focusPrimary(); }
  };

  // ---------- live region and toast (Home's behaviour) ----------
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
  var toastTimer = null, toastPaused = false, toastUndo = null, TOAST_MS = 10000, toastEl = null, flash = null;
  function placeToast() {
    var t = toastEl; if (!t) return;
    var dock = $('#view .dock');
    if (dock) { if (dock.nextElementSibling !== t) dock.after(t); }
    else if (!document.contains(t) || t.parentNode !== $('#main')) $('#main').insertBefore(t, $('#view'));
  }
  Z.flash = function (o) { flash = o; };
  Z.toast = function (o) {
    var t = toastEl;
    placeToast();
    t.classList.toggle('is-done', !!o.done);
    t.querySelector('.toast-title').textContent = o.title || '';
    t.querySelector('.toast-msg').textContent = o.msg;
    var u = t.querySelector('.toast-undo');
    toastUndo = o.undo || null; u.hidden = !toastUndo;
    if (toastUndo) u.setAttribute('aria-label', o.undoLabel || 'Undo'); else u.removeAttribute('aria-label');
    t.hidden = false; t.classList.add('is-entering'); document.documentElement.classList.add('toast-open');
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove('is-entering'); }); });
    // Keyboard users get an Undo toast that waits for them (WCAG 2.2.1): it stays until Undo, Esc, the next
    // toast or a route change. Pointer users and toasts without Undo keep the 10 s timer (a11y major 1).
    var kb = !lastPointer && !!toastUndo;
    Z.announce((o.title ? o.title + ' ' : '') + o.msg + (toastUndo ? (kb ? ' Undo is at the end of the page. Escape dismisses.' : ' Undo is the next button.') : ''));
    clearTimeout(toastTimer); if (!kb) schedule();
  };
  function schedule() { clearTimeout(toastTimer); toastTimer = setTimeout(function () { if (!toastPaused) Z.hideToast(); else schedule(); }, TOAST_MS); }
  Z.hideToast = function () {
    var t = toastEl; if (!t || t.hidden) return;
    var had = t.contains(document.activeElement);
    t.hidden = true; toastUndo = null; document.documentElement.classList.remove('toast-open');
    if (had) Z.focusPrimary();
  };

  // ---------- parsing ----------
  // Money: "1 200", "1,200", "12,50", "12.50". 0 is a real cost (free); empty means no cost (null).
  Z.parseMoney = function (raw) {
    var s = String(raw == null ? '' : raw).replace(/[\s  ]/g, '');
    if (s === '') return { value: null };
    var n;
    if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) n = parseFloat(s.replace(/,/g, ''));
    else if (/^\d+,\d{1,2}$/.test(s)) n = parseFloat(s.replace(',', '.'));
    else if (/^\d+(\.\d{1,2})?$/.test(s)) n = parseFloat(s);
    else return { error: 'Use numbers only, for example 350 or 1 200.' };
    if (n < 0) return { error: 'Use numbers only, for example 350 or 1 200.' };
    return { value: n };
  };
  Z.validUrl = function (s) { try { var u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; } };
  Z.host = function (s) { try { return new URL(s).host.replace(/^www\./, ''); } catch (e) { return s; } };

  // ---------- shared dialog behaviour ----------
  var phone = window.matchMedia('(max-width: 47.99rem)'), wide = window.matchMedia('(min-width: 64rem)');
  Z.isPhone = function () { return phone.matches; };
  Z.isWide = function () { return wide.matches; };
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
      var opener = document.activeElement, result = false;
      function done(v) { result = v; dlg.close(); }
      ok.onclick = function () { done(true); };
      no.onclick = function () { done(false); };
      dlg.onclose = function () { dlg.onclose = null; document.documentElement.classList.remove('confirm-open'); resolve(result); if (!result && opener && document.contains(opener)) Z.focus(opener); };
      document.documentElement.classList.add('confirm-open'); // the sheet underneath steps back (critique F7)
      dlg.showModal();
      Z.focus(no);
    });
  };

  // ---------- in-trip dialogs: dialogs.js replaces this stub ----------
  Z.dialogs = { entrySheet: function () {}, placeSheet: function () {}, itemSheet: function () {}, fromRoute: function () { return false; }, closeAll: function () {} };

  // ---------- routing ----------
  var views = {}, current = null, mounts = 0, scrolls = {}, zIdx = 0;
  Z.view = function (name, def) { views[name] = def; };
  function parse(hash) {
    var h = (hash || '').replace(/^#/, '') || '/trips';
    var qi = h.indexOf('?'), path = qi > -1 ? h.slice(0, qi) : h, query = {};
    if (qi > -1) new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { query[k] = v; });
    var m;
    if (path === '/trips' || path === '/trips/') return { view: 'list', path: '/trips', query: query };
    if (path === '/trips/new') return { view: 'form', mode: 'create', path: path, query: query };
    if ((m = path.match(/^\/trips\/([^/]+)\/edit$/))) return { view: 'form', mode: 'edit', id: m[1], path: path, query: query };
    if ((m = path.match(/^\/trips\/([^/]+)$/))) return { view: 'detail', id: m[1], path: path, query: query };
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
    var same = current && current.view === r.view && current.id === r.id && current.mode === r.mode;
    var prev = current; Z.prevRoute = prev; current = r; Z.route = r;
    if (same && views[r.view] && views[r.view].update && views[r.view].update(r)) { Z.emit('route', r); return; }
    if (prev && views[prev.view] && views[prev.view].unmount) views[prev.view].unmount();
    if (prev) scrolls[prev.path] = window.scrollY;
    Z.hideToast();
    Z.dialogs.closeAll();
    document.querySelectorAll('dialog[open]').forEach(function (d) { d.close(); });
    Z.offlineMessage = null; Z.onlineMessage = null;
    Z.setChrome(r.view === 'form' ? 'task' : '');
    Z.setFab(true);
    Z.footnote('');
    mounts++;
    var root = $('#view'); root.innerHTML = ''; root.className = '';
    var res = views[r.view] ? views[r.view].mount(root, r) : null;
    if (r.view !== 'list' || scrolls[r.path] == null) window.scrollTo(0, 0);
    if (res !== 'focus-handled' && mounts > 1) Z.focusHeading();
    Z.afterRender();
    if (flash) { var f = flash; flash = null; setTimeout(function () { Z.toast(f); }, 0); }
    Z.emit('route', r);
  }
  function elsewhere(r) {
    if (current && views[current.view] && views[current.view].unmount) views[current.view].unmount();
    current = r; Z.route = r; Z.setChrome(''); Z.setFab(false);
    $('#view').innerHTML = '<h1 class="title-lg" tabindex="-1">Not in this prototype</h1><p>This prototype covers Trips only. <a href="#/trips">Go to Trips</a>, <a href="../goals/goals.html">open Goals</a> or <a href="../home/home.html">open Home</a>.</p>';
    Z.footnote(''); Z.title('Not in this prototype – Zamane'); if (mounts++ > 0) Z.focusHeading();
  }
  Z.scrollFor = function (path) { return scrolls[path]; };

  // ---------- start ----------
  Z.start = function () {
    toastEl = $('#toast');
    $('.skip').addEventListener('click', function (e) { e.preventDefault(); var m = $('#main'); m.focus(); m.scrollIntoView(); });
    var t = toastEl;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !t.hidden && !document.querySelector('dialog[open]')) Z.hideToast(); });
    t.addEventListener('mouseenter', function () { toastPaused = true; });
    t.addEventListener('mouseleave', function () { toastPaused = false; });
    t.addEventListener('focusin', function () { toastPaused = true; });
    t.addEventListener('focusout', function () { toastPaused = false; });
    t.querySelector('.toast-undo').addEventListener('click', function () { var u = toastUndo; Z.hideToast(); if (u) u(); });
    // The Trips tab on the list scrolls to the top (nav-bar convention); elsewhere it goes to the list.
    document.querySelector('.nav-link[href="#/trips"]').addEventListener('click', function (e) {
      if (current && current.view === 'list') { e.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    });
    window.addEventListener('online', function () { Z.setOffline(false); });
    window.addEventListener('offline', function () { Z.setOffline(true); });
    window.addEventListener('hashchange', handle);
    handle();
  };
})();
