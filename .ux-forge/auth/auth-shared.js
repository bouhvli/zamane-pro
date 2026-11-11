/* Zamane auth prototype: shared layer (window.A). Direction C · Two seats.
   Plain script, works over file://. Views register with A.view(route, { mount(el, ctx), unmount() }).

   API (what view scripts may use):
   Routing   A.view(route, def)  A.go('#/route', {replace})  A.route  A.state (this view's ?state= key, or the
             view's default)  A.isFixture(key)  A.handoff(to)  -> Home URLs ('first-run' | 'joined-empty' | 'home')
   Copy      A.title(text)  (document title "{text} – Zamane")   A.esc(s)   A.icon(name, cls)
   Chrome    A.header({ account: {firstName, slot?} | null, back: {href, label} | null, seats: html | '' })
             A.footnote(text|'')
   Seats     A.initial(name)  A.seat({role:'a'|'b'|'neutral'|'empty'|'taken', initial, size:'md'|'sm'})
             A.pair(seatA, seatB)  -> html (aria-hidden; the text carries the meaning)
   Fields    A.field({ id, name, label, type, autocomplete, help, value, attrs, password:true, code:true })
             A.setError(input, msg)  A.clearError(input)  A.describe(input)  A.formAlert(form, msg, {field})
             A.countAlert(form, n)  A.wireForm(form, { validate(input)->msg, onSubmit(e) })
             A.pending(btn, label) / A.idle(btn)  A.disable(btn, reasonId) / A.enable(btn)
   Status    A.say(msg) (polite)   A.offline (bool)   A.onConnection(fn(offline))   A.rateLimit(btn, ms, onLift)
   Data      A.carry.get/set/clear(key) (sessionStorage: 'email', 'intent', 'code', 'joinDraft')
             A.normEmail(s)  A.normCode(raw) -> { code:'K7QM4XPA'|'', display:'K7QM-4XPA'|raw, ok, reason }
             A.fake(result, ms) -> Promise (a request with latency; 'hang' never resolves = submitting)
   Dialog    A.confirm({ title, body(html), ok, cancel }) -> Promise<boolean>   (alertdialog, focus on cancel)
   Focus     A.focusHeading()  A.focus(el)
   Example   A.EX (example data)
*/
(function () {
  'use strict';
  var A = window.A = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  A.$ = $;
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- example data (labelled on screen by the footnote) ----------
  A.EX = {
    sara: { firstName: 'Sara', email: 'sara@example.com', slot: 'a' },
    youssef: { firstName: 'Youssef', email: 'youssef@example.com', slot: 'b' },
    longEmail: 'sara.benali.elidrissi+zamane@example.com',
    space: { name: 'Our space', currency: 'MAD', timezone: 'Africa/Casablanca' },
    code: 'K7QM4XPA',
    wrongPassword: 'wrong-password-1',
    // the solo space Youssef started by mistake (F9 switch confirmation counts)
    soloSpace: { goals: 1, trips: 0, items: 3 }
  };
  A.FOOTNOTE = 'Example data. The names, email addresses and code on this screen are made up.'; // copy.md auth.example

  // ---------- small utils ----------
  A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ICONS = {
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    'wifi-off': '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  A.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };
  A.title = function (t) { document.title = t + ' – Zamane'; };

  // ---------- storage (try/catch: private windows) ----------
  var KEY = 'zamane.auth.';
  A.carry = {
    get: function (k) { try { return sessionStorage.getItem(KEY + k) || ''; } catch (e) { return mem[k] || ''; } },
    set: function (k, v) { mem[k] = v; try { sessionStorage.setItem(KEY + k, v); } catch (e) {} },
    clear: function (k) { delete mem[k]; try { sessionStorage.removeItem(KEY + k); } catch (e) {} }
  };
  var mem = {};

  // ---------- normalisers (ia.md §6.6) ----------
  A.normEmail = function (s) { return String(s || '').trim().toLowerCase(); };
  var ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  A.normCode = function (raw) {
    var s = String(raw || '').normalize('NFKC').toUpperCase();
    var runs = s.match(/[A-Z0-9]{4}[\s-]?[A-Z0-9]{4}/g), pick = '';
    if (runs) {
      for (var i = runs.length - 1; i >= 0; i--) { var c = runs[i].replace(/[\s-]/g, ''); if (onlyAlpha(c)) { pick = c; break; } }
    }
    if (!pick) pick = s.replace(/[\s\-._]/g, '');
    if (!pick) return { code: '', display: '', ok: false, reason: 'empty' };
    if (pick.length !== 8) return { code: '', display: String(raw).trim(), ok: false, reason: 'length' };
    if (!onlyAlpha(pick)) return { code: '', display: String(raw).trim(), ok: false, reason: 'letters' };
    return { code: pick, display: pick.slice(0, 4) + '-' + pick.slice(4), ok: true, reason: '' };
  };
  function onlyAlpha(c) { for (var i = 0; i < c.length; i++) if (ALPHA.indexOf(c[i]) < 0) return false; return true; }

  // ---------- seats (direction C) ----------
  A.initial = function (name) {
    name = String(name || '').trim(); if (!name) return '';
    try { if (window.Intl && Intl.Segmenter) { var it = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name)[Symbol.iterator]().next(); return it.value.segment.toLocaleUpperCase(); } } catch (e) {}
    return name.charAt(0).toLocaleUpperCase();
  };
  A.seat = function (o) {
    o = o || {};
    var role = o.role || 'neutral', size = o.size || 'md', txt = role === 'empty' || role === 'taken' ? '' : A.esc(o.initial || '');
    if (!txt && (role === 'a' || role === 'b' || role === 'neutral')) role = role === 'neutral' ? 'empty' : role; // never a "?"
    return '<span class="seat seat--' + role + ' seat--' + size + '"' + (o.vt ? ' style="view-transition-name:' + o.vt + '"' : '') + '>' + txt + '</span>';
  };
  A.pair = function (a, b, cls) { return '<span class="seat-pair ' + (cls || '') + '" aria-hidden="true">' + a + b + '</span>'; };

  // ---------- chrome ----------
  var LOGO = '<img class="lockup logo-light" src="../../assets/zamane-logo.svg" alt="Zamane" width="125" height="36">' +
             '<img class="lockup logo-dark" src="../../assets/zamane-logo-dark.svg" alt="Zamane" width="125" height="36">';
  A.header = function (o) {
    o = o || {};
    var h = $('#auth-head'), setup = !!(o.account || o.back);
    h.className = 'auth-head' + (setup ? ' is-setup' : ' is-hero');
    var html = '<div class="auth-head-row">';
    if (o.back) html += '<a class="link-btn back" href="' + o.back.href + '" aria-label="' + A.esc(o.back.label) + '">' + A.icon('chevron-left') + '<span>Back</span></a>';
    else html += '<span class="brand">' + LOGO + '</span>';
    if (o.account) {
      html += '<p class="account"><span class="account-name">Signed in as <span class="nowrap">' + A.esc(o.account.firstName) + '</span></span>' +
        '<button class="link-btn" type="button" id="sign-out">Sign out</button></p>';
    }
    html += '</div>';
    h.innerHTML = html;
    var so = $('#sign-out');
    if (so) so.addEventListener('click', function () {
      ['email', 'intent', 'code', 'joinDraft'].forEach(A.carry.clear);
      A.go('#/sign-in', { replace: true, state: 'signed-out' });
    });
  };
  A.footnote = function (t) { $('#footnote').textContent = t == null ? A.FOOTNOTE : t; };

  // ---------- live region and focus ----------
  A.say = function (msg) {
    var l = $('#live'); l.textContent = '';
    setTimeout(function () { l.textContent = msg; }, 60);
  };
  A.focus = function (el) { if (!el) return; if (!el.matches('a,button,input,select,textarea,[tabindex]')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: false }); };
  A.focusHeading = function () { var h = $('#view h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } };

  // ---------- fields and errors (goals/form.js pattern) ----------
  A.field = function (o) {
    var id = o.id, help = o.help ? '<p class="help" id="' + id + '-help">' + o.help + '</p>' : '';
    var attrs = o.attrs || '';
    var input = '<input id="' + id + '" name="' + (o.name || id) + '" type="' + (o.type || 'text') + '"' +
      (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
      (o.value ? ' value="' + A.esc(o.value) + '"' : '') +
      (o.help ? ' aria-describedby="' + id + '-help"' : '') + ' ' + attrs + '>';
    var toggle = o.password ? '<button class="pw-toggle" type="button" aria-controls="' + id + '" aria-label="Show password">Show</button>' : '';
    return '<div class="fgroup' + (o.code ? ' fgroup--code' : '') + '" data-for="' + id + '">' +
      '<label class="field-label" for="' + id + '">' + o.label + (o.labelExtra || '') + '</label>' +
      '<div class="field' + (o.password ? ' field-pw' : '') + (o.code ? ' field-code' : '') + '">' + input + toggle + '</div>' +
      '<p class="err" id="' + id + '-err" hidden></p>' + help + (o.after || '') + '</div>';
  };
  A.describe = function (input) {
    var ids = [], err = $('#' + input.id + '-err'), help = $('#' + input.id + '-help');
    if (err && !err.hidden) ids.push(err.id);
    if (input.dataset.alert) ids.push(input.dataset.alert);
    if (help && !help.hidden) ids.push(help.id);
    (input.dataset.extra || '').split(' ').forEach(function (x) { var e = x && document.getElementById(x); if (e && !e.hidden) ids.push(x); });
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
  };
  A.setError = function (input, msg, opts) {
    var err = $('#' + input.id + '-err'), box = input.closest('.field');
    if (!msg) return A.clearError(input);
    err.innerHTML = A.icon('alert') + '<span>' + A.esc(msg) + (opts && opts.html ? ' ' + opts.html : '') + '</span>';
    if (opts && opts.announce) err.setAttribute('role', 'alert'); else err.removeAttribute('role');
    err.hidden = false; input.setAttribute('aria-invalid', 'true'); box.classList.add('is-invalid');
    A.describe(input);
  };
  A.clearError = function (input) {
    var err = $('#' + input.id + '-err'), box = input.closest('.field'), form = input.form;
    if (err) { err.hidden = true; err.textContent = ''; err.removeAttribute('role'); }
    input.removeAttribute('aria-invalid'); if (box) box.classList.remove('is-invalid');
    if (form && form.dataset.count) { form.dataset.count = ''; A.formAlert(form, ''); } // stale count clears silently
    A.describe(input);
  };
  // The one alert slot per form (#<form>-alert, role=alert). With {field}, that field is described by it.
  A.formAlert = function (form, msg, o) {
    o = o || {};
    var slot = $('.form-alert', form);
    A.$$('input', form).forEach(function (i) { if (i.dataset.alert) { delete i.dataset.alert; A.describe(i); } });
    if (!msg) { slot.innerHTML = ''; return; }
    var cls = o.tone === 'neutral' ? 'notice' : 'notice notice-danger';
    slot.innerHTML = '<div class="' + cls + '" id="' + form.id + '-alert-msg">' + A.icon(o.icon || 'alert') + '<p>' + msg + '</p></div>';
    if (o.field) { o.field.dataset.alert = form.id + '-alert-msg'; A.describe(o.field); }
  };
  A.countAlert = function (form, n) {
    if (n < 2) return;
    form.dataset.count = String(n);
    A.formAlert(form, n + ' fields need your attention.');
  };
  // Validation timing: on blur only after the field was typed in; clears as soon as it's valid.
  // The blur caused by pressing Back or a cross-link doesn't validate (mousedown on a[href] sets a flag).
  A.wireForm = function (form, o) {
    var leaving = false;
    form.closest('#view').addEventListener('pointerdown', function (e) { if (e.target.closest('a[href]')) leaving = true; }, true);
    A.$$('input', form).forEach(function (i) {
      i.addEventListener('input', function () {
        i.dataset.touched = '1';
        if (i.getAttribute('aria-invalid') === 'true' && !o.validate(i)) A.clearError(i);
      });
      i.addEventListener('blur', function () {
        setTimeout(function () {
          if (leaving) { leaving = false; return; }
          if (i.dataset.touched && i.isConnected) { var m = o.validate(i); if (m) A.setError(i, m); else A.clearError(i); }
        }, 0);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('[type=submit]', form);
      if (btn && btn.getAttribute('aria-disabled') === 'true') {
        var r = btn.getAttribute('aria-describedby'); if (r && $('#' + r)) A.say($('#' + r).textContent); // its reason, once more
        return;
      }
      // password fields go back to type=password on submit, so browsers offer to save
      A.$$('.field-pw input', form).forEach(function (p) { if (p.type !== 'password') toggle(p.parentNode.querySelector('.pw-toggle'), false); });
      o.onSubmit(e);
    });
    A.$$('.pw-toggle', form).forEach(function (b) { b.addEventListener('click', function () { toggle(b); }); });
  };
  function toggle(b, show) {
    var input = document.getElementById(b.getAttribute('aria-controls'));
    if (show == null) show = input.type === 'password';
    var s = input.selectionStart, e = input.selectionEnd;
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide' : 'Show';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    try { input.setSelectionRange(s, e); } catch (x) {}
  }
  // Pending: the label changes and aria-disabled keeps it focusable; the accessible name follows the text.
  A.pending = function (btn, label) { btn.dataset.label = btn.dataset.label || btn.textContent; btn.textContent = label; btn.setAttribute('aria-disabled', 'true'); btn.dataset.busy = '1'; };
  A.idle = function (btn) { if (btn.dataset.label) btn.textContent = btn.dataset.label; delete btn.dataset.busy; if (!btn.dataset.reason) btn.removeAttribute('aria-disabled'); };
  A.disable = function (btn, reasonId) { btn.setAttribute('aria-disabled', 'true'); btn.dataset.reason = reasonId || '1'; if (reasonId) btn.setAttribute('aria-describedby', reasonId); };
  A.enable = function (btn) { delete btn.dataset.reason; btn.removeAttribute('aria-describedby'); if (!btn.dataset.busy) btn.removeAttribute('aria-disabled'); };

  // Rate limit: the time is in the text, no countdown; the primary re-enables itself and says so politely.
  A.rateLimit = function (btn, ms, onLift) {
    A.disable(btn);
    var t = setTimeout(function () { A.enable(btn); A.say('You can try again now.'); if (onLift) onLift(); }, ms);
    cleanups.push(function () { clearTimeout(t); });
  };

  // A fake request. result: a value, an Error-like { error: code }, or 'hang' (stays pending: the submitting state).
  A.fake = function (result, ms) {
    return new Promise(function (res, rej) {
      if (result === 'hang') return;
      var t = setTimeout(function () { if (result && result.error) rej(result); else res(result); }, ms == null ? 700 : ms);
      cleanups.push(function () { clearTimeout(t); });
    });
  };

  // ---------- connection ----------
  var connFns = [];
  A.offline = false;
  A.onConnection = function (fn) { connFns.push(fn); };
  function setOffline(off) { if (off === A.offline) return; A.offline = off; connFns.slice().forEach(function (f) { f(off); }); }
  window.addEventListener('offline', function () { setOffline(true); });
  window.addEventListener('online', function () { setOffline(false); });
  A.simulateOnline = function () { setOffline(false); }; // used by the prototype's "offline" fixtures

  // ---------- confirm (alertdialog; the safe button first and focused; Esc keeps; no backdrop dismissal) ----------
  A.confirm = function (o) {
    var d = $('#confirm'), opener = document.activeElement;
    $('#confirm-h').textContent = o.title;
    $('#confirm-body').innerHTML = o.body || '';
    $('#confirm-cancel').textContent = o.cancel || 'Keep it';
    $('#confirm-ok').textContent = o.ok;
    return new Promise(function (res) {
      function done(v) { d.removeEventListener('close', onClose); d.close(); if (opener && opener.isConnected) opener.focus(); res(v); }
      function onClose() { res(false); if (opener && opener.isConnected) opener.focus(); }
      $('#confirm-cancel').onclick = function () { done(false); };
      $('#confirm-ok').onclick = function () { done(true); };
      d.addEventListener('close', onClose, { once: true });
      d.showModal();
      $('#confirm-cancel').focus();
    });
  };

  // ---------- keyboard up: keep the primary above the on-screen keyboard (A8) ----------
  if (window.visualViewport) {
    var vv = window.visualViewport, fit = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', kb + 'px');
    };
    vv.addEventListener('resize', fit); fit();
  }

  // ---------- router ----------
  var views = {}, current = null, cleanups = [], first = true;
  var initialState = new URLSearchParams(location.search).get('state') || '';
  A.view = function (route, def) { views[route] = def; };
  A.go = function (hash, o) {
    o = o || {};
    nextState = o.state || '';
    var url = location.pathname + hash; // drops ?state=: fixtures apply to the first view only
    if (o.replace) history.replaceState({ a: 1 }, '', url); else history.pushState({ a: 1 }, '', url);
    handle(true);
  };
  var nextState = '';
  A.handoff = function (to) {
    return '../home/home.html' + (to === 'first-run' ? '?state=first-run' : to === 'joined-empty' ? '?state=joined-empty' : '');
  };
  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    var q = h.indexOf('?'); if (q >= 0) h = h.slice(0, q);
    return h || 'sign-in'; // A1: Sign in is the landing screen
  }
  var lastHref = '';
  function handle(force) {
    if (location.hash && location.hash.indexOf('#/') !== 0) return; // #main (skip link) is not a route
    if (force !== true && location.href === lastHref) return; // popstate + hashchange both fire on fragment moves
    lastHref = location.href;
    var route = parse(), def = views[route] || views['sign-in'];
    if (!views[route]) route = 'sign-in';
    if (current && current.def.unmount) { try { current.def.unmount(); } catch (e) {} }
    cleanups.forEach(function (f) { f(); }); cleanups = [];
    connFns = [];
    var d = $('#confirm'); if (d.open) d.close();
    A.route = route;
    A.state = (first ? initialState : nextState) || (def.states && def.states[0]) || '';
    var wasFirst = first; first = false; nextState = '';
    A.offline = A.state === 'offline' || navigator.onLine === false;
    document.documentElement.dataset.route = route;
    var el = $('#view');
    el.className = 'view view--' + route.replace(/\//g, '-');
    el.innerHTML = '';
    A.footnote();
    current = { route: route, def: def };
    def.mount(el, { first: wasFirst, state: A.state });
    if (!wasFirst && !def.ownsFocus) A.focusHeading(); // §6.1: route change → h1 (views with their own rule set ownsFocus)
    window.scrollTo(0, 0);
  }
  A.isFixture = function (k) { return A.state === k; };
  A.onCleanup = function (f) { cleanups.push(f); };
  window.addEventListener('popstate', handle);
  window.addEventListener('hashchange', handle);
  A.start = function () { handle(); };

  // In-app links (href="#/…") go through A.go so ?state= is dropped; data-replace="" replaces history.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    A.go(a.getAttribute('href'), { replace: a.hasAttribute('data-replace'), state: a.dataset.state || '' });
  });

  // skip link: focus main without touching the route
  document.addEventListener('click', function (e) {
    var s = e.target.closest('.skip'); if (!s) return;
    e.preventDefault(); $('#main').focus();
  });
})();
