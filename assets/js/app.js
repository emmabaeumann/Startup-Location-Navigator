/* FoundersNavigator – UI layer (vanilla JS, no build step) · Material 3 */
(function () {
  'use strict';
  var D = window.SSN_DATA, E = window.SSN_ENGINE, S = window.SSN_STATE;
  var Q = E.QUESTIONS;
  var STORE_KEY = 'foundersnavigator-v1';
  var STEPS = Q.map(function (q) { return { kind: 'q', q: q, block: q.block }; }).concat([{ kind: 'prio', block: 'priorities' }]);
  var app = document.getElementById('app');
  var srStatus = document.getElementById('sr-status');
  var dialog = document.getElementById('detail');

  var state = { view: 'landing', step: 0, answers: {}, skipped: {}, roadmapTab: null, lastMove: null, prevOrder: null, openInfo: {} };

  /* ---------- utils ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function country(id) { return D.COUNTRIES.filter(function (c) { return c.id === id; })[0]; }
  function crit(id) { return D.CRITERIA.filter(function (c) { return c.id === id; })[0]; }
  function src(id) { return D.SOURCES[id]; }
  function srcLink(id, label) {
    var s = src(id); if (!s) return '';
    return '<a class="srclink" href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + icon('open_in_new') + esc(label || s.p) + '<span class="sr-only"> (opens in a new tab)</span></a>';
  }
  /* Material Symbols Rounded (ligature font) */
  function icon(name, cls) { return '<span class="msr' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + name + '</span>'; }
  var CRIT_ICONS = { setup: 'rocket_launch', corpTax: 'percent', exitTax: 'sell', vc: 'trending_up', grants: 'savings', talent: 'hub', esop: 'groups', cost: 'shopping_cart', market: 'storefront', residence: 'home_pin' };
  function critIcon(id) { return icon(CRIT_ICONS[id] || 'radio_button_checked'); }
  function avatar(code, lead) { return '<span class="avatar' + (lead ? ' avatar--lead' : '') + '">' + esc(code) + '</span>'; }
  function dots(v) {
    var out = '<span class="dots" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) out += '<i class="' + (v >= i ? 'on' : (v >= i - 0.5 ? 'half' : '')) + '"></i>';
    return out + '</span>';
  }
  function wdots(w) {
    var lvl = w.value === 0 ? 0 : Math.min(w.level, 3);
    var out = '<span class="wdots" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) out += '<i class="' + (lvl >= i ? 'on' : '') + '"></i>';
    if (w.bonus) out += '<b class="wplus">+</b>';
    return out + '</span>';
  }
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
  var RIPPLE_SEL = '.btn, .option, .chip--filter, .seg button, .step, .answer, .cellbtn, .iconbtn';
  document.addEventListener('pointerdown', function (e) {
    lastPt = { x: e.clientX, y: e.clientY };
    var t = e.target.closest(RIPPLE_SEL); if (!t) return;
    var out = ripple(t, lastPt); if (!out) return;
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

  function announce(msg) { srStatus.textContent = ''; setTimeout(function () { srStatus.textContent = msg; }, 30); }

  /* ---------- persistence ---------- */
  // State persistence lives in state.js (pure, tested); these wrappers bind it to this page.
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function save() { S.save(storage(), STORE_KEY, state); }
  function load() {
    var s = S.load(storage(), STORE_KEY, { questions: Q, criteria: D.CRITERIA, maxStep: STEPS.length - 1 });
    state.answers = s.answers; state.skipped = s.skipped; state.step = s.step; state.view = s.view;
  }
  function encodeShare() {
    var json = JSON.stringify({ v: 1, a: state.answers });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function readShare() {
    var a = S.readShare(location.hash, Q, D.CRITERIA);
    if (!a) return false;
    state.answers = a; state.view = 'results'; return true;
  }

  /* ---------- navigation ---------- */
  function go(view, opts) {
    state.view = view;
    if (opts && typeof opts.step === 'number') state.step = opts.step;
    save(); render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    var h = app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function nextStep() {
    state.dir = 'fwd';
    if (state.step < STEPS.length - 1) { state.step++; save(); render(); focusHeading(); }
    else go('results');
  }
  function prevStep() { state.dir = 'back'; if (state.step > 0) { state.step--; save(); render(); focusHeading(); } else go('landing'); }
  function focusHeading() { var h = app.querySelector('.qhead h1'); if (h) h.focus({ preventScroll: true }); var c = app.querySelector('.qcard'); if (c && c.getBoundingClientRect().top < 60) window.scrollTo({ top: 0 }); }

  /* ---------- answers ---------- */
  function snapshotOrder() { var r = E.evaluate(state.answers); var m = {}; r.rows.forEach(function (x, i) { m[x.id] = { pos: i, total: x.total, excluded: !!x.excluded }; }); return m; }
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
    return vals.map(function (x) { var o = q.options.filter(function (oo) { return oo.v === x; })[0]; return o ? o.l : x; }).join(', ');
  }

  /* ---------- views ---------- */
  var lastRenderKey = null;
  function render() {
    document.getElementById('asof').textContent = new Date(D.DATA_AS_OF + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    ['landing', 'wizard', 'results', 'method'].forEach(function (v) { document.body.classList.toggle('is-' + v, state.view === v); });
    var motion = snapshotMotion();
    if (state.view === 'wizard') app.innerHTML = viewWizard();
    else if (state.view === 'results') app.innerHTML = viewResults();
    else if (state.view === 'method') app.innerHTML = viewMethod();
    else app.innerHTML = viewLanding();
    var key = state.view + ':' + (state.view === 'wizard' ? state.step : '');
    if (key === lastRenderKey) Array.prototype.forEach.call(app.querySelectorAll('.anim'), function (el) { el.classList.remove('anim'); });
    lastRenderKey = key;
    playMotion(motion);
    if (typeof updateParallax === 'function') updateParallax();
    if (typeof onScroll === 'function') onScroll();
    document.title = ({ wizard: 'Questions – ', results: 'Your result – ', method: 'Method & sources – ' }[state.view] || '') + 'FoundersNavigator';
  }

  /* ---------- landing background: M3 expressive shapes + a route through six pins ---------- */
  function shapePath(lobes, amp, rot) {
    // polar "rounded polygon" like the M3 shape library (cookie, clover, burst); viewBox 0 0 200 200
    var d = '', N = 180;
    for (var i = 0; i <= N; i++) {
      var t = i / N * Math.PI * 2;
      var r = 96 * (1 + amp * Math.cos(lobes * (t + (rot || 0)))) / (1 + amp);
      d += (i ? 'L' : 'M') + (100 + r * Math.cos(t)).toFixed(1) + ' ' + (100 + r * Math.sin(t)).toFixed(1);
    }
    return d + 'Z';
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

  function pageBg(variant) {
    function shape(cls, path) { return '<svg class="bg-shape ' + cls + '" viewBox="0 0 200 200"><path d="' + path + '"/></svg>'; }
    var parts = {
      wizard: shape('pg-clover', shapePath(4, .32, Math.PI / 4)) + shape('pg-cookie pg-cookie--soft', shapePath(12, .07)) +
        '<svg class="bg-shape pg-pill" viewBox="0 0 200 80"><rect x="2" y="2" width="196" height="76" rx="38"/></svg>',
      results: shape('pg-cookie', shapePath(12, .07)) + shape('pg-burst', shapePath(8, .14)) +
        '<svg class="bg-shape pg-arch" viewBox="0 0 200 200"><path d="M10 200V100a90 90 0 0 1 180 0v100z"/></svg>' +
        shape('pg-clover pg-clover--low', shapePath(4, .32, Math.PI / 4)) +
        '<svg class="bg-shape pg-pill pg-pill--low" viewBox="0 0 200 80"><rect x="2" y="2" width="196" height="76" rx="38"/></svg>' +
        shape('pg-cookie pg-cookie--low', shapePath(12, .07)),
      method: '<svg class="bg-shape pg-arch pg-arch--method" viewBox="0 0 200 200"><path d="M10 200V100a90 90 0 0 1 180 0v100z"/></svg>' +
        shape('pg-burst pg-burst--method', shapePath(8, .14)) + shape('pg-clover pg-clover--method', shapePath(4, .32, Math.PI / 4)) +
        '<svg class="bg-shape pg-pill pg-pill--method" viewBox="0 0 200 80"><rect x="2" y="2" width="196" height="76" rx="38"/></svg>' +
        shape('pg-cookie pg-cookie--method', shapePath(12, .07))
    }[variant] || '';
    return '<div class="page-bg page-bg--' + variant + '" aria-hidden="true"><div class="bg-grid"></div>' + parts + '</div>';
  }

  function viewLanding() {
    var started = Object.keys(state.answers).length > 0;
    var demo = [82, 74, 67, 59, 51, 40];
    var rows = D.COUNTRIES.map(function (c, i) {
      return '<li class="rank-item' + (i === 0 ? ' rank-item--lead' : '') + '"><div class="rank-item__top">' + avatar(c.id, i === 0) + '<span class="rank-item__name">' + esc(c.name) + '</span><span class="rank-item__score" data-ckey="demo-' + c.id + '" data-count0>' + demo[i] + '</span></div>' +
        '<div class="bar"><span data-wkey="demo-' + c.id + '" style="width:' + demo[i] + '%"></span></div></li>';
    }).join('');
    var chips = D.COUNTRIES.map(function (c) { return '<li class="chip">' + avatar(c.id) + esc(c.name) + '</li>'; }).join('');
    var stats = [['public', '6', 'countries'], ['tune', '10', 'criteria'], ['timer', '3', 'minutes'], ['lock', '0', 'data sent']].map(function (s) {
      return '<li class="stat">' + icon(s[0]) + '<b>' + s[1] + '</b><span>' + s[2] + '</span></li>';
    }).join('');
    var feats = [['verified', 'Evidence-based', 'Every score links to its source.'], ['person', 'Personal', 'Your answers set the weights.'], ['balance', 'Deterministic', 'No AI. Same answers, same result.']].map(function (f) {
      return '<li class="feature"><span class="feature__icon">' + icon(f[0]) + '</span><h3>' + f[1] + '</h3><p>' + f[2] + '</p></li>';
    }).join('');
    return '<section class="landing anim">' + landingBg() +
      '<div class="hero"><div class="hero__main">' +
        '<span class="chip chip--assist">' + icon('explore') + 'Founder decision helper</span>' +
        '<h1>Where should you <em>found</em> your startup?</h1>' +
        '<p class="hero__lead">Ten quick questions. One ranked, sourced answer.</p>' +
        '<div class="hero__cta"><button class="btn btn--filled btn--lg" type="button" data-action="start">' + (started ? 'Continue' : 'Find my location') + icon('arrow_forward') + '</button>' +
        (started ? '<button class="btn btn--outlined btn--lg" type="button" data-action="results">See my result</button>' : '<button class="btn btn--outlined btn--lg" type="button" data-action="method">How it works</button>') + '</div>' +
        '<ul class="chips" aria-label="Countries compared">' + chips + '</ul>' +
      '</div>' +
      '<aside class="card card--elevated preview" aria-label="Example of the live ranking"><div class="card__head"><h2>' + icon('leaderboard') + 'Live ranking</h2><span class="chip chip--small">Example</span></div>' +
        '<ol class="rank-list">' + rows + '</ol>' +
        '<p class="preview__foot">' + icon('bolt') + 'Re-scores with every click.</p>' +
      '</aside></div>' +
      '<ul class="stats" aria-label="At a glance">' + stats + '</ul>' +
      '<ul class="features">' + feats + '</ul>' +
      '<p class="disclaimer">' + icon('info') + 'Orientation, not legal or tax advice.</p>' +
      '</section>';
  }

  function viewWizard() {
    var step = STEPS[state.step];
    var res = E.evaluate(state.answers);
    var blocksHtml = E.BLOCKS.map(function (b, i) {
      var idxs = STEPS.map(function (s, j) { return s.block === b.id ? j : -1; }).filter(function (j) { return j !== -1; });
      var current = idxs.indexOf(state.step) !== -1;
      var done = !current && idxs.every(function (j) { var s = STEPS[j]; return s.kind === 'prio' ? !!state.answers.priorities : (isAnswered(s.q) || state.skipped[s.q.id]); });
      return '<button type="button" class="step' + (current ? ' step--current' : '') + (done ? ' step--done' : '') + '" data-action="goto" data-step="' + idxs[0] + '"' + (current ? ' aria-current="step"' : '') + '><span class="step__dot">' + (done ? icon('check') : (i + 1)) + '</span>' + esc(b.name) + '</button>';
    }).join('');
    var pct = Math.round((state.step) / STEPS.length * 100);
    var block = E.BLOCKS.filter(function (b) { return b.id === step.block; })[0];
    var blockIdx = E.BLOCKS.indexOf(block) + 1;
    var body = step.kind === 'prio' ? viewPriorities() : viewQuestion(step.q);
    var leader = res.top;
    var mobile = '<div class="rail-mobile" role="note">' + icon('leaderboard') + '<span>' + (leader ? avatar(leader.id, true) + '<b>' + esc(leader.country.name) + '</b> ' + leader.score : '–') + '</span><span class="rail-mobile__list">' +
      res.rows.slice(1, 4).filter(function (r) { return !r.excluded; }).map(function (r) { return r.id + ' ' + r.score; }).join(' · ') + '</span></div>';
    return '<section class="wizard has-bg">' + pageBg('wizard') +
      '<nav class="steps" aria-label="Progress">' + blocksHtml +
      '<p class="steps__note">' + icon('lock') + '<span>Stays on this device.</span></p></nav>' +
      '<div>' + mobile + '<div class="qcard anim' + (state.dir === 'back' ? ' anim--back' : ' anim--fwd') + '" data-step="' + state.step + '">' +
        '<div class="progress" role="progressbar" aria-label="Questionnaire progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span data-wkey="progress" style="width:' + Math.max(pct, 3) + '%"></span></div>' +
        '<div class="qhead"><span class="overline">Step ' + blockIdx + ' of ' + E.BLOCKS.length + ' · ' + esc(block.name) + '</span>' + body.head + '</div>' +
        body.main +
        '<div class="qfoot">' +
          '<button type="button" class="btn btn--text" data-action="prev">' + icon('arrow_back') + 'Back</button>' +
          '<span class="qfoot__spacer"></span>' +
          (step.kind === 'q' ? '<button type="button" class="btn btn--text" data-action="skip">Skip</button>' : '') +
          '<button type="button" class="btn btn--filled" data-action="next">' + (state.step === STEPS.length - 1 ? 'See result' : 'Continue') + icon('arrow_forward') + '</button>' +
        '</div>' +
      '</div></div>' +
      viewRail(res) +
      '</section>';
  }

  function viewQuestion(q) {
    var multi = q.type === 'multi';
    var v = state.answers[q.id];
    var opts = q.options.map(function (o) {
      var on = multi ? (Array.isArray(v) && v.indexOf(o.v) !== -1) : v === o.v;
      var mark = multi ? (on ? 'check_box' : 'check_box_outline_blank') : (on ? 'radio_button_checked' : 'radio_button_unchecked');
      return '<button type="button" class="option" aria-pressed="' + on + '" data-action="' + (multi ? 'toggle' : 'pick') + '" data-v="' + esc(o.v) + '">' +
        icon(mark, 'option__check') + '<span class="option__text"><span class="option__l">' + esc(o.l) + '</span>' + (o.s ? '<span class="option__s">' + esc(o.s) + '</span>' : '') + '</span></button>';
    }).join('');
    return {
      head: '<h1 tabindex="-1">' + esc(q.title) + '</h1>' +
        ((q.help || multi) ? '<p class="qhead__help">' + (q.help ? esc(q.help) : '') + (multi ? '<span class="chip chip--small chip--tonal">' + icon('done_all') + 'Select all that apply</span>' : '') + '</p>' : '') +
        (state.skipped[q.id] ? '<p class="skipped-note">' + icon('block') + 'Skipped – no effect on the result.</p>' : ''),
      main: '<div class="options" role="group" aria-label="' + esc(q.title) + (multi ? ' (select all that apply)' : '') + '">' + opts + '</div>'
    };
  }

  var LEVEL_SHORT = ['Not', 'Somewhat', 'Important', 'Crucial'];
  function prioRows(withHint) {
    var pr = state.answers.priorities || {};
    return D.CRITERIA.map(function (c) {
      var lvl = typeof pr[c.id] === 'number' ? pr[c.id] : E.defaultLevel(c.id, state.answers);
      var btns = E.LEVELS.map(function (L) {
        var on = lvl === L.v;
        return '<button type="button" data-action="prio" data-c="' + c.id + '" data-level="' + L.v + '" aria-pressed="' + on + '" aria-label="' + esc(L.l) + '">' + (on ? icon('check') : '') + LEVEL_SHORT[L.v] + '</button>';
      }).join('');
      var key = (withHint ? 'q-' : 'r-') + c.id;
      var open = !!state.openInfo[key];
      var info = c.info ? '<button type="button" class="iconbtn iconbtn--small" data-action="info" data-key="' + key + '" aria-expanded="' + open + '" aria-controls="info-' + key + '" title="' + esc(c.info) + '">' + icon('info') + '<span class="sr-only">What does ' + esc(c.name) + ' mean?</span></button>' : '';
      return '<div class="prio__row"><div class="prio__label"><span class="prio__icon">' + critIcon(c.id) + '</span><span class="prio__text"><strong id="pl-' + key + '">' + esc(c.name) + '</strong>' + (withHint ? '<span>' + esc(c.hint) + '</span>' : '') + '</span>' + info + '</div>' +
        (open ? '<p class="infopanel" id="info-' + key + '">' + esc(c.info) + '</p>' : '') + '<div class="seg" role="group" aria-labelledby="pl-' + key + '">' + btns + '</div></div>';
    }).join('');
  }
  function viewPriorities() {
    return {
      head: '<h1 tabindex="-1">How much does each goal matter?</h1><p class="qhead__help">Defaults are pre-set – change only what matters.</p>',
      main: '<div class="prio">' + prioRows(true) + '</div>'
    };
  }

  function viewRail(res) {
    var prev = state.prevOrder;
    var items = res.rows.map(function (r, i) {
      var mv = '';
      if (prev && prev[r.id]) {
        var d = prev[r.id].pos - i;
        if (d > 0) mv = '<span class="rank-item__move move-up" aria-label="up ' + d + '">' + icon('arrow_upward') + d + '</span>';
        else if (d < 0) mv = '<span class="rank-item__move move-down" aria-label="down ' + (-d) + '">' + icon('arrow_downward') + (-d) + '</span>';
      }
      if (!mv) mv = '<span class="rank-item__move" aria-hidden="true"></span>';
      var lead = i === 0 && !r.excluded;
      return '<li class="rank-item' + (lead ? ' rank-item--lead' : '') + (r.excluded ? ' rank-item--excluded' : '') + '" data-flip="rail-' + r.id + '">' +
        '<div class="rank-item__top">' + avatar(r.id, lead) + '<span class="rank-item__name">' + esc(r.country.name) + (r.excluded ? ' <span class="sr-only">(excluded)</span>' : '') + '</span><span class="rank-item__score" data-ckey="rail-' + r.id + '">' + r.score + '</span>' + mv + '</div>' +
        '<div class="bar"><span data-wkey="rail-' + r.id + '" style="width:' + r.score + '%"></span></div></li>';
    }).join('');
    var why = '';
    if (state.lastMove && state.lastMove.none) {
      var reason = 'this answer does not affect any score for your current profile.';
      if (state.lastMove.qid === 'citizenship' && Array.isArray(state.answers.citizenship) && state.answers.citizenship.length > 1) reason = 'this passport gives no additional rights compared with your other one(s).';
      else if (state.lastMove.qid) { var ef = (res.effects || []).filter(function (e) { return e.q === state.lastMove.qid; })[0]; if (ef) reason = ef.effect.charAt(0).toLowerCase() + ef.effect.slice(1); }
      why = '<p class="rail__why">' + icon('remove') + '<span><strong>No change:</strong> ' + esc(reason) + '</span></p>';
    } else if (state.lastMove) {
      var c = country(state.lastMove.k), pts = Math.abs(Math.round(state.lastMove.d));
      why = '<p class="rail__why">' + icon(state.lastMove.d > 0 ? 'trending_up' : 'trending_down') + '<span><strong>' + esc(c.name) + ' ' + (state.lastMove.d > 0 ? '+' : '−') + pts + '</strong> after “' + esc(state.lastMove.label) + '”</span></p>';
    } else {
      why = '<p class="rail__why">' + icon('bolt') + '<span>Every click re-scores all six.</span></p>';
    }
    return '<aside class="rail" aria-label="Live ranking"><div class="card__head"><h2>' + icon('leaderboard') + 'Live ranking</h2><span class="rail__meta">fit / 100</span></div><ol class="rank-list">' + items + '</ol>' + why +
      '<p class="rail__foot">' + res.answered + ' of ' + res.totalQuestions + ' answered</p></aside>';
  }

  /* ---------- results ---------- */
  function viewResults() {
    var res = E.evaluate(state.answers);
    var top = res.top;
    if (!top) return '<section class="results"><div class="card empty-state">' + icon('location_off') + '<h1>No location left</h1><p>Your filters exclude every country.</p><button class="btn btn--filled" data-action="goto" data-step="2">Change relocation answer</button></div></section>';
    var verdictChip = res.verdict === 'robust' ? '<span class="chip chip--success">' + icon('verified') + 'Robust result</span>' :
      res.verdict === 'close' ? '<span class="chip chip--warning">' + icon('compare_arrows') + 'Close call with ' + esc(res.runnerUp.country.name) + '</span>' : '<span class="chip chip--tonal">' + icon('filter_alt') + 'Only option left</span>';
    var parts = D.CRITERIA.map(function (c) { return { id: c.id, v: top.contrib[c.id] }; }).filter(function (p) { return p.v > 0.4; }).sort(function (a, b) { return b.v - a.v; });
    var bar = parts.map(function (p, i) { return '<span class="c' + (i % 10) + '" data-wkey="ct-' + p.id + '" style="width:' + p.v.toFixed(2) + '%" title="' + esc(crit(p.id).short) + ': ' + p.v.toFixed(1) + ' points"></span>'; }).join('');
    var legend = parts.map(function (p, i) { return '<li><i class="c' + (i % 10) + '"></i>' + esc(crit(p.id).short) + ' <b>' + Math.round(p.v) + '</b></li>'; }).join('');
    var strongest = res.explain.why.map(function (id) { return '<li class="chip chip--onprimary">' + critIcon(id) + esc(crit(id).short) + '</li>'; }).join('');
    var scoreInfoOpen = !!state.openInfo.score;
    var rob = res.robustness && res.robustness.total ? '<li class="fact-tile">' + icon('shield') + '<b>' + res.robustness.same + '/' + res.robustness.total + '</b><span>scenarios stay #1</span></li>' : '';

    var winnerDecor = '<div class="winner__decor" aria-hidden="true">' +
      '<svg class="winner__cookie" viewBox="0 0 200 200"><path d="' + shapePath(12, .07) + '"/></svg>' +
      '<svg class="winner__route" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMin meet"><path d="M150 92C210 92 230 58 280 52S330 36 350 30"/>' +
        '<circle class="winner__ring" cx="350" cy="30" r="12"/><circle class="winner__pin" cx="350" cy="30" r="8"/></svg></div>';
    var winner = '<section class="card winner" aria-labelledby="winner-title">' + winnerDecor +
      '<span class="overline">' + icon('workspace_premium') + 'Best fit for you</span>' +
      '<div class="winner__row"><h1 id="winner-title" class="winner__name" tabindex="-1">' + esc(top.country.name) + '</h1>' +
        '<div class="scorebig"><b data-ckey="win-' + top.id + '" data-count0>' + top.score + '</b><span>/100</span>' +
        '<button type="button" class="iconbtn iconbtn--small" data-action="info" data-key="score" aria-expanded="' + scoreInfoOpen + '" aria-controls="info-score" title="What does the fit score mean?">' + icon('info') + '<span class="sr-only">What does the fit score mean?</span></button></div></div>' +
      (scoreInfoOpen ? '<p class="infopanel" id="info-score">How close this country gets to 5/5 on everything you weight. Gaps of 2–3 points are within data precision.</p>' : '') +
      '<div class="chips">' + verdictChip + '</div>' +
      '<ul class="fact-tiles">' +
        '<li class="fact-tile">' + icon('domain') + '<b>' + esc(top.country.entity) + '</b><span>legal form</span></li>' +
        '<li class="fact-tile">' + icon('location_city') + '<b>' + esc(top.country.hub) + '</b><span>hubs</span></li>' + rob +
      '</ul>' +
      (strongest ? '<div class="winner__block"><span class="label">Strongest for you</span><ul class="chips">' + strongest + '</ul></div>' : '') +
      '<div class="winner__block"><span class="label">What makes up ' + top.score + ' points</span><div class="contrib__bar" role="img" aria-label="Score contribution by criterion: ' + esc(parts.map(function (p) { return crit(p.id).short + ' ' + Math.round(p.v); }).join(', ')) + '">' + bar + '</div><ul class="contrib__legend">' + legend + '</ul></div>' +
      changeHtml(res) +
      '</section>';

    var ranking = '<section class="card" aria-labelledby="rank-title"><div class="card__head"><h2 id="rank-title">' + icon('leaderboard') + 'Full ranking</h2><span class="rail__meta">fit / 100</span></div><ol class="ranking">' +
      res.rows.map(function (r, i) {
        var tag = r.excluded ? r.excluded : (r.residence ? ({ home: 'you live here', citizen: 'your passport', free: 'free movement', visa: 'visa needed', limited: 'residence limited' })[r.residence.level] : '');
        return '<li class="' + (r.excluded ? 'is-excluded' : '') + '" data-flip="rk-' + r.id + '"><span class="ranking__pos">' + (r.excluded ? '–' : (i + 1)) + '</span>' + avatar(r.id, i === 0 && !r.excluded) +
          '<span class="ranking__body"><span class="ranking__name">' + esc(r.country.name) + (tag ? '<small>' + esc(tag) + '</small>' : '') + '</span><span class="bar"><span data-wkey="rk-' + r.id + '" style="width:' + r.score + '%"></span></span></span>' +
          '<span class="ranking__score" data-ckey="rk-' + r.id + '">' + r.score + '</span></li>';
      }).join('') + '</ol></section>';

    function factOf(c) { var cell = D.SCORES[top.id][c]; return c === 'residence' && top.residence ? top.residence.text : cell.value; }
    var whyList = res.explain.why.length ? res.explain.why.map(function (c) {
      var cell = D.SCORES[top.id][c];
      return '<li><strong>' + critIcon(c) + esc(crit(c).name) + '</strong><span>' + esc(factOf(c)) + '</span>' + (cell.sources[0] ? srcLink(cell.sources[0]) : '') + '</li>';
    }).join('') : '<li class="empty">Balanced profile – no single standout.</li>';
    var tradeList = res.explain.tradeoffs.length ? res.explain.tradeoffs.map(function (c) {
      var cell = D.SCORES[top.id][c];
      var better = res.rows.filter(function (r) { return !r.excluded && r.id !== top.id; }).sort(function (a, b) { return b.scores[c].value - a.scores[c].value; })[0];
      var stronger = better && better.scores[c].value > top.scores[c].value;
      return '<li><strong>' + critIcon(c) + esc(crit(c).name) + '</strong><span>' + esc(factOf(c)) + '</span>' + (stronger ? '<span class="chip chip--small chip--tonal">' + icon('arrow_upward') + esc(better.country.name) + ' stronger</span>' : '') + (cell.sources[0] ? srcLink(cell.sources[0]) : '') + '</li>';
    }).join('') : '<li class="empty">No major weakness on what you care about.</li>';
    var watchList = res.warnings.length ? res.warnings.map(function (w) { var ss = Array.isArray(w.src) ? w.src : (w.src ? [w.src] : []); return '<li><span>' + esc(w.text) + '</span>' + ss.map(function (x) { return srcLink(x); }).join('') + '</li>'; }).join('') : '<li class="empty">Nothing specific to flag.</li>';
    var insights = '<div class="insights">' +
      '<section class="insight insight--why"><h3>' + icon('thumb_up') + 'Why it fits</h3><ul>' + whyList + '</ul></section>' +
      '<section class="insight insight--trade"><h3>' + icon('balance') + 'Trade-offs</h3><ul>' + tradeList + '</ul></section>' +
      '<section class="insight insight--watch"><h3>' + icon('warning') + 'Watch out</h3><ul>' + watchList + '</ul></section></div>';

    var orderIds = res.rows.map(function (r) { return r.id; });

    // roadmap
    var tab = state.roadmapTab && country(state.roadmapTab) ? state.roadmapTab : top.id;
    var tabs = orderIds.map(function (k) { var on = k === tab; return '<button type="button" role="tab" class="chip chip--filter" aria-selected="' + on + '" data-action="tab" data-k="' + k + '">' + (on ? icon('check') : '') + esc(country(k).name) + '</button>'; }).join('');
    var steps = D.ROADMAP[tab].map(function (s) { return '<li><div><strong>' + esc(s.t) + '</strong><p>' + esc(s.d) + '</p>' + srcLink(s.src) + '</div></li>'; }).join('');
    var rs = res.rows.filter(function (r) { return r.id === tab; })[0].residence;
    var roadmap = '<section class="card" aria-labelledby="rm-title"><div class="card__head"><h2 id="rm-title">' + icon('route') + 'Founding roadmap</h2><span class="rail__meta">' + D.ROADMAP[tab].length + ' steps</span></div>' +
      '<div class="chips tabs" role="tablist" aria-label="Country roadmap">' + tabs + '</div>' +
      '<ul class="fact-tiles fact-tiles--plain"><li class="fact-tile">' + icon('domain') + '<b>' + esc(country(tab).entity) + '</b><span>legal form</span></li>' + (rs ? '<li class="fact-tile">' + icon('badge') + '<b>' + esc(rs.text) + '</b><span>residence</span></li>' : '') + '</ul>' +
      '<ol class="roadmap">' + steps + '</ol></section>';

    var answers = '<section class="card" aria-labelledby="ans-title"><div class="card__head"><h2 id="ans-title">' + icon('checklist') + 'Your answers</h2><span class="rail__meta">tap to change</span></div><div class="answers">' +
      Q.map(function (q, i) { var l = answerLabel(q); var ef = res.effects[i]; return '<button type="button" class="answer' + (l ? '' : ' is-skipped') + '" data-action="goto" data-step="' + i + '" title="' + esc(ef ? ef.effect : '') + '"><small>' + esc(q.title) + '</small><span>' + esc(l || 'Skipped') + '</span>' + icon('edit', 'answer__edit') + '</button>'; }).join('') +
      '</div></section>';

    // matrix
    var head = '<tr><th scope="col">Criterion · your weight</th>' + orderIds.map(function (k) { return '<th scope="col" class="' + (k === top.id ? 'col-win' : '') + '">' + avatar(k, k === top.id) + '</th>'; }).join('') + '</tr>';
    var bodyRows = D.CRITERIA.map(function (c) {
      var w = res.weights[c.id];
      return '<tr><th scope="row"><span class="mx-crit">' + critIcon(c.id) + esc(c.name) + '</span><small>' + wdots(w) + ' ' + esc(E.LEVELS[w.level].l) + (w.bonus ? ' · +' + w.bonus + ' from answers' : '') + (w.value === 0 && w.level > 0 ? ' · 0 from answers' : '') + '</small></th>' +
        orderIds.map(function (k) {
          var s = res.rows.filter(function (r) { return r.id === k; })[0].scores[c.id];
          var cell = D.SCORES[k][c.id];
          var tag = cell.nodata ? '<span class="conf-low" aria-hidden="true">no data</span>' : (cell.confidence === 'low' ? '<span class="conf-low" aria-hidden="true">est.</span>' : '');
          return '<td class="' + (k === top.id ? 'col-win' : '') + '"><button type="button" class="cellbtn" data-action="cell" data-k="' + k + '" data-c="' + c.id + '" aria-label="' + esc(country(k).name + ', ' + c.name + ': ' + s.value + ' of 5. Show evidence') + '">' + dots(s.value) + tag + '</button></td>';
        }).join('') + '</tr>';
    }).join('');
    var matrix = '<section class="card" aria-labelledby="mx-title"><div class="card__head"><h2 id="mx-title">' + icon('grid_view') + 'Compare all six</h2><span class="rail__meta">tap a cell for evidence</span></div>' +
      '<ul class="legend">' +
        '<li>' + dots(4) + '<span>Score 1–5 · more is better</span></li>' +
        '<li><span class="wdots" aria-hidden="true"><i class="on"></i><i class="on"></i><i></i></span><span>Your weight 0–3</span></li>' +
        '<li><span class="conf-low">est.</span><span>Estimate</span></li>' +
        '<li><span class="conf-low">no data</span><span>Neutral 3</span></li></ul>' +
      '<div class="matrix-wrap"><table class="matrix"><caption class="sr-only">Scores from 1 to 5 per country and criterion</caption><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div></section>';

    var whatif = '<section class="card whatif-card" aria-labelledby="wi-title"><div class="card__head"><h2 id="wi-title">' + icon('tune') + 'What if priorities change?</h2><span class="rail__meta">updates live</span></div><div class="prio whatif">' + prioRows(false) + '</div></section>';

    return '<section class="results has-bg anim">' + pageBg('results') +
      (state.example ? '<div class="banner">' + icon('science') + '<span>Example profile: <b>' + esc(state.example) + '</b></span><button type="button" class="btn btn--text" data-action="goto" data-step="0">Make it yours</button></div>' : '') +
      '<div class="results__bar"><span class="chip chip--small">' + icon('task_alt') + res.answered + ' of ' + res.totalQuestions + ' answered</span>' +
      '<div class="results__actions"><button type="button" class="btn btn--outlined" data-action="goto" data-step="0">' + icon('edit') + 'Edit</button><button type="button" class="btn btn--outlined" data-action="share">' + icon('link') + 'Share</button><button type="button" class="btn btn--tonal" data-action="print">' + icon('picture_as_pdf') + 'Save PDF</button></div></div>' +
      '<div class="grid-2">' + winner + ranking + '</div>' + insights + roadmap + answers + matrix + whatif +
      '<p class="disclaimer">' + icon('info') + 'Orientation, not legal or tax advice · No AI involved · <button type="button" class="btn btn--text btn--inline" data-action="method">How it’s calculated</button></p>' +
      '</section>';
  }

  function changeHtml(res) {
    if (!res.changes) return '';
    if (!res.changes.length) return '<div class="winner__block"><span class="label">What could flip it</span><p class="changes__none">' + icon('lock') + 'No single priority change.</p></div>';
    return '<div class="winner__block"><span class="label">What could flip it</span><ul class="changes">' + res.changes.map(function (c) {
      return '<li>' + critIcon(c.c) + '<span>' + esc(crit(c.c).short) + ' → <b>' + esc(E.LEVELS[c.to].l.toLowerCase()) + '</b></span>' + '<span class="changes__to">' + icon('arrow_forward') + avatar(c.winner) + '<b>' + esc(country(c.winner).name) + '</b></span></li>';
    }).join('') + '</ul></div>';
  }

  /* ---------- method page ---------- */
  function details(summary, body) { return '<details class="details"><summary>' + icon('expand_more') + esc(summary) + '</summary><div class="details__body">' + body + '</div></details>'; }
  function viewMethod() {
    var anchors = D.CRITERIA.map(function (c) { return '<tr><th scope="row">' + critIcon(c.id) + esc(c.name) + '</th><td>' + esc(c.anchors) + '</td></tr>'; }).join('');
    var groups = [['law', 'Statutes & legal texts', 'gavel'], ['official', 'Government & official bodies', 'account_balance'], ['intl', 'International organisations', 'public'], ['academic', 'Academic', 'school'], ['report', 'Industry reports', 'analytics'], ['expert', 'Expert & adviser publications', 'person']];
    var srcs = groups.map(function (g) {
      var items = Object.keys(D.SOURCES).filter(function (k) { return D.SOURCES[k].type === g[0]; });
      if (!items.length) return '';
      return details(g[1] + ' (' + items.length + ')', '<ul class="srclist">' + items.map(function (k) { var s = D.SOURCES[k]; return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.t) + '</a><span>' + esc(s.p) + ' · accessed ' + esc(D.DATA_AS_OF) + '</span></li>'; }).join('') + '</ul>');
    }).join('');
    var lit = D.LITERATURE.map(function (l) { return '<li><a href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.c) + '</a><span>' + esc(l.use) + '</span></li>'; }).join('');
    function step(n, ic, title, line, body) {
      return '<section class="card mstep"><div class="mstep__head"><span class="mstep__num">' + n + '</span><div><h2>' + icon(ic) + title + '</h2><p>' + line + '</p></div></div>' + (body ? details('Details', body) : '') + '</section>';
    }
    return '<section class="method has-bg anim">' + pageBg('method') +
      '<div class="method__head"><span class="overline">' + icon('menu_book') + 'Method &amp; sources</span><h1 tabindex="-1">How it’s calculated</h1>' +
        '<ul class="chips"><li class="chip">' + icon('block') + 'No AI</li><li class="chip">' + icon('repeat') + 'Same answers, same result</li><li class="chip">' + icon('link') + Object.keys(D.SOURCES).length + ' sources</li></ul></div>' +
      '<section class="card card--primary formula-card"><span class="label">Fit score</span><div class="formula">Fit = 100 × Σ w<sub>c</sub> · (s<sub>c</sub> − 1) / 4  ÷  Σ w<sub>c</sub></div>' +
        '<ul class="fact-tiles"><li class="fact-tile">' + icon('star') + '<b>100</b><span>5/5 on all you weight</span></li><li class="fact-tile">' + icon('star_outline') + '<b>0</b><span>1/5 everywhere</span></li><li class="fact-tile">' + icon('straighten') + '<b>±2–3</b><span>within precision</span></li></ul></section>' +
      step(1, 'fact_check', 'Evidence scores 1–5', 'Legal and statistical facts mapped to fixed anchor scales.',
        '<p>Sources: statutes, tax authorities, OECD, Eurostat, WIPO, national registers. Anchors are absolute, not relative to the six countries. Missing data is set to the neutral 3 and labelled “no data”.</p><table class="anchors"><tbody>' + anchors + '</tbody></table>') +
      step(2, 'tune', 'Weights from your priorities', 'Not important 0 · Somewhat 1 · Important 2 · Crucial 3.',
        '<ul><li>Default is Somewhat important; “Easy residence &amp; local roots” starts at Important (home advantage, Dahl &amp; Sorenson 2012) unless you would move anywhere.</li>' +
        '<li>Planning venture capital → +1 on VC access; grants or business angels → +1 on public funding (angel tax reliefs such as UK SEIS/EIS are scored there); accelerator → +1 on talent &amp; ecosystem. Each criterion is raised by at most one level (cap 4).</li><li>Own money, friends &amp; family → +1 on corporate tax and living cost.</li><li>Exit by sale or IPO → +1 on exit tax; building to keep → +1 on corporate tax.</li><li>Broad employee equity → +1 on ESOP; no equity → ESOP weight 0.</li><li>An explicit “Not important” always stays 0.</li></ul>') +
      step(3, 'person_pin', 'Profile adjustments', 'Whole steps only, always within 1–5.',
        '<ul><li><b>Easy residence &amp; local roots:</b> 5 where you live, 4 with your passport or free movement, 2 if a visa is needed, 1 if quota-limited. The most favourable citizenship counts; without answers it stays 3.</li>' +
        '<li>Existing investors in a country → +1 on local roots there.</li>' +
        '<li>US grants: −1 for non-US founders (SBIR/STTR needs &gt; 50% US ownership); +1 for US citizens.</li>' +
        '<li>Sector: +1 on ecosystem only where a source supports it – fintech (Zurich GFCI top 10; Liechtenstein TVTG), health &amp; life sciences (Lausanne/Basel), hardware &amp; industrial (manufacturing ≈ 19% of GDP in Germany, ≈ 18% in Switzerland). AI hubs (US, UK) already hold the maximum; software is least location-bound; no comparable evidence for climate &amp; energy.</li>' +
        '<li>Target market: market-access score from a fixed table per target region.</li>' +
        '<li>Less than €10k secured: −1 on setup in Switzerland and Liechtenstein (minimum capital must be paid in).</li></ul>') +
      step(4, 'filter_alt', 'Filters', 'Relocation answers grey out countries – never hide them.',
        '<ul><li>Europe only → no US; staying put → only your home country.</li></ul>') +
      step(5, 'shield', 'Robustness &amp; limits', 'Every weight shifted ±1 level; “robust” = ≥ 85% same winner and a 4-point lead.',
        '<ul><li>These thresholds are a convention, not an empirical result.</li><li>Scores are country-level; city costs (London, Zurich, Bay Area) can differ markedly.</li><li>Liechtenstein is missing from most international indices; several scores are estimates.</li><li>Exit tax compares the standard case (shares held privately); holding structures are shown as tips, not scored.</li><li>Some legal details still need verification against primary texts (e.g. Swiss GmbH public deed, Liechtenstein permit quotas, Art. 180a PGR) and are marked in the evidence cells.</li><li>A decision aid, not legal or tax advice.</li></ul>') +
      '<section class="card"><div class="card__head"><h2>' + icon('school') + 'Peer-reviewed foundations</h2><span class="rail__meta">' + D.LITERATURE.length + ' papers</span></div>' + details('Show literature', '<ul class="srclist">' + lit + '</ul>') + '</section>' +
      '<section class="card"><div class="card__head"><h2>' + icon('library_books') + 'All data sources</h2><span class="rail__meta">cut-off ' + esc(D.DATA_AS_OF) + '</span></div>' + srcs + '</section>' +
      '<div><button type="button" class="btn btn--filled btn--lg" data-action="' + (Object.keys(state.answers).length ? 'results' : 'start') + '">' + (Object.keys(state.answers).length ? 'Back to my result' : 'Find my location') + icon('arrow_forward') + '</button></div>' +
      '</section>';
  }

  /* ---------- detail dialog ---------- */
  function openCell(k, c) {
    var res = E.evaluate(state.answers);
    var row = res.rows.filter(function (r) { return r.id === k; })[0];
    var s = row.scores[c], cell = D.SCORES[k][c], cr = crit(c);
    if (c === 'residence' && row.residence) cell = { value: row.residence.text, note: cell.note, sources: cell.sources, confidence: cell.confidence };
    var adj = s.adj.length ? '<p class="dialog__adj">' + icon('person') + '<span>' + esc(s.adj.join('; ')) + ' <b>(' + s.base + ' → ' + s.value + ')</b></span></p>' : '';
    var srcs = cell.sources.length ? cell.sources.map(function (id) { return srcLink(id, src(id).t + ' – ' + src(id).p); }).join('') : '<span class="muted">No primary source found – estimate.</span>';
    document.getElementById('detail-body').innerHTML =
      '<div class="dialog__head">' + avatar(k, true) + '<div><span class="overline">' + esc(country(k).name) + '</span><h2 id="detail-title">' + esc(cr.name) + '</h2></div><button type="button" class="iconbtn" data-action="close" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="dialog__score">' + dots(s.value) + '<b>' + s.value + '<small>/5</small></b><span class="chip chip--small">' + icon('signal_cellular_alt') + esc(cell.confidence) + ' confidence</span></div>' +
      '<p class="fact">' + esc(cell.value) + '</p><p>' + esc(cell.note) + '</p>' + adj +
      '<p class="dialog__scale">' + icon('straighten') + '<span>' + esc(cr.anchors) + '</span></p>' +
      '<div class="dialog__srcs">' + srcs + '</div>';
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    var btn = dialog.querySelector('[data-action="close"]'); if (btn) btn.focus();
  }

  /* ---------- events ---------- */
  var advanceTimer = null;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var a = t.getAttribute('data-action');
    var step = STEPS[state.step];
    switch (a) {
      case 'home': e.preventDefault(); go('landing'); break;
      case 'start': go('wizard', { step: firstOpenStep() }); break;
      case 'method': go('method'); break;
      case 'results': go('results'); break;
      case 'restart':
        if (!Object.keys(state.answers).length || window.confirm('Start over? Your answers in this browser will be cleared.')) {
          state.answers = {}; state.skipped = {}; state.example = null; state.prevOrder = null; state.lastMove = null; state.roadmapTab = null;
          if (location.hash) history.replaceState(null, '', location.pathname + location.search);
          go('landing');
        }
        break;
      case 'goto': state.dir = (parseInt(t.getAttribute('data-step'), 10) || 0) < state.step && state.view === 'wizard' ? 'back' : 'fwd'; go('wizard', { step: parseInt(t.getAttribute('data-step'), 10) || 0 }); break;
      case 'next': clearTimeout(advanceTimer); nextStep(); break;
      case 'prev': clearTimeout(advanceTimer); prevStep(); break;
      case 'skip': skip(step.q); announce('Skipped.'); nextStep(); break;
      case 'pick':
        setSingle(step.q, t.getAttribute('data-v')); render(); flash('[data-action="pick"][data-v="' + t.getAttribute('data-v') + '"]');
        announce(answerLabel(step.q) + ' selected. ' + liveSummary());
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(nextStep, 380);
        break;
      case 'toggle':
        toggleMulti(step.q, t.getAttribute('data-v')); render(); flash('[data-action="toggle"][data-v="' + t.getAttribute('data-v') + '"]');
        var sel = app.querySelector('[data-action="toggle"][data-v="' + t.getAttribute('data-v') + '"]'); if (sel) sel.focus();
        announce(liveSummary());
        break;
      case 'prio':
        var y = window.scrollY;
        setPriority(t.getAttribute('data-c'), parseInt(t.getAttribute('data-level'), 10)); render();
        window.scrollTo(0, y);
        var bsel = '[data-action="prio"][data-c="' + t.getAttribute('data-c') + '"][data-level="' + t.getAttribute('data-level') + '"]';
        flash(bsel); var b = app.querySelector(bsel); if (b) b.focus({ preventScroll: true });
        announce(liveSummary());
        break;
      case 'tab': state.roadmapTab = t.getAttribute('data-k'); var yy = window.scrollY; render(); window.scrollTo(0, yy); var tb = app.querySelector('[data-action="tab"][data-k="' + state.roadmapTab + '"]'); if (tb) tb.focus({ preventScroll: true }); flash('[data-action="tab"][data-k="' + state.roadmapTab + '"]'); var rm = app.querySelector('.roadmap'); if (rm) rm.classList.add('is-changed'); break;
      case 'info':
        var ik = t.getAttribute('data-key'); state.openInfo[ik] = !state.openInfo[ik];
        var y2 = window.scrollY; render(); window.scrollTo(0, y2);
        var ib = app.querySelector('[data-action="info"][data-key="' + ik + '"]'); if (ib) ib.focus({ preventScroll: true });
        var ip = document.getElementById('info-' + ik); if (ip) ip.classList.add('is-changed');
        break;
      case 'cell': openCell(t.getAttribute('data-k'), t.getAttribute('data-c')); break;
      case 'close': closeDialog(); break;
      case 'share':
        var url = location.origin + location.pathname + '#r=' + encodeShare();
        var done = function () { t.innerHTML = icon('check') + 'Copied'; announce('Share link copied.'); setTimeout(function () { t.innerHTML = icon('link') + 'Share'; }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
        else window.prompt('Copy this link:', url);
        break;
      case 'print': window.print(); break;
    }
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

  function liveSummary() {
    var r = E.evaluate(state.answers);
    return r.top ? 'Leading: ' + r.top.country.name + ' with ' + r.top.score + '.' : '';
  }
  function firstOpenStep() {
    for (var i = 0; i < STEPS.length; i++) {
      var s = STEPS[i];
      if (s.kind === 'q' && !isAnswered(s.q) && !state.skipped[s.q.id]) return i;
      if (s.kind === 'prio' && !state.answers.priorities) return i;
    }
    return 0;
  }

  /* ---------- boot ---------- */
  load();
  readShare();
  render();
  window.addEventListener('hashchange', function () { if (readShare()) { save(); render(); } });
})();
