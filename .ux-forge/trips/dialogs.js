/* Zamane Trips prototype: the in-trip dialogs (window.Z.dialogs). Direction B · Saffron light.
   Owned by the dialogs builder; see build-notes/dialogs.md. Plain script, no modules (file:// works).

   ─── What lives here ──────────────────────────────────────────────────────────────────────
   Two <dialog>s, built once and appended to <body>, each with its own .dlg-live (polite) and role=alert:
     #dg-sheet  read sheets, not in the URL: plan item (a commitment: solid card), place (an idea: dashed
                block), prep item (rename / move / delete). Bottom sheet on phones, centred 28rem from 48rem.
     #dg-form   URL-backed forms: ?entry=new|<id>[&date=], ?place=new|<id>, ?schedule=<placeId>.
                Full screen on phones (data-no-place; the footer rides the keyboard), centred from 48rem.
   Z.dialogs = { entrySheet(id), placeSheet(id), itemSheet(id), fromRoute(route) → bool, closeAll() }
     fromRoute opens the dialog the query names, keeps it if open, and closes it when Back removed the query
     (guarded when dirty: the query is pushed again and "Discard …?" is asked). It also listens to 'route'
     itself, so calls are idempotent. closeAll() is the shell's re-mount hook: a dirty form is parked and
     resumed if the same query is still in the URL after the re-mount.
   Writes go through Z.* only; the detail re-renders on 'change'. Focus returns to the opener, re-found by
   id or [data-act][data-id] if the detail re-rendered it; after a delete it goes to the next row.
   Fixtures (ia.md §8) run on the first detail route: see FIXTURES and runFixture() at the end.
   ───────────────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var Z = window.Z;
  if (!Z) return;
  var esc = Z.esc;
  var LATENCY = 350;                       // simulated round trip, so "Adding…" is visible
  var MAX = { title: 80, location: 120, area: 80, url: 2000, notes: 4000 };
  var MONEY_MAX = 1000000;                 // [VERIFY cap] copy.md planForm.error.cost.tooLarge
  var NOTES_COUNT_FROM = 3600;             // the counter shows near the 4,000 cap
  var DRAFT = 'zamane.trips.draft:';
  var FIXTURES = ['entry-sheet', 'place-sheet', 'item-sheet', 'confirm-delete-entry', 'confirm-delete-place',
    'entry-form', 'entry-form-details', 'entry-form-invalid', 'entry-form-offline', 'entry-form-conflict',
    'place-form', 'place-form-offline', 'schedule', 'schedule-taken', 'toast-added', 'toast-scheduled', 'toast-place-queued'];

  // ---------- copy (copy.md §3–6, Confirmations, Toasts; verbatim) ----------
  var C = {
    close: 'Close', cancel: 'Cancel', keepIt: 'Keep it', del: 'Delete', remove: 'Remove', edit: 'Edit', save: 'Save',
    saving: 'Saving…', adding: 'Adding…', saveChanges: 'Save changes', final: 'You can\'t undo this.',
    keepEditing: 'Keep editing', discard: 'Discard', copyText: 'Copy text', copied: 'Text copied',
    copyFailed: 'Couldn\'t copy. Select the text and copy it by hand.', restored: 'Draft restored.', discardDraft: 'Discard draft',
    useTheirs: 'Use theirs', emptyValue: '(empty)', resolved: 'Their version is in the field.', optional: 'Optional details',
    when: 'When', where: 'Where', cost: 'Cost', link: 'Link', notes: 'Notes', area: 'Area', estimate: 'Estimated cost',
    noDate: 'No date yet', anyTime: 'Any time', overnightSheet: 'Ends the next day', noCost: 'No cost yet', noEstimate: 'No estimate',
    openLink: 'Open link', newTab: '(opens in a new tab)', queued: 'Waiting to sync', mustDo: 'Must-do',
    idea: 'Idea. Not in the plan yet.', showInPlan: 'Show in the plan', reschedule: 'To move it to another day, edit its plan item.',
    schedule: 'Schedule', editNote: 'Changes here don\'t change its plan item.',
    itemHeading: 'Edit item', title: 'Title', group: 'Group', groupHelp: 'Moving it puts it at the end of the new group.',
    itemErr: 'Enter a title for the item.', saved: 'Changes saved',
    rDelete: 'Deleting needs a connection.', rSchedule: 'Scheduling needs a connection.', rQueued: 'This place hasn\'t synced yet.',
    rSave: 'You\'re offline. You can save your changes when you\'re back online. What you\'ve changed stays here.',
    rAdd: 'You\'re offline. You can add this when you\'re back online. What you\'ve typed stays here.',
    placeOfflineNew: 'You\'re offline. This place will be added when you\'re back online.',
    onAdd: 'Back online. You can add this now.', onSave: 'Back online. You can save your changes now.', onSchedule: 'Back online. You can schedule this now.',
    // plan item form
    pHeadNew: 'Add to the plan', pHeadEdit: 'Edit plan item', pSubmitNew: 'Add to the plan', pTitleHelp: 'For example, Dinner on the square',
    type: 'Type', day: 'Day', another: 'Another date…', date: 'Date', outside: 'This is outside the trip dates.',
    time: 'Time', timeHelp: 'Optional. Leave it empty if it can happen any time.', start: 'Start time', end: 'End time', overnight: 'Ends the next day.',
    location: 'Location', locationHelp: 'Optional. An address or a name you\'d recognise.', costHelp: 'Optional. For example 350 or 350,50',
    urlHelp: 'Optional. A booking or a page about it.', notesHelp: 'Optional.',
    eTitle: 'Enter a title, for example Dinner on the square.', eDate: 'Choose a date, or pick another day.', eDateBad: 'Enter a valid date.',
    eEnd: 'Add a start time first.', eCost: 'Use numbers only, for example 350 or 350,50.', eUrl: 'Use a web address starting with https://',
    pDiscardTitle: 'Discard this plan item?', discardBody: 'What you\'ve typed will be lost.', discardEditTitle: 'Discard your changes?',
    pMissing: 'This plan item was deleted. Your changes weren\'t saved.', pFailed: 'Couldn\'t add this. Try again.', pFailedEdit: 'Couldn\'t save the changes. Try again.',
    // place form
    plHeadNew: 'New place', plHeadEdit: 'Edit place', plSubmitNew: 'Add place', plTitleHelp: 'For example, Pena Palace',
    mustHelp: 'Something you don\'t want to miss.', areaHelp: 'Optional. A neighbourhood or town, for example old medina.',
    estHelp: 'Optional. A rough guess is fine. It counts toward the budget until the place is in the plan.',
    plETitle: 'Enter a title, for example Pena Palace.', plEEst: 'Use numbers only, for example 150 or 150,50.',
    plDiscardTitle: 'Discard this place?', plMissing: 'This place was deleted. Your changes weren\'t saved.', plFailed: 'Couldn\'t add the place. Try again.',
    // schedule
    sHead: 'Schedule this place', sPlaceholder: 'Choose a day', sNote: 'The cost is copied from the estimate. You can change it in the plan.',
    sSubmit: 'Add to the plan', sEDay: 'Choose a day, or No date yet.', sFailed: 'Couldn\'t schedule this. Try again.'
  };
  function tooLong(n, what) { return 'Use ' + Z.fmt(n) + ' characters or fewer for the ' + what + '.'; }
  function tooLarge() { return 'That amount is too large. Enter ' + Z.fmt(MONEY_MAX) + ' MAD or less.'; }
  // tripMerge.* (actor: partner | self | other)
  function actorOf(ev) {
    if (ev && ev.by && ev.by !== Z.me) return { kind: 'partner', id: ev.by, name: Z.name(ev.by) };
    if (ev && ev.source === 'partner') return { kind: 'self' };
    return { kind: 'other' };
  }
  function nounOf(k) { return k === 'entry' ? 'plan item' : k === 'place' ? 'place' : 'item'; }
  function sNotice(a, noun) {
    var tail = ' while you were editing. Check the marked fields, then save again.';
    if (a.kind === 'partner') return a.name + ' changed this ' + noun + tail;
    if (a.kind === 'self') return 'This ' + noun + ' changed on your other device' + tail;
    return 'This ' + noun + ' changed on another phone' + tail;
  }
  function sChangedBy(a) { return a.kind === 'partner' ? 'Changed by ' + a.name : a.kind === 'self' ? 'Changed on your other device' : 'Changed on another phone'; }
  function sConflict(a, v) {
    var q = '"' + v + '".';
    return a.kind === 'partner' ? a.name + ' changed this to ' + q : a.kind === 'self' ? 'Your other device changed this to ' + q : 'Another phone changed this to ' + q;
  }

  // ---------- small helpers ----------
  function byId(id) { return document.getElementById(id); }
  function visible(el) { return !!el && el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden],[inert]'); }
  function firstVisible(sels) {
    for (var i = 0; i < (sels || []).length; i++) {
      var list = document.querySelectorAll(sels[i]);
      for (var j = 0; j < list.length; j++) if (visible(list[j])) return list[j];
    }
    return null;
  }
  function sel(act, id) { return '#view [data-act="' + act + '"][data-id="' + CSS.escape(String(id)) + '"]'; }
  function P(lines) { return lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join(''); }
  function isIso(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || ''); }
  var store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: the draft lives only in the open form */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };
  function say(msg, urgent) {
    var d = Z.topDialog && Z.topDialog();
    if (!urgent || !d) { Z.announce(msg); return; }
    var l = d.querySelector('[role="alert"]'); if (!l) { Z.announce(msg); return; }
    l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 50);
  }
  function whenText(e) {
    if (!e.date) return C.noDate;
    var d = Z.day(e.date);
    if (!e.start) return d + ' · ' + C.anyTime;
    return d + ', ' + (e.end ? e.start + '–' + e.end : e.start);
  }
  function whenSr(e) { return e.date && e.start && e.end ? Z.day(e.date) + ', ' + e.start + ' to ' + e.end : whenText(e); }
  function inPlanWhen(e) { return e.date ? Z.day(e.date) + (e.start ? ', ' + e.start : '') : 'no date yet'; }
  function overnight(e) { return !!(e.start && e.end && e.end < e.start); }
  function addedText(r) { return 'Added by ' + Z.name(r.createdBy) + ' · ' + Z.day(r.createdAt); }
  function doneText(r) { return 'Done by ' + Z.name(r.doneBy) + ' · ' + Z.day(r.doneAt) + ' at ' + Z.time(r.doneAt); }
  function byLine(who, text, id) { return '<p class="dg-by"' + (id ? ' id="' + id + '"' : '') + '>' + Z.av(who, 'sm') + '<span>' + esc(text) + '</span></p>'; }
  function queuedLine() { return '<p class="queued dg-queued">' + Z.svg('cloudOff') + '<span>' + C.queued + '</span></p>'; }
  // A pasted url is the only link (U5). Visible text is its host; the name adds "(opens in a new tab)".
  function linkHTML(url) {
    if (!Z.validUrl(url)) return '<span dir="auto">' + esc(url) + '</span>';
    var host = Z.host(url);
    return '<a class="dg-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span dir="ltr">' + esc(host || C.openLink) + '</span><span class="vh"> ' + C.newTab + '</span>' + Z.svg('external') + '</a>';
  }
  function dlRow(label, value, cls) { return '<div class="dg-row"><dt>' + label + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + value + '</dd></div>'; }

  // ---------- who opened it, and where focus lands ----------
  var lastActivated = null;
  function describeEl(el) { return { el: el, id: el.id || null, act: el.getAttribute('data-act'), did: el.getAttribute('data-id'), at: Date.now() }; }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('#view button, #view a[href], #view [data-act]');
    if (el) lastActivated = describeEl(el);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var a = document.activeElement;
    if (a && a.closest && a.closest('#view') && a.id !== 'view') lastActivated = describeEl(a);
  }, true);
  function captureOpener() {
    var a = document.activeElement, v = byId('view');
    if (a && v && v.contains(a) && a !== v && a.tagName !== 'H1') return describeEl(a);
    if (lastActivated && Date.now() - lastActivated.at < 4000) return lastActivated;
    return null;
  }
  // The detail re-renders on 'change': find the same control again by id, then by [data-act][data-id].
  function refind(op) {
    if (!op) return null;
    if (visible(op.el)) return op.el;
    var q = op.id && byId(op.id);
    if (visible(q)) return q;
    if (op.act) return firstVisible(['#view [data-act="' + CSS.escape(op.act) + '"]' + (op.did ? '[data-id="' + CSS.escape(op.did) + '"]' : '')]);
    return null;
  }
  var FALLBACK = ['#primary', '#td-gone', '#view a[href="#/trips"]'];
  function land(sels, opener, reveal) {
    var el = (sels && firstVisible(sels)) || refind(opener) || firstVisible(FALLBACK);
    if (!el) { Z.focusHeading(); return; }
    if (reveal) el.scrollIntoView({ block: 'center' }); // clear of the toast and the floating primary (2.4.11)
    Z.focus(el);
  }
  // "Show in the plan": the plan item's row. The detail selects the Plan tab on phones and focuses it
  // (Z.detail.showEntry); without it, the tab is switched through ?view= and the row is focused here.
  function showInPlan(entryId) {
    if (Z.detail && Z.detail.showEntry) { Z.detail.showEntry(entryId); if (firstVisible([sel('entry', entryId)])) return; }
    var s = sel('entry', entryId);
    if (!firstVisible([s]) && Z.route && Z.route.view === 'detail') Z.go(Z.withQuery({ view: 'plan' }), { replace: true });
    setTimeout(function () {
      var el = firstVisible([s]);
      if (el) { el.scrollIntoView({ block: 'center' }); Z.focus(el); } else land(null, null);
    }, 0);
  }
  // After a delete: the next row, else the previous one, else the day's / group's Add (ia §6.3).
  function entryNeighbours(e) {
    var t = Z.trip(e.tripId), out = [];
    if (t) {
      var d = Z.days(t), groups = d.days.map(function (x) { return x.entries; }).concat([d.outside, d.unscheduled]);
      groups.forEach(function (g) {
        var i = g.indexOf(e);
        if (i > -1) { if (g[i + 1]) out.push(sel('entry', g[i + 1].id)); if (g[i - 1]) out.push(sel('entry', g[i - 1].id)); }
      });
    }
    if (e.date) out.push(sel('day-add', e.date));
    out.push('#view [data-act="new-entry"]');
    return out;
  }
  function placeState(p) { var en = Z.entryOf(p); return !en ? 'idea' : en.doneAt ? 'visited' : 'plan'; }
  function placeNeighbours(p) {
    var st = placeState(p), list = Z.places(p.tripId).filter(function (x) { return placeState(x) === st; }), i = list.indexOf(p), out = [];
    if (list[i + 1]) out.push(sel('place', list[i + 1].id));
    if (list[i - 1]) out.push(sel('place', list[i - 1].id));
    out.push('#view [data-act="new-place"]');
    return out;
  }
  function itemNeighbours(it) {
    var list = Z.items(it.tripId, it.group), i = list.indexOf(it), out = [];
    if (list[i + 1]) out.push(sel('item', list[i + 1].id));
    if (list[i - 1]) out.push(sel('item', list[i - 1].id));
    out.push(sel('add-open', it.group));
    return out;
  }
  function inPlanSels(placeId) { return [sel('inplan', placeId), sel('place', placeId)]; }

  // ---------- confirmations and deletes (shared by sheets and forms) ----------
  function confirmEntry(e) {
    var place = e.placeId ? Z.place(e.placeId) : null, lines = ['It\'s removed from the plan for both of you.'];
    if (place) lines.push(e.doneAt ? place.title + ' goes back to your ideas and is no longer visited.' : place.title + ' goes back to your ideas.');
    lines.push(C.final);
    return Z.confirm({ title: 'Delete ' + e.title + '?', body: P(lines), confirm: C.del, cancel: C.keepIt });
  }
  function confirmPlace(p) {
    if (p.pending) {
      var b = Z.members.b ? 'It hasn\'t synced, so ' + Z.members.b.name + ' never saw it.' : 'It hasn\'t synced yet.';
      return Z.confirm({ title: 'Remove ' + p.title + '?', body: P([b]), confirm: C.remove, cancel: C.keepIt });
    }
    var en = Z.entryOf(p), lines = ['It\'s removed from Places for both of you.'];
    if (en) lines.push(en.date ? 'Its plan item on ' + Z.day(en.date) + ' stays.' : 'Its plan item stays, with no date yet.');
    lines.push(C.final);
    return Z.confirm({ title: 'Delete ' + p.title + '?', body: P(lines), confirm: C.del, cancel: C.keepIt });
  }
  function confirmItem(it) {
    return Z.confirm({ title: 'Delete ' + it.title + ' from ' + Z.groupName(it.group) + '?', body: P(['It\'s removed for both of you.', C.final]), confirm: C.del, cancel: C.keepIt });
  }
  function deleteEntryNow(e) {
    var to = entryNeighbours(e);
    if (Z.deleteEntry(e.id).notFound) return null;
    return { focus: to, toast: { msg: 'Deleted ' + e.title + ' from the plan' } };
  }
  function deletePlaceNow(p) {
    var to = placeNeighbours(p), queued = !!p.pending;
    if (Z.deletePlace(p.id).notFound) return null;
    return { focus: to, toast: { msg: queued ? 'Removed ' + p.title + ' from Places' : 'Deleted ' + p.title + ' from Places' } };
  }
  function deleteItemNow(it) {
    var to = itemNeighbours(it);
    if (Z.deleteItem(it.id).notFound) return null;
    return { focus: to, toast: { msg: 'Deleted ' + it.title + ' from ' + Z.groupName(it.group) } };
  }

  // ---------- toasts with Undo (my own just-made adds, D14) ----------
  function entryAddedToast(e) {
    var t = e.title;
    return {
      msg: e.date ? 'Added ' + t + ' to ' + Z.day(e.date) : 'Added ' + t + ' to the plan, with no date yet',
      undoLabel: 'Undo: remove ' + t + ' from the plan',
      undo: function () {
        if (!Z.entry(e.id)) return;
        if (Z.offline) { Z.toast({ msg: 'Couldn\'t undo. ' + t + ' is still in the plan.' }); return; }
        Z.deleteEntry(e.id); Z.toast({ msg: 'Removed ' + t + ' from the plan' });
      }
    };
  }
  function scheduledToast(p, e) {
    var t = p.title;
    return {
      msg: e.date ? t + ' is on ' + Z.day(e.date) : t + ' is in the plan, with no date yet',
      undoLabel: 'Undo: take ' + t + ' out of the plan',
      undo: function () {
        if (!Z.entry(e.id)) return;
        if (Z.offline) { Z.toast({ msg: 'Couldn\'t undo. ' + t + ' is still in the plan.' }); return; }
        Z.deleteEntry(e.id); Z.toast({ msg: t + ' is back in your ideas' });
      }
    };
  }
  function placeAddedToast(p, queued) {
    var t = p.title;
    return {
      msg: queued ? 'Added ' + t + ' to Places. Will sync when you\'re back online.' : 'Added ' + t + ' to Places',
      undoLabel: 'Undo: remove ' + t + ' from Places',
      undo: function () {
        var cur = Z.place(p.id); if (!cur) return;
        if (Z.offline && !cur.pending) { Z.toast({ msg: 'Couldn\'t undo. Delete ' + t + ' from Places.' }); return; }
        Z.deletePlace(p.id); Z.toast({ msg: 'Removed ' + t + ' from Places' });
      }
    };
  }

  // ================= field engine (validation, describedby, three-way merge) =================
  // A context X = {kind, fields, validators, base, updatedAt, marks, errors, touched, noticeSlot, initialJSON}.
  function textDef(id, label, help, inDetails) {
    return { input: id, ids: [id], label: label, err: id + '-err', help: help || [], mark: id + '-mark', inDetails: !!inDetails,
      read: function () { var el = byId(id); return el ? el.value.trim() : ''; },
      write: function (v) { var el = byId(id); if (el) el.value = v == null ? '' : v; },
      norm: function (v) { return String(v == null ? '' : v).trim(); },
      shown: function (v) { v = String(v == null ? '' : v).trim(); return !v ? C.emptyValue : v.length > 60 ? v.slice(0, 57).trim() + '…' : v; } };
  }
  function moneyDef(id, label, help, inDetails) {
    var d = textDef(id, label, help, inDetails);
    d.read = function () { var el = byId(id); if (!el) return null; var p = Z.parseMoney(el.value); return p.error ? el.value.trim() : p.value; };
    d.write = function (v) { var el = byId(id); if (el) el.value = v == null ? '' : typeof v === 'number' ? Z.fmt(v) : v; };
    d.norm = function (v) { return v == null || v === '' ? '' : String(v).trim(); };
    d.shown = function (v) { return v == null || v === '' ? C.emptyValue : typeof v === 'number' ? Z.mad(v) : String(v); };
    return d;
  }
  function timeDef(id, label, help) {
    var d = textDef(id, label, help);
    d.read = function () { var el = byId(id); return el && el.value ? el.value : null; };
    return d;
  }
  function checkDef(id, label, help) {
    return { input: id, ids: [id], label: label, err: null, help: help || [], mark: id + '-mark',
      read: function () { var el = byId(id); return !!(el && el.checked); },
      write: function (v) { var el = byId(id); if (el) el.checked = !!v; },
      norm: function (v) { return v ? '1' : ''; }, shown: function (v) { return v ? C.mustDo : C.emptyValue; } };
  }
  function radioDef(name, label, nameFn, help) {
    function q(extra) { return document.querySelector('input[name="' + name + '"]' + (extra || '')); }
    return { name: name, label: label, err: null, help: help || [], mark: name + '-mark',
      target: function () { return byId(name); },                // the fieldset carries the description
      focus: function () { var c = q(':checked') || q(); if (c) c.focus(); },
      read: function () { var c = q(':checked'); return c ? c.value : null; },
      write: function (v) { var c = v && q('[value="' + v + '"]'); if (c) c.checked = true; },
      norm: function (v) { return v || ''; }, shown: function (v) { return nameFn(v); } };
  }
  // Day for a plan item: the select, or "Another date…" and its date input.
  function entryDayDef() {
    return { input: 'dgf-day', ids: ['dgf-day', 'dgf-date'], label: C.day, err: 'dgf-date-err', help: ['dgf-date-help'], mark: 'dgf-day-mark',
      target: function () { var s = byId('dgf-day'); return s && s.value === 'another' ? byId('dgf-date') : s; },
      describe: function (X) {
        var dt = byId('dgf-date'), s = byId('dgf-day'), ids = [];
        if (X.errors.date) ids.push('dgf-date-err');
        if (byId('dgf-date-help') && !byId('dgf-date-help').hidden) ids.push('dgf-date-help');
        if (dt) { if (ids.length) dt.setAttribute('aria-describedby', ids.join(' ')); else dt.removeAttribute('aria-describedby'); }
        if (s) { if (X.marks.date) s.setAttribute('aria-describedby', 'dgf-day-mark-text'); else s.removeAttribute('aria-describedby'); }
      },
      read: function () {
        var s = byId('dgf-day'); if (!s) return null;
        if (s.value === 'none') return null;
        if (s.value === 'another') { var i = byId('dgf-date'); return i && i.value ? i.value : ''; }
        return s.value;
      },
      write: function (v) { writeDay(v); },
      norm: function (v) { return v || ''; }, shown: function (v) { return v ? Z.day(v) : C.noDate; } };
  }
  function scheduleDayDef() {
    return { input: 'dgf-day', ids: ['dgf-day'], label: C.day, err: 'dgf-day-err', help: [], mark: 'dgf-day-mark',
      read: function () { var s = byId('dgf-day'); return !s ? '' : s.value === 'none' ? null : s.value; },
      write: function (v) { writeDay(v); },
      norm: function (v) { return v == null ? 'none' : v; }, shown: function (v) { return v ? Z.day(v) : C.noDate; } };
  }
  function fieldTarget(d) { return d.target ? d.target() : byId(d.input); }
  function fieldOf(X, el) {
    for (var f in X.fields) {
      var d = X.fields[f];
      if ((d.ids && d.ids.indexOf(el.id) > -1) || (d.name && el.name === d.name)) return f;
    }
    return null;
  }
  function values(X) { var o = {}; Object.keys(X.fields).forEach(function (f) { o[f] = X.fields[f].read(); }); return o; }
  function snapshot(X, rec) { var o = {}; Object.keys(X.fields).forEach(function (f) { o[f] = rec[f] === undefined ? null : rec[f]; }); return o; }
  function dirtyX(X) { return !!X && JSON.stringify(values(X)) !== X.initialJSON; }
  function describe(X, f) {
    var d = X.fields[f]; if (!d) return;
    if (d.describe) { d.describe(X); return; }
    var tgt = fieldTarget(d); if (!tgt) return;
    var ids = [];
    if (X.errors[f] && d.err) ids.push(d.err);
    d.help.forEach(function (id) { var el = byId(id); if (el && !el.hidden) ids.push(id); });
    if (X.marks[f]) ids.push(d.mark + '-text');
    if (ids.length) tgt.setAttribute('aria-describedby', ids.join(' ')); else tgt.removeAttribute('aria-describedby');
  }
  function describeAll(X) { Object.keys(X.fields).forEach(function (f) { describe(X, f); }); }
  function setError(X, f, msg) {
    var d = X.fields[f]; if (!d) return;
    X.errors[f] = msg || '';
    var el = d.err && byId(d.err), tgt = fieldTarget(d);
    if (el) { el.hidden = !msg; el.innerHTML = msg ? Z.svg('alert') + '<span>' + esc(msg) + '</span>' : ''; }
    if (tgt) {
      if (msg) tgt.setAttribute('aria-invalid', 'true'); else tgt.removeAttribute('aria-invalid');
      var w = tgt.closest('.field'); if (w) w.classList.toggle('is-invalid', !!msg);
    }
    describe(X, f);
  }
  function validateOne(X, f) { var v = X.validators[f]; return v ? v() : ''; }
  function validateAll(X) {
    var first = null;
    Object.keys(X.validators).forEach(function (f) { X.touched[f] = true; var m = validateOne(X, f); setError(X, f, m); if (m && !first) first = f; });
    return first;
  }
  function focusField(X, f) {
    var d = X.fields[f]; if (!d) return;
    if (d.inDetails) openDetails(true);
    if (d.focus) d.focus(); else { var t = fieldTarget(d); if (t) t.focus(); }
  }
  // Validate on blur only after typing; clear as soon as valid (copy.md §4 Errors).
  function onFieldInput(X, el) {
    var f = fieldOf(X, el); if (!f) return;
    X.touched[f] = true;
    if (X.errors[f]) setError(X, f, validateOne(X, f));
    if (f === 'start' && X.errors.end) setError(X, 'end', validateOne(X, 'end'));
  }
  function onFieldBlur(X, el) { var f = fieldOf(X, el); if (f && X.touched[f] && X.validators[f]) setError(X, f, validateOne(X, f)); }
  // The Goals §6.7 three-way merge: base B (what I opened), mine M (the fields), theirs T (the row now).
  function merge(X, T, actor) {
    var n = 0;
    Object.keys(X.fields).forEach(function (f) {
      var d = X.fields[f], b = d.norm(X.base[f]), m = d.norm(d.read()), t = d.norm(T[f]);
      if (b === t) return;                                                                         // they didn't change it
      if (m === b) { X.marks[f] = { type: 'changed', actor: actor }; d.write(T[f]); if (X.errors[f]) setError(X, f, ''); n++; } // only they did
      else if (m !== t) { X.marks[f] = { type: 'conflict', actor: actor, value: T[f] }; n++; }   // both, differently: keep mine, offer theirs
      else delete X.marks[f];
    });
    X.base = snapshot(X, T); X.updatedAt = T.updatedAt;
    Object.keys(X.fields).forEach(function (f) { renderMark(X, f); });
    afterFieldsChanged(X);
    return n;
  }
  function markHTML(X, f) {
    var m = X.marks[f]; if (!m) return '';
    var d = X.fields[f], id = d.mark + '-text', who = m.actor.kind === 'partner' ? Z.av(m.actor.id, 'sm') : Z.svg('refresh');
    // Start and end share one row, so their marks name the field (visible text only; the input is described anyway).
    var pre = /^dgf-(start|end)$/.test(d.input) ? '<b>' + d.label + ':</b> ' : '';
    if (m.type === 'changed') return '<p class="dg-mark">' + who + '<span id="' + id + '">' + pre + esc(sChangedBy(m.actor)) + '</span></p>';
    // The name starts with the visible "Use theirs" (2.5.3); the conflict line describes it.
    return '<div class="dg-mark dg-mark-conflict">' + who + '<span class="dg-mark-text" id="' + id + '">' + pre + esc(sConflict(m.actor, d.shown(m.value))) + '</span>' +
      '<button type="button" class="link-btn" data-act="use-theirs" data-field="' + f + '" aria-label="' + esc(C.useTheirs + ': ' + d.label) + '" aria-describedby="' + id + '">' + C.useTheirs + '</button></div>';
  }
  function renderMark(X, f) {
    var d = X.fields[f], slot = byId(d.mark); if (!slot) return;
    var a = document.activeElement, had = a && slot.contains(a);
    slot.innerHTML = markHTML(X, f);
    describe(X, f);
    if (had) focusField(X, f);
  }
  function useTheirs(X, f) {
    var m = X.marks[f]; if (!m) return;
    delete X.marks[f];
    X.fields[f].write(m.value);
    setError(X, f, '');
    renderMark(X, f);
    afterFieldsChanged(X);
    focusField(X, f);
    Z.announce(C.resolved);
  }
  function showNotice(X, a, focus) {
    var slot = byId(X.noticeSlot); if (!slot) return;
    var text = sNotice(a, nounOf(X.kind));
    slot.innerHTML = '<p class="notice dg-notice" id="' + X.noticeSlot + '-text" tabindex="-1">' + Z.svg('refresh') + '<span>' + esc(text) + '</span></p>';
    if (focus) byId(X.noticeSlot + '-text').focus(); // after a 409 focus goes to the notice
    else Z.announce(text);                           // live: one polite announcement, focus stays put
  }
  function afterFieldsChanged(X) {
    if (X === F) { syncAnother(); syncTimes(); syncCounter(); paintBar(); schedulePersist(); }
  }

  // ======================================== the read sheets ========================================
  var sh, shBody, SH = null;
  function sheetHead(titleHTML, cls) {
    return '<div class="dg-sh-head"><h2 id="dg-sh-h" class="' + cls + '" tabindex="-1" dir="auto">' + titleHTML + '</h2>' +
      '<button type="button" class="icon-btn dg-x" data-act="close" aria-label="' + C.close + '">' + Z.svg('x') + '</button></div>';
  }
  function reasons(list) { // [[id, text]] beside the aria-disabled controls; announced again on press
    return list.length ? '<p class="dg-reasons">' + list.map(function (r) { return '<span id="' + r[0] + '">' + esc(r[1]) + '</span>'; }).join(' ') + '</p>' : '';
  }
  function off(id) { return ' aria-disabled="true" aria-describedby="' + id + '"'; }

  // Plan item: a commitment. Its facts sit on a solid card (DS: commit); words say "From Places".
  function entryHTML(e) {
    var place = e.placeId ? Z.place(e.placeId) : null, offline = Z.offline, vis = whenText(e), sr = whenSr(e);
    var when = (vis !== sr ? '<span aria-hidden="true">' + esc(vis) + '</span><span class="vh">' + esc(sr) + '</span>' : esc(vis)) +
      (overnight(e) ? '<span class="dg-cap">' + C.overnightSheet + '</span>' : '');
    var h = sheetHead(esc(e.title), 'dg-title');
    h += '<div class="commit dg-card">' +
      '<p class="dg-type">' + Z.typeIcon(e.type) + '<span>' + Z.typeName(e.type) + '</span></p>' +
      '<dl class="dg-dl">' + dlRow(C.when, when, 'dg-strong num') +
        (e.location ? dlRow(C.where, '<span dir="auto">' + esc(e.location) + '</span>') : '') +
        dlRow(C.cost, e.cost == null ? C.noCost : '<span dir="ltr">' + esc(Z.mad(e.cost)) + '</span>', 'num') +
        (e.url ? dlRow(C.link, linkHTML(e.url)) : '') + '</dl>' +
      (e.doneAt ? '<p class="dg-done">' + Z.svg('check') + '<span>' + esc(doneText(e)) + '</span></p>' : '') +
      '</div>';
    if (e.notes) h += '<div class="dg-notes"><h3 class="dg-label">' + C.notes + '</h3><p dir="auto">' + esc(e.notes) + '</p></div>';
    if (place) h += '<p class="dg-from"><button type="button" class="link-btn" data-act="from-place" data-id="' + esc(place.id) + '">From Places: ' + esc(place.title) + '</button></p>';
    h += byLine(e.createdBy, addedText(e));
    if (e.pending) h += queuedLine();
    h += '<div class="dg-acts">' +
      '<button type="button" class="btn-sec" data-act="edit" aria-label="' + esc('Edit ' + e.title) + '">' + Z.svg('pencil') + C.edit + '</button>' +
      '<button type="button" class="btn-danger dg-del" data-act="delete" aria-label="' + esc('Delete ' + e.title) + '"' + (offline ? off('dg-why-del') : '') + '>' + Z.svg('trash') + C.del + '</button></div>' +
      reasons(offline ? [['dg-why-del', C.rDelete]] : []);
    return h;
  }
  // Place: an idea. Its facts sit in a dashed block on the sheet, never a card; it never takes saffron.
  function placeHTML(p) {
    var en = Z.entryOf(p), visitedNow = !!(en && en.doneAt), q = !!p.pending, offline = Z.offline, status;
    if (q) status = queuedLine();
    else if (visitedNow) status = '<p class="dg-done">' + Z.svg('check') + '<span>' + esc('Visited · ' + Z.day(en.doneAt) + ' · ' + Z.name(en.doneBy)) + '</span></p>';
    else if (en) status = '<p class="dg-status">' + esc('In the plan · ' + inPlanWhen(en)) + '</p>';
    else status = '<p class="dg-status">' + C.idea + '</p>';
    var est = p.estimate == null ? C.noEstimate : '<span dir="ltr">About ' + esc(Z.mad(p.estimate)) + '</span>';
    var h = sheetHead(esc(p.title), 'dg-title');
    h += '<div class="idea dg-card">' +
      '<p class="dg-type">' + Z.typeIcon(p.type) + '<span>' + Z.typeName(p.type) + '</span>' +
        (p.mustDo ? '<span class="must">' + Z.svg('star') + C.mustDo + '</span>' : '') + '</p>' +
      '<dl class="dg-dl">' + (p.area ? dlRow(C.area, '<span dir="auto">' + esc(p.area) + '</span>') : '') + dlRow(C.estimate, est, 'num') +
        (p.url ? dlRow(C.link, linkHTML(p.url)) : '') + '</dl>' +
      status +
      (en && !q ? '<p class="dg-inplan"><button type="button" class="link-btn" data-act="show-in-plan">' + C.showInPlan + '</button></p>' +
        (visitedNow ? '' : '<p class="caption">' + C.reschedule + '</p>') : '') +
      '</div>';
    if (p.notes) h += '<div class="dg-notes"><h3 class="dg-label">' + C.notes + '</h3><p dir="auto">' + esc(p.notes) + '</p></div>';
    h += byLine(p.createdBy, addedText(p));
    var acts = '', why = [];
    if (q) {
      acts += '<button type="button" class="btn-sec" data-act="schedule" aria-label="' + esc('Schedule ' + p.title) + '"' + off('dg-why-q') + '>' + Z.svg('calendar') + C.schedule + '</button>' +
        '<button type="button" class="btn-sec" data-act="edit" aria-label="' + esc('Edit ' + p.title) + '"' + off('dg-why-q') + '>' + Z.svg('pencil') + C.edit + '</button>' +
        '<button type="button" class="btn-danger dg-del" data-act="remove" aria-label="' + esc('Remove ' + p.title) + '">' + Z.svg('trash') + C.remove + '</button>';
      why.push(['dg-why-q', C.rQueued]);
    } else {
      if (!en) {
        acts += '<button type="button" class="btn-sec" data-act="schedule" aria-label="' + esc('Schedule ' + p.title) + '"' + (offline ? off('dg-why-sch') : '') + '>' + Z.svg('calendar') + C.schedule + '</button>';
        if (offline) why.push(['dg-why-sch', C.rSchedule]);
      }
      acts += '<button type="button" class="btn-sec" data-act="edit" aria-label="' + esc('Edit ' + p.title) + '"' + (en ? ' aria-describedby="dg-editnote"' : '') + '>' + Z.svg('pencil') + C.edit + '</button>' +
        '<button type="button" class="btn-danger dg-del" data-act="delete" aria-label="' + esc('Delete ' + p.title) + '"' + (offline ? off('dg-why-del') : '') + '>' + Z.svg('trash') + C.del + '</button>';
      if (offline) why.push(['dg-why-del', C.rDelete]);
    }
    if (en && !q) h += '<p class="caption dg-editnote" id="dg-editnote">' + C.editNote + '</p>';
    return h + '<div class="dg-acts">' + acts + '</div>' + reasons(why);
  }
  // Prep item: rename, move to another group, delete.
  function itemAttribution(it) {
    return (it.seeded ? '' : byLine(it.createdBy, addedText(it))) +
      (it.doneAt ? '<p class="dg-done">' + Z.svg('check') + '<span>' + esc(doneText(it)) + '</span></p>' : '') +
      (it.pending ? queuedLine() : '');
  }
  function itemHTML(it) {
    var offline = Z.offline;
    return '<form class="dg-item" id="dg-item-form" novalidate>' + sheetHead(C.itemHeading, 'dg-h2') +
      '<div class="dg-slot" id="dg-i-merge"></div>' +
      '<div class="dg-fields">' +
      '<div class="dg-fg"><label class="field-label" for="dg-i-title">' + C.title + '</label>' +
        '<div class="field"><input id="dg-i-title" type="text" autocomplete="off" enterkeyhint="done" required dir="auto"></div>' +
        '<p class="err" id="dg-i-title-err" hidden></p><div class="dg-mark-slot" id="dg-i-title-mark"></div></div>' +
      '<fieldset class="dg-fg" id="dg-i-group"><legend class="field-label">' + C.group + '</legend>' +
        '<div class="dg-chips dg-chips--grid">' + Z.GROUPS.map(function (g) {
          return '<label class="dg-chip"><input type="radio" name="dg-i-group" value="' + g + '">' + Z.groupIcon(g) + '<span>' + Z.groupName(g) + '</span></label>';
        }).join('') + '</div>' +
        '<p class="help" id="dg-i-group-help">' + C.groupHelp + '</p><div class="dg-mark-slot" id="dg-i-group-mark"></div></fieldset>' +
      '<div class="dg-attr" id="dg-i-attr">' + itemAttribution(it) + '</div>' +
      '</div>' +
      '<div class="dg-acts">' +
        '<button type="submit" class="btn-primary" id="dg-i-save"' + (offline ? off('dg-why-save') : '') + '>' + C.save + '</button>' +
        '<button type="button" class="btn-danger dg-del" data-act="delete" aria-label="' + esc('Delete ' + it.title) + '"' + (offline ? off('dg-why-del') : '') + '>' + Z.svg('trash') + C.del + '</button></div>' +
      reasons(offline ? [['dg-why-save', C.rSave], ['dg-why-del', C.rDelete]] : []) +
      '</form>';
  }
  function itemContext(it) {
    var X = { kind: 'item', marks: {}, errors: {}, touched: {}, noticeSlot: 'dg-i-merge',
      fields: { title: textDef('dg-i-title', C.title, []), group: radioDef('dg-i-group', C.group, Z.groupName, ['dg-i-group-help']) },
      validators: { title: function () { var v = byId('dg-i-title').value.trim(); return !v ? C.itemErr : v.length > MAX.title ? tooLong(MAX.title, 'title') : ''; } } };
    X.fields.title.write(it.title); X.fields.group.write(it.group);
    X.base = snapshot(X, it); X.updatedAt = it.updatedAt; X.initialJSON = JSON.stringify(values(X));
    describeAll(X);
    return X;
  }
  function deletedHTML() {
    var noun = SH.kind === 'entry' ? 'plan item' : SH.kind === 'place' ? 'place' : 'item';
    return sheetHead(esc(SH.title), SH.kind === 'item' ? 'dg-h2' : 'dg-title') +
      '<p class="dg-gone">' + esc(Z.name(SH.deleted.by) + ' deleted this ' + noun + '.') + '</p>' +
      '<div class="dg-acts"><button type="button" class="btn-sec" data-act="close" data-f="gone-close">' + C.close + '</button></div>';
  }
  function recOf(kind, id) { return kind === 'entry' ? Z.entry(id) : kind === 'place' ? Z.place(id) : Z.item(id); }
  function renderSheet() {
    var rec = recOf(SH.kind, SH.id);
    sh.dataset.kind = SH.kind;
    if (SH.deleted || !rec) { shBody.innerHTML = deletedHTML(); SH.X = null; return; }
    SH.title = SH.kind === 'item' ? rec.title : rec.title;
    shBody.innerHTML = SH.kind === 'entry' ? entryHTML(rec) : SH.kind === 'place' ? placeHTML(rec) : itemHTML(rec);
    if (SH.kind === 'item') SH.X = itemContext(rec);
  }
  function openSheet(kind, id, opener) {
    if (F) return; // forms and sheets don't stack (ia §6.5)
    var rec = recOf(kind, id); if (!rec) return;
    var op = opener !== undefined ? opener : SH ? SH.opener : captureOpener();
    SH = { kind: kind, id: id, tripId: rec.tripId, opener: op, title: rec.title };
    renderSheet();
    if (!sh.open) sh.showModal();
    Z.placeSheet(sh);
    sh.scrollTop = 0;
    byId('dg-sh-h').focus({ preventScroll: true }); // the heading: the sheet is named by the title
  }
  function closeSheet(o) {
    o = o || {};
    if (!SH) return;
    var s = SH; SH = null;
    if (sh.open) sh.close();
    shBody.innerHTML = '';
    if (!o.noFocus) setTimeout(function () { land(null, s.opener); }, 0);
  }
  function requestCloseSheet() {
    if (!SH || SH.asking || SH.saving) return;
    if (SH.kind === 'item' && SH.X && !SH.deleted && dirtyX(SH.X)) {
      var s = SH; s.asking = true;
      Z.confirm({ title: C.discardEditTitle, body: P(['Your changes to ' + s.title + ' won\'t be saved.']), confirm: C.discard, cancel: C.keepEditing }).then(function (yes) {
        s.asking = false;
        if (yes && SH === s) closeSheet();
      });
      return;
    }
    closeSheet();
  }
  function keepSheetFocus(fn) {
    var a = document.activeElement, act = a && sh.contains(a) ? a.getAttribute('data-act') || a.id : null;
    fn();
    var el = act && (shBody.querySelector('[data-act="' + act + '"]') || byId(act));
    if (el && visible(el)) el.focus({ preventScroll: true }); else if (act) byId('dg-sh-h').focus({ preventScroll: true });
  }
  function sheetDelete() {
    var k = SH.kind, rec = recOf(k, SH.id), s = SH; if (!rec) return;
    s.asking = true;
    (k === 'entry' ? confirmEntry(rec) : k === 'place' ? confirmPlace(rec) : confirmItem(rec)).then(function (yes) {
      s.asking = false;
      if (!yes || SH !== s) return;
      s.busy = true;
      var res = k === 'entry' ? deleteEntryNow(rec) : k === 'place' ? deletePlaceNow(rec) : deleteItemNow(rec);
      closeSheet({ noFocus: true }); // optimistic close (ia §4.6)
      setTimeout(function () {
        if (!res) { land(null, s.opener); Z.toast({ msg: 'Couldn\'t delete this. Try again.' }); return; }
        land(res.focus, null, true); Z.toast(res.toast);
      }, 0);
    });
  }
  function sheetTo(query) {
    var op = SH.opener;
    closeSheet({ noFocus: true });
    nextOpener = op; // the form returns focus to the row, not to the closed sheet
    Z.go(Z.withQuery(query));
  }
  function onSheetClick(e) {
    var el = e.target.closest('[data-act]'); if (!el || !sh.contains(el) || !SH) return;
    if (el.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      var d = (el.getAttribute('aria-describedby') || '').split(' ')[0], r = d && byId(d);
      if (r) say(r.textContent);
      return;
    }
    var act = el.dataset.act;
    if (act === 'close') requestCloseSheet();
    else if (act === 'edit') sheetTo(SH.kind === 'entry' ? { entry: SH.id } : { place: SH.id });
    else if (act === 'schedule') sheetTo({ schedule: SH.id });
    else if (act === 'delete' || act === 'remove') sheetDelete();
    else if (act === 'from-place') openSheet('place', el.dataset.id, SH.opener);
    else if (act === 'show-in-plan') { var p = Z.place(SH.id), en = p && Z.entryOf(p); closeSheet({ noFocus: true }); if (en) showInPlan(en.id); else land(null, null); }
    else if (act === 'use-theirs' && SH.X) useTheirs(SH.X, el.dataset.field);
  }
  function itemSubmit() {
    if (!SH || SH.kind !== 'item' || !SH.X || SH.saving) return;
    var X = SH.X, save = byId('dg-i-save');
    if (save.getAttribute('aria-disabled') === 'true') { say(C.rSave); return; }
    var first = validateAll(X);
    if (first) { focusField(X, first); return; }
    if (!dirtyX(X)) { closeSheet(); return; }
    var s = SH; s.saving = true; save.textContent = C.saving; save.setAttribute('aria-disabled', 'true');
    setTimeout(function () {
      if (SH !== s) return;
      s.saving = false;
      var v = values(X), r = Z.updateItem(s.id, { title: v.title, group: v.group }, { updatedAt: X.updatedAt });
      if (r.notFound) { s.deleted = s.deleted || { by: 'b' }; keepSheetFocus(renderSheet); byId('dg-sh-h').focus(); return; }
      save.textContent = C.save; save.removeAttribute('aria-disabled');
      if (r.conflict) {
        var a = s.liveActor || { kind: 'other' }, n = merge(X, r.current, a);
        if (!n) { s.saving = false; itemSubmit(); return; }
        showNotice(X, a, true); return;
      }
      closeSheet({ noFocus: true });
      setTimeout(function () { land([sel('item', s.id)], s.opener, true); Z.toast({ msg: C.saved }); }, 0);
    }, LATENCY);
  }
  function sheetOnChange(ev) {
    if (ev.type === 'trip-deleted' && ev.tripId === SH.tripId) {
      // The detail swaps to "{name} deleted {trip}." and its Back to Trips takes focus; open sheets close.
      closeSheet({ noFocus: true });
      setTimeout(function () { land(['#td-gone', '#view a[href="#/trips"]'], null); }, 0);
      return;
    }
    if (SH.busy || SH.deleted) return;
    var k = SH.kind, id = SH.id;
    var mine = (k === 'entry' && ev.entry && ev.entry.id === id) || (k === 'place' && ev.place && ev.place.id === id) || (k === 'item' && ev.item && ev.item.id === id);
    var gone = mine && /-deleted$/.test(ev.type) && ev.type.indexOf(k) === 0;
    if (gone) {
      SH.deleted = { by: ev.by }; SH.X = null;
      renderSheet();
      var b = shBody.querySelector('[data-f="gone-close"]'); if (b) b.focus();
      say(Z.name(ev.by) + ' deleted this ' + nounOf(k) + '.');
      return;
    }
    if (k === 'item') {
      if (!mine) return;
      if (ev.type === 'item-updated' && ev.source === 'partner' && SH.X) {
        var a = actorOf(ev); SH.liveActor = a;
        if (merge(SH.X, ev.item, a)) showNotice(SH.X, a, false);
      } else { var at = byId('dg-i-attr'); if (at) at.innerHTML = itemAttribution(ev.item); }
      return;
    }
    var rec = recOf(k, id);
    var related = mine || ev.type === 'connection' ||
      (k === 'place' && ((ev.entry && ev.entry.placeId === id) || (ev.place && ev.place.id === id))) ||
      (k === 'entry' && rec && ev.place && ev.place.id === rec.placeId);
    if (related) keepSheetFocus(renderSheet);
  }
  function buildSheet() {
    sh = document.createElement('dialog');
    sh.id = 'dg-sheet';
    sh.className = 'sheet dg-sheet';
    sh.setAttribute('aria-labelledby', 'dg-sh-h');
    sh.innerHTML = '<div class="dg-sh" id="dg-sh"></div><p class="vh dlg-live" role="status"></p><p class="vh" role="alert"></p>';
    document.body.appendChild(sh);
    shBody = sh.querySelector('.dg-sh');
    Z.backdropClose(sh, requestCloseSheet);
    sh.addEventListener('click', onSheetClick);
    sh.addEventListener('cancel', function (e) { e.preventDefault(); requestCloseSheet(); });
    sh.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); requestCloseSheet(); } });
    sh.addEventListener('submit', function (e) { e.preventDefault(); itemSubmit(); });
    sh.addEventListener('input', function (e) { if (SH && SH.X) onFieldInput(SH.X, e.target); });
    sh.addEventListener('change', function (e) { if (SH && SH.X) onFieldInput(SH.X, e.target); });
    sh.addEventListener('focusout', function (e) { if (SH && SH.X) onFieldBlur(SH.X, e.target); });
    sh.addEventListener('close', function () { if (SH && !closingAll) { SH = null; shBody.innerHTML = ''; } });
  }

  // ======================================== the form dialog ========================================
  var fd, fBody, F = null, FIX = null, persistTimer = null, parked = null, pending = null, closingAll = false, nextOpener = null;

  function fieldText(id, label, o) {
    o = o || {};
    var attrs = ' id="' + id + '"' + (o.attrs || '');
    return '<div class="dg-fg">' +
      '<label class="field-label" for="' + id + '">' + label + (o.labelSr ? '<span class="vh"> ' + o.labelSr + '</span>' : '') + '</label>' +
      '<div class="field' + (o.cls ? ' ' + o.cls : '') + '">' +
        (o.area ? '<textarea' + attrs + ' rows="3" dir="auto"></textarea>' : '<input' + attrs + ' type="' + (o.type || 'text') + '">') +
        (o.suffix ? '<span class="suffix" aria-hidden="true">' + o.suffix + '</span>' : '') + '</div>' +
      '<p class="err" id="' + id + '-err" hidden></p>' +
      (o.help ? '<p class="help" id="' + id + '-help">' + o.help + '</p>' : '') +
      (o.counter ? '<p class="help dg-count" id="' + id + '-count" hidden></p>' : '') +
      '<div class="dg-mark-slot" id="' + id + '-mark"></div></div>';
  }
  function typeChips() {
    return '<fieldset class="dg-fg" id="dgf-type"><legend class="field-label">' + C.type + '</legend><div class="dg-chips">' +
      Z.TYPES.map(function (t) {
        return '<label class="dg-chip"><input type="radio" name="dgf-type" value="' + t + '">' + Z.typeIcon(t) + '<span>' + Z.typeName(t) + '</span></label>';
      }).join('') + '</div><div class="dg-mark-slot" id="dgf-type-mark"></div></fieldset>';
  }
  function dayBlock(kind) {
    return '<div class="dg-fg"><label class="field-label" for="dgf-day">' + C.day + '</label>' +
      '<div class="field dg-select"><select id="dgf-day"></select>' + Z.svg('chevronDown') + '</div>' +
      '<p class="err" id="dgf-day-err" hidden></p>' +
      (kind === 'entry' ? '<div class="dg-another" id="dgf-another" hidden><label class="field-label" for="dgf-date">' + C.date + '</label>' +
        '<div class="field dg-datefield"><input id="dgf-date" type="date"></div><p class="err" id="dgf-date-err" hidden></p>' +
        '<p class="help" id="dgf-date-help" hidden>' + C.outside + '</p></div>' : '') +
      '<div class="dg-mark-slot" id="dgf-day-mark"></div></div>';
  }
  function timeBlock() {
    return '<fieldset class="dg-fg"><legend class="field-label">' + C.time + '</legend>' +
      '<div class="dg-times">' +
        '<div class="dg-t"><label class="dg-sub" for="dgf-start">' + C.start + '</label><div class="field dg-tf"><input id="dgf-start" type="time"></div></div>' +
        '<span class="dg-dash" aria-hidden="true">–</span>' +
        '<div class="dg-t"><label class="dg-sub" for="dgf-end">' + C.end + '</label><div class="field dg-tf"><input id="dgf-end" type="time"></div></div>' +
      '</div><p class="err" id="dgf-end-err" hidden></p>' +
      '<div class="dg-mark-slot" id="dgf-start-mark"></div><div class="dg-mark-slot" id="dgf-end-mark"></div>' +
      '<p class="help" id="dgf-time-help">' + C.timeHelp + '</p><p class="help" id="dgf-overnight" hidden>' + C.overnight + '</p></fieldset>';
  }
  function detailsBlock(inner) {
    return (F.editing ? '' : '<button type="button" class="dg-toggle" data-act="details" aria-expanded="false" aria-controls="dgf-details"><span>' + C.optional + '</span>' + Z.svg('chevronDown') + '</button>') +
      '<div class="dg-details" id="dgf-details"' + (F.editing ? '' : ' hidden') + '>' + inner + '</div>';
  }
  function slots() { return '<div class="dg-slot" id="dgf-banner"></div><div class="dg-slot" id="dgf-restored"></div><div class="dg-slot" id="dgf-merge"></div>'; }
  function endBlock(title) {
    return '<div class="dg-end"><button type="button" class="btn-danger" id="dgf-delete" data-act="delete" aria-label="' + esc('Delete ' + title) + '">' + Z.svg('trash') + C.del + '</button>' +
      '<p class="caption dg-reasons" id="dgf-del-why" hidden>' + C.rDelete + '</p></div>';
  }
  function urlAttrs() { return ' inputmode="url" autocomplete="off" spellcheck="false" dir="ltr"'; }
  function entryBody(e) {
    var place = e && e.placeId ? Z.place(e.placeId) : null;
    return slots() +
      (place ? '<p class="dg-info">From Places: ' + esc(place.title) + '</p>' : '') +
      fieldText('dgf-title', C.title, { help: C.pTitleHelp, attrs: ' autocomplete="off" enterkeyhint="done" required dir="auto"' }) +
      typeChips() + dayBlock('entry') + timeBlock() +
      detailsBlock(
        fieldText('dgf-location', C.location, { help: C.locationHelp, attrs: ' autocomplete="off" dir="auto"' }) +
        fieldText('dgf-cost', C.cost, { labelSr: 'in MAD', suffix: 'MAD', help: C.costHelp, cls: 'dg-money', attrs: ' inputmode="decimal" autocomplete="off"' }) +
        fieldText('dgf-url', C.link, { type: 'url', help: C.urlHelp, attrs: urlAttrs() }) +
        fieldText('dgf-notes', C.notes, { area: true, help: C.notesHelp, counter: true })) +
      (e ? endBlock(e.title) : '');
  }
  function placeBody(p) {
    var inPlan = p && Z.entryOf(p);
    return slots() +
      (inPlan ? '<p class="dg-info" id="dgf-editnote">' + C.editNote + '</p>' : '') +
      fieldText('dgf-title', C.title, { help: C.plTitleHelp, attrs: ' autocomplete="off" enterkeyhint="done" required dir="auto"' }) +
      typeChips() +
      '<div class="dg-fg"><div class="dg-check"><input type="checkbox" id="dgf-mustdo"><label for="dgf-mustdo">' + Z.svg('star') + C.mustDo + '</label></div>' +
        '<p class="help" id="dgf-mustdo-help">' + C.mustHelp + '</p><div class="dg-mark-slot" id="dgf-mustdo-mark"></div></div>' +
      detailsBlock(
        fieldText('dgf-area', C.area, { help: C.areaHelp, attrs: ' autocomplete="off" dir="auto"' }) +
        fieldText('dgf-estimate', C.estimate, { labelSr: 'in MAD', suffix: 'MAD', help: C.estHelp, cls: 'dg-money', attrs: ' inputmode="decimal" autocomplete="off"' }) +
        fieldText('dgf-url', C.link, { type: 'url', help: C.urlHelp, attrs: urlAttrs() }) +
        fieldText('dgf-notes', C.notes, { area: true, help: C.notesHelp, counter: true })) +
      (p ? endBlock(p.title) : '');
  }
  function whatHTML(p) {
    var vis = Z.typeName(p.type) + (p.estimate === 0 ? ' · Free' : p.estimate != null ? ' · ~' + Z.mad(p.estimate) : '');
    var sr = p.title + ', ' + Z.typeName(p.type) + (p.estimate === 0 ? ', free' : p.estimate != null ? ', about ' + Z.mad(p.estimate) : '');
    return '<div class="idea dg-what">' + Z.typeIcon(p.type) + '<p><span aria-hidden="true"><b dir="auto">' + esc(p.title) + '</b>' +
      '<span class="dg-what-meta">' + esc(vis) + '</span></span><span class="vh">' + esc(sr) + '</span></p></div>';
  }
  function scheduleBody(p) { return slots() + whatHTML(p) + dayBlock('schedule') + timeBlock() + '<p class="help dg-note">' + C.sNote + '</p>'; }

  // ---------- the field registries ----------
  function maxFn(id, n, what) { return function () { var el = byId(id); return el && el.value.trim().length > n ? tooLong(n, what) : ''; }; }
  function moneyFn(id, fmtErr) { return function () { var el = byId(id); if (!el) return ''; var p = Z.parseMoney(el.value); return p.error ? fmtErr : p.value != null && p.value > MONEY_MAX ? tooLarge() : ''; }; }
  function urlFn(id) { return function () { var v = byId(id).value.trim(); return !v ? '' : !Z.validUrl(v) ? C.eUrl : v.length > MAX.url ? tooLong(MAX.url, 'link') : ''; }; }
  function titleFn(id, empty) { return function () { var v = byId(id).value.trim(); return !v ? empty : v.length > MAX.title ? tooLong(MAX.title, 'title') : ''; }; }
  function registry(kind) {
    if (kind === 'entry') return {
      fields: { title: textDef('dgf-title', C.title, ['dgf-title-help']), type: radioDef('dgf-type', C.type, Z.typeName), date: entryDayDef(),
        start: timeDef('dgf-start', C.start, ['dgf-time-help']), end: timeDef('dgf-end', C.end, ['dgf-time-help', 'dgf-overnight']),
        location: textDef('dgf-location', C.location, ['dgf-location-help'], true), cost: moneyDef('dgf-cost', C.cost, ['dgf-cost-help'], true),
        url: textDef('dgf-url', C.link, ['dgf-url-help'], true), notes: textDef('dgf-notes', C.notes, ['dgf-notes-help', 'dgf-notes-count'], true) },
      validators: { title: titleFn('dgf-title', C.eTitle),
        date: function () { if (byId('dgf-day').value !== 'another') return ''; var i = byId('dgf-date'); return i.validity && i.validity.badInput ? C.eDateBad : !i.value ? C.eDate : ''; },
        end: function () { return byId('dgf-end').value && !byId('dgf-start').value ? C.eEnd : ''; },
        location: maxFn('dgf-location', MAX.location, 'location'), cost: moneyFn('dgf-cost', C.eCost), url: urlFn('dgf-url'), notes: maxFn('dgf-notes', MAX.notes, 'notes') } };
    if (kind === 'place') return {
      fields: { title: textDef('dgf-title', C.title, ['dgf-title-help']), type: radioDef('dgf-type', C.type, Z.typeName), mustDo: checkDef('dgf-mustdo', C.mustDo, ['dgf-mustdo-help']),
        area: textDef('dgf-area', C.area, ['dgf-area-help'], true), estimate: moneyDef('dgf-estimate', C.estimate, ['dgf-estimate-help'], true),
        url: textDef('dgf-url', C.link, ['dgf-url-help'], true), notes: textDef('dgf-notes', C.notes, ['dgf-notes-help', 'dgf-notes-count'], true) },
      validators: { title: titleFn('dgf-title', C.plETitle), area: maxFn('dgf-area', MAX.area, 'area'), estimate: moneyFn('dgf-estimate', C.plEEst),
        url: urlFn('dgf-url'), notes: maxFn('dgf-notes', MAX.notes, 'notes') } };
    return {
      fields: { date: scheduleDayDef(), start: timeDef('dgf-start', C.start, ['dgf-time-help']), end: timeDef('dgf-end', C.end, ['dgf-time-help', 'dgf-overnight']) },
      validators: { date: function () { return byId('dgf-day').value === '' ? C.sEDay : ''; }, end: function () { return byId('dgf-end').value && !byId('dgf-start').value ? C.eEnd : ''; } } };
  }

  // ---------- Day options (each day's load shown, ia §6.10) ----------
  function opt(v, label, on) { return '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function fillDays(keepOutside) {
    var s = byId('dgf-day'), trip = Z.trip(F.tripId); if (!s || !trip) return;
    var cur = s.value, curDate = F.fields.date.read(), days = Z.days(trip).days, h = '', found = false;
    if (F.kind === 'schedule') h += opt('', C.sPlaceholder, false);
    days.forEach(function (x) {
      var n = x.entries.length;
      if (x.date === curDate) found = true;
      h += opt(x.date, Z.day(x.date) + (x.n != null ? ' · Day ' + x.n : '') + ' · ' + (n ? n + ' planned' : 'nothing planned'), false);
    });
    // The partner changed the trip dates: a chosen day that left the range stays selected, labelled (ia F2).
    if (keepOutside && isIso(cur) && !found) h += opt(cur, Z.day(cur) + ' · outside the new dates', false);
    h += opt('none', C.noDate, false);
    if (F.kind === 'entry') h += opt('another', C.another, false);
    s.innerHTML = h;
    if (cur != null && [].some.call(s.options, function (o) { return o.value === cur; })) s.value = cur;
  }
  function writeDay(v) {
    var s = byId('dgf-day'); if (!s) return;
    var has = function (x) { return [].some.call(s.options, function (o) { return o.value === x; }); };
    if (v == null) s.value = 'none';
    else if (v === '') s.value = F && F.kind === 'schedule' ? '' : 'another';
    else if (has(v)) s.value = v;
    else if (F && F.kind === 'entry') { s.value = 'another'; byId('dgf-date').value = v; }
    syncAnother();
  }
  function syncAnother() {
    if (!F) return;
    var s = byId('dgf-day'), a = byId('dgf-another');
    if (a) {
      a.hidden = !s || s.value !== 'another';
      var h = byId('dgf-date-help'), t = Z.trip(F.tripId), v = byId('dgf-date').value;
      if (h) h.hidden = !(!a.hidden && v && t && t.start && (v < t.start || v > (t.end || t.start)));
    }
    if (F.fields.date) describe(F, 'date');
  }
  function syncTimes() {
    var s = byId('dgf-start'), e = byId('dgf-end'), o = byId('dgf-overnight');
    if (!s || !o) return;
    o.hidden = !(s.value && e.value && e.value < s.value); // "Ends the next day." is a helper, not an error [Tesler]
    if (F) { describe(F, 'start'); describe(F, 'end'); }
  }
  function syncCounter() {
    var n = byId('dgf-notes'), c = byId('dgf-notes-count'); if (!n || !c) return;
    var len = n.value.length;
    c.hidden = len < NOTES_COUNT_FROM;
    c.textContent = Z.fmt(len) + ' of ' + Z.fmt(MAX.notes);
    if (F) describe(F, 'notes');
  }
  function openDetails(open) {
    var d = byId('dgf-details'), t = fd.querySelector('[data-act="details"]'); if (!d) return;
    d.hidden = !open;
    if (t) t.setAttribute('aria-expanded', String(open));
    if (F) F.detailsOpen = open;
  }

  // ---------- head, bar, banners ----------
  function paintHead() {
    var trip = Z.trip(F.tripId); if (trip) F.tripTitle = trip.title;
    var k = F.kind, h = k === 'entry' ? (F.editing ? C.pHeadEdit : C.pHeadNew) : k === 'place' ? (F.editing ? C.plHeadEdit : C.plHeadNew) : C.sHead;
    byId('dg-f-h').textContent = h;
    byId('dg-f-sub').textContent = F.tripTitle;
    fd.setAttribute('aria-label', (k === 'schedule' ? 'Schedule ' + F.recTitle : h) + ': ' + F.tripTitle);
    var doc = (k === 'schedule' ? 'Schedule ' + F.recTitle : F.editing ? 'Edit ' + F.recTitle : h) + ': ' + F.tripTitle + ' – Zamane';
    if (!F.ownTitle || document.title === F.ownTitle) Z.title(doc);
    F.ownTitle = doc;
  }
  function paintBar() {
    if (!F) return;
    var b = byId('dg-submit'), why = byId('dg-why'), bar = byId('dg-bar');
    bar.hidden = !!(F.banner || F.swap);
    var del = byId('dgf-delete'), dw = byId('dgf-del-why');
    if (del) {
      if (Z.offline) { del.setAttribute('aria-disabled', 'true'); del.setAttribute('aria-describedby', 'dgf-del-why'); }
      else { del.removeAttribute('aria-disabled'); del.removeAttribute('aria-describedby'); }
      dw.hidden = !Z.offline;
    }
    if (bar.hidden) return;
    var k = F.kind, label, reason = '', info = '', block = false;
    if (k === 'entry') label = F.editing ? C.saveChanges : C.pSubmitNew;
    else if (k === 'place') label = F.editing ? C.saveChanges : C.plSubmitNew;
    else { var v = byId('dgf-day') && byId('dgf-day').value; label = isIso(v) ? 'Add to ' + Z.day(v) : C.sSubmit; }
    if (F.saving) { label = F.editing ? C.saving : C.adding; block = true; }
    if (Z.offline) {
      if (k === 'place' && !F.editing) info = C.placeOfflineNew;           // place adds queue (ARCH §9)
      else { reason = k === 'schedule' ? C.rSchedule : F.editing ? C.rSave : C.rAdd; block = true; }
    }
    if (F.failed) reason = reason || F.failed;
    b.textContent = label;
    if (block) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    var msg = reason || info;
    why.hidden = !msg;
    why.innerHTML = msg ? Z.svg(Z.offline ? 'cloudOff' : 'alert') + '<span>' + esc(msg) + '</span>' : '';
    if (msg) b.setAttribute('aria-describedby', 'dg-why'); else b.removeAttribute('aria-describedby');
  }
  function setBanner(b) {
    if (!F) return;
    F.banner = b; F.saving = false;
    var slot = byId('dgf-banner');
    var msgHTML = b.type === 'tripDeleted' ? esc(Z.name(b.by)) + ' deleted <bdi>' + esc(b.trip) + '</bdi>. This can\'t be saved.'
      : esc(F.kind === 'entry' ? C.pMissing : C.plMissing);
    var plain = b.type === 'tripDeleted' ? Z.name(b.by) + ' deleted ' + b.trip + '. This can\'t be saved.' : (F.kind === 'entry' ? C.pMissing : C.plMissing);
    if (slot) slot.innerHTML = '<div class="dg-banner"><p class="dg-banner-h" id="dg-banner-h" tabindex="-1">' + Z.svg('alert') + '<span>' + msgHTML + '</span></p>' +
      '<div class="dg-banner-acts">' + (F.kind !== 'schedule' && !F.swap ? '<button type="button" class="btn-sec" data-act="copy">' + C.copyText + '</button>' : '') +
      '<button type="button" class="btn-sec" data-act="close-now">' + C.close + '</button></div><p class="caption dg-copied" id="dg-copied"></p></div>';
    paintBar();
    say(plain, true);
    var a = document.activeElement;
    if (!a || !fd.contains(a) || !visible(a)) { fBody.scrollTop = 0; byId('dg-banner-h').focus(); }
  }
  function renderRestored() {
    byId('dgf-restored').innerHTML = F.restored ? '<p class="notice dg-restored"><span>' + C.restored + '</span>' +
      '<button type="button" class="link-btn" data-act="discard-draft">' + C.discardDraft + '</button></p>' : '';
  }
  // Schedule: the body swaps for "already in the plan" (409, ia §7 A1) or "place deleted".
  function swap(type, entry, by) {
    var p = Z.place(F.recId) || F.placeSnap, msg, acts;
    F.swap = { type: type };
    if (type === 'taken') {
      var partner = entry.createdBy !== Z.me, nm = Z.name(entry.createdBy);
      msg = entry.date ? (partner ? nm + ' already put this on ' + Z.day(entry.date) + '.' : 'This place is already in the plan on ' + Z.day(entry.date) + '.')
        : (partner ? nm + ' already put this in the plan, with no date yet.' : 'This place is already in the plan, with no date yet.');
      acts = '<button type="button" class="btn-primary" data-act="taken-show" data-id="' + esc(entry.id) + '" id="dg-swap-first">' + C.showInPlan + '</button>' +
        '<button type="button" class="btn-sec" data-act="close-now">' + C.close + '</button>';
    } else {
      msg = Z.name(by || 'b') + ' deleted this place.';
      acts = '<button type="button" class="btn-sec" data-act="close-now" id="dg-swap-first">' + C.close + '</button>';
    }
    fBody.innerHTML = slots() + whatHTML(p) + '<div class="dg-swap"><p class="dg-swap-msg" id="dg-swap-msg">' + esc(msg) + '</p><div class="dg-swap-acts">' + acts + '</div></div>';
    paintBar();
    byId('dg-swap-first').setAttribute('aria-describedby', 'dg-swap-msg');
    byId('dg-swap-first').focus();
    say(msg);
  }

  // ---------- open, close, URL ----------
  function storeKey() { return DRAFT + (Z.state !== 'populated' ? Z.state + ':' : '') + F.tripId + ':' + F.kind + ':' + F.key; }
  function persistNow() {
    if (!F || F.kind === 'schedule' || F.closing || F.banner) return;
    if (!dirtyX(F)) { store.del(F.storeKey); return; }
    store.set(F.storeKey, { v: 1, values: values(F), base: F.base, updatedAt: F.updatedAt, details: !!F.detailsOpen });
  }
  function schedulePersist() { clearTimeout(persistTimer); persistTimer = setTimeout(persistNow, 250); }
  function clearDraft() { clearTimeout(persistTimer); if (F) store.del(F.storeKey); }
  var savedMsgs = null;
  function ownConnMsgs() {
    if (!savedMsgs) savedMsgs = { off: Z.offlineMessage, on: Z.onlineMessage };
    if (F.kind === 'place' && !F.editing) { Z.offlineMessage = C.placeOfflineNew; Z.onlineMessage = savedMsgs.on; return; }
    Z.offlineMessage = F.kind === 'schedule' ? C.rSchedule : F.editing ? C.rSave : C.rAdd;
    Z.onlineMessage = F.kind === 'schedule' ? C.onSchedule : F.editing ? C.onSave : C.onAdd;
  }
  function restoreConnMsgs() { if (!savedMsgs) return; Z.offlineMessage = savedMsgs.off; Z.onlineMessage = savedMsgs.on; savedMsgs = null; }
  function placeForm() {
    if (!fd.open) return;
    var vv = window.visualViewport;
    // Phones: the dialog is the visual viewport, so the footer and its submit ride the on-screen keyboard.
    if (!vv || !Z.isPhone() || vv.scale > 1.01) { fd.style.top = fd.style.height = fd.style.bottom = fd.style.maxHeight = ''; return; }
    fd.style.top = vv.offsetTop + 'px'; fd.style.bottom = 'auto'; fd.style.height = vv.height + 'px'; fd.style.maxHeight = 'none';
  }
  function showForm() { if (!fd.open) fd.showModal(); placeForm(); }
  function hideForm() { if (fd.open) fd.close(); fd.style.top = fd.style.height = fd.style.bottom = fd.style.maxHeight = ''; }
  function hashFor(s) {
    var ch = {}; ch[s.kind] = s.key; if (s.kind === 'entry') ch.date = s.dateParam || null;
    return Z.withQuery(ch);
  }
  function leaveUrl(kind) { setTimeout(function () { var ch = {}; ch[kind] = null; if (kind === 'entry') ch.date = null; Z.go(Z.withQuery(ch), { replace: true }); }, 0); }
  function focusDefault() {
    if (!F) return;
    if (F.banner) { byId('dg-banner-h').focus(); return; }
    if (F.swap) { var s = byId('dg-swap-first'); if (s) s.focus(); return; }
    if (F.kind === 'schedule') byId('dgf-day').focus();
    else if (F.editing) byId('dg-f-h').focus();                 // edit: the heading (ia §6.3)
    else byId('dgf-title').focus();                              // new: Title (quick capture)
  }

  function openForm(r, kind, key) {
    var trip = Z.trip(r.id); if (!trip) return false;          // the detail shows its own not-found state
    var editing = kind !== 'schedule' && key !== 'new', rec = null;
    if (kind === 'entry' && editing) rec = Z.entry(key);
    else if (kind !== 'entry' && key !== 'new') rec = Z.place(key);
    if ((editing || kind === 'schedule') && (!rec || rec.tripId !== trip.id || rec.pending)) { leaveUrl(kind); return false; }
    var fix = FIX; FIX = null;
    var reg = registry(kind);
    F = { kind: kind, key: key, tripId: trip.id, tripTitle: trip.title, editing: editing, recId: rec ? rec.id : null, recTitle: rec ? rec.title : '',
      placeSnap: kind === 'schedule' ? JSON.parse(JSON.stringify(rec)) : null, dateParam: kind === 'entry' && !editing ? (r.query.date || null) : null,
      fields: reg.fields, validators: reg.validators, marks: {}, errors: {}, touched: {}, noticeSlot: 'dgf-merge',
      opener: nextOpener || captureOpener(), prevTitle: document.title, detailsOpen: editing, fix: fix };
    nextOpener = null;
    F.storeKey = storeKey();
    fd.classList.toggle('is-schedule', kind === 'schedule');
    paintHead();
    fBody.innerHTML = kind === 'entry' ? entryBody(rec) : kind === 'place' ? placeBody(rec) : scheduleBody(rec);
    fBody.scrollTop = 0;
    if (kind !== 'place') fillDays(false);
    // initial values
    if (editing) Object.keys(F.fields).forEach(function (f) { F.fields[f].write(rec[f]); });
    else if (kind === 'entry') {
      F.fields.type.write('other');
      var dp = F.dateParam;
      F.fields.date.write(isIso(dp) ? dp : null);
    } else if (kind === 'place') F.fields.type.write('other');
    else { // schedule: today during the trip, else "Choose a day"
      var st = Z.status(trip);
      F.fields.date.write(st.kind === 'now' ? Z.today() : '');
    }
    F.base = editing ? snapshot(F, rec) : values(F);
    F.updatedAt = rec ? rec.updatedAt : null;
    F.initialJSON = JSON.stringify(values(F));
    // a stored draft (fixtures use their own namespace and start fresh)
    if (fix) store.del(F.storeKey);
    var stored = kind !== 'schedule' ? store.get(F.storeKey) : null;
    if (stored && stored.values && JSON.stringify(stored.values) !== F.initialJSON) {
      Object.keys(F.fields).forEach(function (f) { if (f in stored.values) F.fields[f].write(stored.values[f]); });
      if (stored.details) openDetails(true);
      F.restored = true;
      if (editing && stored.updatedAt && +new Date(stored.updatedAt) !== +new Date(rec.updatedAt)) {
        F.base = stored.base || F.base; F.updatedAt = stored.updatedAt;
        if (merge(F, rec, { kind: 'other' })) showNotice(F, { kind: 'other' }, false);
      }
    }
    renderRestored();
    syncAnother(); syncTimes(); syncCounter(); describeAll(F);
    if (kind === 'schedule' && Z.entryOf(rec)) swap('taken', Z.entryOf(rec));
    ownConnMsgs();
    paintBar();
    showForm();
    if (!(fix && formFixture(fix))) focusDefault();
    return true;
  }
  // Close and leave the query: back if it was pushed, else replace (Z.closeQuery).
  function finish(o) {
    if (!F || F.closing) return;
    var s = F;
    s.closing = true;
    clearTimeout(persistTimer);
    restoreConnMsgs();
    pending = { kind: s.kind, focus: o.focus, reveal: o.reveal, opener: s.opener, toast: o.toast, after: o.after, prevTitle: s.prevTitle, ownTitle: s.ownTitle };
    hideForm();
    F = null;
    fBody.innerHTML = '';
    var r = Z.route;
    if (!o.noNav && r && r.view === 'detail' && r.query && r.query[s.kind] != null) {
      pending.timer = setTimeout(settle, 1000);
      Z.closeQuery(s.kind === 'entry' ? ['entry', 'date'] : s.kind);
    } else setTimeout(settle, 0);
  }
  function settle() {
    var p = pending; if (!p) return;
    pending = null; clearTimeout(p.timer);
    if (document.title === p.ownTitle) Z.title(p.prevTitle);
    setTimeout(function () { // after the detail has re-rendered
      if (p.toast) Z.toast(p.toast); // first, so the toast's scroll padding applies to the reveal
      if (p.after) p.after(); else land(p.focus, p.opener, p.reveal);
    }, 0);
  }
  // The route left this dialog without a close (another trip, another page): keep the draft.
  function leaveForm() {
    if (!F || F.closing) return;
    persistNow();
    F.closing = true;
    restoreConnMsgs();
    if (document.title === F.ownTitle) Z.title(F.prevTitle);
    F = null;
    hideForm();
    fBody.innerHTML = '';
  }
  function requestClose() {
    if (!F || F.asking || F.closing) return;
    if (F.kind !== 'schedule' && !F.banner && dirtyX(F)) askDiscard(); else { clearDraft(); finish({}); }
  }
  function askDiscard() {
    var s = F; s.asking = true;
    var title = s.editing ? C.discardEditTitle : s.kind === 'entry' ? C.pDiscardTitle : C.plDiscardTitle;
    var body = s.editing ? 'Your changes to ' + s.recTitle + ' won\'t be saved.' : C.discardBody;
    Z.confirm({ title: title, body: P([body]), confirm: C.discard, cancel: C.keepEditing }).then(function (yes) {
      if (F !== s) return;
      s.asking = false; s.guardPending = false;
      if (yes) { clearDraft(); finish({}); }
    });
  }
  function discardDraft() {
    var s = F; s.asking = true;
    Z.confirm({ title: s.editing ? C.discardEditTitle : s.kind === 'entry' ? C.pDiscardTitle : C.plDiscardTitle,
      body: P([s.editing ? 'Your changes to ' + s.recTitle + ' won\'t be saved.' : C.discardBody]), confirm: C.discard, cancel: C.keepEditing }).then(function (yes) {
      if (F !== s) return;
      s.asking = false;
      if (!yes) return;
      var init = JSON.parse(s.initialJSON);
      Object.keys(s.fields).forEach(function (f) { s.fields[f].write(init[f]); setError(s, f, ''); });
      s.marks = {}; Object.keys(s.fields).forEach(function (f) { renderMark(s, f); });
      byId('dgf-merge').innerHTML = '';
      clearDraft(); s.restored = false; renderRestored();
      afterFieldsChanged(s);
      focusDefault();
    });
  }
  function copyText() {
    var v = values(F), lines = [v.title, v.location || v.area, v.url, byId('dgf-notes') ? byId('dgf-notes').value.trim() : ''].filter(Boolean);
    var text = lines.join('\n');
    function done(ok) {
      var st = byId('dg-copied'); if (st) st.textContent = ok ? C.copied : C.copyFailed;
      say(ok ? C.copied : C.copyFailed, !ok);
    }
    function fallback() {
      var back = document.activeElement, ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'vh'; fd.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (back) back.focus();
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
  }

  // ---------- submit ----------
  function pressSubmit() {
    if (!F || F.saving || F.banner || F.swap || F.closing) return;
    var b = byId('dg-submit');
    if (b.getAttribute('aria-disabled') === 'true') { var w = byId('dg-why'); if (w && !w.hidden) say(w.textContent); return; }
    var first = validateAll(F);
    if (first) { focusField(F, first); return; }
    F.saving = true; F.failed = ''; paintBar();
    var s = F;
    setTimeout(function () { if (F === s && !s.closing) { s.saving = false; commit(); } }, LATENCY); // a double tap is ignored while pending
  }
  function commit() {
    var v = values(F), trip = Z.trip(F.tripId);
    if (!trip) { setBanner({ type: 'tripDeleted', by: F.deletedBy || 'b', trip: F.tripTitle }); return; }
    if (Z.offline && !(F.kind === 'place' && !F.editing)) { paintBar(); return; }
    var notes = byId('dgf-notes') ? byId('dgf-notes').value.replace(/\s+$/, '') : '';
    var r;
    if (F.kind === 'entry') {
      var out = { title: v.title, type: v.type, date: v.date || null, start: v.start || null, end: v.start ? v.end || null : null,
        location: v.location, cost: typeof v.cost === 'number' ? v.cost : null, url: v.url, notes: notes };
      if (!F.editing) {
        r = Z.addEntry(F.tripId, out);
        if (r.notFound) { setBanner({ type: 'tripDeleted', by: F.deletedBy || 'b', trip: F.tripTitle }); return; }
        clearDraft();
        finish({ focus: [sel('entry', r.entry.id)], reveal: true, toast: entryAddedToast(r.entry) });
        return;
      }
      r = Z.updateEntry(F.recId, out, { updatedAt: F.updatedAt });
      if (r.notFound) { setBanner({ type: 'missing' }); return; }
      if (r.conflict) { conflict(r.current); return; }
      clearDraft();
      finish({ focus: [sel('entry', F.recId)], reveal: true, toast: { msg: C.saved } });
    } else if (F.kind === 'place') {
      var pout = { title: v.title, type: v.type, mustDo: v.mustDo, area: v.area, estimate: typeof v.estimate === 'number' ? v.estimate : null, url: v.url, notes: notes };
      if (!F.editing) {
        var queued = Z.offline;
        r = Z.addPlace(F.tripId, pout, { pending: queued });
        if (r.notFound) { setBanner({ type: 'tripDeleted', by: F.deletedBy || 'b', trip: F.tripTitle }); return; }
        clearDraft();
        finish({ focus: [sel('place', r.place.id)], reveal: true, toast: placeAddedToast(r.place, queued) });
        return;
      }
      r = Z.updatePlace(F.recId, pout, { updatedAt: F.updatedAt });
      if (r.notFound) { setBanner({ type: 'missing' }); return; }
      if (r.conflict) { conflict(r.current); return; }
      clearDraft();
      finish({ focus: [sel('place', F.recId)], reveal: true, toast: { msg: C.saved } });
    } else {
      var day = byId('dgf-day').value, placeId = F.recId;
      r = Z.schedulePlace(placeId, { date: isIso(day) ? day : null, start: v.start || null, end: v.start ? v.end || null : null });
      if (r.notFound) { swap('deleted', null, F.deletedBy); return; }
      if (r.taken) { swap('taken', r.taken); return; }
      finish({ focus: inPlanSels(placeId), toast: scheduledToast(Z.place(placeId) || F.placeSnap, r.entry) });
    }
  }
  function conflict(cur) {
    var a = F.liveActor || { kind: 'other' }; // the socket was down, so who changed it is unknown (Goals §6.7)
    var n = merge(F, cur, a);
    if (!n && !F.retried) { F.retried = true; commit(); return; } // nothing editable differs: one silent retry
    F.retried = false; paintBar();
    showNotice(F, a, true);
  }
  function formDelete() {
    var k = F.kind, rec = k === 'entry' ? Z.entry(F.recId) : Z.place(F.recId);
    if (!rec) { setBanner({ type: 'missing' }); return; }
    var s = F; s.asking = true;
    (k === 'entry' ? confirmEntry(rec) : confirmPlace(rec)).then(function (yes) {
      if (F !== s) return;
      s.asking = false;
      if (!yes) return;
      s.busy = true;
      var res = k === 'entry' ? deleteEntryNow(rec) : deletePlaceNow(rec);
      if (!res) { setBanner({ type: 'missing' }); return; }
      clearDraft();
      finish({ focus: res.focus, reveal: true, toast: res.toast });
    });
  }
  function onFormClick(e) {
    var el = e.target.closest('[data-act]'); if (!el || !fd.contains(el) || !F) return;
    var act = el.dataset.act;
    if (el.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      var d = (el.getAttribute('aria-describedby') || '').split(' ')[0], r = d && byId(d);
      if (r) { r.hidden = false; say(r.textContent); }
      return;
    }
    if (act === 'close') requestClose();
    else if (act === 'details') openDetails(el.getAttribute('aria-expanded') !== 'true');
    else if (act === 'use-theirs') useTheirs(F, el.dataset.field);
    else if (act === 'delete') formDelete();
    else if (act === 'copy') copyText();
    else if (act === 'close-now') { clearDraft(); finish({}); }
    else if (act === 'discard-draft') discardDraft();
    else if (act === 'taken-show') { var id = el.dataset.id; finish({ after: function () { showInPlan(id); } }); }
  }
  function formOnChange(ev) {
    if (ev.type === 'trip-deleted' && ev.tripId === F.tripId) { F.deletedBy = ev.by; setBanner({ type: 'tripDeleted', by: ev.by, trip: (ev.trip && ev.trip.title) || F.tripTitle }); return; }
    if (ev.tripId !== F.tripId || F.banner) return;
    if (ev.type === 'trip-updated') { paintHead(); if (F.kind !== 'place' && !F.swap) { fillDays(true); syncAnother(); paintBar(); } return; }
    if (F.kind === 'schedule') {
      if (F.swap) return;
      if (ev.type === 'place-scheduled' && ev.place && ev.place.id === F.recId) { swap('taken', ev.entry); return; }
      if (ev.type === 'place-deleted' && ev.place && ev.place.id === F.recId) { F.deletedBy = ev.by; swap('deleted', null, ev.by); return; }
      if (/^entry-(added|updated|deleted)$|^place-scheduled$/.test(ev.type)) fillDays(true);
      return;
    }
    if (F.kind === 'entry' && /^entry-(added|updated|deleted)$|^place-scheduled$/.test(ev.type)) fillDays(true);
    var rec = F.kind === 'entry' ? ev.entry : ev.place;
    if (!F.editing || !rec || rec.id !== F.recId || F.busy) return;
    if (ev.type === F.kind + '-deleted' && ev.source !== 'me') { setBanner({ type: 'missing' }); return; }
    if (ev.type === F.kind + '-updated' && ev.source === 'partner' && !F.socketDown) {
      var a = actorOf(ev); F.liveActor = a;
      if (merge(F, rec, a)) showNotice(F, a, false);
    }
  }
  function buildForm() {
    fd = document.createElement('dialog');
    fd.id = 'dg-form';
    fd.className = 'sheet dg-form';
    fd.setAttribute('data-no-place', '');
    fd.innerHTML =
      '<form class="dg-f" id="dg-f" novalidate>' +
        '<div class="dg-head">' +
          '<button type="button" class="icon-btn dg-x" data-act="close" aria-label="' + C.close + '">' + Z.svg('x') + '</button>' +
          '<div class="dg-titles"><h2 id="dg-f-h" tabindex="-1"></h2><p class="caption" id="dg-f-sub" dir="auto"></p></div>' +
        '</div>' +
        '<div class="dg-body" id="dg-f-body"></div>' +
        '<div class="dg-bar" id="dg-bar">' +
          '<p class="dg-why" id="dg-why" hidden></p>' +
          '<div class="dg-bar-acts">' +
            '<button type="button" class="btn-sec dg-cancel" data-act="close">' + C.cancel + '</button>' +
            '<button type="submit" class="btn-primary dg-submit" id="dg-submit" aria-keyshortcuts="Control+Enter Meta+Enter"></button>' +
          '</div>' +
        '</div>' +
      '</form>' +
      '<p class="vh dlg-live" role="status"></p><p class="vh" role="alert" id="dg-f-alert"></p>';
    document.body.appendChild(fd);
    fBody = byId('dg-f-body');
    fd.addEventListener('click', onFormClick);
    fd.addEventListener('submit', function (e) { e.preventDefault(); pressSubmit(); });
    fd.addEventListener('keydown', function (e) {
      if (!F) return;
      // Esc goes through the discard guard; caught on keydown so the close watcher can't skip it.
      if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); requestClose(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); pressSubmit(); }
    });
    fd.addEventListener('cancel', function (e) { e.preventDefault(); requestClose(); });
    function edited(e) {
      if (!F) return;
      var t = e.target;
      onFieldInput(F, t);
      if (t.id === 'dgf-day') { syncAnother(); if (F.kind === 'schedule' && F.errors.date) setError(F, 'date', validateOne(F, 'date')); }
      if (t.id === 'dgf-date') syncAnother();
      if (t.id === 'dgf-start' || t.id === 'dgf-end') syncTimes();
      if (t.id === 'dgf-notes') syncCounter();
      paintBar();
      schedulePersist();
    }
    fd.addEventListener('input', edited);
    fd.addEventListener('change', edited);
    fd.addEventListener('focusout', function (e) { if (F) onFieldBlur(F, e.target); });
    // Something else closed the dialog (a forced close): re-open it if the URL still says so, and ask.
    fd.addEventListener('close', function () {
      if (!F || F.closing || closingAll) return;
      setTimeout(function () {
        if (!F || F.closing || fd.open) return;
        var r = Z.route;
        if (r && r.view === 'detail' && r.query && r.query[F.kind] === F.key) { showForm(); if (!F.asking) requestClose(); }
      }, 0);
    });
    if (window.visualViewport) { visualViewport.addEventListener('resize', placeForm); visualViewport.addEventListener('scroll', placeForm); }
    window.addEventListener('resize', placeForm);
    window.addEventListener('pagehide', persistNow);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') persistNow(); });
  }

  // ======================================== the contract ========================================
  function keyOf(q) {
    if (q.entry != null) return ['entry', q.entry];
    if (q.place != null) return ['place', q.place];
    if (q.schedule != null) return ['schedule', q.schedule];
    return null;
  }
  function fromRoute(route) {
    var r = Z.route || route; // never act on a stale route object
    if (!r || r.view !== 'detail') { leaveForm(); return false; }
    if (pending) return false;
    var k = keyOf(r.query || {});
    if (k) {
      if (F && F.tripId === r.id && F.kind === k[0] && F.key === k[1]) {
        if (!fd.open) showForm();
        if (F.guardPending && !F.asking) askDiscard();
        return true;
      }
      if (!F && parked && parked.tripId === r.id && parked.kind === k[0] && parked.key === k[1]) {
        // The shell re-mounted the detail under an open form: resume it as it was.
        F = parked; parked = null; F.closing = false;
        ownConnMsgs(); showForm(); focusDefault();
        return true;
      }
      leaveForm();
      if (SH) closeSheet({ noFocus: true });
      return openForm(r, k[0], k[1]);
    }
    if (!F || F.closing) return false;
    if (F.guardPending) return true;
    // Back removed the query. While dirty, push it again and ask; otherwise close.
    if (F.kind !== 'schedule' && !F.banner && dirtyX(F)) { F.guardPending = true; Z.go(hashFor(F)); return true; }
    clearDraft();
    finish({ noNav: true });
    return false;
  }
  function closeAll() {
    closingAll = true;
    if (SH) closeSheet({ noFocus: true });
    if (F && !F.closing) { persistNow(); parked = F; F = null; restoreConnMsgs(); hideForm(); }
    closingAll = false;
  }
  Z.on('change', function (ev) {
    if (SH) sheetOnChange(ev);
    if (F && !F.closing) formOnChange(ev);
  });
  Z.on('connection', function () {
    if (SH && !SH.deleted && SH.kind !== 'item') keepSheetFocus(renderSheet);
    else if (SH && SH.kind === 'item' && SH.X) { // item sheet: repaint only the actions, keep what was typed
      var save = byId('dg-i-save'), del = shBody.querySelector('[data-act="delete"]'), rs = shBody.querySelector('.dg-reasons');
      [[save, 'dg-why-save'], [del, 'dg-why-del']].forEach(function (p) {
        if (!p[0]) return;
        if (Z.offline) { p[0].setAttribute('aria-disabled', 'true'); p[0].setAttribute('aria-describedby', p[1]); }
        else { p[0].removeAttribute('aria-disabled'); p[0].removeAttribute('aria-describedby'); }
      });
      if (rs) rs.remove();
      if (Z.offline) shBody.querySelector('.dg-acts').insertAdjacentHTML('afterend', reasons([['dg-why-save', C.rSave], ['dg-why-del', C.rDelete]]));
    }
    if (F && !F.closing) paintBar();
  });

  // ---------- fixtures (ia.md §8; the detail renders the page as populated for these states) ----------
  function pick(kind, wanted, tripId) {
    var rec = recOf(kind, wanted);
    if (rec && rec.tripId === tripId) return rec.id;
    var list = kind === 'entry' ? Z.entries(tripId) : kind === 'place' ? Z.places(tripId) : Z.items(tripId);
    return list[0] ? list[0].id : null;
  }
  function itemByTitle(tripId, title) { var it = Z.items(tripId).filter(function (i) { return i.title === title; })[0]; return it ? it.id : pick('item', null, tripId); }
  function openerFor(act, id) { var el = firstVisible([sel(act, id)]); return el ? describeEl(el) : null; }
  function goFixture(f, q) { FIX = f; Z.go(Z.withQuery(q), { replace: true }); }
  function runFixture(f, r) {
    var tid = r.id, e = pick('entry', 'hike-mosque', tid), p = pick('place', 'goat-cheese', tid), x;
    switch (f) {
      case 'entry-sheet': if (e) openSheet('entry', e, openerFor('entry', e)); break;
      case 'place-sheet': if (p) openSheet('place', p, openerFor('place', p)); break;
      case 'item-sheet': x = itemByTitle(tid, 'Travel insurance'); if (x) openSheet('item', x, openerFor('item', x)); break;
      case 'confirm-delete-entry': if (e) { openSheet('entry', e, openerFor('entry', e)); sheetDelete(); } break;
      case 'confirm-delete-place': if (p) { openSheet('place', p, openerFor('place', p)); sheetDelete(); } break;
      case 'entry-form': case 'entry-form-invalid': goFixture(f, { entry: 'new', date: '2026-11-24' }); break;
      case 'entry-form-offline': goFixture(f, { entry: 'new', date: '2026-11-22' }); break;
      case 'entry-form-details': case 'entry-form-conflict': if (e) goFixture(f, { entry: e }); break;
      case 'place-form': case 'place-form-offline': goFixture(f, { place: 'new' }); break;
      case 'schedule': if (p) goFixture(f, { schedule: p }); break;
      case 'schedule-taken': x = pick('place', 'spanish-mosque', tid); if (x) goFixture(f, { schedule: x }); break;
      case 'toast-added': {
        // As if Sara had just added "Hike to the Spanish Mosque": re-add it, then the toast with Undo.
        var en = Z.entry(e); if (!en) break;
        var fields = { type: en.type, title: en.title, date: en.date, start: en.start, end: en.end, location: en.location, cost: en.cost, url: en.url, notes: en.notes, placeId: en.placeId };
        Z.deleteEntry(en.id);
        var added = Z.addEntry(tid, fields).entry;
        setTimeout(function () { land([sel('entry', added.id)], null, true); Z.toast(entryAddedToast(added)); }, 0);
        break;
      }
      case 'toast-scheduled': {
        var res = Z.schedulePlace(p, { date: '2026-11-23', start: '13:00', end: null });
        if (res.entry) setTimeout(function () { land(inPlanSels(p), null, true); Z.toast(scheduledToast(Z.place(p), res.entry)); }, 0);
        break;
      }
      case 'toast-place-queued': {
        // Offline, Sara adds "Goat cheese tasting": it is queued, and the toast never says "saved".
        var pl = Z.place(p); if (!pl) break;
        Z.setOffline(true, { silent: true });
        var pf = { type: pl.type, title: pl.title, area: pl.area, notes: pl.notes, url: pl.url, estimate: pl.estimate, mustDo: pl.mustDo };
        Z.deletePlace(pl.id);
        var q = Z.addPlace(tid, pf, { pending: true }).place;
        setTimeout(function () { land([sel('place', q.id)], null, true); Z.toast(placeAddedToast(q, true)); }, 0);
        break;
      }
    }
  }
  // Runs inside openForm once the fields exist. Returns true when it placed focus itself.
  function formFixture(f) {
    var set = function (id, v) { var el = byId(id); if (el) el.value = v; };
    switch (f) {
      case 'entry-form-invalid':
        set('dgf-end', '19:00'); openDetails(true); set('dgf-cost', 'about 50'); set('dgf-url', 'east hill mosque');
        syncTimes();
        focusField(F, validateAll(F)); // as after pressing Add to the plan
        return true;
      case 'entry-form-offline':
        set('dgf-title', 'Breakfast on the roof'); set('dgf-start', '09:00'); syncTimes(); paintBar();
        return false;
      case 'entry-form-conflict':
        // My edits; then Youssef saves first while the socket is down; then my Save gets the 409.
        set('dgf-start', '17:00'); set('dgf-notes', 'Bring water and a torch for the way down.'); syncTimes();
        F.socketDown = true;
        Z.partner.updateEntry(F.recId, { start: '16:45', location: 'east hill, from Ras El Maa' });
        F.socketDown = false;
        commit();
        return true;
      case 'place-form-offline':
        set('dgf-title', 'Café with a view'); F.fields.type.write('food'); paintBar();
        return false;
    }
    return false;
  }
  var firstRoute = true;
  Z.on('route', function (r) {
    if (firstRoute) {
      firstRoute = false;
      var f = r.view === 'detail' ? Z.fixture('detail') : null;
      if (f && FIXTURES.indexOf(f) > -1) setTimeout(function () { runFixture(f, Z.route); }, 0);
    }
    if (pending) {
      var k = r.view === 'detail' ? keyOf(r.query || {}) : null;
      if (!k || k[0] !== pending.kind) settle();
      return;
    }
    if (r.view === 'detail') fromRoute(r);
    else { leaveForm(); if (SH) closeSheet({ noFocus: true }); }
    parked = null; // not resumed by this route: its draft is already stored
  });

  buildSheet();
  buildForm();
  Z.dialogs = {
    entrySheet: function (id) { openSheet('entry', id); },
    placeSheet: function (id) { openSheet('place', id); },
    itemSheet: function (id) { openSheet('item', id); },
    fromRoute: fromRoute,
    closeAll: closeAll
  };
})();
