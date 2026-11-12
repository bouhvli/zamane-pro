/* Shopping list view (#/shopping). Direction A · Aisle ledger, with C's pencil stroke on bought names.
   The primary is the floating Add item button (the masthead button from 48 rem, as on Goals and Trips) · the summary
   (a sticky rail from 64 rem) · category groups with dotted-leader heads and the item count flush right · the Bought group
   with Clear bought · Tidy up. A row shows its quantity and unit on the right and when it was added (or bought); who did it
   lives in the item sheet.
   The order is FROZEN while the list is on screen (ia S3): a layout of ids is built on route entry, on foreground after
   >= 30 s, on Tidy up and when Clear bought opens. Ticks change a row in place; adds and deletes apply in place; a
   partner's inserts and removals are held while a finger is down on the page (quiet moment, S5). Counts are never held.
   States (?state=): populated · empty · all-bought · loading · error · error-cached · stale · offline · solo · live · long · frozen.
   Rows open the item sheet through Z.dialogs.itemSheet(id); Add item opens Z.dialogs.itemForm({id:null}) (part 2). */
(function () {
  'use strict';
  var esc = Z.esc, svg = Z.svg, Shop = Z.shop;
  var root = null, state = 'populated', layout = { groups: [], done: [] }, fresh = {};
  var held = [], firstHeld = 0, heldTimer = null, down = false, lastUp = 0, hiddenAt = 0, addBurst = [];
  var doneChoice = null, clearOpen = false, timers = [], tickTimer = null;
  var onChange = null, onConn = null, onVis = null, onUp = null, onDown = null;
  var collator = new Intl.Collator('en', { sensitivity: 'base' });

  function item(id) { return Z.item(id); }
  function plural(n, one, other) { return n === 1 ? one : other; }
  function sel(id) { return '[data-id="' + CSS.escape(id) + '"]'; }
  function motionOk() { return !matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // ---------- layout: the frozen order of ids (ia S3) ----------
  function computeLayout() {
    var g = Shop.groups();
    layout = { groups: g.groups.map(function (x) { return { key: x.key, ids: x.items.map(function (i) { return i.id; }) }; }), done: g.done.map(function (i) { return i.id; }) };
  }
  function groupName(gr) {
    var its = gr.ids.map(item).filter(function (i) { return i && i.category; }).sort(function (a, b) { return (b.updatedAt - a.updatedAt) || (b.createdAt - a.createdAt); });
    return its.length ? its[0].category : '';
  }
  function removeFromLayout(id) {
    layout.groups.forEach(function (g) { g.ids = g.ids.filter(function (x) { return x !== id; }); });
    layout.groups = layout.groups.filter(function (g) { return g.ids.length; });
    layout.done = layout.done.filter(function (x) { return x !== id; });
  }
  function insertSorted(ids, it, before) {
    var at = ids.length;
    for (var i = 0; i < ids.length; i++) { var o = item(ids[i]); if (o && before(it, o)) { at = i; break; } }
    ids.splice(at, 0, it.id);
  }
  function insertLayout(it) {
    removeFromLayout(it.id);
    if (it.boughtAt) { insertSorted(layout.done, it, function (a, b) { return a.boughtAt > (b.boughtAt || 0); }); return; }
    var k = Shop.key(it.category), gr = layout.groups.filter(function (g) { return g.key === k; })[0];
    if (!gr) {
      gr = { key: k, ids: [] };
      var at = layout.groups.length, name = it.category || '';
      for (var i = 0; i < layout.groups.length; i++) {
        var o = layout.groups[i];
        if (!k) break;
        if (!o.key || collator.compare(name, groupName(o)) < 0) { at = i; break; }
      }
      if (!k) at = layout.groups.length;
      layout.groups.splice(at, 0, gr);
    }
    insertSorted(gr.ids, it, function (a, b) { return a.createdAt < b.createdAt || (+a.createdAt === +b.createdAt && a.id < b.id); });
  }
  function placeOf(id) {
    for (var i = 0; i < layout.groups.length; i++) if (layout.groups[i].ids.indexOf(id) > -1) return layout.groups[i].key;
    return layout.done.indexOf(id) > -1 ? 'done' : null;
  }
  function moves() {
    var n = 0;
    layout.groups.forEach(function (g) { g.ids.forEach(function (id) { var it = item(id); if (it && it.boughtAt) n++; }); });
    layout.done.forEach(function (id) { var it = item(id); if (it && !it.boughtAt) n++; });
    return n;
  }
  function boughtCount() { return Z.data.items.filter(function (x) { return x.boughtAt; }).length; }

  // ---------- quiet moments: a partner's inserts and removals wait for the thumb to lift (S5) ----------
  // Keyboard focus inside the list also counts as a finger down: a partner's inserts and removals wait (fix pass A4).
  function focusInBody() {
    var b = root && root.querySelector('#body'), a = document.activeElement;
    try { return !!(b && a && a !== b && b.contains(a) && a.matches(':focus-visible')); } catch (e) { return false; }
  }
  function quiet() { if (document.querySelector('dialog[open]')) return true; if (focusInBody()) return false; if (down) return false; return Date.now() - lastUp > 1000; }
  function flushHeld() {
    clearTimeout(heldTimer); heldTimer = null; firstHeld = 0;
    var fns = held; held = [];
    if (!root) return;
    fns.forEach(function (f) { f(); }); renderBody();
    refreshHeads();
  }
  function tryFlush() {
    heldTimer = null;
    if (!held.length) return;
    if (quiet() || (Date.now() - firstHeld >= 5000 && !focusInBody())) flushHeld();
    else heldTimer = setTimeout(tryFlush, 200);
  }
  function applyLayout(fn, now) {
    if (now || (quiet() && !held.length)) { fn(); renderBody(); return; }
    held.push(fn);
    if (!firstHeld) firstHeld = Date.now();
    if (!heldTimer) heldTimer = setTimeout(tryFlush, 200);
  }

  // ---------- row, group, done: markup ----------
  function boughtText(it) { return 'Bought ' + Shop.stamp(it.boughtAt, true); }
  function addedText(it) { return Shop.stamp(it.createdAt); }
  function flagHTML(it) {
    if (it.failed) return '<span class="r-flag is-failed">' + svg('x') + 'Couldn\'t sync</span>';
    if (it.pending) return '<span class="r-flag">' + svg('cloudOff') + 'Waiting to sync</span>';
    return '';
  }
  // The meta line: the notes beside when it was added; a bought row says when it was bought. No avatar, no name (they are in the item sheet).
  function metaHTML(it, inDone) {
    var h = '';
    if (inDone) h += '<span class="r-when">' + esc((it.category || 'Other') + ' · ' + (it.boughtAt ? boughtText(it) : addedText(it))) + '</span>';
    else {
      if (it.notes) h += '<span class="r-notes" dir="auto">' + esc(it.notes) + '</span>';
      h += '<time class="r-when" datetime="' + new Date(it.boughtAt || it.createdAt).toISOString() + '">' + esc(it.boughtAt ? boughtText(it) : addedText(it)) + '</time>';
    }
    return h + flagHTML(it);
  }
  function descText(it, inDone) {
    var p = ['Quantity ' + Shop.qtyText(it.quantity, it.unit) + '.'];
    if (inDone) p.push((it.category || 'Other') + '.');
    if (it.notes) p.push(it.notes.replace(/[.!?]$/, '') + '.');
    p.push((it.boughtAt ? boughtText(it) : 'Added ' + Shop.stamp(it.createdAt, true)) + '.');
    if (it.failed) p.push('Couldn\'t sync.'); else if (it.pending) p.push('Waiting to sync.');
    return p.join(' ');
  }
  function rowHTML(it, inDone) {
    var cls = 'row' + (it.boughtAt ? ' is-bought' : '') + (it.pending ? ' is-pending' : '') + (it.failed ? ' is-failed' : '');
    var style = '';
    var age = fresh[it.id] ? Date.now() - fresh[it.id] : 1e9;
    if (age < 2000) { cls += ' is-new'; style = ' style="animation-delay:-' + age + 'ms"'; }
    var qty = Shop.qtyText(it.quantity, it.unit), tickLabel = it.name + ', ' + qty;
    return '<li class="' + cls + '" data-id="' + esc(it.id) + '"' + style + '>' +
      '<input class="tick" type="checkbox" id="tick-' + esc(it.id) + '" data-act="tick" data-id="' + esc(it.id) + '" aria-label="' + esc(tickLabel) + '"' + (it.boughtAt ? ' checked' : '') + '>' +
      '<button class="row-body" type="button" data-act="open" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name + ', details') + '" aria-describedby="d-' + esc(it.id) + '">' +
      '<span class="r-head"><span class="r-title" dir="auto">' + esc(it.name) + '</span></span>' +
      '<span class="r-qty num">' + esc(qty) + '</span>' +
      '<span class="r-meta">' + metaHTML(it, inDone) + '</span></button>' +
      '<span class="vh r-desc" id="d-' + esc(it.id) + '">' + esc(descText(it, inDone)) + '</span></li>';
  }
  // The head is the leader line: name, dotted run, item count flush right. n counts the rows on screen (ticked rows stay in
  // place), so the head never says "0 items" over a visible row.
  function headInner(name, n) {
    return '<span class="g-name">' + esc(name || 'Other') + '</span><span class="g-lead" aria-hidden="true"></span><span class="g-count num">' + n + ' ' + plural(n, 'item', 'items') + '</span>';
  }
  function groupHTML(gr, i) {
    var its = gr.ids.map(item).filter(Boolean);
    if (!its.length) return '';
    return '<section class="grp" data-key="' + esc(gr.key) + '" aria-labelledby="gh-' + i + '"><h2 class="g-head" id="gh-' + i + '">' + headInner(groupName(gr), its.length) + '</h2>' +
      '<ul class="rows" role="list">' + its.map(function (it) { return rowHTML(it, false); }).join('') + '</ul></section>';
  }
  function doneStats() {
    var its = layout.done.map(item).filter(Boolean);
    return { items: its, n: its.filter(function (x) { return x.boughtAt; }).length };
  }
  function doneOpen(total) { if (!layout.groups.length) return true; return doneChoice != null ? doneChoice : total <= 5; }
  function doneTopHTML(st) {
    var open = doneOpen(st.items.length), why = '', dis = false;
    if (st.n) {
      if (Z.offline) { why = 'Clearing needs a connection.'; dis = true; }
      else if (Z.queued().length) { why = 'Syncing… try again in a moment.'; dis = true; }
    }
    var label = '<span class="done-name">Bought · ' + st.n + '</span>';
    // With no groups there is nothing to collapse: the heading is plain text, not a button (fix pass)
    var head = layout.groups.length ? '<button class="done-toggle" type="button" data-act="done-toggle" aria-expanded="' + open + '" aria-controls="done-rows">' + svg('chevron') + label + '</button>'
      : '<span class="done-toggle is-static">' + label + '</span>';
    return '<div class="done-top"><div class="done-head"><h2 class="done-h" id="done-h">' + head + '</h2>' +
      (st.n ? '<button class="clear-btn" type="button" data-act="clear"' + (dis ? ' aria-disabled="true" aria-describedby="clear-why"' : '') + '>Clear bought<span class="vh">, ' + st.n + ' ' + plural(st.n, 'item', 'items') + '</span></button>' : '') +
      '</div>' + (why ? '<p class="done-why caption" id="clear-why">' + why + '</p>' : '') + '</div>';
  }
  function doneHTML() {
    var st = doneStats();
    if (!st.items.length) return '';
    var open = doneOpen(st.items.length);
    return '<section class="done" aria-labelledby="done-h">' + doneTopHTML(st) +
      '<ul class="rows" id="done-rows" role="list" aria-label="Bought items"' + (open ? '' : ' hidden') + '>' + st.items.map(function (it) { return rowHTML(it, true); }).join('') + '</ul></section>';
  }

  // ---------- summary (S8, S11) ----------
  function summaryHTML() {
    if (state === 'loading') return '<p class="sum-line"><span class="sum-count">Loading…</span></p>';
    if (state === 'error') return '';
    var t = Shop.totals();
    if (!t.any) return '';
    var n = moves();
    var h = '<div class="sum-line"><b class="sum-count" tabindex="-1">' + (t.left === 0 ? 'Nothing left to buy' : t.left + ' left to buy') + '</b>';
    if (t.boughtCount) h += '<span class="sum-bought">' + t.boughtCount + ' bought</span>';
    if (n) h += '<button class="btn-ghost btn-sm tidy" type="button" data-act="tidy">Tidy up (' + n + ')<span class="vh">, move ' + n + ' ' + plural(n, 'item', 'items') + '</span></button>';
    return h + '</div>';
  }
  function renderSummary() {
    var el = root && root.querySelector('#sum'); if (!el) return;
    var html = summaryHTML();
    el.hidden = !html;
    Z.keepFocus(el, function () { el.innerHTML = html; });
  }

  // ---------- body ----------
  function noticeHTML() {
    var h = '';
    if (Z.offline) h += '<p class="notice list-notice">' + svg('cloudOff') + '<span>You\'re offline. Showing the latest data on this phone. Adding items and ticking them off still work and sync when you\'re back online. Editing, deleting and clearing bought items need a connection.</span></p>';
    if (state === 'error-cached') h += '<div class="notice list-notice notice-stale">' + svg('refresh') + '<span>Couldn\'t refresh. Showing the latest data on this phone.</span><button class="link-btn" type="button" data-act="refresh">Try again</button></div>';
    if (state === 'stale') h += '<p class="stale-note caption">Updated 12 min ago</p>';
    return h;
  }
  function skeletonHTML() {
    var row = '<div class="sk-row"><span class="sk sk-tick"></span><span class="sk-text"><span class="sk sk-line"></span><span class="sk sk-line short"></span></span></div>';
    return '<div class="list-sk" aria-hidden="true"><span class="sk sk-h2"></span>' + row + row + row + '<span class="sk sk-h2"></span>' + row + row + '</div>';
  }
  function bodyHTML() {
    if (state === 'loading') return skeletonHTML();
    if (state === 'error') return '<div class="list-error"><div role="alert"><h2 class="title">The list didn\'t load.</h2><p>You can still add items. They\'ll show up here once the list loads.</p></div><button class="btn-sec" type="button" data-act="retry">Try again</button></div>';
    var h = noticeHTML();
    if (!Z.data.items.length) return h + '<div class="empty"><h2 class="title">Nothing on the list yet.</h2><p>' + (Z.solo ? 'Add what you need.' : 'Add what you need and you\'ll both see it.') + '</p></div>';
    if (!layout.groups.length && layout.done.length) h += '<p class="allbought">Everything on the list is bought. Add more with Add item, or clear the bought items.</p>';
    if (layout.groups.length) h += '<section class="groups" aria-label="Shopping list">' + layout.groups.map(groupHTML).join('') + '</section>';
    return h + doneHTML();
  }
  // The status node lives in the page from the start so "Loading the list" is an update, not an insertion (fix pass)
  function setStatus() {
    var st = root && root.querySelector('#list-status'); if (!st) return;
    if (state === 'loading') timers.push(setTimeout(function () { if (root) { var s = root.querySelector('#list-status'); if (s && state === 'loading') s.textContent = 'Loading the list'; } }, 150));
    else st.textContent = '';
  }
  // A re-render keeps keyboard focus; when the focused row itself is gone, focus goes to its nearest surviving neighbour (fix pass A4)
  function renderBody() {
    var el = root && root.querySelector('#body'); if (!el) return;
    el.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    var a = document.activeElement, li = a && a !== el && el.contains(a) && a.closest ? a.closest('li.row') : null, id = li && li.dataset.id, order = [];
    if (id) Array.prototype.forEach.call(el.querySelectorAll('li.row'), function (r) { order.push(r.dataset.id); });
    Z.keepFocus(el, function () { el.innerHTML = bodyHTML(); });
    if (id && !el.querySelector('li.row' + sel(id))) {
      var at = order.indexOf(id), pick = null;
      for (var d = 1; d < order.length && !pick; d++) {
        [order[at + d], order[at - d]].forEach(function (c) { if (!pick && c && el.querySelector('li.row' + sel(c))) pick = c; });
      }
      Shop.focusRow(pick);
    }
    setStatus();
    Z.afterRender();
  }
  function titleFor() { return Z.offline ? 'Shopping (offline) – Zamane' : 'Shopping – Zamane'; }
  function renderAll() {
    Z.title(titleFor());
    renderSummary(); renderBody();
    Z.footnote(state === 'loading' || state === 'error' || !Z.data.items.length ? '' : Z.state === 'populated' ? 'Example data; 7 left, as on Home.' : 'Example data.');
  }
  // In-place updates that never move or replace a row's checkbox (ia S3)
  function refreshHeads() {
    if (!root) return;
    root.querySelectorAll('section.grp').forEach(function (sec) {
      var name = sec.querySelector('.g-name'); name = name ? name.textContent : '';
      sec.querySelector('.g-head').innerHTML = headInner(name, sec.querySelectorAll('li.row').length);
    });
    var top = root.querySelector('.done-top');
    if (top) {
      var tmp = document.createElement('div'); tmp.innerHTML = doneTopHTML(doneStats());
      Z.keepFocus(top.parentNode, function () { top.replaceWith(tmp.firstChild); });
    }
    renderSummary();
  }
  function patchRow(id) {
    var li = root && root.querySelector('li.row' + sel(id)), it = item(id);
    if (!li || !it) return;
    var inDone = !!li.closest('.done');
    li.classList.toggle('is-bought', !!it.boughtAt); li.classList.toggle('is-pending', !!it.pending); li.classList.toggle('is-failed', !!it.failed);
    li.querySelector('.tick').checked = !!it.boughtAt;
    li.querySelector('.r-meta').innerHTML = metaHTML(it, inDone);
    li.querySelector('.r-desc').textContent = descText(it, inDone);
  }
  function replaceRow(id) {
    var li = root && root.querySelector('li.row' + sel(id)), it = item(id);
    if (!li || !it) return;
    var tmp = document.createElement('ul'); tmp.innerHTML = rowHTML(it, !!li.closest('.done'));
    Z.keepFocus(li.parentNode, function () { li.replaceWith(tmp.firstChild); });
  }

  // ---------- acts ----------
  function onTick(cb) {
    var id = cb.dataset.id, it = item(id); if (!it) return;
    var want = cb.checked, r = Z.setBought(id, want);
    if (r.noop) { patchRow(id); return; } // the partner got there first: the first buyer is kept
    announceTick(it, want);
    if (want) Z.toast({ msg: 'Bought ' + it.name, undo: function () { Z.setBought(id, false); announceTick(it, false); Shop.focusRow(id); }, undoLabel: 'Undo: Bought ' + it.name, silent: true });
  }
  // One polite sentence per burst of ticks, with the new count (fix pass A1). The toast stays silent.
  function announceTick(it, bought) {
    clearTimeout(tickTimer);
    tickTimer = setTimeout(function () {
      var left = Shop.totals().left;
      Z.announce(it.name + (bought ? ' bought. ' : ' put back. ') + (left === 0 ? 'Nothing left to buy.' : left + ' left to buy.'));
    }, 400);
  }
  function tidy(silent) {
    var n = moves(); if (!n) return 0;
    function apply() {
      computeLayout(); renderBody(); renderSummary();
      if (!silent) { Z.focus(root.querySelector('.sum-count')); Z.announce('Moved ' + n + ' ' + plural(n, 'item', 'items') + '.'); }
    }
    if (silent || !motionOk()) { apply(); return n; }
    root.querySelectorAll('li.row').forEach(function (li) { var it = item(li.dataset.id), inDone = !!li.closest('.done'); if (it && (inDone ? !it.boughtAt : it.boughtAt)) li.classList.add('is-leaving'); });
    timers.push(setTimeout(apply, 150));
    return n;
  }
  function updateClearConfirm() {
    var n = boughtCount();
    $('#confirm-h').textContent = plural(n, 'Clear 1 bought item?', 'Clear ' + n + ' bought items?');
    $('#confirm-ok').textContent = plural(n, 'Clear 1 item', 'Clear ' + n + ' items');
    $('#confirm-cancel').textContent = plural(n, 'Keep it', 'Keep them');
    Z.announce('The list changed. Now clearing ' + n + ' bought ' + plural(n, 'item', 'items') + '.');
  }
  function $(s) { return document.querySelector(s); }
  function clearBought() {
    if (typeof Z.dialogs.clearBought === 'function') { Z.dialogs.clearBought(); return; } // part 2's version wins
    tidy(true); // the dialog's count and the group must agree
    var n = boughtCount(); if (!n) return;
    clearOpen = true;
    Z.confirm({
      title: plural(n, 'Clear 1 bought item?', 'Clear ' + n + ' bought items?'),
      body: '<p>' + (Z.solo ? 'They\'ll be removed.' : 'They\'ll be removed for both of you.') + '</p>',
      confirm: plural(n, 'Clear 1 item', 'Clear ' + n + ' items'), cancel: plural(n, 'Keep it', 'Keep them'), danger: true
    }).then(function (ok) {
      clearOpen = false;
      if (!ok) return;
      var r = Z.clearBought(), c = r.items.length;
      Z.focusPrimary();
      Z.toast({ msg: plural(c, 'Cleared 1 item', 'Cleared ' + c + ' items'), undoLabel: 'Undo: ' + plural(c, 'Cleared 1 item', 'Cleared ' + c + ' items'),
        undo: function () { var rs = Z.restore(r.items).items, b = rs.length; Shop.focusRow(rs[0] && rs[0].id); Z.toast({ msg: plural(b, 'Restored 1 item', 'Restored ' + b + ' items'), ms: 4000 }); } });
    });
  }

  // ---------- changes: in place, polite announcements, no toast for a partner's act ----------
  function live(msg) { Z.announce(msg); }
  function handleChange(ev) {
    if (!root || state === 'loading' || state === 'error') return;
    var it = ev.item, mine = ev.source === 'me', who = Z.name(ev.by);
    if (clearOpen && $('#confirm').open) updateClearConfirm();
    switch (ev.type) {
      case 'added':
        applyLayout(function () { fresh[it.id] = Date.now(); insertLayout(it); }, mine);
        refreshHeads();
        if (mine) Z.toast({ msg: it.pending ? 'Added ' + it.name : 'Added ' + it.name + ' to ' + (it.category || 'Other'), ms: 4000 });
        else {
          var now = Date.now(); addBurst = addBurst.filter(function (x) { return now - x < 3000; }); addBurst.push(now);
          live(addBurst.length >= 3 ? who + ' added ' + addBurst.length + ' items.' : who + ' added ' + it.name + '.');
        }
        break;
      case 'bought':
        patchRow(it.id); refreshHeads();
        if (!mine) live(ev.done ? who + ' bought ' + it.name + '.' : who + ' put ' + it.name + ' back on the list.');
        break;
      case 'updated':
        var place = placeOf(it.id);
        if (place && place !== 'done' && place !== Shop.key(it.category)) applyLayout(function () { insertLayout(it); }, mine);
        else replaceRow(it.id);
        refreshHeads();
        if (!mine) live(who + ' changed ' + it.name + '.');
        break;
      case 'deleted':
        applyLayout(function () { removeFromLayout(it.id); }, mine);
        refreshHeads();
        if (!mine) live(who + ' removed ' + it.name + '.');
        break;
      case 'cleared':
        applyLayout(function () { ev.items.forEach(function (x) { removeFromLayout(x.id); }); }, mine);
        refreshHeads();
        if (!mine) live(who + ' cleared ' + ev.items.length + ' bought ' + plural(ev.items.length, 'item', 'items') + '.');
        break;
      case 'restored':
        applyLayout(function () { ev.items.forEach(function (x) { fresh[x.id] = Date.now(); insertLayout(x); }); }, mine);
        refreshHeads();
        break;
      case 'synced':
        patchRow(it.id); refreshHeads();
        break;
    }
  }

  function onClick(e) {
    var act = e.target.closest('[data-act]');
    if (!act || act.dataset.act === 'tick') return;
    var a = act.dataset.act;
    if (a === 'open') { Z.dialogs.itemSheet(act.dataset.id); return; }
    if (a === 'add') { Z.dialogs.itemForm({ id: null }); return; }
    if (a === 'done-toggle') {
      if (!layout.groups.length) return; // all bought: the group is the only content and stays open (S10)
      var st = doneStats(), open = doneOpen(st.items.length); doneChoice = !open;
      var rows = root.querySelector('#done-rows'); rows.hidden = open; act.setAttribute('aria-expanded', String(!open));
      return;
    }
    if (a === 'tidy') { tidy(); return; }
    if (a === 'clear') { if (act.getAttribute('aria-disabled') === 'true') return; clearBought(); return; }
    if (a === 'retry' || a === 'refresh') {
      if (act.getAttribute('aria-disabled') === 'true') return;
      act.setAttribute('aria-disabled', 'true'); act.textContent = 'Trying again'; // stays focusable while pending
      timers.push(setTimeout(function () { state = 'populated'; computeLayout(); renderAll(); Z.focusHeading(); Z.announce('The list loaded.'); }, 900));
    }
  }
  function onChangeEvt(e) { if (e.target.matches && e.target.matches('input.tick')) onTick(e.target); }

  // ---------- fixtures that need the partner ----------
  function playLive() {
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    at(2500, function () { Z.partner.addItem({ name: 'Eggs', category: 'Dairy' }); });
    at(6000, function () { Z.partner.setBought('butter', true); });
    at(9500, function () { Z.partner.deleteItem('dish-soap'); });
    at(13000, function () { Z.partner.clearBought(); });
  }

  Z.view('list', {
    mount: function (el, route) {
      root = el; el.classList.add('list-view');
      var fx = Z.fixture('list');
      state = fx && ['loading', 'error', 'error-cached', 'stale'].indexOf(fx) > -1 ? fx : 'populated';
      Z.offlineMessage = 'You\'re offline. Adding items and ticking them off still work.'; Z.onlineMessage = 'Back online.';
      computeLayout();
      // Rows ticked in place: the order is already built, so nothing moves (ia S3)
      if (fx === 'frozen') { Z.setBought('tomatoes', true); Z.setBought('dish-soap', true); }
      if (fx === 'offline') Z.setBought('dish-soap', true);
      el.innerHTML = '<div class="masthead"><h1 class="title-lg" id="list-h1" tabindex="-1">Shopping</h1>' +
        '<div class="dock"><button class="btn-primary" type="button" id="primary" data-act="add">' + svg('plus') + 'Add item</button></div></div>' +
        '<div class="list-layout"><div id="sum" class="sum" hidden></div><div id="body" class="list-body"></div></div><p class="vh" id="list-status" role="status"></p>';
      renderAll();
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChangeEvt);
      onDown = function () { down = true; }; el.addEventListener('pointerdown', onDown, true);
      onUp = function () { if (down) { down = false; lastUp = Date.now(); } }; window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
      onChange = handleChange; Z.on('change', onChange);
      onConn = function () { if (root) { renderAll(); } }; Z.on('connection', onConn);
      // Back in the foreground after >= 30 s: the order is rebuilt (ia S3)
      onVis = function () {
        if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
        if (root && hiddenAt && Date.now() - hiddenAt >= 30000 && state !== 'loading' && state !== 'error') { computeLayout(); renderBody(); renderSummary(); }
        hiddenAt = 0;
      };
      document.addEventListener('visibilitychange', onVis);
      if (fx === 'live') playLive();
      Z.dialogs.fromRoute(route);
      if (route.query && route.query.focus === 'add') {
        timers.push(setTimeout(function () { if (!root) return; Z.focusPrimary(); Z.go(Z.withQuery({ focus: null }), { replace: true }); }, 0));
        return 'focus-handled';
      }
    },
    update: function (route) { Z.dialogs.fromRoute(route); return true; },
    unmount: function () {
      Z.off('change', onChange); Z.off('connection', onConn);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      timers.forEach(clearTimeout); timers = []; clearTimeout(tickTimer); tickTimer = null; clearTimeout(heldTimer); held = []; heldTimer = null; firstHeld = 0;
      if (root) { root.removeEventListener('click', onClick); root.removeEventListener('change', onChangeEvt); root.classList.remove('list-view'); }
      root = null; fresh = {};
    }
  });
})();
