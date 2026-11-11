/* Create and edit goal (#/goals/new · #/goals/:id/edit). Direction B · Doorway.
   One view for both modes (route.mode 'create' | 'edit'): IA D7, D8, F8–F10, §4.5–4.6, §5.5, §6.7, §6.9.
   Fixtures (?state=, initial route only; one query param):
     #/goals/new           invalid · percent · details · cover-uploading · cover-failed · offline · uploads-off
     #/goals/wedding/edit  invalid · completion-preview · partner-changed · conflict · not-found · delete-confirm
                           · offline · uploads-off · cover-uploading · cover-failed   (also guest-room, sofa, honeymoon)
   Drafts (D8): localStorage 'zamane.goals.draft.new' and 'zamane.goals.draft.edit.<id>', written on input, kept
   through navigation and reload, cleared on create, save, delete and discard. Every storage call is in try/catch. */
(function () {
  'use strict';
  var esc = Z.esc, svg = Z.svg;
  var root = null, S = null;
  // decision.md prototype defaults [VERIFY with the architecture]
  var MAX_TITLE = 80, MAX_DESC = 500, DESC_COUNT_FROM = 450, MAX_BYTES = 10 * 1024 * 1024;
  var PHOTO_TYPES = /^image\/(jpeg|png|webp)$/;
  var DRAFT = 'zamane.goals.draft.';

  // ---------- strings: copy.md §5, §6 and "System messages", verbatim ----------
  var C = {
    createHeading: 'New goal', editHeading: 'Edit goal', cancel: 'Cancel',
    createSubmit: 'Create goal', createPending: 'Creating…', createWaiting: 'Creating after the photo…',
    createOffline: 'You\'re offline. You can create the goal when you\'re back online. What you\'ve typed stays here.',
    createOnline: 'Back online. You can create the goal now.', created: 'Goal created.',
    createFailed: 'Couldn\'t create the goal. Try again.',
    editSubmit: 'Save changes', editPending: 'Saving…',
    editOffline: 'You\'re offline. You can save your changes when you\'re back online. What you\'ve changed stays here.',
    editOnline: 'Back online. You can save your changes now.', editFailed: 'Couldn\'t save the changes. Try again.',
    saved: 'Changes saved',
    titleLabel: 'Title', titleHelp: 'For example, Wedding fund or New sofa',
    typeLegend: 'Type', money: 'Money', percent: 'Percent',
    moneyHelp: 'Save toward an amount of money.', percentHelp: 'Track progress from 0 to 100%.', typeFixed: 'You can\'t change this later.',
    roMoney: 'Money goal. The type can\'t be changed.', roPercent: 'Percent goal. The type can\'t be changed.',
    targetLabel: 'Target', targetLabelRest: ' amount in MAD', targetHelp: 'For example 20000 or 20 000',
    details: 'Optional details', dateLabel: 'Target date', dateHelp: 'Optional.', datePassed: 'This date has passed.',
    descLabel: 'Description', descHelp: 'Optional. What is this goal for?',
    coverLabel: 'Cover photo', coverHelp: 'Shown on the goal\'s card. Without one, the first letter of the title is used.',
    coverAdd: 'Add a cover photo', coverReplace: 'Replace', coverReplaceLabel: 'Replace cover photo',
    coverRemove: 'Remove', coverRemoveLabel: 'Remove cover photo',
    coverUploading: 'Uploading photo…', coverUploadingAnn: 'Uploading photo.', coverUploadedAnn: 'Photo added.',
    coverFailed: 'The photo didn\'t upload. Try again or remove it.', retry: 'Try again', coverOffline: 'Photos need a connection.',
    coverRestore: 'The cover changes when you save. Cancel keeps the current one.',
    errTitleEmpty: 'Enter a title for the goal.', errTargetEmpty: 'Enter a target amount, for example 20000.',
    errTargetZero: 'Enter a target greater than 0.', errTargetFormat: 'Use numbers only, for example 20000 or 20000,50.',
    errDate: 'Enter a valid date.',
    draftRestored: 'Draft restored.', draftDiscard: 'Discard draft',
    createDiscardTitle: 'Discard this goal?', createDiscardBody: 'What you\'ve typed will be lost.',
    editDiscardTitle: 'Discard your changes?', keepEditing: 'Keep editing', discard: 'Discard',
    useTheirs: 'Use theirs', emptyValue: '(empty)', resolvedAnn: 'Their version is in the field.',
    goneSaved: 'This goal was deleted. Your changes weren\'t saved.', backToGoals: 'Back to Goals',
    goneHeading: 'This goal isn\'t here any more', goneBody: 'It may have been deleted.',
    del: 'Delete goal', delOffline: 'Deleting needs a connection.', delKeep: 'Keep goal', delFailed: 'Couldn\'t delete the goal. Try again.',
    example: 'Example data. The values in this form are made up.',
    docCreate: 'New goal – Zamane', docGone: 'Goal not found – Zamane'
  };
  function sTitleLong() { return 'Use ' + MAX_TITLE + ' characters or fewer for the title.'; }
  function sDescLong() { return 'Use ' + MAX_DESC + ' characters or fewer for the description.'; }
  function sCount(n) { return Z.fmt(n) + ' of ' + Z.fmt(MAX_DESC); }
  function sUnsupported(name) { return name + ' isn\'t a supported photo. Use a JPEG, PNG or WebP file.'; }
  function sTooLarge(name) { return name + ' is over 10 MB. Choose a smaller photo.'; }
  function sWillBeDone(t, saved) { return t + ' will be done: ' + Z.fmt(saved) + ' MAD is already saved.'; }
  function sWillReopen(t) { return t + ' will no longer be done.'; }
  function sSavedReopened(t) { return 'Changes saved. ' + t + ' is open again.'; }
  function sSavedCompleted(t) { return 'Changes saved. ' + t + ' is done.'; }
  function sEditDiscardBody(t) { return 'Your changes to ' + t + ' won\'t be saved.'; }
  function sDocEdit(t) { return 'Edit ' + t + ' – Zamane'; }
  function sNotice(a) {
    if (a.kind === 'partner') return a.name + ' changed this goal while you were editing. Check the marked fields, then save again.';
    if (a.kind === 'self') return 'This goal changed on your other device while you were editing. Check the marked fields, then save again.';
    return 'This goal changed on another phone while you were editing. Check the marked fields, then save again.';
  }
  function sChangedBy(a) { return a.kind === 'partner' ? 'Changed by ' + a.name : a.kind === 'self' ? 'Changed on your other device' : 'Changed on another phone'; }
  function sConflict(a, v) {
    var q = '"' + v + '".';
    return a.kind === 'partner' ? a.name + ' changed this to ' + q : a.kind === 'self' ? 'Your other device changed this to ' + q : 'Another phone changed this to ' + q;
  }
  function sConflictCover(a) { return a.kind === 'partner' ? a.name + ' changed the cover photo.' : a.kind === 'self' ? 'Your other device changed the cover photo.' : 'Another phone changed the cover photo.'; }
  function sDelTitle(t) { return 'Delete ' + t + '?'; }
  function count(n, one, other) { return n + ' ' + Z.plural(n, one, other); }
  function sDelBody(g) {
    var es = Z.entries(g.id), ns = Z.notes(g.id);
    var photos = ns.reduce(function (s, n) { return s + n.blocks.filter(function (b) { return b.type === 'image'; }).length; }, 0) + (g.cover ? 1 : 0); // photos include the cover
    if (!es.length && !ns.length && !photos) return 'This deletes the goal for both of you. You can\'t undo this.';
    var tail = count(ns.length, 'note', 'notes') + ' and ' + count(photos, 'photo', 'photos') + ', for both of you. You can\'t undo this.';
    if (g.kind === 'money') return 'This deletes its ' + count(es.length, 'contribution', 'contributions') + ' (' + Z.fmt(Z.progress(g)) + ' MAD), ' + tail;
    return 'This deletes its ' + count(es.length, 'update', 'updates') + ', ' + tail;
  }
  function sDeleted(t) { return t + ' deleted'; }

  // ---------- the app's own history, to apply ia.md §2 "After a write" ----------
  // zIdx is a counter that never goes down, so "the entry before this one" is tracked here from route events.
  var hist = [], cur = -1;
  Z.on('route', function (r) {
    var i = history.state && history.state.zIdx; if (!i) return;
    for (var k = 0; k < hist.length; k++) if (hist[k].i === i) { cur = k; hist[k].path = r.path; return; }
    if (cur > -1 && i < hist[cur].i) { hist = [{ i: i, path: r.path }]; cur = 0; return; } // back into history we never saw (after a reload)
    hist = hist.slice(0, cur + 1); hist.push({ i: i, path: r.path }); cur = hist.length - 1;
  });
  function back(n) { var e = hist[cur - n]; return e ? e.path : null; }

  // ---------- small helpers ----------
  function $(s) { return root ? root.querySelector(s) : null; }
  var F = { // field → element ids
    title: { input: 'f-title', help: 'f-title-help', err: 'f-title-err', mark: 'f-title-mark' },
    target: { input: 'f-target', help: 'f-target-help', err: 'f-target-err', mark: 'f-target-mark' },
    targetDate: { input: 'f-date', help: 'f-date-help', err: 'f-date-err', mark: 'f-date-mark' },
    description: { input: 'f-desc', help: 'f-desc-help', err: 'f-desc-err', mark: 'f-desc-mark' }
  };
  function fieldOf(el) { for (var f in F) if (F[f].input === el.id) return f; return null; }
  function later(fn, ms) { var t = setTimeout(function () { if (S) fn(); }, ms); if (S) S.timers.push(t); return t; }
  function dateFromIso(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? Z.D(+m[1], +m[2], +m[3]) : null; }
  function inputAmount(n) { return Z.fmt(n); } // "20,000", the format every other screen shows (critic F10); both parse
  // field-sizing:content grows the Title; where it isn't supported, size it from scrollHeight.
  var SIZING = window.CSS && CSS.supports && CSS.supports('field-sizing', 'content');
  function fitTitle() { var t = $('#f-title'); if (!t || SIZING) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  function sErrorCount(n) { return n + ' fields need your attention.'; } // not in copy.md yet (a11y review's wording) → Writer
  function parseTarget(raw) {
    var s = String(raw == null ? '' : raw).replace(/[\s  ]/g, '');
    if (s === '') return { error: C.errTargetEmpty };
    var r = Z.parseAmount(s); // Home's money.ts rules: "20 000", "20,000", "20000,50"
    if (r.error) return { error: /^0+([.,]0+)?$/.test(s) ? C.errTargetZero : C.errTargetFormat };
    return { value: r.value };
  }
  function snap(g) { // the editable fields of a row (also accepts the 409 body, where dates are strings)
    return { title: g.title || '', target: g.target != null ? Number(g.target) : null, targetDate: g.targetDate ? Z.isoDate(g.targetDate) : '',
      description: g.description || '', cover: g.cover ? JSON.parse(JSON.stringify(g.cover)) : null, updatedAt: g.updatedAt };
  }
  function coverKey(c) { return c ? (c.url || (c.example ? 'example' : 'cover')) : ''; }
  function coverValue() { var c = S.cover; return c.state === 'none' ? null : c.example ? { example: true } : { url: c.url }; }
  function norm(f, v) {
    if (f === 'title' || f === 'description') return String(v || '').trim();
    if (f === 'target') {
      if (v == null || String(v).trim() === '') return '';
      if (typeof v === 'number') return String(v);
      var p = parseTarget(v); return p.value != null ? String(p.value) : 'raw:' + String(v).trim();
    }
    if (f === 'targetDate') return v ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : Z.isoDate(v)) : '';
    if (f === 'cover') return coverKey(v);
    return String(v);
  }
  function editable() {
    var f = ['title']; if (S.kind === 'money') f.push('target');
    f.push('targetDate', 'description'); if (Z.uploadsEnabled) f.push('cover');
    return f;
  }
  function mine() {
    var t = $('#f-target');
    return { title: $('#f-title').value, target: S.kind === 'money' && t ? t.value : null, targetDate: $('#f-date').value,
      description: $('#f-desc').value, cover: coverValue() };
  }
  function curTitle() { var i = $('#f-title'); return i ? i.value.trim() : ''; }

  // ---------- state ----------
  function newState(r, g) {
    return { route: r, mode: r.mode, id: r.id || null, goal: g, kind: g ? g.kind : 'money', base: g ? snap(g) : null,
      cover: g && g.cover ? { state: 'done', example: !!g.cover.example, url: g.cover.url || null } : { state: 'none' },
      errors: {}, touched: {}, marks: {}, pending: false, waiting: false, retried: false, socketDown: false,
      detailsOpen: r.mode === 'edit', projectedDone: g ? Z.isDone(g) : false, previewMsg: '', countShown: false,
      coverError: '', restored: false, closed: false, dirtyByUser: false, prefilled: false,
      timers: [], upload: null, urls: [], doorKey: '', draftT: null };
  }

  // ---------- markup ----------
  function render() {
    var create = S.mode === 'create', g = S.goal, money = S.kind === 'money';
    var v = g ? snap(g) : { title: '', target: null, targetDate: '', description: '' };
    var h = '<div class="form-page">' +
      '<header class="task-head">' +
        '<button type="button" class="link-btn task-cancel" data-act="cancel">' + svg('x') + '<span>' + C.cancel + '</span></button>' +
        '<h1 class="task-title" id="form-h">' + (create ? C.createHeading : C.editHeading) + '</h1>' +
      '</header>' +
      '<form class="goal-form" id="goal-form" novalidate aria-labelledby="form-h">' +
        '<div class="form-slot" id="form-alert" role="alert"></div>' +
        '<div class="form-slot" id="merge-notice"></div>' +
        '<div class="form-slot" id="draft-notice"></div>' +
        // 1 · Title: Young Serif 28/34 in the field (direction B)
        '<div class="fg">' +
          '<label class="field-label" for="f-title">' + C.titleLabel + '</label>' +
          // A one-row textarea that grows, so a long title wraps instead of clipping (critic F9). Enter never adds a line.
          '<div class="field field-title"><textarea id="f-title" name="title" rows="1" required autocomplete="off" autocapitalize="sentences" inputmode="text"' +
            ' enterkeyhint="' + (create ? 'next' : 'done') + '" aria-describedby="f-title-help">' + esc(v.title) + '</textarea></div>' +
          '<p class="help" id="f-title-help">' + C.titleHelp + '</p><p class="err" id="f-title-err" hidden></p>' +
          '<div class="mark-slot" id="f-title-mark"></div>' +
        '</div>' +
        // 2 · Type: a real radio group on create, read-only text on edit
        (create ?
          '<fieldset class="fg type">' +
            '<legend class="field-label">' + C.typeLegend + '</legend>' +
            '<div class="type-cells">' +
              typeCell('money', C.money, C.moneyHelp, true) + typeCell('general', C.percent, C.percentHelp, false) +
            '</div>' +
            '<p class="help" id="type-fixed">' + C.typeFixed + '</p>' +
          '</fieldset>'
        : '<div class="fg"><p class="field-label">' + C.typeLegend + '</p><p class="ro-value">' + (money ? C.roMoney : C.roPercent) + '</p></div>') +
        // 3 · Target: money only (kept, just hidden, when create switches to Percent)
        (create || money ?
          '<div class="fg" id="g-target"' + (money ? '' : ' hidden') + '>' +
            '<label class="field-label" for="f-target">' + C.targetLabel + '<span class="vh">' + C.targetLabelRest + '</span></label>' +
            '<div class="field field-num field-target"><input id="f-target" name="target" type="text" inputmode="decimal" required autocomplete="off"' +
              ' enterkeyhint="done" value="' + (v.target != null ? esc(inputAmount(v.target)) : '') + '" aria-describedby="f-target-help">' +
              '<span class="suffix" aria-hidden="true">MAD</span></div>' +
            '<p class="help num" id="f-target-help">' + C.targetHelp + '</p><p class="err" id="f-target-err" hidden></p>' +
            (create ? '' : '<p class="preview" id="f-target-preview" aria-live="polite"></p>') +
            '<div class="mark-slot" id="f-target-mark"></div>' +
          '</div>' : '') +
        // 4 · Optional details: folded on create, unfolded (no toggle) on edit
        (create ? '<button type="button" class="details-toggle" data-act="details" aria-expanded="false" aria-controls="details"><span>' + C.details + '</span>' + svg('chevronDown') + '</button>' : '') +
        '<div class="details" id="details"' + (S.detailsOpen ? '' : ' hidden') + '>' +
          '<div class="fg">' +
            '<label class="field-label" for="f-date">' + C.dateLabel + '</label>' +
            '<div class="field field-date"><input id="f-date" name="targetDate" type="date" autocomplete="off" enterkeyhint="next" value="' + esc(v.targetDate) + '" aria-describedby="f-date-help"></div>' +
            '<p class="help" id="f-date-help">' + C.dateHelp + '</p><p class="err" id="f-date-err" hidden></p>' +
            '<div class="mark-slot" id="f-date-mark"></div>' +
          '</div>' +
          '<div class="fg">' +
            '<label class="field-label" for="f-desc">' + C.descLabel + '</label>' +
            '<div class="field field-area"><textarea id="f-desc" name="description" rows="3" autocomplete="off" enterkeyhint="enter" aria-describedby="f-desc-help">' + esc(v.description) + '</textarea></div>' +
            '<p class="help help-row"><span id="f-desc-help">' + C.descHelp + '</span><span class="count num" id="f-desc-count"></span></p>' +
            '<p class="err" id="f-desc-err" hidden></p>' +
            '<div class="mark-slot" id="f-desc-mark"></div>' +
          '</div>' +
          '<div id="cover-slot">' + coverGroup(v.title.trim()) + '</div>' +
        '</div>' +
        // 5 · The primary: floats bottom-end on phones (rides the keyboard); ends the form from 48rem, then Cancel
        '<div class="form-actions">' +
          '<div class="dock"><button type="submit" class="btn-primary" id="primary">' + svg('check') + '<span class="primary-text"></span></button></div>' +
          '<button type="button" class="btn-sec form-cancel" data-act="cancel">' + C.cancel + '</button>' +
        '</div>' +
        '<p class="notice submit-reason" id="submit-reason" hidden>' + svg('cloudOff') + '<span></span></p>' +
      '</form>' +
      (create ? '' :
        '<div class="delete-zone">' +
          '<button type="button" class="btn-danger" id="delete" data-act="delete">' + svg('trash') + C.del + '</button>' +
          '<p class="help" id="delete-reason" hidden>' + C.delOffline + '</p>' +
        '</div>') +
    '</div>';
    root.innerHTML = h;
    renderActions(); renderCounter(); renderDateHelp(); updatePreview(); fitTitle();
  }
  // Seeded example goals were created before the prototype's "today"; goals made in this session weren't.
  function isExample(g) { return !!g && new Date(g.createdAt) < Z.D(2026, 11, 9, 0); }
  function typeCell(value, name, help, checked) {
    var id = 'type-' + value;
    return '<div class="type-cell">' +
      '<input type="radio" name="kind" id="' + id + '" value="' + value + '"' + (checked ? ' checked' : '') + ' aria-describedby="' + id + '-help type-fixed">' +
      '<label for="' + id + '">' + name + '</label>' +
      '<span class="type-help" id="' + id + '-help">' + help + '</span>' +
    '</div>';
  }

  // ---------- cover: a doorway preview, upload simulated, uploads-off = no control at all ----------
  function doorHTML(title) {
    var cover = coverValue(), done = S.mode === 'edit' && S.projectedDone;
    S.doorKey = title.charAt(0).toUpperCase() + '|' + coverKey(cover) + '|' + done;
    var html = Z.doorway({ title: title, cover: cover }, 'form', { done: done });
    return title ? html : html.replace('<span class="door-initial">·</span>', '<span class="door-initial"></span>'); // empty arch, no stray dot
  }
  function updateDoor() {
    var st = $('.cover-stage'); if (!st) return;
    var t = curTitle(), key = t.charAt(0).toUpperCase() + '|' + coverKey(coverValue()) + '|' + (S.mode === 'edit' && S.projectedDone);
    if (key === S.doorKey) return;
    var tmp = document.createElement('div'); tmp.innerHTML = doorHTML(t);
    st.querySelector('.door').replaceWith(tmp.firstElementChild);
  }
  function coverChanged() { return S.mode === 'edit' && coverKey(coverValue()) !== coverKey(S.base.cover); }
  function coverGroup(title) {
    if (!Z.uploadsEnabled) return '';
    var c = S.cover, off = Z.offline, has = c.state !== 'none', failed = c.state === 'failed';
    var dis = off ? ' aria-disabled="true"' : '', offId = off ? ' cover-offline' : '';
    var err = failed ? C.coverFailed : S.coverError;
    var h = '<div class="fg cover-group" role="group" aria-labelledby="cover-label">' +
      '<p class="field-label" id="cover-label">' + C.coverLabel + '</p>' +
      '<div class="cover-stage">' + doorHTML(title) +
        (c.state === 'uploading' ? '<p class="cover-pill"><span>' + C.coverUploading + '</span> <span class="num" id="cover-pct">' + c.pct + '%</span></p>' : '') +
      '</div>' +
      (err ? '<p class="err" id="cover-err" role="alert">' + svg('alert') + '<span>' + esc(err) + '</span></p>' : '') +
      '<div class="cover-actions">';
    if (failed) h += '<button type="button" class="btn-sec" id="cover-retry" data-act="cover-retry" aria-describedby="cover-err' + offId + '"' + dis + '>' + svg('refresh') + C.retry + '</button>';
    else if (has) h += '<button type="button" class="btn-sec" id="cover-replace" data-act="cover-add" aria-label="' + C.coverReplaceLabel + '" aria-describedby="cover-help' + offId + '"' + dis + '>' + svg('image') + C.coverReplace + '</button>';
    else h += '<button type="button" class="btn-sec" id="cover-add" data-act="cover-add" aria-describedby="' + (err ? 'cover-err ' : '') + 'cover-help' + offId + '"' + dis + '>' + svg('imagePlus') + C.coverAdd + '</button>';
    if (has) h += '<button type="button" class="btn-sec" id="cover-remove" data-act="cover-remove" aria-label="' + C.coverRemoveLabel + '"' + (failed ? ' aria-describedby="cover-err"' : '') + '>' + C.coverRemove + '</button>';
    h += '</div>' +
      (off ? '<p class="help" id="cover-offline">' + C.coverOffline + '</p>' : '') +
      '<p class="help" id="cover-help">' + C.coverHelp + '</p>' +
      (coverChanged() ? '<p class="help" id="cover-restore">' + C.coverRestore + '</p>' : '') +
      markHTML('cover') +
      '<input type="file" id="cover-file" accept="image/*" hidden>' +
    '</div>';
    return h;
  }
  function renderCover(focusId) {
    var slot = $('#cover-slot'); if (!slot) return;
    var a = document.activeElement, had = a && slot.contains(a) && a.id ? a.id : null;
    slot.innerHTML = coverGroup(curTitle());
    var want = focusId || had;
    if (want) { var el = slot.querySelector('#' + want) || slot.querySelector('.cover-actions button'); if (el) el.focus({ preventScroll: true }); }
  }
  function pickCover() {
    if (Z.offline) { Z.announce(C.coverOffline); return; } // the reason is already shown beside it
    var inp = $('#cover-file'); inp.value = ''; inp.click();
  }
  function onFile(file) {
    if (!file) return;
    S.coverError = '';
    if (!PHOTO_TYPES.test(file.type)) S.coverError = sUnsupported(file.name);
    else if (file.size > MAX_BYTES) S.coverError = sTooLarge(file.name);
    if (S.coverError) { renderCover(S.cover.state === 'none' ? 'cover-add' : 'cover-replace'); return; }
    stopUpload();
    var url = URL.createObjectURL(file); S.urls.push(url);
    // Prototype: a file whose name contains "fail" fails at 35%, so the failure path can be tried by hand.
    S.cover = { state: 'uploading', url: url, pct: 0, fail: /fail/i.test(file.name) };
    renderCover('cover-replace'); // focus stays on the next control (ia.md §6.4)
    Z.announce(C.coverUploadingAnn);
    startUpload();
    S.dirtyByUser = true; saveDraft();
  }
  function startUpload(o) {
    o = o || {};
    stopUpload();
    var c = S.cover; c.state = 'uploading'; if (o.from != null) c.pct = o.from;
    var id = S.upload = setInterval(function () {
      if (!S || S.cover !== c) { clearInterval(id); return; }
      if (Z.offline || (c.fail && c.pct >= 35)) { stopUpload(); c.state = 'failed'; coverFailedNow(); return; }
      c.pct = Math.min(100, c.pct + (o.step || 7 + Math.floor(Math.random() * 7)));
      var el = $('#cover-pct'); if (el) el.textContent = c.pct + '%';
      if (c.pct >= 100) { stopUpload(); c.state = 'done'; renderCover(); Z.announce(C.coverUploadedAnn); settled(true); }
    }, o.every || 160);
  }
  function stopUpload() { if (S && S.upload) { clearInterval(S.upload); S.upload = null; } }
  function coverFailedNow() {
    // The error is an alert at the field. Focus moves there unless the person is typing somewhere else.
    var a = document.activeElement, slot = $('#cover-slot');
    var take = !a || a === document.body || (slot && slot.contains(a)) || a.id === 'primary';
    renderCover(take ? 'cover-retry' : null);
    settled(false);
  }
  function settled(ok) { if (S.waiting) { S.waiting = false; if (ok) doSubmit(); else renderActions(); } }
  function retryCover() {
    if (Z.offline) { Z.announce(C.coverOffline); return; }
    var c = S.cover; c.fail = false; c.pct = 0; c.state = 'uploading';
    renderCover('cover-replace'); Z.announce(C.coverUploadingAnn); startUpload();
  }
  function removeCover() {
    stopUpload(); S.coverError = '';
    S.cover = { state: 'none' }; delete S.marks.cover;
    if (S.waiting) { S.waiting = false; renderActions(); }
    renderCover('cover-add');
    S.dirtyByUser = true; saveDraft();
  }

  // ---------- validation (copy.md: under the field, blur only after typing, clear as soon as valid) ----------
  function fieldActive(f) { return f === 'target' ? S.kind === 'money' && !!$('#f-target') : !!$('#' + F[f].input); }
  function validate(f) {
    if (!fieldActive(f)) return '';
    if (f === 'title') { var t = $('#f-title').value.trim(); return !t ? C.errTitleEmpty : t.length > MAX_TITLE ? sTitleLong() : ''; }
    if (f === 'target') return parseTarget($('#f-target').value).error || '';
    if (f === 'targetDate') { var d = $('#f-date'); return d.validity && d.validity.badInput ? C.errDate : ''; }
    if (f === 'description') return $('#f-desc').value.length > MAX_DESC ? sDescLong() : '';
    return '';
  }
  function setError(f, msg) {
    var c = F[f], input = $('#' + c.input), err = $('#' + c.err); if (!input) return;
    S.errors[f] = msg || '';
    if (msg) { err.innerHTML = svg('alert') + '<span>' + esc(msg) + '</span>'; err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.closest('.field').classList.add('is-invalid'); }
    else {
      err.textContent = ''; err.hidden = true; input.removeAttribute('aria-invalid'); input.closest('.field').classList.remove('is-invalid');
      if (S.countAlert) { S.countAlert = false; setAlert(''); } // the count is stale once a field is fixed; removing it isn't announced
    }
    describe(f);
  }
  // aria-describedby lists only what is on screen: error, helper, then the preview, counter or merge mark.
  function describe(f) {
    var c = F[f], input = $('#' + c.input); if (!input) return;
    var ids = [];
    if (S.errors[f]) ids.push(c.err);
    ids.push(c.help);
    if (f === 'target' && S.previewMsg) ids.push('f-target-preview');
    if (f === 'description' && S.countShown) ids.push('f-desc-count');
    if (S.marks[f]) ids.push(c.mark + '-text');
    input.setAttribute('aria-describedby', ids.join(' '));
  }
  function validateAll() {
    var first = null, n = 0;
    ['title', 'target', 'targetDate', 'description'].forEach(function (f) {
      if (!fieldActive(f)) return;
      var m = validate(f); setError(f, m); if (m) { n++; if (!first) first = f; }
    });
    if (S.cover.state === 'failed') { n++; if (!first) first = 'cover'; }
    // Several errors: say how many at the top (role=alert); focus still goes to the first (a11y review).
    if (n > 1) { setAlert(sErrorCount(n)); S.countAlert = true; }
    return first;
  }
  function focusField(f) {
    if (!f) return;
    if (f === 'cover') { var r = $('#cover-retry'); if (r) r.focus(); return; }
    if ((f === 'targetDate' || f === 'description') && !S.detailsOpen) openDetails(true);
    var el = $('#' + F[f].input); if (el) el.focus();
  }

  // ---------- live helpers under fields ----------
  function renderCounter() {
    var d = $('#f-desc'), el = $('#f-desc-count'); if (!d || !el) return;
    var n = d.value.length, show = n >= DESC_COUNT_FROM;
    el.textContent = show ? sCount(n) : '';
    el.classList.toggle('is-over', n > MAX_DESC);
    if (show !== S.countShown) { S.countShown = show; describe('description'); }
  }
  function renderDateHelp() {
    var d = $('#f-date'), el = $('#f-date-help'); if (!d || !el) return;
    var v = dateFromIso(d.value), today = Z.now(); today.setHours(0, 0, 0, 0);
    el.textContent = v && v < today ? C.datePassed : C.dateHelp; // a past date is allowed, not an error
  }
  // Edit, money: lowering or raising the target says what will happen before saving (polite).
  function updatePreview() {
    if (S.mode !== 'edit') return;
    var g = S.goal, was = Z.isDone(g), will = was, t = $('#f-target');
    if (S.kind === 'money' && t) { var p = parseTarget(t.value); if (p.value != null) will = Z.progress(g) >= p.value; }
    S.projectedDone = will;
    var el = $('#f-target-preview');
    if (el) {
      var msg = will && !was ? sWillBeDone(g.title, Z.progress(g)) : !will && was ? sWillReopen(g.title) : '';
      if (msg !== S.previewMsg) {
        S.previewMsg = msg;
        el.className = 'preview' + (msg && will ? ' is-done' : '');
        el.innerHTML = msg ? (will ? svg('check') : '') + '<span>' + esc(msg) + '</span>' : '';
        describe('target');
      }
    }
    updateDoor(); // the preview doorway shows the surround the goal will have
  }
  function openDetails(open) {
    S.detailsOpen = open;
    var d = $('#details'), b = $('.details-toggle');
    if (d) d.hidden = !open;
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  function setKind(k, ui) {
    S.kind = k;
    if (ui) { var r = $('#type-' + k); if (r) r.checked = true; }
    var g = $('#g-target'); if (g) g.hidden = k !== 'money';
    if (k !== 'money') setError('target', '');
  }
  function setVal(f, v) {
    var el = $('#' + F[f].input); if (!el) return;
    el.value = v == null ? '' : v;
    if (f === 'title') { updateDoor(); fitTitle(); }
    if (f === 'target') updatePreview();
    if (f === 'description') renderCounter();
    if (f === 'targetDate') renderDateHelp();
  }

  // ---------- the primary, its reasons, Delete ----------
  function renderActions() {
    var p = $('#primary'); if (!p) return;
    var create = S.mode === 'create', label = create ? C.createSubmit : C.editSubmit, busy = false, off = Z.offline;
    if (S.pending) { label = create ? C.createPending : C.editPending; busy = true; }
    else if (S.waiting) { label = create ? C.createWaiting : C.editPending; busy = true; }
    p.querySelector('.primary-text').textContent = label;
    if (busy || off) p.setAttribute('aria-disabled', 'true'); else p.removeAttribute('aria-disabled');
    var r = $('#submit-reason');
    r.hidden = !off; r.querySelector('span').textContent = off ? (create ? C.createOffline : C.editOffline) : '';
    if (off) p.setAttribute('aria-describedby', 'submit-reason'); else p.removeAttribute('aria-describedby');
    var d = $('#delete');
    if (d) {
      if (off) { d.setAttribute('aria-disabled', 'true'); d.setAttribute('aria-describedby', 'delete-reason'); }
      else { d.removeAttribute('aria-disabled'); d.removeAttribute('aria-describedby'); }
      $('#delete-reason').hidden = !off;
    }
  }
  // A press on an aria-disabled control: nothing changes; its reason is shown next to it and announced once.
  // On phones the reason sits at the top of the form, so the toast repeats it beside the floating primary.
  function disabledPress(msg) { if (Z.isPhone()) Z.toast({ msg: msg }); else Z.announce(msg); }
  function setAlert(msg) {
    var a = $('#form-alert'); if (!a) return;
    a.innerHTML = msg ? '<p class="notice notice-danger">' + svg('alert') + '<span>' + esc(msg) + '</span></p>' : '';
  }

  // ---------- submit ----------
  function onSubmit(e) {
    e.preventDefault();
    if (!S || S.closed) return;
    if (S.pending || S.waiting) return; // a double tap is ignored
    if (Z.offline) { disabledPress(S.mode === 'create' ? C.createOffline : C.editOffline); return; }
    setAlert('');
    var first = validateAll();
    if (first) { focusField(first); return; }
    if (S.cover.state === 'uploading') { S.waiting = true; renderActions(); return; } // "Creating after the photo…"
    doSubmit();
  }
  function doSubmit(now) {
    S.pending = true; renderActions(); // pressed state first, then the work (INP)
    later(function () { S.pending = false; if (S.mode === 'create') commitCreate(); else commitEdit(); }, now ? 0 : 450);
  }
  function fieldsOut() {
    var o = { title: $('#f-title').value.trim(), targetDate: dateFromIso($('#f-date').value), description: $('#f-desc').value.trim() };
    if (S.kind === 'money') o.target = parseTarget($('#f-target').value).value;
    if (Z.uploadsEnabled) o.cover = coverValue(); // with uploads off an existing cover is left alone
    return o;
  }
  function keepUrl(cover) { if (cover && cover.url) S.urls = S.urls.filter(function (u) { return u !== cover.url; }); }
  function commitCreate() {
    var o = fieldsOut(), g;
    o.kind = S.kind;
    try { g = Z.createGoal(o); } catch (err) { renderActions(); setAlert(C.createFailed); return; }
    S.closed = true; keepUrl(o.cover); clearDraft();
    Z.go('#/goals/' + g.id, { replace: true }); // ia.md §2: create replaces /goals/new
    Z.announce(C.created);
  }
  function commitEdit() {
    var o = fieldsOut(), res;
    try { res = Z.updateGoal(S.id, o, { updatedAt: S.base.updatedAt }); } catch (err) { renderActions(); setAlert(C.editFailed); return; }
    if (res.notFound) { renderGone(true); return; }
    if (res.conflict) {
      // 409: merge with the row in the body. The socket was down, so the actor is unknown (§6.7).
      var n = merge(snap(res.current), { kind: 'other' });
      if (!n && !S.retried) { S.retried = true; doSubmit(true); return; } // nothing editable differs: one silent retry
      S.retried = false; renderActions(); showNotice({ kind: 'other' }, true);
      return;
    }
    S.closed = true; keepUrl(o.cover); clearDraft();
    var g = res.goal;
    Z.flash({ msg: res.completed ? sSavedCompleted(g.title) : res.reopened ? sSavedReopened(g.title) : C.saved });
    focusEditOnReturn(S.id);
    if (Z.canGoBack() && back(1) === '/goals/' + S.id) Z.back(); // save pops back to the detail
    else Z.go('#/goals/' + S.id, { replace: true });
  }

  // ---------- the three-way merge (ia.md §6.7) ----------
  function merge(T, actor) {
    var M = mine(), n = 0;
    editable().forEach(function (f) {
      var b = norm(f, S.base[f]), m = norm(f, M[f]), t = norm(f, T[f]);
      if (b === t) return;                                                                            // they didn't change it: keep mine
      if (m === b) { S.marks[f] = { type: 'changed', actor: actor }; apply(f, T[f]); n++; }           // only they did: take theirs, marked
      else if (m !== t) { S.marks[f] = { type: 'conflict', actor: actor, value: T[f] }; n++; }        // both, differently: keep mine, offer theirs
      else delete S.marks[f];                                                                         // both, the same: nothing to do
    });
    S.base = T; // B becomes T, updatedAt becomes T.updatedAt
    ['title', 'target', 'targetDate', 'description'].forEach(renderMark);
    if (Z.uploadsEnabled) renderCover();
    updatePreview();
    return n;
  }
  function apply(f, v) {
    if (f === 'cover') { stopUpload(); S.cover = v ? { state: 'done', example: !!v.example, url: v.url || null } : { state: 'none' }; renderCover(); return; }
    setVal(f, f === 'target' ? (v != null ? inputAmount(v) : '') : v);
    setError(f, '');
  }
  function shown(f, v) {
    if (v == null || v === '') return C.emptyValue;
    if (f === 'target') return Z.mad(v);
    if (f === 'targetDate') return Z.day(dateFromIso(norm(f, v)));
    if (f === 'description') { v = String(v).trim(); return v.length > 60 ? v.slice(0, 57).trim() + '…' : v; }
    return String(v);
  }
  function who(a) { return a.kind === 'partner' ? Z.av(a.id, 'sm') : svg('refresh'); }
  function markHTML(f) {
    var m = S.marks[f]; if (!m) return '';
    var id = (F[f] ? F[f].mark : 'cover-mark') + '-text';
    if (m.type === 'changed') return '<p class="mark">' + who(m.actor) + '<span class="mark-text" id="' + id + '">' + esc(sChangedBy(m.actor)) + '</span></p>';
    var text = f === 'cover' ? sConflictCover(m.actor) : sConflict(m.actor, shown(f, m.value));
    // Visible "Use theirs" is the accessible name (WCAG 2.5.3); the conflict line describes it.
    return '<div class="mark mark-conflict">' + who(m.actor) + '<span class="mark-text" id="' + id + '">' + esc(text) + '</span>' +
      '<button type="button" class="link-btn" data-act="use-theirs" data-field="' + f + '" aria-describedby="' + id + '">' + C.useTheirs + '</button></div>';
  }
  function renderMark(f) {
    if (f === 'cover') { renderCover(); return; }
    var slot = $('#' + F[f].mark); if (!slot) return;
    var a = document.activeElement, had = a && slot.contains(a);
    slot.innerHTML = markHTML(f);
    describe(f);
    if (had) { var el = $('#' + F[f].input); if (el) el.focus(); }
  }
  function useTheirs(f) {
    var m = S.marks[f]; if (!m) return;
    delete S.marks[f];
    apply(f, m.value);
    if (f === 'cover') { var b = $('.cover-actions button'); if (b) b.focus(); }
    else { renderMark(f); $('#' + F[f].input).focus(); }
    Z.announce(C.resolvedAnn);
    S.dirtyByUser = true; saveDraft();
  }
  function showNotice(actor, focus) {
    var text = sNotice(actor), el = $('#merge-notice');
    el.innerHTML = '<p class="notice notice-merge" id="merge-text" tabindex="-1">' + svg('refresh') + '<span>' + esc(text) + '</span></p>';
    if (focus) $('#merge-text').focus(); // after a 409 focus goes to the notice
    else Z.announce(text);               // live: one polite announcement, focus stays put
  }

  // ---------- not found / deleted while editing ----------
  function renderGone(afterSave) {
    if (S) { stopUpload(); S.closed = true; clearDraft(); }
    Z.setChrome(''); Z.setFab(false); Z.footnote(''); Z.title(C.docGone);
    Z.offlineMessage = null; Z.onlineMessage = null;
    root.innerHTML = '<div class="form-page gone">' +
      '<h1 class="title-lg" id="form-h" tabindex="-1">' + (afterSave ? C.goneSaved : C.goneHeading) + '</h1>' +
      (afterSave ? '' : '<p>' + C.goneBody + '</p>') +
      '<p><a class="btn-primary" href="#/goals" data-act="to-goals">' + C.backToGoals + '</a></p></div>';
    if (afterSave) Z.focusHeading();
  }

  // ---------- delete (confirmed, §6.9) ----------
  function askDelete() {
    if (Z.offline) { Z.announce(C.delOffline); return; } // the reason is shown under the button
    var g = S.goal;
    Z.confirm({ title: sDelTitle(g.title), body: '<p>' + esc(sDelBody(g)) + '</p>', confirm: C.del, cancel: C.delKeep }).then(function (ok) {
      if (!ok || !S || S.closed) return;
      var res;
      try { res = Z.deleteGoal(g.id); } catch (err) { setAlert(C.delFailed); return; }
      if (res.notFound) { renderGone(true); return; }
      S.closed = true; clearDraft();
      Z.flash({ msg: sDeleted(g.title) });
      // §2: back two entries when the stack is list → detail → edit; otherwise replace with /goals.
      if (back(1) === '/goals/' + g.id && back(2) === '/goals') history.go(-2);
      else Z.go('#/goals', { replace: true });
    });
  }

  // ---------- cancel ----------
  function dirty() {
    if (S.mode === 'create') {
      return !!($('#f-title').value.trim() || $('#f-target').value.trim() || $('#f-date').value || $('#f-desc').value.trim() || S.cover.state !== 'none');
    }
    var M = mine();
    return editable().some(function (f) { return norm(f, M[f]) !== norm(f, S.base[f]); });
  }
  // §6.3: after saving or cancelling Edit, focus goes to the detail's Edit button, not its h1 (a11y review,
  // critic F8). One-shot: runs after the detail has mounted and the shell has focused its h1.
  function focusEditOnReturn(id) {
    function once(r) { Z.off('route', once); if (r.view === 'detail' && r.id === id) { var e = document.getElementById('gd-edit'); if (e) Z.focus(e); } }
    Z.on('route', once);
  }
  function leave() {
    var parent = S.mode === 'edit' ? '#/goals/' + S.id : '#/goals';
    if (S.mode === 'edit') focusEditOnReturn(S.id);
    S.closed = true; stopUpload(); clearDraft();
    if (Z.canGoBack()) Z.back(); else Z.go(parent, { replace: true });
  }
  function cancel() {
    if (!dirty()) { leave(); return; }
    var create = S.mode === 'create';
    Z.confirm({ title: create ? C.createDiscardTitle : C.editDiscardTitle, body: '<p>' + esc(create ? C.createDiscardBody : sEditDiscardBody(S.goal.title)) + '</p>',
      confirm: C.discard, cancel: C.keepEditing }).then(function (ok) { if (ok && S && !S.closed) leave(); });
  }

  // ---------- drafts (D8): this phone only; localStorage can be missing or throw ----------
  function draftKey() { return DRAFT + (S.mode === 'create' ? 'new' : 'edit.' + S.id); }
  function readDraft() { try { var s = localStorage.getItem(draftKey()); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function clearDraft() { if (S) { clearTimeout(S.draftT); try { localStorage.removeItem(draftKey()); } catch (e) { /* nothing to clear */ } } }
  function saveDraft() { if (!S || S.closed || !S.dirtyByUser) return; clearTimeout(S.draftT); S.draftT = setTimeout(writeDraft, 300); }
  function writeDraft() {
    if (!S || S.closed || !$('#f-title')) return;
    if (!dirty()) { clearDraft(); return; }
    var c = S.cover, t = $('#f-target');
    var d = { v: 1, kind: S.kind, title: $('#f-title').value, target: t ? t.value : '', targetDate: $('#f-date').value, description: $('#f-desc').value,
      details: S.detailsOpen, cover: c.state === 'none' ? 'none' : c.example ? 'example' : 'keep', base: S.base };
    try { localStorage.setItem(draftKey(), JSON.stringify(d)); } catch (e) { /* private mode: the draft lives only in this page */ }
  }
  function restoreDraft(d) {
    if (S.mode === 'create' && d.kind === 'general') setKind('general', true);
    setVal('title', d.title); setVal('target', d.target); setVal('targetDate', d.targetDate); setVal('description', d.description);
    // An unsaved upload can't outlive the page (its object URL is gone): 'keep' means the saved cover.
    if (d.cover === 'none') S.cover = { state: 'none' };
    else if (d.cover === 'example') S.cover = { state: 'done', example: true };
    if (S.mode === 'create' && (d.details || d.targetDate || d.description || d.cover === 'example')) openDetails(true);
    renderCover();
    S.restored = true; S.dirtyByUser = true;
    $('#draft-notice').innerHTML = '<p class="notice notice-draft">' + svg('note') + '<span>' + C.draftRestored + '</span>' +
      '<button type="button" class="link-btn" data-act="discard-draft">' + C.draftDiscard + '</button></p>';
    if (S.mode === 'edit' && d.base) {
      // The goal may have changed since the draft was written: merge against the row it was based on.
      var now = snap(Z.goal(S.id));
      S.base = d.base;
      if (+new Date(d.base.updatedAt) !== +new Date(now.updatedAt)) { if (merge(now, { kind: 'other' })) showNotice({ kind: 'other' }, false); }
      else S.base = now;
    }
    updatePreview();
  }
  function discardDraft() {
    clearDraft(); stopUpload(); revokeUrls(); S.timers.forEach(clearTimeout);
    var r = S.route;
    S = newState(r, r.mode === 'edit' ? Z.goal(r.id) : null);
    render();
    if (S.mode === 'create') Z.focus($('#f-title')); else Z.focusHeading();
  }
  function revokeUrls() { if (S) { S.urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* already gone */ } }); S.urls = []; } }

  // ---------- events ----------
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || !root || !root.contains(b)) return;
    var act = b.dataset.act;
    if (act === 'to-goals') { e.preventDefault(); Z.go('#/goals', { replace: true }); return; }
    if (!S || S.closed) return;
    if (act === 'cancel') cancel();
    else if (act === 'details') { openDetails(!S.detailsOpen); saveDraft(); }
    else if (act === 'cover-add') pickCover();
    else if (act === 'cover-remove') removeCover();
    else if (act === 'cover-retry') retryCover();
    else if (act === 'use-theirs') useTheirs(b.dataset.field);
    else if (act === 'discard-draft') discardDraft();
    else if (act === 'delete') askDelete();
  }
  function onInput(e) {
    if (!S || S.closed) return;
    var f = fieldOf(e.target); if (!f) return;
    S.touched[f] = true; S.dirtyByUser = true;
    if (S.errors[f]) { var m = validate(f); if (m !== S.errors[f]) setError(f, m); }
    if (S.marks[f]) { delete S.marks[f]; renderMark(f); } // the mark stays until the field is edited
    if (f === 'title') {
      var t = e.target;
      if (/[\r\n]/.test(t.value)) { var at = t.selectionStart; t.value = t.value.replace(/[\r\n]+/g, ' '); t.setSelectionRange(at, at); } // pasted line breaks
      updateDoor(); fitTitle();
    }
    if (f === 'target') updatePreview();
    if (f === 'description') renderCounter();
    if (f === 'targetDate') renderDateHelp();
    saveDraft();
  }
  function onChange(e) {
    if (!S || S.closed) return;
    var t = e.target;
    if (t.name === 'kind') { setKind(t.value); S.dirtyByUser = true; saveDraft(); }
    else if (t.id === 'cover-file') onFile(t.files && t.files[0]);
    else if (t.id === 'f-date') { S.touched.targetDate = true; renderDateHelp(); if (S.errors.targetDate) setError('targetDate', validate('targetDate')); }
  }
  function onBlur(e) {
    if (!S || S.closed) return;
    var f = fieldOf(e.target); if (!f || !S.touched[f]) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-act="cancel"]')) return; // don't nag on the way out
    setError(f, validate(f));
  }
  function onKey(e) {
    // Title is a textarea, so Enter never adds a line. Quick capture: on create it moves on to Target when a
    // money goal has none yet; otherwise it submits, as Enter does in the other single-line fields.
    if (e.key !== 'Enter' || e.isComposing || !S || e.target.id !== 'f-title') return;
    e.preventDefault();
    var t = $('#f-target');
    if (S.mode === 'create' && S.kind === 'money' && !t.value.trim() && e.target.value.trim()) { t.focus(); return; }
    var form = $('#goal-form');
    if (form.requestSubmit) form.requestSubmit($('#primary')); else $('#primary').click();
  }
  function onData(ev) {
    if (!S || S.closed || S.mode !== 'edit' || ev.goalId !== S.id || ev.source === 'me' || S.socketDown) return;
    if (ev.type === 'goal-deleted') { renderGone(true); return; }
    if (ev.type === 'goal-updated') {
      var actor = ev.by === Z.me ? { kind: 'self' } : { kind: 'partner', id: ev.by, name: Z.name(ev.by) };
      if (merge(snap(Z.goal(S.id)), actor)) showNotice(actor, false);
      return;
    }
    if (ev.type === 'entry-added' || ev.type === 'entry-removed') updatePreview(); // completion may have moved
  }
  function onConn(e) {
    if (!S || S.closed) return;
    renderActions(); renderCover(); // the one announcement is Z.offlineMessage / Z.onlineMessage, set in mount
  }
  // The footer bar rides the on-screen keyboard (iOS ignores interactive-widget), like Home's sheet.
  function placeDock() {
    var d = $('.dock'); if (!d) return;
    if (!window.visualViewport || !Z.isPhone() || visualViewport.scale > 1.01) { d.style.bottom = ''; return; }
    var kb = Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop);
    d.style.bottom = kb > 0 ? kb + 'px' : '';
  }
  var EVENTS = { click: onClick, input: onInput, change: onChange, focusout: onBlur, keydown: onKey, submit: onSubmit };
  function wire(on) {
    Object.keys(EVENTS).forEach(function (k) { root[on ? 'addEventListener' : 'removeEventListener'](k, EVENTS[k]); });
    Z[on ? 'on' : 'off']('change', onData); Z[on ? 'on' : 'off']('connection', onConn);
    if (window.visualViewport) ['resize', 'scroll'].forEach(function (k) { visualViewport[on ? 'addEventListener' : 'removeEventListener'](k, placeDock); });
  }

  // ---------- fixtures (ia.md §8) ----------
  var EX = { title: 'Summer in Essaouira', target: '12,000', date: '2027-07-03', desc: 'A week by the sea after the wedding.', percentTitle: 'Retile the kitchen' };
  function prefill(details) {
    S.prefilled = true;
    setVal('title', EX.title); setVal('target', EX.target);
    if (details) { setVal('targetDate', EX.date); setVal('description', EX.desc); openDetails(true); }
  }
  function theirs(g) { return g.id === 'wedding' ? { title: 'Our wedding', targetDate: Z.D(2027, 6, 19) } : { targetDate: Z.D(2027, 6, 19) }; }
  function mineEdits(g) { if (g.id === 'wedding') { setVal('title', 'Our wedding in Fes'); setVal('target', '22,000'); } }
  // Returns true when it set focus itself.
  function applyFixture(fx) {
    var create = S.mode === 'create', g = S.goal;
    switch (fx) {
      case 'invalid':
        if (create) { S.prefilled = true; setVal('target', '0'); } else setVal('title', '');
        focusField(validateAll()); return true;
      case 'percent':
        if (!create) return false;
        S.prefilled = true; setVal('title', EX.percentTitle); setKind('general', true); return false;
      case 'details':
        if (create) prefill(true); return false;
      case 'offline': case 'uploads-off':
        if (create) prefill(fx === 'uploads-off'); return false;
      case 'cover-uploading': case 'cover-failed':
        if (!Z.uploadsEnabled) return false;
        if (create) prefill(true);
        S.cover = fx === 'cover-uploading' ? { state: 'uploading', example: true, pct: 58 } : { state: 'failed', example: true };
        renderCover();
        if (fx === 'cover-uploading') { startUpload({ from: 58, step: 1, every: 220 }); return false; }
        $('#cover-retry').focus(); return true;
      case 'completion-preview':
        if (create || g.kind !== 'money' || !Z.progress(g)) return false;
        setVal('target', inputAmount(Z.isDone(g) ? g.target + 2000 : Math.floor(Z.progress(g) / 1000) * 1000)); return false;
      case 'partner-changed':
        if (create) return false;
        mineEdits(g);
        later(function () { Z.partner.updateGoal(g.id, theirs(g), {}); }, 300); // Youssef saves while Sara is typing
        return false;
      case 'conflict': case 'not-found':
        if (create) return false;
        mineEdits(g);
        S.socketDown = true; // the realtime notice never arrives, so Save meets a 409 / 404
        if (fx === 'conflict') Z.partner.updateGoal(g.id, theirs(g), {}); else Z.partner.deleteGoal(g.id);
        S.socketDown = false;
        commitEdit();
        return true;
      case 'delete-confirm':
        if (create) return false;
        $('#delete').focus(); askDelete(); return true;
    }
    return false;
  }

  // ---------- view ----------
  Z.view('form', {
    mount: function (el, r) {
      root = el; wire(true);
      var g = r.mode === 'edit' ? Z.goal(r.id) : null;
      if (r.mode === 'edit' && !g) { S = null; renderGone(false); return; }
      S = newState(r, g);
      Z.title(r.mode === 'create' ? C.docCreate : sDocEdit(g.title));
      render();
      var fx = Z.fixture('form'), draft = fx ? null : readDraft(), focused = false;
      if (draft) restoreDraft(draft);
      if (fx) focused = applyFixture(fx);
      // The footnote only where example values are on screen: the seeded goals, or a prefilled fixture (critic F10).
      if (S && !S.closed) Z.footnote((S.mode === 'edit' && isExample(S.goal)) || S.prefilled ? C.example : '');
      // One connection announcement, in this screen's words (a11y review): the shell reads these.
      if (S && !S.closed) {
        Z.offlineMessage = r.mode === 'create' ? C.createOffline : C.editOffline;
        Z.onlineMessage = r.mode === 'create' ? C.createOnline : C.editOnline;
      }
      placeDock();
      if (focused) return 'focus-handled';
      if (S && S.mode === 'create') { Z.focus($('#f-title')); return 'focus-handled'; } // quick capture: Title is focused
      // Edit: the shell focuses the h1 (no keyboard pop-up on phones).
    },
    unmount: function () {
      if (S) {
        if (!S.closed && S.dirtyByUser) { clearTimeout(S.draftT); writeDraft(); } // drafts outlast navigation
        stopUpload(); S.timers.forEach(clearTimeout); clearTimeout(S.draftT); revokeUrls();
      }
      var d = $('.dock'); if (d) d.style.bottom = '';
      wire(false);
      S = null; root = null;
    }
  });
})();
