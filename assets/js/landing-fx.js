/* FoundersNavigator – landing page extras: the "flight paths" map and the demo video.
 *
 * Flight paths: a dotted map (North America → Europe) with the six countries. It plays through the
 * example founders (examples.js): a pulse marks where the founder lives, routes fly to every country
 * still in the running, and the best fit gets a drawn-in route. Scores come from the real engine.
 * The map pauses off-screen and in hidden tabs; with reduced motion it shows one founder, no cycling.
 *
 * Map data: Natural Earth land (world-atlas land-50m), Mercator, lon −100…36, lat 25…63, rasterised
 * to an 8-unit dot grid in a 1000 × 411 box. Each row is run-length encoded in base 36, alternating
 * sea/land counts (starting with sea). Generated once at dev time; ≈ 1.5 KB.
 *
 * Demo video: loads nothing until it scrolls near the viewport, then plays muted while ≥ 40 % visible
 * and pauses when it leaves. A play/pause button is always there; reduced motion or data saver means
 * no autoplay (the button starts it).
 */
(function (root) {
  'use strict';
  var UI = root.SSN_UI, D = root.SSN_DATA, E = root.SSN_ENGINE;
  var EXAMPLES = root.SSN_EXAMPLES || [];
  function t(s, v) { return UI.t(s, v); }
  var esc = UI.esc, icon = UI.icon;

  var MAP = {
    W: 1000, H: 411, STEP: 8,
    rows: '0.7.8.2.b.2.g.7.19.a.3.e 0.7.8.1.2.1.1.5.4.2.f.7.w.1.b.b.4.d 0.6.c.1.1.6.l.6.17.c.4.d 0.5.f.6.l.6.18.b.4.d 0.5.f.8.m.3.18.b.4.d 0.5.g.7.4.1.h.2.1a.b.4.2.4.6 0.5.f.8.4.1.1s.c.6.1.2.7 0.5.f.8.4.1.1s.4.1.7.4.c 0.6.e.9.2.3.1h.2.8.3.2.5.5.1.1.b 0.7.e.e.1g.1.f.4.2.1.4.b 0.7.e.e.1g.3.b.1.1.4.5.1.1.b 0.a.c.e.1e.4.a.1.3.3.4.e 0.b.a.f.1f.2.a.2.2.2.6.e 0.d.8.g.1f.2.a.3.1.1.6.e 0.g.3.j.1a.7.9.1.9.f 0.g.3.j.1a.3.2.3.8.2.1.1.3.i 0.g.3.l.17.3.3.3.8.p 0.g.1.1.1.m.16.3.2.4.5.s 0.h.3.l.16.3.2.5.3.t 0.i.1.l.17.1.3.6.2.u 0.12.2.1.1b.5.1.v 0.w.1.4.2.1.1b.2.4.w 0.u.3.1.5.3.1c.1.1.x 0.t.1.3.5.4.1c.z 0.w.6.5.19.11 0.r.1.4.9.2.1b.z 0.w.1m.z 0.x.2.2.1i.t.3.1.1 0.v.1.3.1k.c.1.f.4.2 0.t.2.2.1m.c.3.c.7 0.r.4.1.1g.1.1.1.4.7.3.3.3.b.7 0.r.1l.b.5.1.1.3.3.a.7 0.s.1k.b.5.1.2.3.4.8.7 0.p.1n.9.c.2.3.9.2.4 0.o.1o.8.8.1.5.1.1.1.1.4.2.1.1.7 0.o.1o.8.2.1.5.1.9.3.4.8 0.n.1p.8.j.3.3.8 0.n.1p.7.c.3.5.2.4.8 0.m.1s.4.a.1.4.1.6.1.5.7 0.m.1y.a.f.1.7 0.m.1s.3.1.c.c.2.6.1.2 0.l.1t.f.o 0.j.1t.i.m.1 0.i.1t.m.6.2.b.1 0.h.1u.n.4.5.5.1.3.1 0.h.1u.q.1.f 0.7.1.2.3.1.1.2.1u.16 0.4.c.2.1l.1.6.17 0.2.e.2.1n.1.2.17.1.1 0.2.e.2.1p.18.2 0.3.e.1.1p.19.1',
    // country hubs (capital or main startup city) and where each example founder lives
    pos: { DE: [833.8, 145.9], CH: [798.1, 204.6], LI: [805.3, 207.1], UK: [734.3, 157.9], US: [191.2, 272.9], PT: [668.1, 291.9] },
    home: { DE: [820.4, 196.2], PT: [672, 268.6], CH: [798.1, 204.6], LI: [805.3, 207.1], UK: [734.3, 157.9], US: [191.2, 272.9], euother: [889.7, 149.5], out: [985.3, 343.8] },
    // label side per country, so the tight Alpine cluster (CH/LI) and DE don't collide
    side: { DE: 'ne', CH: 'sw', LI: 'se', UK: 'nw', US: 'se', PT: 'w' }
  };
  var dotsPath = null;
  function mapDots() {
    if (dotsPath) return dotsPath;
    var d = '', S = MAP.STEP;
    MAP.rows.split(' ').forEach(function (row, r) {
      var x = 0, land = false, y = S / 2 + r * S;
      row.split('.').forEach(function (n) {
        n = parseInt(n, 36);
        if (land) for (var i = 0; i < n; i++) d += 'M' + (S / 2 + (x + i) * S) + ' ' + y + 'h0';
        x += n; land = !land;
      });
    });
    return (dotsPath = d);
  }
  function arc(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.sqrt(dx * dx + dy * dy);
    var lift = Math.max(18, dist * 0.32);
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - lift;
    return 'M' + a[0] + ' ' + a[1] + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b[0] + ' ' + b[1];
  }
  function pct(p) { return 'left:' + (p[0] / MAP.W * 100).toFixed(2) + '%;top:' + (p[1] / MAP.H * 100).toFixed(2) + '%'; }

  /* Map-only profile: a US founder, so one route crosses the Atlantic (not shown among the example cards). */
  var MAP_EXTRA = [
    { id: 'noneu-deeptech', icon: 'public', label: 'Non-EU deeptech founder',
      answers: { citizenship: ['other'], residence: 'elsewhere', relocation: 'anywhere', sector: 'ai', market: 'global',
        funding: ['accelerator', 'vc'], capital: 'lt10', investors: ['none'], exit: 'ipo', esop: 'all', hires: '3to5',
        priorities: { residence: 3 } } },
    { id: 'us-bootstrap', icon: 'flight_takeoff', label: 'US bootstrapper selling to Europe',
      answers: { citizenship: ['us'], residence: 'US', relocation: 'anywhere', sector: 'consumer', market: 'eu',
        funding: ['bootstrap'], capital: '10to25', investors: ['none'], exit: 'hold', esop: 'no', hires: '0' } }
  ];

  /* ---------- state kept across re-renders (language switch, theme) ---------- */
  var S = { idx: 0, auto: true, timer: null, io: null, visible: false, demoPaused: false, demoIO: null, answers: null, listKey: '' };
  // With a (partial) result that includes where they live, the founder's own move comes first and the map holds still on it.
  function profiles() {
    var list = EXAMPLES.concat(MAP_EXTRA);
    var a = S.answers;
    if (a && a.residence) list = [{ me: true, icon: 'person_pin', label: 'Your result', answers: a }].concat(list);
    return list;
  }
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function routesHtml() {
    if (!EXAMPLES.length) return '';
    // labels are HTML (flags, text); the dots live in the SVG next to the routes, so ends always meet
    var pins = D.COUNTRIES.map(function (c) {
      return '<div class="fp-pin fp-pin--' + MAP.side[c.id] + '" data-k="' + c.id + '" style="' + pct(MAP.pos[c.id]) + '">' +
        '<span class="fp-pin__label">' + UI.avatar(c.id) + '<span class="fp-pin__name">' + esc(t(c.name)) + '</span><b class="fp-pin__score">–</b></span></div>';
    }).join('');
    var dots = D.COUNTRIES.map(function (c) {
      return '<circle class="fp-dot" data-k="' + c.id + '" cx="' + MAP.pos[c.id][0] + '" cy="' + MAP.pos[c.id][1] + '" r="5"/>';
    }).join('');
    var chips = profiles().map(function (x, i) {
      return '<li><button type="button" class="chip fp-chip' + (x.me ? ' fp-chip--me' : '') + '" data-action="route-pick" data-i="' + i + '" aria-pressed="false">' + icon(x.icon) + esc(t(x.label)) + '</button></li>';
    }).join('');
    return '<section class="flightpaths" aria-labelledby="fp-title">' +
      '<div class="flightpaths__head"><h2 id="fp-title">' + esc(t('Same six countries. A different best fit for every founder.')) + '</h2>' +
        '<p>' + esc(t('Watch the ranking move as the founder changes – or pick one yourself.')) + '</p></div>' +
      '<div class="fp-stage">' +
        // "none": the SVG fills the stage exactly, so % positions of the HTML labels match the SVG coordinates
        '<svg class="fp-map" viewBox="0 0 ' + MAP.W + ' ' + MAP.H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
          '<path class="fp-land" d="' + mapDots() + '"/>' +
          '<g class="fp-routes"></g>' + dots + '<g class="fp-home"><circle class="fp-home__pulse" r="7"/><circle class="fp-home__dot" r="5.5"/></g>' +
        '</svg>' + pins +
        '<span class="fp-you" aria-hidden="true">' + esc(t('You')) + '</span>' +
      '</div>' +
      '<div class="fp-foot"><ul class="fp-chips" aria-label="' + esc(t('Example founders')) + '">' + chips + '</ul>' +
        '<p class="fp-result" aria-live="polite"></p></div>' +
      '</section>';
  }

  function show(i, announce) {
    var sec = document.querySelector('.flightpaths'); if (!sec) return;
    var list = profiles();
    var ex = list[i % list.length]; S.idx = i % list.length;
    var res = E.evaluate(ex.answers, true);
    var ranked = res.rows.filter(function (r) { return !r.excluded; });
    var win = ranked[0];
    var homeKey = MAP.home[ex.answers.residence] ? ex.answers.residence : 'out';
    var home = MAP.home[homeKey];
    var stays = MAP.pos[win.id][0] === home[0] && MAP.pos[win.id][1] === home[1];
    // routes: every country still in the running; the best fit last, so it draws on top
    var routes = ranked.slice(1).concat([win]).filter(function (r) { return MAP.pos[r.id][0] !== home[0] || MAP.pos[r.id][1] !== home[1]; }).map(function (r) {
      var d = arc(home, MAP.pos[r.id]);
      return r === win ? '<path class="fp-route fp-route--win" d="' + d + '"/>' : '<path class="fp-route" d="' + d + '"/>';
    }).join('');
    var g = sec.querySelector('.fp-routes'); g.innerHTML = routes;
    // draw-in: dash = the real path length (pathLength scaling leaves the line a little short in some browsers)
    var wr = g.querySelector('.fp-route--win');
    if (wr) { var L = Math.ceil(wr.getTotalLength()) + 2; wr.style.strokeDasharray = L; wr.style.strokeDashoffset = reduce ? 0 : L; wr.style.setProperty('--len', L); }
    var h = sec.querySelector('.fp-home');
    h.setAttribute('transform', 'translate(' + home[0] + ' ' + home[1] + ')');
    var you = sec.querySelector('.fp-you'); you.setAttribute('style', pct(home)); you.classList.toggle('fp-you--out', homeKey === 'out');
    you.textContent = ex.me ? t('You') : t('Founder');
    sec.classList.toggle('is-me', !!ex.me);
    res.rows.forEach(function (r) {
      var p = sec.querySelector('.fp-pin[data-k="' + r.id + '"]'), d = sec.querySelector('.fp-dot[data-k="' + r.id + '"]'); if (!p) return;
      [p, d].forEach(function (x) { x.classList.toggle('is-win', r === win); x.classList.toggle('is-out', !!r.excluded); });
      p.querySelector('.fp-pin__score').textContent = r.excluded ? '–' : r.score;
    });
    Array.prototype.forEach.call(sec.querySelectorAll('.fp-chip'), function (b) {
      var on = +b.getAttribute('data-i') === S.idx; b.setAttribute('aria-pressed', on); b.classList.toggle('chip--tonal', on);
    });
    var out = sec.querySelector('.fp-result');
    var c = t(win.country.name), n = win.score, from = MAP.pos[homeKey] ? t(D.COUNTRIES.filter(function (x) { return x.id === homeKey; })[0].name) : '';
    var text = ex.me
      ? (stays ? t('Your best fit is where you live: {c} ({n} / 100)', { c: c, n: n })
               : (from ? t('Your move: {a} → {c} ({n} / 100)', { a: from, c: c, n: n }) : t('Your best fit: {c} ({n} / 100)', { c: c, n: n })))
      : t('Best fit for “{f}”: {c} ({n} / 100)', { f: t(ex.label), c: c, n: n });
    // only user picks are announced; the autoplay rewrites silently
    out.setAttribute('aria-live', announce ? 'polite' : 'off');
    out.innerHTML = icon('flag') + '<span>' + esc(text) + '</span>';
    // restart the draw-in animation
    sec.classList.remove('is-drawn'); void sec.offsetWidth; sec.classList.add('is-drawn');
  }
  function tick() { show(S.idx + 1); }
  function schedule() {
    clearInterval(S.timer); S.timer = null;
    if (S.auto && !reduce && S.visible && !document.hidden) S.timer = setInterval(tick, 4200);
  }

  /* ---------- demo video ---------- */
  // one take per theme (recorded in light and in dark mode); the page shows the one matching the active theme
  function darkTheme() {
    var th = document.documentElement.getAttribute('data-theme');
    if (th) return th === 'dark';
    return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  var DEMO_V = '?v=5'; // bump when the demo takes are re-recorded, so cached copies are replaced
  function demoFile(kind) { var m = darkTheme() ? 'dark' : 'light'; return (kind === 'poster' ? 'assets/media/demo-poster-' + m + '.jpg' : 'assets/media/demo-' + m + '.mp4') + DEMO_V; }
  // theme switched while the page is open: swap the file, keep the position and the play state
  function syncDemoTheme() {
    var v = document.querySelector('.demo__video'); if (!v) return;
    var want = demoFile('video'), s = v.querySelector('source');
    if (!s || s.getAttribute('src') === want) return;
    var at = v.currentTime, wasPlaying = !v.paused, started = v.readyState > 0;
    v.setAttribute('poster', demoFile('poster'));
    s.setAttribute('src', want);
    if (!started) return; // nothing loaded yet: the new file loads when it is first played
    v.load();
    v.addEventListener('loadedmetadata', function once() { v.removeEventListener('loadedmetadata', once); try { v.currentTime = at; } catch (e) {} if (wasPlaying) play(v); });
  }
  if (root.MutationObserver) new MutationObserver(syncDemoTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (root.matchMedia) { var mq = root.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', syncDemoTheme); }
  function demoHtml() {
    return '<section class="demo" aria-labelledby="demo-title">' +
      '<div class="demo__head"><h2 id="demo-title">' + esc(t('See it in action')) + '</h2><p>' + esc(t('From the first question to a sourced result in under a minute.')) + '</p></div>' +
      '<div class="demo__frame">' +
        '<video class="demo__video" muted playsinline loop preload="none" poster="' + demoFile('poster') + '" aria-label="' + esc(t('Demo video: answering the questions and reading the result')) + '">' +
          '<source src="' + demoFile('video') + '" type="video/mp4"></video>' +
        '<button type="button" class="demo__toggle" data-action="demo-toggle">' + icon('play_arrow') + '<span class="sr-only">' + esc(t('Play video')) + '</span></button>' +
      '</div></section>';
  }
  function saveData() { var c = navigator.connection; return !!(c && c.saveData); }
  function syncDemoBtn(v) {
    var b = document.querySelector('.demo__toggle'); if (!b || !v) return;
    var playing = !v.paused;
    b.innerHTML = icon(playing ? 'pause' : 'play_arrow') + '<span class="sr-only">' + esc(playing ? t('Pause video') : t('Play video')) + '</span>';
    b.closest('.demo__frame').classList.toggle('is-playing', playing);
  }
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () { syncDemoBtn(v); }); }

  function setAnswers(a) {
    S.answers = a && Object.keys(a).length ? a : null;
    var key = S.answers && S.answers.residence ? 'me' : 'demo';
    if (key !== S.listKey) { S.listKey = key; S.idx = 0; S.auto = key === 'demo'; } // own result: start on it, no autoplay
  }
  function mount() {
    clearInterval(S.timer); S.timer = null;
    if (S.io) { S.io.disconnect(); S.io = null; }
    if (S.demoIO) { S.demoIO.disconnect(); S.demoIO = null; }
    var sec = document.querySelector('.flightpaths');
    if (sec) {
      show(S.idx, false);
      if ('IntersectionObserver' in root) {
        S.io = new IntersectionObserver(function (en) { S.visible = en[0].isIntersecting; sec.classList.toggle('is-paused', !S.visible); schedule(); }, { threshold: 0.25 });
        S.io.observe(sec);
      } else { S.visible = true; schedule(); }
    }
    var v = document.querySelector('.demo__video');
    if (v) {
      ['play', 'pause'].forEach(function (ev) { v.addEventListener(ev, function () { syncDemoBtn(v); }); });
      var autoOK = !reduce && !saveData();
      if ('IntersectionObserver' in root) {
        S.demoIO = new IntersectionObserver(function (en) {
          var vis = en[0].isIntersecting;
          if (vis && autoOK && !S.demoPaused && v.paused) play(v);
          else if (!vis && !v.paused) v.pause();
        }, { threshold: 0.4 });
        S.demoIO.observe(v);
      }
    }
  }
  document.addEventListener('visibilitychange', schedule);

  UI.actions['route-pick'] = function (el) {
    S.auto = false; // a deliberate pick stops the autoplay
    show(+el.getAttribute('data-i') || 0, true);
    schedule();
  };
  UI.actions['demo-toggle'] = function () {
    var v = document.querySelector('.demo__video'); if (!v) return;
    if (v.paused) { S.demoPaused = false; play(v); } else { S.demoPaused = true; v.pause(); }
  };

  root.SSN_LANDING = { routesHtml: routesHtml, demoHtml: demoHtml, mount: mount, setAnswers: setAnswers };
})(this);
