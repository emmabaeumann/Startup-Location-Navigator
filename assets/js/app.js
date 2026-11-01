/* FoundersNavigator – UI layer (vanilla JS, no build step) */
(function () {
  'use strict';
  var D = window.SSN_DATA, E = window.SSN_ENGINE;
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
  function wdots(w) {
    var lvl = w.value === 0 ? 0 : Math.min(w.level, 3);
    var out = '<span class="wdots" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) out += '<i class="' + (lvl >= i ? 'on' : '') + '"></i>';
    if (w.bonus) out += '<b class="wplus">+</b>';
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
      if (raw) { var s = JSON.parse(raw); state.answers = sanitize(s.answers || {}); state.skipped = s.skipped || {}; state.step = s.step || 0; state.view = s.view || 'landing'; }
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
    document.getElementById('asof').textContent = new Date(D.DATA_AS_OF + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (state.view === 'wizard') app.innerHTML = viewWizard();
    else if (state.view === 'results') app.innerHTML = viewResults();
    else if (state.view === 'method') app.innerHTML = viewMethod();
    else app.innerHTML = viewLanding();
    var key = state.view + ':' + (state.view === 'wizard' ? state.step : '');
    if (key === lastRenderKey) Array.prototype.forEach.call(app.querySelectorAll('.anim'), function (el) { el.classList.remove('anim'); });
    lastRenderKey = key;
    document.title = ({ wizard: 'Questions – ', results: 'Your result – ', method: 'Method & sources – ' }[state.view] || '') + 'FoundersNavigator';
  }

  function viewLanding() {
    var started = Object.keys(state.answers).length > 0;
    var demo = [82, 74, 67, 59, 51, 40];
    var rows = D.COUNTRIES.map(function (c, i) {
      return '<li class="rank-item' + (i === 0 ? ' rank-item--lead' : '') + '"><div class="rank-item__top"><span class="code' + (i === 0 ? '' : ' code--soft') + '">' + c.id + '</span><span class="rank-item__name">' + esc(c.name) + '</span></div>' +
        '<div class="bar"><span class="grow" style="--w:' + demo[i] + '%;animation-delay:' + (i * 90) + 'ms"></span></div></li>';
    }).join('');
    return '<section class="landing anim">' +
      '<div class="hero"><div>' +
        '<span class="eyebrow">Founder decision helper</span>' +
        '<h1>Where should you <em>found</em> your startup?</h1>' +
        '<p class="hero__lead">Compare Germany, Switzerland, Liechtenstein, the UK, the US and Portugal for your personal situation – with every reason and source on the table.</p>' +
        '<div class="hero__cta"><button class="btn btn--primary btn--lg" type="button" data-action="start">' + (started ? 'Continue where you left off' : 'Find my most advantageous location') + icon('arrow') + '</button>' +
        (started ? '<button class="btn btn--ghost btn--lg" type="button" data-action="results">See my result</button>' : '<button class="btn btn--ghost btn--lg" type="button" data-action="method">How it works</button>') + '</div>' +
        '<p class="hero__meta">10 click-only questions · about 3 minutes · skip anything you don’t know yet</p>' +
        '<p class="hero__fine">A first, evidence-based orientation – not legal or tax advice.</p>' +
      '</div>' +
      '<aside class="hero__card preview" aria-label="Example of the live ranking"><div class="rail__head"><h2>Live ranking</h2><span class="preview__tag">Example view</span></div>' +
        '<ol class="rank-list">' + rows + '</ol>' +
        '<p class="rail__why"><strong>Why it moved:</strong> each answer re-scores all six countries – and tells you why.</p>' +
      '</aside>' +
      '</div>' +
      '<div class="features">' +
        '<div class="feature"><span class="feature__icon">' + icon('doc') + '</span><h3>Evidence, not opinion</h3><p>Statutes, tax authorities, OECD, Eurostat and WIPO data – every score links to its source.</p></div>' +
        '<div class="feature"><span class="feature__icon">' + icon('user') + '</span><h3>Personal by design</h3><p>Your passport, home, investors and plans change the result.</p></div>' +
        '<div class="feature"><span class="feature__icon">' + icon('scale') + '</span><h3>Transparent</h3><p>No AI, no black box: the same answers always give the same result.</p></div>' +
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
    var mobile = '<div class="rail-mobile" role="note"><span>Leading now: <b>' + (leader ? esc(leader.country.name) : '–') + '</b>' + (leader ? ' · ' + leader.score : '') + '</span><span class="rail-mobile__list">' +
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
          '<span class="qfoot__spacer"></span>' +
          '<div class="qfoot__main">' +
            '<button type="button" class="btn btn--primary" data-action="next">' + (state.step === STEPS.length - 1 ? 'Show recommended location' : 'Continue') + icon('arrow') + '</button>' +
            (step.kind === 'q' ? '<button type="button" class="textbtn textbtn--small" data-action="skip">Not sure yet – skip</button>' : '') +
          '</div>' +
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
      head: '<h1 tabindex="-1">' + esc(q.title) + '</h1><p>' + esc(q.help) + (multi ? '' : '') + '</p>' + (state.skipped[q.id] ? '<p class="skipped-note">You skipped this – it currently has no effect on the result.</p>' : ''),
      main: '<div class="options" role="group" aria-label="' + esc(q.title) + (multi ? ' (select all that apply)' : '') + '">' + opts + '</div>'
    };
  }

  function prioRows(withHint) {
    var pr = state.answers.priorities || {};
    return D.CRITERIA.map(function (c) {
      var lvl = typeof pr[c.id] === 'number' ? pr[c.id] : E.defaultLevel(c.id, state.answers);
      var btns = E.LEVELS.map(function (L) {
        return '<button type="button" data-action="prio" data-c="' + c.id + '" data-level="' + L.v + '" aria-pressed="' + (lvl === L.v) + '">' + L.l + '</button>';
      }).join('');
      var key = (withHint ? 'q-' : 'r-') + c.id;
      var open = !!state.openInfo[key];
      var info = c.info ? '<button type="button" class="infobtn" data-action="info" data-key="' + key + '" aria-expanded="' + open + '" aria-controls="info-' + key + '" title="' + esc(c.info) + '"><span aria-hidden="true">i</span><span class="sr-only">What does ' + esc(c.name) + ' mean?</span></button>' : '';
      return '<div class="prio__row"><div class="prio__label"><strong id="pl-' + key + '">' + esc(c.name) + info + '</strong>' + (withHint ? '<span>' + esc(c.hint) + '</span>' : '') +
        (open ? '<p class="infopanel" id="info-' + key + '">' + esc(c.info) + '</p>' : '') + '</div><div class="seg" role="group" aria-labelledby="pl-' + key + '">' + btns + '</div></div>';
    }).join('');
  }
  function viewPriorities() {
    return {
      head: '<h1 tabindex="-1">How important is each of these to you?</h1><p>Pick one level per goal. Untouched goals count as “somewhat important”; easy residence &amp; local roots starts at “important” because home advantage is strongly supported by research (unless you would move anywhere). Tap <span class="infobtn infobtn--inline" aria-hidden="true">i</span> for an explanation. You can fine-tune this on the results page.</p>',
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
    if (state.lastMove && state.lastMove.none) {
      var reason = 'this answer does not affect any score for your current profile.';
      if (state.lastMove.qid === 'citizenship' && Array.isArray(state.answers.citizenship) && state.answers.citizenship.length > 1) reason = 'this passport gives no additional rights compared with your other one(s).';
      else if (state.lastMove.qid) { var ef = (res.effects || []).filter(function (e) { return e.q === state.lastMove.qid; })[0]; if (ef) reason = ef.effect.charAt(0).toLowerCase() + ef.effect.slice(1); }
      why = '<p class="rail__why"><strong>No change:</strong> ' + esc(reason) + '</p>';
    } else if (state.lastMove) {
      var c = country(state.lastMove.k);
      why = '<p class="rail__why"><strong>Why it moved:</strong> your answer to “' + esc(state.lastMove.label) + '” moved ' + esc(c.name) + ' ' + (state.lastMove.d > 0 ? 'up' : 'down') + ' ' + Math.abs(Math.round(state.lastMove.d)) + ' point' + (Math.abs(Math.round(state.lastMove.d)) === 1 ? '' : 's') + '.</p>';
    } else {
      why = '<p class="rail__why">Each click re-scores all six countries against the evidence base.</p>';
    }
    return '<aside class="rail" aria-label="Live ranking"><div class="rail__head"><h2>Live ranking</h2><span>fit score / 100</span></div><ol class="rank-list">' + items + '</ol>' + why +
      '<p class="rail__foot">100 = top score on every factor you weight. Based on ' + res.answered + ' of ' + res.totalQuestions + ' answers.</p></aside>';
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
    var parts = D.CRITERIA.map(function (c) { return { id: c.id, v: top.contrib[c.id] }; }).filter(function (p) { return p.v > 0.4; }).sort(function (a, b) { return b.v - a.v; });
    var bar = parts.map(function (p, i) { return '<span style="width:' + p.v.toFixed(2) + '%;background:' + CONTRIB_COLORS[i % CONTRIB_COLORS.length] + '" title="' + esc(crit(p.id).short) + ': ' + p.v.toFixed(1) + ' points"></span>'; }).join('');
    var legend = parts.map(function (p, i) { return '<span><i style="background:' + CONTRIB_COLORS[i % CONTRIB_COLORS.length] + '"></i>' + esc(crit(p.id).short) + ' ' + Math.round(p.v) + '</span>'; }).join('');
    var whyNames = res.explain.why.map(function (id) { return crit(id).short.toLowerCase(); });
    var lead = 'Recommended set-up: <strong>' + esc(top.country.entity) + '</strong> · hubs: ' + esc(top.country.hub) + '.' +
      (whyNames.length ? ' Strongest for you on ' + esc(whyNames.join(', ').replace(/, ([^,]*)$/, ' and $1')) + '.' : '');
    var scoreInfoOpen = !!state.openInfo.score;

    var winner = '<section class="card winner anim" aria-labelledby="winner-title">' +
      '<span class="eyebrow">Your most advantageous location</span>' +
      '<h1 id="winner-title" class="winner__name" tabindex="-1">' + esc(top.country.name) + '</h1>' +
      '<div class="winner__row"><div class="scorebig"><b>' + top.score + '</b><span>/ 100 fit</span></div>' +
        '<button type="button" class="infobtn infobtn--dark" data-action="info" data-key="score" aria-expanded="' + scoreInfoOpen + '" aria-controls="info-score" title="What does the fit score mean?"><span aria-hidden="true">i</span><span class="sr-only">What does the fit score mean?</span></button>' + verdictPill + '</div>' +
      (scoreInfoOpen ? '<p class="infopanel infopanel--dark" id="info-score">The fit score shows how close this country comes to the best possible result for <em>your</em> priorities. 100 would mean the top score (5 of 5) on every factor you weight; 0 the lowest score everywhere. It is not a probability or a grade, and differences of 2–3 points are within the precision of the data.</p>' : '') +
      '<p class="winner__lead">' + lead + '</p>' +
      '<div class="contrib"><span style="font-size:13px;color:#9CC8F2;font-weight:600">What makes up the ' + top.score + ' points</span><div class="contrib__bar" role="img" aria-label="Score contribution by criterion: ' + esc(parts.map(function (p) { return crit(p.id).short + ' ' + Math.round(p.v); }).join(', ')) + '">' + bar + '</div><div class="contrib__legend">' + legend + '</div></div>' +
      (robText ? '<p style="font-size:13.5px;color:#D3E3F5;position:relative;z-index:1">' + esc(robText) + '</p>' : '') +
      changeHtml(res) +
      '</section>';

    var ranking = '<section class="card" aria-labelledby="rank-title"><h2 id="rank-title">Full ranking</h2><p class="card__sub">Fit score for your priorities (100 = top score on every factor you weight).</p><ol class="ranking">' +
      res.rows.map(function (r, i) {
        var tag = r.excluded ? r.excluded : (r.residence ? ({ home: 'you live here', citizen: 'your passport', free: 'free movement', visa: 'visa needed', limited: 'residence limited' })[r.residence.level] : '');
        return '<li class="' + (r.excluded ? 'is-excluded' : '') + '"><span class="ranking__pos">' + (r.excluded ? '–' : (i + 1)) + '</span><span class="code' + (i === 0 ? '' : ' code--soft') + '">' + r.id + '</span>' +
          '<span class="ranking__body"><span class="ranking__name">' + esc(r.country.name) + (tag ? '<small>' + esc(tag) + '</small>' : '') + '</span><span class="bar"><span style="width:' + r.score + '%"></span></span></span>' +
          '<span class="ranking__score">' + r.score + '</span></li>';
      }).join('') + '</ol></section>';

    var whyList = res.explain.why.length ? res.explain.why.map(function (c) {
      var cell = D.SCORES[top.id][c];
      var fact = c === 'residence' && top.residence ? top.residence.text : cell.value;
      return '<li><strong>' + esc(crit(c).name) + '</strong>' + esc(fact) + ' ' + (cell.sources[0] ? srcLink(cell.sources[0]) : '') + '</li>';
    }).join('') : '<li class="empty">No single standout: the score comes from a balanced profile.</li>';
    var tradeList = res.explain.tradeoffs.length ? res.explain.tradeoffs.map(function (c) {
      var cell = D.SCORES[top.id][c];
      var fact = c === 'residence' && top.residence ? top.residence.text : cell.value;
      var better = res.rows.filter(function (r) { return !r.excluded && r.id !== top.id; }).sort(function (a, b) { return b.scores[c].value - a.scores[c].value; })[0];
      return '<li><strong>' + esc(crit(c).name) + '</strong>' + esc(fact) + (better && better.scores[c].value > top.scores[c].value ? ' – ' + esc(better.country.name) + ' is stronger here. ' : ' ') + (cell.sources[0] ? srcLink(cell.sources[0]) : '') + '</li>';
    }).join('') : '<li class="empty">No major weakness on the factors you care about.</li>';
    var watchList = res.warnings.length ? res.warnings.map(function (w) { var ss = Array.isArray(w.src) ? w.src : (w.src ? [w.src] : []); return '<li>' + esc(w.text) + ' ' + ss.map(function (x) { return srcLink(x); }).join(' ') + '</li>'; }).join('') : '<li class="empty">Nothing specific to flag for your profile.</li>';
    var insights = '<div class="insights">' +
      '<section class="insight insight--why"><h3>Why it fits</h3><ul>' + whyList + '</ul></section>' +
      '<section class="insight insight--trade"><h3>Trade-offs</h3><ul>' + tradeList + '</ul></section>' +
      '<section class="insight insight--watch"><h3>Watch out</h3><ul>' + watchList + '</ul></section></div>';

    var orderIds = res.rows.map(function (r) { return r.id; });

    // roadmap
    var tab = state.roadmapTab && country(state.roadmapTab) ? state.roadmapTab : top.id;
    var tabs = orderIds.map(function (k) { return '<button type="button" role="tab" class="tab" aria-selected="' + (k === tab) + '" data-action="tab" data-k="' + k + '"><span class="code' + (k === tab ? '' : ' code--soft') + '">' + k + '</span>' + esc(country(k).name) + '</button>'; }).join('');
    var steps = D.ROADMAP[tab].map(function (s) { return '<li><div><strong>' + esc(s.t) + '</strong><p>' + esc(s.d) + ' ' + srcLink(s.src) + '</p></div></li>'; }).join('');
    var rs = res.rows.filter(function (r) { return r.id === tab; })[0].residence;
    var roadmap = '<section class="card" aria-labelledby="rm-title"><h2 id="rm-title">Your founding roadmap</h2><p class="card__sub">Your first five steps to found in ' + esc(country(tab).name) + ' – with a source to check each one.</p>' +
      '<div class="tabs" role="tablist" aria-label="Country roadmap">' + tabs + '</div>' +
      '<div class="entity-box"><span>Legal form: <b>' + esc(country(tab).entity) + '</b></span>' + (rs ? '<span>Residence: <b>' + esc(rs.text) + '</b></span>' : '') + '</div>' +
      '<ol class="roadmap">' + steps + '</ol></section>';

    var answers = '<section class="card" aria-labelledby="ans-title"><h2 id="ans-title">How your answers were used</h2><p class="card__sub">Every answer and exactly what it changed. Click an answer to edit it.</p><ul class="effects">' +
      res.effects.map(function (e, i) { return '<li class="' + (e.answered ? '' : 'is-skipped') + '"><button type="button" class="effects__answer" data-action="goto" data-step="' + i + '"><small>' + esc(e.title) + '</small><span>' + esc(e.answer) + '</span></button><p>' + esc(e.effect) + '</p></li>'; }).join('') +
      '</ul></section>';

    // matrix
    var head = '<tr><th scope="col">Criterion · your weight</th>' + orderIds.map(function (k) { return '<th scope="col" class="' + (k === top.id ? 'col-win' : '') + '">' + k + '</th>'; }).join('') + '</tr>';
    var bodyRows = D.CRITERIA.map(function (c) {
      var w = res.weights[c.id];
      return '<tr><th scope="row">' + esc(c.name) + '<small>' + wdots(w) + ' ' + esc(E.LEVELS[w.level].l) + (w.isDefault && c.id === 'residence' && w.level === 2 ? ' (default – strong evidence for home advantage)' : '') + (w.bonus ? ' +' + w.bonus + ' from your answers' : '') + (w.value === 0 && w.level > 0 ? ' · set to 0 by your answers' : '') + '</small></th>' +
        orderIds.map(function (k) {
          var s = res.rows.filter(function (r) { return r.id === k; })[0].scores[c.id];
          var cell = D.SCORES[k][c.id];
          var tag = cell.nodata ? '<span class="conf-low" aria-hidden="true">no data</span>' : (cell.confidence === 'low' ? '<span class="conf-low" aria-hidden="true">est.</span>' : '');
          return '<td class="' + (k === top.id ? 'col-win' : '') + '"><button type="button" class="cellbtn" data-action="cell" data-k="' + k + '" data-c="' + c.id + '" aria-label="' + esc(country(k).name + ', ' + c.name + ': ' + s.value + ' of 5. Show evidence') + '">' + dots(s.value) + tag + '</button></td>';
        }).join('') + '</tr>';
    }).join('');
    var matrix = '<section class="card" aria-labelledby="mx-title"><h2 id="mx-title">Compare all six, criterion by criterion</h2><p class="card__sub">Click any cell to see the fact, the reasoning and the source.</p>' +
      '<div class="howto"><strong>How to read this</strong><ul>' +
        '<li><b>Country dots (1–5):</b> how well the country meets this goal, using fixed evidence thresholds. More dots is always better – for taxes that means <em>lower</em> tax (e.g. profit tax ≤ 13% = 5 dots, ≤ 18% = 4). Some values are adjusted to your answers.</li>' +
        '<li><b>Your weight (0–3 squares):</b> how much the criterion counts for you: Not important = 0, Somewhat important = 1, Important = 2, Crucial = 3. “+1 from your answers” means an answer (e.g. planning VC) raised it.</li>' +
        '<li><b>est. / no data:</b> estimate from secondary data, or no reliable data (set to the neutral 3).</li></ul></div>' +
      '<div class="matrix-wrap"><table class="matrix"><caption class="sr-only">Scores from 1 to 5 per country and criterion</caption><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div></section>';

    var whatif = '<section class="card whatif-card" aria-labelledby="wi-title"><h2 id="wi-title">What if your priorities change?</h2><p class="card__sub">Adjust a level and the whole page updates instantly.</p><div class="prio whatif">' + prioRows(false) + '</div></section>';

    return '<section class="results">' +
      (state.example ? '<div class="example-banner"><span>Example profile: <b>' + esc(state.example) + '</b></span><button type="button" class="textbtn" data-action="goto" data-step="0">Make it yours – edit the answers</button></div>' : '') +
      '<div class="results__bar"><span class="answered">Based on ' + res.answered + ' of ' + res.totalQuestions + ' answers' + (res.answered < res.totalQuestions ? ' – add more for a sharper result' : '') + '</span>' +
      '<div class="results__actions"><button type="button" class="btn btn--ghost" data-action="goto" data-step="0">' + icon('edit') + 'Edit answers</button><button type="button" class="btn btn--ghost" data-action="share">' + icon('link') + 'Copy share link</button><button type="button" class="btn btn--dark" data-action="print">' + icon('print') + 'Save as PDF</button></div></div>' +
      '<div class="grid-2">' + winner + ranking + '</div>' + insights + roadmap + answers + matrix + whatif +
      '<p class="result-note"><strong>How to use this result:</strong> it is an evidence-based orientation built on simplified, standardised cases – a starting point for your shortlist, not legal or tax advice. Confirm the details for your situation with an adviser before you act.</p>' +
      '<p style="font-size:13px;color:var(--muted)">Deterministic result: no AI involved. <button type="button" class="textbtn" data-action="method">See exactly how it is calculated</button></p>' +
      '</section>';
  }

  function changeHtml(res) {
    if (!res.changes) return '';
    if (!res.changes.length) return '<div class="changes"><strong>What would change the result?</strong><p>No single priority change would move another country to #1.</p></div>';
    return '<div class="changes"><strong>What would change the result?</strong><ul>' + res.changes.map(function (c) {
      return '<li>If “' + esc(crit(c.c).name) + '” were <b>' + esc(E.LEVELS[c.to].l.toLowerCase()) + '</b> (now ' + esc(E.LEVELS[c.from].l.toLowerCase()) + '), <b>' + esc(country(c.winner).name) + '</b> would lead.</li>';
    }).join('') + '</ul></div>';
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
      '<div><span class="eyebrow">Method &amp; sources</span><h1 tabindex="-1">How the recommendation is calculated</h1><p style="margin-top:10px;font-size:17px">A transparent multi-criteria model. No AI is used at run time – identical answers always produce identical results.</p></div>' +
      '<div class="card"><h2>1 · Evidence scores (1–5)</h2><p>For each country and criterion we collected the current legal and statistical facts (statutes, tax authorities, OECD, Eurostat, WIPO, national registers) and translated them into a 1–5 score using fixed anchor scales. Anchors are absolute, not relative to the six countries, so a score means the same thing everywhere. Where we found no reliable data, the score is set to the neutral midpoint 3 and labelled “no data”, so missing evidence does not penalise a country.</p><table class="anchors"><tbody>' + anchors + '</tbody></table></div>' +
      '<div class="card"><h2>2 · Weights from your priorities</h2><p>Each criterion is phrased as a goal (e.g. “Low tax on company profits”), and you say how important it is: Not important = 0, Somewhat important = 1 (default), Important = 2, Crucial = 3. Exception: “Easy residence &amp; local roots” starts at Important, because home advantage is one of the most robust findings in location research (Dahl &amp; Sorenson 2012); if you say you would move anywhere, it starts at Somewhat important. Some answers add one level (capped at 4), and every change is shown in the comparison matrix:</p><ul>' +
        '<li>Planning venture capital → +1 on VC access; grants or business angels → +1 on public funding (angel tax reliefs such as UK SEIS/EIS are scored there); accelerator → +1 on talent &amp; ecosystem. Each criterion is raised by at most one level.</li><li>Own money, friends &amp; family → +1 on corporate tax and living cost</li><li>Exit by sale or IPO → +1 on exit tax; building to keep → +1 on corporate tax</li><li>Broad employee equity → +1 on ESOP; no equity → ESOP weight 0</li><li>An explicit “Not important” always stays 0.</li></ul></div>' +
      '<div class="card"><h2>3 · Profile adjustments to scores</h2><p>All adjustments are whole steps and keep scores within 1–5:</p><ul>' +
        '<li><b>Residence &amp; home base</b> is scored from your answers: 5 where you already live (home advantage, Dahl &amp; Sorenson 2012), 4 with free movement for one of your passports, 2 if a visa or permit is needed, 1 if residence is quota-limited. With several citizenships, the most favourable one counts. Without answers it stays at 3.</li>' +
        '<li>Existing investors based in a country → +1 on “local roots” for that country: investors are part of your network, not of the local VC market.</li>' +
        '<li>US grants: −1 for non-US founders because SBIR/STTR requires &gt; 50% US ownership; +1 for US citizens.</li>' +
        '<li>Sector: +1 on the ecosystem score only where a source supports it – fintech (Zurich in the GFCI top 10; Liechtenstein’s blockchain law TVTG), health &amp; life sciences (Lausanne/Basel clusters), hardware &amp; industrial (manufacturing ≈ 19% of GDP in Germany, ≈ 18% in Switzerland). For AI, the leading hubs (US, UK) already hold the maximum ecosystem and VC scores, so a bonus would change nothing; software &amp; SaaS is the least location-bound sector; for climate &amp; energy we found no comparable evidence. The results page explains how your sector was treated.</li>' +
        '<li>Target market: market-access score set from a fixed table for your target region (EU single market, DACH, UK, US, global or home).</li>' +
        '<li>Less than €10k secured: −1 on setup in Switzerland and Liechtenstein, where the minimum capital must be fully paid in.</li></ul></div>' +
      '<div class="card"><h2>4 · Fit score: what 100 means</h2><p>The fit score is an additive multi-attribute value model (Keeney &amp; Raiffa):</p><div class="formula">Fit(country) = 100 × Σ w<sub>c</sub> · (s<sub>c</sub> − 1) / 4  ÷  Σ w<sub>c</sub></div>' +
        '<p style="margin-top:12px"><b>100</b> means the country reaches the top score (5 of 5) on every factor you weight; <b>0</b> means the lowest score (1 of 5) everywhere. The score is relative to your priorities: it is not a probability and not a grade. Because the underlying scores are whole steps, differences of 2–3 points should not be over-interpreted; the robustness check tells you how solid the lead is.</p></div>' +
      '<div class="card"><h2>5 · Filters, robustness and limits</h2><ul>' +
        '<li>Relocation answers exclude countries (Europe only → no US; staying put → only your home country). Excluded countries remain visible.</li>' +
        '<li>Robustness: every weight is shifted up and down by one level; we count how often the winner stays #1. “Robust” requires ≥ 85% and a lead of at least 4 points, otherwise we call it a close call. These thresholds are a convention, not an empirical result.</li>' +
        '<li>Scores are country-level; city costs (London, Zurich, Bay Area) can differ markedly.</li>' +
        '<li>Liechtenstein is not covered by most international indices; several of its scores are estimates or “no data”.</li>' +
        '<li>Exit tax compares the standard case (shares held privately). Holding structures exist in several countries and are shown as tips, not scored.</li>' +
        '<li>Some legal details still need verification against primary texts that were not accessible during research (e.g. whether Swiss GmbH formation always needs a public deed, Liechtenstein permit quotas, Art. 180a PGR). They are marked in the evidence cells.</li>' +
        '<li>This tool supports a decision; it is not legal or tax advice.</li></ul></div>' +
      '<div class="card"><h2>Peer-reviewed foundations</h2><ul class="srclist">' + lit + '</ul></div>' +
      '<div class="card"><h2>All data sources (' + Object.keys(D.SOURCES).length + ')</h2><p>Research cut-off ' + esc(D.DATA_AS_OF) + '. Primary legal and official sources are preferred; secondary sources are used where primary data was not accessible and are labelled as such.</p>' + srcs + '</div>' +
      '<div><button type="button" class="btn btn--primary" data-action="' + (Object.keys(state.answers).length ? 'results' : 'start') + '">' + (Object.keys(state.answers).length ? 'Back to my result' : 'Find my most advantageous location') + icon('arrow') + '</button></div>' +
      '</section>';
  }

  /* ---------- detail dialog ---------- */
  function openCell(k, c) {
    var res = E.evaluate(state.answers);
    var row = res.rows.filter(function (r) { return r.id === k; })[0];
    var s = row.scores[c], cell = D.SCORES[k][c], cr = crit(c);
    if (c === 'residence' && row.residence) cell = { value: row.residence.text, note: cell.note, sources: cell.sources, confidence: cell.confidence };
    var adj = s.adj.length ? '<p><b>Adjusted for your profile:</b> ' + esc(s.adj.join('; ')) + ' (base ' + s.base + ' → ' + s.value + ')</p>' : '';
    var srcs = cell.sources.length ? cell.sources.map(function (id) { return srcLink(id, src(id).t + ' – ' + src(id).p); }).join('<br>') : '<span style="color:var(--muted)">No primary source found – score is an estimate.</span>';
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
          state.answers = {}; state.skipped = {}; state.example = null; state.prevOrder = null; state.lastMove = null; state.roadmapTab = null;
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
      case 'info':
        var ik = t.getAttribute('data-key'); state.openInfo[ik] = !state.openInfo[ik];
        var y2 = window.scrollY; render(); window.scrollTo(0, y2);
        var ib = app.querySelector('[data-action="info"][data-key="' + ik + '"]'); if (ib) ib.focus({ preventScroll: true });
        break;
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
