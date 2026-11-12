/* Zamane Shopping prototype, part 2a: the item sheet, the confirmations (delete, clear bought) and the dialog contract.
   Direction A · Aisle ledger. Plain script, no modules (file:// works). Loaded after list.js and before form.js.

   ─── What lives here ──────────────────────────────────────────────────────────────────────
   #item-sheet   the READ sheet for one item (no URL of its own, but Back closes it: it pushes one history entry).
                 Bottom sheet on phones, centred 28 rem from 48 rem. Actions: Edit · Put back on the list (bought) · Delete.
                 Offline: Edit and Delete are aria-disabled with the reason beside them. A queued, unsynced add offers
                 "Remove from the queue" (works offline, no confirm, Undo). A "Couldn't sync" row offers Try again / Remove.
   Delete confirm (Z.confirm, alertdialog) + the "Deleted X · Undo" toast; Clear bought confirm with a live count.
   Z.dialogs = { itemSheet(id), itemForm({id|null, name?}), fromRoute(route), closeAll(), clearBought() }
     itemForm and fromRoute hand over to form.js (Z.form). Z.dlg is the small kit form.js shares (store, say, P …).
   Fixtures (?state=): item-sheet · item-sheet-bought · item-gone · delete-confirm · clear-bought-confirm ·
     clear-bought-live (the partner ticks while the confirm is open). Form fixtures live in form.js.
   ───────────────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var Z = window.Z, esc = Z.esc, Shop = Z.shop;

  // ---------- strings (copy.md) ----------
  var C = {
    close: 'Close', edit: 'Edit', del: 'Delete', putBack: 'Put back on the list', keepIt: 'Keep it',
    remove: 'Remove from the queue', retry: 'Try again', failedBody: 'This item couldn\'t sync. Try again, or remove it.',
    category: 'Category', other: 'Other', notes: 'Notes', quantity: 'Quantity', queued: 'Waiting to sync',
    rEdit: 'Editing needs a connection.', rQueued: 'This item hasn\'t synced yet.', rDelete: 'Deleting needs a connection.',
    undo: 'Undo needs a connection.'
  };
  function plural(n, a, b) { return n === 1 ? a : b; }
  function P(lines) { return lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join(''); }
  function byId(id) { return document.getElementById(id); }
  function visible(el) { return !!el && el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden],[inert]'); }
  var store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked: the draft lives only in the open form */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } }
  };
  // Urgent text goes to the dialog's role=alert, the rest to its polite status (Z.announce).
  function say(msg, urgent) {
    var d = Z.topDialog && Z.topDialog();
    if (!urgent || !d) { Z.announce(msg); return; }
    var l = d.querySelector('[role="alert"]'); if (!l) { Z.announce(msg); return; }
    l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 50);
  }
  Z.dlg = { byId: byId, visible: visible, store: store, say: say, P: P, plural: plural, closeSheet: function () { closeSheet({ noFocus: true }); } };

  // ---------- who / when ----------
  // The sheet is where the list row's "who" lives: who added it and when, who bought it and when.
  function addedText(it) { return 'Added by ' + Shop.who(it.createdBy) + ' · ' + Shop.stamp(it.createdAt); }
  function boughtText(it) { return 'Bought by ' + (!Z.solo && it.boughtBy === Z.me ? 'you' : Shop.who(it.boughtBy)) + ' · ' + Shop.stamp(it.boughtAt); }
  function byLine(who, text, cls) { return '<p class="ish-by' + (cls ? ' ' + cls : '') + '">' + (Z.solo ? '' : Z.av(who, 'xs')) + '<span>' + esc(text) + '</span></p>'; }
  function removedBy(by, name) { return !by || Z.solo ? name + ' was deleted.' : Z.name(by) + ' deleted ' + name + '.'; }

  // ======================================== the item sheet ========================================
  var sh, shBody, SH = null;

  function reasonsHTML(list) { // [[id, text]] beside the aria-disabled controls; read again on press
    return list.length ? '<p class="ish-reasons">' + list.map(function (r) { return '<span id="' + r[0] + '">' + Z.svg('cloudOff') + esc(r[1]) + '</span>'; }).join('') + '</p>' : '';
  }
  function off(id) { return ' aria-disabled="true" aria-describedby="' + id + '"'; }
  function headHTML(title) {
    return '<div class="ish-head"><h2 id="ish-h" class="ish-title" tabindex="-1" dir="auto">' + esc(title) + '</h2>' +
      '<button type="button" class="icon-btn" data-act="close" aria-label="' + C.close + '">' + Z.svg('x') + '</button></div>';
  }
  function sumLine(it) { // the quantity with its unit: "2 L", "500 g", "1 kg", "3 pcs", "1 pc"
    return '<p class="ish-sum num"><span class="vh">' + C.quantity + ' </span>' + esc(Shop.qtyText(it.quantity, it.unit)) + '</p>';
  }
  function itemHTML(it) {
    var h = headHTML(it.name) + sumLine(it);
    h += '<dl class="ish-facts"><div class="ish-row"><dt>' + C.category + '</dt><dd dir="auto">' + esc(it.category || C.other) + '</dd></div></dl>';
    if (it.notes) h += '<div class="ish-notes"><h3 class="ish-label">' + C.notes + '</h3><p dir="auto">' + esc(it.notes) + '</p></div>';
    h += byLine(it.createdBy, addedText(it));
    if (it.boughtAt) h += '<p class="ish-by ish-done">' + Z.svg('check') + '<span>' + esc(boughtText(it)) + '</span></p>';
    if (it.pending) h += '<p class="queued ish-queued">' + Z.svg('cloudOff') + '<span>' + C.queued + '</span></p>';
    if (it.failed) {
      h += '<div class="notice notice-danger ish-failed" role="group" aria-label="' + esc(it.name) + '">' + Z.svg('alert') + '<span>' + C.failedBody + '</span></div>' +
        '<div class="ish-acts"><button type="button" class="btn-sec" data-act="retry" aria-label="' + esc('Try again: ' + it.name) + '">' + Z.svg('refresh') + C.retry + '</button>' +
        '<button type="button" class="btn-danger" data-act="remove" aria-label="' + esc('Remove ' + it.name + ' from the queue') + '">' + Z.svg('trash') + 'Remove</button></div>';
      return h;
    }
    var why = [], editOff = '', delOff = '';
    if (it.unsynced) { editOff = off('ish-why-edit'); why.push(['ish-why-edit', C.rQueued]); }
    else if (Z.offline) { editOff = off('ish-why-edit'); why.push(['ish-why-edit', C.rEdit]); delOff = off('ish-why-del'); why.push(['ish-why-del', C.rDelete]); }
    var acts = '';
    if (it.boughtAt) acts += '<button type="button" class="btn-sec" data-act="put-back" aria-label="' + esc(C.putBack + ': ' + it.name) + '">' + C.putBack + '</button>';
    acts += '<button type="button" class="btn-sec" data-act="edit" aria-label="' + esc('Edit ' + it.name) + '"' + editOff + '>' + Z.svg('pencil') + C.edit + '</button>';
    if (it.unsynced) acts += '<button type="button" class="btn-danger ish-del" data-act="remove" aria-label="' + esc('Remove ' + it.name + ' from the queue') + '">' + Z.svg('trash') + C.remove + '</button>';
    else acts += '<button type="button" class="btn-danger ish-del" data-act="delete" aria-label="' + esc('Delete ' + it.name) + '"' + delOff + '>' + Z.svg('trash') + C.del + '</button>';
    return h + '<div class="ish-acts">' + acts + '</div>' + reasonsHTML(why);
  }
  function goneHTML() {
    return headHTML(SH.name) + '<p class="ish-gone" id="ish-gone">' + esc(removedBy(SH.deleted.by, SH.name)) + '</p>' +
      '<div class="ish-acts"><button type="button" class="btn-sec" data-act="close" data-f="gone-close" aria-describedby="ish-gone">' + C.close + '</button></div>';
  }
  function renderSheet() {
    var it = Z.item(SH.id);
    if (it) SH.name = it.name;
    if (SH.deleted || !it) { if (!SH.deleted) SH.deleted = { by: 'b' }; shBody.innerHTML = goneHTML(); return; }
    shBody.innerHTML = itemHTML(it);
  }
  function keepSheetFocus(fn) {
    var a = document.activeElement, act = a && sh.contains(a) ? a.getAttribute('data-act') || a.id : null;
    fn();
    var el = act && (shBody.querySelector('[data-act="' + act + '"]') || byId(act));
    if (el && visible(el)) el.focus({ preventScroll: true }); else if (act) byId('ish-h').focus({ preventScroll: true });
  }

  // History: the sheet has no URL, but Back must close it (and only it). One entry is pushed on open.
  function pushEntry() {
    var s = history.state || {};
    history.pushState({ zIdx: (s.zIdx || 1) + 1, pushedQuery: false, sheet: 1 }, '', location.href);
    return true;
  }
  function openSheet(id) {
    var it = Z.item(id); if (!it) return;
    if (Z.form && Z.form.isOpen()) return; // forms and sheets don't stack
    if (!SH) SH = { id: id, name: it.name, pushed: false, deleted: null };
    else { SH.id = id; SH.deleted = null; }
    if (!SH.pushed) SH.pushed = pushEntry();
    renderSheet();
    if (!sh.open) sh.showModal();
    Z.placeSheet(sh);
    sh.scrollTop = 0;
    byId('ish-h').focus({ preventScroll: true }); // the title names the sheet
  }
  // after: runs once the history entry is gone (Edit pushes the form's entry only after this one is popped)
  function closeSheet(o) {
    o = o || {};
    var s = SH; if (!s) { if (o.after) o.after(); return; }
    SH = null;
    if (sh.open) sh.close();
    shBody.innerHTML = '';
    if (!o.noFocus) setTimeout(function () { Shop.focusRow(s.id); }, 0);
    if (s.pushed && !o.fromPop) {
      s.pushed = false;
      var ran = false, go = function () { if (ran) return; ran = true; if (o.after) o.after(); };
      if (o.after) { window.addEventListener('popstate', function () { go(); }, { once: true }); setTimeout(go, 300); }
      history.back();
    } else if (o.after) o.after();
  }
  window.addEventListener('popstate', function () {
    if (SH && SH.pushed && !(history.state && history.state.sheet)) {
      if (SH.asking) { pushEntry(); return; } // Back with a confirm open dismisses the confirm only (it has its own entry); keep the sheet's entry armed
      SH.pushed = false; closeSheet({ fromPop: true });
    }
  });
  window.addEventListener('hashchange', function () { setTimeout(function () { if (SH && Z.route && Z.route.view !== 'list') closeSheet({ noFocus: true }); }, 0); });

  // ---------- delete ----------
  function deleteBody(it) {
    var date = Shop.stamp(it.createdAt, true), who = it.createdBy === Z.me ? 'You' : Z.name(it.createdBy);
    return P([who + ' added it ' + date + '. It will be removed' + (Z.solo ? '.' : ' for both of you.')]);
  }
  function undoToast(msg, label, restore, okMsg) {
    var items = restore;
    Z.toast({ msg: msg, undoLabel: label, undo: function () {
      if (Z.offline) { Z.toast({ msg: C.undo, ms: 4000 }); return; }
      var back = Z.restore(items).items;
      if (back.length) { Shop.focusRow(back[0].id); Z.toast({ msg: okMsg(back), ms: 4000 }); } // focus lands on the restored row (fix pass A2)
    } });
  }
  function deleteNow(it, o) {
    var near = Shop.neighbour(it.id), r = Z.deleteItem(it.id);
    closeSheet({ noFocus: true });
    setTimeout(function () {
      if (r.notFound) { Z.toast({ msg: it.name + ' was already removed.', ms: 4000 }); Shop.focusRow(near); return; }
      Shop.focusRow(near);
      if (o && o.queued) undoToast('Removed ' + it.name, 'Undo: Removed ' + it.name, [r.item], function () { return 'Restored ' + it.name; });
      else undoToast('Deleted ' + it.name, 'Undo: Deleted ' + it.name, [r.item], function () { return 'Restored ' + it.name; });
    }, 0);
  }
  function sheetDelete() {
    var s = SH, it = s && Z.item(s.id); if (!it) return;
    s.asking = true;
    var ok = byId('confirm-ok');
    ok.setAttribute('aria-label', 'Delete ' + it.name);
    Z.confirm({ title: 'Delete ' + it.name + '?', body: deleteBody(it), confirm: C.del, cancel: C.keepIt }).then(function (yes) {
      ok.removeAttribute('aria-label');
      s.asking = false;
      if (!yes || SH !== s) return;
      s.busy = true;
      deleteNow(it);
    });
  }
  function sheetRemoveQueued() { // a queued, unsynced add: cancel it, offline too; no confirm (it never reached the partner)
    var it = Z.item(SH.id); if (!it) return;
    SH.busy = true; deleteNow(it, { queued: true });
  }
  function sheetRetry() {
    var it = Z.item(SH.id); if (!it) return;
    it.failed = false;
    if (Z.offline) { it.pending = true; it.unsynced = true; } else { it.pending = false; it.unsynced = false; }
    keepSheetFocus(renderSheet);
    Z.emit('change', { type: 'synced', item: it, by: Z.me, source: 'me' });
  }

  function onSheetClick(e) {
    var el = e.target.closest('[data-act]'); if (!el || !sh.contains(el) || !SH) return;
    if (el.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      var d = (el.getAttribute('aria-describedby') || '').split(' ')[0], r = d && byId(d);
      if (r) say(r.textContent);
      return;
    }
    var act = el.dataset.act, id = SH.id;
    if (act === 'close') closeSheet();
    else if (act === 'edit') closeSheet({ noFocus: true, after: function () { Z.dialogs.itemForm({ id: id }); } });
    else if (act === 'delete') sheetDelete();
    else if (act === 'remove') sheetRemoveQueued();
    else if (act === 'retry') sheetRetry();
    else if (act === 'put-back') {
      var it = Z.item(id); if (!it) return;
      Z.setBought(id, false);
      closeSheet({ noFocus: true });
      setTimeout(function () { Shop.focusRow(id); Z.announce(it.name + ' is back on the list.'); }, 0);
    }
  }
  function sheetOnChange(ev) {
    if (SH.busy) return;
    var id = SH.id, gone = (ev.type === 'deleted' && ev.item && ev.item.id === id) || (ev.type === 'cleared' && (ev.items || []).some(function (x) { return x.id === id; }));
    if (gone) {
      if (ev.source === 'me') return;
      SH.deleted = { by: ev.by };
      renderSheet();
      var b = shBody.querySelector('[data-f="gone-close"]'); if (b) b.focus();
      return; // the list announces "Youssef removed Mint."; it is mirrored into this dialog's status
    }
    if (SH.deleted) return;
    if ((ev.item && ev.item.id === id) || (ev.items || []).some(function (x) { return x.id === id; })) keepSheetFocus(renderSheet);
  }
  function buildSheet() {
    sh = document.createElement('dialog');
    sh.id = 'item-sheet';
    sh.className = 'sheet ish';
    sh.setAttribute('aria-labelledby', 'ish-h');
    sh.innerHTML = '<div class="ish-body" id="ish-body"></div><p class="vh dlg-live" role="status"></p><p class="vh" role="alert"></p>';
    document.body.appendChild(sh);
    shBody = byId('ish-body');
    Z.backdropClose(sh, function () { if (SH && !SH.asking) closeSheet(); });
    sh.addEventListener('click', onSheetClick);
    sh.addEventListener('cancel', function (e) { e.preventDefault(); if (SH && !SH.asking) closeSheet(); });
    sh.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); if (SH && !SH.asking) closeSheet(); } });
    sh.addEventListener('close', function () { if (SH) { var s = SH; SH = null; shBody.innerHTML = ''; if (s.pushed) { s.pushed = false; history.back(); } } });
  }

  // ======================================== clear bought ========================================
  var CB = null;
  function clearTexts(n) {
    return { title: plural(n, 'Clear ' + n + ' bought item?', 'Clear ' + n + ' bought items?'), ok: plural(n, 'Clear ' + n + ' item', 'Clear ' + n + ' items'), keep: plural(n, 'Keep it', 'Keep them') };
  }
  function clearBought() {
    if (CB) return;
    var tidy = document.querySelector('#view [data-act="tidy"]'); if (tidy) tidy.click(); // the dialog's count and the group must agree
    var btn = document.querySelector('#view [data-act="clear"]'); if (btn) Z.focus(btn); // Keep it returns here
    var n = Shop.totals().boughtCount; if (!n) return;
    var t = clearTexts(n);
    CB = { n: n };
    Z.confirm({ title: t.title, body: P([Z.solo ? 'They\'ll be removed.' : 'They\'ll be removed for both of you.']), confirm: t.ok, cancel: t.keep }).then(function (yes) {
      CB = null;
      if (!yes) return;
      var r = Z.clearBought(), c = r.items.length;
      Z.focusPrimary();
      var msg = plural(c, 'Cleared 1 item', 'Cleared ' + c + ' items');
      undoToast(msg, 'Undo: ' + msg, r.items, function (b) { return plural(b.length, 'Restored 1 item', 'Restored ' + b.length + ' items'); });
    });
  }
  // The partner ticks (or clears) while the confirm is open: the count follows and is announced (F6 U3).
  function clearOnChange() {
    var dlg = byId('confirm'); if (!CB || !dlg.open) return;
    var n = Shop.totals().boughtCount;
    if (n === CB.n) return;
    if (!n) { byId('confirm-cancel').click(); Z.announce('There is nothing left to clear.'); return; }
    var t = clearTexts(n); CB.n = n;
    byId('confirm-h').textContent = t.title; byId('confirm-ok').textContent = t.ok; byId('confirm-cancel').textContent = t.keep;
    Z.announce('The list changed. Now clearing ' + n + ' bought ' + plural(n, 'item', 'items') + '.');
  }

  Z.on('change', function (ev) { if (SH) sheetOnChange(ev); clearOnChange(); });
  Z.on('connection', function () { if (SH && !SH.deleted) keepSheetFocus(renderSheet); });

  // ---------- fixtures ----------
  var FIXTURES = ['item-sheet', 'item-sheet-bought', 'item-gone', 'delete-confirm', 'clear-bought-confirm', 'clear-bought-live'];
  var first = true;
  Z.on('route', function (r) {
    if (!first) return; first = false;
    var f = r.view === 'list' ? Z.fixture('list') : null;
    if (!f || FIXTURES.indexOf(f) < 0) return;
    setTimeout(function () {
      switch (f) {
        case 'item-sheet': openSheet('olive-oil'); break;
        case 'item-sheet-bought': openSheet('milk'); break;
        case 'item-gone': openSheet('mint'); setTimeout(function () { Z.partner.deleteItem('mint'); }, 600); break;
        case 'delete-confirm': openSheet('mint'); sheetDelete(); break;
        case 'clear-bought-confirm': clearBought(); break;
        case 'clear-bought-live': clearBought(); setTimeout(function () { Z.partner.setBought('butter', true); }, 1200); break;
      }
    }, 0);
  });

  // ---------- the contract ----------
  buildSheet();
  Z.dialogs = {
    itemSheet: openSheet,
    itemForm: function (o) { if (Z.form) Z.form.open(o || {}); },
    fromRoute: function (route) {
      var r = Z.route || route;
      if (!Z.form) return false;
      if (!r || r.view !== 'list') { Z.form.leave(); return false; }
      return Z.form.fromRoute(r);
    },
    closeAll: function () { if (SH) closeSheet({ noFocus: true }); if (Z.form) Z.form.closeAll(); },
    clearBought: clearBought
  };
})();
