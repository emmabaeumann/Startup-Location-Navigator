/* Smart Start Location Navigator — UI layer (vanilla JS, no build step) */
(function () {
  'use strict';
  var D = window.SSN_DATA, E = window.SSN_ENGINE;
  var Q = E.QUESTIONS;
  var STORE_KEY = 'ssn-navigator-v1';
  var STEPS = Q.map(function (q) { return { kind: 'q', q: q, block: q.block }; }).concat([{ kind: 'prio', block: 'priorities' }]);
  var app = document.getElementById('app');
  var srStatus = document.getElementById('sr-status');
  var dialog = document.getElementById('detail');

  var state = { view: 'landing', step: 0, answers: {}, skipped: {}, roadmapTab: null, lastMove: null, prevOrder: null };

  /* ---------- utils ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function country(id) { return D.COUNTRIES.filter(function (c) { return c.id === id; })[0]; }
  function crit(id) { return D.CRITERIA.filter(function (c) { return c.id === id; })[0]; }
  function src(id) { return D.SOURCES[id]; }
  function srcLink(id, label) {
    var s = src(id); if (!s) return '';
    return '<a class="srclink" href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(label || ('Source: ' + s.p)) + ' <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>';
  }
  function icon(name) {
    var p = {
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
      lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
      scale: '<path d="M12 4v16M6 20h12M4 8h16M7 8l-3 7h6zM17 8l-3 7h6z"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
      print: '<path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
      edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
    }[name] || '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  function dots(v) {
    var out = '<span class="dots" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) out += '<i class="' + (v >= i ? 'on' : (v >= i - 0.5 ? 'half' : '')) + '"></i>';
    return out + '</span>';
  }
  function wdots(v) {
    var out = '<span class="wdots" aria-hidden="true">';
    for (var i = 1; i <= 4; i++) out += '<i class="' + (v >= i ? 'on' : '') + '"></i>';
    return out + '</span>';
  }
  function announce(msg) { srStatus.textContent = ''; setTimeout(function () { srStatus.textContent = msg; }, 30); }

  /* ---------- persistence ---------- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ view: state.view, step: state.step, answers: state.answers, skipped: state.skipped })); } catch (e) { /* storage unavailable */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var s = JSON.parse(raw); state.answers = s.answers || {}; state.skipped = s.skipped || {}; state.step = s.step || 0; state.view = s.view || 'landing'; }
    } catch (e) { /* ignore */ }
    if (state.view === 'method') state.view = 'landing';
  }
  function encodeShare() {
    var json = JSON.stringify({ v: 1, a: state.answers });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function readShare() {
    var m = location.hash.match(/^#r=([A-Za-z0-9_-]+)/);
    if (!m) return false;
    try {
      var b = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var obj = JSON.parse(decodeURIComponent(escape(atob(b))));
      if (obj && obj.a && typeof obj.a === 'object') { state.answers = sanitize(obj.a); state.view = 'results'; return true; }
    } catch (e) { /* invalid link */ }
    return false;
  }
  function sanitize(a) {
    var out = {};
    Q.forEach(function (q) {
      var v = a[q.id], vals = q.options.map(function (o) { return o.v; });
      if (q.type === 'multi' && Array.isArray(v)) { var f = v.filter(function (x) { return vals.indexOf(x) !== -1; }); if (f.length) out[q.id] = f; }
      else if (q.type === 'single' && vals.indexOf(v) !== -1) out[q.id] = v;
    });
    if (a.priorities && typeof a.priorities === 'object') {
      out.priorities = {};
      D.CRITERIA.forEach(function (c) { var l = a.priorities[c.id]; if (l === 0 || l === 1 || l === 2 || l === 3) out.priorities[c.id] = l; });
    }
    return out;
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
    if (state.step < STEPS.length - 1) { state.step++; save(); render(); focusHeading(); }
    else go('results');
  }
  function prevStep() { if (state.step > 0) { state.step--; save(); render(); focusHeading(); } else go('landing'); }
  function focusHeading() { var h = app.querySelector('.qhead h1'); if (h) h.focus({ preventScroll: true }); var c = app.querySelector('.qcard'); if (c && c.getBoundingClientRect().top < 60) window.scrollTo({ top: 0 }); }

  /* ---------- answers ---------- */
  function snapshotOrder() { var r = E.evaluate(state.answers); var m = {}; r.rows.forEach(function (x, i) { m[x.id] = { pos: i, total: x.total, excluded: !!x.excluded }; }); return m; }
  function change(mutator, label) {
    var before = snapshotOrder();
    mutator();
    var after = snapshotOrder();
    state.prevOrder = before;
    var best = null;
    Object.keys(after).forEach(function (k) {
      if (after[k].excluded) return;
      var d = after[k].total - before[k].total;
      if (!best || Math.abs(d) > Math.abs(best.d)) best = { k: k, d: d };
    });
    state.lastMove = (best && Math.abs(best.d) >= 0.5) ? { k: best.k, d: best.d, label: label } : null;
    save();
  }
  function setSingle(q, v) { change(function () { state.answers[q.id] = v; delete state.skipped[q.id]; }, q.title); }
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
    }, q.title);
  }
  function skip(q) { change(function () { delete state.answers[q.id]; state.skipped[q.id] = true; }, q.title); }
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
    document.getElementById('asof').textContent = new Date(D.DATA_AS_OF + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (state.view === 'wizard') app.innerHTML = viewWizard();
    else if (state.view === 'results') app.innerHTML = viewResults();
    else if (state.view === 'method') app.innerHTML = viewMethod();
    else app.innerHTML = viewLanding();
    var key = state.view + ':' + (state.view === 'wizard' ? state.step : '');
    if (key === lastRenderKey) Array.prototype.forEach.call(app.querySelectorAll('.anim'), function (el) { el.classList.remove('anim'); });
    lastRenderKey = key;
    document.title = ({ wizard: 'Questions — ', results: 'Your result — ', method: 'Method & sources — ' }[state.view] || '') + 'Smart Start Location Navigator';
  }

  function viewLanding() {
    var res = E.evaluate({});
    var started = Object.keys(state.answers).length > 0;
    var mini = res.rows.map(function (r) {
      return '<div class="mini-rank__row"><span class="code">' + r.id + '</span><span class="mini-rank__bar"><span style="width:' + r.score + '%"></span></span><span style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums">' + r.score + '</span></div>';
    }).join('');
    var chips = D.COUNTRIES.map(function (c) { return '<span class="chip"><span class="code code--soft">' + c.id + '</span>' + esc(c.name) + '</span>'; }).join('');
    return '<section class="landing anim">' +
      '<div class="hero"><div>' +
        '<span class="eyebrow">TUM Smart Start · Founder decision helper</span>' +
        '<h1>Where should you <em>found</em> your startup?</h1>' +
        '<p class="hero__lead">Answer a few click-only questions about you, your startup and your money. Get the most advantageous of six founding locations — with every reason, trade-off and source on the table.</p>' +
        '<div class="countries-strip" aria-label="Countries compared">' + chips + '</div>' +
        '<div class="hero__cta"><button class="btn btn--primary btn--lg" type="button" data-action="start">' + (started ? 'Continue where you left off' : 'Find my location') + icon('arrow') + '</button>' +
        (started ? '<button class="btn btn--ghost btn--lg" type="button" data-action="results">See my result</button>' : '<button class="btn btn--ghost btn--lg" type="button" data-action="method">How it works</button>') + '</div>' +
        '<p class="hero__meta">10 questions + priorities · about 3 minutes · every question can be skipped</p>' +
      '</div>' +
      '<aside class="hero__card" aria-label="Neutral starting ranking"><h2>Before you answer: the neutral ranking</h2><div class="mini-rank">' + mini + '</div><small>Equal weights, no personal profile. Your answers will reshape this — live.</small></aside>' +
      '</div>' +
      '<div class="features">' +
        '<div class="feature"><span class="feature__icon">' + icon('doc') + '</span><h3>Evidence, not opinion</h3><p>Built on statutes, tax authorities, OECD, Eurostat and WIPO data — every score links to its source and date.</p></div>' +
        '<div class="feature"><span class="feature__icon">' + icon('user') + '</span><h3>Personal by design</h3><p>Your citizenship, home, investors and exit plans change the weights — grounded in research on founder location choices.</p></div>' +
        '<div class="feature"><span class="feature__icon">' + icon('scale') + '</span><h3>Transparent and deterministic</h3><p>No AI and no black box: the same answers always give the same result, and a robustness check tells you how close the call is.</p></div>' +
      '</div></section>';
  }

  function viewWizard() {
    var step = STEPS[state.step];
    var res = E.evaluate(state.answers);
    var blocksHtml = E.BLOCKS.map(function (b, i) {
      var idxs = STEPS.map(function (s, j) { return s.block === b.id ? j : -1; }).filter(function (j) { return j !== -1; });
      var current = idxs.indexOf(state.step) !== -1;
      var done = !current && idxs.every(function (j) { var s = STEPS[j]; return s.kind === 'prio' ? !!state.answers.priorities : (isAnswered(s.q) || state.skipped[s.q.id]); });
      return '<button type="button" class="step' + (current ? ' step--current' : '') + (done ? ' step--done' : '') + '" data-action="goto" data-step="' + idxs[0] + '"' + (current ? ' aria-current="step"' : '') + '><span class="step__dot">' + (done ? '✓' : (i + 1)) + '</span>' + esc(b.name) + '</button>';
    }).join('');
    var pct = Math.round((state.step) / STEPS.length * 100);
    var block = E.BLOCKS.filter(function (b) { return b.id === step.block; })[0];
    var blockIdx = E.BLOCKS.indexOf(block) + 1;
    var body = step.kind === 'prio' ? viewPriorities() : viewQuestion(step.q);
    var leader = res.top;
    var mobile = '<div class="rail-mobile" role="note"><span>Leading now: <b>' + (leader ? esc(leader.country.name) : '—') + '</b>' + (leader ? ' · ' + leader.score : '') + '</span><span class="rail-mobile__list">' +
      res.rows.slice(1, 4).filter(function (r) { return !r.excluded; }).map(function (r) { return r.id + ' ' + r.score; }).join(' · ') + '</span></div>';
    return '<section class="wizard">' +
      '<nav class="steps" aria-label="Progress"><p class="steps__title">Your profile</p>' + blocksHtml +
      '<p class="steps__note">' + icon('lock') + '<span>Saved only in this browser. Nothing leaves your device.</span></p></nav>' +
      '<div>' + mobile + '<div class="qcard anim" data-step="' + state.step + '">' +
        '<div class="progress" role="progressbar" aria-label="Questionnaire progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + Math.max(pct, 3) + '%"></span></div>' +
        '<div class="qhead"><span class="eyebrow">Step ' + blockIdx + ' of ' + E.BLOCKS.length + ' · ' + esc(block.name) + '</span>' + body.head + '</div>' +
        body.main +
        '<div class="qfoot">' +
          '<button type="button" class="btn btn--ghost" data-action="prev">' + icon('back') + 'Back</button>' +
          (step.kind === 'q' ? '<button type="button" class="textbtn" data-action="skip">Not sure yet — skip</button>' : '') +
          '<span class="qfoot__spacer"></span>' +
          (state.step < STEPS.length - 1 ? '<button type="button" class="textbtn" data-action="results">See results now</button>' : '') +
          '<button type="button" class="btn btn--primary" data-action="next">' + (state.step === STEPS.length - 1 ? 'Show my location' : 'Continue') + icon('arrow') + '</button>' +
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
      return '<button type="button" class="option' + (multi ? ' option--multi' : '') + '" aria-pressed="' + on + '" data-action="' + (multi ? 'toggle' : 'pick') + '" data-v="' + esc(o.v) + '">' +
        '<span class="option__l">' + esc(o.l) + '</span>' + (o.s ? '<span class="option__s">' + esc(o.s) + '</span>' : '') + '<span class="option__check" aria-hidden="true"></span></button>';
    }).join('');
    return {
      head: '<h1 tabindex="-1">' + esc(q.title) + '</h1><p>' + esc(q.help) + (multi ? '' : '') + '</p>' + (state.skipped[q.id] ? '<p class="skipped-note">You skipped this — it currently has no effect on the result.</p>' : ''),
      main: '<div class="options" role="group" aria-label="' + esc(q.title) + (multi ? ' (select all that apply)' : '') + '">' + opts + '</div>'
    };
  }

  function prioRows(withHint) {
    var pr = state.answers.priorities || {};
    return D.CRITERIA.map(function (c) {
      var lvl = typeof pr[c.id] === 'number' ? pr[c.id] : 1;
      var btns = E.LEVELS.map(function (L) {
        return '<button type="button" data-action="prio" data-c="' + c.id + '" data-level="' + L.v + '" aria-pressed="' + (lvl === L.v) + '">' + L.l + '</button>';
      }).join('');
      return '<div class="prio__row"><div class="prio__label"><strong id="pl-' + c.id + '">' + esc(c.name) + '</strong>' + (withHint ? '<span>' + esc(c.hint) + '</span>' : '') + '</div><div class="seg" role="group" aria-labelledby="pl-' + c.id + '">' + btns + '</div></div>';
    }).join('');
  }
  function viewPriorities() {
    return {
      head: '<h1 tabindex="-1">What matters most for your launch?</h1><p>Pick one level per factor. Untouched factors count as “nice to have”. You can fine-tune this on the results page.</p>',
      main: '<div class="prio">' + prioRows(true) + '</div>'
    };
  }

  function viewRail(res) {
    var prev = state.prevOrder;
    var items = res.rows.map(function (r, i) {
      var mv = '';
      if (prev && prev[r.id]) {
        var d = prev[r.id].pos - i;
        if (d > 0) mv = '<span class="rank-item__move move-up" aria-label="up ' + d + '">▲' + d + '</span>';
        else if (d < 0) mv = '<span class="rank-item__move move-down" aria-label="down ' + (-d) + '">▼' + (-d) + '</span>';
      }
      if (!mv) mv = '<span class="rank-item__move" aria-hidden="true"></span>';
      return '<li class="rank-item' + (i === 0 && !r.excluded ? ' rank-item--lead' : '') + (r.excluded ? ' rank-item--excluded' : '') + '">' +
        '<div class="rank-item__top"><span class="code' + (i === 0 && !r.excluded ? '' : ' code--soft') + '">' + r.id + '</span><span class="rank-item__name">' + esc(r.country.name) + (r.excluded ? ' <span class="sr-only">(excluded)</span>' : '') + '</span><span class="rank-item__score">' + r.score + '</span>' + mv + '</div>' +
        '<div class="bar"><span style="width:' + r.score + '%"></span></div></li>';
    }).join('');
    var why = '';
    if (state.lastMove) {
      var c = country(state.lastMove.k);
      why = '<p class="rail__why"><strong>Why it moved:</strong> your answer to “' + esc(state.lastMove.label) + '” moved ' + esc(c.name) + ' ' + (state.lastMove.d > 0 ? 'up' : 'down') + ' ' + Math.abs(Math.round(state.lastMove.d)) + ' point' + (Math.abs(Math.round(state.lastMove.d)) === 1 ? '' : 's') + '.</p>';
    } else {
      why = '<p class="rail__why">Each click re-scores all six countries against the evidence base.</p>';
    }
    return '<aside class="rail" aria-label="Live ranking"><div class="rail__head"><h2>Live ranking</h2><span>fit score / 100</span></div><ol class="rank-list">' + items + '</ol>' + why +
      '<p class="rail__foot">Based on ' + res.answered + ' of ' + res.totalQuestions + ' answers.</p></aside>';
  }

  /* ---------- results ---------- */
  var CONTRIB_COLORS = ['#FD0262', '#FF7AA8', '#9CC8F2', '#5FA2E3', '#2F80D1', '#C9DEF5', '#7C93B4', '#B4C3D8', '#E3ECF7'];

  function viewResults() {
    var res = E.evaluate(state.answers);
    var top = res.top;
    if (!top) return '<section class="results"><div class="card"><h1>No location left</h1><p>Your filters excluded every country. <button class="textbtn" data-action="goto" data-step="2">Change your relocation answer</button>.</p></div></section>';
    var verdictPill = res.verdict === 'robust' ? '<span class="pill pill--robust">Robust result</span>' :
      res.verdict === 'close' ? '<span class="pill pill--close">Close call with ' + esc(res.runnerUp.country.name) + '</span>' : '<span class="pill pill--only">Only option under your filters</span>';
    var robText = res.robustness && res.robustness.total ? 'Stays #1 in ' + res.robustness.same + ' of ' + res.robustness.total + ' cases when any one priority shifts by a level.' : '';
    // contributions
    var parts = D.CRITERIA.map(function (c) { return { id: c.id, v: top.contrib[c.id] }; }).filter(function (p) { return p.v > 0.4; }).sort(function (a, b) { return b.v - a.v; });
    var bar = parts.map(function (p, i) { return '<span style="width:' + p.v.toFixed(2) + '%;background:' + CONTRIB_COLORS[i % CONTRIB_COLORS.length] + '" title="' + esc(crit(p.id).short) + ': ' + p.v.toFixed(1) + ' pts"></span>'; }).join('');
    var legend = parts.map(function (p, i) { return '<span><i style="background:' + CONTRIB_COLORS[i % CONTRIB_COLORS.length] + '"></i>' + esc(crit(p.id).short) + ' ' + Math.round(p.v) + '</span>'; }).join('');
    var pers = top.personal.reduce(function (s, i) { return s + i.pts; }, 0);
    var whyNames = res.explain.why.map(function (id) { return crit(id).short.toLowerCase(); });
    var lead = 'Recommended set-up: <strong>' + esc(top.country.entity) + '</strong> · hubs: ' + esc(top.country.hub) + '.' +
      (whyNames.length ? ' Strongest for you on ' + esc(whyNames.join(', ').replace(/, ([^,]*)$/, ' and $1')) + '.' : '');

    var winner = '<section class="card winner anim" aria-labelledby="winner-title">' +
      '<span class="eyebrow">Your most advantageous location</span>' +
      '<h1 id="winner-title" class="winner__name" tabindex="-1">' + esc(top.country.name) + '</h1>' +
      '<div class="winner__row"><div class="scorebig"><b>' + top.score + '</b><span>/ 100 fit</span></div>' + verdictPill +
        (res.gap != null ? '<span class="pill pill--glass">+' + Math.round(res.gap) + ' vs #2</span>' : '') + '</div>' +
      '<p class="winner__lead">' + lead + '</p>' +
      '<div class="contrib"><span style="font-size:13px;color:#9CC8F2;font-weight:600">What makes up the score' + (pers ? ' (plus ' + (pers > 0 ? '+' : '') + pers + ' personal points)' : '') + '</span><div class="contrib__bar" role="img" aria-label="Score contribution by criterion: ' + esc(parts.map(function (p) { return crit(p.id).short + ' ' + Math.round(p.v); }).join(', ')) + '">' + bar + '</div><div class="contrib__legend">' + legend + '</div></div>' +
      (robText ? '<p style="font-size:13.5px;color:#D3E3F5;position:relative;z-index:1">' + esc(robText) + '</p>' : '') +
      '</section>';

    var ranking = '<section class="card" aria-labelledby="rank-title"><h2 id="rank-title">Full ranking</h2><p class="card__sub">Fit score after your priorities and personal factors.</p><ol class="ranking">' +
      res.rows.map(function (r, i) {
        return '<li class="' + (r.excluded ? 'is-excluded' : '') + '"><span class="ranking__pos">' + (r.excluded ? '–' : (i + 1)) + '</span><span class="code' + (i === 0 ? '' : ' code--soft') + '">' + r.id + '</span>' +
          '<span class="ranking__body"><span class="ranking__name">' + esc(r.country.name) + (r.excluded ? '<small>' + esc(r.excluded) + '</small>' : (r.residence && r.residence.level !== 'free' && r.residence.level !== 'home' ? '<small>' + (r.residence.level === 'visa' ? 'visa needed' : 'residence limited') + '</small>' : '')) + '</span><span class="bar"><span style="width:' + r.score + '%"></span></span></span>' +
          '<span class="ranking__score">' + r.score + '</span></li>';
      }).join('') + '</ol>' +
      (top.personal.length ? '<div class="personal"><h3>Personal factors for ' + esc(top.country.name) + '</h3><ul>' + top.personal.map(function (p) { return '<li>' + (p.pts > 0 ? '+' : '') + p.pts + ' · ' + esc(p.text) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</section>';

    var cellFact = function (k, c) { return D.SCORES[k][c].value; };
    var whyList = res.explain.why.length ? res.explain.why.map(function (c) {
      var cell = D.SCORES[top.id][c];
      return '<li><strong>' + esc(crit(c).name) + '</strong>' + esc(cellFact(top.id, c)) + ' ' + (cell.sources[0] ? srcLink(cell.sources[0]) : '') + '</li>';
    }).join('') : '<li class="empty">No single standout — the score comes from a balanced profile.</li>';
    var tradeList = res.explain.tradeoffs.length ? res.explain.tradeoffs.map(function (c) {
      var cell = D.SCORES[top.id][c];
      var better = res.rows.filter(function (r) { return !r.excluded && r.id !== top.id; }).sort(function (a, b) { return b.scores[c].value - a.scores[c].value; })[0];
      return '<li><strong>' + esc(crit(c).name) + '</strong>' + esc(cellFact(top.id, c)) + (better && better.scores[c].value > top.scores[c].value ? ' — ' + esc(better.country.name) + ' is stronger here. ' : ' ') + (cell.sources[0] ? srcLink(cell.sources[0]) : '') + '</li>';
    }).join('') : '<li class="empty">No major weakness on the factors you care about.</li>';
    var watchList = res.warnings.length ? res.warnings.map(function (w) { return '<li>' + esc(w.text) + ' ' + (w.src ? srcLink(w.src) : '') + '</li>'; }).join('') : '<li class="empty">Nothing specific to flag for your profile.</li>';
    var insights = '<div class="insights">' +
      '<section class="insight insight--why"><h3>Why it fits</h3><ul>' + whyList + '</ul></section>' +
      '<section class="insight insight--trade"><h3>Trade-offs</h3><ul>' + tradeList + '</ul></section>' +
      '<section class="insight insight--watch"><h3>Watch out</h3><ul>' + watchList + '</ul></section></div>';

    // matrix
    var orderIds = res.rows.map(function (r) { return r.id; });
    var head = '<tr><th scope="col">Criterion · your weight</th>' + orderIds.map(function (k) { return '<th scope="col" class="' + (k === top.id ? 'col-win' : '') + '">' + k + '</th>'; }).join('') + '</tr>';
    var bodyRows = D.CRITERIA.map(function (c) {
      var w = res.weights[c.id].value;
      return '<tr><th scope="row">' + esc(c.name) + wdots(w) + '<small>' + (w === 0 ? 'not weighted' : ['', 'nice to have', 'important', 'critical', 'critical +'][w]) + '</small></th>' +
        orderIds.map(function (k) {
          var s = res.rows.filter(function (r) { return r.id === k; })[0].scores[c.id];
          var conf = D.SCORES[k][c.id].confidence;
          return '<td class="' + (k === top.id ? 'col-win' : '') + '"><button type="button" class="cellbtn" data-action="cell" data-k="' + k + '" data-c="' + c.id + '" aria-label="' + esc(country(k).name + ', ' + c.name + ': ' + s.value + ' of 5. Show evidence') + '">' + dots(s.value) + (conf === 'low' ? '<span class="conf-low" aria-hidden="true">est.</span>' : '') + '</button></td>';
        }).join('') + '</tr>';
    }).join('');
    var matrix = '<section class="card" aria-labelledby="mx-title"><h2 id="mx-title">Compare all six, criterion by criterion</h2><p class="card__sub">Click any cell to see the fact, the reasoning and the source.</p>' +
      '<div class="matrix-wrap"><table class="matrix"><caption class="sr-only">Scores from 1 to 5 per country and criterion</caption><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div>' +
      '<div class="matrix-legend"><span>' + dots(5) + ' 1–5 evidence score, adjusted to your profile</span><span><span class="conf-low">est.</span> low data confidence</span><span>' + wdots(3) + ' your weight</span></div></section>';

    // roadmap
    var tab = state.roadmapTab && country(state.roadmapTab) ? state.roadmapTab : top.id;
    var tabs = orderIds.map(function (k) { return '<button type="button" role="tab" class="tab" aria-selected="' + (k === tab) + '" data-action="tab" data-k="' + k + '"><span class="code' + (k === tab ? '' : ' code--soft') + '">' + k + '</span>' + esc(country(k).name) + '</button>'; }).join('');
    var steps = D.ROADMAP[tab].map(function (s) { return '<li><div><strong>' + esc(s.t) + '</strong><p>' + esc(s.d) + ' ' + srcLink(s.src) + '</p></div></li>'; }).join('');
    var rs = res.rows.filter(function (r) { return r.id === tab; })[0].residence;
    var roadmap = '<section class="card" aria-labelledby="rm-title"><h2 id="rm-title">Your founding roadmap</h2><p class="card__sub">Concrete first steps, each linked to an official or expert source.</p>' +
      '<div class="tabs" role="tablist" aria-label="Country roadmap">' + tabs + '</div>' +
      '<div class="entity-box"><span>Legal form: <b>' + esc(country(tab).entity) + '</b></span>' + (rs ? '<span>Residence: <b>' + esc(rs.text) + '</b></span>' : '') + '</div>' +
      '<ol class="roadmap">' + steps + '</ol></section>';

    var whatif = '<section class="card whatif-card" aria-labelledby="wi-title"><h2 id="wi-title">What if your priorities change?</h2><p class="card__sub">Adjust a level — the result updates instantly.</p><div class="prio whatif">' + prioRows(false) + '</div></section>';

    var answers = '<section class="card" aria-labelledby="ans-title"><h2 id="ans-title">Your answers</h2><p class="card__sub">Click to change an answer. Skipped questions have no effect.</p><div class="answers">' +
      Q.map(function (q, i) { var l = answerLabel(q); return '<button type="button" class="answer' + (l ? '' : ' is-skipped') + '" data-action="goto" data-step="' + i + '"><small>' + esc(q.title) + '</small><span>' + esc(l || 'Not answered') + '</span></button>'; }).join('') +
      '</div></section>';

    return '<section class="results">' +
      '<div class="results__bar"><span class="answered">Based on ' + res.answered + ' of ' + res.totalQuestions + ' answers' + (res.answered < res.totalQuestions ? ' — add more for a sharper result' : '') + '</span>' +
      '<div class="results__actions"><button type="button" class="btn btn--ghost" data-action="goto" data-step="0">' + icon('edit') + 'Edit answers</button><button type="button" class="btn btn--ghost" data-action="share">' + icon('link') + 'Copy share link</button><button type="button" class="btn btn--dark" data-action="print">' + icon('print') + 'Save as PDF</button></div></div>' +
      '<div class="grid-2">' + winner + ranking + '</div>' + insights + matrix +
      '<div class="grid-2">' + roadmap + whatif + '</div>' + answers +
      '<p style="font-size:13px;color:var(--muted)">Deterministic result — no AI involved. <button type="button" class="textbtn" data-action="method">See exactly how it is calculated</button></p>' +
      '</section>';
  }

  /* ---------- method page ---------- */
  function viewMethod() {
    var anchors = D.CRITERIA.map(function (c) { return '<tr><th scope="row">' + esc(c.name) + '</th><td>' + esc(c.anchors) + '</td></tr>'; }).join('');
    var groups = [['law', 'Statutes & legal texts'], ['official', 'Government & official bodies'], ['intl', 'International organisations'], ['academic', 'Academic'], ['report', 'Industry reports'], ['expert', 'Expert & adviser publications']];
    var srcs = groups.map(function (g) {
      var items = Object.keys(D.SOURCES).filter(function (k) { return D.SOURCES[k].type === g[0]; });
      if (!items.length) return '';
      return '<h3 style="font-size:16px;margin-top:18px">' + g[1] + ' (' + items.length + ')</h3><ul class="srclist">' + items.map(function (k) { var s = D.SOURCES[k]; return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer"><span class="badge badge--' + s.type + '">' + s.type + '</span>' + esc(s.t) + '</a><span>' + esc(s.p) + ' · accessed ' + esc(D.DATA_AS_OF) + '</span></li>'; }).join('') + '</ul>';
    }).join('');
    var lit = D.LITERATURE.map(function (l) { return '<li><a href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.c) + '</a><span>' + esc(l.use) + '</span></li>'; }).join('');
    return '<section class="method anim">' +
      '<div><span class="eyebrow">Method &amp; sources</span><h1 tabindex="-1">How the recommendation is calculated</h1><p style="margin-top:10px;font-size:17px">A transparent multi-criteria model. No AI is used at run time — identical answers always produce identical results.</p></div>' +
      '<div class="card"><h2>1 · Evidence scores (1–5)</h2><p>For each country and criterion we collected the current legal and statistical facts (statutes, tax authorities, OECD, Eurostat, WIPO, national registers) and translated them into a 1–5 score using fixed anchor scales. Anchors are absolute, not relative to the six countries, so a score means the same thing everywhere.</p><table class="anchors"><tbody>' + anchors + '</tbody></table></div>' +
      '<div class="card"><h2>2 · Weights from your priorities</h2><p>Each priority maps to a weight: Not needed = 0, Nice to have = 1 (default), Important = 2, Critical = 3. Some answers add one level (capped at 4), and every change is shown on the results page:</p><ul>' +
        '<li>Planning venture capital → +1 on VC access; grants → +1 on public funding</li><li>Bootstrapping → +1 on corporate tax and living cost</li><li>Exit by sale or IPO → +1 on exit tax; building to keep → +1 on corporate tax</li><li>Broad employee equity → +1 on ESOP; no equity → ESOP weight 0</li><li>An explicit “Not needed” always stays 0.</li></ul></div>' +
      '<div class="card"><h2>3 · Profile adjustments to scores</h2><ul>' +
        '<li>Investors based in a country → +1 on that country’s VC access (US investors usually expect a Delaware C-Corp).</li>' +
        '<li>US grants: −1 for non-US founders because SBIR/STTR requires &gt; 50% US ownership; +1 for US citizens.</li>' +
        '<li>Sector: small documented boosts to the ecosystem score (e.g. fintech in London/Zurich, life sciences in Basel/Lausanne, industrial hardware in Germany, Liechtenstein’s blockchain law).</li>' +
        '<li>Target market: market-access score set from a fixed table for your target region (EU single market, DACH, UK, US, global or home).</li>' +
        '<li>No capital secured yet: −1 on setup in Switzerland and Liechtenstein, where minimum capital must be fully paid in.</li></ul>' +
        '<p style="margin-top:10px">All adjusted scores stay within 1–5.</p></div>' +
      '<div class="card"><h2>4 · Fit score and personal factors</h2><p>The fit score is an additive multi-attribute value model (Keeney &amp; Raiffa):</p><div class="formula">Fit(country) = 100 × Σ w<sub>c</sub> · (s<sub>c</sub> − 1) / 4  ÷  Σ w<sub>c</sub></div>' +
        '<p style="margin-top:12px">Then personal points are added: <b>+5</b> home advantage where you live (Dahl &amp; Sorenson 2012 find better survival and profits for locally rooted founders), <b>−5</b> where you would need a visa or permit, <b>−10</b> where residence is quota-limited or hard to get. The total is capped to 0–100.</p></div>' +
      '<div class="card"><h2>5 · Filters, robustness and limits</h2><ul>' +
        '<li>Relocation answers exclude countries (Europe only → no US; staying put → only your home country). Excluded countries remain visible.</li>' +
        '<li>Robustness: every weight is shifted up and down by one level; we count how often the winner stays #1. “Robust” requires ≥ 85% and a lead of at least 4 points — otherwise we call it a close call.</li>' +
        '<li>Scores are country-level; city costs (London, Zurich, Bay Area) can differ markedly.</li>' +
        '<li>Liechtenstein is not covered by most international indices — several of its scores are marked as estimates.</li>' +
        '<li>Tax rules simplified to the standard founder case; holdings, cantons and personal circumstances can change outcomes materially.</li>' +
        '<li>This tool supports a decision; it is not legal or tax advice.</li></ul></div>' +
      '<div class="card"><h2>Peer-reviewed foundations</h2><ul class="srclist">' + lit + '</ul></div>' +
      '<div class="card"><h2>All data sources (' + Object.keys(D.SOURCES).length + ')</h2><p>Research cut-off ' + esc(D.DATA_AS_OF) + '. Primary legal and official sources are preferred; secondary sources are used where primary data was not accessible and are labelled as such.</p>' + srcs + '</div>' +
      '<div><button type="button" class="btn btn--primary" data-action="' + (Object.keys(state.answers).length ? 'results' : 'start') + '">' + (Object.keys(state.answers).length ? 'Back to my result' : 'Find my location') + icon('arrow') + '</button></div>' +
      '</section>';
  }

  /* ---------- detail dialog ---------- */
  function openCell(k, c) {
    var res = E.evaluate(state.answers);
    var row = res.rows.filter(function (r) { return r.id === k; })[0];
    var s = row.scores[c], cell = D.SCORES[k][c], cr = crit(c);
    var adj = s.adj.length ? '<p><b>Adjusted for your profile:</b> ' + esc(s.adj.join('; ')) + ' (base ' + s.base + ' → ' + s.value + ')</p>' : '';
    var srcs = cell.sources.length ? cell.sources.map(function (id) { return srcLink(id, src(id).t + ' — ' + src(id).p); }).join('<br>') : '<span style="color:var(--muted)">No primary source found — score is an estimate.</span>';
    document.getElementById('detail-body').innerHTML =
      '<div class="dialog__head"><div><span class="eyebrow">' + esc(country(k).name) + '</span><h2 id="detail-title">' + esc(cr.name) + '</h2></div><button type="button" class="dialog__close" data-action="close" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div style="display:flex;align-items:center;gap:10px">' + dots(s.value) + '<b>' + s.value + ' / 5</b></div>' +
      '<p class="fact">' + esc(cell.value) + '</p><p>' + esc(cell.note) + '</p>' + adj +
      '<p class="meta"><span>Data confidence: <b>' + esc(cell.confidence) + '</b></span><span>Scale: ' + esc(cr.anchors) + '</span></p>' +
      '<div style="font-size:14px;display:flex;flex-direction:column;gap:6px">' + srcs + '</div>';
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    var btn = dialog.querySelector('.dialog__close'); if (btn) btn.focus();
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
          state.answers = {}; state.skipped = {}; state.prevOrder = null; state.lastMove = null; state.roadmapTab = null;
          if (location.hash) history.replaceState(null, '', location.pathname + location.search);
          go('landing');
        }
        break;
      case 'goto': go('wizard', { step: parseInt(t.getAttribute('data-step'), 10) || 0 }); break;
      case 'next': clearTimeout(advanceTimer); nextStep(); break;
      case 'prev': clearTimeout(advanceTimer); prevStep(); break;
      case 'skip': skip(step.q); announce('Skipped.'); nextStep(); break;
      case 'pick':
        setSingle(step.q, t.getAttribute('data-v')); render();
        announce(answerLabel(step.q) + ' selected. ' + liveSummary());
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(nextStep, 380);
        break;
      case 'toggle':
        toggleMulti(step.q, t.getAttribute('data-v')); render();
        var sel = app.querySelector('[data-action="toggle"][data-v="' + t.getAttribute('data-v') + '"]'); if (sel) sel.focus();
        announce(liveSummary());
        break;
      case 'prio':
        var y = window.scrollY;
        setPriority(t.getAttribute('data-c'), parseInt(t.getAttribute('data-level'), 10)); render();
        window.scrollTo(0, y);
        var b = app.querySelector('[data-action="prio"][data-c="' + t.getAttribute('data-c') + '"][data-level="' + t.getAttribute('data-level') + '"]'); if (b) b.focus({ preventScroll: true });
        announce(liveSummary());
        break;
      case 'tab': state.roadmapTab = t.getAttribute('data-k'); var yy = window.scrollY; render(); window.scrollTo(0, yy); var tb = app.querySelector('[data-action="tab"][data-k="' + state.roadmapTab + '"]'); if (tb) tb.focus({ preventScroll: true }); break;
      case 'cell': openCell(t.getAttribute('data-k'), t.getAttribute('data-c')); break;
      case 'close': dialog.close(); break;
      case 'share':
        var url = location.origin + location.pathname + '#r=' + encodeShare();
        var done = function () { t.innerHTML = icon('link') + 'Link copied'; announce('Share link copied.'); setTimeout(function () { t.innerHTML = icon('link') + 'Copy share link'; }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
        else window.prompt('Copy this link:', url);
        break;
      case 'print': window.print(); break;
    }
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

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
