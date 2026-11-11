/* Trips list view (#/trips). Direction B · Saffron light.
   Sections in time order (ia D2): Happening now · Coming up · No dates yet · Past. Empty sections are omitted.
   The lead trip (first now, else first upcoming) spans the row: its doorway sits on the light band, the one
   saffron block on the screen. Other trips are doorway tiles with a text countdown; past trips are flat rows.
   Each card is one link whose name is its visible content (copy.md §1): count/kicker, title, destination, dates.
   States (?state=): populated · trip-now · empty · only-past · loading · error · stale · offline · uploads-off · live
   Live changes update in place; a partner's new trip is inserted in its date position; a trip whose dates change
   keeps its section until the route is entered again (ia D2). */
(function () {
  'use strict';
  var root = null, state = 'populated', order = null, onChange = null, onConn = null, onVis = null, lastOpened = null;
  var esc = Z.esc, svg = Z.svg;
  var SECTION = { now: 'Happening now', upcoming: 'Coming up', undated: 'No dates yet', past: 'Past' };

  // ---------- order: frozen while the list is on screen ----------
  function computeOrder() {
    order = {};
    Z.sections().forEach(function (s) { order[s.key] = s.trips.map(function (t) { return t.id; }); });
  }
  function insertNew(t) {
    var key = Z.status(t).kind, fresh = Z.sections().filter(function (s) { return s.key === key; })[0];
    var ids = (fresh ? fresh.trips : [t]).map(function (x) { return x.id; });
    var list = (order[key] || []).slice(), at = ids.indexOf(t.id), after = ids.slice(0, at).filter(function (id) { return list.indexOf(id) > -1; }).pop();
    list.splice(after ? list.indexOf(after) + 1 : 0, 0, t.id);
    order[key] = list;
  }
  function sections() {
    return ['now', 'upcoming', 'undated', 'past'].map(function (k) {
      return { key: k, trips: (order[k] || []).map(Z.trip).filter(Boolean) };
    }).filter(function (s) { return s.trips.length; });
  }
  function leadId(secs) {
    var s = secs.filter(function (x) { return x.key === 'now' || x.key === 'upcoming'; })[0];
    return s ? s.trips[0].id : null;
  }

  // ---------- pieces ----------
  function dates(t) {
    if (!t.start) return '';
    return '<span aria-hidden="true">' + esc(Z.range(t.start, t.end)) + '</span><span class="vh">' + esc(Z.rangeSr(t.start, t.end)) + '</span>';
  }
  function meta(t, withDates) {
    var parts = [];
    if (t.destination) parts.push(esc(t.destination));
    if (withDates && t.start) parts.push(dates(t));
    return parts.join('<span aria-hidden="true"> · </span><span class="vh">, </span>');
  }
  function statusLine(t) {
    var s = Z.status(t);
    if (s.kind === 'upcoming') return s.days === 1 ? 'Tomorrow' : 'in ' + s.days + ' days';
    if (s.kind === 'now') return 'Day ' + s.day + ' of ' + s.total + ' · ' + (s.last ? 'Last day' : 'Happening now');
    if (s.kind === 'undated') return 'No dates yet';
    return s.ago === 1 ? 'Ended yesterday' : 'Ended ' + s.ago + ' days ago';
  }

  // The lead: doorway on the light band, then the title and where/when. The whole card is one link.
  function leadHTML(t) {
    return '<li class="trip-lead" data-id="' + esc(t.id) + '"><a class="trip-card" href="#/trips/' + esc(t.id) + '">' +
      '<div class="lead-door">' + Z.doorway(t, 'lead') + '</div>' +
      '<div class="lead-body">' + Z.lightBand(t, { lead: true }) +
      '<h3 class="lead-title">' + esc(t.title) + '</h3>' +
      '<p class="lead-meta">' + meta(t, true) + '</p></div></a></li>';
  }
  function tileHTML(t) {
    var s = Z.status(t);
    return '<li class="trip-tile" data-id="' + esc(t.id) + '"><a class="trip-card" href="#/trips/' + esc(t.id) + '">' +
      Z.doorway(t, 'tile') +
      '<h3 class="tile-title">' + esc(t.title) + '</h3>' +
      (t.destination || t.start ? '<p class="tile-meta">' + meta(t, true) + '</p>' : '') +
      '<p class="tile-status">' + esc(statusLine(t)) + '</p></a></li>';
  }
  function pastHTML(t) {
    return '<li class="trip-past" data-id="' + esc(t.id) + '"><a class="trip-card" href="#/trips/' + esc(t.id) + '">' +
      Z.doorway(t, 'row') +
      '<div class="past-body"><h3 class="past-title">' + esc(t.title) + '</h3>' +
      '<p class="past-meta">' + meta(t, true) + '</p></div>' +
      '<p class="past-ago">' + esc(statusLine(t)) + '</p></a></li>';
  }

  // ---------- page ----------
  function titleFor() {
    if (state === 'loading') return 'Loading – Zamane';
    if (state === 'error') return 'Can\'t load Trips – Zamane';
    if (Z.offline) return 'Trips (offline) – Zamane';
    if (!Z.listTrips().length) return 'No trips yet – Zamane';
    return 'Trips – Zamane';
  }
  function primaryHTML() {
    if (state === 'loading' || state === 'error') return '';
    return '<div class="dock"><a class="btn-primary" id="primary" href="#/trips/new">' + svg('plus') + (Z.listTrips().length ? 'Plan a trip' : 'Plan your first trip') + '</a></div>';
  }
  function noticeHTML() {
    if (state === 'loading' || state === 'error') return '';
    if (Z.offline) return '<p class="notice list-notice">' + svg('cloudOff') + '<span>You\'re offline. Showing the latest data on this phone. Ticking things off and adding places still work and sync when you\'re back online.</span></p>';
    if (state === 'stale') return '<div class="notice list-notice notice-stale">' + svg('refresh') + '<span>Couldn\'t refresh. Showing the latest data on this phone.</span><button class="link-btn" type="button" data-act="refresh">Try again</button></div>';
    return '';
  }
  function bodyHTML() {
    if (state === 'loading') {
      return '<p class="vh" role="status" id="list-status"></p><div class="list-sk" aria-hidden="true">' +
        '<span class="sk sk-h2"></span><div class="sk-lead"><span class="sk sk-door"></span><span class="sk sk-band"></span><span class="sk sk-line"></span><span class="sk sk-line short"></span></div>' +
        '<span class="sk sk-h2"></span><div class="sk-tiles"><span class="sk sk-tile"></span><span class="sk sk-tile"></span></div></div>';
    }
    if (state === 'error') {
      return '<div class="list-error"><div role="alert"><h2 class="title">Trips didn\'t load</h2><p>Check your connection and try again.</p></div>' +
        '<button class="btn-primary" type="button" data-act="retry">Try again</button></div>';
    }
    var secs = sections();
    if (!secs.length) {
      return '<div class="prompt list-empty">' + svg('map') + '<div><h2 class="title">No trips yet. Plan your first one.</h2><p>A trip holds your plan, the places you\'d like to see and what to pack. Only the title is needed to start.</p></div></div>';
    }
    var lead = leadId(secs), html = '';
    if (!lead && !secs.some(function (s) { return s.key === 'undated'; })) {
      html += '<div class="prompt list-empty only-past">' + svg('calendar') + '<div><h2 class="title">Nothing coming up.</h2><p>Plan your next trip, or look back at the past ones below.</p></div></div>';
    }
    var covers = Z.uploadsEnabled && Z.listTrips().some(function (t) { return t.cover && t.id !== lead; });
    secs.forEach(function (s) {
      var id = 'h-' + s.key;
      html += '<section class="trip-sec trip-sec--' + s.key + '" aria-labelledby="' + id + '"><h2 class="sec-title" id="' + id + '">' + SECTION[s.key] + '</h2>';
      if (s.key === 'past') {
        html += '<ul class="past-rows" role="list">' + s.trips.map(pastHTML).join('') + '</ul>';
      } else {
        html += '<ul class="trip-tiles' + (covers ? '' : ' no-covers') + '" role="list">' + s.trips.map(function (t) { return t.id === lead ? leadHTML(t) : tileHTML(t); }).join('') + '</ul>';
      }
      html += '</section>';
    });
    return html;
  }
  function render() {
    root.classList.add('list-view');
    root.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    Z.title(titleFor());
    Z.setFab(state !== 'loading' && state !== 'error');
    Z.keepFocus(root, function () {
      root.innerHTML = '<div class="list-head"><h1 class="title-lg" id="list-h1" tabindex="-1">Trips</h1>' + primaryHTML() + '</div>' +
        noticeHTML() + '<div class="list-body">' + bodyHTML() + '</div>';
    });
    Z.footnote(state === 'loading' || state === 'error' ? '' : 'Example data. The trips, dates and the 9,200 / 8,000 MAD budget are the design system\'s. Everything else is made up.');
    Z.afterRender();
    var st = root.querySelector('#list-status'); if (st) setTimeout(function () { st.textContent = 'Loading trips'; }, 50);
  }

  // ---------- live updates: in place, polite announcements, no toast ----------
  function handleChange(ev) {
    if (!root || state === 'loading' || state === 'error') return;
    if (['trip-created', 'trip-updated', 'trip-deleted'].indexOf(ev.type) < 0) return;
    var focusNext = null;
    if (ev.type === 'trip-created') insertNew(ev.trip);
    if (ev.type === 'trip-deleted') {
      var li = root.querySelector('[data-id="' + CSS.escape(ev.tripId) + '"]');
      if (li && li.contains(document.activeElement)) {
        var sib = li.nextElementSibling || li.previousElementSibling;
        focusNext = sib ? sib.querySelector('a').getAttribute('href') : '#h1';
      }
      Object.keys(order).forEach(function (k) { order[k] = order[k].filter(function (id) { return id !== ev.tripId; }); });
    }
    render();
    if (focusNext === '#h1') Z.focusHeading();
    else if (focusNext) { var a = root.querySelector('a[href="' + focusNext + '"]'); if (a) a.focus({ preventScroll: true }); }
    if (ev.source === 'partner') {
      var name = Z.name(ev.by), title = ev.trip ? ev.trip.title : '';
      Z.announce(ev.type === 'trip-created' ? name + ' created ' + title + '.' : ev.type === 'trip-deleted' ? name + ' deleted ' + title + '.' : name + ' changed ' + title + '.');
    }
  }

  function onClick(e) {
    var link = e.target.closest('.trip-card');
    if (link) { lastOpened = link.getAttribute('href'); return; }
    var act = e.target.closest('[data-act]');
    if (!act || act.getAttribute('aria-disabled') === 'true') return;
    if (act.dataset.act === 'retry' || act.dataset.act === 'refresh') {
      act.setAttribute('aria-disabled', 'true'); act.textContent = 'Trying again'; // stays focusable while pending
      setTimeout(function () { state = 'populated'; computeOrder(); render(); Z.focusHeading(); Z.announce('Trips loaded.'); }, 900);
    }
  }

  Z.view('list', {
    mount: function (el) {
      root = el;
      var fx = Z.fixture('list');
      state = fx && ['loading', 'error', 'stale'].indexOf(fx) > -1 ? fx : 'populated';
      Z.offlineMessage = 'You\'re offline. Ticking things off and adding places still work.';
      computeOrder();
      render();
      root.addEventListener('click', onClick);
      onChange = handleChange; Z.on('change', onChange);
      onConn = function () { if (state === 'stale' && !Z.offline) state = 'populated'; render(); }; Z.on('connection', onConn);
      // Back in the foreground: statuses and order are recomputed (ia D2, D15).
      onVis = function () { if (document.visibilityState === 'visible' && root && state !== 'loading' && state !== 'error') { computeOrder(); render(); } };
      document.addEventListener('visibilitychange', onVis);
      if (fx === 'live') setTimeout(function () { Z.partner.createTrip({ title: 'Marrakech with Mum', destination: 'Marrakech' }); }, 300);
      var y = Z.scrollFor('/trips');
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
