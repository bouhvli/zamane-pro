/* Zamane auth prototype: space setup and the resolvers. Direction C · Two seats.
   Routes and their ?state= keys (ia.md §4; the default first):
     #/setup         choose · long-email · offline · guard-member
     #/setup/start   idle · invalid · other-currency · timezone-change · submitting · already-in-space · offline ·
                     network-error · server-error · long-name
     #/setup/join    idle · prefilled · restored · invalid · invalid-letters · invite-invalid · submitting ·
                     rate-limited · already-in-space · offline · network-error · server-error · switch · switch-confirm
     #/join          signed-out · no-space · member          (F10; #/join?code=… stands in for /join#code=…)
     #/launch        loading · signed-out · no-space · member · cached-offline · offline · error   (F11)
   Who is signed in (prototype): Sara on the choice and Start (she creates); Youssef on Join and switch (he joins).
   Redirects inside auth.html happen for real (replace) after the simulated /api/me latency. Redirects to Home are
   held on the splash with a labelled prototype note and a link, because Home lives in another file and doesn't
   show the setup notices yet.
   Prototype rules: K7QM-4XPA joins; any other well-formed code answers invite_invalid; the sixth join try within a
   minute answers 429, and Retry-After is shortened to 10 s (ia.md §9). A fixture shows its state on first load; after
   that the screen behaves normally, so a retry works. "offline" lifts with the prototype control under the notice.
   Uses window.A from auth-shared.js only; strings are copy.md's, verbatim. */
(function () {
  'use strict';
  var $ = A.$, esc = A.esc;
  var SARA = A.EX.sara, YOUSSEF = A.EX.youssef;
  var PROTO = { region: 'MA', timeZone: 'Africa/Casablanca', latency: 450, retryAfter: 10000, rateMax: 5 };
  var EXAMPLE = 'K7QM-4XPA';

  // ---------- copy.md (binding) ----------
  var C = {
    example: 'Example data. The names, email addresses and code on this screen are made up.',
    signOut: 'Sign out', signOutOffline: 'Signing out needs a connection.',
    signedUpAs: 'Signed up as <b>{email}</b>. Not right? <signout>Sign out</signout> and create your account again.',
    back: 'Back to set up your space',
    server: 'Something went wrong on our side. Try again in a moment.',
    rateLimited: 'Too many tries. Wait a minute, then try again.',
    alreadyIn: 'You\'re already in a space.',
    choose: {
      title: 'Set up your space', h1: 'Set up your space',
      gloss: 'Your shared place for goals, trips and shopping. One of you starts it; the other joins with a code.',
      startTitle: 'Start our space', startBody: 'I\'m first. I\'ll invite my partner with a code. Only one of you starts.',
      joinTitle: 'Join with a code', joinBody: 'My partner already started. I have their code.',
      offline: 'You\'re offline. Setting up needs a connection.', online: 'Back online.'
    },
    start: {
      title: 'Start our space', h1: 'Start our space',
      name: 'Space name', nameDefault: 'Our space', nameHelp: 'Only you two see this.',
      currency: 'Currency', option: '{name} ({code})', other: 'Another currency…', otherSelect: 'Choose a currency',
      currencyHelp: 'You can\'t change this later.',
      tz: 'Time zone', tzValue: '{city} (from this phone)', tzChange: 'Change', tzChangeLabel: 'Change time zone',
      tzSelect: 'Choose a time zone',
      submit: 'Start our space', submitting: 'Starting…',
      wrongPath: 'Only one of you starts. Partner already has a code? <link>Join with their code</link>',
      nameEmpty: 'Give your space a name.', nameLong: 'Use 120 characters or fewer.',
      currencyEmpty: 'Choose a currency.', tzEmpty: 'Choose a time zone.',
      offline: 'You\'re offline. Starting a space needs a connection.',
      online: 'Back online. You can start your space now.',
      network: 'Couldn\'t reach Zamane. Try again. Nothing is created twice.'
    },
    join: {
      title: 'Join with a code', h1: 'Join with a code',
      intro: 'Enter the code your partner shared. It looks like {example}.',
      code: 'Invite code', codeHelp: 'You can paste the whole message.',
      submit: 'Join space', submitting: 'Joining…',
      startInstead: 'No code yet? <link>Start our space</link>',
      length: 'Codes have 8 letters and numbers, like {example}.',
      letters: 'Codes don\'t use 0, O, 1, I or L. Check the code again.',
      invalid: 'That code didn\'t work. Check it with your partner, or ask them to share a new one.',
      offline: 'You\'re offline. Joining needs a connection.',
      online: 'Back online. You can join now.',
      network: 'Couldn\'t reach Zamane. Your code is kept. Try again.'
    },
    sw: {
      title: 'Join your partner\'s space', h1: 'Join your partner\'s space',
      dialogTitle: 'Join with this code?',
      bodyWith: 'The space you started will be deleted, with {summary}. This can\'t be undone.',
      bodyEmpty: 'The space you started will be deleted. This can\'t be undone.',
      goals: { one: '# goal', other: '# goals' },
      trips: { one: '# trip', other: '# trips' },
      items: { one: '# shopping item', other: '# shopping items' },
      keep: 'Keep my space', confirm: 'Join and delete my space', confirming: 'Joining…',
      invalid: 'That code didn\'t work. Check it with your partner, or ask them to share a new one. Your space wasn\'t deleted.'
    },
    invite: { title: 'Opening your invite', status: 'Opening your invite', withPartner: 'You\'re already in a space with {partnerName}.' },
    launch: {
      loadingTitle: 'Loading', loading: 'Loading Zamane',
      offlineTitle: 'You\'re offline', offlineH1: 'You\'re offline',
      offlineBody: 'Zamane needs a connection to open on this phone for the first time.',
      errorTitle: 'Zamane didn\'t open', errorH1: 'Zamane didn\'t open',
      errorBody: 'Something went wrong on our side. Try again in a moment.',
      retry: 'Try again', retrying: 'Trying again', online: 'Back online. Opening Zamane.'
    }
  };
  // Prototype-only notes (not product copy; labelled "Prototype" on screen).
  var P = {
    label: 'Prototype',
    online: 'Prototype: come back online',
    openHome: 'Open Home',
    openHomeSolo: 'Open Home (solo space)',
    member: 'Signed in, with a space: the app replaces this splash with Home.',
    cached: 'No connection, but Home is cached on this phone: the app opens it from the cache, with Home\'s offline notice.',
    guard: 'This account already has a space, so setup isn\'t shown: the app replaces it with Home.',
    already: 'The server answered 409 already_in_space. The app checks /api/me again, finds the space and replaces to Home, which shows:',
    inviteMember: 'Signed in, in a full space: the code is dropped and the app replaces to Home, which shows:',
    inviteSolo: 'In a solo space instead, Home\'s invite card offers "Join their space instead" with the code ready.'
  };

  // A fixture is an explicit ?state= on the first load (account.js's rule, so both halves behave alike).
  var EXPLICIT = !!new URLSearchParams(location.search).get('state');
  function fixture(ctx) { return ctx.first && EXPLICIT; }
  // §6.1: the first load moves nothing; an in-app arrival, or a fixture showing an after-action state, applies the rule.
  function land(ctx, def, target) { if (!ctx.first || (fixture(ctx) && A.state !== def)) A.focus(target); }

  // ---------- small helpers ----------
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function rich(s, tag, open) { return s.replace(new RegExp('<' + tag + '>(.*?)</' + tag + '>'), function (m, t) { return open + t + '</' + (open.match(/^<(\w+)/)[1]) + '>'; }); }
  function plural(n, forms) { var r = 'other'; try { r = new Intl.PluralRules('en').select(n); } catch (e) {} return (forms[r] || forms.other).replace('#', n); }
  function ms(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return /ms$/.test(v) ? parseFloat(v) : /s$/.test(v) ? parseFloat(v) * 1000 : parseFloat(v) || 0;
  }
  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function later(fn, t) { var id = setTimeout(fn, t); A.onCleanup(function () { clearTimeout(id); }); }
  function codeHtml(c) { return '<span class="nowrap" dir="ltr">' + esc(c) + '</span>'; }
  function notice(id, text, icon) {
    return '<div class="notice page-notice" id="' + id + '">' + A.icon(icon || 'wifi-off') + '<p id="' + id + '-msg">' + text + '</p></div>';
  }
  function alertSlot(id) { return '<div class="form-alert" id="' + id + '-alert" role="alert"></div>'; }
  function head(text, pair) { return '<div class="page-head"><h1 class="title-lg">' + esc(text) + '</h1>' + (pair || '') + '</div>'; }
  function signedUpAs(email) {
    return rich(fmt(C.signedUpAs, { email: '<span class="email-addr" dir="ltr">' + esc(email) + '</span>' }), 'signout',
      '<button class="link-btn inline-btn js-signout" type="button">');
  }

  // ---------- connection: notice above the form, primary aria-disabled and described by it (F7/F8) ----------
  // The setup header's Sign out is also unavailable offline (F5): aria-disabled, its reason beside it, said on press.
  function connection(slot, id, offText, onText, btn, onOnline) {
    function render(off) {
      if (!slot.isConnected) return;
      slot.innerHTML = off ? notice(id, esc(offText)) + (EXPLICIT && A.state === 'offline' && navigator.onLine !== false ? protoOnline() : '') : '';
      if (btn) { if (off) A.disable(btn, id + '-msg'); else A.enable(btn); }
      guardSignOut(off);
      var po = $('.js-online', slot);
      if (po) po.addEventListener('click', function () { A.simulateOnline(); });
    }
    render(A.offline);
    A.onConnection(function (off) {
      var hadFocus = slot.contains(document.activeElement);
      render(off);
      if (!off) { A.say(onText); if (hadFocus) A.focus(btn || $('#view h1')); if (onOnline) onOnline(); }
    });
  }
  function protoOnline() { return '<p class="proto-ctl"><button class="link-btn js-online" type="button">' + P.online + '</button></p>'; }
  function guardSignOut(off) {
    var b = $('#sign-out'), r = $('#signout-reason');
    if (!b) return;
    A.$$('.js-signout').forEach(function (x) { if (off) { x.setAttribute('aria-disabled', 'true'); x.setAttribute('aria-describedby', 'signout-reason'); } else { x.removeAttribute('aria-disabled'); x.removeAttribute('aria-describedby'); } });
    if (off) {
      b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', 'signout-reason');
      if (!r) { r = document.createElement('p'); r.id = 'signout-reason'; r.className = 'signout-reason'; r.textContent = C.signOutOffline; $('#auth-head').appendChild(r); }
    } else {
      b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby'); if (r) r.remove();
    }
  }
  // Capture phase: runs before the shared header's own click handler, so an offline press only says why.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#sign-out, .js-signout');
    if (!b) return;
    if (A.offline) { e.preventDefault(); e.stopImmediatePropagation(); A.say(C.signOutOffline); return; }
    if (b.classList.contains('js-signout')) { var so = $('#sign-out'); if (so) so.click(); }
  }, true);

  // ---------- splash and held redirects ----------
  var MARK = '<img class="lockup logo-light" src="../../assets/zamane-logo.svg" alt="" width="125" height="36">' +
             '<img class="lockup logo-dark" src="../../assets/zamane-logo-dark.svg" alt="" width="125" height="36">';
  function hideHead() { var w = $('.auth-head-wrap'); w.hidden = true; A.onCleanup(function () { w.hidden = false; }); }
  // The mark on surface; the status line "Loading Zamane" after 1 s (§2.1). o.status: a hidden status said at once.
  function splash(el, o) {
    o = o || {};
    hideHead(); A.footnote('');
    A.title(o.title || C.launch.loadingTitle);
    el.innerHTML = '<div class="splash"><section class="splash-mark" aria-label="' + esc(o.label || C.launch.loading) + '" aria-busy="true">' + MARK + '</section>' +
      '<p class="splash-status' + (o.status ? ' vh' : '') + '" role="status"></p>' + (o.extra || '') + '</div>';
    var st = $('.splash-status', el);
    if (o.status) later(function () { st.textContent = o.status; }, 60);
    else later(function () { st.textContent = C.launch.loading; }, 1000);
  }
  // Prototype hold for a hand-off to Home: what the app does, the notice Home shows (if any), and the link.
  function hold(el, o) {
    var links = (o.links || []).map(function (l) { return '<a class="btn-sec btn-block" href="' + l.href + '">' + esc(l.text) + '</a>'; }).join('');
    splash(el, { title: o.title, extra:
      '<aside class="proto" aria-label="' + P.label + '"><p class="proto-label">' + P.label + '</p><p>' + esc(o.what) + '</p>' +
      (o.notice ? '<div class="notice">' + A.icon('info') + '<p>' + esc(o.notice) + '</p></div>' : '') +
      (o.after ? '<p>' + esc(o.after) + '</p>' : '') + '<div class="proto-links">' + links + '</div></aside>' });
    A.footnote(C.example);
  }
  var HOME = { text: P.openHome, href: A.handoff('home') };

  // ---------- seats ----------
  function filling(html) { return html.replace('class="seat ', 'class="seat is-filling '); }
  // The signature moment (directions.md C): the partner's initial lands in the waiting seat (160 ms fade + 0.9→1
  // scale, .is-filling), a 240 ms hold, then replace to Home. Reduced motion: no scale, no hold.
  function fillSeat(el, partnerName, me, sw) {
    var pair = $('.page-head .seat-pair', el), init = A.initial(partnerName);
    // no partner name in the response: the seat fills neutral, with no letter (decision.md risk 3)
    var seatA = filling(init ? A.seat({ role: 'a', initial: init }) : '<span class="seat seat--neutral seat--md"></span>');
    if (sw) pair.innerHTML = seatA + A.seat({ role: 'b', initial: A.initial(me.firstName) });
    else pair.firstElementChild.outerHTML = seatA;
    var wait = reduced() ? 0 : ms('--dur-seat') + ms('--seat-hold');
    ['code', 'intent', 'joinDraft'].forEach(A.carry.clear);
    later(function () { location.replace(A.handoff('joined-empty')); }, wait);
  }

  // ---------- Set up your space: the choice (F6, wireframe 5.5) ----------
  function choiceCard(id, href, title, body, pair) {
    return '<li class="choice card">' + pair +
      '<p class="choice-title"><a href="' + href + '" aria-describedby="' + id + '-desc">' + esc(title) + '</a></p>' +
      A.icon('chevron-right', 'chev') +
      '<p class="choice-desc" id="' + id + '-desc">' + esc(body) + '</p></li>';
  }
  A.view('setup', {
    states: ['choose', 'long-email', 'offline', 'guard-member'],
    mount: function (el, ctx) {
      var st = A.state;
      if (st === 'guard-member') return hold(el, { what: P.guard, links: [HOME] });
      var me = SARA, i = A.initial(me.firstName), email = st === 'long-email' ? A.EX.longEmail : me.email;
      A.title(C.choose.title);
      A.header({ account: { firstName: me.firstName } });
      A.footnote(C.example);
      el.innerHTML = head(C.choose.h1, A.pair(A.seat({ role: 'neutral', initial: i }), '')) +
        '<p class="lede">' + esc(C.choose.gloss) + '</p>' +
        '<div id="choose-conn"></div>' +
        '<div class="choices-wrap"><ul class="choices">' +
          choiceCard('choose-start', '#/setup/start', C.choose.startTitle, C.choose.startBody,
            A.pair(A.seat({ role: 'a', initial: i }), A.seat({ role: 'empty' }))) +
          choiceCard('choose-join', '#/setup/join', C.choose.joinTitle, C.choose.joinBody,
            A.pair(A.seat({ role: 'taken' }), A.seat({ role: 'b', initial: i }))) +
        '</ul></div>' +
        '<p class="signed-up">' + signedUpAs(email) + '</p>';
      connection($('#choose-conn'), 'choose-offline', C.choose.offline, C.choose.online, null);
    }
  });

  // ---------- Start our space (F7, wireframe 5.6) ----------
  var REGION_CURRENCY = { MA: 'MAD', FR: 'EUR', BE: 'EUR', NL: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', IE: 'EUR',
    AT: 'EUR', LU: 'EUR', GB: 'GBP', US: 'USD', CA: 'CAD', CH: 'CHF', DZ: 'DZD', TN: 'TND', AE: 'AED', SA: 'SAR' };
  // Prototype: the locale's region is fixed to MA and the browser time zone to Africa/Casablanca (ia.md §9).
  // Production: new Intl.Locale(navigator.language).maximize().region and Intl.DateTimeFormat().resolvedOptions().timeZone.
  function localeRegion() { return PROTO.region; }
  function browserTz() { return PROTO.timeZone; }
  function currencyShortlist() {
    var list = [];
    [REGION_CURRENCY[localeRegion()], 'MAD', 'EUR'].forEach(function (c) { if (c && list.indexOf(c) < 0) list.push(c); });
    return list.slice(0, 3);
  }
  var DN = null; try { DN = new Intl.DisplayNames(['en'], { type: 'currency' }); } catch (e) {}
  function currencyName(code) { var n = ''; try { n = DN ? DN.of(code) : ''; } catch (e) {} return n || code; }
  function currencyLabel(code) { return fmt(C.start.option, { name: esc(currencyName(code)), code: code }); }
  function allCurrencies() {
    var codes = ['MAD', 'EUR', 'USD', 'GBP', 'CAD', 'CHF', 'AED', 'SAR', 'DZD', 'TND'];
    try { if (Intl.supportedValuesOf) codes = Intl.supportedValuesOf('currency'); } catch (e) {}
    return codes.map(function (c) { return { code: c, name: currencyName(c) }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'en'); });
  }
  function allZones() {
    var z = [PROTO.timeZone, 'Europe/Paris', 'Europe/Brussels', 'Europe/London', 'America/New_York', 'UTC'];
    try { if (Intl.supportedValuesOf) z = Intl.supportedValuesOf('timeZone'); } catch (e) {}
    if (z.indexOf(browserTz()) < 0) z = z.concat([browserTz()]);
    return z;
  }
  function city(tz) { return String(tz || '').split('/').pop().replace(/_/g, ' '); }
  function tzLine(tz) { return tz === browserTz() ? fmt(C.start.tzValue, { city: esc(city(tz)) }) : esc(city(tz)); }
  function tzOptions(sel) {
    var groups = {}, order = [];
    allZones().forEach(function (z) {
      var i = z.indexOf('/'), g = i < 0 ? 'UTC' : z.slice(0, i), t = i < 0 ? z : z.slice(i + 1).replace(/_/g, ' ').replace(/\//g, ' / ');
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push('<option value="' + esc(z) + '"' + (z === sel ? ' selected' : '') + '>' + esc(t) + '</option>');
    });
    return order.map(function (g) { return '<optgroup label="' + esc(g) + '">' + groups[g].join('') + '</optgroup>'; }).join('');
  }
  // UUID v7, generated once per form session so a retry is an idempotent replay (§5, F7.1).
  function uuid7() {
    var b = new Uint8Array(16), t = Date.now(), i, h = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (i = 0; i < 6; i++) b[i] = Math.floor(t / Math.pow(2, 8 * (5 - i))) % 256;
    b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
    for (i = 0; i < 16; i++) h += (b[i] < 16 ? '0' : '') + b[i].toString(16) + (i === 3 || i === 5 || i === 7 || i === 9 ? '-' : '');
    return h;
  }
  function selectField(id, label, options, attrs) {
    return '<div class="fgroup" data-for="' + id + '"><label class="field-label" for="' + id + '">' + label + '</label>' +
      '<div class="field field-select"><select id="' + id + '" name="' + id + '" autocomplete="off" ' + (attrs || '') + '>' + options + '</select></div>' +
      '<p class="err" id="' + id + '-err" hidden></p></div>';
  }

  // Typed values survive the cross-link to Join and back (§6.7.6): memory only, never persisted.
  var startDraft = null;
  A.view('setup/start', {
    states: ['idle', 'invalid', 'other-currency', 'timezone-change', 'submitting', 'already-in-space', 'offline',
      'network-error', 'server-error', 'long-name'],
    mount: function (el, ctx) {
      var st = A.state, fx = fixture(ctx);
      if (st === 'already-in-space') return hold(el, { what: P.already, notice: C.alreadyIn, links: [HOME] });
      var me = SARA, i = A.initial(me.firstName);
      if (fx || !startDraft) startDraft = { id: uuid7(), name: C.start.nameDefault, currency: currencyShortlist()[0], other: '', tz: browserTz(), tzOpen: false };
      var d = startDraft;
      if (fx && st === 'long-name') d.name = 'Our space for the flat in Rabat, the summer in Chefchaouen and everything else we save for';
      if (fx && st === 'invalid') { d.name = ''; d.currency = 'other'; }
      if (fx && st === 'other-currency') d.currency = 'other';
      if (fx && st === 'timezone-change') d.tzOpen = true;

      A.title(C.start.title);
      A.header({ account: { firstName: me.firstName }, back: { href: '#/setup', label: C.back } });
      A.footnote(C.example);

      var list = currencyShortlist();
      var radios = list.map(function (c) {
        return '<label class="radio"><input type="radio" name="currency" value="' + c + '"' + (d.currency === c ? ' checked' : '') + '><span>' + currencyLabel(c) + '</span></label>';
      }).join('') + '<label class="radio"><input type="radio" name="currency" value="other" aria-controls="currency-pick"' + (d.currency === 'other' ? ' checked' : '') + '><span>' + esc(C.start.other) + '</span></label>';
      var curOpts = '<option value=""></option>' + allCurrencies().map(function (c) {
        return '<option value="' + c.code + '"' + (d.other === c.code ? ' selected' : '') + '>' + currencyLabel(c.code) + '</option>';
      }).join('');

      el.innerHTML = head(C.start.h1, A.pair(A.seat({ role: 'a', initial: i }), A.seat({ role: 'empty' }))) +
        '<div id="start-conn"></div>' +
        '<form id="start" class="auth-form" novalidate>' + alertSlot('start') +
          A.field({ id: 'space-name', name: 'name', label: C.start.name, value: d.name, help: C.start.nameHelp, autocomplete: 'off',
            attrs: 'required autocapitalize="sentences" enterkeyhint="next"' }) +
          '<fieldset class="fgroup radio-group" aria-describedby="currency-help"><legend class="field-label">' + C.start.currency + '</legend>' +
            '<div class="radios">' + radios + '</div>' +
            '<div class="currency-pick" id="currency-pick"' + (d.currency === 'other' ? '' : ' hidden') + '>' +
              selectField('currency-other', C.start.otherSelect, curOpts, 'required') + '</div>' +
            '<p class="help" id="currency-help">' + C.start.currencyHelp + '</p>' +
          '</fieldset>' +
          '<div class="fgroup tz">' +
            '<p class="field-label" id="tz-label">' + C.start.tz + '</p>' +
            '<div class="tz-row"><p class="tz-value" id="tz-value">' + tzLine(d.tz) + '</p>' +
              '<button class="link-btn disclosure" type="button" id="tz-toggle" aria-expanded="' + d.tzOpen + '" aria-controls="tz-pick" aria-label="' + C.start.tzChangeLabel + '" aria-describedby="tz-label tz-value">' +
              C.start.tzChange + A.icon('chevron-down') + '</button></div>' +
            '<div class="tz-pick" id="tz-pick"' + (d.tzOpen ? '' : ' hidden') + '>' + selectField('tz', C.start.tzSelect, tzOptions(d.tz), 'required') + '</div>' +
          '</div>' +
          '<button class="btn-primary btn-block" type="submit">' + C.start.submit + '</button>' +
        '</form>' +
        '<div class="alt-links"><p>' + rich(C.start.wrongPath, 'link', '<a class="link-btn" href="#/setup/join" data-replace>') + '</p></div>';

      var form = $('#start'), name = $('#space-name'), btn = $('[type=submit]', form), pick = $('#currency-pick'),
          other = $('#currency-other'), tzT = $('#tz-toggle'), tzP = $('#tz-pick'), tz = $('#tz'), h1 = $('h1', el);

      connection($('#start-conn'), 'start-offline', C.start.offline, C.start.online, btn);

      function vName(v) { v = v.trim(); return !v ? C.start.nameEmpty : Array.from(v).length > 120 ? C.start.nameLong : ''; }
      function checked() { var r = form.querySelector('input[name=currency]:checked'); return r ? r.value : ''; }
      name.addEventListener('input', function () { d.name = name.value; });
      // Choosing "Another currency…" reveals the select without moving focus: it's the next Tab stop, and a focus
      // jump while arrowing through a radio group is a change of context [WCAG 3.2.2] (deviation from §6.2, noted).
      form.addEventListener('change', function (e) {
        if (e.target.name === 'currency') {
          d.currency = e.target.value;
          pick.hidden = d.currency !== 'other';
          if (pick.hidden) A.clearError(other);
        } else if (e.target === other) {
          d.other = other.value; if (other.value) A.clearError(other);
        } else if (e.target === tz) {
          d.tz = tz.value; $('#tz-value').innerHTML = tzLine(d.tz); if (tz.value) A.clearError(tz);
        }
      });
      tzT.addEventListener('click', function () {
        d.tzOpen = tzT.getAttribute('aria-expanded') !== 'true';
        tzT.setAttribute('aria-expanded', String(d.tzOpen)); tzP.hidden = !d.tzOpen;
        if (d.tzOpen) tz.focus(); // disclosure opens: the revealed select (§6.1); closes: focus stays on the toggle
      });

      function send() {
        A.formAlert(form, '');
        A.pending(btn, C.start.submitting);
        var r = { id: d.id, name: d.name.trim(), currency: d.currency === 'other' ? d.other : d.currency, timezone: d.tz };
        A.fake(st === 'submitting' && fx && !send.ran ? 'hang' : r, PROTO.latency).then(function () {
          // Sara's seat is already majorelle and the dashed one stays dashed: Home first-run takes over (no motion here).
          A.carry.clear('intent');
          location.replace(A.handoff('first-run'));
        });
        send.ran = true;
      }
      function failed(code) {
        A.formAlert(form, esc(code === 'network-error' ? C.start.network : C.server)); // input kept, same id on retry
      }

      A.wireForm(form, {
        validate: function (inp) { return inp === name ? vName(inp.value) : ''; },
        onSubmit: function () {
          A.formAlert(form, '');
          var bad = [], m = vName(name.value);
          if (m) { A.setError(name, m); bad.push(name); } else A.clearError(name);
          if (checked() === 'other' && !other.value) { A.setError(other, C.start.currencyEmpty); bad.push(other); }
          if (!tz.value) { tzT.setAttribute('aria-expanded', 'true'); tzP.hidden = false; A.setError(tz, C.start.tzEmpty); bad.push(tz); }
          if (bad.length) { A.countAlert(form, bad.length); A.focus(bad[0]); return; }
          send();
        }
      });
      // If the browser gave no time zone, the select shows open and required (F7 invalid).
      if (!d.tz) { tzT.setAttribute('aria-expanded', 'true'); tzP.hidden = false; }

      // ---- fixtures ----
      if (fx && st === 'invalid') { form.requestSubmit ? form.requestSubmit(btn) : form.dispatchEvent(new Event('submit', { cancelable: true })); return; }
      if (fx && st === 'submitting') { send(); return; }
      if (fx && (st === 'network-error' || st === 'server-error')) { failed(st); land(ctx, 'idle', btn); return; }
      if (fx && st === 'timezone-change') { tz.focus(); return; }
      land(ctx, 'idle', h1);
    }
  });

  // ---------- Join with a code (F8, wireframe 5.7) and the switch (F9) ----------
  var joinTries = []; // request times, for the prototype's 5/min limit
  function joinRequest(code) {
    var now = Date.now();
    joinTries = joinTries.filter(function (t) { return now - t < 60000; });
    if (joinTries.length >= PROTO.rateMax) return A.fake({ error: 'rate_limited' }, PROTO.latency);
    joinTries.push(now);
    return A.fake(code === A.EX.code ? { partnerName: SARA.firstName } : { error: 'invite_invalid' }, PROTO.latency);
  }
  function soloSummary() {
    var c = A.EX.soloSpace, parts = [];
    if (c.goals) parts.push(plural(c.goals, C.sw.goals));
    if (c.trips) parts.push(plural(c.trips, C.sw.trips));
    if (c.items) parts.push(plural(c.items, C.sw.items));
    if (!parts.length) return C.sw.bodyEmpty;
    var list = parts.join(', ');
    try { list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(parts); } catch (e) {}
    return fmt(C.sw.bodyWith, { summary: list });
  }
  var WRONG = 'H3RT-9WCN'; // well-formed, not Sara's: invite_invalid

  A.view('setup/join', {
    states: ['idle', 'prefilled', 'restored', 'invalid', 'invalid-letters', 'invite-invalid', 'submitting', 'rate-limited',
      'already-in-space', 'offline', 'network-error', 'server-error', 'switch', 'switch-confirm'],
    ownsFocus: true,
    mount: function (el, ctx) {
      var st = A.state, fx = fixture(ctx), sw = st === 'switch' || st === 'switch-confirm';
      if (st === 'already-in-space') return hold(el, { what: P.already, notice: C.alreadyIn, links: [HOME] });
      var me = YOUSSEF, mi = A.initial(me.firstName);

      // The value: a fixture's, else the pending invite code (prefilled), else the draft kept across a reload (restored).
      var pendingCode = A.normCode(A.carry.get('code')), draft = A.carry.get('joinDraft'), value = '', prefilled = false;
      var FIX = { invalid: 'K7QM-4XP', 'invalid-letters': 'K7QM-4XP0', 'invite-invalid': WRONG, 'rate-limited': WRONG,
        submitting: EXAMPLE, 'network-error': EXAMPLE, 'server-error': EXAMPLE, 'switch-confirm': EXAMPLE };
      if (fx && FIX[st]) value = FIX[st];
      else if (st === 'prefilled') { value = pendingCode.ok ? pendingCode.display : EXAMPLE; prefilled = true; }
      else if (fx && st === 'restored') value = draft || 'K7QM 4X';
      else if (pendingCode.ok) { value = pendingCode.display; prefilled = true; }
      else if (draft) value = draft;
      // "Signed up as" shows when the person arrived straight from Create account with the A5 intent.
      var fromSignUp = !sw && A.carry.get('intent') === 'join';

      A.title(sw ? C.sw.title : C.join.title);
      // Switch mode comes from Home's invite card, so Back returns there (copy gap: "Back to Home", noted).
      A.header({ account: { firstName: me.firstName },
        back: sw ? { href: A.handoff('first-run'), label: 'Back to Home' } : { href: '#/setup', label: C.back } });
      A.footnote(C.example);

      // Join: (taken majorelle)(Y terracotta), the waiting seat is Sara's. Switch: Y's own solo seat, unchanged until confirmed.
      var pair = sw ? A.pair(A.seat({ role: 'a', initial: mi }), A.seat({ role: 'empty' }), 'seat-pair--vt')
                    : A.pair(A.seat({ role: 'taken' }), A.seat({ role: 'b', initial: mi }), 'seat-pair--vt');
      el.innerHTML = head(sw ? C.sw.h1 : C.join.h1, pair) +
        '<p class="lede">' + fmt(C.join.intro, { example: codeHtml(EXAMPLE) }) + '</p>' +
        '<div id="join-conn"></div>' +
        '<form id="join" class="auth-form" novalidate>' + alertSlot('join') +
          A.field({ id: 'invite-code', name: 'code', label: C.join.code, value: value, help: C.join.codeHelp, code: true, autocomplete: 'off',
            attrs: 'required autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" enterkeyhint="go" dir="ltr"' }) +
          '<button class="btn-primary btn-block" type="submit">' + C.join.submit + '</button>' +
        '</form>' +
        (sw ? '' : '<div class="alt-links"><p>' + rich(C.join.startInstead, 'link', '<a class="link-btn" href="#/setup/start" data-replace>') + '</p></div>') +
        (fromSignUp ? '<p class="signed-up">' + signedUpAs(me.email) + '</p>' : '');

      var form = $('#join'), input = $('#invite-code'), btn = $('[type=submit]', form);
      connection($('#join-conn'), 'join-offline', C.join.offline, C.join.online, btn);

      function shapeMsg(n) { return n.reason === 'letters' ? C.join.letters : fmt(C.join.length, { example: EXAMPLE }); }
      function showBack() { var n = A.normCode(input.value); if (n.ok && input.value !== n.display) { input.value = n.display; A.carry.set('joinDraft', n.display); } }
      // Normalised on blur and on paste, never while typing (§6.6.5): the caret and IMEs stay undisturbed.
      input.addEventListener('blur', showBack);
      input.addEventListener('paste', function () { setTimeout(showBack, 0); });
      input.addEventListener('input', function () {
        A.carry.set('joinDraft', input.value); // survives the trip to the chat app (F8.2)
        if (input.dataset.server) { delete input.dataset.server; A.clearError(input); } // a server answer is stale once edited
      });

      function codeFailed(err) {
        A.idle(btn);
        if (err.error === 'invite_invalid') {
          A.setError(input, sw ? C.sw.invalid : C.join.invalid, { announce: true });
          input.dataset.server = '1';
          A.focus(input); input.select(); // value kept and selected, so it can be retyped
        } else if (err.error === 'rate_limited') {
          A.formAlert(form, esc(C.rateLimited));
          A.rateLimit(btn, PROTO.retryAfter, function () { if (form.isConnected) A.formAlert(form, ''); if (A.offline) A.disable(btn, 'join-offline-msg'); });
          btn.setAttribute('aria-describedby', 'join-alert-msg');
        } else if (err.error === 'network') A.formAlert(form, esc(C.join.network));
        else A.formAlert(form, esc(C.server));
      }
      function send(code) {
        A.formAlert(form, '');
        A.pending(btn, C.join.submitting);
        var p = fx && st === 'submitting' && !send.ran ? A.fake('hang') : joinRequest(code);
        send.ran = true;
        p.then(function (r) { fillSeat(el, r.partnerName, me, false); }, codeFailed);
      }

      // F9: the shared alertdialog, safe button first and focused. While the request runs the dialog stays open with
      // "Joining…" on the danger button (A.confirm closes on press, so its buttons are driven here; noted for the Director).
      function confirmSwitch(code) {
        var dlg = $('#confirm'), ok = $('#confirm-ok'), keep = $('#confirm-cancel');
        A.confirm({ title: C.sw.dialogTitle, body: '<p>' + esc(soloSummary()) + '</p>', ok: C.sw.confirm, cancel: C.sw.keep });
        ok.onclick = function () {
          if (ok.dataset.busy) return;
          A.pending(ok, C.sw.confirming);
          keep.setAttribute('aria-disabled', 'true');
          var keepClick = keep.onclick; keep.onclick = function () {};
          function noEsc(e) { e.preventDefault(); }
          dlg.addEventListener('cancel', noEsc);
          function reset() { dlg.removeEventListener('cancel', noEsc); A.idle(ok); delete ok.dataset.label; keep.removeAttribute('aria-disabled'); keep.onclick = keepClick; }
          joinRequest(code).then(function (r) {
            reset(); dlg.close();
            A.pending(btn, C.join.submitting);
            // the seat fills once the sheet's exit (and its backdrop) is gone, so the moment isn't dimmed
            later(function () { fillSeat(el, r.partnerName, me, true); }, reduced() ? 0 : ms('--dur-sheet'));
          }, function (err) {
            reset();
            // runs after the shared close handler has returned focus to the opener
            dlg.addEventListener('close', function () { codeFailed(err); }, { once: true });
            dlg.close();
          });
        };
      }

      A.wireForm(form, {
        validate: function (i) { if (i !== input) return ''; var n = A.normCode(i.value); return n.ok || n.reason === 'empty' ? '' : shapeMsg(n); },
        onSubmit: function () {
          var n = A.normCode(input.value);
          if (!n.ok) { A.setError(input, shapeMsg(n)); A.focus(input); return; } // inline, nothing sent, not counted
          input.value = n.display; A.carry.set('joinDraft', n.display);
          A.formAlert(form, '');
          if (sw) return confirmSwitch(n.code);
          send(n.code);
        }
      });

      // ---- fixtures and arrival focus (§6.1: the field; with a prefilled code, Join space) ----
      if (fx && (st === 'invalid' || st === 'invalid-letters')) { A.setError(input, shapeMsg(A.normCode(value))); A.focus(input); return; }
      if (fx && st === 'invite-invalid') { codeFailed({ error: 'invite_invalid' }); return; }
      if (fx && st === 'rate-limited') { codeFailed({ error: 'rate_limited' }); A.focus(btn); return; }
      if (fx && (st === 'network-error' || st === 'server-error')) { codeFailed({ error: st === 'network-error' ? 'network' : 'server' }); A.focus(btn); return; }
      if (fx && st === 'submitting') { send(A.normCode(value).code); A.focus(btn); return; }
      if (fx && st === 'switch-confirm') { btn.focus(); confirmSwitch(A.normCode(value).code); return; }
      land(ctx, 'idle', prefilled ? btn : input);
    }
  });

  // ---------- Invite link resolver (F10) ----------
  // The real link is /join#code=K7QM-4XPA. Here #/join?code=… stands in; without one, the example code is used.
  A.view('join', {
    states: ['signed-out', 'no-space', 'member'],
    mount: function (el) {
      var st = A.state, h = location.hash, q = h.indexOf('?');
      var raw = q >= 0 ? new URLSearchParams(h.slice(q + 1)).get('code') : EXAMPLE;
      var n = A.normCode(raw);
      if (n.ok) A.carry.set('code', n.display); // kept on this device; a malformed fragment is ignored, no error
      history.replaceState(history.state, '', location.pathname + location.search + '#/join'); // strip the code
      if (st === 'member') {
        A.carry.clear('code'); // a full space: the code is dropped
        return hold(el, { title: C.invite.title, what: P.inviteMember, notice: fmt(C.invite.withPartner, { partnerName: SARA.firstName }),
          after: P.inviteSolo, links: [HOME, { text: P.openHomeSolo, href: A.handoff('first-run') }] });
      }
      splash(el, { title: C.invite.title, label: C.invite.status, status: C.invite.status });
      A.fake(true, PROTO.latency).then(function () {
        if (st === 'signed-out') A.go('#/create-account', { replace: true, state: n.ok ? 'with-code' : '' });
        else A.go('#/setup/join', { replace: true, state: n.ok ? 'prefilled' : '' });
      });
    }
  });

  // ---------- Launch (§2.1, F11, wireframe 5.8) ----------
  A.view('launch', {
    states: ['loading', 'signed-out', 'no-space', 'member', 'cached-offline', 'offline', 'error'],
    mount: function (el, ctx) {
      var st = A.state;
      if (st === 'member') return hold(el, { what: P.member, links: [HOME] });
      if (st === 'cached-offline') return hold(el, { what: P.cached, links: [{ text: P.openHome, href: '../home/home.html?state=offline' }] });
      if (st === 'offline' || st === 'error') return launchMessage(el, ctx, st);
      splash(el);
      if (st === 'loading') return; // GET /api/me still pending: the mark, then "Loading Zamane" after 1 s
      A.fake(true, PROTO.latency).then(function () {
        if (st === 'signed-out') return A.go('#/sign-in', { replace: true });
        // no-space: setup, or straight to Join with the A5 intent or a pending code (§2.1)
        var code = A.normCode(A.carry.get('code')).ok;
        if (code || A.carry.get('intent') === 'join') A.go('#/setup/join', { replace: true, state: code ? 'prefilled' : '' });
        else A.go('#/setup', { replace: true });
      });
    }
  });
  function launchMessage(el, ctx, st) {
    var off = st === 'offline';
    A.title(off ? C.launch.offlineTitle : C.launch.errorTitle);
    A.header({});
    A.footnote('');
    el.innerHTML = '<div class="launch-msg">' + head(off ? C.launch.offlineH1 : C.launch.errorH1) +
      '<p class="lede">' + esc(off ? C.launch.offlineBody : C.launch.errorBody) + '</p>' +
      '<button class="btn-primary btn-block" type="button" id="launch-retry">' + C.launch.retry + '</button>' +
      (off && EXPLICIT ? protoOnline() : '') + '</div>';
    var btn = $('#launch-retry');
    // Prototype: a retry that reaches the server finds no session on this phone, so it opens Sign in.
    function retry() {
      if (btn.dataset.busy) return;
      A.pending(btn, C.launch.retrying);
      A.fake(true, PROTO.latency).then(function () {
        if (navigator.onLine === false) { A.idle(btn); return; } // still no connection
        A.go('#/sign-in', { replace: true });
      });
    }
    btn.addEventListener('click', retry);
    var po = $('.js-online', el);
    if (po) po.addEventListener('click', function () { A.simulateOnline(); });
    if (off) A.onConnection(function (o) { if (!o) { A.say(C.launch.online); if (po) po.parentNode.remove(); btn.focus(); retry(); } });
    land(ctx, 'loading', $('h1', el));
  }
})();
