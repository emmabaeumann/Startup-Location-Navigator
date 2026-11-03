/* FoundersNavigator – results view + evidence dialog (registered on SSN_UI) · Material 3
 *
 * Card order: print header → mobile top-3 → bar → hero (winner + ranking) → why-over-runner-up →
 * insights (why / trade-offs / watch out) → legal forms vs Germany → first-year cost → matrix →
 * what-if → roadmap → your answers → disclaimer → mobile bottom action bar.
 *
 * View-local UI state lives on app.state (never persisted): legalTab, roadmapTab, openInfo[key],
 * whatIfBase (snapshot of priorities taken right before the first what-if change).
 */
(function (root) {
  'use strict';
  var D = root.SSN_DATA, E = root.SSN_ENGINE, UI = root.SSN_UI;
  var esc = UI.esc, icon = UI.icon, avatar = UI.avatar, dots = UI.dots, wdots = UI.wdots, critIcon = UI.critIcon,
    country = UI.country, crit = UI.crit, src = UI.src, srcLink = UI.srcLink, shapePath = UI.shapePath, pageBg = UI.pageBg, eur = UI.eur;
  function A() { return UI.app; }
  function t(s, vars) { return UI.i18n && UI.i18n.t ? UI.i18n.t(s, vars) : UI.t(s); }
  function tn(id) { return t(country(id).name); }
  function inName(id) {
    // "in the United States" / "in den USA" – German needs its own article rule
    if (UI.i18n && UI.i18n.lang && UI.i18n.lang() === 'de') return ({ US: 'den ', UK: '' }[id] || '') + tn(id);
    return (id === 'US' || id === 'UK' ? t('the') + ' ' : '') + tn(id);
  }
  function rowOf(res, id) { return res.rows.filter(function (r) { return r.id === id; })[0]; }
  function andList(names) { return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]; }
  function fmt1(n) { var s = (Math.round(n * 10) / 10).toFixed(1); return UI.i18n && UI.i18n.num ? String(UI.i18n.num(s)) : s; }
  var CAP = 3; // items per insight column before "show all"

  /* ---------- evidence helpers ---------- */
  function typicalForm(k) { var fs = D.LEGAL_FORMS[k] || []; return fs.filter(function (f) { return f.typical; })[0] || fs[0] || null; }
  /* Residence source matching the founder's situation (never a US source for a non-US country). */
  function residenceSource(row) {
    var st = row.residence, k = row.id;
    if (!st) return null;
    if (st.level === 'home') return 'dahl_sorenson';
    if (st.level === 'citizen') return null;
    if (k === 'US') return 'state_e2';
    if (k === 'LI') return st.level === 'limited' ? 'li_quota' : 'eu_sm';
    if (k === 'CH') return st.level === 'free' ? 'ch_bilaterals' : null;
    if (k === 'UK') return 'uk_if';
    if (k === 'PT') return st.level === 'visa' ? 'pt_sv' : 'eu_sm';
    if (k === 'DE') return st.level === 'free' ? 'eu_sm' : null;
    return null;
  }
  function cellSource(row, c) {
    if (c === 'residence') return residenceSource(row);
    var cell = D.SCORES[row.id][c];
    return cell && cell.sources && cell.sources[0] ? cell.sources[0] : null;
  }
  function factOf(row, c) { return c === 'residence' && row.residence ? t(row.residence.text) : D.SCORES[row.id][c].value; }
  /* Number of hires from the answer (engine's firstYearCost expects a number, the question stores a band). */
  var HIRES = { '0': 0, '1to2': 2, '3to5': 4, '6plus': 6 };
  function hiresOf(a) { if (typeof E.hiresOf === 'function') return E.hiresOf(a) || 0; return typeof a.hires === 'number' ? a.hires : (HIRES[a.hires] || 0); }

  function snack(msg) {
    var app = A();
    if (typeof app.snackbar === 'function') app.snackbar(msg); else app.announce(msg);
  }
  function rerenderKeep(focusSel) {
    var app = A(), y = window.scrollY; app.render(); window.scrollTo(0, y);
    if (focusSel) { var el = app.root.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); app.flash(focusSel); }
  }
  /* Single-select chip set: radio (role=radio) or tab (role=tab) semantics with a roving tabindex. */
  function chipSet(kind, label, ids, sel, action, extraAttr) {
    var role = kind === 'tab' ? 'tab' : 'radio';
    return '<div class="chips r-chipset" role="' + (kind === 'tab' ? 'tablist' : 'radiogroup') + '" aria-label="' + esc(label) + '">' +
      ids.map(function (k) {
        var on = k === sel;
        return '<button type="button" role="' + role + '" id="' + action + '-' + k + '" class="chip chip--filter r-chip" ' + (kind === 'tab' ? 'aria-selected' : 'aria-checked') + '="' + on + '" tabindex="' + (on ? 0 : -1) + '"' +
          (extraAttr || '') + ' data-action="' + action + '" data-k="' + k + '">' + (on ? icon('check') : '') + esc(tn(k)) + '</button>';
      }).join('') + '</div>';
  }

  /* ---------- hero: winner ---------- */
  function verdictHtml(res, state) {
    var top = res.top, chip, info = '';
    if (res.verdict === 'tie') {
      var others = res.tie.filter(function (k) { return k !== top.id; }).map(tn);
      var open = !!state.openInfo.tie;
      chip = '<span class="chip chip--warning">' + icon('balance') + esc(t('Tie with {list}', { list: andList(others) })) + '</span>' +
        '<button type="button" class="iconbtn iconbtn--small r-chipinfo" data-action="info" data-key="tie" aria-expanded="' + open + '" aria-controls="info-tie" title="' + esc(t('Why is it listed first?')) + '">' + icon('info') + '<span class="sr-only">' + esc(t('Why is it listed first?')) + '</span></button>';
      if (open) info = '<p class="infopanel" id="info-tie">' + esc(t('Scores less than {p} points apart count as a tie – that is within data precision.', { p: E.TIE_POINTS })) + ' ' + esc(tieReason(res)) + '</p>';
    } else if (res.verdict === 'close') {
      chip = '<span class="chip chip--warning">' + icon('compare_arrows') + esc(t('Close call with {c}', { c: tn(res.runnerUp.id) })) + '</span>';
    } else if (res.verdict === 'robust') {
      chip = '<span class="chip chip--success">' + icon('verified') + esc(t('Robust result')) + '</span>';
    } else {
      chip = '<span class="chip chip--tonal">' + icon('filter_alt') + esc(t('Only option left')) + '</span>';
    }
    if (res.allZero) chip += '<span class="chip chip--tonal">' + icon('balance') + esc(t('Equal weights used')) + '</span>';
    return '<div class="chips r-verdict">' + chip + '</div>' + info;
  }
  function tieReason(res) {
    var a = res.top, b = rowOf(res, res.tie[1]);
    if (!b) return '';
    var ra = a.scores.residence.value, rb = b.scores.residence.value;
    if (ra !== rb) return t('Tie-break: the stronger home base comes first. {a} scores {x}/5 on residence & home base for you, {b} {y}/5.', { a: tn(a.id), b: tn(b.id), x: ra, y: rb });
    var order = D.CRITERIA.map(function (c, i) { return { id: c.id, w: res.weights[c.id].value, i: i }; })
      .filter(function (c) { return c.w > 0; }).sort(function (p, q) { return q.w - p.w || p.i - q.i; });
    for (var i = 0; i < order.length; i++) {
      var c = order[i].id, x = a.scores[c].value, y = b.scores[c].value;
      if (x !== y) return t('Tie-break: same home base, so your most important criteria decide. On “{crit}” {a} scores {x}/5, {b} {y}/5.', { crit: t(crit(c).name), a: tn(a.id), b: tn(b.id), x: x, y: y });
    }
    return t('Tie-break: everything is equal, so the fixed order DE, CH, LI, UK, US, PT applies – it is not a preference.');
  }
  function confidenceTile(res) {
    var cf = res.confidence; if (!cf) return '';
    var pct = Math.round(cf.estShare * 100);
    var lbl = { high: t('High confidence'), medium: t('Medium confidence'), low: t('Low confidence') }[cf.level];
    var title = cf.lowCriteria.length ? t('Estimated: {list}', { list: cf.lowCriteria.map(function (c) { return t(crit(c).short); }).join(', ') }) : '';
    return '<li class="fact-tile r-conf r-conf--' + cf.level + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + icon('signal_cellular_alt') + '<b>' + esc(lbl) + '</b><span>' + esc(pct > 0 ? t('{x}% of your weighted score rests on estimates', { x: pct }) : t('{h}% high-, {m}% medium-confidence data · no estimates', { h: Math.round((cf.highShare || 0) * 100), m: Math.round((cf.medShare || 0) * 100) })) + '</span></li>';
  }
  function winnerCard(res, state) {
    var top = res.top;
    var parts = D.CRITERIA.map(function (c) { return { id: c.id, v: top.contrib[c.id] }; }).filter(function (p) { return p.v > 0.4; }).sort(function (a, b) { return b.v - a.v; });
    var bar = parts.map(function (p, i) { return '<span class="c' + (i % 10) + '" data-wkey="ct-' + p.id + '" style="width:' + p.v.toFixed(2) + '%" title="' + esc(t(crit(p.id).short)) + ': ' + p.v.toFixed(1) + '"></span>'; }).join('');
    var legend = parts.map(function (p, i) { return '<li><i class="c' + (i % 10) + '"></i>' + esc(t(crit(p.id).short)) + ' <b>' + Math.round(p.v) + '</b></li>'; }).join('');
    var strongest = res.explain.why.map(function (id) { return '<li class="chip chip--onprimary">' + critIcon(id) + esc(t(crit(id).short)) + '</li>'; }).join('');
    var scoreOpen = !!state.openInfo.score;
    var form = typicalForm(top.id);
    var rob = res.robustness && res.robustness.total ? '<li class="fact-tile">' + icon('shield') + '<b>' + res.robustness.same + '/' + res.robustness.total + '</b><span>' + esc(t('priority changes keep it #1')) + '</span></li>' : '';
    var decor = '<div class="winner__decor" aria-hidden="true">' +
      '<svg class="winner__cookie" viewBox="0 0 200 200"><path d="' + shapePath(12, .07) + '"/></svg>' +
      '<svg class="winner__route" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMin meet"><path d="M150 92C210 92 230 58 280 52S330 36 350 30"/>' +
        '<circle class="winner__ring" cx="350" cy="30" r="12"/><circle class="winner__pin" cx="350" cy="30" r="8"/></svg></div>';
    return '<section class="card winner" aria-labelledby="winner-title">' + decor +
      '<span class="overline">' + icon('workspace_premium') + esc(res.verdict === 'tie' ? t('Joint best fit for you') : t('Best fit for you')) + '</span>' +
      '<div class="winner__row"><h1 id="winner-title" class="winner__name" tabindex="-1">' + esc(tn(top.id)) + '</h1>' +
        '<div class="r-score"><span class="r-score__label">' + esc(t('Match score')) + '</span><div class="scorebig"><b data-ckey="win-' + top.id + '" data-count0>' + top.score + '</b><span>/100</span>' +
        '<button type="button" class="iconbtn iconbtn--small" data-action="info" data-key="score" aria-expanded="' + scoreOpen + '" aria-controls="info-score" title="' + esc(t('What does the match score mean?')) + '">' + icon('info') + '<span class="sr-only">' + esc(t('What does the match score mean?')) + '</span></button></div></div></div>' +
      (scoreOpen ? '<p class="infopanel" id="info-score">' + esc(t('How close this country gets to 5/5 on everything you weight (100 = top score on every factor). Gaps of 2–3 points are within data precision.')) + '</p>' : '') +
      verdictHtml(res, state) +
      '<ul class="fact-tiles">' +
        '<li class="fact-tile">' + icon('domain') + '<b>' + esc(form ? form.name : top.country.entity) + '</b><span>' + esc(t('typical legal form')) + '</span></li>' +
        '<li class="fact-tile">' + icon('location_city') + '<b>' + esc(top.country.hub) + '</b><span>' + esc(t('hubs')) + '</span></li>' + rob + confidenceTile(res) +
      '</ul>' +
      (strongest ? '<div class="winner__block"><span class="label">' + esc(t('Strongest for you')) + '</span><ul class="chips">' + strongest + '</ul></div>' : '') +
      '<div class="winner__block"><span class="label">' + esc(t('What makes up {n} points', { n: top.score })) + '</span><div class="contrib__bar" role="img" aria-label="' + esc(t('Score contribution by criterion') + ': ' + parts.map(function (p) { return t(crit(p.id).short) + ' ' + Math.round(p.v); }).join(', ')) + '">' + bar + '</div><ul class="contrib__legend">' + legend + '</ul></div>' +
      changeHtml(res) +
      '</section>';
  }
  function changeHtml(res) {
    if (!res.changes) return '';
    if (!res.changes.length) return '<div class="winner__block"><span class="label">' + esc(t('What could flip it')) + '</span><p class="changes__none">' + icon('lock') + esc(t('No single priority change.')) + '</p></div>';
    return '<div class="winner__block"><span class="label">' + esc(t('What could flip it')) + '</span><ul class="changes">' + res.changes.map(function (c) {
      return '<li>' + critIcon(c.c) + '<span>' + esc(t(crit(c.c).short)) + ' → <b>' + esc(t(E.LEVELS[c.to].l).toLowerCase()) + '</b></span>' + '<span class="changes__to">' + icon('arrow_forward') + avatar(c.winner) + '<b>' + esc(tn(c.winner)) + '</b></span></li>';
    }).join('') + '</ul></div>';
  }

  /* ---------- hero: ranking ---------- */
  var RES_TAG = { home: 'you live here', citizen: 'your passport', free: 'free movement', visa: 'visa needed', limited: 'residence limited' };
  function rankingCard(res) {
    var eligible = res.rows.filter(function (r) { return !r.excluded; });
    var items = eligible.map(function (r, i) {
      var tag = r.residence ? t(RES_TAG[r.residence.level]) : '';
      return '<li class="' + (i === 0 ? 'is-lead' : '') + '" data-flip="rk-' + r.id + '"><span class="ranking__pos">' + (i + 1) + '</span>' + avatar(r.id, i === 0) +
        '<span class="ranking__body"><span class="ranking__name">' + esc(tn(r.id)) + (r.tie ? '<span class="r-tie">' + esc(t('tie')) + '</span>' : '') + (tag ? '<small>' + esc(tag) + '</small>' : '') + '</span><span class="bar"><span data-wkey="rk-' + r.id + '" style="width:' + r.score + '%"></span></span></span>' +
        '<span class="ranking__score" data-ckey="rk-' + r.id + '">' + r.score + '<span class="sr-only"> ' + esc(t('of 100')) + '</span></span></li>';
    }).join('');
    var out = res.filteredOut.length ? '<div class="r-out"><h3 class="label">' + icon('filter_alt') + esc(t('Filtered out')) + '</h3><ul class="r-out__list">' +
      res.filteredOut.map(function (r) {
        return '<li class="is-excluded">' + avatar(r.id) + '<span class="ranking__body"><span class="ranking__name">' + esc(tn(r.id)) + '</span><small>' + esc(t(r.excluded)) + (A().state.answers.relocation === 'europe' && r.id === 'US' ? ' · ' + esc(t('outside Europe')) : '') + '</small></span></li>';
      }).join('') + '</ul></div>' : '';
    return '<section class="card r-rank" aria-labelledby="rank-title"><div class="card__head"><h2 id="rank-title">' + icon('leaderboard') + esc(t('Full ranking')) + '</h2><span class="rail__meta">' + esc(t('Match score')) + '</span></div>' +
      '<ol class="ranking">' + items + '</ol>' + out +
      '<p class="r-rank__foot">' + icon('info') + '<span>' + esc(t('Ranked on your answers. Gaps under {p} points are a tie; filtered countries are not scored.', { p: E.TIE_POINTS })) + '</span></p></section>';
  }

  /* ---------- top-3 strip (mobile) ---------- */
  function top3(res) {
    var e = res.rows.filter(function (r) { return !r.excluded; }).slice(0, 3);
    return '<ol class="r-top3" aria-label="' + esc(t('Top 3')) + '">' + e.map(function (r, i) {
      return '<li class="' + (i === 0 ? 'is-lead' : '') + '">' + avatar(r.id, i === 0) + '<b>' + r.score + '</b><span>' + esc(tn(r.id)) + '</span></li>';
    }).join('') + '</ol>';
  }

  /* ---------- why winner over runner-up ---------- */
  function whyOverCard(res) {
    if (!res.comparison || !res.runnerUp) return '';
    var top = res.top, run = res.runnerUp;
    var rows = res.comparison.filter(function (x) { return Math.abs(x.deltaPoints) >= 0.05; }).slice(0, 4);
    var gap = res.gap || 0;
    var title = res.verdict === 'tie' ? t('{a} vs {b}: where they differ', { a: tn(top.id), b: tn(run.id) }) : t('Why {a} over {b}', { a: tn(top.id), b: tn(run.id) });
    var body = rows.length ? '<div class="r-vs__wrap"><table class="r-vs"><caption class="sr-only">' + esc(t('Criteria with the biggest difference between {a} and {b}, in points of the match score', { a: tn(top.id), b: tn(run.id) })) + '</caption>' +
      '<thead><tr><th scope="col">' + esc(t('Criterion')) + '</th><th scope="col">' + avatar(top.id, true) + '<span class="sr-only">' + esc(tn(top.id)) + '</span></th><th scope="col">' + avatar(run.id) + '<span class="sr-only">' + esc(tn(run.id)) + '</span></th><th scope="col">' + esc(t('Points')) + '</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var pos = x.deltaPoints > 0;
        return '<tr><th scope="row"><span class="mx-crit">' + critIcon(x.c) + esc(t(crit(x.c).short)) + '</span><small>' + wdots(res.weights[x.c]) + esc(t(E.LEVELS[Math.min(res.weights[x.c].level, 3)].l)) + '</small></th>' +
          '<td>' + dots(x.winnerScore) + '<b class="r-vs__n">' + x.winnerScore + '</b></td><td>' + dots(x.runnerScore) + '<b class="r-vs__n">' + x.runnerScore + '</b></td>' +
          '<td><span class="r-delta ' + (pos ? 'r-delta--up' : 'r-delta--down') + '">' + (pos ? '+' : '−') + fmt1(Math.abs(x.deltaPoints)) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">' + esc(t('Both score the same on every criterion you weight.')) + '</p>';
    return '<section class="card r-vscard" aria-labelledby="vs-title"><div class="card__head"><h2 id="vs-title">' + icon('compare_arrows') + esc(title) + '</h2>' +
      '<span class="chip chip--small chip--tonal">' + esc(res.verdict === 'tie' ? t('Gap: {n} points', { n: fmt1(gap) }) : t('Lead: {n} points', { n: fmt1(gap) })) + '</span></div>' +
      '<p class="r-lede">' + esc(t('The match-score lead is the sum of these per-criterion differences (score gap × your weight). Positive = in favour of {a}.', { a: tn(top.id) })) + '</p>' +
      body +
      '<div class="r-actions-row"><button type="button" class="btn btn--text" data-action="tomatrix">' + icon('grid_view') + esc(t('Compare all criteria')) + '</button></div></section>';
  }

  /* ---------- insights ---------- */
  function capped(key, items, emptyText, state) {
    if (!items.length) return '<ul><li class="empty">' + esc(emptyText) + '</li></ul>';
    var open = !!state.openInfo[key];
    var shown = open ? items : items.slice(0, CAP);
    var more = items.length > CAP ? '<button type="button" class="btn btn--text r-more" data-action="more" data-key="' + key + '" aria-expanded="' + open + '" aria-controls="ins-' + key + '">' + icon(open ? 'expand_less' : 'expand_more') + esc(open ? t('Show fewer') : t('Show all ({n})', { n: items.length })) + '</button>' : '';
    return '<ul id="ins-' + key + '">' + shown.join('') + '</ul>' + more;
  }
  function insights(res, state) {
    var top = res.top;
    var why = res.explain.why.map(function (c) {
      var s = cellSource(top, c);
      return '<li><strong>' + critIcon(c) + esc(t(crit(c).name)) + '</strong><span>' + esc(factOf(top, c)) + '</span>' + (s ? srcLink(s) : '') + '</li>';
    });
    var trade = res.explain.tradeoffs.map(function (c) {
      var s = cellSource(top, c);
      var better = res.rows.filter(function (r) { return !r.excluded && r.id !== top.id; }).sort(function (a, b) { return b.scores[c].value - a.scores[c].value; })[0];
      var stronger = better && better.scores[c].value > top.scores[c].value;
      return '<li><strong>' + critIcon(c) + esc(t(crit(c).name)) + '</strong><span>' + esc(factOf(top, c)) + '</span>' + (stronger ? '<span class="chip chip--small chip--tonal">' + icon('arrow_upward') + esc(t('{c} stronger', { c: tn(better.id) })) + '</span>' : '') + (s ? srcLink(s) : '') + '</li>';
    });
    // engine.warnings() is already specific to the winner (and to the founder's answers)
    var watch = res.warnings.map(function (w) {
      var ss = Array.isArray(w.src) ? w.src : (w.src ? [w.src] : []);
      return '<li class="r-w r-w--' + esc(w.type) + '"><span>' + esc(w.text) + '</span>' + ss.map(function (x) { return srcLink(x); }).join('') + '</li>';
    });
    return '<div class="insights">' +
      '<section class="insight insight--why" aria-labelledby="ins-h-why"><h3 id="ins-h-why">' + icon('thumb_up') + esc(t('Why it fits')) + '</h3>' + capped('why', why, t('Balanced profile – no single standout.'), state) + '</section>' +
      '<section class="insight insight--trade" aria-labelledby="ins-h-trade"><h3 id="ins-h-trade">' + icon('balance') + esc(t('Trade-offs')) + '</h3>' + capped('trade', trade, t('No major weakness on what you care about.'), state) + '</section>' +
      '<section class="insight insight--watch" aria-labelledby="ins-h-watch"><h3 id="ins-h-watch">' + icon('warning') + esc(t('Watch out')) + '</h3>' + capped('watch', watch, t('Nothing specific to flag.'), state) + '</section></div>';
  }

  /* ---------- legal forms & founding vs Germany ---------- */
  function mid(r) { return (r.min + r.max) / 2; }
  function range(r, unit) { return r.min === r.max ? r.min + unit : r.min + '–' + r.max + unit; }
  function eurRange(r) { return r.min === r.max ? eur(r.min) : eur(r.min) + '–' + eur(r.max).replace('€', ''); }
  function badge(kind, text) { return '<span class="r-badge r-badge--' + kind + '">' + icon(kind === 'good' ? 'check' : (kind === 'bad' ? 'warning' : 'remove')) + esc(text) + '</span>'; }
  function legalCompare(f, b, bName) {
    var o = {};
    var dd = mid(b.setupDays) - mid(f.setupDays);
    o.days = Math.abs(dd) < 2 ? badge('same', t('similar to {b}', { b: bName })) : badge(dd > 0 ? 'good' : 'bad', t(dd > 0 ? '≈ {n} days faster' : '≈ {n} days slower', { n: Math.round(Math.abs(dd)) }));
    var dc = mid(b.setupCostEur) - mid(f.setupCostEur), rel = Math.abs(dc) / Math.max(mid(b.setupCostEur), 1);
    o.cost = rel < 0.1 ? badge('same', t('similar to {b}', { b: bName })) : badge(dc > 0 ? 'good' : 'bad', t(dc > 0 ? '≈ {x} cheaper' : '≈ {x} costlier', { x: eur(Math.abs(dc)) }));
    var dp = b.minCapital.paidInEur - f.minCapital.paidInEur;
    o.cap = Math.abs(dp) < 100 ? badge('same', t('same as {b}', { b: bName })) : badge(dp > 0 ? 'good' : 'bad', t(dp > 0 ? '{x} less to pay in' : '{x} more to pay in', { x: eur(Math.abs(dp)) }));
    o.notary = f.notary === b.notary ? badge('same', t(f.notary ? 'notary also needed in {b}' : 'no notary in {b} either', { b: bName })) : badge(f.notary ? 'bad' : 'good', t(f.notary ? 'notary needed (not in {b})' : 'no notary (needed in {b})', { b: bName }));
    o.fast = dd >= 2 ? 'faster' : (dd <= -2 ? 'slower' : 'about as fast');
    o.cheap = rel < 0.1 ? 'about as costly' : (dc > 0 ? 'cheaper' : 'costlier');
    return o;
  }
  function legalCard(res, state, orderIds) {
    if (!D.LEGAL_FORMS || !Object.keys(D.LEGAL_FORMS).length) return '';
    var top = res.top;
    var sel = state.legalTab && D.LEGAL_FORMS[state.legalTab] ? state.legalTab : top.id;
    var f = typicalForm(sel); if (!f) return '';
    var baseId = sel !== 'DE' ? 'DE' : (top.id !== 'DE' ? top.id : (res.runnerUp ? res.runnerUp.id : 'UK'));
    var b = typicalForm(baseId), bName = b.name + ' (' + tn(baseId) + ')';
    var cmp = legalCompare(f, b, tn(baseId));
    var summary = t('Setting up a {form} in {c} is {fast} and {cheap} than a {base} in {bc}.', { form: f.name, c: inName(sel), fast: t(cmp.fast), cheap: t(cmp.cheap), base: b.name, bc: inName(baseId) });
    var row = function (label, ic, val, sub, bad, bval) {
      return '<tr><th scope="row">' + icon(ic) + '<span>' + esc(label) + '</span></th><td><span class="r-lf__v">' + val + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + (bad || '') + '</td><td class="r-lf__base" data-label="' + esc(bName) + '">' + bval + '</td></tr>';
    };
    var capVal = function (x) { return x.minCapital.eur ? esc(eur(x.minCapital.eur)) + ' · ' + esc(t('{x} paid in', { x: eur(x.minCapital.paidInEur) })) : esc(t('none')); };
    var table = '<div class="r-lf__wrap"><table class="r-lf"><caption class="sr-only">' + esc(t('{form} in {c} compared with {base}', { form: f.name, c: inName(sel), base: bName })) + '</caption>' +
      '<thead><tr><th scope="col"><span class="sr-only">' + esc(t('Aspect')) + '</span></th><th scope="col">' + avatar(sel, true) + esc(f.name) + '</th><th scope="col" class="r-lf__base">' + avatar(baseId) + esc(t('vs {b}', { b: b.name })) + '</th></tr></thead><tbody>' +
      row(t('Minimum capital'), 'account_balance', capVal(f), f.minCapital.text, cmp.cap, capVal(b)) +
      row(t('Liability'), 'shield', esc(f.liability), '', '', esc(b.liability.split('. ')[0].replace(/\.$/, '') + '.')) +
      row(t('Notary'), 'gavel', esc(f.notary ? t('Required') : t('Not required')), f.notaryText, cmp.notary, esc(b.notary ? t('Required') : t('Not required'))) +
      row(t('Profit tax'), 'percent', esc(f.profitTax), '', '', esc(b.profitTax.split(';')[0])) +
      row(t('Setup time'), 'timer', esc(t('{r} days', { r: range(f.setupDays, '') })), f.steps ? t('{n} mandatory steps', { n: f.steps }) : '', cmp.days, esc(t('{r} days', { r: range(b.setupDays, '') }))) +
      row(t('Setup cost'), 'savings', esc(eurRange(f.setupCostEur)), t('notary, register and official fees'), cmp.cost, esc(eurRange(b.setupCostEur))) +
      '</tbody></table></div>';
    var alts = (D.LEGAL_FORMS[sel] || []).filter(function (x) { return x !== f; });
    var altHtml = alts.length ? '<div class="r-lf__alts"><span class="label">' + esc(t('Also possible')) + '</span><ul class="chips">' + alts.map(function (x) {
      return '<li class="chip chip--small" title="' + esc(x.note || '') + '">' + icon('domain') + esc(x.name) + ' · ' + esc(x.minCapital.eur ? t('from {x}', { x: eur(x.minCapital.eur) }) : t('no minimum capital')) + '</li>';
    }).join('') + '</ul></div>' : '';
    var all = '<table class="r-all"><caption class="sr-only">' + esc(t('Typical legal form in all six countries')) + '</caption><thead><tr><th scope="col">' + esc(t('Country')) + '</th><th scope="col">' + esc(t('Typical form')) + '</th><th scope="col">' + esc(t('Min. capital (paid in)')) + '</th><th scope="col">' + esc(t('Notary')) + '</th><th scope="col">' + esc(t('Profit tax')) + '</th><th scope="col">' + esc(t('Setup days')) + '</th><th scope="col">' + esc(t('Setup cost')) + '</th></tr></thead><tbody>' +
      orderIds.map(function (k) {
        var x = typicalForm(k); if (!x) return '';
        return '<tr class="' + (k === sel ? 'is-sel' : '') + '"><th scope="row">' + avatar(k, k === top.id) + '<span>' + esc(tn(k)) + '</span></th><td>' + esc(x.name) + '</td><td>' + (x.minCapital.eur ? esc(eur(x.minCapital.eur)) + ' <small>(' + esc(eur(x.minCapital.paidInEur)) + ')</small>' : '–') + '</td><td>' + esc(x.notary ? t('Yes') : t('No')) + '</td><td>' + esc(x.profitTax.split(/[;(]/)[0].trim()) + '</td><td>' + esc(range(x.setupDays, '')) + '</td><td>' + esc(eurRange(x.setupCostEur)) + '</td></tr>';
      }).join('') + '</tbody></table>';
    var openAll = !!state.openInfo['legal-all'];
    var srcs = (f.sources || []).slice(0, 4).map(function (s) { return srcLink(s); }).join('');
    return '<section class="card r-legal" aria-labelledby="lf-title"><div class="card__head"><h2 id="lf-title">' + icon('gavel') + esc(t('Legal forms & founding vs Germany')) + '</h2>' +
      (f.confidence === 'low' ? '<span class="chip chip--small chip--warning">' + icon('warning') + esc(t('Low certainty')) + '</span>' : '<span class="rail__meta">' + esc(t('typical form per country')) + '</span>') + '</div>' +
      chipSet('radio', t('Country for legal form'), orderIds, sel, 'legal') +
      '<p class="r-lede r-lede--strong">' + esc(summary) + '</p>' + table +
      (f.note ? '<p class="r-note">' + icon('info') + '<span>' + esc(f.note) + '</span></p>' : '') + altHtml +
      (srcs ? '<div class="r-srcs">' + srcs + '</div>' : '') +
      '<details class="details r-exp" data-keep="legal-all"' + (openAll ? ' open' : '') + '><summary>' + icon('expand_more') + esc(t('Compare the typical form in all six countries')) + '</summary><div class="details__body"><div class="r-scroll">' + all + '</div></div></details>' +
      '</section>';
  }

  /* ---------- first-year cost ---------- */
  function costCard(res, state) {
    var F = res.firstYearCost; if (!F) return '';
    var top = res.top, ids = [top.id];
    if (top.id !== 'DE') ids.push('DE');
    if (res.runnerUp && ids.indexOf(res.runnerUp.id) === -1) ids.push(res.runnerUp.id);
    ids = ids.filter(function (k) { return F[k]; });
    if (!ids.length) return '';
    var hires = hiresOf(A().state.answers);
    var tot = function (k) { var c = F[k]; return c.oneOff + c.recurring + (c.payrollPerEmployee || 0) * hires; };
    var max = Math.max.apply(null, ids.map(tot)) || 1;
    var head = '<tr><th scope="col"><span class="sr-only">' + esc(t('Cost item')) + '</span></th>' + ids.map(function (k) { return '<th scope="col">' + avatar(k, k === top.id) + '<span>' + esc(tn(k)) + '</span></th>'; }).join('') + '</tr>';
    var line = function (label, sub, fn, cls) {
      return '<tr class="' + (cls || '') + '"><th scope="row">' + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</th>' + ids.map(function (k) { return '<td>' + fn(F[k], k) + '</td>'; }).join('') + '</tr>';
    };
    var body = line(t('One-off setup'), t('registration, notary'), function (c) { return esc(eur(c.oneOff)); }) +
      line(t('Recurring, first year'), t('accounting, fees, local agent'), function (c) { return esc(eur(c.recurring)); }) +
      (hires > 0 ? line(t('Payroll on-costs × {n} hires', { n: hires }), t('employer charges on €60k gross each'), function (c) { return c.payrollPerEmployee != null ? esc(eur(c.payrollPerEmployee * hires)) : '–'; }) : '') +
      line(t('Estimated first-year cost'), '', function (c, k) { return '<b>' + esc(eur(tot(k))) + '</b>'; }, 'r-cost__total') +
      line(t('Capital locked in'), t('paid-in share capital – not spent, usable later'), function (c) { return c.capitalLocked ? esc(eur(c.capitalLocked)) : esc(t('none')); }, 'r-cost__locked') +
      (hires > 0 ? '' : line(t('Per employee'), t('employer on-costs on a €60k gross salary'), function (c) { return c.payrollPerEmployee != null ? esc(eur(c.payrollPerEmployee)) : '–'; }, 'r-cost__locked'));
    var bars = '<ul class="r-costbars" aria-hidden="true">' + ids.map(function (k) {
      var c = F[k], pay = (c.payrollPerEmployee || 0) * hires;
      return '<li><span class="r-costbars__k">' + esc(k) + '</span><span class="r-costbars__bar"><i class="c0" style="width:' + (c.oneOff / max * 100).toFixed(1) + '%"></i><i class="c2" style="width:' + (c.recurring / max * 100).toFixed(1) + '%"></i>' + (pay ? '<i class="c4" style="width:' + (pay / max * 100).toFixed(1) + '%"></i>' : '') + '</span><b>' + esc(eur(tot(k))) + '</b></li>';
    }).join('') + '</ul><ul class="contrib__legend r-costlegend"><li><i class="c0"></i>' + esc(t('One-off')) + '</li><li><i class="c2"></i>' + esc(t('Recurring')) + '</li>' + (hires ? '<li><i class="c4"></i>' + esc(t('Payroll on-costs')) + '</li>' : '') + '</ul>';
    var c0 = F[top.id], openItems = !!state.openInfo['cost-items'];
    var items = '<ul class="r-items">' + c0.items.map(function (it) {
      return '<li><div><strong>' + esc(t(it.label)) + '</strong><span>' + esc(it.note || '') + '</span>' + (it.sources || []).slice(0, 2).map(function (s) { return srcLink(s); }).join('') + '</div><b>' + esc(eur(it.eur)) + '</b></li>';
    }).join('') + '</ul>';
    var hireNote = hires > 0 ? t('Payroll is shown for {n} hires based on your answer “{a}”.', { n: hires, a: A().answerLabel(A().Q.filter(function (q) { return q.id === 'hires'; })[0]) || '' }) : t('Payroll is not included – you plan no hires in year one (or skipped the question).');
    return '<section class="card r-cost" aria-labelledby="cost-title"><div class="card__head"><h2 id="cost-title">' + icon('savings') + esc(t('First-year cost')) + '</h2><span class="chip chip--small chip--warning">' + icon('info') + esc(t('Estimate')) + '</span></div>' +
      '<p class="r-lede">' + esc(t('Rough cost of setting up and running the typical legal form for one year, in euros. Share capital is shown separately: it stays in the company and is not an expense.')) + ' ' + esc(hireNote) + '</p>' +
      bars + '<div class="r-scroll"><table class="r-costtab"><caption class="sr-only">' + esc(t('Estimated first-year cost by country')) + '</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      (c0.note ? '<p class="r-note">' + icon('info') + '<span>' + esc(c0.note) + '</span></p>' : '') +
      '<details class="details r-exp" data-keep="cost-items"' + (openItems ? ' open' : '') + '><summary>' + icon('expand_more') + esc(t('Line items for {c}', { c: tn(top.id) })) + '</summary><div class="details__body">' + items + '</div></details></section>';
  }

  /* ---------- matrix ---------- */
  function matrixCard(res, orderIds) {
    var top = res.top;
    var head = '<tr><th scope="col">' + esc(t('Criterion · your weight')) + '</th>' + orderIds.map(function (k) { var ex = rowOf(res, k).excluded; return '<th scope="col" class="' + (k === top.id ? 'col-win' : '') + (ex ? ' is-excluded' : '') + '">' + avatar(k, k === top.id) + '<span class="sr-only">' + esc(tn(k)) + (ex ? ' (' + esc(t('filtered out')) + ')' : '') + '</span></th>'; }).join('') + '</tr>';
    var bodyRows = D.CRITERIA.map(function (c) {
      var w = res.weights[c.id];
      return '<tr><th scope="row"><span class="mx-crit">' + critIcon(c.id) + '<span>' + esc(t(c.name)) + '</span></span><small>' + wdots(w) + ' ' + esc(t(E.LEVELS[Math.min(w.level, 3)].l)) + (w.bonus ? ' · +' + w.bonus + ' ' + esc(t('from answers')) : '') + (w.value === 0 && w.level > 0 ? ' · ' + esc(t('0 from answers')) : '') + '</small></th>' +
        orderIds.map(function (k) {
          var s = rowOf(res, k).scores[c.id];
          var cell = D.SCORES[k][c.id];
          var tag = cell.nodata ? '<span class="conf-low" aria-hidden="true">' + esc(t('no data')) + '</span>' : (cell.confidence === 'low' && !(c.id === 'residence' && rowOf(res, k).residence) ? '<span class="conf-low" aria-hidden="true">' + esc(t('est.')) + '</span>' : '');
          return '<td class="' + (k === top.id ? 'col-win' : '') + '"><button type="button" class="cellbtn" data-action="cell" data-k="' + k + '" data-c="' + c.id + '" aria-label="' + esc(tn(k) + ', ' + t(c.name) + ': ' + s.value + ' / 5. ' + t('Show evidence')) + '">' + dots(s.value) + tag + '</button></td>';
        }).join('') + '</tr>';
    }).join('');
    return '<section class="card r-matrix" id="matrix" aria-labelledby="mx-title"><div class="card__head"><h2 id="mx-title" tabindex="-1">' + icon('grid_view') + esc(t('Compare all six')) + '</h2><span class="rail__meta">' + esc(t('tap a cell for evidence')) + '</span></div>' +
      '<ul class="legend">' +
        '<li>' + dots(4) + '<span>' + esc(t('Score 1–5 · more is better')) + '</span></li>' +
        '<li><span class="wdots" aria-hidden="true"><i class="on"></i><i class="on"></i><i></i></span><span>' + esc(t('Your weight 0–3')) + '</span></li>' +
        '<li><span class="conf-low">' + esc(t('est.')) + '</span><span>' + esc(t('Estimate')) + '</span></li>' +
        '<li><span class="conf-low">' + esc(t('no data')) + '</span><span>' + esc(t('Neutral 3')) + '</span></li></ul>' +
      '<div class="matrix-wrap" tabindex="0" role="region" aria-labelledby="mx-title"><table class="matrix"><caption class="sr-only">' + esc(t('Scores from 1 to 5 per country and criterion')) + '</caption><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div></section>';
  }

  /* ---------- what-if ---------- */
  function samePrio(a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); }
  function whatIfCard(res, state) {
    var base = state.whatIfBase;
    var changed = base && !samePrio(base.had ? base.p : null, state.answers.priorities);
    return '<section class="card whatif-card" aria-labelledby="wi-title"><div class="card__head"><h2 id="wi-title">' + icon('tune') + esc(t('What if priorities change?')) + '</h2>' +
      (changed ? '<button type="button" class="btn btn--tonal" data-action="whatifReset">' + icon('restart_alt') + esc(t('Reset to my answers')) + '</button>' : '<span class="rail__meta">' + esc(t('updates live')) + '</span>') + '</div>' +
      '<p class="r-lede" aria-live="polite">' + (changed ? icon('science') + esc(t('Exploring: the whole page now shows this scenario. Leading: {c} ({n}).', { c: tn(res.top.id), n: res.top.score })) : esc(t('Try a different weight – the ranking and every card above re-score instantly.'))) + '</p>' +
      '<div class="prio whatif">' + A().prioRows(false) + '</div></section>';
  }

  /* ---------- roadmap ---------- */
  function roadmapCard(res, state, orderIds) {
    var tab = state.roadmapTab && country(state.roadmapTab) && D.ROADMAP[state.roadmapTab] ? state.roadmapTab : res.top.id;
    var steps = D.ROADMAP[tab].map(function (s) { return '<li><div><strong>' + esc(t(s.t)) + '</strong><p>' + esc(t(s.d)) + '</p>' + srcLink(s.src) + '</div></li>'; }).join('');
    var rs = rowOf(res, tab).residence, f = typicalForm(tab);
    return '<section class="card" aria-labelledby="rm-title"><div class="card__head"><h2 id="rm-title">' + icon('route') + esc(t('Founding roadmap')) + '</h2><span class="rail__meta">' + esc(t('{n} steps', { n: D.ROADMAP[tab].length })) + '</span></div>' +
      chipSet('tab', t('Country roadmap'), orderIds, tab, 'tab', ' aria-controls="rm-panel"') +
      '<div id="rm-panel" role="tabpanel" aria-labelledby="tab-' + tab + '" class="r-rmpanel">' +
      '<ul class="fact-tiles fact-tiles--plain"><li class="fact-tile">' + icon('domain') + '<b>' + esc(f ? f.name : country(tab).entity) + '</b><span>' + esc(t('typical legal form')) + '</span></li>' + (rs ? '<li class="fact-tile">' + icon('badge') + '<b>' + esc(t(rs.text)) + '</b><span>' + esc(t('residence')) + '</span></li>' : '') + '</ul>' +
      '<ol class="roadmap">' + steps + '</ol></div></section>';
  }

  /* ---------- your answers (collapsed) ---------- */
  function answersCard(res, state) {
    var open = !!state.openInfo.answers;
    return '<section class="card r-answers" aria-labelledby="ans-title"><details class="r-exp r-exp--card" data-keep="answers"' + (open ? ' open' : '') + '><summary><h2 id="ans-title">' + icon('checklist') + esc(t('Your answers')) + '</h2><span class="rail__meta">' + esc(t('{n} of {m} answered', { n: res.answered, m: res.totalQuestions })) + '</span>' + icon('expand_more', 'r-exp__chev') + '</summary>' +
      '<div class="answers">' + A().Q.map(function (q, i) { var l = A().answerLabel(q); var ef = res.effects && res.effects[i]; return '<button type="button" class="answer' + (l ? '' : ' is-skipped') + '" data-action="goto" data-step="' + i + '" title="' + esc(UI.effectText(ef)) + '"><small>' + esc(t(q.title)) + '</small><span>' + esc(l || t('Skipped')) + '</span>' + icon('edit', 'answer__edit') + '</button>'; }).join('') +
      '</div></details></section>';
  }

  function printHead() {
    var d = new Date(), asOf = new Date(D.DATA_AS_OF + 'T12:00:00');
    var f = function (x) { return x.toLocaleDateString(UI.i18n && UI.i18n.lang && UI.i18n.lang() === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
    return '<header class="r-printhead"><strong>' + esc(t('FoundersNavigator – your result')) + '</strong><span>' + esc(t('Created {d}', { d: f(d) })) + ' · ' + esc(t('Data as of {d}', { d: f(asOf) })) + '</span></header>';
  }

  function actionButtons(cls) {
    return '<button type="button" class="btn btn--outlined' + cls + '" data-action="goto" data-step="0">' + icon('edit') + '<span>' + esc(t('Edit')) + '</span></button>' +
      '<button type="button" class="btn btn--outlined' + cls + '" data-action="share">' + icon('link') + '<span>' + esc(t('Share')) + '</span></button>' +
      '<button type="button" class="btn btn--tonal' + cls + '" data-action="print">' + icon('picture_as_pdf') + '<span>' + esc(t('Save PDF')) + '</span></button>';
  }

  function viewResults(state) {
    var res = A().evaluate();
    var top = res.top;
    if (!top) return '<section class="results"><div class="card empty-state">' + icon('location_off') + '<h1>' + esc(t('No location left')) + '</h1><p>' + esc(t('Your filters exclude every country.')) + '</p><button class="btn btn--filled" data-action="goto" data-step="2">' + esc(t('Change relocation answer')) + '</button></div></section>';
    var orderIds = res.rows.map(function (r) { return r.id; });
    return '<section class="results has-bg anim">' + pageBg('results') + printHead() +
      (state.example ? '<div class="banner">' + icon('science') + '<span>' + esc(t('Example profile:')) + ' <b>' + esc(state.example) + '</b></span><button type="button" class="btn btn--text" data-action="goto" data-step="0">' + esc(t('Make it yours')) + '</button></div>' : '') +
      top3(res) +
      '<div class="results__bar"><span class="chip chip--small">' + icon('task_alt') + esc(t('{n} of {m} answered', { n: res.answered, m: res.totalQuestions })) + '</span>' +
      '<div class="results__actions">' + actionButtons('') + '</div></div>' +
      '<div class="grid-2 r-hero">' + winnerCard(res, state) + rankingCard(res) + '</div>' +
      whyOverCard(res) + insights(res, state) + legalCard(res, state, orderIds) + costCard(res, state) +
      matrixCard(res, orderIds) + whatIfCard(res, state) + roadmapCard(res, state, orderIds) + answersCard(res, state) +
      (UI.i18n && UI.i18n.lang() === 'de' ? '<p class="disclaimer">' + icon('translate') + esc(t('Evidence texts and sources are shown in their original English.')) + '</p>' : '') +
      '<p class="disclaimer">' + icon('info') + esc(t('Orientation, not legal or tax advice')) + ' · ' + esc(t('Deterministic · sourced · reproducible')) + ' · <button type="button" class="btn btn--text btn--inline" data-action="method">' + esc(t('How it’s calculated')) + '</button></p>' +
      '<nav class="r-actionbar" aria-label="' + esc(t('Result actions')) + '">' + actionButtons(' r-actionbar__btn') + '</nav>' +
      '</section>';
  }

  /* ---------- detail dialog ---------- */
  function openCell(k, c) {
    var res = A().evaluate();
    var row = rowOf(res, k);
    var s = row.scores[c], cell = D.SCORES[k][c], cr = crit(c);
    if (c === 'residence' && row.residence) {
      var rsrc = residenceSource(row);
      cell = { value: t(row.residence.text), note: cell.note, sources: rsrc ? [rsrc, 'dahl_sorenson'].filter(function (x, i, a) { return a.indexOf(x) === i; }) : ['dahl_sorenson'], confidence: cell.confidence };
    }
    var adj = s.adj.length ? '<p class="dialog__adj">' + icon('person') + '<span>' + esc(s.adj.join('; ')) + ' <b>(' + s.base + ' → ' + s.value + ')</b></span></p>' : '';
    var srcs = cell.sources.length ? cell.sources.map(function (id) { return src(id) ? srcLink(id, src(id).t + ' – ' + src(id).p) : ''; }).join('') : '<span class="muted">' + esc(t('No primary source found – estimate.')) + '</span>';
    document.getElementById('detail-body').innerHTML =
      '<div class="dialog__head">' + avatar(k, true) + '<div><span class="overline">' + esc(tn(k)) + '</span><h2 id="detail-title">' + esc(t(cr.name)) + '</h2></div><button type="button" class="iconbtn" data-action="close" aria-label="' + esc(t('Close')) + '">' + icon('close') + '</button></div>' +
      '<div class="dialog__score">' + dots(s.value) + '<b>' + s.value + '<small>/5</small></b><span class="chip chip--small">' + icon('signal_cellular_alt') + esc(t('{l} confidence', { l: t(cell.confidence) })) + '</span></div>' +
      '<p class="fact">' + esc(cell.value) + '</p><p>' + esc(cell.note) + '</p>' + adj +
      '<p class="dialog__scale">' + icon('straighten') + '<span>' + esc(cr.anchors) + '</span></p>' +
      '<div class="dialog__srcs">' + srcs + '</div>';
    if (A().dialog.showModal) A().dialog.showModal(); else A().dialog.setAttribute('open', '');
    var btn = A().dialog.querySelector('[data-action="close"]'); if (btn) btn.focus();
  }

  /* ---------- registration ---------- */
  UI.views.results = function () { return viewResults(A().state); };
  UI.openCell = openCell;
  UI.actions.cell = function (el) { openCell(el.getAttribute('data-k'), el.getAttribute('data-c')); };
  UI.actions.tab = function (el) {
    var app = A(); app.state.roadmapTab = el.getAttribute('data-k');
    rerenderKeep('[data-action="tab"][data-k="' + app.state.roadmapTab + '"]');
    var rm = app.root.querySelector('.roadmap'); if (rm) rm.classList.add('is-changed');
  };
  UI.actions.legal = function (el) {
    var app = A(); app.state.legalTab = el.getAttribute('data-k');
    rerenderKeep('[data-action="legal"][data-k="' + app.state.legalTab + '"]');
    app.announce(t('Legal form for {c} shown.', { c: tn(app.state.legalTab) }));
  };
  UI.actions.more = function (el) {
    var app = A(), k = el.getAttribute('data-key');
    app.state.openInfo[k] = !app.state.openInfo[k];
    rerenderKeep('[data-action="more"][data-key="' + k + '"]');
  };
  UI.actions.tomatrix = function () {
    var h = document.getElementById('mx-title'); if (!h) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    h.focus({ preventScroll: true });
  };
  UI.actions.whatifReset = function () {
    var app = A(), st = app.state, base = st.whatIfBase;
    if (!base) return;
    if (base.had) st.answers.priorities = JSON.parse(JSON.stringify(base.p)); else delete st.answers.priorities;
    st.whatIfBase = null;
    app.save(); rerenderKeep('#wi-title');
    snack(t('Priorities reset to your answers.'));
  };
  UI.actions.share = function (el) {
    var app = A();
    var url = location.origin + location.pathname + '#r=' + app.encodeShare();
    var hasSnack = typeof app.snackbar === 'function';
    var done = function () {
      if (hasSnack) { app.snackbar(t('Link copied')); return; }
      var lbl = el.querySelector('span:not(.msr)'), ic = el.querySelector('.msr');
      if (lbl) lbl.textContent = t('Copied'); if (ic) ic.textContent = 'check';
      app.announce(t('Link copied'));
      setTimeout(function () { if (lbl) lbl.textContent = t('Share'); if (ic) ic.textContent = 'link'; }, 2200);
    };
    var fallback = function () { window.prompt(t('Copy this link:'), url); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback);
    else fallback();
  };
  UI.actions.print = function () { window.print(); };

  if (root.document) {
    /* Snapshot priorities right before the first what-if change; a priority change in the wizard
       redefines "my answers", so it drops the snapshot. Capture phase = runs before app.js. */
    root.document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action="prio"]');
      if (!el || !A()) return;
      var st = A().state;
      if (el.closest('.whatif')) {
        if (!st.whatIfBase) st.whatIfBase = { had: !!st.answers.priorities, p: st.answers.priorities ? JSON.parse(JSON.stringify(st.answers.priorities)) : null };
      } else st.whatIfBase = null;
    }, true);
    /* keep <details data-keep> open/closed across re-renders */
    root.document.addEventListener('toggle', function (e) {
      var d = e.target; if (!d || !d.getAttribute || !d.hasAttribute('data-keep') || !A()) return;
      A().state.openInfo[d.getAttribute('data-keep')] = d.open;
    }, true);
    /* arrow keys inside single-select chip sets (radio group / tab list) */
    root.document.addEventListener('keydown', function (e) {
      var el = e.target.closest && e.target.closest('.r-chipset [data-action]');
      if (!el) return;
      var list = Array.prototype.slice.call(el.parentNode.querySelectorAll('[data-action]'));
      var i = list.indexOf(el), n = list.length, j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j < 0) return;
      e.preventDefault(); list[j].click();
    });
    /* print: expand collapsed sections, restore afterwards */
    var opened = [];
    root.addEventListener('beforeprint', function () {
      opened = Array.prototype.slice.call(root.document.querySelectorAll('.results details:not([open])'));
      opened.forEach(function (d) { d.setAttribute('open', ''); });
    });
    root.addEventListener('afterprint', function () { opened.forEach(function (d) { d.removeAttribute('open'); }); opened = []; });
  }
})(this);
