/* Goal detail view (#/goals/:id), direction B · Doorway. Owned by the detail builder.
   - Summary: the doorway, the title, progress, "Who put in what" and Stats (a disclosure below 64rem,
     a line from 64rem). The floating primary sits in the DOM right after the progress block.
   - Feeds: History and Journal as tabs below 64rem (?view=, replaced) and side by side from 64rem.
   - Dialogs: the entry sheet, its delete confirmation (Z.confirm) and the photo viewer.
   - Live updates from Z.on('change'), and every detail fixture in ia.md §8 except composer-*.
   The note composer is someone else's: it is driven only by ?note= in the hash and Z.composer.sync(route).
   Hooks for it: note headings are #note-<id>-h (tabindex -1); Edit buttons are [data-act="edit-note"][data-id];
   the journal's own "Write a note" is [data-act="write"]. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var EXAMPLE = 'Example data. The contributions, notes, photos and stats on this screen are made up.';
  var HISTORY_PAGE = 30, NOTES_PAGE = 10, STATS_KEY = 'zamane.goals.statsOpen';
  // Example note text for the live-note fixture (labelled by the footnote, like every other note).
  var LIVE_NOTE = 'Put a little aside after the market today. Small amounts add up.';
  var wide = window.matchMedia('(min-width: 64rem)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var S = null;               // the mounted view's state
  var entryDlg = null, viewerDlg = null;

  // ---------- small helpers ----------
  var esc = Z.esc;
  function isMoney(g) { return g.kind === 'money'; }
  function count(n, one, other) { return n + ' ' + Z.plural(n, one, other); }
  function goal() { return S && Z.goal(S.id); }
  function hash(q) { return '#/goals/' + S.id + (q ? '?' + q : ''); }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: not remembered */ } }
  function later(fn, t) { var id = setTimeout(fn, t); S.timers.push(id); return id; }
  function token(name) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return (parseFloat(v) || 0) * (/ms$/.test(v) ? 1 : 1000); }
  function startOfDay(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  // entry.datetime wants the full year: "Sat 7 Nov 2026 at 14:32".
  function fullDay(d) { d = new Date(d); var s = Z.day(d); return d.getFullYear() === Z.now().getFullYear() ? s + ' ' + d.getFullYear() : s; }
  function rowWhen(e) { return Z.ago(e.at) === 'just now' ? 'just now' : Z.day(e.at); }
  function entry(id) { return Z.data.entries.filter(function (e) { return e.id === id; })[0] || null; }
  function note(id) { return Z.data.notes.filter(function (n) { return n.id === id; })[0] || null; }
  function inView() { return S && S.el && S.root.contains(S.el); }
  function syncComposer(r) { if (Z.composer && Z.composer.sync) Z.composer.sync(r); }
  function composerOpen() { return !!(Z.route && Z.route.query && Z.route.query.note); }

  // ---------- chrome ----------
  function backHTML() {
    return '<a class="gd-back" href="#/goals" aria-label="Back to all goals">' + Z.svg('chevronLeft') + '<span>Goals</span></a>';
  }
  function setTitle(g) {
    if (composerOpen()) return; // the composer owns the title while it's open
    Z.title(g.title + (Z.offline ? ' (offline)' : '') + ' – Zamane');
  }

  // ---------- summary ----------
  function idHTML(g) {
    var done = Z.isDone(g), meta = '';
    if (done && g.completedAt) {
      meta = '<p class="gd-reached">' + Z.svg('check') + '<span>Reached ' + Z.day(g.completedAt) + ' · ' + esc(Z.name(g.completedBy)) + '</span></p>';
    } else if (g.targetDate) {
      var past = startOfDay(g.targetDate) < startOfDay(Z.now());
      meta = '<p class="gd-meta">' + (past ? 'Target date was ' : 'by ') + Z.day(g.targetDate) + '</p>';
    }
    var desc = '';
    if (g.description) {
      desc = '<div class="gd-descrow"><p class="gd-desc' + (S.descOpen ? ' is-open' : '') + '" id="gd-desc" dir="auto">' + esc(g.description) + '</p>' +
        '<button class="gd-more" type="button" data-act="desc" aria-expanded="' + S.descOpen + '" aria-controls="gd-desc" aria-describedby="gd-more-why"' + (S.descOpen ? '' : ' hidden') + '>' +
        (S.descOpen ? 'Less' : 'More') + '</button><span id="gd-more-why" hidden>' + (S.descOpen ? 'Show less of the description' : 'Show the full description') + '</span></div>';
    }
    return '<div class="gd-titlerow"><h1 class="display gd-title" id="gd-title" tabindex="-1" dir="auto">' + esc(g.title) + '</h1>' +
      (done ? '<span class="badge badge-done">' + Z.svg('check') + 'Done</span>' : '') + '</div>' + meta + desc;
  }

  function progressHTML(g, from) {
    var money = isMoney(g), p = Z.progress(g), pct = Z.pct(g), done = Z.isDone(g), last = Z.lastEntry(g);
    var figure, second = '';
    if (money) {
      figure = Z.mad(p);
      if (p > g.target) second = 'of ' + Z.mad(g.target) + ' · ' + Z.mad(p - g.target) + ' over';
      else if (done) second = 'of ' + Z.mad(g.target);
      else second = 'of ' + Z.mad(g.target) + ' · ' + Z.mad(g.target - p) + ' to go';
      second = esc(second);
    } else {
      figure = p + '%';
      if (last) second = Z.av(last.by, 'sm') + '<span>' + esc(Z.name(last.by)) + ' moved it to ' + last.percent + '% · ' + (last.pending ? 'waiting to sync' : Z.ago(last.at)) + '</span>';
    }
    // a11y round 1: the bar's name is the goal; its value is aria-valuetext (no repeat).
    var label = g.title;
    var end = money && !done ? '<span class="gd-pct num" aria-hidden="true">' + pct + '%</span>' : '';
    var ghost = done ? '<button class="btn-ghost gd-ghost" type="button" data-act="add"' + (money ? ' aria-label="' + esc('Add more to ' + g.title) + '"' : '') + '>' +
      Z.svg('plus') + (money ? 'Add more' : 'Update progress') + '</button>' : '';
    return '<h2 class="vh">Progress</h2><p class="numeral gd-figure" dir="ltr">' + figure + '</p>' +
      (second ? '<p class="gd-second">' + second + '</p>' : '') +
      '<div class="gd-barline">' + Z.bar(g, { label: label, from: from }) + end + '</div>' + ghost;
  }

  function shareHTML(g) {
    var money = isMoney(g), es = Z.entries(g.id);
    // Critic F10: with no entries the section goes; History's empty state says it once.
    if (!es.length) return '';
    var h = '<h2 class="gd-sec-h">' + (money ? 'Who put in what' : 'Who updated it') + '</h2>';
    var cells = Z.shares(g).map(function (s) {
      var fig = money
        ? '<span class="gd-cell-amt num" dir="ltr">' + Z.mad(s.amount) + '</span><span class="gd-cell-pct num"> · ' + s.pct + '%</span>'
        : '<span class="gd-cell-amt">' + count(s.count, 'update', 'updates') + '</span>';
      var lbl = money ? s.name + ': ' + Z.mad(s.amount) + ', ' + s.pct + '% of the total' : s.name + ': ' + count(s.count, 'update', 'updates');
      return '<li><span class="gd-cell-vis" aria-hidden="true">' + Z.av(s.id, 'lg') + '<span class="gd-cell-text"><span class="gd-cell-name">' + esc(s.name) + '</span>' +
        '<span class="gd-cell-fig">' + fig + '</span></span></span><span class="vh">' + esc(lbl) + '</span></li>';
    }).join('');
    return h + '<ul class="gd-cells" role="list">' + cells + '</ul>' + (Z.solo ? '<p class="gd-solo">Your partner hasn\'t joined yet.</p>' : '');
  }

  function statsHTML(g) {
    if (!Z.entries(g.id).length) return ''; // "No contributions yet" replaces share and stats
    var st = Z.stats(g), money = isMoney(g), rows, line;
    var last = st.last ? esc(Z.name(st.last.by)) + ', ' + Z.day(st.last.at) : '';
    if (money) {
      rows = [['Contributions', st.count], ['Average', Z.mad(st.average)], ['Largest', Z.mad(st.largest)], ['This month', Z.mad(st.thisMonth)], ['Last activity', last]];
      line = count(st.count, 'contribution', 'contributions') + ' · average ' + Z.mad(st.average) + ' · largest ' + Z.mad(st.largest) +
        ' · this month ' + Z.mad(st.thisMonth) + ' · last activity ' + last;
    } else {
      var month = st.monthTo != null ? st.monthFrom + '% → ' + st.monthTo + '%' : 'No updates this month';
      rows = [['Updates', st.count], ['This month', month], ['Last activity', last]];
      line = count(st.count, 'update', 'updates') + (st.monthTo != null ? ' · this month ' + month : '') + ' · last activity ' + last;
    }
    return '<h2 class="gd-stats-h"><button class="gd-stats-btn" type="button" data-act="stats" aria-expanded="' + S.statsOpen + '" aria-controls="gd-stats-panel">Stats' +
      Z.svg('chevronDown') + '</button><span class="gd-stats-label">Stats</span></h2>' +
      '<dl class="gd-dl" id="gd-stats-panel"' + (S.statsOpen ? '' : ' hidden') + '>' +
      rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd class="num">' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="gd-stats-line">' + line + '</p>';
  }

  function skShareHTML() {
    return '<div aria-hidden="true"><span class="sk gd-sk-lbl"></span><span class="gd-sk-cells"><span class="sk gd-sk-cell"></span><span class="sk gd-sk-cell"></span></span></div>';
  }

  // ---------- the primary (D4) ----------
  function primarySpec(g) {
    if (Z.isDone(g)) return { act: 'write', icon: 'note', text: 'Write a note' };
    return { act: 'add', icon: 'plus', text: isMoney(g) ? 'Add to this goal' : 'Update progress' };
  }
  // Changed in place, so focus stays on it when the label changes (partner-completes).
  function renderPrimary(g) {
    var b = document.getElementById('primary'); if (!b) return;
    var p = primarySpec(g);
    if (b.dataset.act !== p.act || b.dataset.text !== p.text) { b.dataset.act = p.act; b.dataset.text = p.text; b.innerHTML = Z.svg(p.icon) + p.text; }
  }

  // ---------- feeds ----------
  // A "0" badge encodes nothing (critic polish): empty feeds show no count.
  function badge(n) { return n ? '<span class="gd-count num">' + n + '</span>' : ''; }
  function tabsHTML(g) {
    var partial = S.mode === 'partial';
    return ['history', 'journal'].map(function (t) {
      var n = t === 'history' ? Z.entries(g.id).length : Z.notes(g.id).length, lbl = null;
      if (!partial) {
        lbl = t === 'journal' ? 'Journal, ' + count(n, 'note', 'notes')
          : 'History, ' + (isMoney(g) ? count(n, 'contribution', 'contributions') : count(n, 'update', 'updates'));
      }
      return '<button class="gd-tab" type="button" role="tab" id="gd-tab-' + t + '" aria-controls="gd-panel-' + t + '"' + (lbl ? ' aria-label="' + esc(lbl) + '"' : '') + '>' +
        '<span class="gd-tab-text">' + (t === 'history' ? 'History' : 'Journal') + '</span>' + (partial || !n ? '' : '<span class="gd-count num" aria-hidden="true">' + n + '</span>') + '</button>';
    }).join('');
  }

  function rowHTML(e, g) {
    var name = Z.name(e.by), when = rowWhen(e), what, label;
    // a11y round 1: the name follows the visible order: what, when, then the note.
    if (isMoney(g)) {
      what = esc(name) + ' added <b class="num" dir="ltr">' + Z.mad(e.amount) + '</b>';
      label = name + ' added ' + Z.mad(e.amount) + ', ' + when + (e.note ? ', ' + e.note : '');
    } else {
      what = esc(name) + ' moved it to <b class="num">' + e.percent + '%</b>';
      label = name + ' moved it to ' + e.percent + '%, ' + when;
    }
    var sub = '';
    if (e.pending) sub = '<span class="gd-row-pending" id="gd-pend-' + e.id + '">' + Z.svg('cloudOff') + 'Waiting to sync</span>';
    else if (e.note) sub = '<span class="gd-row-sub" dir="auto">' + esc(e.note) + '</span>';
    return '<li data-key="' + e.id + '"><button class="gd-row" type="button" data-act="entry" data-id="' + e.id + '" aria-label="' + esc(label) + '"' +
      (e.pending ? ' aria-describedby="gd-pend-' + e.id + '"' : '') + '>' + Z.av(e.by, 'sm') +
      '<span class="gd-row-what">' + what + '</span><span class="gd-row-when">' + when + '</span>' + sub + '</button></li>';
  }

  function historyHTML(g) {
    var es = Z.entries(g.id), money = isMoney(g);
    var h = '<h2 class="gd-feed-h" id="gd-h-history" tabindex="-1">History' + badge(es.length) + '</h2>';
    S.rowOrder = [];
    if (!es.length) {
      return h + '<p class="gd-empty">' + (money ? 'No contributions yet. Add the first one with Add to this goal.' : 'No updates yet. Add the first one with Update progress.') + '</p>';
    }
    // Month totals come from every entry in the month, not only the loaded page.
    var totals = {};
    es.forEach(function (e) { var k = Z.monthKey(e.at); totals[k] = (totals[k] || 0) + (e.amount || 0); });
    var out = '', cur = null;
    es.slice(0, S.histLimit).forEach(function (e) {
      var k = Z.monthKey(e.at);
      if (k !== cur) {
        if (cur !== null) out += '</ul></div>';
        cur = k;
        out += '<div class="gd-group"><h3 class="gd-month"><span>' + Z.month(e.at) + '</span>' +
          (money ? '<span class="vh"> · </span><span class="num gd-month-total" dir="ltr">' + Z.mad(totals[k]) + '</span>' : '') + '</h3><ul class="gd-rows" role="list">';
      }
      out += rowHTML(e, g);
      S.rowOrder.push(e.id);
    });
    out += '</ul></div>';
    if (es.length > S.histLimit) out += '<button class="btn-sec gd-older" type="button" data-act="more-history" aria-label="Show older contributions">Show older</button>';
    return h + out;
  }

  function photoHTML(n, b, i, name, date) {
    if (!Z.uploadsEnabled) return '<div class="gd-photo-off arch">' + Z.svg('image') + '<span>Photo unavailable</span></div>';
    // Offline, an uncached photo can't be shown. The example photo stands in for one that was never cached.
    if (Z.offline && !b.url) return '<div class="gd-photo-off arch">' + Z.svg('cloudOff') + '<span>Photo not available offline</span></div>';
    var alt = b.alt || 'Photo from a note by ' + name + ', ' + date, did = 'gd-ph-' + n.id + '-' + i;
    var inner = b.url ? '<img src="' + esc(b.url) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="photo-example" aria-hidden="true">' + Z.svg('image') + '<span>Example photo</span></span>';
    // The description lives inside the button, so the next text block keeps its space-4 gap (critic polish).
    return '<button class="gd-photo arch" type="button" data-act="photo" data-id="' + n.id + '" data-block="' + i + '" aria-label="View photo" aria-describedby="' + did + '">' +
      inner + '<span hidden id="' + did + '">' + esc(alt) + '</span></button>';
  }

  function noteHTML(n) {
    var name = Z.name(n.by), date = Z.day(n.at), mine = n.by === Z.me, open = !!S.openNotes[n.id];
    var body = n.blocks.map(function (b, i) {
      return b.type === 'text' ? '<p class="gd-text" dir="auto">' + esc(b.text) + '</p>' : photoHTML(n, b, i, name, date);
    }).join('');
    return '<article class="gd-note' + (open ? ' is-open' : '') + '" data-key="' + n.id + '" aria-labelledby="note-' + n.id + '-h">' +
      '<header class="gd-note-head">' + Z.av(n.by, 'md') +
      '<h3 class="gd-note-h" id="note-' + n.id + '-h" tabindex="-1">' + esc(name) + '<span class="gd-note-date"> · ' + date + '</span></h3>' +
      (mine ? '<button class="btn-ghost btn-sm gd-note-edit" type="button" data-act="edit-note" data-id="' + n.id + '" aria-label="Edit your note from ' + date + '">' + Z.svg('pencil') + 'Edit</button>' : '') +
      '</header><div class="gd-note-body" id="note-' + n.id + '-body">' + body + '</div>' +
      '<button class="link-btn gd-readmore" type="button" data-act="readmore" data-id="' + n.id + '" aria-expanded="' + open + '" aria-controls="note-' + n.id + '-body"' + (open ? '' : ' hidden') + '>' +
      (open ? 'Show less' : 'Read more') + '</button></article>';
  }

  function journalHTML(g) {
    var ns = Z.notes(g.id), done = Z.isDone(g);
    var write = '<button class="btn-sec gd-write" type="button" data-act="write"' + (Z.offline ? ' aria-describedby="gd-write-help"' : '') + '>' + Z.svg('note') + 'Write a note</button>';
    var help = Z.offline ? '<p class="help gd-write-help" id="gd-write-help">You\'re offline. You can write a note now and save it when you\'re back online.</p>' : '';
    var h2 = '<h2 class="gd-feed-h" id="gd-h-journal" tabindex="-1">Journal' + badge(ns.length) + '</h2>';
    // On a done goal the primary is "Write a note", so the journal's own button hides (D4).
    if (!ns.length) {
      return '<div class="gd-journal-head">' + h2 + '</div><div class="gd-empty-j"><p class="gd-empty">' +
        (Z.uploadsEnabled ? 'No notes yet. Write about this goal, or add a photo.' : 'No notes yet. Write the first one.') + '</p>' + (done ? '' : write + help) + '</div>';
    }
    var out = ns.slice(0, S.notesLimit).map(noteHTML).join('');
    if (ns.length > S.notesLimit) out += '<button class="btn-sec gd-older" type="button" data-act="more-notes">Show older notes</button>';
    return '<div class="gd-journal-head">' + h2 + (done ? '' : write) + '</div>' + (done ? '' : help) + '<div class="gd-notes">' + out + '</div>';
  }

  function skRowsHTML(n) {
    var s = '<span class="gd-sk-rows" aria-hidden="true">';
    for (var i = 0; i < n; i++) s += '<span class="sk gd-sk-row"></span>';
    return s + '</span>';
  }

  // ---------- render ----------
  function shellHTML(g) {
    return '<div class="gd">' + backHTML() + '<div class="gd-notice" id="gd-notice"></div>' +
      '<div class="gd-mast"><div class="gd-door" id="gd-door"></div><div class="gd-facts">' +
      '<a class="btn-sec btn-sm gd-edit" id="gd-edit" href="#/goals/' + encodeURIComponent(g.id) + '/edit">Edit</a>' +
      '<div class="gd-id" id="gd-id"></div><section class="gd-progress" id="gd-progress"></section>' +
      '<div class="dock"><button class="btn-primary" type="button" id="primary"></button></div>' +
      '<section class="gd-share" id="gd-share"></section><section class="gd-stats" id="gd-stats"></section></div></div>' +
      '<div class="gd-feeds" id="gd-feeds"><div class="gd-tabs" role="tablist" aria-label="History and journal" id="gd-tabs"></div>' +
      '<section class="gd-panel" id="gd-panel-history"></section><section class="gd-panel" id="gd-panel-journal"></section></div></div>';
  }

  function renderNotice() {
    $('#gd-notice').innerHTML = Z.offline ? '<p class="notice">' + Z.svg('cloudOff') + '<span>' +
      '<span class="gd-notice-line">You\'re offline. Showing the latest data on this phone. Adding to goals still works and syncs when you\'re back online.</span>' +
      '<span class="gd-notice-line">Editing, deleting and saving notes need a connection.</span></span></p>' : '';
  }

  // o.from: the previous percentage, to animate the fill (contributions only). o.completed: the orchestrated moment.
  function renderSummary(g, o) {
    var done = Z.isDone(g), turning = !!o.completed && !reduced.matches;
    var pct = Z.pct(g), from = o.from != null && o.from !== pct ? o.from : null;
    var door = $('#gd-door');
    door.innerHTML = Z.doorway(g, 'detail', { closing: !!o.completed });
    door.classList.toggle('is-done', done); // critic F6: the container insets the surround
    $('#gd-id').innerHTML = idHTML(g);
    var pr = $('#gd-progress');
    pr.classList.toggle('is-done', done && !turning);
    pr.innerHTML = progressHTML(g, from);
    // 1. the bar fills in majorelle, 2. it turns zellige while the surround closes (CSS delays it by the fill).
    if (turning) later(function () { if (pr.isConnected && Z.isDone(goal())) pr.classList.add('is-done'); }, from != null ? token('--dur-fill') : 0);
    $('#gd-edit').setAttribute('aria-label', 'Edit ' + g.title);
    $('#gd-share').innerHTML = S.mode === 'partial' ? skShareHTML() : shareHTML(g);
    $('#gd-stats').innerHTML = S.mode === 'partial' ? '' : statsHTML(g);
  }

  function renderFeeds(g) {
    $('#gd-tabs').innerHTML = tabsHTML(g);
    if (S.mode === 'partial') {
      $('#gd-feeds').setAttribute('aria-busy', 'true');
      $('#gd-panel-history').innerHTML = '<h2 class="gd-feed-h" id="gd-h-history" tabindex="-1">History</h2>' + skRowsHTML(4);
      $('#gd-panel-journal').innerHTML = '<div class="gd-journal-head"><h2 class="gd-feed-h" id="gd-h-journal" tabindex="-1">Journal</h2></div>' + skRowsHTML(3);
      return;
    }
    $('#gd-feeds').removeAttribute('aria-busy');
    $('#gd-panel-history').innerHTML = historyHTML(g);
    $('#gd-panel-journal').innerHTML = journalHTML(g);
  }

  function render(o) {
    o = o || {};
    var g = goal();
    renderNotice();
    renderSummary(g, o);
    renderPrimary(g);
    renderFeeds(g);
    applyTabs();
    setTitle(g);
    S.lastPct = Z.pct(g);
    after();
  }

  // Every render ends here: Z.afterRender (bar fills, surround, toast placement), then the clamps.
  function after() {
    Z.afterRender();
    measure();
  }

  function build() {
    var g = goal();
    S.root.innerHTML = shellHTML(g);
    S.el = S.root.querySelector('.gd');
    Z.setFab(true);
    render({});
    Z.footnote(isExample(g) ? EXAMPLE : '');
  }
  // Critic F10: the example-data label only where example data is on screen. A goal made in this
  // session (after page load) is the user's own; the seeded goals are examples or Home's placeholders.
  var LOADED_AT = Z.now();
  function isExample(g) { return g.createdAt < LOADED_AT; }

  // Keep a feed item fixed on screen when rows or notes are inserted above it (partner-add, partner-note).
  function keepScroll(fn) {
    var key = null, top = 0;
    if (window.scrollY > 0) {
      var items = S.root.querySelectorAll('.gd-feeds [data-key]');
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        if (r.height && r.top >= 0) { key = items[i].dataset.key; top = r.top; break; }
      }
    }
    fn();
    if (key) {
      var el = S.root.querySelector('.gd-feeds [data-key="' + key + '"]');
      if (el) { var d = el.getBoundingClientRect().top - top; if (Math.abs(d) > 1) window.scrollBy(0, d); }
    }
  }

  // ---------- clamps: "More" on the description, "Read more" on notes ----------
  function measure() {
    if (!inView()) return;
    var d = document.getElementById('gd-desc'), m = S.root.querySelector('.gd-more');
    if (d && m && !S.descOpen) m.hidden = !(d.scrollHeight > d.clientHeight + 1);
    S.root.querySelectorAll('.gd-note:not(.is-open)').forEach(function (a) {
      if (!a.offsetParent) return; // in a hidden tab panel: measured when it's shown
      var over = Array.prototype.some.call(a.querySelectorAll('.gd-text'), function (p) { return p.scrollHeight > p.clientHeight + 1; });
      a.querySelector('.gd-readmore').hidden = !over;
    });
  }

  // ---------- tabs (< 64rem) / columns (≥ 64rem) ----------
  function applyTabs() {
    if (!inView()) return;
    var narrow = !wide.matches;
    ['history', 'journal'].forEach(function (t) {
      var sel = S.tab === t, tab = document.getElementById('gd-tab-' + t), panel = document.getElementById('gd-panel-' + t);
      if (tab) { tab.setAttribute('aria-selected', String(sel)); tab.tabIndex = sel ? 0 : -1; }
      panel.classList.toggle('is-selected', sel);
      if (narrow) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'gd-tab-' + t); }
      else { panel.removeAttribute('role'); panel.removeAttribute('aria-labelledby'); }
      // A panel with nothing focusable in it gets a Tab stop of its own (ARIA tabs pattern).
      if (narrow && !panel.querySelector('button:not([hidden]), a[href]')) panel.tabIndex = 0; else panel.removeAttribute('tabindex');
    });
  }

  function selectTab(t, o) {
    o = o || {};
    if ((t !== 'history' && t !== 'journal') || !inView()) return;
    var changed = S.tab !== t;
    S.tab = t;
    applyTabs();
    if (o.focus) Z.focus(document.getElementById('gd-tab-' + t));
    // ?view= is replaced, never pushed: Back leaves the page.
    if (!o.fromRoute && (Z.route.query.view !== t)) Z.go(hash('view=' + t), { replace: true });
    if (changed && o.user) {
      var list = document.getElementById('gd-tabs'), min = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      var top = list.getBoundingClientRect().top;
      if (list.offsetParent && top < min) window.scrollTo({ top: window.scrollY + top - min - 8, behavior: reduced.matches ? 'auto' : 'smooth' });
    }
    measure();
  }

  // ---------- note composer (pushes ?note=, keeps the tab) ----------
  function pushNote(x) {
    Z.go(hash((S.tab === 'journal' ? 'view=journal&' : '') + 'note=' + encodeURIComponent(x)));
  }

  // ---------- disclosures and paging ----------
  function toggleStats(b) {
    S.statsOpen = !S.statsOpen;
    if (!S.fixtureStats) save(STATS_KEY, S.statsOpen ? '1' : '0');
    b.setAttribute('aria-expanded', String(S.statsOpen));
    document.getElementById('gd-stats-panel').hidden = !S.statsOpen;
  }
  function toggleDesc(b) {
    S.descOpen = !S.descOpen;
    document.getElementById('gd-desc').classList.toggle('is-open', S.descOpen);
    b.setAttribute('aria-expanded', String(S.descOpen));
    b.textContent = S.descOpen ? 'Less' : 'More';
    document.getElementById('gd-more-why').textContent = S.descOpen ? 'Show less of the description' : 'Show the full description';
    if (!S.descOpen) measure();
  }
  function toggleNote(b) {
    var id = b.dataset.id, open = !S.openNotes[id];
    S.openNotes[id] = open;
    b.closest('.gd-note').classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', String(open));
    b.textContent = open ? 'Show less' : 'Read more';
  }
  function moreHistory() {
    var g = goal(), first = S.histLimit, total = Z.entries(g.id).length;
    S.histLimit += HISTORY_PAGE;
    document.getElementById('gd-panel-history').innerHTML = historyHTML(g);
    applyTabs(); after();
    var row = S.root.querySelector('[data-act="entry"][data-id="' + S.rowOrder[first] + '"]');
    if (row) Z.focus(row);
    Z.announce(Math.min(HISTORY_PAGE, total - first) + ' more loaded.');
  }
  function moreNotes() {
    var g = goal(), ns = Z.notes(g.id), first = S.notesLimit, n = Math.min(NOTES_PAGE, ns.length - first);
    S.notesLimit += NOTES_PAGE;
    document.getElementById('gd-panel-journal').innerHTML = journalHTML(g);
    applyTabs(); after();
    var h = document.getElementById('note-' + ns[first].id + '-h');
    if (h) Z.focus(h);
    Z.announce(n === 1 ? '1 more note loaded.' : n + ' more notes loaded.');
  }
  function focusRowOr(id) {
    var el = id && S.root.querySelector('[data-act="entry"][data-id="' + id + '"]');
    Z.focus(el || document.getElementById('gd-h-history'));
  }

  // ---------- entry sheet (D5, F4) ----------
  function ensureDialogs() {
    if (entryDlg) return;
    entryDlg = document.createElement('dialog');
    entryDlg.className = 'sheet gd-sheet';
    entryDlg.id = 'gd-entry';
    entryDlg.setAttribute('aria-labelledby', 'gd-entry-h');
    document.body.appendChild(entryDlg);
    Z.backdropClose(entryDlg);
    entryDlg.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'close') entryDlg.close();
      else if (b.dataset.act === 'delete') askDelete(b);
    });
    entryDlg.addEventListener('close', function () {
      var s = S && S.entry;
      if (S) S.entry = null;
      if (!s || s.skipReturn || !inView()) return;
      // Back to the row that opened it; if a partner deleted it, the next row (F4 step 4).
      var row = S.root.querySelector('[data-act="entry"][data-id="' + s.id + '"]');
      if (row) Z.focus(row); else focusRowOr(s.fallback);
    });

    viewerDlg = document.createElement('dialog');
    viewerDlg.className = 'gd-viewer';
    viewerDlg.id = 'gd-viewer';
    viewerDlg.setAttribute('aria-label', 'Photo');
    document.body.appendChild(viewerDlg);
    Z.backdropClose(viewerDlg);
    viewerDlg.addEventListener('click', function (ev) { if (ev.target.closest('[data-act="close"]')) viewerDlg.close(); });
    viewerDlg.addEventListener('close', function () {
      var o = viewerDlg.opener; viewerDlg.opener = null;
      if (!o || !inView()) return;
      var el = S.root.querySelector('[data-act="photo"][data-id="' + o.id + '"][data-block="' + o.block + '"]');
      if (el) Z.focus(el);
    });
  }

  function sheetHead(g) {
    return '<div class="sheet-head"><h2 id="gd-entry-h" tabindex="-1">' + (isMoney(g) ? 'Contribution' : 'Update') + '</h2>' +
      '<button class="icon-btn" type="button" data-act="close" aria-label="Close">' + Z.svg('x') + '</button></div>';
  }
  var LIVE = '<p class="vh dlg-live" role="status"></p>';

  function entryHTML(e, g) {
    var money = isMoney(g), name = Z.name(e.by);
    var summary = money ? esc(name) + ' added ' + Z.mad(e.amount) : esc(name) + ' moved it to ' + e.percent + '%';
    var when = e.pending ? '<p class="gd-ent-when">' + Z.svg('cloudOff') + 'Waiting to sync</p>' : '<p class="gd-ent-when">' + fullDay(e.at) + ' at ' + Z.time(e.at) + '</p>';
    var blocked = Z.offline && !e.pending; // a queued entry can still be removed offline (D8)
    var text = e.pending ? 'Remove' : money ? 'Delete contribution' : 'Delete update';
    return sheetHead(g) + '<div class="gd-ent">' + Z.av(e.by, 'lg') + '<div class="gd-ent-text"><p class="title">' + summary + '</p>' + when +
      (e.note ? '<p class="gd-ent-note" dir="auto">' + esc(e.note) + '</p>' : '') + '</div></div>' +
      '<div class="sheet-actions"><button class="btn-danger" type="button" data-act="delete" id="gd-entry-delete"' + (blocked ? ' aria-disabled="true" aria-describedby="gd-entry-why"' : '') + '>' +
      Z.svg('trash') + text + '</button>' + (blocked ? '<p class="help" id="gd-entry-why">Deleting needs a connection.</p>' : '') + '</div>' + LIVE;
  }

  function openEntry(id) {
    var g = goal(), e = entry(id); if (!e || !g) return;
    ensureDialogs();
    S.entry = { id: id, skipReturn: false, fallback: null };
    entryDlg.innerHTML = entryHTML(e, g);
    if (!entryDlg.open) entryDlg.showModal();
    Z.placeSheet(entryDlg);
    Z.focus(document.getElementById('gd-entry-h'));
  }

  // The partner deleted the entry that's open: the body swaps, Close takes focus (F4).
  function entryGone(d, g, order) {
    var i = order.indexOf(d.entry.id);
    S.entry.fallback = order[i + 1] || order[i - 1] || null;
    var c = document.getElementById('confirm');
    if (c && c.open) document.getElementById('confirm-cancel').click();
    entryDlg.innerHTML = sheetHead(g) + '<p class="gd-ent-gone">' + esc(Z.name(d.by)) + ' deleted this ' + (isMoney(g) ? 'contribution' : 'update') + '.</p>' +
      '<div class="sheet-actions"><button class="btn-sec" type="button" data-act="close" id="gd-entry-close">Close</button></div>' + LIVE;
    Z.focus(document.getElementById('gd-entry-close'));
  }

  // What deleting e would leave, for the confirmation's consequence line.
  function afterDelete(g, e) {
    var all = Z.entries(g.id), rest = all.filter(function (x) { return x.id !== e.id; });
    if (isMoney(g)) {
      var saved = rest.reduce(function (s, x) { return s + x.amount; }, 0);
      return { saved: saved, reopens: Z.isDone(g) && saved < g.target };
    }
    var latest = all[0] && all[0].id === e.id, p = rest.length ? rest[0].percent : 0;
    return { latest: latest, percent: latest ? p : Z.progress(g), reopens: Z.isDone(g) && latest && p !== 100 };
  }

  function askDelete(btn) {
    var g = goal(), e = S.entry && entry(S.entry.id); if (!g || !e) return;
    if (btn && btn.getAttribute('aria-disabled') === 'true') { Z.announce('Deleting needs a connection.'); return; }
    var money = isMoney(g), name = Z.name(e.by), o;
    if (e.pending) {
      var partner = Z.name(e.by === 'a' ? 'b' : 'a');
      o = { title: money ? 'Remove this ' + Z.mad(e.amount) + '?' : 'Delete ' + name + '\'s update to ' + e.percent + '%?',
        body: '<p>' + esc('It hasn\'t synced yet, so ' + partner + ' hasn\'t seen it.') + '</p>', confirm: 'Remove', cancel: 'Keep it' };
    } else {
      var a = afterDelete(g, e);
      var line = money ? g.title + ' goes back to ' + Z.mad(a.saved) + ' of ' + Z.mad(g.target) + '.'
        : a.latest ? g.title + ' goes back to ' + a.percent + '%.' : 'Progress stays at ' + a.percent + '%.';
      o = { title: money ? 'Delete ' + name + '\'s ' + Z.mad(e.amount) + '?' : 'Delete ' + name + '\'s update to ' + e.percent + '%?',
        body: '<p>' + esc(line) + '</p>' + (a.reopens ? '<p>' + esc(g.title + ' will no longer be done.') + '</p>' : '') + '<p>You can\'t undo this.</p>',
        confirm: 'Delete', cancel: 'Keep it' };
    }
    // Keep it / Esc: Z.confirm returns focus to "Delete contribution".
    Z.confirm(o).then(function (ok) { if (ok && S && S.entry && S.entry.id === e.id && entry(e.id)) doDelete(e); });
  }

  // Optimistic: both dialogs close, the row goes, the figures update without the fill animation.
  function doDelete(e) {
    var g = goal(), money = isMoney(g), name = Z.name(e.by), title = g.title;
    var order = S.rowOrder.slice(), i = order.indexOf(e.id), next = order[i + 1] || order[i - 1] || null;
    if (S.entry) S.entry.skipReturn = true;
    if (entryDlg && entryDlg.open) entryDlg.close();
    var r = Z.removeEntry(e.id);
    var msg;
    if (e.pending) msg = money ? 'Removed ' + Z.mad(e.amount) + ' from ' + title : title + ' is back to ' + Z.progress(g) + '%';
    else if (money) msg = 'Deleted ' + name + '\'s ' + Z.mad(e.amount) + ' from ' + title + (r.reopened ? '. It\'s open again.' : '');
    else msg = 'Deleted ' + name + '\'s update from ' + title + (r.reopened ? '. It\'s open again.' : '');
    focusRowOr(next);
    Z.toast({ msg: msg });
  }

  // ---------- photo viewer ----------
  function openViewer(b) {
    var n = note(b.dataset.id), blk = n && n.blocks[+b.dataset.block]; if (!blk) return;
    ensureDialogs();
    var alt = blk.alt || 'Photo from a note by ' + Z.name(n.by) + ', ' + Z.day(n.at);
    var pic = blk.url ? '<img src="' + esc(blk.url) + '" alt="' + esc(alt) + '">'
      : '<span class="photo-example" role="img" aria-label="' + esc(alt) + '">' + Z.svg('image') + '<span aria-hidden="true">Example photo</span></span>';
    viewerDlg.innerHTML = '<button class="icon-btn gd-viewer-close" type="button" data-act="close" aria-label="Close">' + Z.svg('x') + '</button>' +
      '<figure class="gd-viewer-fig">' + pic + '</figure>' + LIVE;
    viewerDlg.opener = { id: b.dataset.id, block: b.dataset.block };
    viewerDlg.showModal();
    Z.focus(viewerDlg.querySelector('[data-act="close"]'));
  }

  // ---------- live updates ----------
  function announcePartner(d, g) {
    var name = Z.name(d.by), money = isMoney(g), msg = '';
    if (d.type === 'entry-added') {
      msg = money ? name + ' added ' + Z.mad(d.entry.amount) + ' to ' + g.title + '.' : name + ' moved ' + g.title + ' to ' + d.entry.percent + '%.';
    } else if (d.type === 'entry-removed') {
      msg = name + (money ? ' removed a contribution from ' : ' removed an update from ') + g.title + '.';
    } else if (d.type === 'goal-updated') msg = name + ' edited this goal.';
    else if (d.type === 'note-added') msg = name + ' wrote a note.';
    else if (d.type === 'note-deleted') msg = name + ' deleted a note.';
    if (d.completed) msg += (msg ? ' ' : '') + name + ' reached ' + g.title + '.';
    if (d.reopened) msg += (msg ? ' ' : '') + g.title + ' is open again.';
    if (msg) Z.announce(msg);
  }

  // The partner deleted this goal while I'm on it: the page swaps in place (F1).
  function gone(d) {
    var g = d.goal, name = Z.name(d.by), head = name + ' deleted ' + g.title + '.';
    if (S.entry) S.entry.skipReturn = true;
    if (entryDlg && entryDlg.open) entryDlg.close();
    if (viewerDlg && viewerDlg.open) { viewerDlg.opener = null; viewerDlg.close(); }
    var c = document.getElementById('confirm');
    if (c && c.open) document.getElementById('confirm-cancel').click();
    S.mode = 'deleted'; S.el = null;
    S.root.innerHTML = '<div class="gd gd--state"><div class="gd-state"><h1 class="title-lg" tabindex="-1">' + esc(head) + '</h1>' +
      '<p>Its contributions and notes are gone too.</p><a class="btn-primary" id="gd-gone" href="#/goals">Back to Goals</a></div></div>';
    Z.setFab(false); Z.footnote('');
    if (!composerOpen()) Z.title(g.title + ' was deleted – Zamane');
    Z.afterRender();
    Z.focus(document.getElementById('gd-gone'));
    Z.announce(head);
  }

  function onChange(d) {
    if (!S || d.goalId !== S.id) return;
    if (d.type === 'goal-deleted') { if (d.source === 'partner' && inView()) gone(d); return; }
    if (!inView()) return;
    var g = goal(); if (!g) return;
    var partner = d.source === 'partner';
    // The fill animates only when a contribution lands (mine: Z.animFrom from commitAdd; the partner's: the last shown %).
    var from = Z.animFrom[S.id];
    delete Z.animFrom[S.id];
    if (from == null && d.type === 'entry-added') from = S.lastPct;
    var order = S.rowOrder.slice(), refocus;
    if (d.type === 'entry-removed') {
      var a = document.activeElement;
      if (a && a.dataset && a.dataset.act === 'entry' && a.dataset.id === d.entry.id) {
        var i = order.indexOf(d.entry.id); refocus = order[i + 1] || order[i - 1] || null;
      }
      if (partner && S.entry && S.entry.id === d.entry.id && entryDlg && entryDlg.open) entryGone(d, g, order);
    }
    // My own new note: show it in the journal so the composer can focus its heading (F5 step 3).
    if (d.type === 'note-added' && !partner) S.tab = 'journal';
    keepScroll(function () { Z.keepFocus(S.root, function () { render({ from: from, completed: d.completed }); }); });
    if (refocus !== undefined) focusRowOr(refocus);
    if (partner) announcePartner(d, g);
  }

  // The announcement is the shared layer's single one, using Z.offlineMessage set in mount.
  function onConnection() {
    if (!inView()) return;
    Z.keepFocus(S.root, function () { render({}); });
    if (S.entry && entryDlg && entryDlg.open) {
      var e = entry(S.entry.id), had = entryDlg.contains(document.activeElement) ? document.activeElement.id : null;
      if (e) { entryDlg.innerHTML = entryHTML(e, goal()); if (had && document.getElementById(had)) Z.focus(document.getElementById(had)); }
    }
  }

  function onWide() { if (inView()) { applyTabs(); measure(); } }

  // ---------- events ----------
  function onClick(ev) {
    var b = ev.target.closest('[role="tab"], [data-act]');
    if (!b || !S || !S.root.contains(b)) return;
    if (b.getAttribute('role') === 'tab') { selectTab(b.id.replace('gd-tab-', ''), { user: true }); return; }
    switch (b.dataset.act) {
      case 'add': Z.quickAdd(S.id); break;
      case 'write': pushNote('new'); break;
      case 'edit-note': pushNote(b.dataset.id); break;
      case 'entry': openEntry(b.dataset.id); break;
      case 'photo': openViewer(b); break;
      case 'stats': toggleStats(b); break;
      case 'desc': toggleDesc(b); break;
      case 'readmore': toggleNote(b); break;
      case 'more-history': moreHistory(); break;
      case 'more-notes': moreNotes(); break;
      case 'retry': retry(b); break;
    }
  }
  // ARIA tabs, automatic activation: ←/→ (mirrored in RTL), Home, End.
  function onKey(ev) {
    var tab = ev.target.closest && ev.target.closest('[role="tab"]'); if (!tab) return;
    var order = ['history', 'journal'], i = order.indexOf(tab.id.replace('gd-tab-', '')), n = null;
    var rtl = getComputedStyle(tab).direction === 'rtl';
    if (ev.key === 'ArrowRight') n = rtl ? i - 1 : i + 1;
    else if (ev.key === 'ArrowLeft') n = rtl ? i + 1 : i - 1;
    else if (ev.key === 'Home') n = 0;
    else if (ev.key === 'End') n = order.length - 1;
    if (n === null) return;
    ev.preventDefault();
    selectTab(order[(n + order.length) % order.length], { focus: true, user: true });
  }

  // ---------- loading, error, not found ----------
  // Live regions are inserted empty and filled a frame later, so screen readers notice them (a11y round 1).
  function fillRegion(sel, text) { later(function () { var el = S.root.querySelector(sel); if (el) el.textContent = text; }, 50); }
  function renderLoading() {
    // The skeleton door takes the real door's box (photo or bare), so nothing shifts when it loads (critic F10).
    var g = Z.goal(S.id), photo = g && g.cover && Z.uploadsEnabled;
    S.root.innerHTML = '<div class="gd" aria-busy="true">' + backHTML() + '<div class="gd-mast"><div class="gd-door" aria-hidden="true"><div class="door door--detail gd-sk-door' + (photo ? ' has-photo' : '') + '"></div></div>' +
      '<div class="gd-facts"><div class="gd-id"><h1 class="vh" tabindex="-1">Loading goal</h1><span class="sk gd-sk-title" aria-hidden="true"></span><span class="sk gd-sk-line" aria-hidden="true"></span></div>' +
      '<div class="gd-progress" aria-hidden="true"><span class="sk gd-sk-num"></span><span class="sk gd-sk-line"></span><span class="sk gd-sk-bar"></span></div>' +
      '<div class="gd-share">' + skShareHTML() + '</div></div></div>' +
      '<div class="gd-feeds">' + skRowsHTML(4) + '</div><p class="vh" role="status" id="gd-status"></p></div>';
    fillRegion('#gd-status', 'Loading goal');
    Z.setFab(false); Z.title('Loading – Zamane');
  }
  function renderError() {
    S.root.innerHTML = '<div class="gd gd--state">' + backHTML() + '<div class="gd-state"><h1 class="title-lg" tabindex="-1">This goal didn\'t load</h1>' +
      '<p>Check your connection and try again.</p><button class="btn-primary" type="button" data-act="retry">' + Z.svg('refresh') + 'Try again</button>' +
      '<p class="vh" role="alert" id="gd-alert"></p></div></div>';
    fillRegion('#gd-alert', 'This goal didn\'t load. Try again.');
    Z.setFab(false); Z.title('Can\'t load goal – Zamane');
  }
  function renderNotFound() {
    S.root.innerHTML = '<div class="gd gd--state"><div class="gd-state"><h1 class="title-lg" tabindex="-1">This goal isn\'t here any more</h1>' +
      '<p>It may have been deleted.</p><a class="btn-primary" href="#/goals">Back to Goals</a></div></div>';
    Z.setFab(false); Z.title('Goal not found – Zamane');
  }
  function retry(b) {
    if (b.getAttribute('aria-disabled') === 'true') return;
    b.setAttribute('aria-disabled', 'true');
    b.innerHTML = Z.svg('refresh') + 'Trying again';
    later(function () {
      if (!goal()) { S.mode = 'notfound'; renderNotFound(); Z.afterRender(); Z.focusHeading(); return; }
      S.mode = 'ready'; build(); Z.focusHeading();
    }, 900);
  }

  // ---------- fixtures (ia.md §8): one ?state= per URL ----------
  function nextPct(g) { var p = Z.progress(g); return p >= 100 ? 90 : Math.min(100, p + 10); }
  function runFixture(fx, g) {
    var money = isMoney(g), latest = Z.entries(g.id)[0];
    switch (fx) {
      case 'entry-sheet': if (latest) openEntry(latest.id); break;
      case 'confirm-delete': if (latest) { openEntry(latest.id); askDelete(document.getElementById('gd-entry-delete')); } break;
      // Toast fixtures run the real writes, as Home does.
      case 'toast-added':
      case 'toast-queued': later(function () { Z.commitAdd(g.id, money ? 500 : nextPct(g), ''); }, 60); break;
      case 'toast-completed': later(function () { var left = money ? g.target - Z.progress(g) : 100; Z.commitAdd(g.id, money ? (left > 0 ? left : 500) : left, ''); }, 60); break;
      case 'toast-deleted': if (latest) later(function () { doDelete(latest); }, 60); break;
      case 'live-add': later(function () { Z.partner.addEntry(g.id, money ? { amount: 200 } : { percent: nextPct(g) }); }, 300); break;
      case 'live-note': later(function () { Z.partner.saveNote(g.id, { blocks: [{ type: 'text', text: LIVE_NOTE }] }); }, 300); break;
      case 'live-goal-deleted': later(function () { Z.partner.deleteGoal(g.id); }, 300); break;
    }
  }

  // ---------- lifecycle ----------
  function teardown() {
    if (!S) return;
    S.timers.forEach(clearTimeout);
    clearInterval(S.tick);
    S.root.removeEventListener('click', onClick);
    S.root.removeEventListener('keydown', onKey);
    Z.off('change', onChange);
    Z.off('connection', onConnection);
    if (wide.removeEventListener) wide.removeEventListener('change', onWide);
    if (S.ro) S.ro.disconnect();
    if (S.entry) S.entry.skipReturn = true;
    if (entryDlg && entryDlg.open) entryDlg.close();
    if (viewerDlg && viewerDlg.open) { viewerDlg.opener = null; viewerDlg.close(); }
    S = null;
  }

  function mount(root, r) {
    teardown(); // the shell's "elsewhere" route doesn't unmount us; never stack listeners
    var fx = Z.fixture('detail');
    S = { id: r.id, root: root, el: null, mode: 'ready', tab: r.query.view === 'journal' ? 'journal' : 'history',
      statsOpen: load(STATS_KEY) === '1', fixtureStats: false, descOpen: false, histLimit: HISTORY_PAGE, notesLimit: NOTES_PAGE,
      openNotes: {}, lastPct: 0, rowOrder: [], entry: null, timers: [], tick: null, ro: null };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    Z.offlineMessage = 'You\'re offline. Adding to this goal still works.'; // copy goal.offline.announce; the shell clears it per route
    Z.on('change', onChange);
    Z.on('connection', onConnection);
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    var g = Z.goal(r.id);

    if (fx === 'loading') { S.mode = 'loading'; renderLoading(); syncComposer(r); return; }
    if (fx === 'error') { S.mode = 'error'; renderError(); syncComposer(r); return; }
    if (fx === 'not-found' || !g) { S.mode = 'notfound'; renderNotFound(); syncComposer(r); return; }
    if (fx === 'partial') S.mode = 'partial';
    if ((fx === 'journal' || fx === 'live-note') && !r.query.view) {
      S.tab = 'journal';
      history.replaceState(history.state, '', location.pathname + location.search + hash('view=journal'));
      r.query.view = 'journal';
    }
    if (fx === 'stats-open') { S.statsOpen = true; S.fixtureStats = true; }
    if (fx === 'toast-queued') Z.setOffline(true, { silent: true }); // the add is queued; no announcement on load

    build();
    if (window.ResizeObserver) { S.ro = new ResizeObserver(function () { requestAnimationFrame(measure); }); S.ro.observe(S.el); }
    // "just now" ages into a date: refresh History while a row is that young.
    S.tick = setInterval(function () {
      if (inView() && S.root.querySelector('.gd-row-when') && Array.prototype.some.call(S.root.querySelectorAll('.gd-row-when'), function (w) { return w.textContent === 'just now'; })) {
        Z.keepFocus(S.root, function () { document.getElementById('gd-panel-history').innerHTML = historyHTML(goal()); applyTabs(); });
      }
    }, 30000);
    syncComposer(r);
    runFixture(fx, g);
    if (fx === 'entry-sheet' || fx === 'confirm-delete') return 'focus-handled';
    // IA 6.3 / critic F8: back from this goal's edit form (Save or Cancel), focus returns to Edit.
    var p = Z.prevRoute;
    if (p && p.view === 'form' && p.mode === 'edit' && p.id === r.id && !r.query.note) { Z.focus(document.getElementById('gd-edit')); return 'focus-handled'; }
  }

  function update(r) {
    if (!S) return false;
    if (S.mode === 'ready' || S.mode === 'partial') {
      var v = r.query.view;
      if (v === 'history' || v === 'journal') { if (v !== S.tab) selectTab(v, { fromRoute: true }); }
      else if (!r.query.note && S.tab === 'journal' && inView()) {
        // No ?view= (e.g. the composer popped back to a bare URL): keep the tab and make the URL say so.
        history.replaceState(history.state, '', location.pathname + location.search + hash('view=journal'));
      }
    }
    syncComposer(r);
    if (!r.query.note && inView()) setTitle(goal());
    return true;
  }

  Z.view('detail', { mount: mount, update: update, unmount: teardown });
})();
