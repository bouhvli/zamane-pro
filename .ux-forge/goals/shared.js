/* Zamane Goals prototype: the shared layer (window.Z).
   Plain script, no modules (file:// must work). Loaded first by goals.html; each view file
   (list.js, detail.js, composer.js, form.js) registers itself with Z.view(name, {...}).

   ─── API summary (read this, not the whole file) ──────────────────────────────────────────
   Flags (set once from ?state=, global for the session; Z.setOffline(off, {silent, message})).
     Z.offlineMessage / Z.onlineMessage: set on mount to the screen's own sentence (string or fn(queuedCount));
     Z.setOffline announces exactly that one sentence. Z.prevRoute: the route before this one.
     Z.state            the raw ?state= value ('populated' if none)
     Z.offline          true for state 'offline' or any '*-offline' (composer-offline …). Z.setOffline(bool)
     Z.uploadsEnabled   false for 'uploads-off'
     Z.solo             true for 'solo' (partner hasn't joined: Z.members.b is null)
     Z.fixture(view)    the ?state= value if this mount is the initial route's view, else null.
                        Use it for view-only fixtures (entry-sheet, composer, delete-confirm …).
   Members:  Z.members.a / .b = {id, name, initial}; Z.me = 'a' (Sara). Z.name(id), Z.av(id, 'sm'|'md'|'lg')
   Data (example, ia.md §8; "today" is Mon 9 Nov 2026):
     Z.goal(id) · Z.goals() · Z.entries(goalId) newest first · Z.notes(goalId) newest first
     Z.progress(g)  money: saved MAD (queued included) · general: latest percent
     Z.ratio(g) 0..n · Z.pct(g) 0..100 (capped) · Z.isDone(g) · Z.lastEntry(g)
     Z.shares(g)  [{id, name, amount|count, pct}] in slot order (a, b), b omitted when solo
     Z.stats(g)   money: {count, total, average, largest, thisMonth, last, shares}
                  general: {count, counts:{a,b}, last, monthFrom, monthTo}
     Z.openGoals() (D1 order) · Z.doneGoals() (reached, newest first) · Z.totalSaved()
   Writes (each returns a result and emits 'change' {type, goalId, by, source}):
     Z.addEntry(goalId, {by, amount|percent, note, pending}) → {entry, completed, reopened}
     Z.removeEntry(entryId, {by}) → {entry, completed, reopened}
     Z.createGoal(fields, {by}) → goal
     Z.updateGoal(id, fields, {by, updatedAt}) → {goal} | {conflict:true, current} | {notFound:true}
     Z.deleteGoal(id, {by}) → {goal}
     Z.saveNote(goalId, {id?, blocks, updatedAt?}, {by}) → {note} | {conflict:true, current} | {notFound:true}
     Z.deleteNote(id, {by}) → {note}
     Z.partner.* = the same writes made by Youssef (source 'partner'): for live fixtures.
     Z.on('change'|'connection'|'route', fn) / Z.off(…)
   Formatting: Z.esc · Z.fmt(n) '14,250' · Z.mad(n) '14,250 MAD' · Z.day(d) 'Sat 7 Nov' (+ year if not this year)
     Z.time(d) '19:42' · Z.dayTime(d) 'Sat 7 Nov, 19:42' · Z.month(d) 'November' · Z.ago(d) 'just now'|'yesterday'|'2 days ago'|day
     Z.plural(n, one, other) · Z.svg(icon[, cls]) with Z.ICON names
   Components: Z.doorway(g, size, {closing}) size = 'detail'|'tile'|'row'|'form'
     Z.bar(g, {label, from}) the design-system progress bar (role=progressbar)
     Z.afterRender()  call after EVERY render or re-render: runs bar fills and surround animations, re-places the toast
     Z.backdropClose(dialog[, onClose]) · Z.placeSheet(dialog) (keyboard-aware bottom sheet) · Z.isPhone()
     Dialogs: give every <dialog> a visually hidden <p class="dlg-live vh" role="status"> so Z.announce reaches it.
   UI services: Z.announce(msg) · Z.toast({title, msg, done, undo, undoLabel}) · Z.hideToast() · Z.flash(toastOpts) after navigating
     Z.quickAdd(goalId) Home's sheet at step B, this goal pre-picked, no "Change goal"
     Z.commitAdd(goalId, value, note) the sheet's commit (toasts + Undo), for toast fixtures
     Z.confirm({title, body, confirm, cancel}) → Promise<boolean>; alertdialog, focus on cancel, Esc = cancel
     Z.focusPrimary() · Z.keepFocus(root, fn) re-render without losing focus · Z.setFab(bool) · Z.setChrome('task'|'')
     Z.title(text) document title · Z.footnote(text) example-data label · Z.focusHeading()
   Routing (hash): #/goals · #/goals/new · #/goals/:id · #/goals/:id/edit, with an optional ?view= or ?note= in the hash.
     Z.route = {view, id, mode, query, path} · Z.go(hash, {replace}) · Z.canGoBack() · Z.back()
   Views: Z.view(name, {mount(root, route), update?(route) → true if handled, unmount?()})
     mount() renders into #view. Return 'focus-handled' if the view set focus itself; otherwise the shell
     focuses the h1. The list remembers its scroll; other routes start at the top.
   ───────────────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var Z = window.Z = {};
  var P = new URLSearchParams(location.search);
  Z.state = P.get('state') || 'populated';
  Z.offline = /(^|-)offline$/.test(Z.state);
  Z.uploadsEnabled = Z.state !== 'uploads-off';
  Z.solo = Z.state === 'solo';
  function $(s, r) { return (r || document).querySelector(s); }
  Z.$ = $;

  // ---------- events ----------
  var handlers = {};
  Z.on = function (t, fn) { (handlers[t] = handlers[t] || []).push(fn); };
  Z.off = function (t, fn) { handlers[t] = (handlers[t] || []).filter(function (f) { return f !== fn; }); };
  Z.emit = function (t, detail) { (handlers[t] || []).slice().forEach(function (fn) { fn(detail); }); };

  // ---------- time: the prototype's "now" is Mon 9 Nov 2026, ticking from page load ----------
  var TODAY = new Date(2026, 10, 9, 12, 0, 0), LOADED = Date.now();
  Z.now = function () { return new Date(TODAY.getTime() + (Date.now() - LOADED)); };
  function D(y, m, d, h, mi) { return new Date(y, m - 1, d, h || 12, mi || 0); }
  Z.D = D;

  // ---------- formatting ----------
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  Z.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  Z.fmt = function (n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); };
  Z.mad = function (n) { return Z.fmt(n) + ' MAD'; };
  Z.plural = function (n, one, other) { return n === 1 ? one : other; };
  function yearSuffix(d) { return d.getFullYear() === Z.now().getFullYear() ? '' : ' ' + d.getFullYear(); }
  // decision.md: the year is added when a date isn't in the current year.
  Z.day = function (d) { d = new Date(d); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()] + yearSuffix(d); };
  Z.time = function (d) { d = new Date(d); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  Z.dayTime = function (d) { return Z.day(d) + ', ' + Z.time(d); };
  Z.month = function (d) { d = new Date(d); return MONTH[d.getMonth()] + yearSuffix(d); };
  Z.monthKey = function (d) { d = new Date(d); return d.getFullYear() + '-' + d.getMonth(); };
  function startOfDay(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  Z.ago = function (d) {
    d = new Date(d);
    var now = Z.now(), mins = (now - d) / 60000;
    if (mins < 1) return 'just now';
    var days = Math.round((startOfDay(now) - startOfDay(d)) / 864e5);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + ' days ago';
    return Z.day(d);
  };
  Z.isoDate = function (d) { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // ---------- icons (Lucide, stroke 1.75) ----------
  Z.ICON = {
    chevron: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
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
    note: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    goal: '<path d="M12 13V2l8 4-8 4"/><path d="M20.561 10.222a9 9 0 1 1-12.55-5.29"/><path d="M8.002 9.997a5 5 0 1 0 8.9 2.02"/>',
    moreH: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
  };
  Z.svg = function (name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + Z.ICON[name] + '</svg>'; };

  // ---------- members ----------
  Z.me = 'a';
  Z.members = { a: { id: 'a', name: 'Sara', initial: 'S' }, b: Z.solo ? null : { id: 'b', name: 'Youssef', initial: 'Y' } };
  Z.name = function (id) { var m = Z.members[id]; return m ? m.name : 'Youssef'; };
  Z.av = function (id, size) { return '<span class="zm-av zm-av-' + id + ' zm-av-' + (size || 'sm') + '" aria-hidden="true">' + (id === 'a' ? 'S' : 'Y') + '</span>'; };

  // ---------- example data (ia.md §8). Every figure adds up; all of it is labelled on screen. ----------
  var seq = 100;
  function uid(p) { return p + (++seq); }
  function seed(state) {
    var d = {
      goals: [
        { id: 'wedding', kind: 'money', title: 'Wedding fund', target: 20000, targetDate: D(2027, 6, 12), description: 'For the venue in Fes, the photographer and the dress.',
          cover: { example: true }, createdAt: D(2026, 7, 28, 20, 10), createdBy: 'a', updatedAt: D(2026, 9, 2, 9, 0), completedAt: null, completedBy: null },
        { id: 'guest-room', kind: 'general', title: 'Paint the guest room', target: null, targetDate: null, description: '',
          cover: null, createdAt: D(2026, 10, 3, 11, 0), createdBy: 'b', updatedAt: D(2026, 10, 3, 11, 0), completedAt: null, completedBy: null, placeholder: true },
        { id: 'honeymoon', kind: 'money', title: 'Honeymoon', target: 30000, targetDate: null, description: '',
          cover: null, createdAt: D(2026, 11, 1, 21, 30), createdBy: 'a', updatedAt: D(2026, 11, 1, 21, 30), completedAt: null, completedBy: null, placeholder: true },
        { id: 'sofa', kind: 'money', title: 'New sofa', target: 6000, targetDate: null, description: '',
          cover: null, createdAt: D(2026, 8, 10, 19, 0), createdBy: 'b', updatedAt: D(2026, 8, 10, 19, 0), completedAt: D(2026, 10, 30, 18, 5), completedBy: 'b' }
      ],
      entries: [
        { id: 'e7', goalId: 'wedding', by: 'a', amount: 500, note: 'bonus month', at: D(2026, 11, 7, 19, 42) },
        { id: 'e6', goalId: 'wedding', by: 'b', amount: 1000, note: '', at: D(2026, 11, 1, 10, 15) },
        { id: 'e5', goalId: 'wedding', by: 'a', amount: 750, note: '', at: D(2026, 10, 28, 21, 5) },
        { id: 'e4', goalId: 'wedding', by: 'b', amount: 3000, note: '', at: D(2026, 10, 15, 18, 30) },
        { id: 'e3', goalId: 'wedding', by: 'a', amount: 2000, note: '', at: D(2026, 10, 1, 9, 12) },
        { id: 'e2', goalId: 'wedding', by: 'b', amount: 2500, note: '', at: D(2026, 9, 1, 8, 40) },
        { id: 'e1', goalId: 'wedding', by: 'a', amount: 4500, note: '', at: D(2026, 8, 1, 12, 0) },
        { id: 'p3', goalId: 'guest-room', by: 'b', percent: 60, note: '', at: D(2026, 11, 8, 17, 20) },
        { id: 'p2', goalId: 'guest-room', by: 'a', percent: 40, note: '', at: D(2026, 10, 24, 15, 0) },
        { id: 'p1', goalId: 'guest-room', by: 'b', percent: 20, note: '', at: D(2026, 10, 10, 16, 45) },
        { id: 's3', goalId: 'sofa', by: 'b', amount: 1000, note: '', at: D(2026, 10, 30, 18, 5) },
        { id: 's2', goalId: 'sofa', by: 'a', amount: 2500, note: '', at: D(2026, 9, 15, 20, 0) },
        { id: 's1', goalId: 'sofa', by: 'b', amount: 2500, note: '', at: D(2026, 8, 15, 13, 30) }
      ],
      notes: [
        { id: 'n2', goalId: 'wedding', by: 'a', at: D(2026, 11, 7, 19, 50), updatedAt: D(2026, 11, 7, 19, 50),
          blocks: [{ type: 'text', text: 'The bonus came in, so most of it went here. Seven months to go and we\'re ahead of where we said we\'d be.' }] },
        { id: 'n1', goalId: 'wedding', by: 'b', at: D(2026, 11, 1, 10, 30), updatedAt: D(2026, 11, 1, 10, 30),
          blocks: [
            { type: 'text', text: 'Saw the venue in Fes with your mum this morning. The courtyard is even nicer than in the photos.' },
            { type: 'image', example: true, alt: '' },
            { type: 'text', text: 'We sat by the fountain afterwards and did the sums again. If we keep this pace we\'re fine.' }
          ] }
      ]
    };
    if (state === 'empty') { d.goals = []; d.entries = []; d.notes = []; }
    if (state === 'all-done') {
      d.entries.unshift({ id: 'e8', goalId: 'wedding', by: 'b', amount: 5750, note: '', at: D(2026, 11, 9, 9, 30) });
      d.entries.unshift({ id: 'h2', goalId: 'honeymoon', by: 'b', amount: 15000, note: '', at: D(2026, 11, 6, 20, 0) });
      d.entries.unshift({ id: 'h1', goalId: 'honeymoon', by: 'a', amount: 15000, note: '', at: D(2026, 11, 4, 20, 0) });
      d.entries.unshift({ id: 'p4', goalId: 'guest-room', by: 'a', percent: 100, note: '', at: D(2026, 11, 8, 19, 0) });
      g(d, 'wedding').completedAt = D(2026, 11, 9, 9, 30); g(d, 'wedding').completedBy = 'b';
      g(d, 'honeymoon').completedAt = D(2026, 11, 6, 20, 0); g(d, 'honeymoon').completedBy = 'b';
      g(d, 'guest-room').completedAt = D(2026, 11, 8, 19, 0); g(d, 'guest-room').completedBy = 'a';
    }
    if (state === 'solo') {
      // Partner hasn't joined: everything was added by Sara.
      d.entries.forEach(function (e) { e.by = 'a'; });
      d.notes.forEach(function (n) { n.by = 'a'; });
      d.goals.forEach(function (x) { x.createdBy = 'a'; if (x.completedBy) x.completedBy = 'a'; });
    }
    return d;
  }
  function g(d, id) { return d.goals.filter(function (x) { return x.id === id; })[0]; }
  Z.data = seed(Z.state);
  Z.snapshot = function () { return JSON.parse(JSON.stringify(Z.data), function (k, v) { return /At$|^at$|Date$/.test(k) && typeof v === 'string' ? new Date(v) : v; }); };
  Z.restore = function (snap) { Z.data = snap; };

  // ---------- reads and derived values (ARCHITECTURE §4.3: never stored, except completed_at/by) ----------
  Z.goals = function () { return Z.data.goals.slice(); };
  Z.goal = function (id) { return g(Z.data, id) || null; };
  function newestFirst(a, b) { return b.at - a.at; }
  Z.entries = function (goalId) { return Z.data.entries.filter(function (e) { return e.goalId === goalId; }).sort(newestFirst); };
  Z.notes = function (goalId) { return Z.data.notes.filter(function (n) { return n.goalId === goalId; }).sort(newestFirst); };
  Z.lastEntry = function (gl) { return Z.entries(gl.id)[0] || null; };
  Z.progress = function (gl) {
    var es = Z.entries(gl.id);
    if (gl.kind === 'money') return es.reduce(function (s, e) { return s + e.amount; }, 0);
    return es.length ? es[0].percent : 0;
  };
  Z.ratio = function (gl) { return gl.kind === 'money' ? (gl.target ? Z.progress(gl) / gl.target : 0) : Z.progress(gl) / 100; };
  Z.pct = function (gl) { return Math.round(Math.min(1, Z.ratio(gl)) * 100); };
  Z.isDone = function (gl) { return gl.kind === 'money' ? Z.progress(gl) >= gl.target : Z.progress(gl) === 100; };
  function lastActivity(gl) { var e = Z.lastEntry(gl); return e ? e.at : gl.createdAt; }
  // D1: open goals closest to done first; ties go to the most recent activity.
  Z.openGoals = function () {
    return Z.data.goals.filter(function (x) { return !Z.isDone(x); })
      .sort(function (a, b) { return (Z.ratio(b) - Z.ratio(a)) || (lastActivity(b) - lastActivity(a)); });
  };
  Z.doneGoals = function () {
    return Z.data.goals.filter(Z.isDone).sort(function (a, b) { return (b.completedAt || 0) - (a.completedAt || 0); });
  };
  Z.totalSaved = function () {
    return Z.data.goals.filter(function (x) { return x.kind === 'money'; }).reduce(function (s, x) { return s + Z.progress(x); }, 0);
  };
  Z.shares = function (gl) {
    var es = Z.entries(gl.id), ids = Z.members.b ? ['a', 'b'] : ['a'];
    if (gl.kind === 'money') {
      var total = es.reduce(function (s, e) { return s + e.amount; }, 0);
      return ids.map(function (id) {
        var amt = es.filter(function (e) { return e.by === id; }).reduce(function (s, e) { return s + e.amount; }, 0);
        return { id: id, name: Z.name(id), amount: amt, pct: total ? Math.round(amt / total * 100) : 0 };
      });
    }
    return ids.map(function (id) {
      var n = es.filter(function (e) { return e.by === id; }).length;
      return { id: id, name: Z.name(id), count: n, pct: es.length ? Math.round(n / es.length * 100) : 0 };
    });
  };
  Z.stats = function (gl) {
    var es = Z.entries(gl.id), now = Z.now(), mk = Z.monthKey(now);
    var month = es.filter(function (e) { return Z.monthKey(e.at) === mk; });
    if (gl.kind === 'money') {
      var total = es.reduce(function (s, e) { return s + e.amount; }, 0);
      return { count: es.length, total: total, average: es.length ? Math.round(total / es.length) : 0,
        largest: es.reduce(function (m, e) { return Math.max(m, e.amount); }, 0),
        thisMonth: month.reduce(function (s, e) { return s + e.amount; }, 0), last: es[0] || null, shares: Z.shares(gl) };
    }
    var before = es.filter(function (e) { return e.at < new Date(now.getFullYear(), now.getMonth(), 1); })[0];
    return { count: es.length, counts: { a: es.filter(function (e) { return e.by === 'a'; }).length, b: es.filter(function (e) { return e.by === 'b'; }).length },
      last: es[0] || null, monthFrom: before ? before.percent : 0, monthTo: month.length ? month[0].percent : null };
  };

  // ---------- writes ----------
  function touch(gl) { gl.updatedAt = Z.now(); }
  // services/completion.ts: crossing up sets completed_at/by; dropping back clears both.
  function recompute(gl, actor) {
    var done = Z.isDone(gl), res = { completed: false, reopened: false };
    if (done && !gl.completedAt) { gl.completedAt = Z.now(); gl.completedBy = actor; res.completed = true; }
    if (!done && gl.completedAt) { gl.completedAt = null; gl.completedBy = null; res.reopened = true; }
    return res;
  }
  function write(source) {
    return {
      addEntry: function (goalId, o) {
        var gl = Z.goal(goalId); if (!gl) return { notFound: true };
        var e = { id: uid('e'), goalId: goalId, by: o.by || (source === 'partner' ? 'b' : Z.me), note: o.note || '', at: Z.now(), pending: !!o.pending };
        if (gl.kind === 'money') e.amount = o.amount; else e.percent = o.percent;
        Z.data.entries.push(e);
        var r = recompute(gl, e.by); r.entry = e;
        Z.emit('change', { type: 'entry-added', goalId: goalId, by: e.by, source: source, entry: e, completed: r.completed, reopened: r.reopened });
        return r;
      },
      removeEntry: function (entryId, o) {
        var e = Z.data.entries.filter(function (x) { return x.id === entryId; })[0]; if (!e) return { notFound: true };
        Z.data.entries = Z.data.entries.filter(function (x) { return x !== e; });
        var gl = Z.goal(e.goalId), by = (o && o.by) || (source === 'partner' ? 'b' : Z.me);
        var r = recompute(gl, by); r.entry = e;
        Z.emit('change', { type: 'entry-removed', goalId: e.goalId, by: by, source: source, entry: e, completed: r.completed, reopened: r.reopened });
        return r;
      },
      createGoal: function (f, o) {
        var by = (o && o.by) || (source === 'partner' ? 'b' : Z.me);
        var base = String(f.title || 'goal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'goal', id = base, n = 2;
        while (Z.goal(id) || id === 'new') id = base + '-' + (n++);
        var gl = { id: id, kind: f.kind, title: f.title, target: f.kind === 'money' ? f.target : null, targetDate: f.targetDate || null,
          description: f.description || '', cover: f.cover || null, createdAt: Z.now(), createdBy: by, updatedAt: Z.now(), completedAt: null, completedBy: null };
        Z.data.goals.push(gl);
        Z.emit('change', { type: 'goal-created', goalId: id, by: by, source: source });
        return gl;
      },
      // Optimistic concurrency (ARCHITECTURE §5): updatedAt must match, else 409 with the current row.
      updateGoal: function (id, f, o) {
        var gl = Z.goal(id); if (!gl) return { notFound: true };
        o = o || {};
        if (o.updatedAt && +new Date(o.updatedAt) !== +gl.updatedAt) return { conflict: true, current: JSON.parse(JSON.stringify(gl)) };
        ['title', 'target', 'targetDate', 'description', 'cover'].forEach(function (k) { if (k in f) gl[k] = f[k]; });
        touch(gl);
        var by = o.by || (source === 'partner' ? 'b' : Z.me), r = recompute(gl, by); r.goal = gl;
        Z.emit('change', { type: 'goal-updated', goalId: id, by: by, source: source, completed: r.completed, reopened: r.reopened });
        return r;
      },
      deleteGoal: function (id, o) {
        var gl = Z.goal(id); if (!gl) return { notFound: true };
        Z.data.goals = Z.data.goals.filter(function (x) { return x !== gl; });
        Z.data.entries = Z.data.entries.filter(function (x) { return x.goalId !== id; });
        Z.data.notes = Z.data.notes.filter(function (x) { return x.goalId !== id; });
        var by = (o && o.by) || (source === 'partner' ? 'b' : Z.me);
        Z.emit('change', { type: 'goal-deleted', goalId: id, by: by, source: source, goal: gl });
        return { goal: gl };
      },
      saveNote: function (goalId, n, o) {
        if (!Z.goal(goalId)) return { notFound: true };
        var by = (o && o.by) || (source === 'partner' ? 'b' : Z.me), note;
        if (n.id) {
          note = Z.data.notes.filter(function (x) { return x.id === n.id; })[0];
          if (!note) return { notFound: true };
          if (n.updatedAt && +new Date(n.updatedAt) !== +note.updatedAt) return { conflict: true, current: JSON.parse(JSON.stringify(note)) };
          note.blocks = n.blocks; note.updatedAt = Z.now();
        } else {
          note = { id: uid('n'), goalId: goalId, by: by, at: Z.now(), updatedAt: Z.now(), blocks: n.blocks };
          Z.data.notes.push(note);
        }
        Z.emit('change', { type: n.id ? 'note-updated' : 'note-added', goalId: goalId, by: by, source: source, note: note });
        return { note: note };
      },
      deleteNote: function (id, o) {
        var note = Z.data.notes.filter(function (x) { return x.id === id; })[0]; if (!note) return { notFound: true };
        Z.data.notes = Z.data.notes.filter(function (x) { return x !== note; });
        var by = (o && o.by) || (source === 'partner' ? 'b' : Z.me);
        Z.emit('change', { type: 'note-deleted', goalId: note.goalId, by: by, source: source, note: note });
        return { note: note };
      }
    };
  }
  var mine = write('me');
  Object.keys(mine).forEach(function (k) { Z[k] = mine[k]; });
  Z.partner = write('partner');

  // ---------- connection ----------
  // o.silent: no announcement or sync toast (fixtures). o.message: the screen's own offline sentence.
  Z.setOffline = function (off, o) {
    o = o || {};
    if (Z.offline === off) return;
    Z.offline = off;
    var queued = Z.data.entries.filter(function (e) { return e.pending; });
    if (!off) queued.forEach(function (e) { e.pending = false; });
    Z.emit('connection', { offline: off, synced: off ? 0 : queued.length });
    if (o.silent) return;
    var screenMsg = o.message || (off ? Z.offlineMessage : Z.onlineMessage);
    if (screenMsg) { Z.announce(typeof screenMsg === 'function' ? screenMsg(queued.length) : screenMsg); if (!off && queued.length) setTimeout(function () { Z.toast({ msg: queued.length + ' ' + Z.plural(queued.length, 'contribution', 'contributions') + ' synced' }); }, 600); return; }
    Z.announce(off ? 'You\'re offline. Adding to goals still works.' : (queued.length ? 'Back online. Syncing your changes.' : 'Back online.'));
    if (!off && queued.length) setTimeout(function () { Z.toast({ msg: queued.length + ' ' + Z.plural(queued.length, 'contribution', 'contributions') + ' synced' }); }, 600);
  };

  // ---------- components ----------
  // The doorway: a cover in the arch, or the title's initial. Decorative (the title is always next to it).
  Z.doorway = function (gl, size, opts) {
    opts = opts || {};
    var done = opts.done != null ? opts.done : Z.isDone(gl);
    var cover = Z.uploadsEnabled && gl.cover;
    var cls = 'door door--' + size + (cover ? ' has-photo' : '') + (done ? ' is-done' : '') + (opts.closing ? ' is-closing' : '');
    var inner;
    if (cover && cover.url) inner = '<img src="' + Z.esc(cover.url) + '" alt="" loading="lazy">';
    else if (cover) inner = '<span class="door-example">' + Z.svg('image') + '<span>Example photo</span></span>';
    else inner = '<span class="door-initial">' + Z.esc((gl.title || '').trim().charAt(0).toUpperCase()) + '</span>';
    return '<div class="' + cls + '" aria-hidden="true">' + inner + '</div>';
  };
  // The design-system progress bar. Pass {from: previousPct} to animate the fill after render.
  Z.bar = function (gl, o) {
    o = o || {};
    var pct = Z.pct(gl), money = gl.kind === 'money', p = Z.progress(gl);
    var valuetext = money ? Z.mad(p) + ' of ' + Z.mad(gl.target) : p + '%';
    var from = o.from;
    return '<div class="track" role="progressbar" aria-label="' + Z.esc(o.label || gl.title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-valuetext="' + Z.esc(valuetext) + '">' +
      '<div class="fill" style="width:' + (from != null ? from : pct) + '%"' + (from != null ? ' data-to="' + pct + '"' : '') + '></div></div>';
  };
  Z.afterRender = function () {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      document.querySelectorAll('.fill[data-to]').forEach(function (f) { f.style.width = f.dataset.to + '%'; f.removeAttribute('data-to'); });
    }); });
    document.querySelectorAll('.door.is-closing').forEach(function (d) { d.addEventListener('animationend', function () { d.classList.remove('is-closing'); }, { once: true }); });
    placeToast();
  };

  // ---------- page chrome ----------
  Z.title = function (t) { document.title = t; };
  Z.footnote = function (t) { $('#footnote').textContent = t || ''; };
  Z.setFab = function (on) { document.body.classList.toggle('no-fab', !on); };
  Z.setChrome = function (c) { if (c) document.documentElement.dataset.chrome = c; else delete document.documentElement.dataset.chrome; };

  // ---------- focus ----------
  var lastPointer = false;
  window.addEventListener('pointerdown', function () { lastPointer = true; }, true);
  window.addEventListener('keydown', function () { lastPointer = false; }, true);
  Z.usedPointer = function () { return lastPointer; };
  Z.focus = function (el) { if (el) el.focus({ preventScroll: true, focusVisible: !lastPointer }); };
  Z.focusPrimary = function () { var p = $('#primary'); if (p) Z.focus(p); else Z.focusHeading(); };
  Z.focusHeading = function () { var h = $('#view h1'); if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } };
  // Re-render a region without losing keyboard focus (WCAG 2.4.3). Keys by id, then data-act + data-id,
  // then href, by position among matches inside the root (Home's a11y round-2 fix).
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

  // ---------- live region and toast (Home's, verbatim behaviour) ----------
  // Track modal stacking so announcements reach the topmost open dialog, not the first in the DOM.
  var dlgStack = [], nativeShow = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () {
    var d = this; nativeShow.apply(d, arguments);
    dlgStack = dlgStack.filter(function (x) { return x !== d; }); dlgStack.push(d);
    d.addEventListener('close', function () { dlgStack = dlgStack.filter(function (x) { return x !== d; }); }, { once: true });
  };
  Z.topDialog = function () { var open = dlgStack.filter(function (d) { return d.open; }); return open[open.length - 1] || document.querySelector('dialog[open]'); };
  Z.announce = function (msg) {
    var open = Z.topDialog();
    var l = (open && open.querySelector('.dlg-live')) || $('#live'); // the page region is inert under a modal
    l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 50);
  };
  var toastTimer = null, toastPaused = false, toastUndo = null, TOAST_MS = 10000, toastEl = null, flash = null;
  // The toast sits right after the floating primary in the DOM, so Undo is one Tab away (Home a11y round 1).
  // It's held by reference: a view re-render can't destroy it, and Z.afterRender() puts it back after the dock.
  function placeToast() {
    var t = toastEl; if (!t) return;
    var dock = $('#view .dock');
    if (dock) { if (dock.nextElementSibling !== t) dock.after(t); }
    else if (!document.contains(t) || t.parentNode !== $('#main')) $('#main').insertBefore(t, $('#view'));
  }
  Z.flash = function (o) { flash = o; }; // a toast to show after the next route mounts (e.g. "Wedding fund deleted")
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
    Z.announce((o.title ? o.title + ' ' : '') + o.msg + (toastUndo ? ' Undo is the next button.' : ''));
    clearTimeout(toastTimer); schedule();
  };
  function schedule() { clearTimeout(toastTimer); toastTimer = setTimeout(function () { if (!toastPaused) Z.hideToast(); else schedule(); }, TOAST_MS); }
  Z.hideToast = function () {
    var t = toastEl; if (!t || t.hidden) return;
    var had = t.contains(document.activeElement);
    t.hidden = true; toastUndo = null; document.documentElement.classList.remove('toast-open');
    if (had) Z.focusPrimary();
  };

  // ---------- amount parsing (Home's; the real rules live in shared/money.ts) ----------
  Z.parseAmount = function (raw) {
    var s = String(raw).replace(/[\s  ]/g, '');
    if (s === '') return { error: 'Enter an amount, for example 500.' };
    var n;
    if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) n = parseFloat(s.replace(/,/g, ''));
    else if (/^\d+,\d{1,2}$/.test(s)) n = parseFloat(s.replace(',', '.'));
    else if (/^\d+(\.\d{1,2})?$/.test(s)) n = parseFloat(s);
    else return { error: 'Use numbers only, for example 500 or 500,50.' };
    if (!(n > 0)) return { error: 'Enter an amount greater than 0.' };
    return { value: n };
  };
  Z.parsePercent = function (raw) {
    var s = String(raw).trim();
    if (s === '') return { error: 'Enter a number from 0 to 100.' };
    if (!/^\d+$/.test(s)) return { error: 'Use whole numbers, for example 40.' };
    var n = parseInt(s, 10);
    if (n > 100) return { error: 'Enter a number from 0 to 100.' };
    return { value: n };
  };

  // ---------- shared dialog behaviour ----------
  var phone = window.matchMedia('(max-width: 47.99rem)');
  Z.isPhone = function () { return phone.matches; };
  function outside(dlg, e) { var r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; }
  // Backdrop dismissal only when the press both starts and ends outside the box (WCAG 2.5.2). Use on any <dialog>.
  Z.backdropClose = function (dlg, onClose) {
    var pressed = false;
    dlg.addEventListener('pointerdown', function (e) { pressed = e.target === dlg && outside(dlg, e); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && pressed && outside(dlg, e)) { if (onClose) onClose(); else dlg.close(); } pressed = false; });
  };
  // Keep a bottom sheet on the on-screen keyboard (iOS ignores interactive-widget). Ignores pinch-zoom.
  // Full-screen dialogs (the composer) opt out with class "composer" or data-no-place.
  Z.placeSheet = function (dlg) {
    if (dlg.classList.contains('composer') || dlg.hasAttribute('data-no-place')) return;
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
      dlg.onclose = function () { dlg.onclose = null; resolve(result); if (!result && opener && document.contains(opener)) Z.focus(opener); };
      dlg.showModal();
      Z.focus(no); // the safe choice is focused (copy.md: "Keep it" first and focused)
    });
  };

  // ---------- quick-add sheet (Home's, at step B with the goal pre-picked) ----------
  var sheetGoal = null;
  Z.quickAdd = function (goalId) {
    var sheet = $('#sheet');
    sheetGoal = Z.goal(goalId); if (!sheetGoal) return;
    renderSheet();
    if (!sheet.open) sheet.showModal();
    Z.placeSheet(sheet);
    var amt = $('#amt'); amt.focus(); if (sheetGoal.kind !== 'money') amt.select();
  };
  function renderSheet() {
    var gl = sheetGoal, body = $('#sheet-body');
    $('#sheet-h').textContent = 'Add to a goal';
    $('#sheet-sub').textContent = 'Adding to ' + gl.title;
    if (gl.kind === 'money') {
      body.innerHTML = '<form id="add-form" novalidate>' +
        '<label class="field-label" for="amt">Amount<span class="vh"> in MAD</span></label>' +
        '<div class="field" id="amt-field"><input id="amt" name="amount" inputmode="decimal" autocomplete="off" enterkeyhint="done" aria-describedby="sheet-sub amt-help amt-err"><span class="suffix" aria-hidden="true">MAD</span></div>' +
        '<p class="help num" id="amt-help">For example 500 or 1 200</p><p class="err" id="amt-err" hidden></p>' +
        '<div class="sheet-actions"><button class="btn-primary" type="submit">Add contribution</button>' +
        '<div class="sheet-links"><button class="link-btn" type="button" data-sheet="note" aria-expanded="false" aria-controls="note-wrap">Add a note</button></div></div>' +
        '<div class="note-wrap" id="note-wrap" hidden><label class="field-label" for="note">Note</label><div class="field field-text"><input id="note" name="note" maxlength="120" autocomplete="off" enterkeyhint="done" aria-describedby="note-help"></div><p class="help" id="note-help">Optional. For example, bonus month</p></div></form>';
      $('#amt').addEventListener('input', function () {
        var v = Z.parseAmount(this.value);
        $('#amt-help').textContent = v.value ? gl.title + ' will be at ' + Z.fmt(Z.progress(gl) + v.value) + ' MAD of ' + Z.fmt(gl.target) + ' MAD' : 'For example 500 or 1 200';
        if (!$('#amt-err').hidden) clearError();
      });
    } else {
      var now = Z.progress(gl);
      body.innerHTML = '<form id="add-form" novalidate>' +
        '<label class="field-label" for="amt">Progress, from 0 to 100%</label>' +
        '<p class="help" style="margin:0 0 var(--space-2)">Now at ' + now + '%</p>' +
        '<div class="stepper"><button class="btn-sec" type="button" data-step="-10">−10<span class="vh"> percentage points</span></button>' +
        '<div class="field" id="amt-field"><input id="amt" name="percent" inputmode="numeric" autocomplete="off" enterkeyhint="done" value="' + now + '" aria-describedby="sheet-sub amt-help amt-err"><span class="suffix" aria-hidden="true">%</span></div>' +
        '<button class="btn-sec" type="button" data-step="10">+10<span class="vh"> percentage points</span></button></div>' +
        '<p class="help" id="amt-help">Enter the new total, not the amount to add.</p><p class="err" id="amt-err" hidden></p>' +
        '<div class="sheet-actions"><button class="btn-primary" type="submit">Update progress</button></div></form>';
      $('#amt').addEventListener('input', function () { if (!$('#amt-err').hidden) clearError(); });
    }
    $('#add-form').addEventListener('submit', submitSheet);
  }
  function sheetSay(msg, assertive) { var r = assertive ? $('#sheet-alert') : $('#sheet-live'); r.textContent = ''; setTimeout(function () { r.textContent = msg; }, 50); }
  function showError(msg) {
    var e = $('#amt-err'); e.textContent = msg; e.hidden = false;
    $('#amt-field').classList.add('is-invalid'); $('#amt').setAttribute('aria-invalid', 'true'); $('#amt').focus();
    sheetSay(msg, true);
  }
  Z.sheetError = showError;
  function clearError() { var e = $('#amt-err'); e.hidden = true; $('#amt-field').classList.remove('is-invalid'); $('#amt').removeAttribute('aria-invalid'); $('#sheet-alert').textContent = ''; }
  function submitSheet(e) {
    e.preventDefault();
    var gl = sheetGoal, money = gl.kind === 'money';
    var v = money ? Z.parseAmount($('#amt').value) : Z.parsePercent($('#amt').value);
    if (v.error) { showError(v.error); return; }
    var note = money && $('#note') ? $('#note').value.trim() : '';
    $('#sheet').close();
    Z.commitAdd(gl.id, v.value, note);
  }
  // The sheet's commit: write, then Home's toasts (Undo removes my own just-added entry).
  Z.commitAdd = function (goalId, value, note) {
    var gl = Z.goal(goalId), money = gl.kind === 'money', offline = Z.offline;
    var beforePct = Z.progress(gl);
    Z.animFrom[goalId] = Z.pct(gl);
    var r = Z.addEntry(goalId, money ? { amount: value, note: note, pending: offline } : { percent: value, pending: offline });
    var amountText = Z.fmt(value);
    var undo = function () {
      Z.animFrom[goalId] = Z.pct(gl);
      Z.removeEntry(r.entry.id);
      Z.focusPrimary();
      Z.toast({ msg: money ? 'Removed ' + amountText + ' MAD from ' + gl.title : gl.title + ' is back to ' + beforePct + '%' });
    };
    var undoLabel = money ? 'Undo: remove ' + amountText + ' MAD from ' + gl.title : 'Undo: set ' + gl.title + ' back to ' + beforePct + '%';
    Z.focusPrimary();
    if (r.completed) {
      Z.toast({ done: true, title: 'Goal reached.', msg: offline ? 'Goal reached once this syncs.' : (Z.route && Z.route.view === 'detail' && Z.route.id === gl.id ? (money ? Z.fmt(gl.target) + ' MAD together.' : 'At 100%.') : (money ? gl.title + ': ' + Z.fmt(gl.target) + ' MAD together.' : gl.title + ' is at 100%.')), undo: undo, undoLabel: undoLabel });
    } else if (money) {
      Z.toast({ msg: 'Added ' + amountText + ' MAD to ' + gl.title + (offline ? '. Will sync when you\'re back online.' : ''), undo: undo, undoLabel: undoLabel });
    } else {
      Z.toast({ msg: offline ? gl.title + ' set to ' + value + '%. Will sync when you\'re back online.' : gl.title + ' is now at ' + value + '%', undo: undo, undoLabel: undoLabel });
    }
    return r;
  };
  Z.animFrom = {}; // goalId → previous pct, read by views when they re-render a bar after a write

  // ---------- routing ----------
  var views = {}, current = null, currentRoot = null, initialHash = null, mounts = 0, scrolls = {}, zIdx = 0;
  Z.view = function (name, def) { views[name] = def; };
  function parse(hash) {
    var h = (hash || '').replace(/^#/, '') || '/goals';
    var qi = h.indexOf('?'), path = qi > -1 ? h.slice(0, qi) : h, query = {};
    if (qi > -1) new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { query[k] = v; });
    var m;
    if (path === '/goals' || path === '/goals/') return { view: 'list', path: '/goals', query: query };
    if (path === '/goals/new') return { view: 'form', mode: 'create', path: path, query: query };
    if ((m = path.match(/^\/goals\/([^/]+)\/edit$/))) return { view: 'form', mode: 'edit', id: m[1], path: path, query: query };
    if ((m = path.match(/^\/goals\/([^/]+)$/))) return { view: 'detail', id: m[1], path: path, query: query };
    return { view: 'elsewhere', path: path, query: query };
  }
  Z.fixture = function (viewName) { return mounts === 1 && current && current.view === viewName && Z.state !== 'populated' ? Z.state : null; };
  Z.canGoBack = function () { return history.state && history.state.zIdx > 1; };
  Z.back = function () { history.back(); };
  Z.go = function (hash, o) {
    if (o && o.replace) { history.replaceState({ zIdx: (history.state && history.state.zIdx) || ++zIdx }, '', location.pathname + location.search + hash); handle(); }
    else location.hash = hash;
  };
  function handle() {
    if (!history.state || history.state.zIdx == null) history.replaceState({ zIdx: ++zIdx }, '', location.href);
    else zIdx = Math.max(zIdx, history.state.zIdx);
    // Only "#/…" hashes are routes; anything else (e.g. a stray "#main") leaves the screen alone.
    if (location.hash && location.hash.charAt(1) !== '/') return;
    var r = parse(location.hash);
    if (r.view === 'elsewhere') { elsewhere(r); return; }
    var same = current && current.view === r.view && current.id === r.id && current.mode === r.mode;
    var prev = current; Z.prevRoute = prev; current = r; Z.route = r;
    if (same && views[r.view] && views[r.view].update && views[r.view].update(r)) { Z.emit('route', r); return; }
    if (prev && views[prev.view] && views[prev.view].unmount) views[prev.view].unmount();
    if (prev) scrolls[prev.path] = window.scrollY;
    Z.hideToast();
    document.querySelectorAll('dialog[open]').forEach(function (d) { d.close(); });
    Z.offlineMessage = null; Z.onlineMessage = null; // each view sets its own on mount
    Z.setChrome(r.view === 'form' ? 'task' : '');
    Z.setFab(true);
    Z.footnote('');
    mounts++;
    var root = $('#view'); root.innerHTML = '';
    var res = views[r.view] ? views[r.view].mount(root, r) : null;
    if (r.view !== 'list' || scrolls[r.path] == null) window.scrollTo(0, 0);
    if (res !== 'focus-handled' && mounts > 1) Z.focusHeading();
    Z.afterRender();
    if (flash) { var f = flash; flash = null; setTimeout(function () { Z.toast(f); }, 0); }
    Z.emit('route', r);
  }
  function elsewhere(r) {
    // Other tabs aren't part of this prototype.
    if (current && views[current.view] && views[current.view].unmount) views[current.view].unmount();
    current = r; Z.route = r; Z.setChrome(''); Z.setFab(false);
    $('#view').innerHTML = '<h1 class="title-lg" tabindex="-1">Not in this prototype</h1><p>This prototype covers Goals only. <a href="#/goals">Go to Goals</a> or <a href="../home/home.html">open the Home prototype</a>.</p>';
    Z.footnote(''); Z.title('Not in this prototype – Zamane'); if (mounts++ > 0) Z.focusHeading();
  }
  Z.scrollFor = function (path) { return scrolls[path]; };

  // ---------- start ----------
  Z.start = function () {
    initialHash = location.hash;
    toastEl = $('#toast');
    // Skip link: move focus to main without touching the hash, which is the router's (a11y blocker).
    $('.skip').addEventListener('click', function (e) { e.preventDefault(); var m = $('#main'); m.focus(); m.scrollIntoView(); });
    Z.backdropClose($('#sheet'));
    $('#sheet-close').addEventListener('click', function () { $('#sheet').close(); });
    $('#sheet').addEventListener('click', function (e) {
      var a = e.target.closest('[data-sheet="note"]');
      if (a) { var open = a.getAttribute('aria-expanded') === 'true'; a.setAttribute('aria-expanded', String(!open)); $('#note-wrap').hidden = open; if (!open) $('#note').focus(); return; }
      var step = e.target.closest('[data-step]');
      if (step) { var i = $('#amt'); var v = parseInt(i.value, 10); if (isNaN(v)) v = Z.progress(sheetGoal); i.value = Math.max(0, Math.min(100, v + parseInt(step.dataset.step, 10))); clearError(); sheetSay(i.value + '%'); }
    });
    $('#sheet').addEventListener('close', function () {
      var s = $('#sheet'); s.style.bottom = ''; s.style.maxHeight = '';
      $('#sheet-live').textContent = ''; $('#sheet-alert').textContent = '';
      if (!toastEl.contains(document.activeElement)) Z.focusPrimary();
    });
    // Toast: Esc from anywhere when no dialog is open; hover and focus pause it.
    var t = toastEl;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !t.hidden && !document.querySelector('dialog[open]')) Z.hideToast(); });
    t.addEventListener('mouseenter', function () { toastPaused = true; });
    t.addEventListener('mouseleave', function () { toastPaused = false; });
    t.addEventListener('focusin', function () { toastPaused = true; });
    t.addEventListener('focusout', function () { toastPaused = false; });
    t.querySelector('.toast-undo').addEventListener('click', function () { var u = toastUndo; Z.hideToast(); if (u) u(); });
    // The Goals tab on the list scrolls to the top (nav-bar convention); elsewhere it goes to the list.
    document.querySelector('.nav-link[href="#/goals"]').addEventListener('click', function (e) {
      if (current && current.view === 'list') { e.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    });
    // Real connectivity changes drive the same path as the fixtures.
    window.addEventListener('online', function () { Z.setOffline(false); });
    window.addEventListener('offline', function () { Z.setOffline(true); });
    window.addEventListener('hashchange', handle);
    handle();
  };
})();
