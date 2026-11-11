/* Note composer: a modal dialog over the goal detail, backed by the URL (#/goals/:id?note=new|<noteId>).
   Direction B · Doorway. Owned by the composer builder; see build-notes/composer.md.

   Contract with the detail view:
     Z.composer.sync(route)   call with every detail route (mount and update). Opens when route.query.note is set,
                              closes when it isn't. Idempotent: the composer also listens to 'route' itself.
     Z.composer.clearDrafts() remove every note draft stored on this device (call on logout).
   Saving goes through Z.saveNote / Z.deleteNote; the detail re-renders the journal from the 'change' event.
   Fixtures (one query param, goal in the hash): ?state=composer | composer-photos | composer-uploading |
   composer-failed | composer-reorder | composer-offline | composer-conflict, plus composer-edit,
   composer-restored, composer-missing and composer-goal-deleted. */
(function () {
  'use strict';

  // ia.md D6, F5–F7; decision.md "Values marked [VERIFY]" (prototype defaults)
  var MAX_PHOTOS = 10, NOTE_CAP = 20000, BLOCK_CAP = 10000, COUNTER_FROM = 9000, ALT_MAX = 250;
  var FILE_MAX = 10 * 1024 * 1024, TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var LATENCY = 350, TICK = 140, FIXTURE_HOLD = 4000;
  var PREFIX = 'zamane.goals.noteDraft:';
  var SEEDED = ['n1', 'n2'];
  // Example note text (labelled on screen). Built from the IA's own wireframe lines (ia.md §5.4).
  var EX1 = 'We saw the riad in Fes on Saturday. The courtyard has room for everyone, and the light there in the afternoon is lovely.';
  var EX2 = 'Deposit due in March.';

  // ---------- copy.md §4, verbatim ----------
  function plural(n, one, other) { return n === 1 ? one : other; }
  var C = {
    headNew: 'New note', headEdit: 'Edit note', close: 'Close note',
    textLabel: 'Note', phFirst: 'What do you want to remember?', phNext: 'Keep writing',
    textLabelN: function (n) { return 'Note text, part ' + n; },
    counter: function (c, m) { return Z.fmt(c) + ' of ' + Z.fmt(m); },
    counterLabel: function (r) { return plural(r, '1 character left', Z.fmt(r) + ' characters left'); },
    tooLong: function (n) { return 'This note is too long. Shorten it by ' + plural(n, '1 character', Z.fmt(n) + ' characters') + '.'; },
    addPhoto: 'Add photo', addPhotoOffline: 'Photos need a connection.', addPhotoMax: 'Up to 10 photos in a note.',
    reorder: 'Reorder', reorderDone: 'Done',
    saveNew: 'Save note', saveEdit: 'Save changes', saving: 'Saving…',
    waiting: function (d, t) { return 'Saving after photos (' + d + ' of ' + t + ')'; },
    empty: 'Write something or add a photo first.', emptyNoUploads: 'Write something first.',
    blockedPhotos: function (n) { return plural(n, '1 photo didn\'t upload', n + ' photos didn\'t upload'); },
    offline: 'You\'re offline. Your note stays here. Save it when you\'re back online.',
    online: 'Back online. You can save your note now.',
    saved: 'Note saved.', saveFailed: 'Couldn\'t save the note. Try again.',
    restored: 'Draft restored.', discardDraft: 'Discard draft',
    photoLabel: function (n) { return 'Photo ' + n; },
    uploading: 'Uploading…', cancel: 'Cancel', cancelLabel: function (n) { return 'Cancel upload of photo ' + n; },
    uploadingAnn: 'Uploading photo.', uploadedAnn: 'Photo added.',
    failed: 'Didn\'t upload.', failedAnn: 'A photo didn\'t upload.', retry: 'Try again',
    remove: 'Remove', removeLabel: function (n) { return 'Remove photo ' + n; },
    describe: 'Add a description', describeLabel: 'Photo description',
    describeHelp: 'Optional. Read aloud to people who can\'t see the photo.',
    tooLarge: function (f) { return f + ' is over 10 MB. Choose a smaller photo.'; },
    unsupported: function (f) { return f + ' isn\'t a supported photo. Use a JPEG, PNG or WebP file.'; },
    unavailable: 'Photo unavailable', example: 'Example photo',
    removedPhoto: 'Removed photo', removedText: 'Removed text', undo: 'Undo',
    undoLabel: function (t) { return t === 'image' ? 'Undo: restore the removed photo' : 'Undo: restore the removed text'; },
    reorderHelp: 'Move blocks up or down to change the order.',
    reorderOn: 'Reorder mode. Use Move up and Move down.', reorderOff: 'Back to writing.',
    rowText: function (w) { return 'Text: ' + w; }, rowPhoto: 'Photo',
    upLabel: function (t, p) { return t === 'image' ? 'Move photo ' + p + ' up' : 'Move text ' + p + ' up'; },
    downLabel: function (t, p) { return t === 'image' ? 'Move photo ' + p + ' down' : 'Move text ' + p + ' down'; },
    rmLabel: function (t, p) { return t === 'image' ? 'Remove photo ' + p : 'Remove text ' + p; },
    moved: function (t, p, n) { return (t === 'image' ? 'Photo' : 'Text') + ' moved to ' + p + ' of ' + n + '.'; },
    atStart: 'First in the note', atEnd: 'Last in the note',
    discardTitle: 'Discard this note?', discardBody: 'What you wrote and any photos you added will be lost.',
    discardKeep: 'Keep writing', discardConfirm: 'Discard',
    discardEditTitle: 'Discard your changes?', discardEditBody: 'Your changes to this note won\'t be saved.', discardEditKeep: 'Keep editing',
    del: 'Delete note', delOffline: 'Deleting needs a connection.', delTitle: 'Delete this note?',
    delBody: function (n) { return n === 0 ? 'You can\'t undo this.' : plural(n, 'Its 1 photo is deleted too. You can\'t undo this.', 'Its ' + n + ' photos are deleted too. You can\'t undo this.'); },
    delKeep: 'Keep note', delFailed: 'Couldn\'t delete the note. Try again.',
    conflictTitle: 'This note changed on your other device.', conflictBody: 'Keep yours to replace it, or load the latest version.',
    keepMine: 'Keep mine', loadLatest: 'Load the latest', seeLatest: 'See the latest version',
    loadTitle: 'Replace your edits with the latest version?', loadBody: 'Your unsaved changes to this note will be lost.', loadKeep: 'Keep my edits',
    missing: 'This note was deleted on your other device.', copy: 'Copy text', closeBtn: 'Close',
    copied: 'Text copied', copyFailed: 'Couldn\'t copy. Select the text and copy it by hand.',
    goalDeletedHTML: function (name, t) { return Z.esc(name) + ' deleted <bdi>' + Z.esc(t) + '</bdi>. This note can\'t be saved.'; },
    noteDeleted: 'Note deleted',
    docNew: function (t) { return 'New note: ' + t + ' – Zamane'; }, docEdit: function (t) { return 'Edit note: ' + t + ' – Zamane'; },
    dlgNew: function (t) { return 'New note: ' + t; }, dlgEdit: function (t) { return 'Edit note: ' + t; },
    exampleData: 'Example data. The contributions, notes, photos and stats on this screen are made up.'
  };

  // ---------- state ----------
  var dlg, body, bar, liveEl, alertEl, fileInput;
  var S = null;            // the open session
  var pending = null;      // a close in progress: waits for the route to lose ?note=
  // A composer fixture applies to the first open of the session (the detail may call sync before 'route').
  var FIX = /^composer/.test(Z.state) ? Z.state : null, firstRoute = true, lastDetail = null, lastActivated = null, seq = 0, persistTimer = null;
  var FS = !!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'));
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

  // ---------- drafts (this device only; cleared on save, discard or logout) ----------
  var store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
    clearAll: function () {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k); }); } catch (e) { /* storage blocked */ }
    }
  };
  // Fixtures get their own namespace, so a fixture never "restores" another one's draft.
  function draftKey(goalId, key) { return PREFIX + (Z.state !== 'populated' ? Z.state + ':' : '') + goalId + ':' + key; }

  // ---------- block model ----------
  function txt(text) { return { k: 'b' + (++seq), type: 'text', text: text || '' }; }
  function pic(o) {
    return { k: 'b' + (++seq), type: 'image', url: o.url || null, example: !!o.example, alt: o.alt || '', status: o.status || 'done',
      progress: o.progress || 0, describe: !!o.alt, file: o.file || null, objectUrl: o.objectUrl || null };
  }
  function toModel(blocks) { return (blocks || []).map(function (b) { return b.type === 'image' ? pic(b) : txt(b.text); }); }
  function isImg(b) { return b.type === 'image'; }
  function isText(b) { return b.type === 'text'; }
  function kept() { return S.blocks.filter(function (b) { return b.type !== 'removed'; }); }
  function photos() { return kept().filter(isImg); }
  function indexOf(k) { for (var i = 0; i < S.blocks.length; i++) if (S.blocks[i].k === k) return i; return -1; }
  function find(k) { var i = indexOf(k); return i > -1 ? S.blocks[i] : null; }
  function nextKept(i) { for (var j = i + 1; j < S.blocks.length; j++) if (S.blocks[j].type !== 'removed') return S.blocks[j]; return null; }
  function prevKept(i) { for (var j = i - 1; j >= 0; j--) if (S.blocks[j].type !== 'removed') return S.blocks[j]; return null; }
  // What would be saved: empty text blocks and removed blocks are dropped (D6).
  function serial(blocks) {
    var out = [];
    blocks.forEach(function (b) {
      if (b.type === 'text') { if (b.text.trim()) out.push({ type: 'text', text: b.text.trim() }); }
      else if (b.type === 'image') out.push(b.example ? { type: 'image', example: true, alt: b.alt.trim() } : { type: 'image', url: b.url, alt: b.alt.trim() });
    });
    return out;
  }
  function isDirty() { return !!S && JSON.stringify(serial(S.blocks)) !== S.baseJSON; }
  function hasContent() { return kept().some(function (b) { return b.type === 'image' || b.text.trim(); }); }
  function textLength() { return kept().reduce(function (n, b) { return n + (b.type === 'text' ? b.text.length : 0); }, 0); }
  function stopped() { return !!(S.banner && (S.banner.type === 'goalDeleted' || S.banner.type === 'missing')); }
  function canReorder() {
    var ks = kept().filter(function (b) { return b.type === 'image' || b.text.trim(); });
    return ks.length >= 2 && ks.some(isImg);
  }
  // Every photo is followed by a text block; tidy also drops empty text blocks nothing needs.
  function normalize(tidy) {
    var out = [];
    S.blocks.forEach(function (b, i) {
      out.push(b);
      if (b.type === 'image') { var n = nextKept(i); if (!n || n.type !== 'text') out.push(txt('')); }
    });
    S.blocks = out;
    if (tidy && kept().length > 1) {
      var all = S.blocks;
      S.blocks = all.filter(function (b, i) {
        if (b.type !== 'text' || b.text.trim()) return true;
        for (var j = i - 1; j >= 0; j--) if (all[j].type !== 'removed') return all[j].type === 'image';
        return false;
      });
    }
    if (!S.blocks.some(isText)) S.blocks.push(txt(''));
  }
  function firstWords(t) { var w = t.trim().split(/\s+/); return w.length > 6 ? w.slice(0, 6).join(' ') + '…' : w.join(' '); }
  function esc(s) { return Z.esc(s); }

  // ---------- announcements (the page region is inert under a modal) ----------
  function say(msg, assertive) {
    var l = assertive ? alertEl : liveEl;
    l.textContent = '';
    setTimeout(function () { l.textContent = msg; }, 50);
  }

  // ---------- rendering ----------
  function render() {
    if (!S) return;
    var keep = focusKey();
    var h = bannerHTML();
    if (S.restored && !stopped()) h += '<div class="cmp-restored"><p>' + C.restored + '</p><button type="button" class="link-btn" data-act="discard-draft" data-f="discard-draft">' + C.discardDraft + '</button></div>';
    h += S.mode === 'reorder' ? reorderHTML() : blocksHTML();
    h += endHTML();
    body.innerHTML = h;
    body.querySelectorAll('textarea.cmp-text').forEach(function (t) { var b = find(t.dataset.k); t.value = b ? b.text : ''; autosize(t); });
    body.querySelectorAll('input[data-role="alt"]').forEach(function (i) { var b = find(i.dataset.k); i.value = b ? b.alt : ''; });
    paintHead();
    paintBar();
    if (keep) restoreFocus(keep);
  }

  function blocksHTML() {
    var h = '<div class="cmp-blocks">', tn = 0, pn = 0, total = kept().length;
    S.blocks.forEach(function (b, i) {
      if (b.type === 'removed') { h += removedHTML(b); return; }
      if (b.type === 'text') { tn++; h += textHTML(b, tn, prevKept(i), total); } else { pn++; h += photoHTML(b, pn); }
    });
    return h + '</div>';
  }

  function textHTML(b, n, prev, total) {
    var id = 'cmp-t-' + b.k, afterPhoto = prev && prev.type === 'image', count = counterHTML(b);
    return '<div class="cmp-tb' + (total === 1 ? ' is-alone' : '') + '">' +
      (n === 1 ? '<label class="vh" for="' + id + '">' + C.textLabel + '</label>' : '') +
      '<textarea id="' + id + '" class="cmp-text" data-k="' + b.k + '" data-f="t:' + b.k + '" rows="' + (total === 1 ? 8 : 2) + '" maxlength="' + BLOCK_CAP + '"' +
      ' dir="auto" autocomplete="off" enterkeyhint="enter" placeholder="' + esc(afterPhoto ? C.phNext : C.phFirst) + '"' +
      (n === 1 ? '' : ' aria-label="' + esc(C.textLabelN(n)) + '"') + (count ? ' aria-describedby="cmp-c-' + b.k + '"' : '') + '></textarea>' +
      count + '</div>';
  }
  function counterHTML(b) {
    if (b.text.length < COUNTER_FROM) return '';
    return '<p class="cmp-count" id="cmp-c-' + b.k + '"><span aria-hidden="true" class="num">' + C.counter(b.text.length, BLOCK_CAP) + '</span>' +
      '<span class="vh">' + C.counterLabel(BLOCK_CAP - b.text.length) + '</span></p>';
  }
  function counter(t, b) {
    var wrap = t.parentNode, el = wrap.querySelector('.cmp-count');
    if (b.text.length >= COUNTER_FROM) {
      if (!el) { wrap.insertAdjacentHTML('beforeend', counterHTML(b)); t.setAttribute('aria-describedby', 'cmp-c-' + b.k); }
      else { el.firstChild.textContent = C.counter(b.text.length, BLOCK_CAP); el.lastChild.textContent = C.counterLabel(BLOCK_CAP - b.text.length); }
    } else if (el) { el.remove(); t.removeAttribute('aria-describedby'); }
  }

  function photoInner(b) {
    if (!Z.uploadsEnabled) return '<span class="photo-example">' + Z.svg('image') + '<span>' + C.unavailable + '</span></span>';
    if (b.example) return '<span class="photo-example">' + Z.svg('image') + '<span>' + C.example + '</span></span>';
    return '<img src="' + esc(b.url) + '" alt="" decoding="async">';
  }
  function photoHTML(b, n) {
    var pill = '';
    if (b.status === 'uploading') {
      pill = '<div class="cmp-pill"><span class="cmp-pill-text">' + C.uploading + ' <span class="num" data-pct="' + b.k + '">' + b.progress + '%</span></span>' +
        '<button type="button" class="cmp-pill-btn" data-act="cancel" data-k="' + b.k + '" data-f="c:' + b.k + '" aria-label="' + esc(C.cancelLabel(n)) + '">' + C.cancel + '</button>' +
        '<span class="cmp-pill-bar" aria-hidden="true"><span data-bar="' + b.k + '" style="width:' + b.progress + '%"></span></span></div>';
    } else if (b.status === 'failed') {
      // The button's name is its visible label (WCAG 2.5.3); the photo's group name and the status give the context.
      pill = '<div class="cmp-pill is-failed">' + Z.svg('alert') + '<span id="cmp-fail-' + b.k + '">' + C.failed + '</span>' +
        '<button type="button" class="cmp-pill-btn" data-act="retry" data-k="' + b.k + '" data-f="r:' + b.k + '" aria-describedby="cmp-fail-' + b.k + '">' + C.retry + '</button></div>';
    }
    var desc = '';
    if (Z.uploadsEnabled) {
      desc = '<button type="button" class="link-btn cmp-describe" data-act="describe" data-k="' + b.k + '" data-f="d:' + b.k + '" aria-expanded="' + b.describe + '" aria-controls="cmp-d-' + b.k + '">' + C.describe + '</button>' +
        '<div class="cmp-desc" id="cmp-d-' + b.k + '"' + (b.describe ? '' : ' hidden') + '>' +
        '<label class="field-label" for="cmp-di-' + b.k + '">' + C.describeLabel + '</label>' +
        '<div class="field field-text"><input id="cmp-di-' + b.k + '" type="text" data-k="' + b.k + '" data-f="di:' + b.k + '" data-role="alt" maxlength="' + ALT_MAX + '"' +
        ' autocomplete="off" enterkeyhint="done" dir="auto" aria-describedby="cmp-dh-' + b.k + '"></div>' +
        '<p class="help" id="cmp-dh-' + b.k + '">' + C.describeHelp + '</p></div>';
    }
    return '<div class="cmp-photo' + (Z.uploadsEnabled ? '' : ' is-off') + '" role="group" aria-label="' + esc(C.photoLabel(n)) + '" data-k="' + b.k + '">' +
      '<button type="button" class="btn-sec cmp-remove" data-act="remove" data-k="' + b.k + '" data-f="rm:' + b.k + '" aria-label="' + esc(C.removeLabel(n)) + '">' + Z.svg('x') + '<span>' + C.remove + '</span></button>' +
      '<div class="cmp-arch">' + photoInner(b) + pill + '</div>' + desc + '</div>';
  }
  function removedHTML(b) {
    var t = b.was.type;
    return '<div class="cmp-removed" data-k="' + b.k + '"><span>' + (t === 'image' ? C.removedPhoto : C.removedText) + '</span>' +
      '<button type="button" class="link-btn" data-act="undo" data-k="' + b.k + '" data-f="u:' + b.k + '" aria-label="' + esc(C.undoLabel(t)) + '">' + C.undo + '</button></div>';
  }

  function reorderHTML() {
    var total = kept().length, pos = 0;
    var h = '<p class="help cmp-help">' + C.reorderHelp + '</p><ol class="cmp-rows" role="list">';
    S.blocks.forEach(function (b) {
      if (b.type === 'removed') { h += '<li class="cmp-row is-removed" data-k="' + b.k + '">' + removedHTML(b) + '</li>'; return; }
      pos++;
      var what = b.type === 'image'
        ? '<span class="cmp-thumb">' + (b.example || !Z.uploadsEnabled || !b.url ? Z.svg('image') : '<img src="' + esc(b.url) + '" alt="">') + '</span><span>' + C.rowPhoto + '</span>'
        : '<span class="cmp-snip" dir="auto">' + esc(C.rowText(firstWords(b.text))) + '</span>';
      h += '<li class="cmp-row" data-k="' + b.k + '"><span class="cmp-pos num" aria-hidden="true">' + pos + '</span><span class="cmp-what">' + what + '</span>' +
        '<span class="cmp-row-btns">' + sq('up', b, pos, pos === 1) + sq('down', b, pos, pos === total) + sq('rm', b, pos, false) + '</span>' +
        '<p class="caption cmp-row-why" id="cmp-wu-' + b.k + '" hidden>' + C.atStart + '</p>' +
        '<p class="caption cmp-row-why" id="cmp-wd-' + b.k + '" hidden>' + C.atEnd + '</p></li>';
    });
    return h + '</ol>';
  }
  function sq(act, b, pos, off) {
    var label = act === 'up' ? C.upLabel(b.type, pos) : act === 'down' ? C.downLabel(b.type, pos) : C.rmLabel(b.type, pos);
    var icon = act === 'up' ? 'arrowUp' : act === 'down' ? 'arrowDown' : 'x';
    return '<button type="button" class="btn-sec cmp-sq" data-act="' + act + '" data-k="' + b.k + '" data-f="' + act + ':' + b.k + '" aria-label="' + esc(label) + '"' +
      (off ? ' aria-disabled="true" aria-describedby="' + (act === 'up' ? 'cmp-wu-' : 'cmp-wd-') + b.k + '"' : '') + '>' + Z.svg(icon) + '</button>';
  }

  function bannerHTML() {
    var bn = S.banner;
    if (stopped()) {
      var title = bn.type === 'missing' ? esc(C.missing) : C.goalDeletedHTML(Z.name(bn.by), bn.title);
      return '<section class="cmp-banner" aria-labelledby="cmp-stop-h"><h3 id="cmp-stop-h" class="cmp-banner-h" tabindex="-1">' + title + '</h3>' +
        '<div class="cmp-banner-actions"><button type="button" class="btn-sec" data-act="copy" data-f="copy">' + C.copy + '</button>' +
        '<button type="button" class="btn-sec" data-act="close-now" data-f="close-now">' + C.closeBtn + '</button></div>' +
        '<p class="help cmp-copied" id="cmp-copy-status">' + esc(S.copyStatus || '') + '</p></section>';
    }
    if (S.conflict) {
      var open = S.conflict.open;
      return '<section class="cmp-banner" aria-labelledby="cmp-cf-h"><h3 id="cmp-cf-h" class="cmp-banner-h" tabindex="-1">' + C.conflictTitle + '</h3><p>' + C.conflictBody + '</p>' +
        '<div class="cmp-banner-actions"><button type="button" class="btn-sec" data-act="keep-mine" data-f="keep-mine">' + C.keepMine + '</button>' +
        '<button type="button" class="btn-sec" data-act="load-latest" data-f="load-latest">' + C.loadLatest + '</button></div>' +
        '<button type="button" class="link-btn cmp-see" data-act="see-latest" data-f="see-latest" aria-expanded="' + open + '" aria-controls="cmp-latest">' + Z.svg('chevronDown', 'cmp-chev') + C.seeLatest + '</button>' +
        '<div class="cmp-latest" id="cmp-latest"' + (open ? '' : ' hidden') + '>' + latestHTML(S.conflict.current) + '</div></section>';
    }
    return '';
  }
  function latestHTML(note) {
    return (note.blocks || []).map(function (b) {
      if (b.type === 'text') return '<p dir="auto">' + esc(b.text) + '</p>';
      var inner = b.example || !Z.uploadsEnabled || !b.url ? Z.svg('image') : '<img src="' + esc(b.url) + '" alt="' + esc(b.alt || '') + '">';
      return '<div class="cmp-latest-photo"><span class="cmp-thumb">' + inner + '</span><span class="caption">' + (b.example ? C.example : !Z.uploadsEnabled ? C.unavailable : C.rowPhoto) + '</span></div>';
    }).join('');
  }

  function endHTML() {
    var h = '';
    if (S.editing && !stopped()) {
      var off = Z.offline;
      h += '<div class="cmp-end"><button type="button" class="btn-danger" data-act="delete" data-f="delete"' + (off ? ' aria-disabled="true" aria-describedby="cmp-del-why"' : '') + '>' +
        Z.svg('trash') + C.del + '</button><p class="help" id="cmp-del-why"' + (off ? '' : ' hidden') + '>' + C.delOffline + '</p></div>';
    }
    if (S.example || photos().some(function (b) { return b.example; })) h += '<p class="caption cmp-example">' + C.exampleData + '</p>';
    return h;
  }

  function paintHead() {
    var t = S.title;
    dlg.querySelector('#cmp-h').textContent = S.editing ? C.headEdit : C.headNew;
    dlg.querySelector('#cmp-sub').textContent = t;
    dlg.setAttribute('aria-label', S.editing ? C.dlgEdit(t) : C.dlgNew(t));
    var dt = S.editing ? C.docEdit(t) : C.docNew(t);
    if (document.title !== dt) { S.ownTitle = dt; Z.title(dt); }
  }

  function line(id, text, icon) {
    var el = bar.querySelector('#' + id);
    el.hidden = !text;
    el.innerHTML = text ? (icon ? Z.svg(icon) : '') + '<span>' + esc(text) + '</span>' : '';
  }
  function setOff(btn, off, whyId) {
    if (off) { btn.setAttribute('aria-disabled', 'true'); if (whyId) btn.setAttribute('aria-describedby', whyId); else btn.removeAttribute('aria-describedby'); }
    else { btn.removeAttribute('aria-disabled'); btn.removeAttribute('aria-describedby'); }
  }
  function saveWhy() {
    if (Z.offline) return { text: C.offline, persist: true, icon: 'cloudOff' };
    var failed = photos().filter(function (b) { return b.status === 'failed'; }).length;
    if (failed) return { text: C.blockedPhotos(failed), persist: true, icon: 'alert' };
    var over = textLength() - NOTE_CAP;
    if (over > 0) return { text: C.tooLong(over), persist: true, icon: 'alert' };
    if (!hasContent()) return { text: Z.uploadsEnabled ? C.empty : C.emptyNoUploads, persist: false };
    return null;
  }
  function paintBar() {
    if (!S) return;
    bar.hidden = stopped();
    if (bar.hidden) return;
    var add = bar.querySelector('[data-act="add"]'), ro = bar.querySelector('[data-act="reorder"]'), sv = bar.querySelector('[data-act="save"]');
    var reorder = S.mode === 'reorder';
    // Add photo
    add.hidden = !Z.uploadsEnabled || reorder;
    var addWhy = Z.offline ? C.addPhotoOffline : photos().length >= MAX_PHOTOS ? C.addPhotoMax : '';
    // A standing condition (offline, 10 photos) shows its reason; aria-describedby always points at text (a11y M2).
    setOff(add, !!addWhy, 'cmp-add-desc');
    bar.querySelector('#cmp-add-desc').textContent = addWhy;
    line('cmp-add-why', addWhy && !add.hidden ? addWhy : '', Z.offline ? 'cloudOff' : null);
    line('cmp-msg', S.msg, 'alert');
    // Reorder is a mode switch: "Reorder" / "Done", no aria-pressed (a11y M3); the mode change is announced.
    ro.hidden = !Z.uploadsEnabled || !(reorder || canReorder());
    ro.classList.toggle('is-on', reorder);
    ro.querySelector('.cmp-lbl').textContent = reorder ? C.reorderDone : C.reorder;
    // Save
    var ps = photos(), done = ps.filter(function (b) { return b.status === 'done'; }).length;
    sv.textContent = S.saving ? C.saving : S.waiting ? C.waiting(done, ps.length) : (S.editing ? C.saveEdit : C.saveNew);
    var why = saveWhy(), busy = S.saving || S.waiting;
    setOff(sv, busy || !!why, !busy && why ? 'cmp-save-desc' : null);
    bar.querySelector('#cmp-save-desc').textContent = !busy && why ? why.text : '';
    line('cmp-save-why', why && (why.persist || S.show.save) ? why.text : '', why && why.icon);
    line('cmp-err', S.saveError ? C.saveFailed : '', 'alert');
  }

  // ---------- focus ----------
  function focusKey() {
    var a = document.activeElement;
    if (!a || !dlg.contains(a) || !a.dataset || !a.dataset.f) return null;
    return { f: a.dataset.f, s: a.selectionStart, e: a.selectionEnd };
  }
  function restoreFocus(keep) {
    var el = dlg.querySelector('[data-f="' + keep.f + '"]');
    if (!el) return;
    el.focus({ preventScroll: true });
    if (keep.s != null && el.setSelectionRange) try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text field */ }
  }
  function focusF(f, caret) {
    var el = dlg.querySelector('[data-f="' + f + '"]');
    if (!el || el.closest('[hidden]')) return false;
    el.focus({ focusVisible: !Z.usedPointer() });
    if (caret != null && el.setSelectionRange) { el.setSelectionRange(caret, caret); trackCaret(el); }
    return true;
  }
  function focusHead() { dlg.querySelector('#cmp-h').focus({ preventScroll: true }); }
  function focusBanner() { var h = dlg.querySelector('.cmp-banner-h'); if (h) { h.focus(); return true; } return false; }
  function focusDefault() {
    if (stopped() && focusBanner()) return;
    if (S.editing) { focusHead(); return; }
    var t = kept().filter(isText)[0];
    if (t) focusF('t:' + t.k, t.text.length); else focusHead();
  }
  function restoreLast() { if (!(S.lastF && focusF(S.lastF))) focusDefault(); }
  function focusLostTo() {
    var a = document.activeElement;
    if (!a || a === document.body || !dlg.contains(a) || a.closest('[hidden]')) focusBanner() || focusDefault();
  }
  function trackCaret(t) { if (S && t && t.classList && t.classList.contains('cmp-text')) S.caret = { k: t.dataset.k, pos: t.selectionStart || 0 }; }

  // ---------- autosize fallback (field-sizing: content is Baseline only since 2026) ----------
  function autosize(t) {
    if (FS) return;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }

  // ---------- persistence ----------
  function schedulePersist() { clearTimeout(persistTimer); persistTimer = setTimeout(persistNow, 250); }
  function persistNow() {
    clearTimeout(persistTimer);
    if (!S || S.closing) return;
    if (!isDirty()) { store.del(S.storeKey); return; }
    var blocks = [];
    S.blocks.forEach(function (b) {
      if (b.type === 'text') blocks.push({ type: 'text', text: b.text });
      // Only uploaded photos survive a reload; an upload in flight is lost with the page, as in the real app.
      else if (b.type === 'image' && b.status === 'done') {
        if (b.example) blocks.push({ type: 'image', example: true, alt: b.alt });
        else if (b.url && b.url.indexOf('blob:') !== 0) blocks.push({ type: 'image', url: b.url, alt: b.alt });
      }
    });
    var rec = { v: 1, base: S.base ? +new Date(S.base) : null, blocks: blocks, at: Date.now() };
    if (!store.set(S.storeKey, rec)) { // quota: keep the words at least
      rec.blocks = blocks.filter(function (b) { return b.type !== 'image' || b.example; });
      store.set(S.storeKey, rec);
    }
  }
  function clearDraft() { clearTimeout(persistTimer); if (S) store.del(S.storeKey); }
  function onChange() { if (!S) return; S.show.save = false; paintBar(); schedulePersist(); }

  // ---------- uploads (simulated Cloudinary signed upload) ----------
  function inSession(b) { return !!S && S.blocks.indexOf(b) > -1; }
  function stopUpload(b) { clearInterval(b.timer); clearTimeout(b.delay); b.timer = b.delay = null; }
  function stopAll() { if (!S) return; S.blocks.forEach(function (b) { if (b.type === 'image') stopUpload(b); if (b.type === 'removed' && b.was.type === 'image') stopUpload(b.was); }); }
  function revoke(b) { if (b.objectUrl && b.url !== b.objectUrl) { URL.revokeObjectURL(b.objectUrl); b.objectUrl = null; } }
  function startUpload(b, delay) {
    stopUpload(b);
    b.status = 'uploading';
    var run = function () { b.timer = setInterval(function () { tick(b); }, TICK); };
    if (delay) b.delay = setTimeout(run, delay); else run();
  }
  function tick(b) {
    if (!inSession(b)) { stopUpload(b); return; }
    if (Z.offline) { failUpload(b); return; }
    b.progress = Math.min(100, b.progress + 3 + Math.floor(Math.random() * 6));
    var p = dlg.querySelector('[data-pct="' + b.k + '"]'), fill = dlg.querySelector('[data-bar="' + b.k + '"]');
    if (p) p.textContent = b.progress + '%'; // shown, not announced (copy.md)
    if (fill) fill.style.width = b.progress + '%';
    if (b.progress >= 100) { stopUpload(b); completeUpload(b); }
  }
  // Downscaled on the device; drawing to a canvas also drops EXIF and GPS (ia.md 6.10).
  function downscale(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        try {
          var s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
          c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        } catch (e) { resolve(null); }
      };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }
  function completeUpload(b) {
    (b.objectUrl ? downscale(b.objectUrl) : Promise.resolve(null)).then(function (data) {
      if (!inSession(b)) return;
      if (data) b.url = data;
      b.status = 'done'; b.file = null;
      render();
      revoke(b);
      say(C.uploadedAnn);
      schedulePersist();
      if (S.waiting && !photos().some(function (x) { return x.status === 'uploading'; })) {
        S.waiting = false;
        if (photos().some(function (x) { return x.status === 'failed'; })) paintBar(); else doSave();
      }
    });
  }
  function failUpload(b) {
    stopUpload(b);
    b.status = 'failed';
    S.waiting = false;
    var a = document.activeElement, typing = a && dlg.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName);
    render();
    if (!typing) focusF('r:' + b.k); // never pull focus out of a field someone is typing in
    say(C.failedAnn, true);
  }
  function pickFiles(files) {
    var room = MAX_PHOTOS - photos().length, msgs = [], ok = [];
    files.forEach(function (f) {
      if (TYPES.indexOf(f.type) < 0) msgs.push(C.unsupported(f.name));
      else if (f.size > FILE_MAX) msgs.push(C.tooLarge(f.name));
      else if (ok.length >= room) { if (msgs.indexOf(C.addPhotoMax) < 0) msgs.push(C.addPhotoMax); }
      else ok.push(f);
    });
    S.msg = msgs.join(' ');
    if (ok.length) insertPhotos(ok.map(function (f) { var u = URL.createObjectURL(f); return pic({ url: u, objectUrl: u, file: f, status: 'uploading' }); }));
    else paintBar();
    if (msgs.length) say(S.msg, true);
  }
  // Insert at the caret: the text block is split there, and a text block follows every photo (D6).
  function insertPhotos(ps) {
    var c = S.caret && find(S.caret.k);
    if (!c || c.type !== 'text') { var ts = kept().filter(isText); c = ts[ts.length - 1]; S.caret = { k: c.k, pos: c.text.length }; }
    var i = indexOf(c.k), pos = Math.min(S.caret.pos, c.text.length);
    var after = c.text.slice(pos).replace(/^\s+/, '');
    c.text = c.text.slice(0, pos).replace(/\s+$/, '');
    var add = [], tail = null;
    ps.forEach(function (p, n) { tail = txt(n === ps.length - 1 ? after : ''); add.push(p, tail); });
    S.blocks.splice.apply(S.blocks, [i + 1, 0].concat(add));
    normalize(true);
    render();
    focusF('t:' + tail.k, 0);
    ps.forEach(function (p) { startUpload(p, 0); });
    say(C.uploadingAnn);
    schedulePersist();
  }
  function cancelUpload(k) {
    var i = indexOf(k), b = S.blocks[i];
    stopUpload(b);
    if (b.objectUrl) URL.revokeObjectURL(b.objectUrl);
    var prev = S.blocks[i - 1], next = S.blocks[i + 1], fk = null, pos = 0;
    S.blocks.splice(i, 1);
    if (prev && next && prev.type === 'text' && next.type === 'text') { // re-join the text the photo had split
      pos = prev.text.length;
      if (next.text) prev.text = prev.text ? prev.text + '\n' + next.text : next.text;
      S.blocks.splice(i, 1);
      fk = prev.k;
    } else if (next && next.type === 'text') fk = next.k;
    else if (prev && prev.type === 'text') { fk = prev.k; pos = prev.text.length; }
    normalize(false);
    render();
    if (!(fk && focusF('t:' + fk, pos))) focusDefault();
    onChange();
  }
  function retryUpload(k) {
    var b = find(k);
    if (Z.offline) { S.msg = C.addPhotoOffline; paintBar(); say(C.addPhotoOffline); return; }
    b.progress = 0;
    startUpload(b, 0);
    render();
    focusF('c:' + k);
    say(C.uploadingAnn);
    paintBar();
  }

  // ---------- block actions ----------
  function removeBlock(k) {
    var i = indexOf(k), b = S.blocks[i];
    if (!b || b.type === 'removed') return;
    if (b.type === 'image') stopUpload(b);
    S.blocks[i] = { k: b.k, type: 'removed', was: b }; // inline Undo, no timer, until saved (6.9)
    render();
    focusF('u:' + k);
    onChange();
  }
  function undo(k) {
    var i = indexOf(k), r = S.blocks[i];
    if (!r || r.type !== 'removed') return;
    var b = r.was;
    if (b.type === 'image' && photos().length >= MAX_PHOTOS) { S.msg = C.addPhotoMax; paintBar(); say(C.addPhotoMax); return; }
    S.blocks[i] = b;
    if (b.type === 'image' && b.status === 'uploading') startUpload(b, 0);
    if (S.mode === 'write') normalize(false);
    render();
    focusF(S.mode === 'reorder' || b.type === 'image' ? 'rm:' + k : 't:' + k);
    onChange();
  }
  function toggleDescribe(k) {
    var b = find(k);
    b.describe = !b.describe;
    render();
    if (b.describe) focusF('di:' + k); else focusF('d:' + k);
  }
  function rowTops() {
    var m = {};
    body.querySelectorAll('.cmp-row[data-k]').forEach(function (r) { m[r.dataset.k] = r.getBoundingClientRect().top; });
    return m;
  }
  function flip(before) {
    if (!motionOK.matches || !Element.prototype.animate) return; // reduced motion: moves are instant (6.12)
    var dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-move')) || 160;
    body.querySelectorAll('.cmp-row[data-k]').forEach(function (r) {
      var dy = (before[r.dataset.k] || 0) - r.getBoundingClientRect().top;
      if (before[r.dataset.k] != null && Math.abs(dy) > 1) r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  function move(k, dir) {
    var i = indexOf(k), j = i, step = dir === 'up' ? -1 : 1;
    do { j += step; } while (j >= 0 && j < S.blocks.length && S.blocks[j].type === 'removed');
    if (j < 0 || j >= S.blocks.length) return;
    var before = rowTops(), b = S.blocks[i];
    S.blocks[i] = S.blocks[j]; S.blocks[j] = b;
    S.moved = k;
    render();
    var ks = kept(), pos = ks.indexOf(b) + 1, atEnd = dir === 'up' ? pos === 1 : pos === ks.length;
    focusF((atEnd ? (dir === 'up' ? 'down' : 'up') : dir) + ':' + k); // F6: the other move button at an end
    flip(before);
    say(C.moved(b.type, pos, ks.length));
    schedulePersist();
  }
  function toggleReorder() {
    if (S.mode === 'write') {
      if (kept().length > 1) S.blocks = S.blocks.filter(function (b) { return b.type !== 'text' || b.text.trim(); });
      S.mode = 'reorder'; S.moved = null;
      render();
      say(C.reorderOn);
    } else {
      S.mode = 'write';
      normalize(true);
      render();
      var m = S.moved && find(S.moved);
      if (!(m && focusF((m.type === 'image' ? 'rm:' : 't:') + m.k))) focusF('reorder');
      say(C.reorderOff);
    }
    schedulePersist();
  }

  // ---------- save, discard, delete ----------
  function pressSave() {
    if (!S || S.saving || S.waiting) return;
    S.saveError = false;
    if (photos().some(function (b) { return b.status === 'uploading'; })) { S.waiting = true; paintBar(); return; } // Save waits instead of refusing
    doSave();
  }
  function doSave(immediate) {
    var s = S;
    s.saving = true; s.saveError = false;
    paintBar();
    var go = function () {
      if (S !== s || s.closing) return;
      if (Z.offline) { s.saving = false; s.saveError = true; paintBar(); say(C.saveFailed, true); return; }
      var data = { blocks: serial(s.blocks) };
      if (s.noteId) { data.id = s.noteId; data.updatedAt = s.base; }
      var r = Z.saveNote(s.goalId, data, {});
      s.saving = false;
      if (r && r.note) { clearDraft(); finish({ focus: s.noteId ? 'opener' : 'note', noteId: r.note.id, announce: C.saved }); return; }
      if (r && r.conflict) { s.conflict = { current: r.current, open: false }; s.mode = 'write'; normalize(false); render(); focusBanner(); return; }
      s.banner = Z.goal(s.goalId) ? { type: 'missing' } : { type: 'goalDeleted', by: s.deletedBy || 'b', title: s.title };
      stopAll(); render(); focusBanner();
    };
    if (immediate) go(); else setTimeout(go, LATENCY);
  }
  function confirmDiscard() {
    var ed = S.editing;
    return Z.confirm({ title: ed ? C.discardEditTitle : C.discardTitle, body: '<p>' + esc(ed ? C.discardEditBody : C.discardBody) + '</p>',
      confirm: C.discardConfirm, cancel: ed ? C.discardEditKeep : C.discardKeep });
  }
  function askDiscard() {
    S.asking = true;
    confirmDiscard().then(function (yes) {
      if (!S) return;
      S.asking = false;
      if (yes) { clearDraft(); finish({ focus: 'opener' }); } else restoreLast();
    });
  }
  function requestClose() {
    if (!S || S.asking || S.closing || S.saving) return;
    if (isDirty()) askDiscard(); else { clearDraft(); finish({ focus: 'opener' }); }
  }
  function discardDraft() {
    S.asking = true;
    confirmDiscard().then(function (yes) {
      if (!S) return;
      S.asking = false;
      if (!yes) { restoreLast(); return; }
      clearDraft();
      var note = S.noteId && Z.notes(S.goalId).filter(function (n) { return n.id === S.noteId; })[0];
      if (S.editing && !note) { finish({ focus: 'opener' }); return; }
      stopAll();
      S.base = note ? note.updatedAt : null;
      S.baseJSON = JSON.stringify(serial(toModel(note ? note.blocks : [])));
      S.blocks = toModel(note ? note.blocks : []);
      S.restored = false; S.mode = 'write'; S.lastF = null;
      normalize(false);
      render();
      focusDefault();
    });
  }
  function keepMine() {
    S.base = new Date(S.conflict.current.updatedAt);
    S.conflict = null;
    render();
    focusF('save');
    doSave();
  }
  function loadLatest() {
    var cur = S.conflict.current;
    S.asking = true;
    Z.confirm({ title: C.loadTitle, body: '<p>' + esc(C.loadBody) + '</p>', confirm: C.loadLatest, cancel: C.loadKeep }).then(function (yes) {
      if (!S) return;
      S.asking = false;
      if (!yes) { focusF('load-latest'); return; }
      stopAll();
      S.blocks = toModel(cur.blocks);
      S.base = new Date(cur.updatedAt);
      S.baseJSON = JSON.stringify(serial(toModel(cur.blocks)));
      S.conflict = null; S.restored = false; S.mode = 'write'; S.lastF = null;
      normalize(false);
      clearDraft();
      render();
      var t = kept().filter(isText)[0];
      if (!(t && focusF('t:' + t.k, t.text.length))) focusHead();
    });
  }
  function pressDelete() {
    var note = Z.notes(S.goalId).filter(function (n) { return n.id === S.noteId; })[0];
    var n = note ? note.blocks.filter(isImg).length : 0;
    S.asking = true;
    Z.confirm({ title: C.delTitle, body: '<p>' + esc(C.delBody(n)) + '</p>', confirm: C.del, cancel: C.delKeep }).then(function (yes) {
      if (!S) return;
      S.asking = false;
      if (!yes) return;
      if (Z.offline) { say(C.delFailed, true); return; }
      var list = Z.notes(S.goalId), at = -1;
      list.forEach(function (x, i) { if (x.id === S.noteId) at = i; });
      var next = at > -1 ? list[at + 1] : null;
      var r = Z.deleteNote(S.noteId, {});
      if (!r || r.notFound) { S.banner = { type: 'missing' }; render(); focusBanner(); return; }
      clearDraft();
      finish({ focus: 'next', next: next ? next.id : null, toast: { msg: C.noteDeleted } });
    });
  }
  function copyText() {
    var text = kept().filter(isText).map(function (b) { return b.text.trim(); }).filter(Boolean).join('\n\n');
    var done = function (ok) {
      if (!S) return;
      S.copyStatus = ok ? C.copied : C.copyFailed;
      var st = dlg.querySelector('#cmp-copy-status'); if (st) st.textContent = S.copyStatus;
      say(S.copyStatus, !ok);
    };
    var fallback = function () {
      var back = document.activeElement, ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'vh';
      dlg.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (back) back.focus();
      done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }

  // ---------- opening and closing ----------
  function describeEl(el) {
    var k = el.closest('[data-key]');
    return { el: el, id: el.id, act: el.getAttribute('data-act'), did: el.getAttribute('data-id'), text: (el.textContent || '').trim(), key: k ? k.getAttribute('data-key') : null, at: Date.now() };
  }
  function opener() {
    if (lastActivated && Date.now() - lastActivated.at < 4000) return lastActivated;
    var a = document.activeElement, v = document.getElementById('view');
    return a && v && v.contains(a) && a !== v && a.tagName !== 'H1' ? describeEl(a) : null;
  }
  function visible(el) { return !!el && el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden],[inert]'); }
  // The detail may have re-rendered: find the same control again by id, or by its text inside the same note.
  function refind(op) {
    if (!op) return null;
    if (visible(op.el)) return op.el;
    var q = op.id && document.getElementById(op.id);
    if (visible(q)) return q;
    if (op.act) { // the detail's hooks: [data-act="edit-note"][data-id], [data-act="write"]
      var hooks = document.querySelectorAll('#view [data-act="' + CSS.escape(op.act) + '"]' + (op.did ? '[data-id="' + CSS.escape(op.did) + '"]' : ''));
      for (var h = 0; h < hooks.length; h++) if (visible(hooks[h])) return hooks[h];
    }
    var list = document.querySelectorAll('#view a[href], #view button');
    for (var i = 0; i < list.length; i++) {
      var c = list[i], ck = c.closest('[data-key]');
      if ((c.textContent || '').trim() === op.text && (ck ? ck.getAttribute('data-key') : null) === op.key && visible(c)) return c;
    }
    return null;
  }
  function noteHeading(id) {
    if (!id) return null;
    var a = document.querySelector('#view [data-key="' + CSS.escape(id) + '"]');
    var h = document.getElementById('note-' + id + '-h') || (a && (a.querySelector('h3, h2') || a));
    if (!visible(h)) return null;
    if (!h.matches('a[href], button, input, textarea, select, [tabindex]')) h.setAttribute('tabindex', '-1');
    return h;
  }
  function writeButton() {
    var list = document.querySelectorAll('#view [data-act="write"], #view a[href], #view button');
    for (var i = 0; i < list.length; i++) if ((list[i].getAttribute('data-act') === 'write' || (list[i].textContent || '').trim() === 'Write a note') && visible(list[i])) return list[i];
    return null;
  }
  function wasPushed(goalId) {
    var idx = history.state && history.state.zIdx;
    if (lastDetail && lastDetail.id === goalId && lastDetail.idx != null) return idx > lastDetail.idx;
    return !!Z.canGoBack();
  }
  function place() {
    if (!dlg.open) return;
    var vv = window.visualViewport;
    // Phones: the composer is the visual viewport, so the tool bar and Save ride on the on-screen keyboard
    // (iOS ignores interactive-widget). Z.placeSheet skips .composer, so this is the only placement.
    if (!vv || !Z.isPhone() || vv.scale > 1.01) { dlg.style.top = dlg.style.height = dlg.style.bottom = dlg.style.maxHeight = ''; return; }
    dlg.style.top = vv.offsetTop + 'px'; dlg.style.bottom = 'auto'; dlg.style.height = vv.height + 'px'; dlg.style.maxHeight = 'none';
  }
  function show() {
    render();
    if (!dlg.open) dlg.showModal();
    place();
  }
  function hide() {
    if (dlg.open) dlg.close();
    dlg.style.top = dlg.style.height = dlg.style.bottom = dlg.style.maxHeight = '';
  }

  function open(goalId, key) {
    var g = Z.goal(goalId), fix = FIX;
    FIX = null;
    if (!g) return; // the detail shows its own not-found state
    var editing = key !== 'new', note = null;
    if (editing) note = Z.notes(goalId).filter(function (n) { return n.id === key; })[0] || null;
    if (note && note.by !== Z.me) { leaveUrl(goalId); return; } // author only (D6)
    var sk = draftKey(goalId, key);
    if (fix) {
      store.del(sk);
      if (fix === 'composer-restored') store.set(sk, { v: 1, base: null, blocks: [{ type: 'text', text: EX1 }, { type: 'image', example: true, alt: '' }, { type: 'text', text: EX2 }], at: Date.now() });
    }
    var stored = store.get(sk);
    if (editing && !note && !(stored && stored.blocks && stored.blocks.length)) { leaveUrl(goalId); return; }
    S = { goalId: goalId, key: key, title: g.title, noteId: editing ? key : null, editing: editing, mode: 'write',
      base: note ? note.updatedAt : null, storeKey: sk, opener: opener(), pushed: wasPushed(goalId), prevTitle: document.title,
      show: {}, msg: '', caret: null, example: (!!fix && fix !== 'composer') || (editing && SEEDED.indexOf(key) > -1) };
    S.baseJSON = JSON.stringify(serial(toModel(note ? note.blocks : [])));
    S.blocks = toModel(note ? note.blocks : []);
    if (stored && Array.isArray(stored.blocks)) {
      var back = toModel(stored.blocks);
      if (JSON.stringify(serial(back)) !== S.baseJSON) { S.blocks = back; S.restored = true; if (stored.base) S.base = new Date(stored.base); }
    }
    if (editing && !note) S.banner = { type: 'missing' };
    normalize(false);
    var fx = fixture(fix);
    var t0 = kept().filter(isText)[0];
    if (!S.caret && t0) S.caret = { k: t0.k, pos: t0.text.length };
    ownConnectionMessages();
    show();
    if (!(fx && fx.focus && focusF(fx.focus, fx.caret))) focusDefault();
    if (fx && fx.after) setTimeout(fx.after, 0);
  }

  // While open, Z.setOffline announces the composer's own sentence, once (a11y M1); the detail's come back on close.
  var savedMsgs = null;
  function ownConnectionMessages() {
    if (!savedMsgs) savedMsgs = { off: Z.offlineMessage, on: Z.onlineMessage };
    Z.offlineMessage = C.offline;
    Z.onlineMessage = C.online;
  }
  function restoreConnectionMessages() {
    if (!savedMsgs) return;
    Z.offlineMessage = savedMsgs.off; Z.onlineMessage = savedMsgs.on;
    savedMsgs = null;
  }

  // The detail keeps its tab in ?view=; every URL the composer writes keeps the other params.
  function hashFor(goalId, note) {
    var q = new URLSearchParams(), cur = (Z.route && Z.route.id === goalId && Z.route.query) || {};
    Object.keys(cur).forEach(function (k) { if (k !== 'note') q.set(k, cur[k]); });
    if (note) q.set('note', note);
    var s = q.toString();
    return '#/goals/' + goalId + (s ? '?' + s : '');
  }
  // Not openable: drop ?note= from the URL (outside the router's current pass).
  function leaveUrl(goalId) { setTimeout(function () { Z.go(hashFor(goalId), { replace: true }); }, 0); }

  // Close and leave the ?note= entry: back if it was pushed, else replace (the brief's contract).
  function finish(o) {
    if (!S || S.closing) return;
    var s = S;
    s.closing = true;
    clearTimeout(persistTimer);
    stopAll();
    pending = { focus: o.focus, opener: s.opener, toast: o.toast, announce: o.announce, prevTitle: s.prevTitle, ownTitle: s.ownTitle, noteId: o.noteId, next: o.next };
    hide();
    var r = Z.route;
    if (r && r.view === 'detail' && r.id === s.goalId && r.query && r.query.note) {
      pending.timer = setTimeout(settle, 1000);
      if (s.pushed) Z.back(); else Z.go(hashFor(s.goalId), { replace: true });
    } else settle();
  }
  function settle() {
    var p = pending;
    if (!p) return;
    pending = null;
    clearTimeout(p.timer);
    S = null;
    restoreConnectionMessages();
    body.innerHTML = '';
    if (document.title === p.ownTitle) Z.title(p.prevTitle);
    setTimeout(function () { // after the detail has re-rendered and placed its own focus
      var el = null;
      if (p.focus === 'note') el = noteHeading(p.noteId);
      else if (p.focus === 'next') el = noteHeading(p.next) || writeButton();
      el = el || refind(p.opener);
      if (el) el.focus({ focusVisible: !Z.usedPointer() }); else Z.focusHeading();
      if (p.toast) Z.toast(p.toast); else if (p.announce) Z.announce(p.announce);
    }, 0);
  }
  // The route left this note without a close (another note, or another page): keep the draft.
  function leave() {
    if (!S) return;
    persistNow();
    stopAll();
    S.closing = true;
    hide();
    S = null;
    restoreConnectionMessages();
    body.innerHTML = '';
  }

  function sync(route) {
    var r = Z.route || route; // never act on a stale route object
    if (pending) return;
    if (!r || r.view !== 'detail') { if (S) leave(); return; }
    var key = r.query && r.query.note;
    if (key) {
      if (S && S.goalId === r.id && S.key === key) {
        if (!dlg.open) { show(); restoreLast(); }
        if (S.guardPending) { S.guardPending = false; askDiscard(); }
        return;
      }
      if (S) leave();
      open(r.id, key);
      return;
    }
    if (!S || S.closing || S.guardPending) return;
    // Browser Back while dirty: the URL has already lost ?note=, so push it again and ask.
    if (isDirty()) { S.guardPending = true; S.pushed = true; Z.go(hashFor(S.goalId, S.key)); return; }
    clearDraft();
    finish({ focus: 'opener' });
  }

  // ---------- fixtures (ia.md §8) ----------
  function fixtureNote(f) { return /^composer-(conflict|edit|missing)$/.test(f) ? 'n2' : 'new'; }
  function fixture(f) {
    if (!f) return null;
    var first = kept().filter(isText)[0], b, p, t;
    switch (f) {
      case 'composer-photos':
        S.blocks = [txt(EX1), pic({ example: true }), txt(EX2)];
        return { focus: 't:' + S.blocks[0].k, caret: EX1.length };
      case 'composer-uploading':
        p = pic({ example: true, status: 'uploading', progress: 62 }); t = txt('');
        S.blocks = [txt(EX1), p, t];
        S.caret = { k: t.k, pos: 0 };
        startUpload(p, FIXTURE_HOLD); // held at 62% for the screenshot, then it finishes
        return { focus: 't:' + t.k, caret: 0 };
      case 'composer-failed':
        p = pic({ example: true, status: 'failed', progress: 40 });
        S.blocks = [txt(EX1), p, txt('')];
        return { focus: 'r:' + p.k };
      case 'composer-reorder':
        S.blocks = [txt(EX1), pic({ example: true }), txt(EX2)];
        S.mode = 'reorder';
        return { focus: 'reorder' };
      case 'composer-offline':
        first.text = EX1;
        return { focus: 't:' + first.k, caret: EX1.length };
      case 'composer-goal-deleted':
        first.text = EX1;
        return { focus: 't:' + first.k, caret: EX1.length, after: function () { Z.partner.deleteGoal(S.goalId, { by: 'b' }); } };
      case 'composer-conflict':
      case 'composer-missing':
        b = first; b.text = b.text + ' ' + EX2;
        return { focus: 't:' + b.k, caret: b.text.length, after: f === 'composer-missing'
          ? function () { Z.partner.deleteNote(S.noteId, { by: 'a' }); }
          : function () {
            // Sara's other device saves first; then this one presses Save and gets the 409.
            var base = Z.notes(S.goalId).filter(function (n) { return n.id === S.noteId; })[0];
            Z.partner.saveNote(S.goalId, { id: S.noteId, blocks: base.blocks.concat([{ type: 'image', example: true, alt: '' }]) }, { by: 'a' });
            doSave(true);
          } };
      default: return null; // composer, composer-edit, composer-restored
    }
  }

  // ---------- build (once) ----------
  function build() {
    dlg = document.createElement('dialog');
    dlg.id = 'composer';
    dlg.className = 'sheet composer';
    dlg.innerHTML =
      '<div class="cmp-head">' +
        '<button type="button" class="icon-btn cmp-x" data-act="close" data-f="close" aria-label="' + C.close + '">' + Z.svg('x') + '</button>' +
        '<div class="cmp-titles"><h2 id="cmp-h" tabindex="-1"></h2><p class="caption" id="cmp-sub" dir="auto"></p></div>' +
      '</div>' +
      '<div class="cmp-body" id="cmp-body"></div>' +
      '<div class="cmp-bar">' +
        '<p class="cmp-line cmp-err" id="cmp-err" hidden></p>' +
        '<p class="cmp-line" id="cmp-msg" hidden></p>' +
        '<p class="cmp-line" id="cmp-add-why" hidden></p>' +
        '<p class="cmp-line" id="cmp-save-why" hidden></p>' +
        '<span class="vh" id="cmp-add-desc"></span><span class="vh" id="cmp-save-desc"></span>' +
        '<div class="cmp-tools">' +
          '<button type="button" class="btn-sec cmp-tool" data-act="add" data-f="add">' + Z.svg('imagePlus') + '<span class="cmp-lbl">' + C.addPhoto + '</span></button>' +
          '<button type="button" class="btn-sec cmp-tool cmp-ro" data-act="reorder" data-f="reorder">' + Z.svg('listOrder') + '<span class="cmp-lbl">' + C.reorder + '</span></button>' +
          '<button type="button" class="btn-primary cmp-save" data-act="save" data-f="save" aria-keyshortcuts="Control+Enter Meta+Enter">' + C.saveNew + '</button>' +
        '</div>' +
      '</div>' +
      '<input type="file" accept="image/*" multiple hidden tabindex="-1" data-role="file">' +
      '<p class="vh dlg-live" role="status"></p>' +
      '<p class="vh" role="alert"></p>';
    document.body.appendChild(dlg);
    body = dlg.querySelector('.cmp-body');
    bar = dlg.querySelector('.cmp-bar');
    liveEl = dlg.querySelector('.dlg-live');
    alertEl = dlg.querySelector('[role="alert"]');
    fileInput = dlg.querySelector('[data-role="file"]');

    dlg.addEventListener('click', onClick);
    dlg.addEventListener('input', function (e) {
      var t = e.target;
      if (!S) return;
      if (t.classList.contains('cmp-text')) {
        var b = find(t.dataset.k); if (!b) return;
        b.text = t.value; autosize(t); counter(t, b); trackCaret(t); onChange();
      } else if (t.dataset.role === 'alt') { var p = find(t.dataset.k); if (p) { p.alt = t.value; onChange(); } }
    });
    ['keyup', 'click', 'select', 'focusin'].forEach(function (ev) { dlg.addEventListener(ev, function (e) { trackCaret(e.target); }); });
    dlg.addEventListener('focusin', function (e) { if (S && e.target.dataset && e.target.dataset.f) S.lastF = e.target.dataset.f; });
    dlg.addEventListener('keydown', function (e) {
      if (!S) return;
      // Esc goes through the discard guard. Handled on keydown so Chrome's close watcher can't skip the guard.
      if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); requestClose(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!bar.hidden) bar.querySelector('[data-act="save"]').click(); }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); requestClose(); });
    // Something else closed the dialog (the shell closes dialogs on a re-mount, or a forced close):
    // re-open it if the URL still says it's open, and let the guard decide.
    dlg.addEventListener('close', function () {
      if (dlg.open || !S || S.closing) return;
      setTimeout(function () {
        if (!S || S.closing || dlg.open) return;
        var r = Z.route;
        if (r && r.view === 'detail' && r.id === S.goalId && r.query && r.query.note === S.key) { show(); restoreLast(); if (!S.guardPending && !S.asking) requestClose(); }
      }, 0);
    });
    fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files || []);
      fileInput.value = '';
      if (S && files.length) pickFiles(files);
    });
    if (window.visualViewport) { visualViewport.addEventListener('resize', place); visualViewport.addEventListener('scroll', place); }
    window.addEventListener('resize', place);
    window.addEventListener('pagehide', persistNow);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') persistNow(); });
    // Remember what opened the composer, even if the detail re-renders before the dialog shows.
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('#view a[href], #view button');
      if (el) lastActivated = describeEl(el);
    }, true);
  }

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || !dlg.contains(el) || !S) return;
    var act = el.dataset.act, k = el.dataset.k;
    if (el.getAttribute('aria-disabled') === 'true') { disabledPress(act, k); return; }
    switch (act) {
      case 'close': requestClose(); break;
      case 'add': S.msg = ''; paintBar(); fileInput.click(); break;
      case 'reorder': toggleReorder(); break;
      case 'save': pressSave(); break;
      case 'remove': case 'rm': removeBlock(k); break;
      case 'cancel': cancelUpload(k); break;
      case 'retry': retryUpload(k); break;
      case 'describe': toggleDescribe(k); break;
      case 'undo': undo(k); break;
      case 'up': case 'down': move(k, act); break;
      case 'delete': pressDelete(); break;
      case 'discard-draft': discardDraft(); break;
      case 'keep-mine': keepMine(); break;
      case 'load-latest': loadLatest(); break;
      case 'see-latest': S.conflict.open = !S.conflict.open; render(); break;
      case 'copy': copyText(); break;
      case 'close-now': clearDraft(); finish({ focus: 'opener' }); break;
    }
  }
  // A press on an aria-disabled control changes nothing but shows and announces its reason (6.8).
  function disabledPress(act, k) {
    if (act === 'add') { S.show.add = true; paintBar(); say(bar.querySelector('#cmp-add-desc').textContent); }
    else if (act === 'save') {
      if (S.saving || S.waiting) return;
      S.show.save = true; paintBar(); say(bar.querySelector('#cmp-save-desc').textContent);
    } else if (act === 'up' || act === 'down') {
      var why = dlg.querySelector('#' + (act === 'up' ? 'cmp-wu-' : 'cmp-wd-') + k);
      if (why) { why.hidden = false; say(why.textContent); }
    } else if (act === 'delete') say(C.delOffline);
  }

  // ---------- events from the shared layer ----------
  Z.on('change', function (e) {
    if (!S || S.closing) return;
    if (e.type === 'goal-deleted' && e.goalId === S.goalId) {
      S.deletedBy = e.by;
      S.banner = { type: 'goalDeleted', by: e.by, title: (e.goal && e.goal.title) || S.title };
    } else if (e.type === 'note-deleted' && S.noteId && e.note && e.note.id === S.noteId && e.source !== 'me') {
      S.banner = { type: 'missing' };
    } else {
      if (e.type === 'goal-updated' && e.goalId === S.goalId) { var g = Z.goal(S.goalId); if (g) { S.title = g.title; paintHead(); } }
      return;
    }
    S.conflict = null; S.saving = S.waiting = false;
    stopAll();
    photos().forEach(function (b) { if (b.status === 'uploading') b.status = 'failed'; });
    if (S.mode === 'reorder') { S.mode = 'write'; normalize(true); }
    render();
    say(dlg.querySelector('.cmp-banner-h').textContent, true);
    focusLostTo();
  });
  Z.on('connection', function (e) {
    if (!S || S.closing) return;
    paintBar();
    var del = body.querySelector('[data-act="delete"]'), why = body.querySelector('#cmp-del-why');
    if (del) { setOff(del, e.offline, 'cmp-del-why'); why.hidden = !e.offline; }
  });
  Z.on('route', function (r) {
    if (firstRoute) {
      firstRoute = false;
      var f = r.view === 'detail' ? Z.fixture('detail') : null;
      if (!f || !/^composer/.test(f)) FIX = null;
      else if (!(r.query && r.query.note) && !S) { var id = r.id; setTimeout(function () { Z.go('#/goals/' + id + '?note=' + fixtureNote(f), { replace: true }); }, 0); return; }
    }
    if (r.view === 'detail' && !(r.query && r.query.note)) lastDetail = { id: r.id, idx: history.state ? history.state.zIdx : null };
    if (pending) { if (!(r.view === 'detail' && r.query && r.query.note)) settle(); return; }
    sync(r);
  });

  build();
  Z.composer = {
    sync: sync,
    clearDrafts: store.clearAll,
    // Older stub contract, kept for callers that open by id: it only changes the URL.
    open: function (goalId, key) { Z.go('#/goals/' + goalId + '?note=' + encodeURIComponent(key || 'new')); },
    close: function () { requestClose(); }
  };
})();
