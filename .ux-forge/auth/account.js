/* Zamane auth prototype: the signed-out account screens. Direction C · Two seats.
   Routes and their ?state= keys (ia.md §4; the default first):
     #/sign-in          idle · prefilled · invalid · wrong · submitting · rate-limited · offline · network-error ·
                        server-error · signed-out · session-ended · reset-done · guard-member · guard-no-space
     #/create-account   idle · has-code · invalid · email-taken · submitting · rate-limited · offline ·
                        network-error · server-error · with-code
     #/forgot-password  idle · prefilled · invalid · submitting · sent · resent · rate-limited · offline ·
                        network-error · server-error
     #/reset-password   valid · invalid · submitting · success · expired · used · expired-on-submit · signed-in ·
                        rate-limited · offline · network-error · server-error
     #/privacy          placeholder for the privacy link (decision.md: the page has no owner yet)
   Prototype rules: any password of 10+ characters works, except "wrong-password-1" (Sign in: wrong).
   A fixture shows its state on first load; after that the screen behaves normally, so a retry works.
   "offline" lifts on the window "online" event (DevTools, or A.simulateOnline() in the console).
   Uses window.A from auth-shared.js only; strings are copy.md's, verbatim. */
(function () {
  'use strict';
  var $ = A.$;

  // ---------- copy.md (binding) ----------
  var C = {
    example: 'Example data. The names, email addresses and code on this screen are made up.',
    email: 'Email', password: 'Password', newPassword: 'New password', firstName: 'First name',
    rule: 'At least 10 characters.', caps: 'Caps Lock is on',
    err: {
      emailEmpty: 'Enter your email address.',
      emailFormat: 'Check your email address. It should look like name@example.com.',
      pwEmpty: 'Enter your password.',
      newPwEmpty: 'Choose a password with at least 10 characters.',
      pwShort: 'Use at least 10 characters.',
      pwLong: 'Use 128 characters or fewer.',
      nameEmpty: 'Enter your first name.',
      nameLong: 'Use 120 characters or fewer.'
    },
    rateLimited: 'Too many tries. Wait a minute, then try again.',
    network: 'Couldn\'t reach Zamane. Check your connection and try again.',
    server: 'Something went wrong on our side. Try again in a moment.',
    signIn: {
      title: 'Sign in', h1: 'Sign in', forgot: 'Forgot password?', submit: 'Sign in', submitting: 'Signing in…',
      newHere: 'New to Zamane? <a class="btn-sec btn-block new-here-link" href="#/create-account">Create an account</a>',
      wrong: 'That email and password don\'t match. Check them and try again, or <a href="#/forgot-password">reset your password</a>.',
      offline: 'You\'re offline. Signing in needs a connection.',
      online: 'Back online. You can sign in now.',
      signedOut: 'You\'re signed out.',
      sessionEnded: 'You\'ve been signed out. Sign in again to carry on.',
      resetDone: 'Password changed. Sign in with your new password.',
      guard: 'Taking you there…'
    },
    create: {
      title: 'Create your account', h1: 'Create your account', nameHelp: 'As your partner will see it.',
      submit: 'Create account', submitting: 'Creating your account…',
      codeOff: 'Have a code from your partner?',
      codeOn: 'You\'ll enter your partner\'s code next. <span class="intent-undo">Undo</span>',
      codeOnSay: 'You\'ll enter your partner\'s code next.',
      hasAccount: 'Have an account? <a class="link-btn" href="#/sign-in">Sign in</a>',
      privacy: 'We use your name and email to run your account. <a href="#/privacy">Read how we handle your data</a>',
      withCode: 'Create your account, then you\'ll join with code <span class="nowrap" dir="ltr">{code}</span>.',
      taken: 'That email already has an account.',
      takenLinks: '<a href="#/sign-in">Sign in instead</a> or <a href="#/forgot-password">reset your password</a>.',
      offline: 'You\'re offline. Creating an account needs a connection.',
      online: 'Back online. You can create your account now.'
    },
    forgot: {
      title: 'Reset your password', h1: 'Reset your password', back: 'Back to sign in',
      intro: 'We\'ll email you a link to set a new one.', submit: 'Send reset link', submitting: 'Sending…',
      offline: 'You\'re offline. Sending a link needs a connection.',
      online: 'Back online. You can send the link now.'
    },
    sent: {
      title: 'Check your email', h1: 'Check your email',
      body: 'If there\'s a Zamane account for <b class="email-addr" dir="ltr">{email}</b>, we\'ve sent a link to reset your password. It works once, for 1 hour.',
      nothing: 'Nothing yet? Check your spam folder, or send it again.',
      resend: 'Send again', resending: 'Sending…', resent: 'Sent again.',
      different: 'Use a different email', back: 'Back to sign in'
    },
    reset: {
      title: 'Set a new password', h1: 'Set a new password',
      signedIn: 'You\'re signed in as {firstName} here. Setting a new password signs you out here too.',
      note: 'This signs you out on your other devices.', submit: 'Set new password', submitting: 'Saving…',
      offline: 'You\'re offline. Saving a new password needs a connection.',
      online: 'Back online. You can save your password now.'
    },
    invalid: {
      title: 'Link doesn\'t work', h1: 'This link doesn\'t work any more',
      body: 'Reset links work once, for 1 hour. Ask for a new one.', primary: 'Send a new link', back: 'Back to sign in',
      announce: 'This link doesn\'t work any more.'
    },
    done: {
      title: 'Password changed', h1: 'Password changed', body: 'Sign in to Zamane with your new password.',
      primary: 'Sign in', others: 'You\'ve been signed out on your other devices.',
      homeScreen: 'Use Zamane from your home screen? Open it there and sign in.'
    }
  };

  // ---------- example data for fixtures (labelled by the footnote) ----------
  var GOOD_PW = 'olive-tree-2026';
  var SARA = A.EX.sara;

  // A fixture is an explicit ?state= on the first load. Without one, a reload keeps the carried email (F3).
  var EXPLICIT = !!new URLSearchParams(location.search).get('state');
  function fixture(ctx) { return ctx.first && EXPLICIT; }
  // §6.1: the first load moves nothing; an in-app arrival (or a fixture showing a non-default state) applies the rule.
  function land(ctx, def, el) { if (!ctx.first || (fixture(ctx) && A.state !== def)) A.focus(el); }

  // ---------- validation (copy.md shared field errors) ----------
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function len(v) { return Array.from(v).length; }
  function vEmail(v) { v = A.normEmail(v); return !v ? C.err.emailEmpty : EMAIL_RE.test(v) ? '' : C.err.emailFormat; }
  function vCurrentPw(v) { return v ? '' : C.err.pwEmpty; }
  function vNewPw(v) { return !v ? C.err.newPwEmpty : len(v) < 10 ? C.err.pwShort : len(v) > 128 ? C.err.pwLong : ''; }
  function vName(v) { v = v.trim(); return !v ? C.err.nameEmpty : len(v) > 120 ? C.err.nameLong : ''; }

  // Submit-time check: every field, inline errors, the count alert at 2+, focus on the first invalid field.
  function check(form, inputs, validate) {
    A.formAlert(form, '');
    var bad = [];
    inputs.forEach(function (i) { var m = validate(i); if (m) { A.setError(i, m); bad.push(i); } else A.clearError(i); });
    if (bad.length) { A.countAlert(form, bad.length); A.focus(bad[0]); }
    return !bad.length;
  }

  // ---------- markup helpers ----------
  function head(text, cls) { return '<div class="page-head' + (cls ? ' ' + cls : '') + '"><h1 class="title-lg">' + text + '</h1></div>'; }
  function alertSlot(id) { return '<div class="form-alert" id="' + id + '-alert" role="alert"></div>'; }
  function note(id, text, icon, hidden) {
    return '<div class="notice page-notice" id="' + id + '"' + (hidden ? ' hidden' : '') + '>' + A.icon(icon) + '<p id="' + id + '-msg">' + text + '</p></div>';
  }
  function offlineNote(id, text) { return note(id + '-offline', text, 'wifi-off', !A.offline); }
  function primary(label) { return '<button class="btn-primary btn-block" type="submit">' + label + '</button>'; }
  function caps(id) { return '<p class="help caps" id="' + id + '-caps" hidden>' + C.caps + '</p>'; }
  function emailField(id, ac, hint) {
    return A.field({ id: id, name: 'email', label: C.email, type: 'email', autocomplete: ac,
      attrs: 'required autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="' + hint + '" dir="ltr"' });
  }
  function pwField(id, o) {
    var neu = o.ac === 'new-password';
    return A.field({ id: id, name: o.name || 'password', label: o.label, type: 'password', autocomplete: o.ac, password: true,
      help: neu ? C.rule : '',
      attrs: 'required enterkeyhint="go" dir="ltr" autocapitalize="none" spellcheck="false"' +
        (neu ? ' passwordrules="minlength: 10; maxlength: 128;"' : '') +
        ' data-extra="' + id + '-caps' + (o.extra ? ' ' + o.extra : '') + '"',
      after: caps(id) + (o.after || '') });
  }

  // Caps Lock hint (§6.6): shown while on, joined to the field's description, never announced per key.
  function wireCaps(input) {
    var line = $('#' + input.id + '-caps');
    function upd(e) {
      if (!e.getModifierState) return;
      var on = e.getModifierState('CapsLock');
      if (line.hidden !== on) return;
      line.hidden = !on; A.describe(input);
    }
    input.addEventListener('keydown', upd); input.addEventListener('keyup', upd);
    input.addEventListener('blur', function () { if (!line.hidden) { line.hidden = true; A.describe(input); } });
  }

  // The email travels between Sign in, Create account and Forgot (3.3.7): kept on input, never in the URL.
  function carryEmail(input) {
    input.addEventListener('input', function () { A.carry.set('email', A.normEmail(input.value)); });
  }
  function fill(input, v) { input.value = v; if (input.type === 'email') A.carry.set('email', A.normEmail(v)); }

  // Offline (F1): a notice above the form, the primary aria-disabled and described by it; once back online,
  // the primary re-enables and the screen's own sentence is announced once.
  function wireOffline(btn, noticeEl, offText, onText) {
    var msgId = noticeEl.id + '-msg';
    function apply(off, say) {
      if (!noticeEl.isConnected || !btn.isConnected) return;
      noticeEl.hidden = !off;
      if (off) A.disable(btn, msgId); else A.enable(btn);
      if (say) A.say(off ? offText : onText);
    }
    apply(A.offline, false);
    return apply;
  }

  // Form-level failures share the alert slot (§6.3). Focus stays where it is.
  function fail(form, btn, code, offlineId) {
    if (code === 'rate-limited') {
      A.formAlert(form, C.rateLimited);
      A.rateLimit(btn, 60000, function () {
        if (form.isConnected) A.formAlert(form, '');
        if (A.offline && offlineId) A.disable(btn, offlineId);
      });
      btn.setAttribute('aria-describedby', form.id + '-alert-msg'); // the wait is the reason; pressing says it again
    } else if (code === 'network-error') A.formAlert(form, C.network);
    else if (code === 'server-error') A.formAlert(form, C.server);
  }
  var FAILS = ['rate-limited', 'network-error', 'server-error'];

  // ---------- Sign in (F1, wireframe 5.1) ----------
  A.view('sign-in', {
    states: ['idle', 'prefilled', 'invalid', 'wrong', 'submitting', 'rate-limited', 'offline', 'network-error', 'server-error',
      'signed-out', 'session-ended', 'reset-done', 'guard-member', 'guard-no-space'],
    ownsFocus: true,
    mount: function (el, ctx) {
      var st = A.state;
      A.title(C.signIn.title); A.header({}); A.footnote(C.example);

      if (st === 'guard-member' || st === 'guard-no-space') {
        // Prototype only: production replaces silently (ia.md §2.1).
        el.innerHTML = '<h1 class="vh">' + C.signIn.h1 + '</h1><p class="guard">' + C.signIn.guard + '</p>';
        var t = setTimeout(function () {
          if (st === 'guard-member') location.replace(A.handoff('home'));
          else A.go('#/setup', { replace: true });
        }, 1500);
        A.onCleanup(function () { clearTimeout(t); });
        return;
      }

      var notices = st === 'signed-out' ? note('si-note', C.signIn.signedOut, 'info')
        : st === 'session-ended' ? note('si-note', C.signIn.sessionEnded, 'info')
        : st === 'reset-done' ? note('si-note', C.signIn.resetDone, 'check') : '';
      el.innerHTML = head(C.signIn.h1) + notices + offlineNote('si', C.signIn.offline) +
        '<form id="si" class="auth-form" novalidate>' + alertSlot('si') +
        emailField('si-email', 'username', 'next') +
        pwField('si-pw', { label: C.password, ac: 'current-password',
          after: '<p class="forgot-row"><a class="link-btn" href="#/forgot-password">' + C.signIn.forgot + '</a></p>' }) +
        primary(C.signIn.submit) + '</form>' +
        '<div class="alt-links new-here-wrap"><p class="new-here">' + C.signIn.newHere + '</p></div>';

      var form = $('#si'), email = $('#si-email'), pw = $('#si-pw'), btn = $('[type=submit]', form), h1 = $('h1', el);
      carryEmail(email); wireCaps(pw);
      var conn = wireOffline(btn, $('#si-offline'), C.signIn.offline, C.signIn.online);
      A.onConnection(function (off) { conn(off, true); });

      function validate(i) { return i === email ? vEmail(i.value) : vCurrentPw(i.value); }
      function wrong() {
        A.formAlert(form, C.signIn.wrong, { field: pw });
        A.focus(pw); pw.select(); // typing replaces it (F1)
      }
      A.wireForm(form, {
        validate: validate,
        onSubmit: function () {
          if (!check(form, [email, pw], validate)) return;
          email.value = A.normEmail(email.value); A.carry.set('email', email.value);
          A.pending(btn, C.signIn.submitting);
          var bad = pw.value === A.EX.wrongPassword || len(pw.value) < 10;
          A.fake(bad ? { error: 'wrong' } : { ok: true }).then(function () {
            A.carry.clear('email'); // §6.7.2: cleared on a successful sign-in
            if (st === 'session-ended') { location.replace(A.handoff('home')); return; } // back to where they were
            var join = A.carry.get('intent') === 'join' || !!A.carry.get('code');
            A.go(join ? '#/setup/join' : '#/setup', { replace: true });
          }, function (r) { A.idle(btn); if (r.error === 'wrong') wrong(); else fail(form, btn, r.error, 'si-offline-msg'); });
        }
      });

      // ----- state -----
      var fx = fixture(ctx), carried = A.carry.get('email');
      if (fx) {
        A.carry.clear('email');
        if (st === 'prefilled') fill(email, SARA.email);
        if (st === 'invalid') { fill(email, 'sara@example'); return check(form, [email, pw], validate); }
        if (st === 'wrong') { fill(email, SARA.email); pw.value = A.EX.wrongPassword; return wrong(); }
        if (st === 'submitting' || FAILS.indexOf(st) >= 0) { fill(email, SARA.email); pw.value = GOOD_PW; }
        if (st === 'submitting') { A.pending(btn, C.signIn.submitting); A.fake('hang'); return; }
        if (FAILS.indexOf(st) >= 0) { fail(form, btn, st, 'si-offline-msg'); return A.focus(btn); }
      } else if (carried && st !== 'signed-out' && st !== 'reset-done') {
        fill(email, carried); // arrived with the email carried (prefilled)
      }
      if (st === 'signed-out') A.say(C.signIn.signedOut);
      land(ctx, 'idle', email.value && st !== 'reset-done' && st !== 'session-ended' && st !== 'signed-out' ? pw : h1);
    }
  });

  // ---------- Create account (F2, wireframe 5.2; direction C: the 32 px seat beside First name) ----------
  A.view('create-account', {
    states: ['idle', 'has-code', 'invalid', 'email-taken', 'submitting', 'rate-limited', 'offline', 'network-error', 'server-error', 'with-code'],
    ownsFocus: true,
    mount: function (el, ctx) {
      var st = A.state, fx = fixture(ctx);
      A.title(C.create.title); A.header({}); A.footnote(C.example);
      if (fx) { A.carry.clear('email'); A.carry.clear('intent'); A.carry.clear('code'); }
      if (fx && st === 'has-code') A.carry.set('intent', 'join');
      if (fx && st === 'with-code') A.carry.set('code', A.EX.code);
      var code = A.normCode(A.carry.get('code'));

      el.innerHTML = head(C.create.h1) +
        (code.ok ? note('ca-code', C.create.withCode.replace('{code}', A.esc(code.display)), 'info') : '') +
        offlineNote('ca', C.create.offline) +
        '<form id="ca" class="auth-form" novalidate>' + alertSlot('ca') +
        A.field({ id: 'ca-name', name: 'name', label: C.firstName, type: 'text', autocomplete: 'given-name', help: C.create.nameHelp,
          labelExtra: '<span class="label-seat" id="ca-seat" aria-hidden="true">' + A.seat({ role: 'neutral', size: 'sm' }) + '</span>',
          attrs: 'required autocapitalize="words" enterkeyhint="next"' }) +
        emailField('ca-email', 'email', 'next') +
        pwField('ca-pw', { label: C.password, ac: 'new-password' }) +
        primary(C.create.submit) +
        (code.ok ? '' : '<button class="btn-sec btn-block intent" type="button" id="ca-intent"></button>') +
        '</form>' +
        '<div class="alt-links"><p>' + C.create.hasAccount + '</p></div>' +
        '<p class="fine">' + C.create.privacy + '</p>';

      var form = $('#ca'), name = $('#ca-name'), email = $('#ca-email'), pw = $('#ca-pw'), btn = $('[type=submit]', form);
      var seat = $('#ca-seat'), intent = $('#ca-intent'), h1 = $('h1', el);
      carryEmail(email); wireCaps(pw);
      var conn = wireOffline(btn, $('#ca-offline'), C.create.offline, C.create.online);
      A.onConnection(function (off) { conn(off, true); });

      // The seat shows your initial as you type: neutral (no role yet), dashed when empty, never a "?".
      function paintSeat() { seat.innerHTML = A.seat({ role: 'neutral', initial: A.initial(name.value), size: 'sm' }); }
      name.addEventListener('input', paintSeat);

      // A5: the label changes and the name follows it; no aria-pressed (decision.md, Director ruling).
      function paintIntent(say) {
        if (!intent) return;
        var on = A.carry.get('intent') === 'join';
        intent.classList.toggle('is-on', on);
        intent.innerHTML = on ? '<span>' + A.icon('check') + C.create.codeOn + '</span>' : C.create.codeOff;
        if (say) A.say(on ? C.create.codeOnSay : C.create.codeOff);
      }
      if (intent) intent.addEventListener('click', function () {
        if (A.carry.get('intent') === 'join') A.carry.clear('intent'); else A.carry.set('intent', 'join');
        paintIntent(true);
      });
      paintIntent(false);

      function validate(i) { return i === name ? vName(i.value) : i === email ? vEmail(i.value) : vNewPw(i.value); }
      function taken() {
        A.setError(email, C.create.taken, { html: C.create.takenLinks, announce: true });
        delete email.dataset.touched; // the server's answer stays until the email is edited, not cleared by a blur
        A.focus(email); email.select();
      }
      A.wireForm(form, {
        validate: validate,
        onSubmit: function () {
          if (!check(form, [name, email, pw], validate)) return;
          email.value = A.normEmail(email.value); A.carry.set('email', email.value); // A7
          name.value = name.value.trim(); paintSeat();
          A.pending(btn, C.create.submitting);
          A.fake({ ok: true }).then(function () {
            var join = A.carry.get('intent') === 'join' || !!A.carry.get('code');
            A.go(join ? '#/setup/join' : '#/setup', { replace: true });
          }, function (r) { A.idle(btn); fail(form, btn, r.error, 'ca-offline-msg'); });
        }
      });

      // ----- state -----
      if (fx) {
        if (st === 'invalid') { fill(email, 'sara@example'); pw.value = 'sesame'; return check(form, [name, email, pw], validate); }
        if (st === 'email-taken' || st === 'submitting' || FAILS.indexOf(st) >= 0) {
          fill(name, SARA.firstName); fill(email, SARA.email); pw.value = GOOD_PW; paintSeat();
        }
        if (st === 'email-taken') return taken();
        if (st === 'submitting') { A.pending(btn, C.create.submitting); A.fake('hang'); return; }
        if (FAILS.indexOf(st) >= 0) { fail(form, btn, st, 'ca-offline-msg'); return A.focus(btn); }
      } else {
        var carried = A.carry.get('email'); if (carried) fill(email, carried);
      }
      land(ctx, 'idle', h1);
    }
  });

  // ---------- Forgot password → Check your email (F3, wireframe 5.3) ----------
  A.view('forgot-password', {
    states: ['idle', 'prefilled', 'invalid', 'submitting', 'sent', 'resent', 'rate-limited', 'offline', 'network-error', 'server-error'],
    ownsFocus: true,
    mount: function (el, ctx) {
      var st = A.state, fx = fixture(ctx), conn = function () {};
      A.header({}); A.footnote(C.example);
      A.onConnection(function (off) { conn(off, true); });
      if (fx) A.carry.clear('email');

      function renderForm(value, focus) {
        A.title(C.forgot.title);
        el.innerHTML = head(C.forgot.h1, 'has-lede') + '<p class="lede">' + C.forgot.intro + '</p>' +
          offlineNote('fp', C.forgot.offline) +
          '<form id="fp" class="auth-form" novalidate>' + alertSlot('fp') + emailField('fp-email', 'username', 'go') +
          primary(C.forgot.submit) + '</form>' +
          '<div class="alt-links"><p><a class="link-btn" href="#/sign-in">' + C.forgot.back + '</a></p></div>';
        var form = $('#fp'), email = $('#fp-email'), btn = $('[type=submit]', form);
        carryEmail(email);
        if (value) fill(email, value);
        conn = wireOffline(btn, $('#fp-offline'), C.forgot.offline, C.forgot.online);
        function validate(i) { return vEmail(i.value); }
        A.wireForm(form, {
          validate: validate,
          onSubmit: function () {
            if (!check(form, [email], validate)) return;
            email.value = A.normEmail(email.value); A.carry.set('email', email.value);
            A.pending(btn, C.forgot.submitting);
            // Same answer whether or not the email has an account (no enumeration).
            A.fake({ ok: true }).then(function () { renderSent(email.value, false, true); },
              function (r) { A.idle(btn); fail(form, btn, r.error, 'fp-offline-msg'); });
          }
        });
        if (focus) { A.focus(email); if (focus === 'select') email.select(); }
        return { form: form, email: email, btn: btn };
      }

      function renderSent(addr, resent, focus) {
        A.title(C.sent.title);
        el.innerHTML = head(C.sent.h1, 'has-lede') +
          '<div class="sent-body"><p>' + C.sent.body.replace('{email}', A.esc(addr)) + '</p><p>' + C.sent.nothing + '</p></div>' +
          offlineNote('fs', C.forgot.offline) +
          '<form id="fs" class="auth-form sent-actions" novalidate>' + alertSlot('fs') +
          '<button class="btn-sec btn-block" type="submit">' + C.sent.resend + '</button>' +
          '<p class="resent" id="fs-resent"' + (resent ? '' : ' hidden') + '>' + A.icon('check') + '<span>' + C.sent.resent + '</span></p>' +
          '</form>' +
          '<div class="alt-links"><p><button class="link-btn" type="button" id="fs-different">' + C.sent.different + '</button></p>' +
          '<p><a class="link-btn" href="#/sign-in">' + C.sent.back + '</a></p></div>';
        var form = $('#fs'), btn = $('[type=submit]', form), line = $('#fs-resent');
        conn = wireOffline(btn, $('#fs-offline'), C.forgot.offline, C.forgot.online);
        A.wireForm(form, {
          validate: function () { return ''; },
          onSubmit: function () {
            A.formAlert(form, ''); line.hidden = true;
            A.pending(btn, C.sent.resending);
            A.fake({ ok: true }).then(function () { A.idle(btn); line.hidden = false; A.say(C.sent.resent); },
              function (r) { A.idle(btn); fail(form, btn, r.error, 'fs-offline-msg'); });
          }
        });
        $('#fs-different').addEventListener('click', function () { renderForm(addr, 'select'); });
        if (focus) A.focusHeading();
      }

      // ----- state -----
      var data = { prefilled: SARA.email, invalid: 'sara@example', submitting: SARA.email,
        'rate-limited': SARA.email, 'network-error': SARA.email, 'server-error': SARA.email };
      if (fx && (st === 'sent' || st === 'resent')) { A.carry.set('email', SARA.email); return renderSent(SARA.email, st === 'resent', true); }
      var value = fx ? (data[st] || '') : A.carry.get('email');
      var f = renderForm(value, false);
      if (fx) {
        if (st === 'invalid') return check(f.form, [f.email], function (i) { return vEmail(i.value); });
        if (st === 'submitting') { A.pending(f.btn, C.forgot.submitting); A.fake('hang'); return; }
        if (FAILS.indexOf(st) >= 0) { fail(f.form, f.btn, st, 'fp-offline-msg'); return A.focus(f.btn); }
      }
      land(ctx, 'idle', f.email); // §6.1: Forgot → Email, value kept
    }
  });

  // ---------- Reset password: valid · Link doesn't work · Password changed (F4, wireframe 5.4) ----------
  A.view('reset-password', {
    states: ['valid', 'invalid', 'submitting', 'success', 'expired', 'used', 'expired-on-submit', 'signed-in',
      'rate-limited', 'offline', 'network-error', 'server-error'],
    ownsFocus: true,
    mount: function (el, ctx) {
      var st = A.state, fx = fixture(ctx), conn = function () {};
      A.header({}); A.footnote(C.example);
      A.onConnection(function (off) { conn(off, true); });
      // F4.6: in the prototype, "expired-on-submit" is a form whose token dies when it's submitted.
      var tokenDead = st === 'expired-on-submit';

      function renderInvalid(focus) {
        A.title(C.invalid.title); conn = function () {};
        el.innerHTML = head(C.invalid.h1, 'has-lede') + '<div class="result"><p class="lede">' + C.invalid.body + '</p>' +
          '<a class="btn-primary btn-block" href="#/forgot-password" id="ri-new">' + C.invalid.primary + '</a></div>' +
          '<div class="alt-links"><p><a class="link-btn" href="#/sign-in">' + C.invalid.back + '</a></p></div>';
        // A new tab from the email knows no email: Forgot opens empty (F4.5).
        $('#ri-new').addEventListener('click', function () { A.carry.clear('email'); });
        if (focus) A.focusHeading();
      }

      function renderDone(focus) {
        A.title(C.done.title); conn = function () {};
        el.innerHTML = head(C.done.h1, 'has-lede') + '<div class="result"><p class="lede">' + C.done.body + '</p>' +
          '<a class="btn-primary btn-block" href="#/sign-in" data-state="reset-done" data-replace>' + C.done.primary + '</a>' +
          '<p class="result-note">' + C.done.others + '</p><p class="result-note muted">' + C.done.homeScreen + '</p></div>';
        if (focus) A.focusHeading();
      }

      function renderForm() {
        A.title(C.reset.title);
        el.innerHTML = head(C.reset.h1) +
          (st === 'signed-in' ? note('rp-signed', C.reset.signedIn.replace('{firstName}', A.esc(SARA.firstName)), 'info') : '') +
          offlineNote('rp', C.reset.offline) +
          '<form id="rp" class="auth-form" novalidate>' + alertSlot('rp') +
          pwField('rp-pw', { label: C.newPassword, ac: 'new-password', name: 'newPassword', extra: 'rp-note',
            after: '<p class="help" id="rp-note">' + C.reset.note + '</p>' }) +
          primary(C.reset.submit) + '</form>';
        var form = $('#rp'), pw = $('#rp-pw'), btn = $('[type=submit]', form);
        wireCaps(pw); A.describe(pw);
        conn = wireOffline(btn, $('#rp-offline'), C.reset.offline, C.reset.online);
        function validate(i) { return vNewPw(i.value); }
        A.wireForm(form, {
          validate: validate,
          onSubmit: function () {
            if (!check(form, [pw], validate)) return;
            A.pending(btn, C.reset.submitting);
            A.fake(tokenDead ? { error: 'invalid-token' } : { ok: true }).then(function () {
              if (st === 'signed-in') ['email', 'intent', 'code', 'joinDraft'].forEach(A.carry.clear); // signed out here too
              renderDone(true);
            }, function (r) {
              if (r.error === 'invalid-token') { pw.value = ''; renderInvalid(true); A.say(C.invalid.announce); return; } // never stored
              A.idle(btn); fail(form, btn, r.error, 'rp-offline-msg');
            });
          }
        });
        return { form: form, pw: pw, btn: btn };
      }

      // ----- state -----
      if (st === 'expired' || st === 'used') return renderInvalid(!ctx.first || fx);
      if (st === 'success') return renderDone(!ctx.first || fx);
      var f = renderForm();
      if (fx) {
        if (st === 'invalid') { f.pw.value = 'sesame'; return check(f.form, [f.pw], function (i) { return vNewPw(i.value); }); }
        if (st === 'submitting' || FAILS.indexOf(st) >= 0) f.pw.value = GOOD_PW;
        if (st === 'submitting') { A.pending(f.btn, C.reset.submitting); A.fake('hang'); return; }
        if (FAILS.indexOf(st) >= 0) { fail(f.form, f.btn, st, 'rp-offline-msg'); return A.focus(f.btn); }
      }
      A.focus(f.pw); // §6.1: a single task; the link from the email is always a first load
    }
  });

  // ---------- Privacy placeholder (decision.md: "the link goes to a placeholder page"; the page has no owner) ----------
  A.view('privacy', {
    mount: function (el) {
      A.title('Not in this prototype'); A.header({}); A.footnote('');
      el.innerHTML = head('Not in this prototype', 'has-lede') +
        '<p class="lede">The privacy page isn\'t written yet.</p>' +
        '<div class="alt-links"><p><a class="link-btn" href="#/create-account">' + C.create.h1 + '</a></p></div>';
    }
  });
})();
