/* FoundersNavigator – UI layer (vanilla JS, no build step) · Material 3
 * State, navigation, wizard, landing, global chrome (top bar, theme, language, snackbar), events, boot.
 * Every user-visible string goes through t() (i18n.js, keyed by the English text). */
(function () {
  'use strict';
  var D = window.SSN_DATA, E = window.SSN_ENGINE, S = window.SSN_STATE, UI = window.SSN_UI;
  var EXAMPLES = window.SSN_EXAMPLES || [];
  var esc = UI.esc, icon = UI.icon, avatar = UI.avatar, critIcon = UI.critIcon, country = UI.country, crit = UI.crit,
    shapePath = UI.shapePath, pageBg = UI.pageBg;
  function t(s, vars) { return UI.i18n && UI.i18n.t ? UI.i18n.t(s, vars) : (s == null ? '' : String(s)); }
  function lang() { return UI.i18n && UI.i18n.lang ? UI.i18n.lang() : 'en'; }
  var Q = E.QUESTIONS;
  var STORE_KEY = 'foundersnavigator-v1';
  var THEME_KEY = 'foundersnavigator-theme';
  var STEPS = Q.map(function (q) { return { kind: 'q', q: q, block: q.block }; }).concat([{ kind: 'prio', block: 'priorities' }]);
  var app = document.getElementById('app');
  var srStatus = document.getElementById('sr-status');
  var dialog = document.getElementById('detail');
  var html = document.documentElement;

  var state = { view: 'landing', step: 0, answers: {}, skipped: {}, roadmapTab: null, lastMove: null, prevOrder: null, openInfo: {}, example: null, railOpen: false, countryId: null };

  /* "Why we ask" – one line per question (question id → English text, translated at render time) */
  var WHY = {
    citizenship: 'Residence rights decide where you may live and run the company yourself.',
    residence: 'Founders do measurably better where they already have roots and a network.',
    relocation: 'Countries you would not move to are excluded from the ranking.',
    sector: 'Some hubs get +1 on talent & ecosystem for your sector, where evidence supports it.',
    market: 'Being close to your first customers raises market access for those countries.',
    funding: 'Each funding route raises the weight of the matching criterion by one level.',
    capital: 'Switzerland and Liechtenstein require minimum capital paid in before registration.',
    investors: 'Existing investors raise VC access in the countries where they are based.',
    exit: 'Selling shifts weight to exit tax; keeping the company shifts it to profit tax.',
    esop: 'Tax on employee stock options differs widely and matters for hiring.',
    hires: 'Planned hires bring employer payroll costs into the ranking and the first-year cost.'
  };

  /* ---------- motion (Material 3) ---------- */
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var lastPt = null;
  function qa(sel) { return Array.prototype.slice.call(app.querySelectorAll(sel)); }
  function ripple(el, pt, autoOut) {
    if (reduceMotion || !el) return null;
    var r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
    var x = pt ? pt.x - r.left : r.width / 2, y = pt ? pt.y - r.top : r.height / 2;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { x = r.width / 2; y = r.height / 2; }
    var s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (x - d / 2) + 'px;top:' + (y - d / 2) + 'px';
    el.appendChild(s);
    var out = function () { s.classList.add('ripple--out'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 450); };
    if (autoOut) setTimeout(out, 220);
    return out;
  }
  var RIPPLE_SEL = '.btn, .option, .chip--filter, .seg button, .step, .answer, .cellbtn, .iconbtn, .example, .rail-mobile__toggle';
  document.addEventListener('pointerdown', function (e) {
    lastPt = { x: e.clientX, y: e.clientY };
    var el = e.target.closest(RIPPLE_SEL); if (!el) return;
    var out = ripple(el, lastPt); if (!out) return;
    var done = function () { out(); window.removeEventListener('pointerup', done); window.removeEventListener('pointercancel', done); };
    window.addEventListener('pointerup', done); window.addEventListener('pointercancel', done);
  });
  /* after a re-render, re-attach feedback to the element that replaced the one clicked */
  function flash(sel) {
    var el = app.querySelector(sel); if (!el) return;
    el.classList.add('is-changed');
    ripple(el, lastPt, true);
  }
  function snapshotMotion() {
    var m = { pos: {}, w: {}, n: {}, lead: null };
    qa('[data-flip]').forEach(function (el) { m.pos[el.getAttribute('data-flip')] = el.offsetTop; });
    qa('[data-wkey]').forEach(function (el) { m.w[el.getAttribute('data-wkey')] = el.style.width; });
    qa('[data-ckey]').forEach(function (el) { m.n[el.getAttribute('data-ckey')] = parseFloat(el.textContent); });
    var l = app.querySelector('.rail .rank-item--lead'); if (l) m.lead = l.getAttribute('data-flip');
    return m;
  }
  function countTo(el, from, to, dur) {
    var t0 = null;
    el.textContent = Math.round(from);
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 4); // emphasized-decelerate approximation
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function playMotion(m) {
    if (reduceMotion) return;
    // FLIP: rows slide to their new rank
    qa('[data-flip]').forEach(function (el) {
      var k = el.getAttribute('data-flip'); if (!(k in m.pos)) return;
      var dy = m.pos[k] - el.offsetTop; if (!dy) return;
      el.style.transition = 'none'; el.style.transform = 'translateY(' + dy + 'px)';
      el.getBoundingClientRect();
      el.style.transition = 'transform 500ms var(--emph)'; el.style.transform = '';
    });
    // bars: animate from previous width (or from 0 on first appearance)
    var fresh = 0;
    qa('[data-wkey]').forEach(function (el) {
      var k = el.getAttribute('data-wkey'), to = el.style.width;
      var from = (k in m.w) ? m.w[k] : '0%';
      if (from === to) return;
      el.style.transition = 'none'; el.style.width = from;
      el.getBoundingClientRect();
      el.style.transition = 'width 600ms var(--emph-decel) ' + ((k in m.w) ? 0 : 120 + 40 * (fresh++)) + 'ms';
      el.style.width = to;
    });
    // numbers: count between values (or up from 0 where marked)
    qa('[data-ckey]').forEach(function (el) {
      var k = el.getAttribute('data-ckey'), to = parseFloat(el.textContent);
      var from = (k in m.n) ? m.n[k] : (el.hasAttribute('data-count0') ? 0 : to);
      if (from !== to && !isNaN(from) && !isNaN(to)) countTo(el, from, to, (k in m.n) ? 450 : 900);
    });
    // new leader in the live ranking gets a short emphasis pulse
    var l = app.querySelector('.rail .rank-item--lead');
    if (l && m.lead && l.getAttribute('data-flip') !== m.lead) l.classList.add('is-new-lead');
  }

  function announce(msg) { if (!msg) return; srStatus.textContent = ''; setTimeout(function () { srStatus.textContent = msg; }, 30); }

  /* ---------- snackbar (M3: inverse surface, bottom, one at a time, 4–10 s) ---------- */
  var snack = null, snackTimer = null, snackLeft = 0, snackStart = 0;
  function snackbarEl() {
    if (snack) return snack;
    snack = document.createElement('div');
    snack.className = 'snackbar';
    snack.hidden = true;
    document.body.appendChild(snack);
    var pause = function () { if (!snackTimer) return; clearTimeout(snackTimer); snackTimer = null; snackLeft -= Date.now() - snackStart; };
    var resume = function () { if (snackTimer || snack.hidden || !snack.classList.contains('is-open')) return; snackStart = Date.now(); snackTimer = setTimeout(hideSnackbar, Math.max(1500, snackLeft)); };
    snack.addEventListener('mouseenter', pause); snack.addEventListener('focusin', pause);
    snack.addEventListener('mouseleave', resume); snack.addEventListener('focusout', function (e) { if (!snack.contains(e.relatedTarget)) resume(); });
    snack.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideSnackbar(); });
    return snack;
  }
  function hideSnackbar() {
    if (!snack || snack.hidden) return;
    clearTimeout(snackTimer); snackTimer = null;
    var hadFocus = snack.contains(document.activeElement);
    snack.classList.remove('is-open');
    var el = snack;
    setTimeout(function () { if (!el.classList.contains('is-open')) el.hidden = true; }, reduceMotion ? 0 : 160);
    if (hadFocus) { var h = app.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
  }
  function snackbar(msg, opts) {
    opts = opts || {};
    var el = snackbarEl();
    clearTimeout(snackTimer); snackTimer = null;
    el.innerHTML = '<p class="snackbar__text">' + esc(msg) + '</p>' +
      (opts.actionLabel ? '<button type="button" class="btn btn--text snackbar__action">' + esc(opts.actionLabel) + '</button>' : '') +
      '<button type="button" class="iconbtn snackbar__close" aria-label="' + esc(t('Dismiss')) + '">' + icon('close') + '</button>';
    var act = el.querySelector('.snackbar__action');
    if (act) act.addEventListener('click', function () { hideSnackbar(); if (typeof opts.onAction === 'function') opts.onAction(); });
    el.querySelector('.snackbar__close').addEventListener('click', hideSnackbar);
    el.hidden = false;
    el.getBoundingClientRect();
    el.classList.add('is-open');
    var ms = typeof opts.timeout === 'number' ? opts.timeout : (opts.actionLabel ? 8000 : 4000);
    snackLeft = Math.max(4000, Math.min(10000, ms)); snackStart = Date.now();
    snackTimer = setTimeout(hideSnackbar, snackLeft);
    announce(msg + (opts.actionLabel ? ' – ' + t('{action} is available in the message at the bottom of the page.', { action: opts.actionLabel }) : ''));
  }

  /* ---------- persistence ---------- */
  // State persistence lives in state.js (pure, tested); these wrappers bind it to this page.
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function save() { S.save(storage(), STORE_KEY, state); }
  function load() {
    var s = S.load(storage(), STORE_KEY, { questions: Q, criteria: D.CRITERIA, maxStep: STEPS.length - 1, countries: D.COUNTRIES.map(function (c) { return c.id; }) });
    state.answers = s.answers; state.skipped = s.skipped; state.step = s.step; state.view = s.view; state.countryId = s.countryId;
  }
  function encodeShare() { return S.encodeShare(state.answers); }
  function readShare() {
    var a = S.readShare(location.hash, Q, D.CRITERIA);
    if (!a) return false;
    state.answers = a; state.view = 'results'; return true;
  }
  function clone(x) { return JSON.parse(JSON.stringify(x || {})); }

  /* ---------- navigation ---------- */
  function focusH1() { var h = app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } return h; }
  function go(view, opts) {
    state.view = view;
    if (opts && typeof opts.step === 'number') state.step = opts.step;
    save(); render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    focusH1();
  }
  function nextStep() {
    state.dir = 'fwd';
    if (state.step < STEPS.length - 1) { state.step++; save(); render(); focusHeading(); }
    else go('results');
  }
  function prevStep() { state.dir = 'back'; if (state.step > 0) { state.step--; save(); render(); focusHeading(); } else go('landing'); }
  function focusHeading() { var h = app.querySelector('.qhead h1'); if (h) h.focus({ preventScroll: true }); var c = app.querySelector('.qcard'); if (c && c.getBoundingClientRect().top < 60) window.scrollTo({ top: 0 }); }

  /* ---------- answers ---------- */
  function snapshotOrder() { var r = E.evaluate(state.answers, true); var m = {}; r.rows.forEach(function (x, i) { m[x.id] = { pos: i, total: x.total, excluded: !!x.excluded }; }); return m; }
  function change(mutator, label, qid) {
    state.example = null;
    var before = snapshotOrder();
    mutator();
    var after = snapshotOrder();
    state.prevOrder = before;
    var best = null;
    Object.keys(after).forEach(function (k) {
      if (after[k].excluded) return;
      var d = after[k].total - before[k].total;
      if (!best || Math.abs(d) > Math.abs(best.d) + 0.01 || (Math.abs(Math.abs(d) - Math.abs(best.d)) <= 0.01 && d > best.d)) best = { k: k, d: d };
    });
    state.lastMove = (best && Math.abs(best.d) >= 0.5) ? { k: best.k, d: best.d, label: label } : { none: true, label: label, qid: qid };
    save();
  }
  function setSingle(q, v) { change(function () { state.answers[q.id] = v; delete state.skipped[q.id]; }, q.title, q.id); }
  function toggleMulti(q, v) {
    change(function () {
      var cur = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
      var opt = q.options.filter(function (o) { return o.v === v; })[0];
      var i = cur.indexOf(v);
      if (i !== -1) cur.splice(i, 1);
      else if (opt.exclusive) cur = [v];
      else { cur = cur.filter(function (x) { var o = q.options.filter(function (oo) { return oo.v === x; })[0]; return !o.exclusive; }); cur.push(v); }
      if (cur.length) state.answers[q.id] = cur; else delete state.answers[q.id];
      delete state.skipped[q.id];
    }, q.title, q.id);
  }
  function skip(q) { change(function () { delete state.answers[q.id]; state.skipped[q.id] = true; }, q.title, q.id); }
  function setPriority(cid, lvl) {
    change(function () { state.answers.priorities = state.answers.priorities || {}; state.answers.priorities[cid] = lvl; }, crit(cid).name);
  }
  function isAnswered(q) { var v = state.answers[q.id]; return q.type === 'multi' ? Array.isArray(v) && v.length > 0 : v != null; }
  function answerLabel(q) {
    var v = state.answers[q.id];
    if (v == null || (Array.isArray(v) && !v.length)) return null;
    var vals = Array.isArray(v) ? v : [v];
    return vals.map(function (x) { var o = q.options.filter(function (oo) { return oo.v === x; })[0]; return o ? t(o.l) : x; }).join(', ');
  }
  function loadExample(id) {
    var x = EXAMPLES.filter(function (e) { return e.id === id; })[0]; if (!x) return;
    var prev = { answers: clone(state.answers), skipped: clone(state.skipped), step: state.step, example: state.example };
    var had = Object.keys(state.answers).length > 0;
    state.answers = S.sanitize(clone(x.answers), Q, D.CRITERIA);
    state.skipped = {}; state.prevOrder = null; state.lastMove = null; state.roadmapTab = null;
    state.step = STEPS.length - 1;
    state.example = x.label;
    go('results');
    snackbar(t('Example loaded: {name}', { name: t(x.label) }), had ? {
      actionLabel: t('Undo'),
      onAction: function () { state.answers = prev.answers; state.skipped = prev.skipped; state.example = prev.example; go('results', { step: prev.step }); announce(t('Your own answers are back.')); }
    } : null);
  }
  function restart() {
    var had = Object.keys(state.answers).length > 0 || Object.keys(state.skipped).length > 0;
    var prev = { answers: clone(state.answers), skipped: clone(state.skipped), step: state.step, view: state.view, example: state.example };
    state.answers = {}; state.skipped = {}; state.example = null; state.prevOrder = null; state.lastMove = null; state.roadmapTab = null; state.step = 0;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    go('landing');
    if (had) snackbar(t('Answers cleared'), {
      actionLabel: t('Undo'), timeout: 8000,
      onAction: function () {
        state.answers = prev.answers; state.skipped = prev.skipped; state.example = prev.example;
        go(prev.view === 'landing' ? 'landing' : prev.view, { step: prev.step });
        announce(t('Answers restored.'));
      }
    });
  }

  /* ---------- views ---------- */
  var lastRenderKey = null;
  var VIEW_TITLES = { wizard: 'Questions', results: 'Your result', method: 'Method & sources', about: 'About', country: 'Country profile' };
  function render() {
    renderChrome();
    ['landing', 'wizard', 'results', 'method', 'about', 'country'].forEach(function (v) { document.body.classList.toggle('is-' + v, state.view === v); });
    var motion = snapshotMotion();
    if (state.view === 'wizard') app.innerHTML = viewWizard();
    else if (state.view !== 'landing' && UI.views[state.view]) app.innerHTML = UI.views[state.view]();
    else { if (state.view !== 'landing') state.view = 'landing'; app.innerHTML = viewLanding(); }
    var key = state.view + ':' + (state.view === 'wizard' ? state.step : '');
    if (key === lastRenderKey) Array.prototype.forEach.call(app.querySelectorAll('.anim'), function (el) { el.classList.remove('anim'); });
    lastRenderKey = key;
    playMotion(motion);
    updateParallax();
    onScroll();
    observeDecor();
    var cTitle = state.view === 'country' && state.countryId && country(state.countryId) ? t(country(state.countryId).name) : null;
    document.title = (cTitle || (VIEW_TITLES[state.view] ? t(VIEW_TITLES[state.view]) : '')).replace(/(.+)/, '$1 – ') + 'FoundersNavigator';
  }

  /* top bar, footer and other static chrome: data-i18n="English" → textContent, data-i18n-label → aria-label */
  function renderChrome() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-label]'), function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label'))); });
    var asof = document.getElementById('asof');
    if (asof) asof.textContent = new Date(D.DATA_AS_OF + 'T00:00:00').toLocaleDateString(lang() === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    html.lang = lang();
    var lb = document.getElementById('lang-toggle');
    if (lb) {
      var de = lang() === 'de';
      lb.removeAttribute('aria-label'); lb.setAttribute('title', de ? 'Switch to English' : 'Auf Deutsch umschalten'); // name = visible label ("Deutsch"/"English")
      lb.setAttribute('lang', de ? 'en' : 'de');
      lb.querySelector('.topnav__label').textContent = de ? 'English' : 'Deutsch';
      lb.querySelector('.lang-code').textContent = de ? 'EN' : 'DE';
    }
    renderThemeButton();
    Array.prototype.forEach.call(document.querySelectorAll('.topnav [data-action]'), function (b) {
      var a = b.getAttribute('data-action');
      if (a === 'method' || a === 'about' || a === 'country') { if (state.view === a) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
    });
  }

  /* ---------- theme: system → light → dark (persisted; meta theme-color follows the surface) ---------- */
  var THEMES = ['system', 'light', 'dark'];
  var THEME_META = {
    system: { icon: 'brightness_auto', label: 'Theme: system' },
    light: { icon: 'light_mode', label: 'Theme: light' },
    dark: { icon: 'dark_mode', label: 'Theme: dark' }
  };
  function readTheme() { try { var v = localStorage.getItem(THEME_KEY); return THEMES.indexOf(v) !== -1 ? v : 'system'; } catch (e) { return 'system'; } }
  var theme = readTheme();
  function applyTheme() {
    if (theme === 'system') delete html.dataset.theme; else html.dataset.theme = theme;
    var surface = getComputedStyle(html).getPropertyValue('--surface').trim();
    Array.prototype.forEach.call(document.querySelectorAll('meta[name="theme-color"]'), function (m) {
      if (!m.hasAttribute('data-default')) m.setAttribute('data-default', m.getAttribute('content'));
      m.setAttribute('content', theme === 'system' ? m.getAttribute('data-default') : (surface || m.getAttribute('data-default')));
    });
    renderThemeButton();
  }
  function renderThemeButton() {
    var b = document.getElementById('theme-toggle'); if (!b) return;
    var next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    var lbl = t(THEME_META[theme].label) + ' – ' + t('switch to {mode}', { mode: t(next) });
    b.setAttribute('aria-label', lbl); b.title = lbl;
    b.querySelector('.msr').textContent = THEME_META[theme].icon;
  }
  function cycleTheme() {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
    applyTheme();
    announce(t(THEME_META[theme].label));
  }
  function toggleLang() {
    if (!UI.i18n || !UI.i18n.setLang) return;
    UI.i18n.setLang(lang() === 'de' ? 'en' : 'de');
    var y = window.scrollY;
    render(); window.scrollTo(0, y);
    var lb = document.getElementById('lang-toggle'); if (lb) lb.focus({ preventScroll: true });
    announce(lang() === 'de' ? 'Sprache: Deutsch' : 'Language: English');
  }

  function landingBg() {
    var pins = [[60, 540], [300, 430], [540, 390], [760, 300], [960, 240], [1160, 90]];
    var dots = pins.map(function (p, i) {
      var last = i === pins.length - 1;
      return '<g class="bg-pin' + (last ? ' bg-pin--lead' : '') + '" style="--i:' + i + '">' + (last ? '<circle class="bg-pin__ring" cx="' + p[0] + '" cy="' + p[1] + '" r="14"/>' : '') +
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (last ? 9 : 6) + '"/></g>';
    }).join('');
    function shape(cls, path) { return '<svg class="bg-shape ' + cls + '" viewBox="0 0 200 200"><path d="' + path + '"/></svg>'; }
    return '<div class="landing-bg" aria-hidden="true">' +
      '<div class="bg-grid"></div>' +
      shape('bg-cookie', shapePath(12, .07)) +
      shape('bg-clover', shapePath(4, .32, Math.PI / 4)) +
      shape('bg-burst', shapePath(8, .14)) +
      '<svg class="bg-shape bg-pill" viewBox="0 0 200 80"><rect x="2" y="2" width="196" height="76" rx="38"/></svg>' +
      '<svg class="bg-shape bg-arch" viewBox="0 0 200 200"><path d="M10 200V100a90 90 0 0 1 180 0v100z"/></svg>' +
      '<svg class="bg-route" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice"><path class="bg-route__line" d="M60 540C180 540 200 440 300 430S460 400 540 390S680 310 760 300S900 250 960 240S1100 150 1160 90"/>' + dots + '</svg>' +
      '</div>';
  }

  function viewLanding() {
    var started = Object.keys(state.answers).length > 0;
    var demo = [82, 74, 67, 59, 51, 40];
    var rows = D.COUNTRIES.map(function (c, i) {
      return '<li class="rank-item' + (i === 0 ? ' rank-item--lead' : '') + '"><div class="rank-item__top">' + avatar(c.id, i === 0) + '<span class="rank-item__name">' + esc(t(c.name)) + '</span><span class="rank-item__score" data-ckey="demo-' + c.id + '" data-count0>' + demo[i] + '</span></div>' +
        '<div class="bar"><span data-wkey="demo-' + c.id + '" style="width:' + demo[i] + '%"></span></div></li>';
    }).join('');
    var chips = D.COUNTRIES.map(function (c) {
      return '<li><button type="button" class="chip chip--filter chip--country" data-action="country" data-k="' + esc(c.id) + '" >' + avatar(c.id) + esc(t(c.name)) + '<span class="sr-only"> – ' + esc(t('country profile')) + '</span></button></li>';
    }).join('');
    var stats = [['public', D.COUNTRIES.length, 'countries'], ['tune', D.CRITERIA.length, 'criteria'], ['checklist', Q.length, 'questions'], ['lock', 0, 'data sent']].map(function (s) {
      return '<li class="stat">' + icon(s[0]) + '<b>' + s[1] + '</b><span>' + esc(t(s[2])) + '</span></li>';
    }).join('');
    var feats = [['verified', 'Evidence-based', 'Every score links to its source.'], ['person', 'Personal', 'Your answers set the weights.'], ['balance', 'Deterministic · reproducible', 'Same answers, same result. Every score traceable to a source.']].map(function (f) {
      return '<li class="feature"><span class="feature__icon">' + icon(f[0]) + '</span><h3>' + esc(t(f[1])) + '</h3><p>' + esc(t(f[2])) + '</p></li>';
    }).join('');
    var examples = EXAMPLES.length ? '<section class="examples" aria-labelledby="ex-title"><div class="examples__head"><h2 id="ex-title">' + esc(t('Try an example founder')) + '</h2><p>' + esc(t('One click fills in every answer – change anything afterwards.')) + '</p></div><ul class="examples__list">' +
      EXAMPLES.map(function (x) {
        return '<li><button type="button" class="example" data-action="example" data-k="' + esc(x.id) + '"><span class="example__icon">' + icon(x.icon) + '</span><span class="example__text"><span class="example__l">' + esc(t(x.label)) + '</span>' + (x.desc ? '<span class="example__s">' + esc(t(x.desc)) + '</span>' : '') + '</span>' + icon('arrow_forward', 'example__go') + '</button></li>';
      }).join('') + '</ul></section>' : '';
    return '<section class="landing anim">' + landingBg() +
      '<div class="hero"><div class="hero__main">' +
        '<span class="chip chip--assist">' + icon('explore') + esc(t('Founder decision helper')) + '</span>' +
        '<h1>' + t('Where should you <em>found</em> your startup?') + '</h1>' +
        '<p class="hero__lead">' + esc(t('{n} quick questions. One ranked, sourced answer.', { n: Q.length })) + '</p>' +
        '<div class="hero__cta"><button class="btn btn--filled btn--lg" type="button" data-action="start">' + esc(started ? t('Continue') : t('Find my location')) + icon('arrow_forward') + '</button>' +
        (started ? '<button class="btn btn--outlined btn--lg" type="button" data-action="results">' + esc(t('See my result')) + '</button>' : '<button class="btn btn--outlined btn--lg" type="button" data-action="method">' + esc(t('How it works')) + '</button>') + '</div>' +
        '<ul class="chips" aria-label="' + esc(t('Countries compared – open a country profile')) + '">' + chips + '</ul>' +
      '</div>' +
      '<aside class="card card--elevated preview" aria-label="' + esc(t('Example of the live ranking')) + '"><div class="card__head"><h2>' + icon('leaderboard') + esc(t('Live ranking')) + '</h2><span class="chip chip--small">' + esc(t('Example')) + '</span></div>' +
        '<ol class="rank-list">' + rows + '</ol>' +
        '<p class="preview__foot">' + icon('bolt') + esc(t('Re-scores with every click.')) + '</p>' +
      '</aside></div>' +
      examples +
      '<h2 class="sr-only">' + esc(t('At a glance')) + '</h2>' +
      '<ul class="stats">' + stats + '</ul>' +
      '<ul class="features">' + feats + '</ul>' +
      '<p class="disclaimer">' + icon('info') + esc(t('Orientation, not legal or tax advice.')) + '</p>' +
      '</section>';
  }

  function stepDone(s) { return s.kind === 'prio' ? !!state.answers.priorities : (isAnswered(s.q) || !!state.skipped[s.q.id]); }
  function viewWizard() {
    var step = STEPS[state.step];
    var res = E.evaluate(state.answers);
    var blockSteps = E.BLOCKS.map(function (b) { return STEPS.map(function (s, j) { return s.block === b.id ? j : -1; }).filter(function (j) { return j !== -1; }); });
    var blocksHtml = E.BLOCKS.map(function (b, i) {
      var idxs = blockSteps[i];
      var current = idxs.indexOf(state.step) !== -1;
      var done = !current && idxs.every(function (j) { return stepDone(STEPS[j]); });
      var lbl = t(b.name) + (done ? ' (' + t('done') + ')' : '');
      return '<button type="button" class="step' + (current ? ' step--current' : '') + (done ? ' step--done' : '') + '" data-action="goto" data-step="' + idxs[0] + '"' + (current ? ' aria-current="step"' : '') + ' aria-label="' + esc(lbl) + '"><span class="step__dot" aria-hidden="true">' + (done ? icon('check') : (i + 1)) + '</span><span>' + esc(t(b.name)) + '</span></button>';
    }).join('');
    // one progress indicator, segmented like the step rail; the current step counts as reached → 100 % on the last step
    var pct = Math.round((state.step + 1) / STEPS.length * 100);
    var segs = blockSteps.map(function (idxs, i) {
      var reached = idxs.filter(function (j) { return j <= state.step; }).length;
      var w = Math.round(reached / idxs.length * 100);
      return '<span class="progress__seg" style="flex-grow:' + idxs.length + '"><span data-wkey="prog-' + i + '" style="width:' + w + '%"></span></span>';
    }).join('');
    var block = E.BLOCKS.filter(function (b) { return b.id === step.block; })[0];
    var blockIdx = E.BLOCKS.indexOf(block) + 1;
    var body = step.kind === 'prio' ? viewPriorities(res) : viewQuestion(step.q);
    return '<section class="wizard has-bg">' + pageBg('wizard') +
      '<nav class="steps" aria-label="' + esc(t('Questionnaire sections')) + '">' + blocksHtml +
      '<p class="steps__note">' + icon('lock') + '<span>' + esc(t('Stays on this device.')) + '</span></p></nav>' +
      '<div class="wizard__main">' + viewRailMobile(res) + '<div class="qcard anim' + (state.dir === 'back' ? ' anim--back' : ' anim--fwd') + (step.kind === 'prio' ? ' qcard--prio' : '') + '" data-step="' + state.step + '">' +
        '<div class="progress" role="progressbar" aria-label="' + esc(t('Questionnaire progress')) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-valuetext="' + esc(t('Question {n} of {m}', { n: state.step + 1, m: STEPS.length })) + '">' + segs + '</div>' +
        '<div class="qhead"><p class="overline"><span>' + esc(t('Step {n} of {m}', { n: blockIdx, m: E.BLOCKS.length }) + ' · ' + t(block.name)) + '</span><span class="overline__count">' + esc(t('Question {n} of {m}', { n: state.step + 1, m: STEPS.length })) + '</span></p>' + body.head + '</div>' +
        body.main +
        '<div class="qfoot">' +
          '<button type="button" class="btn btn--text" data-action="prev">' + icon('arrow_back') + esc(t('Back')) + '</button>' +
          '<span class="qfoot__spacer"></span>' +
          (step.kind === 'q' ? '<button type="button" class="btn btn--text" data-action="skip">' + esc(t('Skip')) + '</button>' : '') +
          '<button type="button" class="btn btn--filled" data-action="next">' + esc(state.step === STEPS.length - 1 ? t('See result') : t('Continue')) + icon('arrow_forward') + '</button>' +
        '</div>' +
      '</div></div>' +
      viewRail(res) +
      '</section>';
  }

  function viewQuestion(q) {
    var multi = q.type === 'multi';
    var v = state.answers[q.id];
    var anyOn = !multi && q.options.some(function (o) { return v === o.v; });
    var opts = q.options.map(function (o, i) {
      var on = multi ? (Array.isArray(v) && v.indexOf(o.v) !== -1) : v === o.v;
      var mark = multi ? (on ? 'check_box' : 'check_box_outline_blank') : (on ? 'radio_button_checked' : 'radio_button_unchecked');
      var tab = multi ? '0' : ((on || (!anyOn && i === 0)) ? '0' : '-1');
      return '<button type="button" class="option" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + on + '" tabindex="' + tab + '" data-action="' + (multi ? 'toggle' : 'pick') + '" data-v="' + esc(o.v) + '">' +
        icon(mark, 'option__check') + '<span class="option__text"><span class="option__l">' + esc(t(o.l)) + '</span>' + (o.s ? '<span class="option__s">' + esc(t(o.s)) + '</span>' : '') + '</span></button>';
    }).join('');
    var why = WHY[q.id];
    return {
      head: '<h1 id="q-title" tabindex="-1">' + esc(t(q.title)) + '</h1>' +
        ((q.help || multi) ? '<p class="qhead__help" id="q-help">' + (q.help ? '<span>' + esc(t(q.help)) + '</span>' : '') + (multi ? '<span class="chip chip--small chip--tonal">' + icon('done_all') + esc(t('Select all that apply')) + '</span>' : '') + '</p>' : '') +
        (why ? '<p class="qhead__why">' + icon('lightbulb') + '<span><strong>' + esc(t('Why we ask:')) + '</strong> ' + esc(t(why)) + '</span></p>' : '') +
        (state.skipped[q.id] ? '<p class="skipped-note">' + icon('block') + esc(t('Skipped – no effect on the result.')) + '</p>' : ''),
      main: '<div class="options" role="' + (multi ? 'group' : 'radiogroup') + '" aria-labelledby="q-title"' + (q.help ? ' aria-describedby="q-help"' : '') + '>' + opts + '</div>'
    };
  }

  var LEVEL_SHORT = ['Not', 'Somewhat', 'Important', 'Crucial'];
  var LEVEL_TINY = ['Not', 'Some', 'Imp.', 'Crucial'];
  function prioRows(withHint) {
    var pr = state.answers.priorities || {};
    var W = withHint ? E.computeWeights(state.answers) : null;
    return D.CRITERIA.map(function (c) {
      var lvl = typeof pr[c.id] === 'number' ? pr[c.id] : E.defaultLevel(c.id, state.answers);
      var key = (withHint ? 'q-' : 'r-') + c.id;
      var btns = E.LEVELS.map(function (L) {
        var on = lvl === L.v;
        return '<button type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-action="prio" data-c="' + c.id + '" data-level="' + L.v + '" aria-label="' + esc(t(L.l)) + '" title="' + esc(t(L.l)) + '">' +
          (on ? icon('check') : '') + '<span class="seg__full">' + esc(t(LEVEL_SHORT[L.v])) + '</span><span class="seg__short" aria-hidden="true">' + esc(t(LEVEL_TINY[L.v])) + '</span></button>';
      }).join('');
      var open = !!state.openInfo[key];
      var w = W && W[c.id];
      var bonus = w && w.bonus > 0 && w.value > 0 ? '<span class="chip chip--small chip--tonal prio__bonus" title="' + esc(w.reasons.map(t).join('; ')) + '">' + icon('add') + esc(t('+1 from your answers')) + '<span class="sr-only">: ' + esc(w.reasons.map(t).join('; ')) + '</span></span>' : '';
      var info = c.info ? '<button type="button" class="iconbtn iconbtn--small" data-action="info" data-key="' + key + '" aria-expanded="' + open + '" aria-controls="info-' + key + '" title="' + esc(t(c.info)) + '">' + icon('info') + '<span class="sr-only">' + esc(t('What does “{name}” mean?', { name: t(c.name) })) + '</span></button>' : '';
      return '<div class="prio__row"><div class="prio__label"><span class="prio__icon">' + critIcon(c.id) + '</span><span class="prio__text"><strong id="pl-' + key + '">' + esc(t(c.name)) + '</strong>' + (withHint ? '<span>' + esc(t(c.hint)) + '</span>' : '') + bonus + '</span>' + info + '</div>' +
        (open ? '<p class="infopanel" id="info-' + key + '">' + esc(t(c.info)) + '</p>' : '') + '<div class="seg" role="radiogroup" aria-labelledby="pl-' + key + '">' + btns + '</div></div>';
    }).join('');
  }
  function viewPriorities(res) {
    var bumped = D.CRITERIA.filter(function (c) { var w = res.weights[c.id]; return w && w.bonus > 0 && w.value > 0; }).length;
    return {
      head: '<h1 id="q-title" tabindex="-1">' + esc(t('How much does each goal matter?')) + '</h1><p class="qhead__help">' + esc(t('Defaults are pre-set – change only what matters.')) + '</p>' +
        '<p class="qhead__why">' + icon('lightbulb') + '<span><strong>' + esc(t('Why we ask:')) + '</strong> ' + esc(bumped ? t('Your answers already raised {n} goals by one level (+1). Here you set the base level.', { n: bumped }) : t('Your priorities are the weights of the ranking. Here you set the base level.')) + '</span></p>',
      main: '<div class="prio prio--grid">' + prioRows(true) + '</div>'
    };
  }

  function rankItems(res, keyPrefix, withMoves) {
    var prev = state.prevOrder;
    return res.rows.map(function (r, i) {
      var mv = '';
      if (withMoves && prev && prev[r.id]) {
        var d = prev[r.id].pos - i;
        if (d > 0) mv = '<span class="rank-item__move move-up">' + icon('arrow_upward') + d + '<span class="sr-only"> ' + esc(t('up')) + '</span></span>';
        else if (d < 0) mv = '<span class="rank-item__move move-down">' + icon('arrow_downward') + (-d) + '<span class="sr-only"> ' + esc(t('down')) + '</span></span>';
      }
      if (!mv) mv = '<span class="rank-item__move" aria-hidden="true"></span>';
      var lead = i === 0 && !r.excluded;
      var flip = withMoves ? ' data-flip="' + keyPrefix + r.id + '"' : '';
      if (r.excluded) {
        // excluded countries are not ranked: no fit number and no bar, only the reason (as on the results page)
        var divider = (i === 0 || !res.rows[i - 1].excluded) ? '<li class="rank-divider" aria-hidden="true"><span>' + esc(t('Not ranked')) + '</span></li>' : '';
        return divider + '<li class="rank-item rank-item--excluded"' + flip + '>' +
          '<div class="rank-item__top">' + avatar(r.id) + '<span class="rank-item__name">' + esc(t(r.country.name)) + ' <span class="sr-only">(' + esc(t('not ranked')) + ')</span><small class="rank-item__reason">' + esc(t(r.excluded)) + '</small></span>' + mv + '</div></li>';
      }
      return '<li class="rank-item' + (lead ? ' rank-item--lead' : '') + '"' + flip + '>' +
        '<div class="rank-item__top">' + avatar(r.id, lead) + '<span class="rank-item__name">' + esc(t(r.country.name)) + '</span><span class="rank-item__score" data-ckey="' + keyPrefix + r.id + '">' + r.score + '</span>' + mv + '</div>' +
        '<div class="bar"><span data-wkey="' + keyPrefix + r.id + '" style="width:' + r.score + '%"></span></div></li>';
    }).join('');
  }
  function viewRail(res) {
    var why = '';
    if (state.lastMove && state.lastMove.none) {
      var reason = t('This answer does not affect any score for your current profile.');
      if (state.lastMove.qid === 'citizenship' && Array.isArray(state.answers.citizenship) && state.answers.citizenship.length > 1) reason = t('This passport gives no additional rights compared with your other one(s).');
      else if (state.lastMove.qid) { var ef = (res.effects || []).filter(function (e) { return e.q === state.lastMove.qid; })[0]; if (ef) reason = UI.effectText(ef); }
      why = '<p class="rail__why">' + icon('remove') + '<span><strong>' + esc(t('No change:')) + '</strong> ' + esc(reason) + '</span></p>';
    } else if (state.lastMove) {
      var c = country(state.lastMove.k), pts = Math.abs(Math.round(state.lastMove.d));
      why = '<p class="rail__why">' + icon(state.lastMove.d > 0 ? 'trending_up' : 'trending_down') + '<span><strong>' + esc(t(c.name)) + ' ' + (state.lastMove.d > 0 ? '+' : '−') + pts + '</strong> ' + esc(t('after “{q}”', { q: t(state.lastMove.label) })) + '</span></p>';
    } else {
      why = '<p class="rail__why">' + icon('bolt') + '<span>' + esc(t('Every click re-scores all six.')) + '</span></p>';
    }
    return '<aside class="rail" aria-labelledby="rail-title"><div class="card__head"><h2 id="rail-title">' + icon('leaderboard') + esc(t('Live ranking')) + '</h2><span class="rail__meta">' + esc(t('Match score')) + '</span></div><ol class="rank-list">' + rankItems(res, 'rail-', true) + '</ol>' + why +
      '<p class="rail__foot">' + esc(t('{n} of {m} answered', { n: res.answered, m: res.totalQuestions })) + '</p></aside>';
  }
  /* compact live ranking for narrow screens: collapsed pill, tap to expand */
  function viewRailMobile(res) {
    var leader = res.top, open = !!state.railOpen;
    var rest = res.rows.filter(function (r) { return !r.excluded && (!leader || r.id !== leader.id); }).slice(0, 3)
      .map(function (r) { return '<span>' + esc(r.id) + ' ' + r.score + '</span>'; }).join('');
    return '<div class="rail-mobile' + (open ? ' is-open' : '') + '">' +
      '<button type="button" class="rail-mobile__toggle" data-action="railToggle" aria-expanded="' + open + '" aria-controls="rail-mobile-panel">' +
        icon('leaderboard', 'rail-mobile__icon') +
        '<span class="rail-mobile__lead">' + (leader ? avatar(leader.id, true) + '<span><span class="sr-only">' + esc(t('Leading:')) + ' </span><b>' + esc(t(leader.country.name)) + '</b> <span class="rail-mobile__score">' + leader.score + '</span></span>' : '–') + '</span>' +
        '<span class="rail-mobile__list" aria-hidden="true">' + rest + '</span>' +
        '<span class="sr-only">' + esc(open ? t('Hide full ranking') : t('Show full ranking')) + '</span>' +
        icon('expand_more', 'rail-mobile__chev') +
      '</button>' +
      (open ? '<div class="rail-mobile__panel" id="rail-mobile-panel"><p class="rail__meta">' + esc(t('Match score')) + '</p><ol class="rank-list">' + rankItems(res, 'mrail-', false) + '</ol></div>' : '<div id="rail-mobile-panel" hidden></div>') +
      '</div>';
  }

  /* ---------- events ---------- */
  var advanceTimer = null;
  function isPointerClick(e) { return !!e && e.detail > 0; } // keyboard-activated clicks have detail 0
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.getAttribute('data-action');
    var step = STEPS[state.step];
    switch (a) {
      case 'home': e.preventDefault(); go('landing'); break;
      case 'start': go('wizard', { step: firstOpenStep() }); break;
      case 'method': go('method'); break;
      case 'results': go('results'); break;
      case 'restart': clearTimeout(advanceTimer); restart(); break;
      case 'example': loadExample(el.getAttribute('data-k')); break;
      case 'theme': cycleTheme(); break;
      case 'lang': toggleLang(); break;
      case 'railToggle':
        state.railOpen = !state.railOpen;
        var ys = window.scrollY; render(); window.scrollTo(0, ys);
        var tg = app.querySelector('.rail-mobile__toggle'); if (tg) tg.focus({ preventScroll: true });
        break;
      case 'goto': state.dir = (parseInt(el.getAttribute('data-step'), 10) || 0) < state.step && state.view === 'wizard' ? 'back' : 'fwd'; go('wizard', { step: parseInt(el.getAttribute('data-step'), 10) || 0 }); break;
      case 'next': clearTimeout(advanceTimer); nextStep(); break;
      case 'prev': clearTimeout(advanceTimer); prevStep(); break;
      case 'skip': clearTimeout(advanceTimer); skip(step.q); announce(t('Skipped.')); nextStep(); break;
      case 'pick':
        if (!step || step.kind !== 'q') break;
        var v = el.getAttribute('data-v');
        var psel = '[data-action="pick"][data-v="' + v + '"]';
        setSingle(step.q, v); render(); flash(psel);
        var pb = app.querySelector(psel); if (pb) pb.focus({ preventScroll: true });
        announce(t('{answer} selected.', { answer: answerLabel(step.q) }) + ' ' + liveSummary());
        clearTimeout(advanceTimer);
        // auto-advance only for pointer clicks; keyboard users (Enter/Space/arrows → detail 0) stay and press Continue
        if (isPointerClick(e)) advanceTimer = setTimeout(nextStep, 380);
        break;
      case 'toggle':
        if (!step || step.kind !== 'q') break;
        toggleMulti(step.q, el.getAttribute('data-v')); render(); flash('[data-action="toggle"][data-v="' + el.getAttribute('data-v') + '"]');
        var sel = app.querySelector('[data-action="toggle"][data-v="' + el.getAttribute('data-v') + '"]'); if (sel) sel.focus({ preventScroll: true });
        announce(liveSummary());
        break;
      case 'prio':
        var y = window.scrollY;
        setPriority(el.getAttribute('data-c'), parseInt(el.getAttribute('data-level'), 10)); render();
        window.scrollTo(0, y);
        var bsel = '[data-action="prio"][data-c="' + el.getAttribute('data-c') + '"][data-level="' + el.getAttribute('data-level') + '"]';
        flash(bsel); var b = app.querySelector(bsel); if (b) b.focus({ preventScroll: true });
        announce(liveSummary());
        break;
      case 'info':
        var ik = el.getAttribute('data-key'); state.openInfo[ik] = !state.openInfo[ik];
        var y2 = window.scrollY; render(); window.scrollTo(0, y2);
        var ib = app.querySelector('[data-action="info"][data-key="' + ik + '"]'); if (ib) ib.focus({ preventScroll: true });
        var ip = document.getElementById('info-' + ik); if (ip) ip.classList.add('is-changed');
        break;
      case 'close': closeDialog(); break;
      default:
        if (UI.actions[a]) UI.actions[a](el, e);
        else if (UI.views[a]) { e.preventDefault(); go(a); }
    }
  });
  /* radio groups (options, segmented priorities): roving tabindex + arrow keys select (WAI-ARIA radio pattern) */
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var r = e.target.closest && e.target.closest('[role="radio"]'); if (!r) return;
    var g = r.closest('[role="radiogroup"]'); if (!g) return;
    var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    var items = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]'));
    var i = items.indexOf(r), n;
    if (step) n = (i + step + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    else return;
    e.preventDefault();
    clearTimeout(advanceTimer);
    items[n].click(); // detail 0 → selects without auto-advance; the handler restores focus on the new radio
  });
  /* skip link: move focus to the view's heading (or main) */
  var skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.addEventListener('click', function (e) { e.preventDefault(); if (!focusH1()) document.getElementById('main').focus(); });

  /* dialog: native showModal() traps focus; on close, focus returns to the control that opened it */
  var lastOutside = null;
  document.addEventListener('focusin', function (e) {
    if (dialog.contains(e.target) || (snack && snack.contains(e.target))) return;
    var el = e.target;
    lastOutside = { el: el, action: el.getAttribute && el.getAttribute('data-action'), k: el.getAttribute && el.getAttribute('data-k'), c: el.getAttribute && el.getAttribute('data-c') };
  });
  dialog.addEventListener('close', function () {
    var o = lastOutside; if (!o) return;
    var target = o.el && document.contains(o.el) ? o.el : null;
    if (!target && o.action) {
      var s = '[data-action="' + o.action + '"]' + (o.k ? '[data-k="' + o.k + '"]' : '') + (o.c ? '[data-c="' + o.c + '"]' : '');
      target = document.querySelector(s);
    }
    if (target) target.focus({ preventScroll: true });
  });
  function closeDialog() {
    if (!dialog.open) return;
    if (reduceMotion) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    setTimeout(function () { dialog.classList.remove('is-closing'); dialog.close(); }, 200);
  }
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
  dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeDialog(); });

  /* glass top bar while content scrolls underneath (with hysteresis against flicker) */
  var topbar = document.querySelector('.topbar');
  function updateBars() {
    if (!topbar) return;
    var y = window.scrollY;
    var top = topbar.classList.contains('topbar--scrolled');
    if (!top && y > 12) topbar.classList.add('topbar--scrolled');
    else if (top && y < 2) topbar.classList.remove('topbar--scrolled');
  }
  /* subtle parallax for the landing background layers */
  function updateParallax() {
    if (reduceMotion) return;
    var bg = app.querySelector('.landing-bg, .page-bg');
    if (bg) bg.style.setProperty('--scroll', window.scrollY.toFixed(1) + 'px');
  }
  function onScroll() { updateBars(); updateParallax(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* pause ambient decor when it is off-screen or the tab is hidden (global.css: .is-paused hook) */
  var decorIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
  }) : null;
  function observeDecor() {
    if (!decorIO) return;
    decorIO.disconnect();
    qa('.landing-bg, .page-bg, .winner__decor').forEach(function (el) { decorIO.observe(el); });
  }
  document.addEventListener('visibilitychange', function () { document.body.classList.toggle('is-paused', document.hidden); });

  /* icon font: hide ligature names until the font is ready (styles.css: html:not(.fonts-ready) .msr) */
  (function () {
    var done = function () { html.classList.add('fonts-ready'); };
    if (!document.fonts || !document.fonts.load) { done(); return; }
    setTimeout(done, 3000); // never keep icons hidden if the font fails to load
    var probe = function () { document.fonts.load('24px "Material Symbols Rounded"', 'home').then(function () { return document.fonts.ready; }).then(done, done); };
    // the icon stylesheet loads non-blocking (media="print" → "all" on load): wait for it before probing the font
    var link = document.querySelector('link[href*="Material+Symbols"]');
    if (link && link.media === 'print') link.addEventListener('load', function () { setTimeout(probe, 0); });
    else probe();
  })();

  function liveSummary() {
    var r = E.evaluate(state.answers, true);
    if (!r.top) return '';
    var prevLead = null, prev = state.prevOrder;
    if (prev) Object.keys(prev).forEach(function (k) { if (!prev[k].excluded && (prevLead === null || prev[k].pos < prev[prevLead].pos)) prevLead = k; });
    var name = t(r.top.country.name);
    return prevLead && prevLead !== r.top.id ? t('{c} now leads with {s}.', { c: name, s: r.top.score }) : t('{c} leads with {s}.', { c: name, s: r.top.score });
  }
  function firstOpenStep() {
    for (var i = 0; i < STEPS.length; i++) {
      var s = STEPS[i];
      if (s.kind === 'q' && !isAnswered(s.q) && !state.skipped[s.q.id]) return i;
      if (s.kind === 'prio' && !state.answers.priorities) return i;
    }
    return 0;
  }

  /* ---------- shared context for view modules (see ui.js) ---------- */
  UI.app = {
    state: state, root: app, dialog: dialog, Q: Q, STEPS: STEPS, EXAMPLES: EXAMPLES,
    evaluate: function () { return E.evaluate(state.answers); },
    render: render, go: go, save: save, announce: announce, flash: flash, snackbar: snackbar, encodeShare: encodeShare,
    prioRows: prioRows, answerLabel: answerLabel, closeDialog: closeDialog, isAnswered: isAnswered, t: t
  };

  /* ---------- boot ---------- */
  applyTheme();
  load();
  readShare();
  render();
  window.addEventListener('hashchange', function () { if (readShare()) { save(); render(); } });
})();
