/* Create and edit trip (#/trips/new · #/trips/:id/edit[?focus=dates|budget]). Direction B · Saffron light.
   One view for both modes (route.mode 'create' | 'edit'): ia.md D12–D14, §2, F10–F12, §4.10–4.11, §5.7, §6.
   Ported from .ux-forge/goals/form.js (same structure and behaviour); the fields are the trip's.
   Fixtures (?state=, initial route only; one query param):
     #/trips/new               invalid · one-date · details · date-preview · cover-uploading · cover-failed
                               · offline · uploads-off
     #/trips/chefchaouen/edit  invalid · one-date · date-preview · partner-changed · conflict · not-found
                               · delete-confirm · focus-budget · offline · uploads-off · cover-uploading · cover-failed
   Drafts (D13): localStorage 'zamane.trips.draft.new' and 'zamane.trips.draft.edit.<id>', written on input, kept
   through navigation and reload, cleared on create, save, delete, discard and cancel. Every storage call is in try/catch. */
(function () {
  'use strict';
  var esc = Z.esc, svg = Z.svg;
  var root = null, S = null;
  // copy.md open item 6: prototype defaults [VERIFY with the architecture]
  var MAX_TITLE = 80, MAX_DEST = 80, MAX_NOTES = 4000, LONG_TRIP = 31, MAX_BYTES = 10 * 1024 * 1024;
  var PHOTO_TYPES = /^image\/(jpeg|png|webp)$/;
  var DRAFT = 'zamane.trips.draft.';

  // ---------- strings: copy.md §7, Confirmations, Toasts, Accessibility strings; verbatim ----------
  var C = {
    createHeading: 'New trip', editHeading: 'Edit trip', cancel: 'Cancel',
    createSubmit: 'Create trip', createPending: 'Creating…', createWaiting: 'Creating after the photo…',
    createOffline: 'You\'re offline. You can create the trip when you\'re back online. What you\'ve typed stays here.',
    createOnline: 'Back online. You can create the trip now.', created: 'Trip created.',
    createFailed: 'Couldn\'t create the trip. Try again.',
    editSubmit: 'Save changes', editPending: 'Saving…',
    editOffline: 'You\'re offline. You can save your changes when you\'re back online. What you\'ve changed stays here.',
    editOnline: 'Back online. You can save your changes now.', editFailed: 'Couldn\'t save the changes. Try again.',
    saved: 'Changes saved',
    titleLabel: 'Title', titleHelp: 'For example, Weekend in Fes',
    details: 'Optional details',
    destLabel: 'Destination', destHelp: 'Optional. A city, a region or a country.',
    datesLegend: 'Dates', datesHelp: 'Optional. Add both days, or leave both empty.',
    firstLabel: 'First day', lastLabel: 'Last day', datesPassed: 'These dates have passed.',
    budgetLabel: 'Budget', budgetLabelRest: ' in MAD', budgetHelp: 'Optional. What you two want to spend in total.',
    notesLabel: 'Notes', notesHelp: 'Optional. Anything you both should know.',
    coverLabel: 'Cover photo', coverHelp: 'Shown on the trip\'s card. Without one, the first letter of the title is used.',
    coverAdd: 'Add a cover photo', coverReplace: 'Replace', coverReplaceLabel: 'Replace cover photo',
    coverRemove: 'Remove', coverRemoveLabel: 'Remove cover photo',
    coverUploading: 'Uploading photo…', coverUploadingAnn: 'Uploading photo.', coverUploadedAnn: 'Photo added.',
    coverFailed: 'The photo didn\'t upload. Try again or remove it.', retry: 'Try again', retryLabel: 'Try again: cover photo',
    coverOffline: 'Photos need a connection.',
    coverRestore: 'The cover changes when you save. Cancel keeps the current one.',
    errTitleEmpty: 'Enter a title for the trip.',
    errFirstMissing: 'Add the first day too, or clear the last day.', errLastMissing: 'Add the last day too, or clear the first day.',
    errDate: 'Enter a valid date.',
    errBudgetFormat: 'Use numbers only, for example 8000 or 8000,50.', errBudgetZero: 'Enter a budget greater than 0, or leave it empty.',
    previewCleared: 'The trip will have no dates. Dated plan items keep their dates.',
    previewNow: 'The trip will be happening now.', previewPast: 'The trip will be in the past.',
    draftRestored: 'Draft restored.', draftDiscard: 'Discard draft',
    createDiscardTitle: 'Discard this trip?', createDiscardBody: 'What you\'ve typed will be lost.',
    editDiscardTitle: 'Discard your changes?', keepEditing: 'Keep editing', discard: 'Discard',
    useTheirs: 'Use theirs', emptyValue: '(empty)', resolvedAnn: 'Their version is in the field.',
    goneSaved: 'This trip was deleted. Your changes weren\'t saved.', backToTrips: 'Back to Trips',
    goneHeading: 'This trip isn\'t here any more', goneBody: 'It may have been deleted.',
    goneLiveBody: 'Its plan, places and checklist are gone too.',
    del: 'Delete trip', delOffline: 'Deleting needs a connection.', delKeep: 'Keep trip', deleting: 'Deleting…',
    delCover: 'The cover photo is deleted too.', delFailed: 'Couldn\'t delete the trip. Try again.',
    example: 'Example data. The values in this form are made up.',
    docCreate: 'New trip – Zamane', docGone: 'Trip not found – Zamane'
  };
  var LABEL = { title: C.titleLabel, destination: C.destLabel, dates: C.datesLegend, budget: C.budgetLabel, notes: C.notesLabel, cover: C.coverLabel };
  function sTooLong(what, max) { return 'Use ' + Z.fmt(max) + ' characters or fewer for the ' + what + '.'; }
  function sBeforeFirst(first) { return 'Choose a last day on or after ' + Z.day(first) + '.'; }
  function sLong(n) { return 'That\'s ' + n + ' ' + Z.plural(n, 'day', 'days') + '.'; }
  function sOutside(n) {
    return n === 1 ? '1 plan item will fall outside the new dates. It stays in the plan, under Outside the trip dates.'
      : n + ' plan items will fall outside the new dates. They stay in the plan, under Outside the trip dates.';
  }
  function sUnsupported(name) { return name + ' isn\'t a supported photo. Use a JPEG, PNG or WebP file.'; }
  function sTooLarge(name) { return name + ' is over 10 MB. Choose a smaller photo.'; }
  function sEditDiscardBody(t) { return 'Your changes to ' + t + ' won\'t be saved.'; }
  function sDocEdit(t) { return 'Edit ' + t + ' – Zamane'; }
  function sDocDeleted(t) { return t + ' was deleted – Zamane'; }
  function sLiveDeleted(name, t) { return name + ' deleted ' + t + '.'; }
  function sNotice(a) {
    if (a.kind === 'partner') return a.name + ' changed this trip while you were editing. Check the marked fields, then save again.';
    if (a.kind === 'self') return 'This trip changed on your other device while you were editing. Check the marked fields, then save again.';
    return 'This trip changed on another phone while you were editing. Check the marked fields, then save again.';
  }
  function sChangedBy(a) { return a.kind === 'partner' ? 'Changed by ' + a.name : a.kind === 'self' ? 'Changed on your other device' : 'Changed on another phone'; }
  function sConflict(a, v) {
    var q = '"' + v + '".';
    return a.kind === 'partner' ? a.name + ' changed this to ' + q : a.kind === 'self' ? 'Your other device changed this to ' + q : 'Another phone changed this to ' + q;
  }
  function sConflictDates(a, range) {
    return a.kind === 'partner' ? a.name + ' changed the dates to ' + range + '.' : a.kind === 'self' ? 'Your other device changed the dates to ' + range + '.' : 'Another phone changed the dates to ' + range + '.';
  }
  function sConflictCover(a) { return a.kind === 'partner' ? a.name + ' changed the cover photo.' : a.kind === 'self' ? 'Your other device changed the cover photo.' : 'Another phone changed the cover photo.'; }
  function count(n, one, other) { return n + ' ' + Z.plural(n, one, other); }
  function sDelTitle(t) { return 'Delete ' + t + '?'; }
  function sDelBody(t) { // tripConfirm.trip.body: one plural argument per noun; counts from the cached detail (A12)
    return 'This deletes its ' + count(Z.entries(t.id).length, 'plan item', 'plan items') + ', ' + count(Z.places(t.id).length, 'place', 'places') +
      ' and ' + count(Z.items(t.id).length, 'checklist item', 'checklist items') + ', for both of you. You can\'t undo this.';
  }
  function sDeleted(t) { return t + ' deleted'; } // tripToast.deleted
  function sErrorCount(n) { return n + ' fields need your attention.'; } // Goals' a11y-review wording; not in copy.md yet → Writer

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
  var F = { // input field → element ids. "first" and "last" share the Dates helper, preview and merge mark.
    title: { input: 'f-title', help: 'f-title-help', err: 'f-title-err', mark: 'f-title-mark' },
    destination: { input: 'f-dest', help: 'f-dest-help', err: 'f-dest-err', mark: 'f-dest-mark' },
    first: { input: 'f-first', help: 'f-dates-help', err: 'f-first-err', mark: 'f-dates-mark' },
    last: { input: 'f-last', help: 'f-dates-help', err: 'f-last-err', mark: 'f-dates-mark' },
    budget: { input: 'f-budget', help: 'f-budget-help', err: 'f-budget-err', mark: 'f-budget-mark' },
    notes: { input: 'f-notes', help: 'f-notes-help', err: 'f-notes-err', mark: 'f-notes-mark' }
  };
  var INPUTS = ['title', 'destination', 'first', 'last', 'budget', 'notes'];
  function fieldOf(el) { for (var f in F) if (F[f].input === el.id) return f; return null; }
  function mergeKey(f) { return f === 'first' || f === 'last' ? 'dates' : f; }
  function later(fn, ms) { var t = setTimeout(function () { if (S) fn(); }, ms); if (S) S.timers.push(t); return t; }
  function isIso(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || ''); }
  function val(id) { var el = $('#' + id); return el ? el.value : ''; }
  // field-sizing:content grows the Title; where it isn't supported, size it from scrollHeight.
  var SIZING = window.CSS && CSS.supports && CSS.supports('field-sizing', 'content');
  function fitTitle() { var t = $('#f-title'); if (!t || SIZING) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  function parseBudget(raw) {
    var r = Z.parseMoney(raw);
    if (r.error) return { error: C.errBudgetFormat };
    if (r.value === 0) return { error: C.errBudgetZero }; // [VERIFY whether 0 is allowed]
    return r;
  }
  function snap(t) { // the editable fields of a row (also accepts the 409 body)
    return { title: t.title || '', destination: t.destination || '', dates: (t.start || '') + '|' + (t.start ? (t.end || t.start) : ''),
      budget: t.budget != null ? Number(t.budget) : null, notes: t.notes || '',
      cover: t.cover ? JSON.parse(JSON.stringify(t.cover)) : null, updatedAt: t.updatedAt };
  }
  function coverKey(c) { return c ? (c.url || (c.example ? 'example' : 'cover')) : ''; }
  function coverValue() { var c = S.cover; return c.state === 'none' ? null : c.example ? { example: true } : { url: c.url }; }
  function norm(f, v) {
    if (f === 'title' || f === 'destination' || f === 'notes') return String(v || '').trim();
    if (f === 'budget') {
      if (v == null || String(v).trim() === '') return '';
      if (typeof v === 'number') return String(v);
      var p = Z.parseMoney(v); return p.value != null ? String(p.value) : 'raw:' + String(v).trim();
    }
    if (f === 'dates') return String(v || '|');
    if (f === 'cover') return coverKey(v);
    return String(v);
  }
  function editable() { var f = ['title', 'destination', 'dates', 'budget', 'notes']; if (Z.uploadsEnabled) f.push('cover'); return f; }
  function mine() {
    return { title: val('f-title'), destination: val('f-dest'), dates: val('f-first') + '|' + val('f-last'),
      budget: val('f-budget'), notes: val('f-notes'), cover: coverValue() };
  }
  function curTitle() { return val('f-title').trim(); }
  // A pair the form would save: both empty, or both set with last ≥ first.
  function datePair() {
    var a = val('f-first'), b = val('f-last'), fa = $('#f-first'), fb = $('#f-last');
    if ((fa && fa.validity && fa.validity.badInput) || (fb && fb.validity && fb.validity.badInput)) return null;
    if (!a && !b) return { start: null, end: null };
    if (isIso(a) && isIso(b) && b >= a) return { start: a, end: b };
    return null;
  }

  // ---------- state ----------
  function newState(r, t) {
    return { route: r, mode: r.mode, id: r.id || null, trip: t, base: t ? snap(t) : null,
      cover: t && t.cover ? { state: 'done', example: !!t.cover.example, url: t.cover.url || null } : { state: 'none' },
      errors: {}, touched: {}, marks: {}, pending: false, waiting: false, deleting: false, retried: false, socketDown: false,
      detailsOpen: r.mode === 'edit', previewMsg: '', bandKey: null,
      coverError: '', restored: false, closed: false, dirtyByUser: false, prefilled: false, countAlert: false,
      timers: [], upload: null, urls: [], doorKey: '', draftT: null };
  }

  // ---------- markup ----------
  function field(f, label, control, opts) {
    var c = F[f];
    return '<div class="fg">' +
      '<label class="field-label" for="' + c.input + '">' + label + '</label>' + control +
      '<p class="help" id="' + c.help + '">' + opts.help + '</p><p class="err" id="' + c.err + '" hidden></p>' +
      '<div class="mark-slot" id="' + c.mark + '"></div>' +
    '</div>';
  }
  function render() {
    var create = S.mode === 'create', t = S.trip;
    var v = t ? { title: t.title, destination: t.destination || '', start: t.start || '', end: t.start ? (t.end || t.start) : '',
      budget: t.budget != null ? Z.fmt(t.budget) : '', notes: t.notes || '' } : { title: '', destination: '', start: '', end: '', budget: '', notes: '' };
    var h = '<div class="form-page">' +
      '<header class="task-head">' +
        '<button type="button" class="link-btn task-cancel" data-act="cancel">' + svg('x') + '<span>' + C.cancel + '</span></button>' +
        '<h1 class="task-title" id="form-h">' + (create ? C.createHeading : C.editHeading) + '</h1>' +
      '</header>' +
      '<form class="trip-form" id="trip-form" novalidate aria-labelledby="form-h">' +
        '<div class="form-slot" id="form-alert" role="alert"></div>' +
        '<div class="form-slot" id="merge-notice"></div>' +
        '<div class="form-slot" id="draft-notice"></div>' +
        // 1 · Title: Young Serif 28/34 in the field; a one-row textarea that grows (Goals critic F9)
        '<div class="fg">' +
          '<label class="field-label" for="f-title">' + C.titleLabel + '</label>' +
          '<div class="field field-title"><textarea id="f-title" name="title" rows="1" required autocomplete="off" autocapitalize="sentences"' +
            ' enterkeyhint="done" aria-describedby="f-title-help">' + esc(v.title) + '</textarea></div>' +
          '<p class="help" id="f-title-help">' + C.titleHelp + '</p><p class="err" id="f-title-err" hidden></p>' +
          '<div class="mark-slot" id="f-title-mark"></div>' +
        '</div>' +
        // 2 · Optional details: folded on create, unfolded (no toggle) on edit (D12)
        (create ? '<button type="button" class="details-toggle" data-act="details" aria-expanded="false" aria-controls="details"><span>' + C.details + '</span>' + svg('chevronDown') + '</button>' : '') +
        '<div class="details" id="details"' + (S.detailsOpen ? '' : ' hidden') + '>' +
          field('destination', C.destLabel,
            '<div class="field"><input id="f-dest" name="destination" type="text" autocomplete="off" autocapitalize="words" enterkeyhint="next" value="' + esc(v.destination) + '" aria-describedby="f-dest-help"></div>',
            { help: C.destHelp }) +
          // Dates: one fieldset, both or neither, last ≥ first. The last-day picker opens at the first day (min).
          '<fieldset class="fg dates" id="g-dates">' +
            '<legend class="field-label">' + C.datesLegend + '</legend>' +
            '<div class="dates-grid">' +
              '<div class="date-cell"><label class="field-label sub-label" for="f-first">' + C.firstLabel + '</label>' +
                '<div class="field field-date"><input id="f-first" name="start" type="date" autocomplete="off" value="' + esc(v.start) + '" aria-describedby="f-dates-help"></div>' +
                '<p class="err" id="f-first-err" hidden></p></div>' +
              '<div class="date-cell"><label class="field-label sub-label" for="f-last">' + C.lastLabel + '</label>' +
                '<div class="field field-date"><input id="f-last" name="end" type="date" autocomplete="off" value="' + esc(v.end) + '"' + (v.start ? ' min="' + esc(v.start) + '"' : '') + ' aria-describedby="f-dates-help"></div>' +
                '<p class="err" id="f-last-err" hidden></p></div>' +
            '</div>' +
            '<p class="help" id="f-dates-help">' + C.datesHelp + '</p>' +
            (create ? '' : '<div class="preview" id="f-dates-preview" role="status"></div>') +
            '<div class="mark-slot" id="f-dates-mark"></div>' +
          '</fieldset>' +
          '<div class="fg" id="g-budget">' +
            '<label class="field-label" for="f-budget">' + C.budgetLabel + '<span class="vh">' + C.budgetLabelRest + '</span></label>' +
            '<div class="field field-num field-budget"><input id="f-budget" name="budget" type="text" inputmode="decimal" autocomplete="off"' +
              ' enterkeyhint="next" value="' + esc(v.budget) + '" aria-describedby="f-budget-help">' +
              '<span class="suffix" aria-hidden="true">MAD</span></div>' +
            '<p class="help" id="f-budget-help">' + C.budgetHelp + '</p><p class="err" id="f-budget-err" hidden></p>' +
            '<div class="mark-slot" id="f-budget-mark"></div>' +
          '</div>' +
          field('notes', C.notesLabel,
            '<div class="field field-area"><textarea id="f-notes" name="notes" rows="3" autocomplete="off" enterkeyhint="enter" aria-describedby="f-notes-help">' + esc(v.notes) + '</textarea></div>',
            { help: C.notesHelp }) +
          '<div id="cover-slot">' + coverGroup(v.title.trim()) + '</div>' +
          // Uploads off: no cover preview to sit under, so the light-band preview ends the details (create only)
          (create && !Z.uploadsEnabled ? '<div class="band-slot" id="band-slot"></div>' : '') +
        '</div>' +
        // 3 · The primary: a footer bar on phones (rides the keyboard); ends the form from 48rem, then Cancel
        '<div class="form-actions">' +
          '<div class="dock"><button type="submit" class="btn-primary" id="primary">' + svg('check') + '<span class="primary-text"></span></button></div>' +
          '<button type="button" class="btn-sec form-cancel" data-act="cancel">' + C.cancel + '</button>' +
        '</div>' +
        '<p class="notice submit-reason" id="submit-reason" hidden>' + svg('cloudOff') + '<span></span></p>' +
      '</form>' +
      (create ? '' :
        '<div class="delete-zone">' +
          '<button type="button" class="btn-danger" id="delete" data-act="delete">' + svg('trash') + '<span class="delete-text">' + C.del + '</span></button>' +
          '<p class="help" id="delete-reason" hidden>' + C.delOffline + '</p>' +
        '</div>') +
    '</div>';
    root.innerHTML = h;
    renderActions(); renderDates(); fitTitle();
  }
  // Seeded example trips were created before the prototype's "today"; trips made in this session weren't.
  function isExample(t) { return !!t && new Date(t.createdAt) < Z.D(2026, 11, 9, 0); }

  // ---------- cover: a doorway preview, upload simulated, uploads-off = no control at all ----------
  function doorHTML(title) {
    S.doorKey = title.charAt(0).toUpperCase() + '|' + coverKey(coverValue());
    return Z.doorway({ title: title, cover: coverValue() }, 'form');
  }
  function updateDoor() {
    var st = $('.cover-stage'); if (!st) return;
    var t = curTitle(), key = t.charAt(0).toUpperCase() + '|' + coverKey(coverValue());
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
      // Create: a static light-band preview under the cover once both dates are in (direction B)
      (S.mode === 'create' ? '<div class="band-slot" id="band-slot">' + bandHTML() + '</div>' : '') +
      (err ? '<p class="err" id="cover-err" role="alert">' + svg('alert') + '<span>' + esc(err) + '</span></p>' : '') +
      '<div class="cover-actions">';
    if (failed) h += '<button type="button" class="btn-sec" id="cover-retry" data-act="cover-retry" aria-label="' + C.retryLabel + '" aria-describedby="cover-err' + offId + '"' + dis + '>' + svg('refresh') + C.retry + '</button>';
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
    renderCover('cover-replace'); // focus stays on the next control
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

  // ---------- dates: helper, light-band preview (create), date-change preview (edit) ----------
  function bandHTML() {
    var p = datePair(); if (!p || !p.start) return '';
    // A temporary trip object: the band says what the detail will say ("12 days to go · 4 nights").
    return Z.lightBand({ title: curTitle(), start: p.start, end: p.end }, { lead: false, nights: true });
  }
  function renderBand() {
    var slot = $('#band-slot'); if (!slot) return;
    var p = datePair(), key = p && p.start ? p.start + '|' + p.end : '';
    if (key === S.bandKey) return;
    S.bandKey = key; slot.innerHTML = bandHTML();
  }
  function renderDates() {
    var a = val('f-first'), b = val('f-last'), last = $('#f-last'); if (!last) return;
    if (isIso(a)) last.min = a; else last.removeAttribute('min');
    // Helpers, not errors (F10): dates in the past, or a trip longer than 31 days
    var help = $('#f-dates-help'), p = datePair(), msg = C.datesHelp;
    if (p && p.start) {
      var n = Z.dayDiff(p.start, p.end) + 1;
      if (p.end < Z.today()) msg = C.datesPassed;
      else if (n > LONG_TRIP) msg = sLong(n);
    }
    if (help.textContent !== msg) help.textContent = msg;
    renderBand();
    updatePreview();
  }
  // Edit: what the new dates will do, before saving (D12). Polite (role=status), under Dates.
  function previewLines() {
    var t = S.trip, p = datePair();
    if (!t || !p) return [];
    var oldStart = t.start || null, oldEnd = t.start ? (t.end || t.start) : null;
    if (p.start === oldStart && p.end === oldEnd) return [];
    if (!p.start) return oldStart ? [C.previewCleared] : [];
    var lines = [];
    // Plan items that newly fall outside: dated, not outside today (an undated trip has no "outside"), outside the new range.
    var n = Z.entries(t.id).filter(function (e) {
      if (!e.date) return false;
      var wasIn = !oldStart || (e.date >= oldStart && e.date <= oldEnd);
      return wasIn && (e.date < p.start || e.date > p.end);
    }).length;
    if (n) lines.push(sOutside(n));
    var was = Z.status(t).kind, will = Z.status({ start: p.start, end: p.end }).kind;
    if (will === 'now' && was !== 'now') lines.push(C.previewNow);
    else if (will === 'past' && was !== 'past') lines.push(C.previewPast);
    return lines;
  }
  function updatePreview() {
    var el = $('#f-dates-preview'); if (!el) return;
    var lines = previewLines(), msg = lines.join(' ');
    if (msg === S.previewMsg) return;
    S.previewMsg = msg;
    el.innerHTML = lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    describe('first'); describe('last');
  }

  // ---------- validation (copy.md: under the field, blur only after typing, clear as soon as valid) ----------
  // full: also check the pair (one date only), which waits for submit so filling the second day isn't nagged.
  function validate(f, full) {
    var el = $('#' + F[f].input); if (!el) return '';
    var v = el.value;
    if (f === 'title') { v = v.trim(); return !v ? C.errTitleEmpty : v.length > MAX_TITLE ? sTooLong('title', MAX_TITLE) : ''; }
    if (f === 'destination') return v.trim().length > MAX_DEST ? sTooLong('destination', MAX_DEST) : '';
    if (f === 'notes') return v.length > MAX_NOTES ? sTooLong('notes', MAX_NOTES) : '';
    if (f === 'budget') return parseBudget(v).error || '';
    if (el.validity && el.validity.badInput) return C.errDate;
    var a = val('f-first'), b = val('f-last');
    if (f === 'first') return full && !a && b ? C.errFirstMissing : '';
    if (f === 'last') {
      if (full && !b && a) return C.errLastMissing;
      if (isIso(a) && isIso(b) && b < a) return sBeforeFirst(a); // neither value is changed
    }
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
  // aria-describedby lists only what is on screen: error, helper, then the date preview or the merge mark.
  function describe(f) {
    var c = F[f], input = $('#' + c.input); if (!input) return;
    var ids = [];
    if (S.errors[f]) ids.push(c.err);
    ids.push(c.help);
    if ((f === 'first' || f === 'last') && S.previewMsg) ids.push('f-dates-preview');
    if (S.marks[mergeKey(f)]) ids.push(c.mark + '-text');
    input.setAttribute('aria-describedby', ids.join(' '));
  }
  function validateAll() {
    var first = null, n = 0;
    INPUTS.forEach(function (f) { var m = validate(f, true); setError(f, m); if (m) { n++; if (!first) first = f; } });
    if (S.cover.state === 'failed') { n++; if (!first) first = 'cover'; }
    // Several errors: say how many at the top (role=alert); focus still goes to the first.
    if (n > 1) { setAlert(sErrorCount(n)); S.countAlert = true; }
    return first;
  }
  function focusField(f) {
    if (!f) return;
    if (f !== 'title' && !S.detailsOpen) openDetails(true);
    if (f === 'cover') { var r = $('#cover-retry'); if (r) r.focus(); return; }
    var el = $('#' + F[f].input); if (el) el.focus();
  }
  function openDetails(open) {
    S.detailsOpen = open;
    var d = $('#details'), b = $('.details-toggle');
    if (d) d.hidden = !open;
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  function setVal(f, v) {
    var el = $('#' + F[f].input); if (!el) return;
    el.value = v == null ? '' : v;
    if (f === 'title') { updateDoor(); fitTitle(); }
    if (f === 'first' || f === 'last') renderDates();
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
      d.querySelector('.delete-text').textContent = S.deleting ? C.deleting : C.del;
      if (off || S.deleting) d.setAttribute('aria-disabled', 'true'); else d.removeAttribute('aria-disabled');
      if (off) d.setAttribute('aria-describedby', 'delete-reason'); else d.removeAttribute('aria-describedby');
      $('#delete-reason').hidden = !off;
    }
  }
  // A press on an aria-disabled control: nothing changes; its reason is shown next to it and announced once.
  // On phones the reason sits at the top of the form, so the toast repeats it beside the footer bar.
  function disabledPress(msg) { if (Z.isPhone()) Z.toast({ msg: msg }); else Z.announce(msg); }
  function setAlert(msg) {
    var a = $('#form-alert'); if (!a) return;
    a.innerHTML = msg ? '<p class="notice notice-danger">' + svg('alert') + '<span>' + esc(msg) + '</span></p>' : '';
  }

  // ---------- submit ----------
  function onSubmit(e) {
    e.preventDefault();
    if (!S || S.closed) return;
    if (S.pending || S.waiting || S.deleting) return; // a double tap is ignored
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
    var p = datePair() || { start: null, end: null };
    var o = { title: val('f-title').trim(), destination: val('f-dest').trim(), start: p.start, end: p.end,
      budget: parseBudget(val('f-budget')).value, notes: val('f-notes').trim() };
    if (o.budget === undefined) o.budget = null;
    if (Z.uploadsEnabled) o.cover = coverValue(); // with uploads off an existing cover is left alone
    return o;
  }
  function keepUrl(cover) { if (cover && cover.url) S.urls = S.urls.filter(function (u) { return u !== cover.url; }); }
  function commitCreate() {
    var o = fieldsOut(), t;
    try { t = Z.createTrip(o); } catch (err) { renderActions(); setAlert(C.createFailed); return; }
    S.closed = true; keepUrl(o.cover); clearDraft();
    Z.go('#/trips/' + t.id, { replace: true }); // ia.md §2: create replaces /trips/new; the shell focuses the h1
    Z.announce(C.created);
  }
  function commitEdit() {
    var o = fieldsOut(), res;
    try { res = Z.updateTrip(S.id, o, { updatedAt: S.base.updatedAt }); } catch (err) { renderActions(); setAlert(C.editFailed); return; }
    if (res.notFound) { renderGone('saved'); return; }
    if (res.conflict) {
      // 409: merge with the row in the body. The socket was down, so the actor is unknown (Goals §6.7).
      var n = merge(snap(res.current), { kind: 'other' });
      if (!n && !S.retried) { S.retried = true; doSubmit(true); return; } // nothing editable differs: one silent retry
      S.retried = false; renderActions(); showNotice({ kind: 'other' }, true);
      return;
    }
    S.closed = true; keepUrl(o.cover); clearDraft();
    Z.flash({ msg: C.saved });
    focusEditOnReturn(S.id);
    if (Z.canGoBack() && back(1) === '/trips/' + S.id) Z.back(); // save pops back to the detail
    else Z.go('#/trips/' + S.id, { replace: true });
  }

  // ---------- the three-way merge (Goals §6.7; the dates are one field) ----------
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
    var t = Z.trip(S.id); if (t) S.trip = t;
    ['title', 'destination', 'dates', 'budget', 'notes'].forEach(renderMark);
    if (Z.uploadsEnabled) renderCover();
    renderDates();
    return n;
  }
  function apply(f, v) {
    if (f === 'cover') { stopUpload(); S.cover = v ? { state: 'done', example: !!v.example, url: v.url || null } : { state: 'none' }; renderCover(); return; }
    if (f === 'dates') {
      var p = String(v || '|').split('|');
      setVal('first', p[0]); setVal('last', p[1]); setError('first', ''); setError('last', '');
      return;
    }
    setVal(f, f === 'budget' ? (v != null ? Z.fmt(v) : '') : v);
    setError(f, '');
  }
  function shown(f, v) {
    if (v == null || v === '') return C.emptyValue;
    if (f === 'budget') return Z.mad(v);
    if (f === 'notes') { v = String(v).trim(); return v.length > 60 ? v.slice(0, 57).trim() + '…' : v; }
    return String(v);
  }
  function who(a) { return a.kind === 'partner' ? Z.av(a.id, 'sm') : svg('refresh'); }
  function markHTML(f) {
    var m = S.marks[f]; if (!m) return '';
    var id = (f === 'cover' ? 'cover-mark' : f === 'dates' ? 'f-dates-mark' : F[f].mark) + '-text';
    if (m.type === 'changed') return '<p class="mark">' + who(m.actor) + '<span class="mark-text" id="' + id + '">' + esc(sChangedBy(m.actor)) + '</span></p>';
    var text;
    if (f === 'cover') text = sConflictCover(m.actor);
    else if (f === 'dates') { var p = String(m.value || '|').split('|'); text = p[0] ? sConflictDates(m.actor, Z.range(p[0], p[1])) : sConflict(m.actor, C.emptyValue); }
    else text = sConflict(m.actor, shown(f, m.value));
    // "Use theirs: {fieldLabel}": the name starts with the visible text (copy.md, WCAG 2.5.3); the line describes it.
    return '<div class="mark mark-conflict">' + who(m.actor) + '<span class="mark-text" id="' + id + '">' + esc(text) + '</span>' +
      '<button type="button" class="link-btn" data-act="use-theirs" data-field="' + f + '" aria-label="' + esc(C.useTheirs + ': ' + LABEL[f]) + '" aria-describedby="' + id + '">' + C.useTheirs + '</button></div>';
  }
  function renderMark(f) {
    if (f === 'cover') { renderCover(); return; }
    var slotId = f === 'dates' ? 'f-dates-mark' : F[f].mark, slot = $('#' + slotId); if (!slot) return;
    var a = document.activeElement, had = a && slot.contains(a);
    slot.innerHTML = markHTML(f);
    if (f === 'dates') { describe('first'); describe('last'); } else describe(f);
    if (had) { var el = $('#' + F[f === 'dates' ? 'first' : f].input); if (el) el.focus(); }
  }
  function useTheirs(f) {
    var m = S.marks[f]; if (!m) return;
    delete S.marks[f];
    apply(f, m.value);
    if (f === 'cover') { var b = $('.cover-actions button'); if (b) b.focus(); }
    else { renderMark(f); $('#' + F[f === 'dates' ? 'first' : f].input).focus(); }
    Z.announce(C.resolvedAnn);
    S.dirtyByUser = true; saveDraft();
  }
  function showNotice(actor, focus) {
    var text = sNotice(actor), el = $('#merge-notice');
    el.innerHTML = '<p class="notice notice-merge" id="merge-text" role="status" tabindex="-1">' + svg('refresh') + '<span>' + esc(text) + '</span></p>';
    if (focus) $('#merge-text').focus(); // after a 409 focus goes to the notice
    else Z.announce(text);               // live: one polite announcement, focus stays put
  }

  // ---------- not found / deleted while editing ----------
  // kind: 'saved' (404 on save) · 'live' (the partner deleted it, o.name) · 'missing' (a bad id)
  function renderGone(kind, o) {
    o = o || {};
    if (S) { stopUpload(); S.closed = true; clearDraft(); }
    Z.setChrome(''); Z.setFab(false); Z.footnote('');
    Z.title(kind === 'live' ? sDocDeleted(o.title) : C.docGone);
    Z.offlineMessage = null; Z.onlineMessage = null;
    var heading = kind === 'saved' ? C.goneSaved : kind === 'live' ? sLiveDeleted(o.name, o.title) : C.goneHeading;
    var body = kind === 'saved' ? '' : kind === 'live' ? C.goneLiveBody : C.goneBody;
    root.innerHTML = '<div class="form-page gone">' +
      '<h1 class="title-lg" id="form-h" tabindex="-1">' + esc(heading) + '</h1>' +
      (body ? '<p>' + esc(body) + '</p>' : '') +
      '<p><a class="btn-primary" href="#/trips" id="to-trips" data-act="to-trips">' + C.backToTrips + '</a></p></div>';
    if (kind === 'saved') Z.focusHeading();
    if (kind === 'live') Z.focus($('#to-trips')); // copy.md trip.deleted.action: takes focus; the heading is the announcement
  }

  // ---------- delete (confirmed, F12, §6.9) ----------
  function askDelete() {
    if (Z.offline) { disabledPress(C.delOffline); return; } // the reason is shown under the button
    if (S.deleting) return;
    var t = S.trip;
    var body = '<p>' + esc(sDelBody(t)) + '</p>' + (t.cover && Z.uploadsEnabled ? '<p>' + C.delCover + '</p>' : '');
    Z.confirm({ title: sDelTitle(t.title), body: body, confirm: C.del, cancel: C.delKeep }).then(function (ok) {
      if (!ok || !S || S.closed) return;
      S.deleting = true; renderActions(); // "Deleting…" before the work (INP)
      later(function () {
        var res;
        try { res = Z.deleteTrip(t.id); } catch (err) { S.deleting = false; renderActions(); setAlert(C.delFailed); return; }
        if (res.notFound) { renderGone('saved'); return; }
        S.closed = true; clearDraft();
        Z.flash({ msg: sDeleted(t.title) });
        // §2: back two entries when the stack is list → detail → edit; otherwise replace with /trips.
        if (back(1) === '/trips/' + t.id && back(2) === '/trips') history.go(-2);
        else Z.go('#/trips', { replace: true });
      }, 350);
    });
  }

  // ---------- cancel ----------
  function dirty() {
    if (S.mode === 'create') {
      return !!(val('f-title').trim() || val('f-dest').trim() || val('f-first') || val('f-last') || val('f-budget').trim() || val('f-notes').trim() || S.cover.state !== 'none');
    }
    var M = mine();
    return editable().some(function (f) { return norm(f, M[f]) !== norm(f, S.base[f]); });
  }
  // §6.3: after saving or cancelling Edit, focus goes to the detail's Edit, not its h1. One-shot: runs after the
  // detail has mounted (and the shell has focused its h1). If detail.js also does this, the second call is harmless.
  function focusEditOnReturn(id) {
    function once(r) {
      Z.off('route', once);
      if (r.view !== 'detail' || r.id !== id) return;
      var e = document.querySelector('#view a[href="#/trips/' + id + '/edit"]') || document.querySelector('#view [data-act="edit"]');
      if (e) Z.focus(e);
    }
    Z.on('route', once);
  }
  function leave() {
    var parent = S.mode === 'edit' ? '#/trips/' + S.id : '#/trips';
    if (S.mode === 'edit') focusEditOnReturn(S.id);
    S.closed = true; stopUpload(); clearDraft();
    if (Z.canGoBack()) Z.back(); else Z.go(parent, { replace: true }); // ✕ Cancel: back when in the app, else the parent
  }
  function cancel() {
    if (!dirty()) { leave(); return; }
    var create = S.mode === 'create';
    Z.confirm({ title: create ? C.createDiscardTitle : C.editDiscardTitle, body: '<p>' + esc(create ? C.createDiscardBody : sEditDiscardBody(S.trip.title)) + '</p>',
      confirm: C.discard, cancel: C.keepEditing }).then(function (ok) { if (ok && S && !S.closed) leave(); });
  }

  // ---------- drafts (D13): this phone only; localStorage can be missing or throw ----------
  function draftKey() { return DRAFT + (S.mode === 'create' ? 'new' : 'edit.' + S.id); }
  function readDraft() { try { var s = localStorage.getItem(draftKey()); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function clearDraft() { if (S) { clearTimeout(S.draftT); try { localStorage.removeItem(draftKey()); } catch (e) { /* nothing to clear */ } } }
  function saveDraft() { if (!S || S.closed || !S.dirtyByUser) return; clearTimeout(S.draftT); S.draftT = setTimeout(writeDraft, 300); }
  function writeDraft() {
    if (!S || S.closed || !$('#f-title')) return;
    if (!dirty()) { clearDraft(); return; }
    var c = S.cover;
    var d = { v: 1, title: val('f-title'), destination: val('f-dest'), start: val('f-first'), end: val('f-last'), budget: val('f-budget'), notes: val('f-notes'),
      details: S.detailsOpen, cover: c.state === 'none' ? 'none' : c.example ? 'example' : 'keep', base: S.base };
    try { localStorage.setItem(draftKey(), JSON.stringify(d)); } catch (e) { /* private mode: the draft lives only in this page */ }
  }
  function restoreDraft(d) {
    setVal('title', d.title); setVal('destination', d.destination); setVal('first', d.start); setVal('last', d.end);
    setVal('budget', d.budget); setVal('notes', d.notes);
    // An unsaved upload can't outlive the page (its object URL is gone): 'keep' means the saved cover.
    if (d.cover === 'none') S.cover = { state: 'none' };
    else if (d.cover === 'example') S.cover = { state: 'done', example: true };
    if (S.mode === 'create' && (d.details || d.destination || d.start || d.end || d.budget || d.notes || d.cover === 'example')) openDetails(true);
    renderCover();
    S.restored = true; S.dirtyByUser = true;
    $('#draft-notice').innerHTML = '<p class="notice notice-draft">' + svg('pencil') + '<span>' + C.draftRestored + '</span>' +
      '<button type="button" class="link-btn" data-act="discard-draft">' + C.draftDiscard + '</button></p>';
    if (S.mode === 'edit' && d.base) {
      // The trip may have changed since the draft was written: merge against the row it was based on.
      var now = snap(Z.trip(S.id));
      S.base = d.base;
      if (+new Date(d.base.updatedAt) !== +new Date(now.updatedAt)) { if (merge(now, { kind: 'other' })) showNotice({ kind: 'other' }, false); }
      else S.base = now;
    }
    renderDates();
  }
  function discardDraft() {
    clearDraft(); stopUpload(); revokeUrls(); S.timers.forEach(clearTimeout);
    var r = S.route;
    S = newState(r, r.mode === 'edit' ? Z.trip(r.id) : null);
    render();
    if (S.mode === 'create') Z.focus($('#f-title')); else Z.focusHeading();
  }
  function revokeUrls() { if (S) { S.urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* already gone */ } }); S.urls = []; } }

  // ---------- events ----------
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || !root || !root.contains(b)) return;
    var act = b.dataset.act;
    if (act === 'to-trips') { e.preventDefault(); Z.go('#/trips', { replace: true }); return; }
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
    var mk = mergeKey(f);
    if (S.marks[mk]) { delete S.marks[mk]; renderMark(mk); } // the mark stays until the field is edited
    if (f === 'title') {
      var t = e.target;
      if (/[\r\n]/.test(t.value)) { var at = t.selectionStart; t.value = t.value.replace(/[\r\n]+/g, ' '); t.setSelectionRange(at, at); } // pasted line breaks
      updateDoor(); fitTitle();
    }
    if (f === 'first' || f === 'last') {
      renderDates();
      // An error on either day is re-checked on every change to either: it clears as soon as the pair is valid.
      ['first', 'last'].forEach(function (k) { if (S.errors[k]) { var m = validate(k, true); if (m !== S.errors[k]) setError(k, m); } });
    } else if (S.errors[f]) { var m = validate(f, true); if (m !== S.errors[f]) setError(f, m); }
    saveDraft();
  }
  function onChange(e) {
    if (!S || S.closed) return;
    var t = e.target;
    if (t.id === 'cover-file') onFile(t.files && t.files[0]);
    else if (t.id === 'f-first' || t.id === 'f-last') onInput(e); // some pickers only fire change
  }
  function onBlur(e) {
    if (!S || S.closed) return;
    var f = fieldOf(e.target); if (!f || !S.touched[f]) return;
    var rt = e.relatedTarget;
    if (rt && rt.closest && rt.closest('[data-act="cancel"]')) return; // don't nag on the way out
    if (f === 'first' || f === 'last') {
      if (rt && (rt.id === 'f-first' || rt.id === 'f-last')) return; // moving between the two days: wait
      // "The last day is before the first day": on blur of either field; the error sits on Last day.
      if (S.touched.first || S.touched.last) { setError('first', validate('first', !!S.errors.first)); setError('last', validate('last', !!S.errors.last)); }
      return;
    }
    setError(f, validate(f));
  }
  function onKey(e) {
    // Title is a textarea, so Enter never adds a line: it submits, as Enter does in a single-line field (quick capture).
    if (e.key !== 'Enter' || e.isComposing || !S || e.target.id !== 'f-title') return;
    e.preventDefault();
    var form = $('#trip-form');
    if (form.requestSubmit) form.requestSubmit($('#primary')); else $('#primary').click();
  }
  function onData(ev) {
    if (!S || S.closed || S.mode !== 'edit' || ev.tripId !== S.id || ev.source === 'me' || S.socketDown) return;
    if (ev.type === 'trip-deleted') { renderGone('live', { name: Z.name(ev.by), title: S.trip.title }); return; }
    if (ev.type === 'trip-updated') {
      var actor = ev.by === Z.me ? { kind: 'self' } : { kind: 'partner', id: ev.by, name: Z.name(ev.by) };
      if (merge(snap(Z.trip(S.id)), actor)) showNotice(actor, false);
      return;
    }
    if (/^entry-|^place-scheduled$/.test(ev.type)) { S.previewMsg = null; updatePreview(); } // the count may have moved
  }
  function onConn() {
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
  // ?focus=dates|budget (and the focus-budget fixture): focus the field, unfolded, scrolled into view.
  function focusInto(id) {
    var el = $('#' + id); if (!el) return false;
    openDetails(true);
    Z.focus(el);
    later(function () { el.scrollIntoView({ block: 'center' }); }, 0); // after the shell's scrollTo(0, 0)
    return true;
  }

  // ---------- fixtures (ia.md §8). Example values, labelled by the footnote. ----------
  var EX = { title: 'Taghazout surf week', dest: 'Atlantic coast', first: '2026-12-19', last: '2026-12-26', budget: '6,500',
    notes: 'Book the surf lessons once the dates are fixed.' };
  function prefill(details) {
    S.prefilled = true;
    setVal('title', EX.title);
    if (details) { setVal('destination', EX.dest); setVal('first', EX.first); setVal('last', EX.last); setVal('budget', EX.budget); setVal('notes', EX.notes); openDetails(true); }
  }
  // Chefchaouen: Sara renames it and raises the budget; Youssef renames it too and moves the dates by a day.
  function mineEdits(t) { if (t.id === 'chefchaouen') { setVal('title', 'Chefchaouen and Akchour'); setVal('budget', '9,500'); } else setVal('title', t.title + ' trip'); }
  function theirs(t) { return t.id === 'chefchaouen' ? { title: 'Chefchaouen, Rif trip', start: '2026-11-22', end: '2026-11-26' } : { notes: 'Changed by Youssef (example).' }; }
  // Returns true when it set focus itself.
  function applyFixture(fx) {
    var create = S.mode === 'create', t = S.trip;
    switch (fx) {
      case 'invalid':
        if (create) { S.prefilled = true; openDetails(true); setVal('first', '2026-11-25'); setVal('last', '2026-11-21'); setVal('budget', '8.000,5'); }
        else setVal('title', '');
        focusField(validateAll()); return true;
      case 'one-date':
        if (create) { prefill(false); openDetails(true); setVal('first', '2026-11-21'); } else setVal('last', '');
        focusField(validateAll()); return true;
      case 'details': case 'date-preview':
        if (create) { prefill(true); return false; }
        if (fx === 'date-preview' && t.start) { setVal('first', Z.addDays(t.start, 1)); setVal('last', Z.addDays(t.end || t.start, 1)); }
        return false;
      case 'offline': case 'uploads-off':
        if (create) prefill(fx === 'uploads-off'); return false;
      case 'cover-uploading': case 'cover-failed':
        if (!Z.uploadsEnabled) return false;
        if (create) prefill(true);
        S.cover = fx === 'cover-uploading' ? { state: 'uploading', example: true, pct: 58 } : { state: 'failed', example: true };
        renderCover();
        if (fx === 'cover-uploading') { startUpload({ from: 58, step: 1, every: 220 }); return false; }
        $('#cover-retry').focus(); return true;
      case 'focus-budget':
        return create ? false : focusInto('f-budget');
      case 'partner-changed':
        if (create) return false;
        mineEdits(t);
        later(function () { Z.partner.updateTrip(t.id, theirs(t), {}); }, 300); // Youssef saves while Sara is typing
        return false;
      case 'conflict': case 'not-found':
        if (create) return false;
        mineEdits(t);
        S.socketDown = true; // the realtime notice never arrives, so Save meets a 409 / 404
        if (fx === 'conflict') Z.partner.updateTrip(t.id, theirs(t), {}); else Z.partner.deleteTrip(t.id);
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
      var t = r.mode === 'edit' ? Z.trip(r.id) : null;
      if (r.mode === 'edit' && !t) { S = null; renderGone('missing'); return; }
      S = newState(r, t);
      Z.title(r.mode === 'create' ? C.docCreate : sDocEdit(t.title));
      render();
      var fx = Z.fixture('form'), draft = fx ? null : readDraft(), focused = false;
      if (draft) restoreDraft(draft);
      if (fx) focused = applyFixture(fx);
      // Arriving from "Add dates" or "Set a budget" / "Change budget" (D12)
      if (!focused && S && !S.closed && r.mode === 'edit') {
        if (r.query.focus === 'dates') focused = focusInto('f-first');
        else if (r.query.focus === 'budget') focused = focusInto('f-budget');
      }
      // The footnote only where example values are on screen: the seeded trips, or a prefilled fixture (Goals critic F10).
      if (S && !S.closed) Z.footnote((S.mode === 'edit' && isExample(S.trip)) || S.prefilled ? C.example : '');
      // One connection announcement, in this screen's words: the shell reads these.
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
