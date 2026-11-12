/* Zamane Shopping prototype, part 2b: the item form (add with details, edit). Direction A · Aisle ledger.
   Plain script, no modules. Loaded after dialogs.js, which shares Z.dlg (store, say, P …) and calls Z.form.

   ─── What lives here ──────────────────────────────────────────────────────────────────────
   #item-form   a URL-backed dialog: #/shopping?item=new[&name=<typed>] or ?item=<id>. Bottom sheet on phones (tall,
                keyboard-aware through Z.placeSheet, footer always visible), centred 28 rem from 48 rem.
                Back closes it behind the discard guard; a reload restores the draft ("Draft restored.").
   Fields: Name · Quantity (whole number 1 to 9999, - / + steppers) · Unit (select: piece, L, g, kg) · Category (combobox over Z.shop.categories()) · Notes.
   Edit: base updatedAt held; Z.updateItem(...) → {conflict} runs the three-way merge (marks + Use theirs) and the
         person saves again. The partner's live edit runs the same merge before Save. A deleted item swaps in a banner.
   Offline: edit Save is aria-disabled with the reason, the draft is kept; a new item still queues ("will be added").
   Z.form = { open({id|null}), fromRoute(route), leave(), closeAll(), isOpen() }
   Fixtures (?state=): item-form (new) · item-form-edit · item-form-invalid · item-form-offline ·
     item-form-conflict (409) · item-form-live (the partner's edit arrives live) · item-form-gone.
   ───────────────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var Z = window.Z, D = Z.dlg, esc = Z.esc, svg = Z.svg, Shop = Z.shop, byId = D.byId, store = D.store, P = D.P, say = D.say, visible = D.visible;
  var MAX = { name: 120, category: 60, notes: 4000, qty: 9999 }, NAME_COUNT_FROM = 100, NOTES_COUNT_FROM = 3800;
  if (!Z.ICON.minus) Z.ICON.minus = '<path d="M5 12h14"/>';
  var LATENCY = 350, DRAFT = 'zamane.shopping.draft:';

  // ---------- strings (copy.md) ----------
  var C = {
    titleNew: 'Add item', titleEdit: 'Edit item', close: 'Close', cancel: 'Cancel', add: 'Add item', save: 'Save changes', saving: 'Saving…',
    name: 'Name', nameEmpty: 'Add a name.', dup: function (it) { return it.name + ' is already on the list' + (it.category ? ' (' + it.category + ')' : '') + '.'; },
    qty: 'Quantity', dec: 'Decrease quantity', inc: 'Increase quantity', qtyErr: 'Use a whole number from 1.', unit: 'Unit',
    cat: 'Category', catHelp: 'Optional. Items with no category go under Other.', catList: 'Existing categories', catNone: 'No matching category. This will be a new one.',
    notes: 'Notes', notesHelp: 'Optional. Brand, size, or where to find it.',
    restored: 'Draft restored.', discardDraft: 'Discard draft', saveFail: 'Couldn\'t save. Try again.',
    rSave: 'You\'re offline. You can save your changes when you\'re back online. What you\'ve changed stays here.',
    rNew: 'You\'re offline. This item will be added when you\'re back online.', onSave: 'Back online. You can save your changes now.',
    copy: 'Copy text', copied: 'Text copied', copyFailed: 'Couldn\'t copy. Select the text and copy it by hand.',
    useTheirs: 'Use theirs', resolved: 'Their version is in the field.', saved: 'Saved.',
    dTitle: 'Discard changes?', dBody: 'What you\'ve typed won\'t be kept.', keepEditing: 'Keep editing', discard: 'Discard'
  };
  function tooLong(n) { return 'Use ' + Z.fmt(n) + ' characters or fewer.'; }
  function left(n) { return n + ' ' + Z.plural(n, 'character left', 'characters left'); }
  function sErrors(n) { return n === 1 ? 'Fix 1 field to continue.' : 'Fix ' + n + ' fields to continue.'; }
  function sNoticeFull(a) {
    return a.kind === 'partner' ? a.name + ' changed this item while you were editing. Check the marked fields, then save again.'
      : a.kind === 'self' ? 'This item changed on your other device while you were editing. Check the marked fields, then save again.'
      : 'This item changed on another phone while you were editing. Check the marked fields, then save again.';
  }
  function sChangedBy(a) { return a.kind === 'partner' ? 'Changed by ' + a.name : a.kind === 'self' ? 'Changed on your other device' : 'Changed on another phone'; }
  function sConflict(a, v) {
    return a.kind === 'partner' ? a.name + ' changed this to "' + v + '".' : a.kind === 'self' ? 'Your other device changed this to "' + v + '".' : 'Another phone changed this to "' + v + '".';
  }
  function sGone(name, by) { return (by && !Z.solo ? Z.name(by) + ' deleted ' + name + '.' : name + ' was deleted.') + ' This can\'t be saved.'; }
  function actorOf(ev) { return ev.source === 'partner' ? { kind: 'partner', id: ev.by, name: Z.name(ev.by) } : { kind: 'other' }; }

  // ---------- state ----------
  var fd, fBody, F = null, leaving = null, persistTimer = null, savedMsgs = null, FIX = null;
  function $(s) { return fd ? fd.querySelector(s) : null; }

  // ---------- the fields ----------
  var FIELDS = {
    name: { input: 'if-name', err: 'if-name-err', mark: 'if-name-mark', help: ['if-name-dup', 'if-name-count'], label: 'Name',
      read: function () { return byId('if-name').value; }, write: function (v) { byId('if-name').value = v == null ? '' : v; },
      norm: function (v) { return String(v == null ? '' : v).trim(); }, shown: function (v) { return v; } },
    quantity: { input: 'if-qty', err: 'if-qty-err', mark: 'if-qty-mark', help: [], label: 'Quantity',
      read: function () { return byId('if-qty').value; }, write: function (v) { byId('if-qty').value = v == null ? '1' : String(v); },
      norm: function (v) { return String(v == null ? '' : v).trim(); }, shown: function (v) { return String(v); } },
    category: { input: 'if-cat', err: 'if-cat-err', mark: 'if-cat-mark', help: ['if-cat-help', 'if-cat-match', 'if-cat-none'], label: 'Category',
      read: function () { return byId('if-cat').value; }, write: function (v) { byId('if-cat').value = v == null ? '' : v; },
      norm: function (v) { return String(v == null ? '' : v).trim(); }, shown: function (v) { return v || 'Other'; } },
    unit: { input: 'if-unit', err: 'if-unit-err', mark: 'if-unit-mark', help: [], label: 'Unit',
      read: function () { return byId('if-unit').value; }, write: function (v) { byId('if-unit').value = v || 'piece'; },
      norm: function (v) { return String(v || 'piece'); }, shown: function (v) { return Shop.unitLabel(v); } },
    notes: { input: 'if-notes', err: 'if-notes-err', mark: 'if-notes-mark', help: ['if-notes-help', 'if-notes-count'], label: 'Notes',
      read: function () { return byId('if-notes').value; }, write: function (v) { byId('if-notes').value = v == null ? '' : v; },
      norm: function (v) { return String(v == null ? '' : v).trim(); }, shown: function (v) { v = String(v || ''); return v.length > 60 ? v.slice(0, 60) + '…' : v || 'no notes'; } }
  };
  var ORDER = ['name', 'quantity', 'unit', 'category', 'notes'];
  var VALID = {
    name: function () { var v = byId('if-name').value.trim(); return !v ? C.nameEmpty : v.length > MAX.name ? tooLong(MAX.name) : ''; },
    quantity: function () {
      var v = byId('if-qty').value.trim();
      if (!/^\d+$/.test(v) || parseInt(v, 10) < 1) return C.qtyErr;
      return parseInt(v, 10) > MAX.qty ? 'Use a number up to ' + MAX.qty + '.' : '';
    },
    category: function () { return byId('if-cat').value.trim().length > MAX.category ? tooLong(MAX.category) : ''; },
    unit: function () { return ''; },
    notes: function () { return byId('if-notes').value.trim().length > MAX.notes ? tooLong(MAX.notes) : ''; }
  };
  function values() { var o = {}; ORDER.forEach(function (f) { o[f] = FIELDS[f].read(); }); return o; }
  function snapshot(rec) { return { name: rec.name, quantity: rec.quantity, unit: rec.unit || 'piece', category: rec.category || '', notes: rec.notes || '' }; }
  function dirty() { return !!F && JSON.stringify(values()) !== F.initialJSON; }

  function describe(f) {
    var d = FIELDS[f], el = byId(d.input); if (!el) return;
    var ids = [];
    if (F.errors[f]) ids.push(d.err);
    d.help.forEach(function (id) { var h = byId(id); if (h && !h.hidden && h.textContent) ids.push(id); });
    if (F.marks[f]) ids.push(d.mark + '-text');
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
  }
  function describeAll() { ORDER.forEach(describe); }
  function setError(f, msg) {
    var d = FIELDS[f], el = byId(d.err), inp = byId(d.input);
    F.errors[f] = msg || '';
    el.hidden = !msg; el.innerHTML = msg ? svg('alert') + '<span>' + esc(msg) + '</span>' : '';
    if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
    var w = inp.closest('.field'); if (w) w.classList.toggle('is-invalid', !!msg);
    describe(f);
  }
  function validateAll() {
    var first = null, n = 0;
    ORDER.forEach(function (f) { F.touched[f] = true; var m = VALID[f](); setError(f, m); if (m) { n++; if (!first) first = f; } });
    return { first: first, n: n };
  }
  function focusField(f) { var el = byId(FIELDS[f].input); if (el) el.focus(); }
  function fieldOf(el) { for (var f in FIELDS) if (FIELDS[f].input === el.id) return f; return null; }

  // ---------- counters, combobox feed-forward ----------
  function syncCounters() {
    var n = byId('if-name').value.length, c = byId('if-name-count');
    c.hidden = n < NAME_COUNT_FROM; c.textContent = n < NAME_COUNT_FROM ? '' : left(MAX.name - n);
    var m = byId('if-notes').value.length, k = byId('if-notes-count');
    k.hidden = m < NOTES_COUNT_FROM; k.textContent = m < NOTES_COUNT_FROM ? '' : left(MAX.notes - m);
    syncDup();
    describe('name'); describe('notes');
  }
  // A new item named like one still to buy: a quiet hint, as the old add field gave (read once, then on change)
  var lastDup = '';
  function syncDup() {
    var el = byId('if-name-dup'), dup = F && !F.editing ? Shop.duplicate(byId('if-name').value.trim()) : null, t = dup ? C.dup(dup) : '';
    el.hidden = !t; el.textContent = t;
    if (t && t !== lastDup) Z.announce(t);
    lastDup = t;
  }
  var noneShown = false;
  function syncCategory() {
    var typed = byId('if-cat').value.trim(), m = byId('if-cat-match'), none = byId('if-cat-none');
    var sp = typed ? Shop.spelling(typed) : '';
    var matchText = typed && sp && sp !== typed ? 'Will be filed under "' + sp + '".' : '';
    m.hidden = !matchText; m.textContent = matchText;
    var isNew = !!typed && !Shop.categories().some(function (c) { return c.key === Shop.key(typed); }) && !Shop.categories().some(function (c) { return c.key.indexOf(Shop.key(typed)) > -1; });
    none.hidden = !isNew; none.textContent = isNew ? C.catNone : '';
    if (isNew && !noneShown) Z.announce(C.catNone);
    noneShown = isNew;
    describe('category');
  }

  // ---------- category combobox (ARIA 1.2: focus stays in the input) ----------
  var CB = { open: false, list: [], active: -1 };
  function cbOptions() {
    var k = Shop.key(byId('if-cat').value), all = Shop.categories();
    return k ? all.filter(function (c) { return c.key.indexOf(k) > -1; }) : all;
  }
  function cbRender() {
    var ul = byId('if-cat-list'), inp = byId('if-cat');
    ul.innerHTML = CB.list.map(function (c, i) { return '<li role="option" id="if-opt-' + i + '" class="if-opt" aria-selected="' + (i === CB.active) + '" dir="auto">' + esc(c.name) + '</li>'; }).join('');
    ul.hidden = !CB.open || !CB.list.length;
    inp.setAttribute('aria-expanded', String(CB.open && CB.list.length > 0));
    if (CB.open && CB.active > -1) inp.setAttribute('aria-activedescendant', 'if-opt-' + CB.active); else inp.removeAttribute('aria-activedescendant');
    var a = byId('if-opt-' + CB.active); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
  }
  var cbTimer = null;
  function cbOpen(announce) {
    CB.list = cbOptions(); CB.open = CB.list.length > 0; CB.active = -1; cbRender();
    clearTimeout(cbTimer);
    if (CB.open && announce) Z.announce(CB.list.length + ' ' + Z.plural(CB.list.length, 'suggestion', 'suggestions'));
  }
  // After typing: one count, once the person pauses (fix pass)
  function cbAnnounceSoon() {
    clearTimeout(cbTimer);
    cbTimer = setTimeout(function () { if (CB.open && CB.list.length) Z.announce(CB.list.length + ' ' + Z.plural(CB.list.length, 'suggestion', 'suggestions')); }, 600);
  }
  function cbClose() { if (!CB.open) return; CB.open = false; CB.active = -1; cbRender(); }
  function cbPick(i) {
    var c = CB.list[i]; if (!c) return;
    byId('if-cat').value = c.name; F.touched.category = true; cbClose(); syncCategory(); afterEdit();
  }
  function cbKey(e) {
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (!CB.open) { cbOpen(true); if (!CB.open) return; CB.active = k === 'ArrowDown' ? 0 : CB.list.length - 1; }
      else CB.active = (CB.active + (k === 'ArrowDown' ? 1 : -1) + CB.list.length) % CB.list.length;
      cbRender();
    } else if (k === 'Enter' && CB.open && CB.active > -1) { e.preventDefault(); cbPick(CB.active); }
    else if ((k === 'Home' || k === 'End') && CB.open && CB.active > -1) { e.preventDefault(); CB.active = k === 'Home' ? 0 : CB.list.length - 1; cbRender(); }
    else if (k === 'Escape' && CB.open) { e.preventDefault(); e.stopPropagation(); cbClose(); }
    else if (k === 'Tab') cbClose();
  }

  // ---------- quantity ----------
  function step(d) {
    var el = byId('if-qty'), n = parseInt(el.value, 10);
    if (isNaN(n)) n = 1; else n += d;
    el.value = String(Math.min(MAX.qty, Math.max(1, n)));
    F.touched.quantity = true; setError('quantity', VALID.quantity()); afterEdit();
  }

  // ---------- the footer: label, offline reason, summary ----------
  function connMsgs() {
    if (!savedMsgs) savedMsgs = { off: Z.offlineMessage, on: Z.onlineMessage };
    Z.offlineMessage = F.editing ? C.rSave : C.rNew;
    Z.onlineMessage = F.editing ? C.onSave : 'Back online.';
  }
  function restoreConn() { if (!savedMsgs) return; Z.offlineMessage = savedMsgs.off; Z.onlineMessage = savedMsgs.on; savedMsgs = null; }
  function paintBar() {
    if (!F) return;
    var b = byId('if-submit'), why = byId('if-why'), bar = byId('if-bar');
    bar.hidden = !!F.banner;
    var label = F.editing ? C.save : C.add, blocked = false, msg = '';
    if (F.saving) { label = C.saving; blocked = true; }
    else if (Z.offline && F.editing) { blocked = true; msg = C.rSave; }
    else if (Z.offline) msg = C.rNew;
    else if (F.failed) msg = F.failed;
    b.textContent = label;
    if (blocked) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    why.hidden = !msg;
    why.className = 'if-why' + (F.failed && !Z.offline ? ' is-error' : '');
    why.innerHTML = msg ? svg(Z.offline ? 'cloudOff' : 'alert') + '<span>' + esc(msg) + '</span>' : '';
    if (msg) b.setAttribute('aria-describedby', 'if-why'); else b.removeAttribute('aria-describedby');
    paintHead();
  }
  function paintHead() {
    var h = byId('if-h'); if (h) h.textContent = F.editing ? C.titleEdit : C.titleNew;
  }
  function setSummary(n) {
    var s = byId('if-summary'); // role="alert" from the start and never hidden: an empty alert collapses, a filled one is announced
    s.textContent = n ? sErrors(n) : '';
  }

  // ---------- form body ----------
  function fieldHTML(f, label, inner, help, markOutside) {
    var d = FIELDS[f];
    return '<div class="if-g" id="if-g-' + f + '">' + label + inner +
      (help || '') + '<p class="err" id="' + d.err + '" hidden></p>' + (markOutside ? '' : '<div id="' + d.mark + '" class="if-markslot"></div>') + '</div>';
  }
  function bodyHTML() {
    var h = '<div class="if-slot" id="if-banner"></div><div class="if-slot" id="if-restored"></div><div class="if-slot" id="if-merge"></div>';
    h += fieldHTML('name', '<label class="field-label" for="if-name">' + C.name + '<span class="vh"> (required)</span></label>',
      '<div class="field"><input id="if-name" type="text" maxlength="' + MAX.name + '" autocomplete="off" autocapitalize="sentences" enterkeyhint="next" aria-required="true" dir="auto"></div>',
      '<p class="help if-ff" id="if-name-dup" hidden></p><p class="help if-count" id="if-name-count" hidden></p>');
    var qty = fieldHTML('quantity', '<label class="field-label" for="if-qty">' + C.qty + '</label>',
      '<div class="if-step"><button type="button" class="icon-btn if-stepbtn" data-act="dec" aria-label="' + C.dec + '">' + svg('minus') + '</button>' +
      '<div class="field field-num"><input id="if-qty" type="text" inputmode="numeric" autocomplete="off" maxlength="4" enterkeyhint="next"></div>' +
      '<button type="button" class="icon-btn if-stepbtn" data-act="inc" aria-label="' + C.inc + '">' + svg('plus') + '</button></div>', '', true);
    var unit = fieldHTML('unit', '<label class="field-label" for="if-unit">' + C.unit + '</label>',
      '<div class="field field-select"><select id="if-unit">' + Shop.units.map(function (u) { return '<option value="' + u.code + '">' + esc(u.label) + '</option>'; }).join('') + '</select>' + svg('chevron', 'sel-ic') + '</div>', '', true);
    // The two marks sit under the pair, full width: a conflict line needs the room.
    h += '<div class="if-pair">' + qty + unit + '</div><div class="if-g if-markrow"><div id="if-qty-mark" class="if-markslot"></div><div id="if-unit-mark" class="if-markslot"></div></div>';
    h += fieldHTML('category', '<label class="field-label" for="if-cat">' + C.cat + '</label>',
      '<div class="if-combo"><div class="field"><input id="if-cat" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="if-cat-list" maxlength="' + (MAX.category + 20) + '" autocomplete="off" autocapitalize="words" enterkeyhint="next" dir="auto"></div>' +
      '<ul id="if-cat-list" class="if-list" role="listbox" aria-label="' + C.catList + '" hidden></ul></div>',
      '<p class="help" id="if-cat-help">' + esc(C.catHelp) + '</p><p class="help if-ff" id="if-cat-match" hidden></p><p class="help if-ff" id="if-cat-none" hidden></p>');
    h += fieldHTML('notes', '<label class="field-label" for="if-notes">' + C.notes + '</label>',
      '<div class="field"><textarea id="if-notes" rows="3" maxlength="' + (MAX.notes + 100) + '" autocomplete="off" dir="auto"></textarea></div>',
      '<p class="help" id="if-notes-help">' + esc(C.notesHelp) + '</p><p class="help if-count" id="if-notes-count" hidden></p>');
    return h;
  }
  function buildForm() {
    fd = document.createElement('dialog');
    fd.id = 'item-form';
    fd.className = 'sheet if-form';
    fd.setAttribute('aria-labelledby', 'if-h');
    fd.innerHTML =
      '<form class="if-f" id="if-f" novalidate>' +
        '<div class="if-head"><h2 id="if-h" tabindex="-1"></h2>' +
          '<button type="button" class="icon-btn" data-act="close" aria-label="' + C.close + '">' + svg('x') + '</button></div>' +
        '<div class="if-body" id="if-body"></div>' +
        '<div class="if-bar" id="if-bar">' +
          '<p class="if-why" id="if-why" hidden></p><p class="err if-summary" id="if-summary" role="alert"></p>' +
          '<div class="if-acts"><button type="button" class="btn-sec" data-act="close">' + C.cancel + '</button>' +
          '<button type="submit" class="btn-primary" id="if-submit" aria-keyshortcuts="Control+Enter Meta+Enter"></button></div>' +
        '</div>' +
      '</form><p class="vh dlg-live" role="status"></p><p class="vh" role="alert" id="if-alert"></p>';
    document.body.appendChild(fd);
    fBody = byId('if-body');
    fBody.innerHTML = bodyHTML(); // built once; opening only writes values
    fd.addEventListener('click', onClick);
    fd.addEventListener('submit', function (e) { e.preventDefault(); pressSubmit(); });
    fd.addEventListener('keydown', function (e) {
      if (!F) return;
      if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); requestClose(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); pressSubmit(); }
    });
    fd.addEventListener('cancel', function (e) { e.preventDefault(); if (F) requestClose(); });
    Z.backdropClose(fd, function () { if (F && !F.asking) requestClose(); });
    fd.addEventListener('input', function (e) {
      if (!F) return;
      var t = e.target, f = fieldOf(t);
      if (f) { F.touched[f] = true; if (F.errors[f]) setError(f, VALID[f]()); }
      if (t.id === 'if-cat') { cbOpen(false); cbAnnounceSoon(); syncCategory(); }
      if (t.id === 'if-name' || t.id === 'if-notes') syncCounters();
      if (t.id === 'if-name' && F.errors.name === '' && F.summaryShown) refreshSummary();
      afterEdit();
    });
    fd.addEventListener('focusout', function (e) {
      if (!F) return;
      var t = e.target, f = fieldOf(t);
      if (f && F.touched[f]) setError(f, VALID[f]());
      if (t.id === 'if-cat') cbClose();
      if (t.id === 'if-name' && !F.editing) guessCategory();
    });
    byId('if-cat').addEventListener('keydown', cbKey);
    byId('if-cat').addEventListener('click', function () { if (!CB.open) cbOpen(true); else cbClose(); }); // a second click closes
    byId('if-cat-list').addEventListener('mousedown', function (e) { e.preventDefault(); }); // the input keeps focus
    byId('if-cat-list').addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) cbPick(+li.id.replace('if-opt-', '')); });
    byId('if-qty').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); step(1); } else if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
    });
    if (window.visualViewport) { visualViewport.addEventListener('resize', place); visualViewport.addEventListener('scroll', place); }
    window.addEventListener('pagehide', persistNow);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') persistNow(); });
  }
  function place() { if (fd.open) Z.placeSheet(fd); }
  function refreshSummary() { var n = ORDER.filter(function (f) { return F.errors[f]; }).length; setSummary(n); if (!n) F.summaryShown = false; }
  // Tesler: a new item named like an earlier one is filed like it, visibly, and the person can change it.
  function guessCategory() {
    var c = byId('if-cat'), g = Shop.guess(byId('if-name').value);
    if (g && !c.value.trim() && !F.touched.category) { c.value = g; syncCategory(); afterEdit(); }
  }
  function afterEdit() { paintBar(); schedulePersist(); }

  // ---------- drafts ----------
  function storeKey() { return DRAFT + (Z.state !== 'populated' ? Z.state + ':' : '') + F.key; }
  function persistNow() {
    if (!F || F.closing || F.banner) return;
    if (!dirty()) { store.del(F.storeKey); return; }
    store.set(F.storeKey, { v: 1, values: values(), base: F.base, updatedAt: F.updatedAt });
  }
  function schedulePersist() { clearTimeout(persistTimer); persistTimer = setTimeout(persistNow, 250); }
  function clearDraft() { clearTimeout(persistTimer); if (F) store.del(F.storeKey); }
  function renderRestored() {
    byId('if-restored').innerHTML = F.restored ? '<p class="notice if-restored"><span>' + C.restored + '</span><button type="button" class="link-btn" data-act="discard-draft">' + C.discardDraft + '</button></p>' : '';
  }

  // ---------- merge (Goals §6.7): base B (what I opened), mine M (the fields), theirs T (the row now) ----------
  function merge(T, actor) {
    var n = 0, ts = snapshot(T);
    ORDER.forEach(function (f) {
      var d = FIELDS[f], b = d.norm(F.base[f]), m = d.norm(d.read()), t = d.norm(ts[f]);
      if (b === t) return;                                                                                   // they didn't change it
      if (m === b) { F.marks[f] = { type: 'changed', actor: actor }; d.write(ts[f]); if (F.errors[f]) setError(f, ''); n++; } // only they did
      else if (m !== t) { F.marks[f] = { type: 'conflict', actor: actor, value: ts[f] }; n++; }              // both, differently: keep mine, offer theirs
      else delete F.marks[f];
    });
    F.base = ts; F.updatedAt = T.updatedAt;
    ORDER.forEach(renderMark);
    syncCounters(); syncCategory(); paintBar(); schedulePersist();
    return n;
  }
  function markHTML(f) {
    var m = F.marks[f]; if (!m) return '';
    var d = FIELDS[f], id = d.mark + '-text', who = m.actor.kind === 'partner' ? Z.av(m.actor.id, 'xs') : svg('refresh');
    if (m.type === 'changed') return '<p class="if-mark">' + who + '<span id="' + id + '">' + esc(sChangedBy(m.actor)) + '</span></p>';
    return '<div class="if-mark if-mark-conflict">' + who + '<span class="if-mark-text" id="' + id + '">' + esc(sConflict(m.actor, d.shown(m.value))) + '</span>' +
      '<button type="button" class="link-btn" data-act="use-theirs" data-field="' + f + '" aria-label="' + esc(C.useTheirs + ' for ' + d.label) + '" aria-describedby="' + id + '">' + C.useTheirs + '</button></div>';
  }
  function renderMark(f) {
    var slot = byId(FIELDS[f].mark), a = document.activeElement, had = a && slot.contains(a);
    slot.innerHTML = markHTML(f);
    describe(f);
    if (had) focusField(f);
  }
  function useTheirs(f) {
    var m = F.marks[f]; if (!m) return;
    delete F.marks[f];
    FIELDS[f].write(m.value); setError(f, '');
    renderMark(f); syncCounters(); syncCategory(); afterEdit();
    focusField(f);
    Z.announce(C.resolved);
  }
  function showNotice(a, focus) {
    var slot = byId('if-merge'), text = sNoticeFull(a);
    slot.innerHTML = '<p class="notice if-notice" id="if-notice" role="status" tabindex="-1">' + svg('refresh') + '<span>' + esc(text) + '</span></p>';
    if (focus) byId('if-notice').focus(); else Z.announce(text); // after a 409 focus goes to the notice; live: polite, focus stays
  }

  // ---------- banner: the item was deleted ----------
  function setBanner(by) {
    F.banner = { by: by }; F.saving = false;
    var text = sGone(F.name, by);
    byId('if-banner').innerHTML = '<div class="if-banner"><p class="if-banner-h" id="if-banner-h" tabindex="-1">' + svg('alert') + '<span>' + esc(text) + '</span></p>' +
      '<div class="if-banner-acts"><button type="button" class="btn-sec" data-act="copy">' + C.copy + '</button><button type="button" class="btn-sec" data-act="close-now">' + C.close + '</button></div>' +
      '<p class="caption" id="if-copied" role="status"></p></div>';
    paintBar();
    say(text, true);
    byId('if-banner-h').focus();
    fBody.scrollTop = 0;
  }
  function copyText() {
    var v = values(), text = [v.name.trim(), v.notes.trim()].filter(Boolean).join('\n');
    function done(ok) { byId('if-copied').textContent = ok ? C.copied : C.copyFailed; if (!ok) say(C.copyFailed, true); }
    function fallback() {
      var back = document.activeElement, ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'vh'; fd.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (back) back.focus(); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
  }

  // ---------- open, close ----------
  function showForm() { if (!fd.open) fd.showModal(); Z.placeSheet(fd); }
  function hideForm() { if (fd.open) fd.close(); fd.style.bottom = fd.style.maxHeight = ''; }
  function hashFor(s) { return Z.withQuery({ item: s.key }); }
  function leaveUrl() { setTimeout(function () { Z.go(Z.withQuery({ item: null }), { replace: true }); }, 0); }
  function openForm(r, key) {
    var editing = key !== 'new', rec = editing ? Z.item(key) : null;
    if (editing && (!rec || rec.unsynced || rec.failed)) { leaveUrl(); return false; }  // stale id, or not synced yet: back to the list
    if (Z.dlg.closeSheet) Z.dlg.closeSheet();
    var fix = FIX; FIX = null;
    F = { key: key, editing: editing, id: rec ? rec.id : null, name: rec ? rec.name : '', marks: {}, errors: {}, touched: {},
      opener: null, closing: false, saving: false, banner: null, restored: false };
    F.storeKey = storeKey();
    fd.dataset.mode = editing ? 'edit' : 'new';
    // fresh state
    ORDER.forEach(function (f) { setError(f, ''); byId(FIELDS[f].mark).innerHTML = ''; });
    byId('if-merge').innerHTML = ''; byId('if-banner').innerHTML = ''; setSummary(0); CB.open = false; CB.active = -1; cbRender(); noneShown = false; lastDup = '';
    var init = editing ? snapshot(rec) : { name: '', quantity: 1, unit: 'piece', category: '', notes: '' };
    ORDER.forEach(function (f) { FIELDS[f].write(init[f]); });
    F.base = editing ? snapshot(rec) : null; F.updatedAt = rec ? rec.updatedAt : null;
    F.initialJSON = JSON.stringify(values());
    if (!editing) F.base = init;
    if (fix) store.del(F.storeKey);
    var stored = store.get(F.storeKey);
    if (stored && stored.values && JSON.stringify(stored.values) !== F.initialJSON) {
      ORDER.forEach(function (f) { if (f in stored.values) FIELDS[f].write(stored.values[f]); });
      F.restored = true;
      if (editing && stored.updatedAt && +new Date(stored.updatedAt) !== +new Date(rec.updatedAt)) {
        F.base = stored.base || F.base; F.updatedAt = stored.updatedAt;
        if (merge(rec, { kind: 'other' })) showNotice({ kind: 'other' }, false);
      }
    }
    renderRestored(); syncCounters(); syncCategory(); describeAll();
    connMsgs(); paintBar();
    showForm();
    fd.querySelector('.if-body').scrollTop = 0;
    if (!(fix && formFixture(fix))) byId('if-name').focus({ preventScroll: true });
    return true;
  }
  function land(s) {
    if (s.editing && Z.item(s.id)) Shop.focusRow(s.id); else Z.focusPrimary();
  }
  // Close and leave the query: back if it was pushed by opening, else replace (Z.closeQuery).
  function finish(o) {
    if (!F || F.closing) return;
    var s = F; s.closing = true;
    clearTimeout(persistTimer); restoreConn(); cbClose();
    hideForm();
    F = null;
    leaving = s.key;
    var r = Z.route;
    if (!o.noNav && r && r.query && r.query.item != null) Z.closeQuery('item');
    setTimeout(function () { leaving = null; }, 800);
    setTimeout(function () { if (o.before) o.before(); land(s); if (o.say) Z.announce(o.say); }, 0);
  }
  function leave() { // the route left the list: keep the draft
    if (!F || F.closing) return;
    persistNow(); F.closing = true; restoreConn(); hideForm(); F = null;
  }
  function requestClose() {
    if (!F || F.asking || F.closing) return;
    if (!F.banner && dirty()) askDiscard(); else { clearDraft(); finish({}); }
  }
  function askDiscard() {
    var s = F; s.asking = true;
    Z.confirm({ title: C.dTitle, body: P([C.dBody]), confirm: C.discard, cancel: C.keepEditing }).then(function (yes) {
      if (F !== s) return;
      s.asking = false; s.guardPending = false;
      if (yes) { clearDraft(); finish({}); }
    });
  }
  function discardDraft() {
    var s = F; s.asking = true;
    Z.confirm({ title: C.dTitle, body: P([C.dBody]), confirm: C.discard, cancel: C.keepEditing }).then(function (yes) {
      if (F !== s) return;
      s.asking = false;
      if (!yes) return;
      var init = JSON.parse(s.initialJSON);
      ORDER.forEach(function (f) { FIELDS[f].write(init[f]); setError(f, ''); });
      s.marks = {}; ORDER.forEach(renderMark);
      byId('if-merge').innerHTML = ''; setSummary(0);
      clearDraft(); s.restored = false; renderRestored();
      syncCounters(); syncCategory(); paintBar();
      byId('if-name').focus();
    });
  }

  // ---------- submit ----------
  function pressSubmit() {
    if (!F || F.saving || F.banner || F.closing) return;
    var b = byId('if-submit');
    if (b.getAttribute('aria-disabled') === 'true') { var w = byId('if-why'); if (w && !w.hidden) say(w.textContent); return; }
    var v = validateAll();
    if (v.first) { F.summaryShown = true; setSummary(v.n); focusField(v.first); return; }
    setSummary(0); F.summaryShown = false;
    F.saving = true; F.failed = ''; paintBar();
    var s = F;
    setTimeout(function () { if (F === s && !s.closing) { s.saving = false; commit(); } }, LATENCY); // a double press is ignored while pending
  }
  function fieldsOut() {
    var v = values();
    return { name: v.name.trim(), quantity: parseInt(v.quantity, 10), unit: v.unit, category: v.category.trim(), notes: v.notes.replace(/\s+$/, '') };
  }
  function commit() {
    if (Z.offline && F.editing) { paintBar(); return; }
    var out = fieldsOut(), r;
    if (!F.editing) {
      r = Z.addItem({ name: out.name, quantity: out.quantity, unit: out.unit, category: out.category, notes: out.notes });
      clearDraft();
      finish({});
      return r;
    }
    r = Z.updateItem(F.id, out, { updatedAt: F.updatedAt });
    if (r.notFound) { setBanner(F.deletedBy || 'b'); return; }
    if (r.conflict) { conflict(r.current); return; }
    clearDraft();
    finish({ say: C.saved });
  }
  function conflict(cur) {
    var a = F.liveActor || { kind: 'other' }; // the socket was down, so who changed it is unknown (Goals §6.7)
    var n = merge(cur, a);
    if (!n && !F.retried) { F.retried = true; commit(); return; } // nothing editable differs (a tick, say): one silent retry
    F.retried = false; paintBar();
    showNotice(a, true);
  }

  function onClick(e) {
    var el = e.target.closest('[data-act]'); if (!el || !fd.contains(el) || !F) return;
    var act = el.dataset.act;
    if (el.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
    if (act === 'close') requestClose();
    else if (act === 'dec') step(-1);
    else if (act === 'inc') step(1);
    else if (act === 'use-theirs') useTheirs(el.dataset.field);
    else if (act === 'copy') copyText();
    else if (act === 'close-now') { clearDraft(); finish({}); }
    else if (act === 'discard-draft') discardDraft();
  }

  // ---------- live changes ----------
  Z.on('change', function (ev) {
    if (!F || F.closing || !F.editing || F.banner) return;
    var gone = (ev.type === 'deleted' && ev.item && ev.item.id === F.id) || (ev.type === 'cleared' && (ev.items || []).some(function (x) { return x.id === F.id; }));
    if (gone) { if (ev.source !== 'me') { F.deletedBy = ev.by; setBanner(ev.by); } return; }
    if (ev.type === 'updated' && ev.item && ev.item.id === F.id && ev.source === 'partner' && !F.socketDown) {
      var a = actorOf(ev); F.liveActor = a;
      if (merge(ev.item, a)) showNotice(a, false);
    }
  });
  Z.on('connection', function () { if (F && !F.closing) paintBar(); });

  // ---------- the contract ----------
  function fromRoute(r) {
    var q = r.query && r.query.item;
    if (q != null) {
      if (leaving === q) return false;
      if (F && !F.closing && F.key === q) {
        if (!fd.open) showForm();
        if (F.guardPending && !F.asking) askDiscard();
        return true;
      }
      if (F && !F.closing) leave();
      return openForm(r, q);
    }
    leaving = null;
    if (!F || F.closing) return false;
    if (F.guardPending) return true;
    // Back removed the query. While dirty, push it again and ask; otherwise close.
    if (!F.banner && dirty()) { F.guardPending = true; Z.go(hashFor(F)); return true; }
    clearDraft();
    finish({ noNav: true });
    return false;
  }
  function open(o) {
    Z.go(Z.withQuery({ item: o && o.id ? o.id : 'new' }));
  }
  function closeAll() { if (F && !F.closing) { persistNow(); F.closing = true; restoreConn(); hideForm(); F = null; } }

  // ---------- fixtures ----------
  var FIXTURES = ['item-form', 'item-form-edit', 'item-form-invalid', 'item-form-offline', 'item-form-conflict', 'item-form-live', 'item-form-gone'];
  function goFixture(f, q) { FIX = f; Z.go(Z.withQuery(q), { replace: true }); }
  function set(id, v) { var el = byId(id); if (el) el.value = v; }
  function formFixture(f) {
    switch (f) {
      case 'item-form-invalid':
        set('if-name', ''); set('if-qty', '0');
        var v = validateAll(); F.summaryShown = true; setSummary(v.n); focusField(v.first);
        return true;
      case 'item-form-offline':
        set('if-qty', '3'); syncCounters(); Z.setOffline(true, { silent: true }); paintBar();
        return false;
      case 'item-form-conflict': // my edits; then Youssef saves first while the socket is down; then my Save gets the 409
        set('if-unit', 'kg'); set('if-notes', 'extra virgin, the 5 L tin if on offer. Ask for the cold-pressed one.'); syncCounters();
        F.socketDown = true;
        Z.partner.updateItem(F.id, { name: 'Olive oil, cold-pressed', unit: 'g', quantity: 3 });
        F.socketDown = false;
        commit();
        return true;
      case 'item-form-live': // the same edit arrives live, before Save: the merge runs at once and Youssef is named
        set('if-unit', 'kg'); set('if-notes', 'extra virgin, the 5 L tin if on offer. Ask for the cold-pressed one.'); syncCounters();
        Z.partner.updateItem(F.id, { name: 'Olive oil, cold-pressed', unit: 'g', quantity: 3 });
        return false;
      case 'item-form-gone':
        set('if-name', 'Mint, two bunches'); syncCounters();
        setTimeout(function () { Z.partner.deleteItem('mint'); }, 600);
        return false;
    }
    return false;
  }
  var first = true;
  Z.on('route', function (r) {
    if (!first) return; first = false;
    var f = r.view === 'list' ? Z.fixture('list') : null;
    if (!f || FIXTURES.indexOf(f) < 0) return;
    setTimeout(function () {
      switch (f) {
        case 'item-form': goFixture(f, { item: 'new' }); break;
        case 'item-form-invalid': goFixture(f, { item: 'new' }); break;
        case 'item-form-gone': goFixture(f, { item: 'mint' }); break;
        default: goFixture(f, { item: 'olive-oil' });
      }
    }, 0);
  });

  buildForm();
  Z.form = { open: open, fromRoute: fromRoute, leave: leave, closeAll: closeAll, isOpen: function () { return !!F && !F.closing; } };
})();
