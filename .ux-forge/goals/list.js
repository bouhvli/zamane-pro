/* Goals list view (#/goals). Direction B · Doorway: open goals as doorway tiles, done goals as flat rows.
   States (?state=): populated · empty · all-done · loading · offline · stale · error · uploads-off · live
   D1: open goals closest to done first, done goals newest first. The order is fixed while the list is on
   screen (live changes update a tile in place) and recomputed on route entry or return to the foreground. */
(function () {
  'use strict';
  var root = null, state = 'populated', openOrder = [], doneOrder = [], onChange = null, onConn = null, onVis = null;
  var lastOpened = null;
  var esc = Z.esc, svg = Z.svg;

  function computeOrder() {
    openOrder = Z.openGoals().map(function (g) { return g.id; });
    doneOrder = Z.doneGoals().map(function (g) { return g.id; });
  }
  function present(ids) { return ids.map(Z.goal).filter(Boolean); }

  // ---------- strings (copy.md §1, Home's where reused) ----------
  function summaryText() {
    var gs = Z.goals(), open = gs.filter(function (g) { return !Z.isDone(g); }).length, done = gs.length - open;
    var amount = Z.fmt(Z.totalSaved()) + ' MAD saved together';
    if (open === 0) return done + ' ' + Z.plural(done, 'goal', 'goals') + ' done · ' + amount;
    if (done === 0) return open + ' ' + Z.plural(open, 'goal', 'goals') + ' open · ' + amount;
    return open + ' ' + Z.plural(open, 'goal', 'goals') + ' open · ' + done + ' done · ' + amount;
  }
  function attribution(g) {
    var e = Z.lastEntry(g);
    if (!e) return { text: 'No contributions yet' };
    var who = Z.name(e.by), when = e.pending ? 'waiting to sync' : Z.ago(e.at);
    var text = g.kind === 'money' ? who + ' added ' + Z.fmt(e.amount) + ' · ' + when : who + ' moved it to ' + e.percent + '% · ' + when;
    return { text: text, by: e.by, pending: e.pending, amount: e.amount };
  }
  function cardLabel(g) {
    var p = Z.progress(g);
    if (Z.isDone(g)) return g.title + ': done';
    return g.kind === 'money' ? g.title + ': ' + Z.fmt(p) + ' MAD of ' + Z.fmt(g.target) + ' MAD, ' + Z.pct(g) + '%' : g.title + ': ' + p + '% done';
  }
  function byText(g) {
    if (!g.targetDate) return '';
    var d = new Date(g.targetDate); d.setHours(23, 59);
    return d < Z.now() ? 'Target date was ' + Z.day(g.targetDate) : 'by ' + Z.day(g.targetDate);
  }

  // ---------- tile (open goal) ----------
  function tileHTML(g, opts) {
    opts = opts || {};
    var money = g.kind === 'money', p = Z.progress(g), done = Z.isDone(g), a = attribution(g);
    var from = Z.animFrom[g.id];
    var foot = a.by
      ? Z.av(a.by, 'sm') + '<span>' + (a.pending ? svg('cloudOff', 'ic-pending') : '') + esc(a.text) + '</span>'
      : '<span>' + esc(a.text) + '</span>';
    var by = done ? '<span class="badge badge-done">' + svg('check') + 'Done</span>' : esc(byText(g));
    return '<li class="tile' + (done ? ' is-done' : '') + '" data-id="' + esc(g.id) + '">' +
      Z.doorway(g, 'tile', { closing: opts.closing }) +
      '<h3 class="tile-title"><a href="#/goals/' + esc(g.id) + '">' + esc(g.title) + '</a></h3>' +
      '<p class="tile-fig num">' + (money ? esc(Z.mad(p)) : p + '%') + '</p>' +
      '<p class="tile-of num">' + (money ? 'of ' + esc(Z.mad(g.target)) : '') + '</p>' +
      '<div class="tile-bar">' + Z.bar(g, { from: from }) + '</div>' +
      '<p class="tile-foot"' + (a.pending ? ' aria-label="' + esc(a.text.replace('waiting to sync', '') + Z.fmt(a.amount) + ' MAD waiting to sync') + '"' : '') + '>' + foot + '</p>' +
      '<p class="tile-by">' + by + '</p></li>';
  }

  // ---------- done row ----------
  function doneHTML(g, opts) {
    var done = Z.isDone(g), money = g.kind === 'money', p = Z.progress(g), meta;
    if (!done) meta = money ? Z.fmt(p) + ' MAD of ' + Z.fmt(g.target) + ' MAD' : p + '%';
    else if (money && p > g.target) meta = Z.fmt(p) + ' MAD of ' + Z.fmt(g.target) + ' MAD · ' + Z.fmt(p - g.target) + ' MAD over · reached ' + Z.day(g.completedAt) + ' · ' + Z.name(g.completedBy);
    else if (money) meta = Z.fmt(g.target) + ' MAD · reached ' + Z.day(g.completedAt) + ' · ' + Z.name(g.completedBy);
    else meta = 'Reached ' + Z.day(g.completedAt) + ' · ' + Z.name(g.completedBy);
    return '<li class="done-row" data-id="' + esc(g.id) + '">' + Z.doorway(g, 'row', { closing: opts && opts.closing }) +
      '<div class="done-body"><h3 class="done-title"><a href="#/goals/' + esc(g.id) + '" aria-label="' + esc(cardLabel(g)) + '">' + esc(g.title) + '</a></h3>' +
      '<p class="done-meta num">' + esc(meta) + '</p></div>' +
      (done ? '<span class="badge badge-done">' + svg('check') + 'Done</span>' : '') + '</li>';
  }

  // ---------- page ----------
  function titleFor() {
    if (state === 'loading') return 'Loading – Zamane';
    if (state === 'error') return 'Can\'t load Goals – Zamane';
    if (Z.offline) return 'Goals (offline) – Zamane';
    if (!Z.goals().length) return 'No goals yet – Zamane';
    if (!Z.openGoals().length) return 'All goals reached – Zamane';
    return 'Goals – Zamane';
  }
  function primaryHTML() {
    if (state === 'loading' || state === 'error') return '';
    var empty = !Z.goals().length;
    return '<div class="dock"><a class="btn-primary" id="primary" href="#/goals/new">' + svg('plus') + (empty ? 'Create a goal' : 'New goal') + '</a></div>';
  }
  function noticeHTML() {
    if (state === 'loading' || state === 'error') return '';
    if (Z.offline) return '<p class="notice list-notice">' + svg('cloudOff') + '<span>You\'re offline. Showing the latest data on this phone. Adding to goals still works and syncs when you\'re back online.</span></p>';
    if (state === 'stale') return '<div class="notice list-notice notice-stale">' + svg('refresh') + '<span>Couldn\'t refresh. Showing the latest data on this phone.</span><button class="link-btn" type="button" data-act="refresh">Try again</button></div>';
    return '';
  }
  function mastheadHTML() {
    var h1 = '<h1 class="title-lg" id="list-h1" tabindex="-1">Goals</h1>';
    if (state === 'loading') return '<div class="list-head">' + h1 + '<span class="sk sk-summary" aria-hidden="true"></span></div>';
    if (state === 'error' || !Z.goals().length) return '<div class="list-head">' + h1 + primaryHTML() + '</div>';
    return '<div class="list-head">' + h1 + '<p class="list-summary num" id="list-summary">' + esc(summaryText()) + '</p>' + primaryHTML() + '</div>';
  }
  function bodyHTML(opts) {
    opts = opts || {};
    if (state === 'loading') {
      var sk = '<li class="tile tile-sk" aria-hidden="true"><span class="sk sk-door"></span><span class="sk sk-line"></span><span class="sk sk-fig"></span><span class="sk sk-of"></span><span class="sk sk-bar"></span><span class="sk sk-line"></span><span class="sk sk-of"></span></li>';
      return '<p class="vh" role="status" id="list-status"></p><ul class="tiles" role="list" aria-hidden="true">' + sk + sk + sk + '</ul>';
    }
    if (state === 'error') {
      return '<div class="list-error"><div role="alert"><h2 class="title">Goals didn\'t load</h2><p>Check your connection and try again.</p></div>' +
        '<button class="btn-primary" type="button" data-act="retry">Try again</button></div>';
    }
    if (!Z.goals().length) {
      return '<div class="prompt list-empty">' + svg('goal') + '<div><h2 class="title">No goals yet.</h2><p>A goal is something you save for together. Give it a name and, for money, a target.</p></div></div>';
    }
    var open = present(openOrder), done = present(doneOrder), html = '';
    if (open.length) {
      html += '<section aria-labelledby="h-open"><h2 class="vh" id="h-open">Open goals</h2><ul class="tiles' + (open.some(function (g) { return Z.uploadsEnabled && g.cover; }) ? '' : ' no-covers') + '" role="list">' +
        open.map(function (g) { return tileHTML(g, { closing: opts.closing === g.id }); }).join('') + '</ul></section>';
    } else {
      var n = done.length;
      html += '<div class="prompt list-alldone"><span class="badge badge-done">' + svg('check') + 'Done</span><div><h2 class="title">All goals reached</h2><p>You finished ' + n + ' ' + Z.plural(n, 'goal', 'goals') + ' together.</p></div></div>';
    }
    if (done.length) {
      html += '<section class="done-sec" aria-labelledby="h-done"><h2 class="sec-title" id="h-done">Done · ' + done.length + '</h2><ul class="done-rows" role="list">' +
        done.map(function (g) { return doneHTML(g, { closing: opts.closing === g.id }); }).join('') + '</ul></section>';
    }
    return html;
  }
  function render(opts) {
    root.classList.add('list-view');
    root.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    Z.title(titleFor());
    Z.setFab(state !== 'loading' && state !== 'error');
    Z.keepFocus(root, function () {
      root.innerHTML = mastheadHTML() + noticeHTML() + '<div class="list-body">' + bodyHTML(opts) + '</div>';
    });
    Z.animFrom = {};
    Z.footnote(state === 'loading' || state === 'error' ? '' : 'Example data. The goals and amounts on this screen are made up.');
    Z.afterRender();
    var st = root.querySelector('#list-status'); if (st) setTimeout(function () { st.textContent = 'Loading goals'; }, 50);
  }

  // ---------- live updates: in place, never reordered, polite announcements (no toast) ----------
  function liveMessage(ev) {
    var g = Z.goal(ev.goalId), name = Z.name(ev.by);
    if (ev.type === 'goal-deleted') return name + ' deleted ' + ev.goal.title + '.';
    if (!g) return '';
    if (ev.completed) return name + ' reached ' + g.title + '.';
    if (ev.reopened) return g.title + ' is open again.';
    if (ev.type === 'entry-added') return g.kind === 'money' ? name + ' added ' + Z.fmt(ev.entry.amount) + ' MAD to ' + g.title + '. Saved together: ' + Z.fmt(Z.totalSaved()) + ' MAD.' : name + ' moved ' + g.title + ' to ' + ev.entry.percent + '%.';
    if (ev.type === 'entry-removed') return name + ' removed a contribution from ' + g.title + '. Saved together: ' + Z.fmt(Z.totalSaved()) + ' MAD.';
    if (ev.type === 'goal-created') return name + ' created ' + g.title + '.';
    if (ev.type === 'goal-updated') return name + ' edited ' + g.title + '.';
    return '';
  }
  function handleChange(ev) {
    if (!root || state === 'loading' || state === 'error') return;
    if (ev.type === 'note-added' || ev.type === 'note-updated' || ev.type === 'note-deleted') return;
    var focusNext = null;
    if (ev.type === 'goal-created' && openOrder.indexOf(ev.goalId) < 0 && doneOrder.indexOf(ev.goalId) < 0) openOrder.push(ev.goalId); // appended at the end of Open
    if (ev.type === 'goal-deleted') {
      // If the deleted card had focus, focus goes to the next card (or the previous, or the h1).
      var li = root.querySelector('[data-id="' + CSS.escape(ev.goalId) + '"]');
      if (li && li.contains(document.activeElement)) {
        var sib = li.nextElementSibling || li.previousElementSibling;
        focusNext = sib ? sib.querySelector('a') && sib.querySelector('a').getAttribute('href') : '#h1';
      }
      openOrder = openOrder.filter(function (id) { return id !== ev.goalId; });
      doneOrder = doneOrder.filter(function (id) { return id !== ev.goalId; });
    }
    render({ closing: ev.completed ? ev.goalId : null });
    if (focusNext === '#h1') Z.focusHeading();
    else if (focusNext) { var a = root.querySelector('a[href="' + focusNext + '"]'); if (a) a.focus({ preventScroll: true }); }
    if (ev.source === 'partner') { var msg = liveMessage(ev); if (msg) Z.announce(msg); }
  }
  // Bars animate from where they were: capture the old percentage before a partner write lands.
  function beforePartner(goalId) { var g = Z.goal(goalId); if (g) Z.animFrom[goalId] = Z.pct(g); }

  // ---------- actions ----------
  function onClick(e) {
    var link = e.target.closest('.tile-title a, .done-title a');
    if (link) { lastOpened = link.getAttribute('href'); return; }
    var act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'retry') {
      if (act.getAttribute('aria-disabled') === 'true') return;
      act.setAttribute('aria-disabled', 'true'); act.textContent = 'Trying again'; // stays focusable while pending
      setTimeout(function () { state = 'populated'; computeOrder(); render(); Z.focusHeading(); Z.announce('Goals loaded.'); }, 900);
    }
    if (act.dataset.act === 'refresh') {
      act.setAttribute('aria-disabled', 'true'); act.textContent = 'Trying again';
      setTimeout(function () { state = 'populated'; render(); Z.focusHeading(); Z.announce('Goals loaded.'); }, 900);
    }
  }

  Z.view('list', {
    mount: function (el) {
      root = el;
      var fx = Z.fixture('list');
      state = fx && ['loading', 'error', 'stale'].indexOf(fx) > -1 ? fx : 'populated';
      computeOrder();
      render();
      root.addEventListener('click', onClick);
      onChange = handleChange; Z.on('change', onChange);
      onConn = function () { if (state === 'stale' && !Z.offline) state = 'populated'; render(); }; Z.on('connection', onConn);
      // Back in the foreground: the order is recomputed (D1), still without moving anything under a focused card.
      onVis = function () { if (document.visibilityState === 'visible' && root) { computeOrder(); render(); } };
      document.addEventListener('visibilitychange', onVis);
      if (fx === 'live') setTimeout(function () { beforePartner('wedding'); Z.partner.addEntry('wedding', { amount: 200 }); }, 300);
      // Returning from a goal: same scroll position, focus on the card just opened (F1 step 4).
      var y = Z.scrollFor('/goals');
      if (y != null && lastOpened) {
        window.scrollTo(0, y);
        var a = root.querySelector('a[href="' + lastOpened + '"]');
        if (a) { Z.focus(a); return 'focus-handled'; }
      }
    },
    unmount: function () {
      Z.off('change', onChange); Z.off('connection', onConn); document.removeEventListener('visibilitychange', onVis);
      if (root) { root.removeEventListener('click', onClick); root.classList.remove('list-view'); root.removeAttribute('aria-busy'); }
      root = null;
    }
  });
})();
