/* Trip detail view (#/trips/:id), direction B · Saffron light (decision.md). Owned by the detail builder.
   - Summary (one <section>, in this DOM order at every width): up-link and Edit · doorway (before, after, undated)
     · h1 (+ the 32×40 thumb during the trip) · status text during the trip · meta · the light band (before) or
     the sunken band (after) · notes with More · What's left · Budget (a disclosure below 64rem; open from 64rem)
     · the primary (floating on phones, ending the summary at 48–64rem, on the title line from 64rem).
   - Plan · Places · Prep: ARIA tabs below 64rem (?view= replaced, never pushed); 7|5 columns at 64–80rem;
     5|4|3 from 80rem. DOM order never changes.
   - The one motion: ticking the Now entry, the light leaves the row (--dur-light); instant with reduced motion.
   - Live partner updates (announced, never toasted), offline (ticks and places queue), every detail fixture
     in ia.md §8 except the dialog ones, which dialogs.js owns.
   Hooks for dialogs.js: rows are [data-act="entry"][data-id], cards [data-act="place"][data-id], Prep rows
   [data-act="item"][data-id]; "In the plan" links [data-act="inplan"][data-id=<placeId>]; and
   Z.detail.showEntry(id) / showPlace(id) / showItem(id) / select(tab) select the tab and focus the target. */
(function () {
  'use strict';
  var esc = Z.esc;
  var EXAMPLE = 'Example data. The trips, dates and the 9,200 / 8,000 MAD budget are the design system\'s. The plan, places, checklist and people\'s actions are made up.';
  var SCENARIO = {
    'now-last-day': 'Scenario: the last day of the Lisbon weekend, Tue 10 Nov at 19:00.',
    'now-nothing-left': 'Scenario: the evening of the Lisbon weekend, Mon 9 Nov at 21:00.',
    other: 'Scenario: during the Lisbon weekend, Mon 9 Nov at 13:20.'
  };
  var BUDGET_KEY = 'zamane.trips.budgetOpen';
  var TABS = ['plan', 'places', 'prep'];
  var TAB_NAME = { plan: 'Plan', places: 'Places', prep: 'Prep' };
  var phoneMQ = window.matchMedia('(max-width: 47.99rem)');
  var wideMQ = window.matchMedia('(min-width: 64rem)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LOADED_AT = Z.now();
  var S = null;

  // ---------- helpers ----------
  function trip() { return S && Z.trip(S.id); }
  function inView() { return !!(S && S.el && S.root.contains(S.el)); }
  function later(fn, ms) { var id = setTimeout(fn, ms); S.timers.push(id); return id; }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* not remembered */ } }
  function token(name) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return (parseFloat(v) || 0) * (/ms$/.test(v) ? 1 : 1000); }
  var DOT = '<span class="sep" aria-hidden="true"> · </span><span class="vh">, </span>';
  function join(parts) { return parts.filter(Boolean).join(DOT); }
  function when(d) { return Z.isoDate(d) === Z.today() ? Z.time(d) : Z.day(d); }
  function kindOf(t) { return Z.status(t).kind; }
  function hash(q) { return '#/trips/' + encodeURIComponent(S.id) + (q ? '?' + q : ''); }
  function editHref(t, focus) { return '#/trips/' + encodeURIComponent(t.id) + '/edit' + (focus ? '?focus=' + focus : ''); }
  function amount(n) { return '<span class="num" dir="ltr">' + Z.mad(n) + '</span>'; }
  function dialogQuery() { var q = (Z.route && Z.route.query) || {}; return !!(q.entry || q.place || q.schedule); }
  function q(sel) { return S.root.querySelector(sel); }
  function byId(id) { return document.getElementById(id); }
  function isExample(t) { return t.createdAt < LOADED_AT; }

  // Now / Next (trip-days), plus the evening rule: with nothing timed left today, tomorrow's first is Next (ia D6).
  function nowNext(t) {
    var r = Z.nowNext(t), s = Z.status(t);
    r.nothingLeft = false;
    if (s.kind !== 'now' || r.now || r.next) return r;
    var today = Z.today();
    if (!Z.entries(t.id).some(function (e) { return e.date === today; })) return r;
    r.nothingLeft = true;
    var tomorrow = Z.addDays(today, 1);
    if (t.end && tomorrow <= t.end) {
      r.next = Z.entries(t.id).filter(function (e) { return e.date === tomorrow && e.start && !e.doneAt; })
        .sort(function (a, b) { return a.start < b.start ? -1 : 1; })[0] || null;
    }
    return r;
  }
  function signature(t) {
    var s = Z.status(t), n = nowNext(t);
    return [Z.today(), s.kind, s.day, s.days, n.now && n.now.id, n.next && n.next.id, n.nothingLeft].join('|');
  }
  function isNextTrip(t) {
    var up = Z.trips().filter(function (x) { return Z.status(x).kind === 'upcoming'; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    return !!(up[0] && up[0].id === t.id);
  }

  // ---------- the primary (ia D5, decision U2) ----------
  function primarySpec(t) {
    var k = kindOf(t);
    if (k === 'upcoming') return { act: 'new-entry', text: 'Add to the plan' };
    if (k === 'now' || k === 'undated') return { act: 'new-place', text: 'Add a place' };
    return null; // past: no primary
  }
  // Changed in place, so focus stays on it when the label changes (status change, partner edits).
  function renderPrimary(t) {
    var dock = byId('td-dock'), b = byId('primary'); if (!dock || !b) return;
    var p = S.mode === 'notcached' ? null : primarySpec(t);
    dock.hidden = !p; Z.setFab(!!p);
    if (p && b.dataset.act !== p.act) { b.dataset.act = p.act; b.innerHTML = Z.svg('plus') + p.text; }
  }

  // ---------- summary ----------
  function topHTML(t) {
    return '<a class="td-back" href="#/trips" aria-label="Back to Trips">' + Z.svg('chevronLeft') + '<span>Trips</span></a>' +
      (t ? '<a class="btn-sec btn-sm td-edit" id="td-edit" data-act="edit" href="' + editHref(t) + '" aria-label="' + esc('Edit ' + t.title) + '">Edit</a>' : '');
  }
  function datesHTML(t) {
    return '<span aria-hidden="true">' + esc(Z.range(t.start, t.end)) + '</span><span class="vh">' + esc(Z.rangeSr(t.start, t.end)) + '</span>';
  }
  function idHTML(t) {
    var s = Z.status(t), now = s.kind === 'now';
    // The thumb arch sits before the title, so it reads as the trip's door, not an avatar or a button (critique F6).
    var h = '<div class="td-titlerow">' + (now ? Z.doorway(t, 'thumb') : '') + '<h1 class="' + (now ? 'title-lg' : 'display') + ' td-title" id="td-title" tabindex="-1" dir="auto">' + esc(t.title) + '</h1></div>';
    // During the trip the light is text here (saffron-ink); the block moves to the Now cell (decision.md).
    if (now) h += '<p class="td-nowtext">Day ' + s.day + ' of ' + s.total + DOT + (s.last ? 'Last day' : 'Happening now') + '</p>';
    var parts = [];
    if (t.destination) parts.push('<span dir="auto">' + esc(t.destination) + '</span>');
    if (t.start) parts.push(datesHTML(t));
    else parts.push('<span>No dates yet</span>');
    var add = !t.start ? '<a class="btn-ghost td-adddates" href="' + editHref(t, 'dates') + '" aria-label="' + esc('Add dates to ' + t.title) + '">' + Z.svg('calendar') + 'Add dates</a>' : '';
    return h + '<p class="td-meta">' + join(parts) + add + '</p>';
  }
  function whenHTML(t) {
    var k = kindOf(t);
    if (k === 'upcoming') return Z.lightBand(t, { lead: isNextTrip(t), nights: true });
    if (k === 'past') return Z.lightBand(t);
    return '';
  }
  function notesHTML(t) {
    if (!t.notes) return '';
    return '<div class="td-notesrow"><p class="td-notes-text' + (S.notesOpen ? ' is-open' : '') + '" id="td-notes-text" dir="auto">' + esc(t.notes) + '</p>' +
      '<button class="td-more" type="button" data-act="notes" aria-expanded="' + S.notesOpen + '" aria-controls="td-notes-text" aria-label="' + (S.notesOpen ? 'Less notes' : 'More notes') + '"' + (S.notesOpen ? '' : ' hidden') + '>' +
      (S.notesOpen ? 'Less' : 'More') + '</button></div>';
  }
  function leftHTML(t) {
    var k = kindOf(t); if (k !== 'upcoming' && k !== 'undated') return '';
    var l = Z.left(t), links = [];
    if (l.prep) links.push('<a class="td-leftlink" href="' + hash('view=prep') + '" data-act="left" data-id="prep">' + l.prep + ' ' + Z.plural(l.prep, 'prep item left', 'prep items left') + '</a>');
    if (l.mustDo) links.push('<a class="td-leftlink" href="' + hash('view=places') + '" data-act="left" data-id="places">' + l.mustDo + ' ' + Z.plural(l.mustDo, 'must-do not in the plan yet', 'must-dos not in the plan yet') + '</a>');
    return '<h2 class="vh" id="td-left-h">What\'s left</h2><p class="td-leftline">' +
      (links.length ? links.join('<span class="td-leftsep" aria-hidden="true">·</span>') : 'Nothing left to sort out.') + '</p>';
  }

  // Budget (D10 + decision.md's ink-and-pencil bar). Phones: a disclosure inside the h2 "Budget".
  // During the trip on phones it compacts to one 44 px row (directions.md, fold rule 3).
  function budgetHTML(t) {
    if (S.failed.budget) {
      return '<h2 class="td-bud-h"><span class="td-bud-k">Budget</span></h2><div class="td-secerr"><p>The budget didn\'t load.</p>' + retryHTML('budget') + '</div>';
    }
    var b = Z.budget(t), wide = wideMQ.matches, compact = phoneMQ.matches && kindOf(t) === 'now';
    var fig = b.budget != null ? 'Planned ' + Z.fmt(b.planned) + ' MAD of ' + Z.fmt(b.budget) + ' MAD' : b.planned ? 'Planned ' + Z.fmt(b.planned) + ' MAD' : 'Nothing costed yet';
    var state = b.budget == null ? '' : b.over ? '<span class="budget-over">Over by ' + Z.fmt(b.over) + ' MAD</span>' : Z.fmt(b.left) + ' MAD left';
    var set = b.budget == null ? '<a class="btn-ghost td-setbud" href="' + editHref(t, 'budget') + '" aria-label="' + esc('Set a budget for ' + t.title) + '">Set a budget</a>' : '';
    var bar = Z.budgetBar(t, { label: 'Budget' });
    var head = '<span class="td-bud-k">Budget</span>';
    if (!b.planned && b.budget == null) return '<h2 class="td-bud-h">' + head + '</h2><p class="td-bud-fig">' + fig + '</p>' + set;
    if (wide) {
      return '<h2 class="td-bud-h">' + head + '</h2><p class="td-bud-fig"><span dir="ltr">' + fig + '</span>' + (state ? DOT + state : '') + '</p>' +
        bar + breakdownHTML(t, b, false, true) + set;
    }
    var open = S.budgetOpen;
    var btn = '<button class="td-bud-btn" type="button" id="td-bud-btn" data-act="budget" aria-expanded="' + open + '" aria-controls="td-bd">' +
      '<span class="td-bud-fig" dir="ltr">' + (compact ? (state || fig) : fig) + '</span>' + Z.svg('chevronDown') + '</button>';
    if (compact) {
      return '<div class="td-bud-row"><h2 class="td-bud-h">' + head + btn + '</h2>' + bar + '</div>' + breakdownHTML(t, b, fig, open) + set;
    }
    return '<h2 class="td-bud-h">' + head + btn + '</h2>' + bar + (state ? '<p class="td-bud-state">' + state + '</p>' : '') + set + breakdownHTML(t, b, false, open);
  }
  function breakdownHTML(t, b, fig, open) {
    var rows = b.byType.map(function (r) {
      return '<li>' + Z.typeIcon(r.type) + '<span>' + Z.typeName(r.type) + ' · ' + amount(r.amount) + '</span></li>';
    });
    if (b.ideasCount && b.ideas) {
      var places = b.ideasCount + ' ' + Z.plural(b.ideasCount, 'place', 'places');
      rows.push('<li class="td-bd-ideas"><span aria-hidden="true">Ideas not in the plan yet · ' + places + ' · <span class="num" dir="ltr">~' + Z.mad(b.ideas) + '</span></span>' +
        '<span class="vh">Ideas not in the plan yet: ' + places + ', about ' + Z.mad(b.ideas) + '</span>' +
        (b.ideasQueued ? '<span class="queued">' + Z.svg('cloudOff') + 'Waiting to sync</span>' : '') + '</li>');
    }
    if (b.uncosted) rows.push('<li class="td-bd-nocost">' + Z.svg('other') + '<span>No cost yet on ' + b.uncosted + ' ' + Z.plural(b.uncosted, 'plan item', 'plan items') + '</span></li>');
    return '<div class="td-bd" id="td-bd"' + (open ? '' : ' hidden') + '>' +
      (fig ? '<p class="td-bd-fig" dir="ltr">' + fig + '</p>' : '') +
      // Wide: the explanation goes behind a small disclosure so the summary doesn't push the plan down (critique F3).
      (wideMQ.matches ? '<details class="td-bd-why"><summary>What counts</summary><p class="caption td-bd-explain">Planned adds up the costs in the plan and the estimates for ideas that aren\'t in the plan yet.</p></details>'
        : '<p class="caption td-bd-explain">Planned adds up the costs in the plan and the estimates for ideas that aren\'t in the plan yet.</p>') +
      '<ul class="td-bd-list" role="list">' + rows.join('') + '</ul>' +
      (b.budget != null ? '<a class="link-btn td-bd-change" href="' + editHref(t, 'budget') + '" aria-label="' + esc('Change budget for ' + t.title) + '">Change budget</a>' : '') + '</div>';
  }

  function renderSummary(t) {
    var cached = S.mode === 'notcached', partial = S.mode === 'partial';
    byId('td-top').innerHTML = topHTML(t);
    byId('td-door').innerHTML = kindOf(t) === 'now' ? '' : Z.doorway(t, 'detail');
    byId('td-id').innerHTML = idHTML(t);
    byId('td-when').innerHTML = whenHTML(t);
    // The list cache holds identity and status only (ia F1): no notes, What's left or budget until loaded.
    byId('td-notes').innerHTML = cached ? '' : notesHTML(t);
    byId('td-left').innerHTML = cached ? '' : partial ? '<span class="sk td-sk-line" aria-hidden="true"></span>' : leftHTML(t);
    byId('td-bud').innerHTML = cached ? '' : partial ? '<span class="sk td-sk-line" aria-hidden="true"></span><span class="sk td-sk-bar" aria-hidden="true"></span>' : budgetHTML(t);
    renderPrimary(t);
  }

  function renderNotice() {
    // During the trip on phones only the one-line version shows, so the Now row stays above the fold (critique F1).
    // CSS shows one variant; the other is display:none, so only the visible one is read.
    byId('td-notice').innerHTML = Z.offline ? '<p class="notice">' + Z.svg('cloudOff') + '<span>' +
      '<span class="td-notice-short">Offline. Ticks and new places sync later.</span>' +
      '<span class="td-notice-full"><span class="td-notice-line">You\'re offline. Showing the latest data on this phone. Ticking things off and adding places still work and sync when you\'re back online.</span>' +
      '<span class="td-notice-line">Adding to the plan or the checklist, editing and deleting need a connection.</span></span></span></p>' : '';
  }

  // ---------- panels: shared pieces ----------
  function headHTML(tab, caption) {
    return '<div class="td-phead"><h2 class="td-ph" id="td-h-' + tab + '" tabindex="-1">' + TAB_NAME[tab] + '</h2>' +
      (caption ? '<p class="td-pcap">' + caption + '</p>' : '') + '</div>';
  }
  function retryHTML(id) {
    var busy = S.failed[id] === 'retrying';
    return '<button class="btn-sec td-retry" type="button" data-act="retry" data-id="' + id + '"' + (busy ? ' aria-disabled="true"' : '') + '>' +
      Z.svg('refresh') + (busy ? 'Trying again' : 'Try again') + '</button>';
  }
  function skRowsHTML(n, announce) {
    var s = '<div class="td-sk-rows" aria-hidden="true">';
    for (var i = 0; i < n; i++) s += '<span class="sk td-sk-row"></span>';
    return s + '</div>' + (announce ? '<p class="vh" role="status">' + announce + '</p>' : '');
  }
  function notCachedHTML() { return '<p class="td-empty">This isn\'t on this phone yet. It loads when you\'re back online.</p>'; }
  // A press on an aria-disabled control: nothing changes but its reason, shown beside it and announced once.
  function reasonHTML(key, text) {
    return '<span class="vh" id="why-' + key + '">' + esc(text) + '</span>' + (S.reasons[key] ? '<p class="help td-why" aria-hidden="true">' + esc(text) + '</p>' : '');
  }
  function pressDisabled(key, text, render) {
    var first = !S.reasons[key];
    S.reasons[key] = true;
    if (first) Z.keepFocus(S.root, render);
    Z.announce(text);
  }

  // ---------- Plan ----------
  function rowHTML(e, t, ctx) {
    var done = !!e.doneAt, isNow = !!(ctx.nn.now && ctx.nn.now.id === e.id), isNext = !!(ctx.nn.next && ctx.nn.next.id === e.id);
    var running = ctx.kind === 'now', bid = 'pl-by-' + e.id, place = e.placeId ? Z.place(e.placeId) : null;
    var tick = '<button class="tick" type="button" role="checkbox" aria-checked="' + done + '" aria-label="' + esc(e.title + ' done') + '" aria-describedby="' + bid + '" data-act="tick" data-id="' + e.id + '">' + Z.svg('check') + '</button>';
    var cell = '';
    if (isNow) {
      cell = '<span class="pl-cell"><span class="pl-cell-k">Now</span>' +
        (e.start ? '<span class="pl-cell-t num" aria-hidden="true">' + e.start + '</span>' : '') +
        (e.end ? '<span class="pl-cell-e num" aria-hidden="true">–' + e.end + '</span>' : '') +
        (e.start ? '<span class="vh">, ' + Z.timeRangeSr(e) + ', </span>' : '<span class="vh">, </span>') + '</span>';
    }
    var parts = [];
    // A done row during the trip keeps only its title and who ticked it: today's plan is about what's left
    // (and LX Factory fits in two lines, directions.md fold table). The sheet has the rest.
    if (!(done && running)) {
      if (isNext) parts.push('<b class="pl-next">Next</b>');
      if (ctx.outside) parts.push('<span>' + Z.day(e.date) + '</span>');
      if (e.start && !isNow) parts.push('<span class="num" aria-hidden="true">' + Z.timeRange(e) + '</span><span class="vh">' + Z.timeRangeSr(e) + '</span>');
      if (e.location) parts.push('<span class="pl-loc" dir="auto">' + esc(e.location) + '</span>');
      if (e.cost != null) parts.push(amount(e.cost));
      if (place) parts.push('<span>From Places: <span dir="auto">' + esc(place.title) + '</span></span>');
    }
    var by;
    if (done) by = '<span class="pl-by" id="' + bid + '">' + Z.av(e.doneBy, 'sm') + '<span>Done by ' + esc(Z.name(e.doneBy)) + ' · ' + when(e.doneAt) + '</span></span>';
    else by = '<span class="vh" id="' + bid + '">Added by ' + esc(Z.name(e.createdBy)) + '</span>';
    var queued = e.pending ? '<span class="queued pl-queued">' + Z.svg('cloudOff') + 'Waiting to sync</span>' : '';
    var outside = ctx.outside ? '<span class="pl-sub">' + (e.date < t.start ? 'Before the trip' : 'After the trip') + '</span>' : '';
    var cls = 'pl-row' + (done ? ' is-done' : '') + (isNow ? ' is-now' : '') + (isNext ? ' is-next' : '');
    return '<li class="' + cls + '" data-key="' + e.id + '">' + tick +
      '<button class="pl-card commit' + (isNow ? ' is-now' : '') + '" type="button" data-act="entry" data-id="' + e.id + '">' + cell +
      '<span class="pl-body">' + (done ? '' : '<span class="pl-av">' + Z.av(e.createdBy, 'sm') + '</span>') +
      '<span class="pl-title"><span class="pl-ic">' + Z.typeIcon(e.type) + '</span><span class="vh">' + Z.typeName(e.type) + ', </span><span dir="auto">' + esc(e.title) + '</span></span>' +
      (parts.length ? '<span class="pl-meta">' + join(parts) + '</span>' : '') + outside + by + queued + '</span></button></li>';
  }
  // Untimed entries come first in a day (Z.days); "Any time" captions only them (ia D7).
  function entriesHTML(list, t, ctx) {
    function ul(xs) { return xs.length ? '<ul class="pl-rows" role="list">' + xs.map(function (e) { return rowHTML(e, t, ctx); }).join('') + '</ul>' : ''; }
    var n = ctx.outside || ctx.noDate ? 0 : list.filter(function (e) { return !e.start; }).length;
    if (!n) return ul(list);
    return '<p class="pl-anytime">Any time</p>' + ul(list.slice(0, n)) + ul(list.slice(n));
  }
  function dayHTML(day, t, ctx, emptyRun) {
    var label = Z.day(day.date), today = ctx.kind === 'now' && day.isToday;
    var big = today ? 'Today' : label, cap = !t.start ? '' : today ? label + ' · Day ' + day.n : 'Day ' + day.n;
    var h3 = '<h3 class="pl-dayh" id="pl-day-' + day.date + '" tabindex="-1"><span class="pl-big">' + big + '</span>' +
      (cap ? '<span class="vh"> · </span><span class="pl-cap">' + cap + '</span>' : '') + '</h3>';
    var addBtn = '<button class="btn-ghost pl-dayadd" type="button" data-act="day-add" data-id="' + day.date + '" aria-label="Add to ' + label + '">' + Z.svg('plus') + 'Add</button>';
    var empty = !day.entries.length;
    var body = '';
    if (empty) {
      body = '<div class="pl-well' + (emptyRun ? ' is-run' : '') + '"><p>' + (today ? 'Nothing planned today' : 'Nothing planned') + '</p>' + addBtn + '</div>';
    } else {
      if (today && ctx.nn.nothingLeft) {
        // Evening: name what's next, so today's answer never slides out of reach (critique F2).
        var nx = ctx.nn.next;
        body += '<p class="pl-left">Nothing else planned today' + (nx ? '. <button class="link-btn pl-leftnext" type="button" data-act="entry" data-id="' + nx.id + '">Next: <span dir="auto">' + esc(nx.title) + '</span>, tomorrow ' + nx.start + '</button>' : '') + '</p>';
      }
      body += entriesHTML(day.entries, t, ctx);
    }
    return '<div class="pl-day' + (today ? ' is-today' : '') + (empty ? ' is-empty' : '') + (emptyRun ? ' is-run' : '') + '" data-day="' + day.date + '">' +
      '<div class="pl-dayhead">' + h3 + (empty ? '' : addBtn) + '</div>' + body + '</div>';
  }
  function daysHTML(days, t, ctx) {
    // Runs of 3 or more empty days: one 48 px line each (ia D7).
    var run = days.map(function (d) { return !d.entries.length; }), out = '';
    days.forEach(function (d, i) {
      var len = 0, j;
      if (run[i]) { for (j = i; j >= 0 && run[j]; j--) len++; for (j = i + 1; j < run.length && run[j]; j++) len++; }
      out += dayHTML(d, t, ctx, len >= 3);
    });
    return out;
  }
  function planHTML(t) {
    var k = kindOf(t), primary = primarySpec(t);
    if (S.failed.plan) return headHTML('plan') + '<div class="td-secerr"><p>The plan didn\'t load.</p>' + retryHTML('plan') + '</div>';
    if (S.mode === 'partial') return headHTML('plan') + skRowsHTML(4, 'Loading the plan');
    if (S.mode === 'notcached') return headHTML('plan') + notCachedHTML();
    var d = Z.days(t), ctx = { kind: k, nn: nowNext(t), outside: false }, out = '';
    var total = Z.entries(t.id).length;
    if (t.start && d.days.length > 7) {
      out += '<div class="pl-jump"><label class="field-label" for="pl-jump">Jump to a day</label><div class="pl-jumprow"><select id="pl-jump" class="pl-select">' +
        d.days.map(function (x) { return '<option value="' + x.date + '">' + Z.day(x.date) + ' · Day ' + x.n + '</option>'; }).join('') +
        '</select><button class="btn-sec" type="button" data-act="jump" aria-label="Go to day">Go</button></div></div>';
    }
    if (k === 'now') {
      var today = Z.today();
      var earlier = d.days.filter(function (x) { return x.date < today; }), rest = d.days.filter(function (x) { return x.date >= today; });
      if (earlier.length) {
        var es = [].concat.apply([], earlier.map(function (x) { return x.entries; }));
        var doneN = es.filter(function (e) { return e.doneAt; }).length;
        out += '<div class="pl-earlier"><button class="pl-fold" type="button" id="pl-fold" data-act="earlier" aria-expanded="' + S.earlierOpen + '" aria-controls="pl-earlier">' +
          Z.svg('chevron') + '<span class="pl-fold-text"><span class="pl-fold-k">Earlier days</span><span class="pl-fold-sum">' +
          '<span aria-hidden="true">' + esc(Z.range(earlier[0].date, earlier[earlier.length - 1].date)) + '</span><span class="vh">' + esc(Z.rangeSr(earlier[0].date, earlier[earlier.length - 1].date)) + '</span>' +
          ' · ' + doneN + ' of ' + es.length + ' done</span></span></button>' +
          '<div class="pl-earlier-days" id="pl-earlier"' + (S.earlierOpen ? '' : ' hidden') + '>' + daysHTML(earlier, t, ctx) + '</div></div>';
      }
      out += daysHTML(rest, t, ctx);
    } else {
      out += daysHTML(d.days, t, ctx);
    }
    if (d.outside.length) {
      out += '<div class="pl-group"><h3 class="pl-gh" id="pl-outside">Outside the trip dates</h3><p class="pl-intro">Planned for dates that aren\'t in the trip. Edit one to move it into the trip.</p>' +
        entriesHTML(d.outside, t, { kind: k, nn: ctx.nn, outside: true }) + '</div>';
    }
    if (d.unscheduled.length) {
      out += '<div class="pl-group"><h3 class="pl-gh" id="pl-nodate">No date yet</h3>' + entriesHTML(d.unscheduled, t, { kind: k, nn: ctx.nn, outside: false, noDate: true }) + '</div>';
    }
    if (!total && !t.start) out += '<p class="td-empty">Nothing planned yet. Add the first thing with Add to the plan.</p>';
    else if (!total && k === 'past') out += '<p class="td-empty">Nothing was planned for this trip.</p>';
    // Plan's own add sits at the end, so Today stays inside the fold (directions.md); hidden while it's the primary.
    if (!primary || primary.act !== 'new-entry') {
      out += '<button class="btn-sec td-paneladd" type="button" data-act="new-entry">' + Z.svg('plus') + 'Add to the plan</button>';
    }
    return headHTML('plan') + '<div class="pl">' + out + '</div>';
  }

  // ---------- Places ----------
  function liveGroup(p) { var e = Z.entryOf(p); return !e ? 'ideas' : e.doneAt ? 'visited' : 'plan'; }
  // Groups are fixed while the view is on screen; a place scheduled or visited here moves next visit (ia D8).
  function freezePlaces(t) {
    S.pgroup = {}; S.porder = [];
    var ps = Z.places(t.id), by = { ideas: [], plan: [], visited: [] };
    ps.forEach(function (p) { by[liveGroup(p)].push(p); });
    by.ideas.sort(function (a, b) { return (b.mustDo - a.mustDo) || (a.createdAt - b.createdAt); });
    function key(p) { var e = Z.entryOf(p); return (e.date || '9999') + ' ' + (e.start || '99:99'); }
    by.plan.sort(function (a, b) { return key(a) < key(b) ? -1 : 1; });
    by.visited.sort(function (a, b) { return Z.entryOf(a).doneAt - Z.entryOf(b).doneAt; });
    ['ideas', 'plan', 'visited'].forEach(function (g) { by[g].forEach(function (p) { S.pgroup[p.id] = g; S.porder.push(p.id); }); });
  }
  function placeHTML(p, t) {
    var e = Z.entryOf(p), visited = !!(e && e.doneAt), key = 'sched-' + p.id;
    var meta = [];
    if (p.area) meta.push('<span dir="auto">' + esc(p.area) + '</span>');
    // A zero estimate is "Free", never "About 0 MAD" (a11y minor 4).
    if (p.estimate === 0) meta.push('<span>Free</span>');
    else if (p.estimate != null) meta.push('<span class="num" dir="ltr" aria-hidden="true">~' + Z.mad(p.estimate) + '</span><span class="vh">About ' + Z.mad(p.estimate) + '</span>');
    var main = '<button class="pc-main" type="button" data-act="place" data-id="' + p.id + '">' +
      '<span class="pc-line"><span class="pl-ic">' + Z.typeIcon(p.type) + '</span><span class="vh">' + Z.typeName(p.type) + ', </span><span class="pc-title" dir="auto">' + esc(p.title) + '</span></span>' +
      (meta.length ? '<span class="pc-meta">' + join(meta) + '</span>' : '') +
      '<span class="pc-tags">' + (p.mustDo ? '<span class="must">' + Z.svg('star') + 'Must-do</span>' : '') +
      Z.av(p.createdBy, 'sm') + '<span class="vh">Added by ' + esc(Z.name(p.createdBy)) + '</span>' +
      (p.pending ? '<span class="queued">' + Z.svg('cloudOff') + 'Waiting to sync</span>' : '') + '</span>' +
      (visited ? '<span class="pc-visited">' + Z.svg('check') + '<span>Visited · ' + Z.day(e.doneAt) + ' · ' + esc(Z.name(e.doneBy)) + '</span></span>' : '') +
      (!e ? '<span class="vh">, Idea</span>' : '') + '</button>';
    var act = '';
    if (!e) {
      var why = p.pending ? 'This place hasn\'t synced yet.' : Z.offline ? 'Scheduling needs a connection.' : '';
      act = '<button class="btn-sec pc-sched" type="button" data-act="schedule" data-id="' + p.id + '" aria-label="' + esc('Schedule ' + p.title) + '"' +
        (why ? ' aria-disabled="true" aria-describedby="why-' + key + '"' : '') + '>' + Z.svg('calendar') + 'Schedule</button>' + (why ? reasonHTML(key, why) : '');
    } else if (!visited) {
      var w = e.date ? Z.day(e.date) + (e.start ? ', ' + e.start : '') : 'no date yet';
      act = '<a class="pc-inplan" href="' + hash('view=plan') + '" data-act="inplan" data-id="' + p.id + '">In the plan · ' + w + '</a>';
    }
    return '<li class="pc idea' + (visited ? ' is-visited' : '') + '" data-key="' + p.id + '">' + main + (act ? '<div class="pc-act">' + act + '</div>' : '') + '</li>';
  }
  function placesHTML(t) {
    var primary = primarySpec(t), ideasN = Z.places(t.id).filter(function (p) { return !Z.entryOf(p); }).length;
    var head = headHTML('places', S.mode === 'ready' ? ideasN + ' ' + Z.plural(ideasN, 'idea', 'ideas') : '');
    if (S.mode === 'partial') return head + skRowsHTML(3, 'Loading places');
    if (S.mode === 'notcached') return head + notCachedHTML();
    var add = (!primary || primary.act !== 'new-place') ? '<button class="btn-sec td-paneladd" type="button" data-act="new-place">' + Z.svg('plus') + 'Add a place</button>' : '';
    var intro = '<p class="td-intro">Ideas for the trip. Schedule one to put it in the plan.</p>';
    var ps = Z.places(t.id);
    if (!ps.length) return head + intro + '<p class="td-empty">No places yet. Add the ideas you don\'t want to forget.</p>' + add;
    ps.forEach(function (p) { if (!(p.id in S.pgroup)) { S.pgroup[p.id] = liveGroup(p); S.porder.push(p.id); } });
    var groups = { ideas: [], plan: [], visited: [] };
    S.porder.forEach(function (id) { var p = Z.place(id); if (p && p.tripId === t.id) groups[S.pgroup[id]].push(p); });
    var out = '';
    [['ideas', 'Ideas'], ['plan', 'In the plan'], ['visited', 'Visited']].forEach(function (g) {
      var list = groups[g[0]];
      if (!list.length && g[0] !== 'ideas') return;
      out += '<div class="pc-group"><h3 class="pc-gh" id="pc-h-' + g[0] + '">' + g[1] + '</h3>' +
        (list.length ? '<ul class="pc-list" role="list">' + list.map(function (p) { return placeHTML(p, t); }).join('') + '</ul>' : '<p class="td-empty">Every idea is in the plan.</p>') + '</div>';
    });
    return head + intro + add + out;
  }

  // ---------- Prep ----------
  function itemHTML(it, idx, total, reordering) {
    var packing = it.group === 'packing', bid = 'pr-by-' + it.id, by = '';
    if (it.doneAt) by = '<span class="pr-by is-done" id="' + bid + '">' + Z.av(it.doneBy, 'sm') + '<span>' + (packing ? 'Packed by ' : 'Done by ') + esc(Z.name(it.doneBy)) + ' · ' + when(it.doneAt) + '</span></span>';
    else if (!it.seeded) by = '<span class="pr-by" id="' + bid + '">' + Z.av(it.createdBy, 'sm') + '<span>Added by ' + esc(Z.name(it.createdBy)) + '</span></span>';
    if (it.pending) by += '<span class="queued">' + Z.svg('cloudOff') + 'Waiting to sync</span>';
    var tick = '<button class="tick" type="button" role="checkbox" aria-checked="' + !!it.doneAt + '" aria-label="' + esc(it.title + (packing ? ' packed' : ' done')) + '"' +
      (by && (it.doneAt || !it.seeded) ? ' aria-describedby="' + bid + '"' : '') + ' data-act="itick" data-id="' + it.id + '">' + Z.svg('check') + '</button>';
    var move = '';
    if (reordering) {
      var g = Z.groupName(it.group), off = Z.offline;
      var upWhy = off ? 'Reordering needs a connection.' : idx === 0 ? 'First in ' + g : '';
      var dnWhy = off ? 'Reordering needs a connection.' : idx === total - 1 ? 'Last in ' + g : '';
      move = '<span class="pr-move">' +
        '<button class="btn-sec pr-mv" type="button" data-act="up" data-id="' + it.id + '" aria-label="' + esc('Move up, ' + it.title) + '"' + (upWhy ? ' aria-disabled="true" aria-describedby="why-up-' + it.id + '"' : '') + '>' + Z.svg('arrowUp') + '<span class="pr-mv-t" aria-hidden="true">Move up</span></button>' +
        '<button class="btn-sec pr-mv" type="button" data-act="down" data-id="' + it.id + '" aria-label="' + esc('Move down, ' + it.title) + '"' + (dnWhy ? ' aria-disabled="true" aria-describedby="why-down-' + it.id + '"' : '') + '>' + Z.svg('arrowDown') + '<span class="pr-mv-t" aria-hidden="true">Move down</span></button>' +
        (upWhy ? '<span class="vh" id="why-up-' + it.id + '">' + esc(upWhy) + '</span>' : '') + (dnWhy ? '<span class="vh" id="why-down-' + it.id + '">' + esc(dnWhy) + '</span>' : '') + '</span>';
    }
    return '<li class="pr-row' + (it.doneAt ? ' is-done' : '') + '" data-key="' + it.id + '">' + tick +
      '<button class="pr-btn" type="button" data-act="item" data-id="' + it.id + '"><span class="pr-title" dir="auto">' + esc(it.title) + '</span>' + by + '</button>' + move + '</li>';
  }
  function addFieldHTML(g) {
    var name = Z.groupName(g), v = S.adding.value || '', off = Z.offline;
    return '<div class="pr-field" data-group="' + g + '">' +
      '<label class="vh" for="pr-in-' + g + '">Add an item to ' + name + '</label>' +
      '<div class="pr-fieldrow"><div class="field pr-input"><input id="pr-in-' + g + '" type="text" placeholder="Add an item" autocomplete="off" enterkeyhint="enter" maxlength="80" value="' + esc(v) + '" aria-describedby="pr-help-' + g + '"></div>' +
      '<button class="btn-primary pr-submit" type="button" data-act="add-submit" data-id="' + g + '" aria-label="Add to ' + name + '"' + (off ? ' aria-disabled="true"' : '') + '>Add</button>' +
      '<button class="btn-sec pr-close" type="button" data-act="add-close" data-id="' + g + '" aria-label="Close, ' + name + '">Close</button></div>' +
      '<p class="help" id="pr-help-' + g + '">' + (off ? 'Adding to the checklist needs a connection.' : 'Press Enter to add it and keep going.') + '</p></div>';
  }
  function groupHTML(g) {
    var name = Z.groupName(g.group), reordering = S.reorder === g.group, key = 'reorder-' + g.group;
    var reorder = '';
    if (g.total > 1) {
      var why = Z.offline && !reordering ? 'Reordering needs a connection.' : '';
      reorder = '<button class="btn-ghost pr-reorder" type="button" data-act="reorder" data-id="' + g.group + '" aria-label="' + (reordering ? 'Done reordering ' + name : 'Reorder ' + name) + '"' +
        (why ? ' aria-disabled="true" aria-describedby="why-' + key + '"' : '') + '>' + (reordering ? Z.svg('check') + 'Done' : Z.svg('listOrder') + 'Reorder') + '</button>' + (why ? reasonHTML(key, why) : '');
    }
    var rows = g.items.length ? '<ul class="pr-rows' + (reordering ? ' is-reordering' : '') + '" role="list">' + g.items.map(function (it, i) { return itemHTML(it, i, g.items.length, reordering); }).join('') + '</ul>'
      : '<p class="td-empty">Nothing here.</p>';
    var add = S.adding && S.adding.group === g.group ? addFieldHTML(g.group)
      : '<button class="link-btn pr-add" type="button" data-act="add-open" data-id="' + g.group + '">' + Z.svg('plus') + 'Add to ' + name + '</button>';
    return '<div class="pr-group" data-group="' + g.group + '"><div class="pr-head"><h3 class="pr-h" id="pr-h-' + g.group + '">' + Z.groupIcon(g.group) +
      '<span>' + name + ' · <span class="nowrap">' + g.done + ' of ' + g.total + '</span></span></h3>' + Z.tally(g.done, g.total) + reorder + '</div>' + rows + add + '</div>';
  }
  function prepHTML(t) {
    var c = Z.prepCounts(t);
    var head = headHTML('prep', S.mode === 'ready' ? c.done + ' of ' + c.total + ' done' : '');
    if (S.mode === 'partial') return head + skRowsHTML(4, 'Loading prep');
    if (S.mode === 'notcached') return head + notCachedHTML();
    return head + '<p class="td-intro">What to pack, bring and book.</p>' + Z.prep(t).map(groupHTML).join('');
  }

  // ---------- render ----------
  function shellHTML() {
    return '<div class="td">' +
      '<section class="td-sum" aria-label="Summary">' +
      '<div class="td-top" id="td-top"></div><div class="td-door" id="td-door"></div><div class="td-id" id="td-id"></div>' +
      '<div class="td-when" id="td-when"></div><div class="td-notes" id="td-notes"></div><div class="td-left" id="td-left"></div>' +
      '<div class="td-bud" id="td-bud"></div>' +
      '<div class="dock" id="td-dock"><button class="btn-primary" type="button" id="primary"></button></div></section>' +
      '<div class="td-notice" id="td-notice"></div>' +
      '<div class="td-tabs" role="tablist" aria-label="Plan, places and prep" id="td-tabs">' +
      TABS.map(function (t) { return '<button class="td-tab" type="button" role="tab" id="td-tab-' + t + '" aria-controls="td-panel-' + t + '">' + TAB_NAME[t] + '</button>'; }).join('') + '</div>' +
      '<div class="td-panels"><section class="td-panel td-panel--plan" id="td-panel-plan"></section>' +
      '<section class="td-panel td-panel--places" id="td-panel-places"></section>' +
      '<section class="td-panel td-panel--prep" id="td-panel-prep"></section></div></div>';
  }
  function setTitle(t) {
    if (dialogQuery()) return; // the form dialogs own the title while open
    Z.title(t.title + (Z.offline ? ' (offline)' : '') + ' – Zamane');
  }
  function render(o) {
    o = o || {};
    var t = trip(); if (!t || !inView()) return;
    S.el.className = 'td td--' + kindOf(t) + (S.mode === 'partial' ? ' is-partial' : '');
    renderNotice();
    renderSummary(t);
    if (!o.skipPlan) byId('td-panel-plan').innerHTML = planHTML(t);
    byId('td-panel-places').innerHTML = placesHTML(t);
    byId('td-panel-prep').innerHTML = prepHTML(t);
    applyTabs();
    setTitle(t);
    S.sig = signature(t);
    after();
  }
  function after() { Z.afterRender(); measure(); }
  function build() {
    var t = trip();
    S.root.innerHTML = shellHTML();
    S.el = S.root.querySelector('.td');
    freezePlaces(t);
    render();
    Z.footnote(isExample(t) ? EXAMPLE : '', isExample(t) && t.id === 'lisbon' ? (SCENARIO[Z.state] || SCENARIO.other) : '');
  }

  // Keep the first visible row fixed on screen when rows land above it (partner adds; ia F13).
  function keepScroll(fn) {
    var key = null, top = 0;
    if (window.scrollY > 0) {
      var items = S.root.querySelectorAll('.td-panels [data-key]');
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        if (r.height && r.top >= 0) { key = items[i].dataset.key; top = r.top; break; }
      }
    }
    fn();
    if (key) {
      var el = S.root.querySelector('.td-panels [data-key="' + key + '"]');
      if (el) { var d = el.getBoundingClientRect().top - top; if (Math.abs(d) > 1) window.scrollBy(0, d); }
    }
  }

  // Notes clamp: "More" shows only when the 2 lines overflow.
  function measure() {
    if (!inView()) return;
    var p = byId('td-notes-text'), m = q('.td-more');
    if (p && m && !S.notesOpen) m.hidden = !(p.scrollHeight > p.clientHeight + 1);
  }

  // ---------- tabs (< 64rem) / columns ----------
  function applyTabs() {
    if (!inView()) return;
    var narrow = !wideMQ.matches;
    // Resizing across 64 rem hides the tablist: keep focus by moving it to the column's h2 (a11y minor 5).
    var onTab = document.activeElement && document.activeElement.getAttribute('role') === 'tab';
    TABS.forEach(function (t) {
      var sel = S.tab === t, tab = byId('td-tab-' + t), panel = byId('td-panel-' + t);
      tab.setAttribute('aria-selected', String(sel)); tab.tabIndex = sel ? 0 : -1;
      panel.classList.toggle('is-selected', sel);
      if (narrow) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'td-tab-' + t); }
      else { panel.removeAttribute('role'); panel.removeAttribute('aria-labelledby'); }
      if (narrow && !panel.querySelector('button:not([hidden]), a[href], input, select')) panel.tabIndex = 0; else panel.removeAttribute('tabindex');
    });
    if (onTab && !narrow) Z.focus(byId('td-h-' + S.tab));
  }
  function scrollTabsIntoView() {
    var list = byId('td-tabs'); if (!list || !list.offsetParent) return;
    var min = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0, top = list.getBoundingClientRect().top;
    if (top < min) window.scrollTo({ top: window.scrollY + top - min - 8, behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  function selectTab(t, o) {
    o = o || {};
    if (TABS.indexOf(t) < 0 || !inView()) return;
    var changed = S.tab !== t;
    S.tab = t;
    applyTabs();
    if (o.focus) Z.focus(byId('td-tab-' + t));
    if (!o.fromRoute && Z.route.query.view !== t) Z.go(Z.withQuery({ view: t }), { replace: true });
    if (changed && o.user) scrollTabsIntoView();
    measure();
  }
  // "What's left" and the in-page links: select the tab on phones (replace), scroll the column on wide;
  // never push history (ia §2).
  function reveal(tab, el) {
    if (!inView()) return;
    if (!wideMQ.matches) selectTab(tab, {});
    el = el || byId('td-h-' + tab);
    if (!el) return;
    el.scrollIntoView({ block: wideMQ.matches || el.classList.contains('td-ph') ? 'start' : 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
    if (!wideMQ.matches && el.classList.contains('td-ph')) scrollTabsIntoView();
    Z.focus(el);
  }
  function showEntry(id) {
    var t = trip(), e = Z.entry(id); if (!t || !e || !inView()) return;
    if (kindOf(t) === 'now' && e.date && e.date < Z.today() && !S.earlierOpen) {
      S.earlierOpen = true; Z.keepFocus(S.root, function () { byId('td-panel-plan').innerHTML = planHTML(t); applyTabs(); after(); });
    }
    reveal('plan', q('[data-act="entry"][data-id="' + id + '"]'));
  }

  // ---------- disclosures ----------
  function toggleBudget(b) {
    S.budgetOpen = !S.budgetOpen;
    if (!S.fixtureBudget) save(BUDGET_KEY, S.budgetOpen ? '1' : '0');
    b.setAttribute('aria-expanded', String(S.budgetOpen));
    byId('td-bd').hidden = !S.budgetOpen;
  }
  function toggleNotes(b) {
    S.notesOpen = !S.notesOpen;
    byId('td-notes-text').classList.toggle('is-open', S.notesOpen);
    b.setAttribute('aria-expanded', String(S.notesOpen));
    b.setAttribute('aria-label', S.notesOpen ? 'Less notes' : 'More notes');
    b.textContent = S.notesOpen ? 'Less' : 'More';
    if (!S.notesOpen) measure();
  }
  function toggleEarlier(b) {
    S.earlierOpen = !S.earlierOpen;
    b.setAttribute('aria-expanded', String(S.earlierOpen));
    byId('pl-earlier').hidden = !S.earlierOpen;
  }

  // ---------- ticks ----------
  // The one orchestrated moment: ticking the Now entry, the light leaves the row (decision.md).
  // 1. the box fills zellige (--dur-press); 2. the cell folds away and the tint fades (--dur-light);
  // 3. the row is redrawn as an ordinary done row. Reduced motion: all at once.
  function tickEntry(b) {
    var t = trip(), id = b.dataset.id, e = Z.entry(id); if (!t || !e) return;
    var done = !e.doneAt, nn = nowNext(t), isNow = done && nn.now && nn.now.id === id;
    b.setAttribute('aria-checked', String(done)); // pressed feedback before the work (INP)
    if (isNow && !reduced.matches) {
      var card = b.parentNode.querySelector('.pl-card');
      if (card) card.classList.add('is-leaving');
      S.leaving = id;
      later(function () {
        S.leaving = null;
        if (inView()) Z.keepFocus(S.root, function () { render(); });
      }, token('--dur-light'));
    }
    Z.setEntryDone(id, done, { pending: Z.offline });
  }
  function tickItem(b) {
    var it = Z.item(b.dataset.id); if (!it) return;
    b.setAttribute('aria-checked', String(!it.doneAt));
    Z.setItemDone(it.id, !it.doneAt, { pending: Z.offline });
  }

  // ---------- Prep: inline add and reorder (ia D9) ----------
  function renderPrep() { var t = trip(); byId('td-panel-prep').innerHTML = prepHTML(t); applyTabs(); after(); }
  function openAdd(g) {
    S.adding = { group: g, value: '' };
    renderPrep();
    Z.focus(byId('pr-in-' + g));
  }
  function closeAdd(focusBtn) {
    if (!S.adding) return;
    var g = S.adding.group; S.adding = null;
    renderPrep();
    if (focusBtn) Z.focus(q('[data-act="add-open"][data-id="' + g + '"]'));
  }
  function submitAdd(g) {
    var input = byId('pr-in-' + g); if (!input) return;
    var title = input.value.trim();
    if (!title) { Z.focus(input); return; } // empty Enter: nothing added, the field stays
    if (Z.offline) { Z.announce('Adding to the checklist needs a connection.'); Z.focus(input); return; }
    S.adding.value = '';
    var focusInput = document.activeElement !== input;
    Z.addItem(S.id, g, title);
    if (focusInput) Z.focus(byId('pr-in-' + g));
    Z.announce('Added ' + title + ' to ' + Z.groupName(g) + '.');
  }
  function toggleReorder(b) {
    var g = b.dataset.id, name = Z.groupName(g);
    if (b.getAttribute('aria-disabled') === 'true') { pressDisabled('reorder-' + g, 'Reordering needs a connection.', renderPrep); return; }
    var on = S.reorder !== g;
    S.reorder = on ? g : null;
    var moved = S.lastMoved;
    Z.keepFocus(S.root, renderPrep);
    if (!on && moved && Z.item(moved) && Z.item(moved).group === g) { Z.focus(q('[data-act="item"][data-id="' + moved + '"]')); S.lastMoved = null; }
    Z.announce(on ? 'Reordering ' + name + '. Use Move up and Move down.' : 'Done reordering.');
  }
  function move(b, dir) {
    var id = b.dataset.id, it = Z.item(id); if (!it) return;
    if (b.getAttribute('aria-disabled') === 'true') {
      var why = byId('why-' + (dir < 0 ? 'up-' : 'down-') + id);
      Z.announce(why ? why.textContent : ''); return;
    }
    var r = Z.moveItem(id, dir); // re-render keeps focus on the same button of the moved row
    S.lastMoved = id;
    var same = q('[data-act="' + (dir < 0 ? 'up' : 'down') + '"][data-id="' + id + '"]');
    if (same && same.getAttribute('aria-disabled') === 'true') Z.focus(q('[data-act="' + (dir < 0 ? 'down' : 'up') + '"][data-id="' + id + '"]'));
    Z.announce(it.title + ' moved to ' + r.position + ' of ' + r.total + '.');
  }

  // ---------- section and page retry ----------
  function retry(b) {
    if (b.getAttribute('aria-disabled') === 'true') return;
    var id = b.dataset.id;
    if (id === 'page') {
      b.setAttribute('aria-disabled', 'true'); b.innerHTML = Z.svg('refresh') + 'Trying again';
      later(function () {
        if (!trip()) { S.mode = 'notfound'; renderNotFound(); Z.afterRender(); Z.focusHeading(); return; }
        S.mode = 'ready'; build(); Z.focusHeading();
      }, 900);
      return;
    }
    S.failed[id] = 'retrying';
    Z.keepFocus(S.root, function () { render(); });
    later(function () {
      if (!inView()) return;
      S.failed[id] = false;
      render();
      Z.focus(id === 'budget' ? (byId('td-bud-btn') || q('.td-bud-h')) : byId('td-h-plan'));
    }, 900);
  }

  // ---------- live updates (ia F13; copy "Live announcements") ----------
  function liveMessage(d, t) {
    var n = Z.name(d.by), e = d.entry, p = d.place, it = d.item;
    switch (d.type) {
      case 'entry-added': return e.date ? n + ' added ' + e.title + ' to ' + Z.day(e.date) + '.' : n + ' added ' + e.title + ' to the plan, with no date yet.';
      case 'entry-updated': return n + ' changed ' + e.title + '.';
      case 'entry-deleted': return n + ' removed ' + e.title + ' from the plan.';
      case 'entry-done': return n + (d.done ? ' ticked ' : ' unticked ') + e.title + '.';
      case 'place-added': return n + ' added a place: ' + p.title + '.';
      case 'place-updated': return n + ' changed ' + p.title + '.';
      case 'place-deleted': return n + ' deleted the place ' + p.title + '.';
      case 'place-scheduled': return d.entry.date ? n + ' put ' + p.title + ' on ' + Z.day(d.entry.date) + '.' : n + ' put ' + p.title + ' in the plan, with no date yet.';
      case 'item-done': return it.group === 'packing' && d.done ? n + ' packed ' + it.title + '.' : n + (d.done ? ' ticked ' : ' unticked ') + it.title + '.';
      case 'item-added': return n + ' added ' + it.title + ' to ' + Z.groupName(it.group) + '.';
      case 'item-updated': return n + ' changed ' + it.title + '.';
      case 'item-deleted': return n + ' deleted ' + it.title + ' from ' + Z.groupName(it.group) + '.';
      case 'item-moved': return n + ' changed the order of ' + Z.groupName(it.group) + '.';
      case 'trip-updated':
        var f = d.fields || [];
        if (f.indexOf('start') > -1 || f.indexOf('end') > -1) return t.start ? n + ' changed the dates to ' + Z.range(t.start, t.end) + '.' : n + ' removed the dates.';
        if (f.indexOf('title') > -1) return n + ' renamed the trip to ' + t.title + '.';
        if (f.indexOf('budget') > -1) return t.budget == null ? n + ' removed the budget.' : n + ' changed the budget to ' + Z.fmt(t.budget) + ' MAD.';
        if (f.indexOf('cover') > -1) return n + ' changed the cover photo.';
        return n + ' edited this trip.';
    }
    return '';
  }
  // The partner deleted this trip while I'm on it: the page swaps in place (ia F13).
  function gone(d) {
    var t = d.trip, head = Z.name(d.by) + ' deleted ' + t.title + '.';
    var c = byId('confirm'); if (c && c.open) byId('confirm-cancel').click();
    if (!dialogQuery()) Z.dialogs.closeAll(); // open forms keep their text behind their own banner (dialogs.js)
    S.mode = 'deleted'; S.el = null;
    S.root.innerHTML = '<div class="td td--state"><div class="td-state"><h1 class="title-lg" tabindex="-1">' + esc(head) + '</h1>' +
      '<p>Its plan, places and checklist are gone too.</p><a class="btn-primary" id="td-gone" href="#/trips">Back to Trips</a></div></div>';
    Z.setFab(false); Z.footnote('');
    if (!dialogQuery()) Z.title(t.title + ' was deleted – Zamane');
    Z.afterRender();
    if (!dialogQuery()) Z.focus(byId('td-gone'));
    Z.announce(head);
  }
  var GONE_ACT = { 'entry-deleted': ['entry', 'tick'], 'place-deleted': ['place', 'schedule', 'inplan'], 'item-deleted': ['item', 'itick'] };
  function onChange(d) {
    if (!S || d.tripId !== S.id) return;
    if (d.type === 'trip-deleted') { if (d.source === 'partner' && inView()) gone(d); return; }
    if (!inView() || (S.mode !== 'ready' && S.mode !== 'partial')) return;
    var t = trip(); if (!t) return;
    var partner = d.source === 'partner';
    // Focus on a row that's going: the next row, else the previous one, else the panel heading (ia §6.3).
    var refocus = null, a = document.activeElement, acts = GONE_ACT[d.type];
    if (acts && a && a.dataset && acts.indexOf(a.dataset.act) > -1) {
      var goneId = (d.entry || d.place || d.item).id;
      if (a.dataset.id === goneId) {
        var main = acts[0], list = Array.prototype.slice.call(S.root.querySelectorAll('[data-act="' + main + '"]')).map(function (x) { return x.dataset.id; });
        var i = list.indexOf(goneId);
        refocus = { act: main, id: list[i + 1] || list[i - 1] || null, tab: d.type === 'entry-deleted' ? 'plan' : d.type === 'place-deleted' ? 'places' : 'prep' };
      }
    }
    if (d.type === 'item-added' && !partner && S.adding && S.adding.group !== d.item.group) S.adding = null;
    var skipPlan = !!(S.leaving && d.type === 'entry-done' && d.entry.id === S.leaving && !partner);
    keepScroll(function () { Z.keepFocus(S.root, function () { render({ skipPlan: skipPlan }); }); });
    if (refocus) Z.focus((refocus.id && q('[data-act="' + refocus.act + '"][data-id="' + refocus.id + '"]')) || byId('td-h-' + refocus.tab));
    if (partner) { var m = liveMessage(d, t); if (m) Z.announce(m); }
  }
  function onConnection() { if (inView()) Z.keepFocus(S.root, function () { render(); }); }
  function onMedia() { if (inView()) Z.keepFocus(S.root, function () { render(); }); }
  // Time passing: Now/Next, the status and the day list update in place, unannounced (ia D15).
  function onClock() {
    var t = trip(); if (!t || !inView() || S.mode !== 'ready' || S.leaving) return;
    if (signature(t) !== S.sig) Z.keepFocus(S.root, function () { render(); });
  }
  function onVisible() { if (document.visibilityState === 'visible') onClock(); }

  // ---------- events ----------
  function onClick(ev) {
    var b = ev.target.closest('[role="tab"], [data-act]');
    if (!b || !S || !S.root.contains(b)) return;
    if (b.getAttribute('role') === 'tab') { selectTab(b.id.replace('td-tab-', ''), { user: true }); return; }
    var id = b.dataset.id;
    switch (b.dataset.act) {
      case 'new-entry': Z.go(Z.withQuery({ entry: 'new' })); break;
      case 'new-place': Z.go(Z.withQuery({ place: 'new' })); break;
      case 'day-add': Z.go(Z.withQuery({ entry: 'new', date: id })); break;
      case 'tick': tickEntry(b); break;
      case 'itick': tickItem(b); break;
      case 'entry': Z.dialogs.entrySheet(id); break;
      case 'place': Z.dialogs.placeSheet(id); break;
      case 'item': Z.dialogs.itemSheet(id); break;
      case 'schedule':
        if (b.getAttribute('aria-disabled') === 'true') { var w = byId('why-sched-' + id); pressDisabled('sched-' + id, w ? w.textContent : '', function () { byId('td-panel-places').innerHTML = placesHTML(trip()); applyTabs(); after(); }); }
        else Z.go(Z.withQuery({ schedule: id }));
        break;
      case 'inplan': ev.preventDefault(); var p = Z.place(id), e = p && Z.entryOf(p); if (e) showEntry(e.id); break;
      case 'left': ev.preventDefault(); reveal(id); break;
      case 'notes': toggleNotes(b); break;
      case 'budget': toggleBudget(b); break;
      case 'earlier': toggleEarlier(b); break;
      case 'add-open': openAdd(id); break;
      case 'add-submit':
        if (b.getAttribute('aria-disabled') === 'true') { Z.announce('Adding to the checklist needs a connection.'); return; }
        submitAdd(id); break;
      case 'add-close': closeAdd(true); break;
      case 'reorder': toggleReorder(b); break;
      case 'up': move(b, -1); break;
      case 'down': move(b, 1); break;
      case 'retry': retry(b); break;
      case 'jump':
        var sel = byId('pl-jump'), iso = sel && sel.value, t = trip();
        if (iso && kindOf(t) === 'now' && iso < Z.today() && !S.earlierOpen) { S.earlierOpen = true; byId('td-panel-plan').innerHTML = planHTML(t); applyTabs(); }
        var h = byId('pl-day-' + iso); if (h) { h.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); Z.focus(h); }
        break;
    }
  }
  function onKey(ev) {
    var tab = ev.target.closest && ev.target.closest('[role="tab"]');
    if (tab) {
      var i = TABS.indexOf(tab.id.replace('td-tab-', '')), n = null, rtl = getComputedStyle(tab).direction === 'rtl';
      if (ev.key === 'ArrowRight') n = rtl ? i - 1 : i + 1;
      else if (ev.key === 'ArrowLeft') n = rtl ? i + 1 : i - 1;
      else if (ev.key === 'Home') n = 0;
      else if (ev.key === 'End') n = TABS.length - 1;
      if (n === null) return;
      ev.preventDefault();
      selectTab(TABS[(n + TABS.length) % TABS.length], { focus: true, user: true });
      return;
    }
    var input = ev.target.closest && ev.target.closest('.pr-field input');
    if (input && S.adding) {
      if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); submitAdd(S.adding.group); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeAdd(true); }
    }
  }
  function onInput(ev) { if (S.adding && ev.target.id === 'pr-in-' + S.adding.group) S.adding.value = ev.target.value; }
  // Leaving an empty field closes it (ia D9); with text, it stays open.
  function onFocusOut(ev) {
    var field = ev.target.closest && ev.target.closest('.pr-field');
    if (!field || !S.adding) return;
    setTimeout(function () {
      if (!S || !S.adding || !inView()) return;
      var f = q('.pr-field'), a = document.activeElement;
      if (f && f.contains(a)) return;
      if (!(S.adding.value || '').trim()) Z.keepFocus(S.root, function () { S.adding = null; renderPrep(); });
    }, 0);
  }

  // ---------- loading, error, not found ----------
  function fillRegion(sel, text) { later(function () { var el = S.root.querySelector(sel); if (el) el.textContent = text; }, 50); }
  function renderLoading() {
    var t = Z.trip(S.id), photo = t && t.cover && Z.uploadsEnabled;
    S.root.innerHTML = '<div class="td td--loading" aria-busy="true"><section class="td-sum" aria-label="Summary">' +
      '<div class="td-top">' + topHTML(null) + '</div>' +
      '<div class="td-door" aria-hidden="true"><div class="door door--detail td-sk-door' + (photo ? ' has-photo' : '') + '"></div></div>' +
      '<div class="td-id"><h1 class="vh" tabindex="-1">Loading trip</h1><span class="sk td-sk-title" aria-hidden="true"></span><span class="sk td-sk-line" aria-hidden="true"></span></div>' +
      '<div class="td-when" aria-hidden="true"><span class="sk td-sk-band"></span></div>' +
      '<div class="td-bud" aria-hidden="true"><span class="sk td-sk-line"></span><span class="sk td-sk-bar"></span></div></section>' +
      '<div class="td-panels">' + skRowsHTML(4) + '</div><p class="vh" role="status" id="td-status"></p></div>';
    fillRegion('#td-status', 'Loading trip');
    Z.setFab(false); Z.title('Loading – Zamane');
  }
  function renderError() {
    S.root.innerHTML = '<div class="td td--state"><div class="td-top">' + topHTML(null) + '</div><div class="td-state"><h1 class="title-lg" tabindex="-1">This trip didn\'t load</h1>' +
      '<p>Check your connection and try again.</p><button class="btn-primary" type="button" data-act="retry" data-id="page">' + Z.svg('refresh') + 'Try again</button>' +
      '<p class="vh" role="alert" id="td-alert"></p></div></div>';
    fillRegion('#td-alert', 'This trip didn\'t load. Try again.');
    Z.setFab(false); Z.title('Can\'t load trip – Zamane');
  }
  function renderNotFound() {
    S.root.innerHTML = '<div class="td td--state"><div class="td-state"><h1 class="title-lg" tabindex="-1">This trip isn\'t here any more</h1>' +
      '<p>It may have been deleted.</p><a class="btn-primary" href="#/trips">Back to Trips</a></div></div>';
    Z.setFab(false); Z.title('Trip not found – Zamane');
  }

  // ---------- fixtures (ia.md §8): one ?state= per URL ----------
  function setTabFromFixture(r, tab) {
    if (r.query.view) return;
    S.tab = tab;
    r.query.view = tab;
    history.replaceState(history.state, '', location.pathname + location.search + hash('view=' + tab));
  }
  // Review aid: bring the fixture's Prep group into view (instant; nothing animates on load).
  function showGroup(g) { later(function () { var el = S && q('.pr-group[data-group="' + g + '"]'); if (el) el.scrollIntoView({ block: 'start' }); }, 0); }
  function firstUndone(t) {
    var n = nowNext(t); if (n.now) return n.now;
    var d = Z.days(t), all = [].concat.apply([], d.days.map(function (x) { return x.entries; })).concat(d.outside, d.unscheduled);
    return all.filter(function (e) { return !e.doneAt; })[0] || null;
  }
  function runFixture(fx, t) {
    switch (fx) {
      case 'adding-item': openAdd(Z.prep(t)[0].group); showGroup('packing'); break;
      case 'reorder': showGroup('packing'); break;
      case 'tick-queued': var e = firstUndone(t); if (e) Z.setEntryDone(e.id, true, { pending: true }); break;
      case 'sync-rejected':
        var x = Z.entry('tram-28') && t.id === 'lisbon' ? Z.entry('tram-28') : firstUndone(t);
        if (!x) break;
        Z.setEntryDone(x.id, true, { pending: true });
        later(function () {
          // Replay: the entry was deleted meanwhile, so the queued tick is rejected; the row goes (ia F5).
          Z.data.entries = Z.data.entries.filter(function (y) { return y.id !== x.id; });
          Z.setOffline(false, { silent: true });
          Z.toast({ msg: 'Couldn\'t tick ' + x.title + '. It was deleted.' });
        }, 1200);
        break;
      case 'live-tick':
        var it = Z.items(t.id).filter(function (i) { return i.title === 'Phone chargers' && !i.doneAt; })[0] || Z.items(t.id).filter(function (i) { return !i.doneAt; })[0];
        if (it) later(function () { Z.partner.setItemDone(it.id, true); }, 300);
        break;
      case 'live-place': later(function () { Z.partner.addPlace(t.id, { type: 'food', title: 'Café with a view', area: '', estimate: 60 }); }, 300); break;
      case 'live-entry':
        var date = t.start ? (t.id === 'chefchaouen' ? '2026-11-22' : Z.addDays(t.start, Math.min(1, Z.dayDiff(t.start, t.end)))) : null;
        later(function () { Z.partner.addEntry(t.id, { type: 'food', title: 'Breakfast on the roof', date: date, start: '09:00' }); }, 300);
        break;
      case 'live-dates':
        if (t.start) later(function () { Z.partner.updateTrip(t.id, { start: Z.addDays(t.start, 1), end: Z.addDays(t.end, 1) }); }, 300);
        break;
      case 'live-deleted': later(function () { Z.partner.deleteTrip(t.id); }, 300); break;
    }
  }

  // ---------- lifecycle ----------
  function teardown() {
    if (!S) return;
    S.timers.forEach(clearTimeout);
    clearInterval(S.clock);
    S.root.removeEventListener('click', onClick);
    S.root.removeEventListener('keydown', onKey);
    S.root.removeEventListener('input', onInput);
    S.root.removeEventListener('focusout', onFocusOut);
    document.removeEventListener('visibilitychange', onVisible);
    Z.off('change', onChange);
    Z.off('connection', onConnection);
    [phoneMQ, wideMQ].forEach(function (m) { if (m.removeEventListener) m.removeEventListener('change', onMedia); });
    if (S.ro) S.ro.disconnect();
    S = null;
  }
  function mount(root, r) {
    teardown();
    var fx = Z.fixture('detail');
    S = { id: r.id, root: root, el: null, mode: 'ready', tab: TABS.indexOf(r.query.view) > -1 ? r.query.view : 'plan',
      budgetOpen: load(BUDGET_KEY) === '1', fixtureBudget: false, notesOpen: false, earlierOpen: false,
      adding: null, reorder: null, lastMoved: null, reasons: {}, failed: {}, pgroup: {}, porder: [], leaving: null, sig: '', timers: [], clock: null, ro: null };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    root.addEventListener('input', onInput);
    root.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisible);
    Z.on('change', onChange);
    Z.on('connection', onConnection);
    [phoneMQ, wideMQ].forEach(function (m) { if (m.addEventListener) m.addEventListener('change', onMedia); });
    var t = Z.trip(r.id);

    if (fx === 'loading') { S.mode = 'loading'; renderLoading(); return; }
    if (fx === 'error') { S.mode = 'error'; renderError(); return; }
    if (fx === 'not-found' || !t) { S.mode = 'notfound'; renderNotFound(); return; }
    if (fx === 'partial') S.mode = 'partial';
    if (fx === 'not-cached') { S.mode = 'notcached'; Z.setOffline(true, { silent: true }); }
    if (fx === 'section-error') S.failed = { plan: true, budget: true };
    if (fx === 'places' || fx === 'live-place') setTabFromFixture(r, 'places');
    if (fx === 'prep' || fx === 'adding-item' || fx === 'reorder' || fx === 'live-tick') setTabFromFixture(r, 'prep');
    if (fx === 'budget-open') { S.budgetOpen = true; S.fixtureBudget = true; }
    if (fx === 'reorder') S.reorder = 'packing';
    if (fx === 'tick-queued' || fx === 'sync-rejected') Z.setOffline(true, { silent: true });

    build();
    if (window.ResizeObserver) { S.ro = new ResizeObserver(function () { requestAnimationFrame(measure); }); S.ro.observe(S.el); }
    S.clock = setInterval(onClock, 30000);
    Z.dialogs.fromRoute(r);
    runFixture(fx, t);
    if (fx === 'adding-item') return 'focus-handled';
    // ia 6.3: back from this trip's Edit (Save or Cancel), focus returns to Edit.
    var p = Z.prevRoute;
    if (p && p.view === 'form' && p.mode === 'edit' && p.id === r.id && !dialogQuery()) { Z.focus(byId('td-edit')); return 'focus-handled'; }
  }
  function update(r) {
    if (!S) return false;
    if (inView()) {
      var v = r.query.view;
      if (TABS.indexOf(v) > -1 && v !== S.tab) selectTab(v, { fromRoute: true });
    }
    Z.dialogs.fromRoute(r);
    if (!dialogQuery() && inView()) setTitle(trip());
    return true;
  }

  Z.view('detail', { mount: mount, update: update, unmount: teardown });

  // For dialogs.js ("Show in the plan", "From Places", focus after a save): select the tab and focus the target.
  Z.detail = {
    select: function (tab) { if (inView()) selectTab(tab, {}); },
    showEntry: showEntry,
    showPlace: function (id) { if (inView()) reveal('places', q('[data-act="place"][data-id="' + id + '"]')); },
    showItem: function (id) { if (inView()) reveal('prep', q('[data-act="item"][data-id="' + id + '"]')); }
  };
})();
