/* FoundersNavigator – method, about and country-profile pages (registered on SSN_UI)
 *
 * Views:   SSN_UI.views.method | about | country
 * Actions: data-action="about"                 → about page
 *          data-action="country" data-k="CH"   → country profile (state.countryId; invalid/missing → DE)
 * Every user-visible English string goes through t() (the English text is the i18n key).
 * Evidence texts (scores, notes, legal forms) are translated via t() too; only source titles/publishers stay in their original language.
 */
(function (root) {
  'use strict';
  var D = root.SSN_DATA, E = root.SSN_ENGINE, UI = root.SSN_UI;
  var esc = UI.esc, icon = UI.icon, avatar = UI.avatar, dots = UI.dots, critIcon = UI.critIcon,
    country = UI.country, crit = UI.crit, src = UI.src, srcLink = UI.srcLink, details = UI.details, pageBg = UI.pageBg, eur = UI.eur, eurRange = UI.eurRange;
  function A() { return UI.app; }
  /* t() looked up at call time (i18n.js may replace UI.t); T() = translated + HTML-escaped */
  function t(s, vars) { return UI.t ? UI.t(s, vars) : s; }
  function T(s, vars) { return esc(t(s, vars)); }

  /* Optional credits – add team member names here (rendered on the About page only when filled). */
  var TEAM = [];
  var REPO_URL = 'https://github.com/emmabaeumann/Startup-Location-Navigator';
  var IDS = D.COUNTRIES.map(function (c) { return c.id; });

  function hasAnswers() { var s = A().state; return !!(s && s.answers && Object.keys(s.answers).length); }
  function asOf() { return new Date(D.DATA_AS_OF + 'T00:00:00').toLocaleDateString(UI.i18n && UI.i18n.lang() === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function rowOf(res, k) { return res.rows.filter(function (r) { return r.id === k; })[0]; }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function range(a, b, fmt) { return a === b ? fmt(a) : fmt(a) + '–' + fmt(b); }
  function cnt(n) { return String(n); }
  /* level: heading level of the card title (default 2; the method page nests cards under h2 sections → 3) */
  function card(id, ic, title, meta, body, cls, level) {
    var h = 'h' + (level || 2);
    return '<section class="card' + (cls ? ' ' + cls : '') + '" aria-labelledby="' + id + '"><div class="card__head"><' + h + ' id="' + id + '">' + icon(ic) + title + '</' + h + '>' +
      (meta ? '<span class="rail__meta">' + meta + '</span>' : '') + '</div>' + body + '</section>';
  }
  function tableWrap(html, label) { return '<div class="tbl-wrap" role="region" tabindex="0" aria-label="' + esc(label) + '">' + html + '</div>'; }
  function confTag(cell) {
    if (cell.nodata) return '<span class="ptag ptag--nodata">' + T('no data') + '</span>';
    if (cell.confidence === 'low') return '<span class="ptag ptag--est">' + T('est.') + '</span>';
    return '';
  }
  function srcLinks(ids, max) {
    ids = ids || [];
    var shown = ids.slice(0, max || ids.length).map(function (id) { return srcLink(id); }).join('');
    var more = max && ids.length > max ? '<span class="srcmore">' + T('+{n} more', { n: ids.length - max }) + '</span>' : '';
    return shown + more;
  }
  function primaryCta() {
    return hasAnswers()
      ? '<button type="button" class="btn btn--filled btn--lg" data-action="results">' + T('Back to my result') + icon('arrow_forward') + '</button>'
      : '<button type="button" class="btn btn--filled btn--lg" data-action="start">' + T('Find my location') + icon('arrow_forward') + '</button>';
  }
  function countryChips(active, label) {
    return '<nav class="tabs cp-switch" aria-label="' + esc(label) + '"><ul class="chips">' + D.COUNTRIES.map(function (c) {
      var on = c.id === active;
      return '<li><button type="button" class="chip chip--filter"' + (on ? ' aria-current="page"' : '') + ' data-action="country" data-k="' + c.id + '">' + (on ? icon('check') : '') + esc(t(c.name)) + '</button></li>';
    }).join('') + '</ul></nav>';
  }
  /* evidence-base statistics (computed, so the text never drifts from the data) */
  function evidenceStats() {
    var cells = 0, est = 0, nod = 0;
    IDS.forEach(function (k) {
      D.CRITERIA.forEach(function (c) {
        var cell = D.SCORES[k][c.id]; cells++;
        if (!cell) { nod++; return; }
        if (cell.nodata) nod++; else if (cell.confidence === 'low') est++;
      });
    });
    return { cells: cells, est: est, nodata: nod };
  }

  /* Anchor text → { caption, levels: [{ n, text }], numeric, note } or null (caller shows the raw text).
   *   'Effective tax on €100,000 of profit: 5 ≤ 13% · 4 ≤ 18% · …'  → caption + numeric levels
   *   '5 = online, no notary … · 3 = … · 1 = …'                     → qualitative levels (gaps allowed)
   * A trailing sentence after the last level ('… Agreement). Adjusted by your target market.') becomes `note`.
   * Works on the German translations too (same structure). */
  function parseAnchors(s) {
    var m = /(^|:\s+)([1-5])(?=\s)/.exec(s || '');
    if (!m) return null;
    var start = m.index + m[1].length, caption = s.slice(0, start).replace(/:\s*$/, '').trim();
    var levels = [], ok = true, prev = 6;
    s.slice(start).split(/\s+·\s+/).forEach(function (seg) {
      var p = /^([1-5])(\s*=\s*|\s+)(\S[\s\S]*)$/.exec(seg.trim());
      if (!p || +p[1] >= prev) { ok = false; return; }
      prev = +p[1];
      levels.push({ n: prev, text: p[3].trim(), eq: p[2].indexOf('=') >= 0 });
    });
    if (!ok || levels.length < 2) return null;
    var numeric = levels.every(function (l) { return !l.eq; }), note = '';
    if (!numeric) {
      var last = levels[levels.length - 1], q = /^([\s\S]*?\S{2}\.)\s+([A-ZÄÖÜ][^.]*\.)$/.exec(last.text);
      if (q) { last.text = q[1].replace(/\.$/, ''); note = q[2]; }
    }
    return { caption: caption, levels: levels, numeric: numeric, note: note };
  }
  /* score badge 1–5 (tonal steps); the number is announced as "Score n:" */
  function ancLvl(n, decorative) {
    return '<span class="anc__lvl anc__lvl--' + n + '" aria-hidden="true">' + n + '</span>' + (decorative ? '' : '<span class="sr-only">' + T('Score {n}:', { n: n }) + ' </span>');
  }

  /* =====================================================================
   * Method page
   * ===================================================================== */
  function viewMethod() {
    var nSrc = Object.keys(D.SOURCES).length, nCrit = D.CRITERIA.length, st = evidenceStats();
    function cn(id) { var c = crit(id); return c ? '<b>' + esc(t(c.short)) + '</b>' : ''; }
    /* one row of the pipeline card (<ol class="msteps">) */
    function step(n, ic, title, line, body) {
      return '<li class="mstep"><div class="mstep__head"><span class="mstep__num" aria-hidden="true">' + n + '</span><div><h3>' + icon(ic) + '<span><span class="sr-only">' + T('Step {n}:', { n: n }) + ' </span>' + title + '</span></h3><p>' + line + '</p></div></div>' +
        (body ? details(t('Details'), body) : '') + '</li>';
    }
    function mcard(id, ic, title, meta, body, cls) { return card(id, ic, title, meta, body, cls, 3); }
    /* section with an h2 (focus target of the jump links) */
    function msec(id, title, body) {
      return '<section class="msec" id="' + id + '" aria-labelledby="' + id + '-h"><h2 class="msec__h" id="' + id + '-h" tabindex="-1">' + title + '</h2>' + body + '</section>';
    }
    function jump(to, label, cls) { return '<button type="button" class="' + cls + '" data-action="jump" data-to="' + to + '">' + label + '</button>'; }

    /* 1 — evidence */
    var s1 = '<p>' + T('Sources: statutes, tax authorities, national registers, OECD, Eurostat, WIPO, the World Bank and established industry reports. Anchors are absolute thresholds, not ranks among the six countries, so a score means the same thing for every country.') + '</p>' +
      '<ul><li>' + T('Every cell carries a confidence level (high, medium, low) and the sources it rests on. Tap any cell in the comparison matrix to see the fact, the note and the links.') + '</li>' +
      '<li>' + T('Where no reliable data exists, the cell is set to the neutral midpoint 3 and labelled “no data” – absence of evidence is not treated as a weakness.') + '</li>' +
      '<li>' + T('Low-confidence cells (proxies, adviser estimates) are labelled “est.”.') + '</li>' +
      '<li>' + T('How many cells are estimates:') + ' ' + jump('lim-title', T('see Limitations'), 'btn btn--text btn--inline') + '</li></ul>';

    /* 2 — weights: start levels as bullets, the answer rules as a table */
    function cns(ids) { return ids.map(cn).join(', '); }
    var wRules = [
      ['Funding: venture capital', ['vc'], '+1'],
      ['Funding: grants', ['grants'], '+1'],
      ['Funding: business angels', ['grants'], '+1', 'Angel tax reliefs such as UK SEIS/EIS are scored here.'],
      ['Funding: accelerator', ['talent'], '+1'],
      ['Funding: own money, friends & family', ['corpTax', 'cost'], '+1 each'],
      ['Exit: sale or IPO', ['exitTax'], '+1'],
      ['Exit: build and keep it', ['corpTax'], '+1'],
      ['Employee equity: yes, broadly', ['esop'], '+1'],
      ['Employee equity: no', ['esop'], 'Weight 0', 'Unless you set that priority yourself.'],
      ['Hires planned in year one', ['labor'], '+1', 'Without that answer: employee equity for all or key hires.'],
      ['Sector: AI & deep tech, hardware, health & life sciences', ['rnd'], '+1']
    ];
    /* explicit ARIA table roles: on phones the rows are restyled as stacked blocks (display changes) */
    var wtable = '<table class="tbl tbl--compact tbl--rules" role="table"><caption class="sr-only">' + T('How your answers change the weights') + '</caption><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">' + T('Your answer') + '</th><th scope="col" role="columnheader">' + T('Criterion') + '</th><th scope="col" role="columnheader">' + T('Effect') + '</th></tr></thead><tbody role="rowgroup">' +
      wRules.map(function (r) {
        return '<tr role="row"><th scope="row" role="rowheader">' + T(r[0]) + '</th><td role="cell">' + cns(r[1]) + (r[3] ? '<small>' + T(r[3]) + '</small>' : '') + '</td><td class="tbl__eff" role="cell">' + T(r[2]) + '</td></tr>';
      }).join('') + '</tbody></table>';
    var s2 = '<ul>' +
      '<li>' + T('Default for most criteria: Somewhat important (1).') + '</li>' +
      '<li>' + cn('residence') + ' ' + T('starts at Important (2) – the home advantage is one of the most robust findings in the literature (Dahl & Sorenson 2012) – and drops to Somewhat important if you would relocate anywhere.') + '</li>' +
      '<li>' + cn('labor') + ' ' + T('and') + ' ' + cn('rnd') + ' ' + T('start at Not important (0); only the answers below raise them.') + '</li></ul>' +
      tableWrap(wtable, t('Weighting rules')) +
      '<ul><li>' + T('Each criterion is raised by at most one level (maximum weight 4). An explicit “Not important” always stays 0. If every weight ends at 0, all criteria are weighted equally.') + '</li></ul>';

    /* 3 — profile adjustments */
    var regions = { dach: 'Germany, Austria, Switzerland', eu: 'Across the EU', uk: 'United Kingdom', us: 'United States', global: 'Global from day one' };
    var mt = E.MARKET_TABLE || {};
    var mtable = '<table class="tbl tbl--compact"><caption class="sr-only">' + T('Market-access score by target market') + '</caption><thead><tr><th scope="col">' + T('First customers') + '</th>' +
      IDS.map(function (k) { return '<th scope="col" class="num">' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      Object.keys(regions).filter(function (r) { return mt[r]; }).map(function (r) {
        return '<tr><th scope="row">' + T(regions[r]) + '</th>' + IDS.map(function (k) { return '<td class="num">' + mt[r][k] + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    var sectors = Object.keys(D.SECTOR_ADJ || {}).map(function (s) {
      var sa = D.SECTOR_ADJ[s];
      return '<li>' + esc(t(sa.label)) + ' → +1 ' + cn('talent') + ' (' + IDS.filter(function (k) { return sa[k]; }).map(function (k) { return esc(t(country(k).name)); }).join(', ') + ') ' + srcLinks(sa.src, 1) + '</li>';
    }).join('');
    var s3 = '<ul>' +
      '<li>' + cn('residence') + ': ' + T('5 where you live, 4 with that citizenship or free movement, 2 if a visa is needed, 1 if permits are quota-limited. The most favourable of your citizenships counts; without answers the score stays at 3.') + '</li>' +
      '<li>' + T('Existing investors → +1 on VC access where they are based (Switzerland / Liechtenstein count together; “Portugal / other EU” lifts Portugal and Germany).') + '</li>' +
      '<li>' + T('US grants: +1 for US citizens, −1 for everyone else (SBIR/STTR requires more than 50% US ownership).') + '</li>' +
      '<li>' + T('Sector: +1 on the ecosystem score only where a source supports it:') + '<ul class="sublist">' + sectors + '</ul>' + T('AI hubs (US, UK) already hold the maximum; software is the least location-bound sector; no comparable country evidence exists for climate & energy or consumer.') + '</li>' +
      '<li>' + T('Target market: the market-access score is set from a fixed table (“in my home country” = 5 at home, 2 elsewhere).') + '</li>' +
      '<li>' + T('Home-base cap: living in a country and selling to its market describe the same fact, so together they may lift the home country by at most {n} score steps. The residence score itself is never reduced.', { n: E.HOME_BASE_CAP }) + '</li>' +
      '<li>' + T('Less than €10k secured: −1 on setup in Switzerland and Liechtenstein, where the minimum capital must be fully paid in before registration.') + '</li></ul>' +
      tableWrap(mtable, t('Market-access table'));

    /* 4 — filters */
    var s4 = '<ul><li>' + T('“Yes, within Europe” → the United States is greyed out.') + '</li><li>' + T('“No, I’ll stay where I live” → only your home country stays eligible (if it is one of the six).') + '</li>' +
      '<li>' + T('Greyed-out countries keep their score, so you can still see what you would give up.') + '</li></ul>';

    /* 5 — ranking & ties */
    var s5 = '<ol class="numlist">' +
      '<li>' + T('Totals are rounded to six decimals before sorting, so floating-point noise can never decide the order.') + '</li>' +
      '<li>' + T('If #1 and #2 are less than {p} points apart, the result is shown as a tie and every country within {p} points of the leader is named. The tool does not pretend to know a winner.', { p: E.TIE_POINTS }) + '</li>' +
      '<li>' + T('Equal totals are ordered by: (1) the stronger home base – the higher residence score, because relocating has costs the model does not score; (2) the scores on your criteria, from most to least important – the first difference decides; (3) only then the fixed order DE, CH, LI, UK, US, PT. This last step is deterministic, not a preference.') + '</li></ol>';

    /* 6 — robustness */
    var s6 = '<ul>' +
      '<li>' + T('Scenarios: each of the {n} priorities is moved one level up and one level down (within 0–3) – up to {m} scenarios. Weights are recomputed through the same answer rules; scenarios in which every weight would be 0 are skipped.', { n: nCrit, m: nCrit * 2 }) + '</li>' +
      '<li><b>' + T('Robust') + '</b>: ' + T('no single one-level change flips the winner, and the lead is at least {g} points.', { g: E.ROBUST_GAP }) + '</li>' +
      '<li><b>' + T('Close') + '</b>: ' + T('at least one single change flips the winner, or the lead is below {g} points.', { g: E.ROBUST_GAP }) + '</li>' +
      '<li><b>' + T('Tie') + '</b>: ' + T('the gap is below {p} points (see step 5).', { p: E.TIE_POINTS }) + '</li>' +
      '<li>' + T('“What would change it” lists up to three priority changes (any level) that would make another country win.') + '</li>' +
      '<li>' + T('The thresholds are conventions chosen for this tool, not empirical results.') + '</li></ul>';

    /* 7 — confidence */
    var s7 = '<ul>' +
      '<li>' + T('Confidence = share of the winner’s fit points that rest on low-confidence or no-data cells.') + '</li>' +
      '<li><b>' + T('High') + '</b> ' + T('below {a}', { a: pct(E.CONF_HIGH_MAX) }) + ' · <b>' + T('Medium') + '</b> ' + T('below {a}', { a: pct(E.CONF_MED_MAX) }) + ' · <b>' + T('Low') + '</b> ' + T('otherwise') + '.</li>' +
      '<li>' + T('A residence score derived from your own answers counts as solid evidence.') + '</li></ul>';

    /* anchors — numeric criteria as a 5→1 threshold strip, qualitative ones as a level ladder */
    var ancNum = [], ancQual = [];
    D.CRITERIA.forEach(function (c) {
      var text = t(c.anchors), a = parseAnchors(text);
      var head = '<div class="anc__crit">' + critIcon(c.id) + '<div><h5 class="anc__name">' + esc(t(c.name)) + '</h5>' +
        (a && a.caption ? '<p class="anc__cap">' + esc(a.caption) + '</p>' : '') + '</div></div>';
      if (!a) { ancQual.push('<li class="anc">' + head + '<p class="anc__raw">' + esc(text) + '</p></li>'); return; }
      var lv = a.levels.map(function (l) {
        /* numeric thresholds: keep "13 %" / "Mrd. $" together; narrow strip cells may still wrap after the operator */
        var x = a.numeric ? l.text.replace(/\s+([%$€])/g, '\u00a0$1') : l.text;
        return '<li>' + ancLvl(l.n) + '<span class="anc__txt">' + esc(x) + '</span></li>';
      }).join('');
      if (a.numeric) ancNum.push('<li class="anc anc--num">' + head + '<ol class="anc__strip" style="--n:' + a.levels.length + '">' + lv + '</ol></li>');
      else ancQual.push('<li class="anc">' + head + '<ol class="anc__ladder">' + lv + '</ol>' + (a.note ? '<p class="anc__note">' + icon('info') + '<span>' + esc(a.note) + '</span></p>' : '') + '</li>');
    });
    var anchors = '<p class="anc__legend"><span class="anc__scale" aria-hidden="true">' + ancLvl(5, true) + icon('arrow_forward') + ancLvl(1, true) + '</span><span>' +
        T('5 is the strongest score, 1 the weakest. Thresholds are absolute, the same for every country; a level without its own description lies between its neighbours.') + '</span></p>' +
      (ancNum.length ? '<h4 class="anc__group">' + T('Numeric thresholds') + '</h4><ul class="anc-list anc-list--num">' + ancNum.join('') + '</ul>' : '') +
      (ancQual.length ? '<h4 class="anc__group">' + T('Qualitative levels') + '</h4><ul class="anc-list anc-list--qual">' + ancQual.join('') + '</ul>' : '');

    /* why Liechtenstein rarely wins */
    var LI = D.SCORES.LI, liRes = E.evaluate({}, true), liRow = rowOf(liRes, 'LI'), liPos = liRes.rows.indexOf(liRow) + 1;
    function liItem(id) {
      var cell = LI[id];
      return '<li><button type="button" class="srow__btn srow__btn--mini" data-action="cell" data-k="LI" data-c="' + id + '">' + critIcon(id) +
        '<span class="srow__main"><span class="srow__name">' + esc(t(crit(id).short)) + '</span><span class="srow__fact">' + esc(t(cell.value)) + '</span></span>' +
        '<span class="srow__score">' + dots(cell.score) + '<b>' + cell.score + '</b>' + confTag(cell) + '</span><span class="sr-only">' + T('Show evidence') + '</span></button></li>';
    }
    var liStrong = D.CRITERIA.filter(function (c) { return c.id !== 'residence' && LI[c.id] && LI[c.id].score >= 4; }).map(function (c) { return liItem(c.id); }).join('');
    var liWeak = D.CRITERIA.filter(function (c) { return c.id !== 'residence' && LI[c.id] && (LI[c.id].score <= 2 || LI[c.id].nodata); }).map(function (c) { return liItem(c.id); }).join('');
    var liCard = mcard('li-title', 'location_city', T('Why Liechtenstein rarely wins'), T('{n} of 6 with default answers', { n: liPos }),
      '<p class="lead">' + T('Liechtenstein has some of the best tax scores in the set, yet with default answers it ranks {pos} of 6 ({s}/100). That is mostly a size and data effect, not a judgement on the country.', { pos: liPos, s: liRow.score }) + '</p>' +
      '<div class="li-more print-open">' + details(t('Show scores and reasons'),
      '<div class="li-cols"><div><h4 class="li-h">' + icon('trending_up') + T('Where it scores high') + '</h4><ul class="slist slist--mini">' + liStrong + '</ul></div>' +
      '<div><h4 class="li-h">' + icon('trending_down') + T('Where it scores low or has no data') + '</h4><ul class="slist slist--mini">' + liWeak + '</ul></div></div>' +
      '<ul class="bullets">' +
        '<li><b>' + T('Missing from international indices.') + '</b> ' + T('With about 40,000 inhabitants it is not ranked in the Global Innovation Index or by Startup Genome, so the ecosystem score falls to anchor 1.') + '</li>' +
        '<li><b>' + T('Tiny VC market.') + '</b> ' + T('Almost no recorded venture rounds in recent years; founders typically raise from Swiss, Austrian or international investors.') + '</li>' +
        '<li><b>' + T('Quota-limited residence.') + '</b> ' + T('Even EEA and Swiss citizens get residence permits only within quotas (partly by lottery), so the residence score is 1 unless you are a citizen or already live there.') + '</li>' +
        '<li><b>' + T('Swiss proxies and estimates.') + '</b> ' + T('Eurostat publishes no price level for Liechtenstein, so living cost uses Switzerland’s level; no comparable grant programme was found, so grants are “no data” (neutral 3).') + '</li>' +
        '<li><b>' + T('When it can come out on top.') + '</b> ' + T('Founders who already live there and rate profit and exit tax as crucial – especially in fintech and blockchain, where its token law (TVTG) earns an ecosystem bonus.') + '</li>' +
      '</ul>') + '</div>');

    /* limitations */
    var limits = mcard('lim-title', 'warning', T('Limitations'), '',
      '<ul class="bullets">' +
        '<li><b>' + T('Country level, not city level.') + '</b> ' + T('Costs and ecosystems in London, Zurich or the Bay Area differ markedly from national averages; US state taxes vary.') + '</li>' +
        '<li><b>' + T('Data cut-off {d}.', { d: asOf() }) + '</b> ' + T('Tax rates, thresholds and visa rules change; check the linked primary sources before acting.') + '</li>' +
        '<li><b>' + T('Some scores are estimates.') + '</b> ' + T('Estimates: {a} of {n} cells · no data: {b}. Both are labelled “est.” and “no data” everywhere.', { a: st.est, b: st.nodata, n: st.cells }) + '</li>' +
        '<li><b>' + T('Costs are estimates.') + '</b> ' + T('Payroll on-costs (for a €60,000 salary) and first-year costs assume a standard set-up and fixed exchange rates.') + '</li>' +
        '<li><b>' + T('Personal tax is not scored.') + '</b> ' + T('Income tax, wealth tax and social security for founders are shown on the country profiles for information only. Exit tax compares shares held privately; holding structures appear as tips, not scores.') + '</li>' +
        '<li><b>' + T('Additive model.') + '</b> ' + T('Criteria are weighted and summed independently; interactions between them (e.g. visa and talent) are not modelled.') + '</li>' +
        '<li><b>' + T('Not legal or tax advice.') + '</b> ' + T('A structured starting point for a conversation with a lawyer and a tax adviser.') + '</li>' +
      '</ul>');

    /* literature, course reading, sources */
    var lit = D.LITERATURE.map(function (l) { return '<li><a href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.c) + '</a><span>' + esc(t(l.use)) + '</span></li>'; }).join('');
    var reading = (D.COURSE_READING || []).map(function (r) {
      var host = ''; try { host = r.u.split('/')[2].replace(/^www\./, ''); } catch (e) { host = ''; }
      return '<li><a href="' + esc(r.u) + '" target="_blank" rel="noopener noreferrer">' + icon('open_in_new') + '<span>' + esc(r.t) + '<span class="sr-only"> (' + T('opens in a new tab') + ')</span></span></a><span>' + esc(host) + '</span></li>';
    }).join('');
    var groups = [['law', 'Statutes & legal texts'], ['official', 'Government & official bodies'], ['intl', 'International organisations'], ['academic', 'Academic'], ['report', 'Industry reports'], ['expert', 'Expert & adviser publications']];
    var srcs = groups.map(function (g) {
      var items = Object.keys(D.SOURCES).filter(function (k) { return D.SOURCES[k].type === g[0]; });
      if (!items.length) return '';
      return details(t(g[1]) + ' (' + items.length + ')', '<ul class="srclist">' + items.map(function (k) { var s = D.SOURCES[k]; return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.t) + '</a><span>' + esc(s.p) + ' · ' + T('accessed {d}', { d: D.DATA_AS_OF }) + '</span></li>'; }).join('') + '</ul>');
    }).join('');

    return '<section class="method page page--method has-bg anim">' + pageBg('method') +
      '<div class="method__head"><span class="overline">' + icon('menu_book') + T('Method & sources') + '</span><h1 tabindex="-1">' + T('How it’s calculated') + '</h1>' +
        (UI.i18n && UI.i18n.lang() === 'de' ? '<p class="disclaimer">' + icon('translate') + T('Source titles are shown in their original language.') + '</p>' : '') +
        '<p class="page__lead">' + T('A deterministic decision helper: no generative AI runs at any point, so every result can be traced back to a source.') + '</p>' +
        '<ul class="chips"><li class="chip">' + icon('verified') + T('Deterministic') + '</li><li class="chip">' + icon('link') + T('Sourced · {n} sources', { n: nSrc }) + '</li><li class="chip">' + icon('repeat') + T('Reproducible') + '</li><li class="chip">' + icon('event') + T('Data as of {d}', { d: asOf() }) + '</li></ul>' +
        '<nav class="mjump" aria-labelledby="mjump-label"><span class="sr-only" id="mjump-label">' + T('On this page') + '</span><ul>' +
          [['m-score', 'How the score works'], ['m-caveats', 'Caveats'], ['m-sources', 'Sources']].map(function (j) {
            return '<li>' + jump(j[0], icon('arrow_downward') + T(j[1]), 'btn btn--text') + '</li>';
          }).join('') + '</ul></nav></div>' +
      msec('m-score', T('How the score works'),
      '<section class="card card--primary formula-card"><span class="label">' + T('Fit score') + '</span><div class="formula">Fit = 100 × Σ w<sub>c</sub> · (s<sub>c</sub> − 1) / 4  ÷  Σ w<sub>c</sub></div>' +
        '<p class="formula-card__key"><span>' + T('w = weight of criterion c (0–4)') + '</span><span>' + T('s = the country’s evidence score on c (1–5), after profile adjustments') + '</span></p>' +
        '<ul class="fact-tiles"><li class="fact-tile">' + icon('star') + '<b>100</b><span>' + T('5/5 on everything you weight') + '</span></li><li class="fact-tile">' + icon('star_outline') + '<b>0</b><span>' + T('1/5 on everything you weight') + '</span></li><li class="fact-tile">' + icon('tune') + '<b>' + nCrit + '</b><span>' + T('criteria, each weighted 0–4') + '</span></li></ul></section>' +
      '<section class="card mpipe"><ol class="msteps" aria-label="' + T('Calculation steps') + '">' +
      step(1, 'fact_check', T('Evidence scores 1–5'), T('Legal and statistical facts mapped to fixed anchor scales.'), s1) +
      step(2, 'tune', T('Weights from your priorities'), T('Not important 0 · Somewhat 1 · Important 2 · Crucial 3 – plus at most +1 from your answers.'), s2) +
      step(3, 'person_pin', T('Profile adjustments'), T('Whole steps only, always within 1–5.'), s3) +
      step(4, 'filter_alt', T('Filters'), T('Relocation answers grey out countries – never hide them.'), s4) +
      step(5, 'balance', T('Ranking & tie-break'), T('A gap below {p} points is a tie; equal totals are ordered by fixed, documented rules.', { p: E.TIE_POINTS }), s5) +
      step(6, 'shield', T('Robustness'), T('Every priority shifted ±1 level to test whether the winner holds.'), s6) +
      step(7, 'signal_cellular_alt', T('Confidence'), T('How much of the winner’s score rests on estimates or missing data.'), s7) +
      '</ol></section>' +
      mcard('anc-title', 'straighten', T('Scoring anchors'), T('{n} criteria', { n: nCrit }),
        '<p class="anc__intro">' + T('Which fact earns which score, for every criterion.') + '</p>' +
        '<div class="anc-more print-open">' + details(t('Show anchor scales'), anchors) + '</div>')) +
      msec('m-caveats', T('Caveats'), limits + liCard) +
      msec('m-sources', T('Sources'),
        mcard('src-title', 'library_books', T('All data sources'), T('cut-off {d}', { d: D.DATA_AS_OF }), srcs) +
        mcard('lit-title', 'school', T('Peer-reviewed foundations'), T('{n} papers', { n: D.LITERATURE.length }), details(t('Show literature'), '<ul class="srclist">' + lit + '</ul>')) +
        (reading ? mcard('read-title', 'menu_book', T('Course reading'), T('TUM seminar “Smart Start” · T18'),
          '<div class="read-more print-open">' + details(t('Show course reading'), '<ul class="linklist">' + reading + '</ul>') + '</div>') : '')) +
      '<div class="page__cta">' + primaryCta() +
        '<button type="button" class="btn btn--outlined btn--lg" data-action="country" data-k="DE">' + icon('public') + T('Country profiles') + '</button>' +
        '<button type="button" class="btn btn--text btn--lg" data-action="about">' + icon('info') + T('About this tool') + '</button></div>' +
      '</section>';
  }

  /* =====================================================================
   * About page
   * ===================================================================== */
  function viewAbout() {
    var nSrc = Object.keys(D.SOURCES).length;
    var countries = D.COUNTRIES.map(function (c) { return esc(t(c.name)); });
    function go(action, k, ic, label) { return '<button type="button" class="btn btn--tonal" data-action="' + action + '"' + (k ? ' data-k="' + k + '"' : '') + '>' + icon(ic) + T(label) + '</button>'; }
    var qmap = [
      ['gavel', 'Which legal forms exist – and what do they require for setup, liability and taxation?',
        'Country profiles: a table of every common legal form (minimum capital, liability, notary, profit tax, setup time and cost, steps). The criteria “Fast, simple company setup” and “Low tax on company profits” score them.',
        go('country', 'CH', 'public', 'Open a country profile')],
      ['compare_arrows', 'How does founding there compare with Germany – bureaucracy, speed, cost?',
        'Every country profile compares the typical legal form and the first-year running costs with a German GmbH; the setup criterion scores notary duties, fees and paid-in capital.',
        go('country', 'UK', 'compare_arrows', 'Compare UK vs Germany')],
      ['hub', 'How strong are the startup ecosystem and the funding options?',
        'Four scored criteria: venture capital, public funding & grants, R&D tax incentives and the talent pool & ecosystem – adjusted for your sector and your investors.',
        go('method', '', 'menu_book', 'See how they are scored')],
      ['percent', 'What about tax – stock options, exit tax and capital gains?',
        'Scored criteria for employee stock options and for tax on selling your shares; each country profile adds personal income tax, dividends and bookkeeping duties.',
        go('country', 'DE', 'percent', 'Tax facts for Germany')],
      ['route', 'Which location do you recommend – and what are the next steps?',
        'The result names the best fit with a robustness check, reasons, trade-offs and warnings, shows what would change it, and gives a step-by-step founding roadmap.',
        hasAnswers() ? go('results', '', 'arrow_forward', 'My result') : go('start', '', 'arrow_forward', 'Find my location')]
    ];
    var qrows = qmap.map(function (q, i) {
      return '<li class="qmap__item"><span class="qmap__num" aria-hidden="true">' + (i + 1) + '</span><div class="qmap__body"><h3>' + icon(q[0]) + '<span>' + T(q[1]) + '</span></h3><p>' + T(q[2]) + '</p><div>' + q[3] + '</div></div></li>';
    }).join('');
    var feats = [
      ['checklist', '{q} quick questions', 'Click-only, every question can be skipped. Then rate how much each of the {n} criteria matters to you.'],
      ['leaderboard', 'A transparent ranking', 'Six countries scored 0–100 with one documented formula. Same answers, same result – every time.'],
      ['fact_check', 'Evidence behind every number', '{s} sources: statutes, tax authorities, OECD, Eurostat and peer-reviewed research. Tap any score to see it.']
    ].map(function (f) {
      return '<li class="feature">' + '<span class="feature__icon">' + icon(f[0]) + '</span><h3>' + T(f[1], { q: E.QUESTIONS.length }) + '</h3><p>' + T(f[2], { n: D.CRITERIA.length, s: nSrc }) + '</p></li>';
    }).join('');
    var team = TEAM.length ? '<ul class="chips">' + TEAM.map(function (n) { return '<li class="chip">' + icon('person') + esc(n) + '</li>'; }).join('') + '</ul>' : '';

    return '<section class="method page page--about has-bg anim">' + pageBg('method') +
      '<div class="method__head"><span class="overline">' + icon('info') + T('About') + '</span><h1 tabindex="-1">' + T('About FoundersNavigator') + '</h1>' +
        '<p class="page__lead">' + T('A decision helper that recommends where to found your startup – {list} – from your profile and a documented evidence base.', { list: countries.slice(0, -1).join(', ') + ' ' + t('or') + ' ' + countries[countries.length - 1] }) + '</p>' +
        '<ul class="chips"><li class="chip">' + icon('verified') + T('Deterministic – no generative AI') + '</li><li class="chip">' + icon('lock') + T('Runs only in your browser') + '</li><li class="chip">' + icon('school') + T('TUM seminar “Smart Start” · Topic T18') + '</li></ul></div>' +
      '<ul class="features about-features">' + feats + '</ul>' +
      card('t18-title', 'school', T('The T18 questions – and where the tool answers them'), T('{n} questions', { n: qmap.length }), '<ol class="qmap">' + qrows + '</ol>') +
      '<div class="about-grid">' +
        card('tech-title', 'lock', T('Technology & privacy'), '',
          '<ul class="bullets">' +
            '<li>' + T('A static website: HTML, CSS and plain JavaScript, no build step and no server-side code.') + '</li>' +
            '<li>' + T('Your answers never leave your device. They are kept in this browser’s local storage; a share link carries them in the part of the URL after “#”, which browsers do not send to servers.') + '</li>' +
            '<li>' + T('No accounts, no cookies, no tracking. The only network requests load fonts and icons.') + '</li>' +
            '<li>' + T('Open source – the scoring engine, the evidence base and the tests can be read and re-run by anyone.') + ' ' +
              (REPO_URL ? '<a href="' + esc(REPO_URL) + '" target="_blank" rel="noopener noreferrer">' + T('Source code') + '<span class="sr-only"> (' + T('opens in a new tab') + ')</span></a>' : '') + '</li>' +
          '</ul>') +
        card('cred-title', 'groups', T('Credits'), '',
          '<p>' + T('Created for the TUM seminar “Smart Start – Financial, Tax, and Legal Fundamentals for Entrepreneurs”, topic T18: choosing the location for a startup.') + '</p>' + team +
          '<ul class="fact-tiles fact-tiles--plain"><li class="fact-tile">' + icon('event') + '<b>' + esc(asOf()) + '</b><span>' + T('data cut-off') + '</span></li><li class="fact-tile">' + icon('library_books') + '<b>' + nSrc + '</b><span>' + T('sources') + '</span></li><li class="fact-tile">' + icon('grid_view') + '<b>' + (D.COUNTRIES.length * D.CRITERIA.length) + '</b><span>' + T('scored cells') + '</span></li></ul>') +
      '</div>' +
      '<section class="card card--outlined about-disc" aria-labelledby="disc-title"><h2 id="disc-title">' + icon('gavel') + T('Disclaimer') + '</h2>' +
        '<p>' + T('FoundersNavigator is an educational decision aid, not legal, tax or immigration advice. Laws, rates and procedures change and individual circumstances matter. Check the linked primary sources and talk to a lawyer and a tax adviser before you incorporate.') + '</p></section>' +
      '<div class="page__cta">' + primaryCta() +
        '<button type="button" class="btn btn--outlined btn--lg" data-action="method">' + icon('menu_book') + T('How it’s calculated') + '</button></div>' +
      '</section>';
  }

  /* =====================================================================
   * Country profile
   * ===================================================================== */
  function cmpTag(better, worse, labels) {
    if (better) return '<span class="chip chip--small chip--success">' + icon('trending_up') + T(labels[0]) + '</span>';
    if (worse) return '<span class="chip chip--small chip--warning">' + icon('trending_down') + T(labels[1]) + '</span>';
    return '<span class="chip chip--small">' + icon('remove') + T('Similar') + '</span>';
  }
  function mid(r) { return (r.min + r.max) / 2; }
  function sumCost(F) {
    var o = { oneOff: 0, rec: 0, locked: 0, payroll: null };
    (F && F.items || []).forEach(function (it) {
      if (it.id === 'capitalLocked') o.locked = it.eur;
      else if (it.id === 'payrollPerEmployee') o.payroll = it.eur;
      else if (it.oneOff) o.oneOff += it.eur; else o.rec += it.eur;
    });
    return o;
  }
  function days(n) { return t('{n} days', { n: n }); }

  function viewCountry() {
    var state = A().state;
    var k = state.countryId && country(state.countryId) ? state.countryId : 'DE';
    state.countryId = k;
    var c = country(k), S = D.SCORES[k], isDE = k === 'DE';
    var answered = hasAnswers();
    var res = answered ? A().evaluate() : null;
    var row = res ? rowOf(res, k) : null;
    var pos = row ? res.rows.indexOf(row) + 1 : 0;
    var srcSet = {};
    D.CRITERIA.forEach(function (cr) { (S[cr.id] && S[cr.id].sources || []).forEach(function (s) { srcSet[s] = 1; }); });

    /* header */
    var rankChip = row ? (row.excluded
      ? '<li class="chip chip--warning">' + icon('location_off') + T('Excluded by your answers') + '</li>'
      : '<li class="chip chip--tonal">' + icon('leaderboard') + T('#{p} of 6 for you · fit {s}', { p: pos, s: row.score }) + '</li>') : '';
    var head = '<div class="page__top"><button type="button" class="btn btn--text" data-action="' + (answered ? 'results' : 'home') + '">' + icon('arrow_back') + T(answered ? 'Back to my result' : 'Back to start') + '</button></div>' +
      '<header class="cp-head">' + avatar(k, false, 'avatar--xl') + '<div class="cp-head__text">' +
        '<span class="overline">' + icon('public') + T('Country profile') + '</span><h1 tabindex="-1">' + esc(t(c.name)) + '</h1>' +
        '<p class="page__lead">' + esc(t(c.hub)) + ' · ' + esc(t(c.entity)) + '</p>' +
        '<ul class="chips">' + rankChip + '<li class="chip">' + icon('link') + T('{n} sources', { n: Object.keys(srcSet).length }) + '</li><li class="chip">' + icon('event') + T('Data as of {d}', { d: asOf() }) + '</li></ul>' +
      '</div></header>' + countryChips(k, t('Choose a country'));

    /* evidence scores */
    var srows = D.CRITERIA.map(function (cr) {
      var cell = S[cr.id] || { score: 3, nodata: true, confidence: 'low', sources: [], value: t('No data yet') };
      var fact = t(cell.value), mine = '';
      if (row) {
        var s = row.scores[cr.id];
        if (cr.id === 'residence' && row.residence) fact = t(row.residence.text);
        if (s && s.value !== cell.score) mine = '<span class="ptag ptag--mine">' + T('you: {v}/5', { v: s.value }) + '</span>';
      }
      return '<li class="srow"><button type="button" class="srow__btn" data-action="cell" data-k="' + k + '" data-c="' + cr.id + '">' + critIcon(cr.id) +
        '<span class="srow__main"><span class="srow__name">' + esc(t(cr.name)) + '</span><span class="srow__fact">' + esc(fact) + '</span></span>' +
        '<span class="srow__score">' + dots(cell.score) + '<b>' + cell.score + '<small>/5</small></b>' + confTag(cell) + mine + '</span>' +
        '<span class="sr-only">' + T('Show evidence') + '</span>' + icon('expand_more', 'srow__chev') + '</button>' +
        (cell.sources.length ? '<div class="srow__src">' + srcLinks(cell.sources, 2) + '</div>' : '') + '</li>';
    }).join('');
    var scores = card('cp-scores', 'grid_view', T('Evidence scores'), T('tap a row for the evidence'),
      (answered ? '<p class="muted">' + T('Scores before your profile adjustments; “you” shows the adjusted value where your answers change it.') + '</p>' : '') +
      '<ul class="slist">' + srows + '</ul>');

    /* legal forms */
    var forms = D.LEGAL_FORMS[k] || [], deForms = D.LEGAL_FORMS.DE || [];
    var ref = deForms.filter(function (f) { return f.id === 'gmbh'; })[0] || deForms[0];
    var cols = forms.slice();
    if (!isDE && ref) cols.push(ref);
    function isRef(f, i) { return !isDE && i === cols.length - 1; }
    var rowsDef = [
      [t('Local name'), function (f) { return esc(f.local); }],
      [t('Minimum capital'), function (f) { return esc(t(f.minCapital.text)); }],
      [t('Paid in before registration'), function (f) { return '<b>' + esc(eur(f.minCapital.paidInEur)) + '</b>'; }],
      [t('Liability'), function (f) { return esc(t(f.liability)); }],
      [t('Notary'), function (f) { return '<b>' + T(f.notary ? 'Required' : 'Not required') + '</b><br><span class="muted">' + esc(t(f.notaryText)) + '</span>'; }],
      [t('Profit tax'), function (f) { return esc(t(f.profitTax)); }],
      [t('Setup time'), function (f) { return '<b>' + esc(t('{r} days', { r: range(f.setupDays.min, f.setupDays.max, cnt) })) + '</b>'; }],
      [t('Setup cost'), function (f) { return '<b>' + esc(eurRange(f.setupCostEur.min, f.setupCostEur.max)) + '</b>'; }],
      [t('Mandatory steps'), function (f) { return '<b>' + f.steps + '</b>'; }],
      [t('Sources'), function (f) { return '<div class="tbl__src">' + srcLinks(f.sources, 3) + '</div>'; }]
    ];
    var lfTable = '<table class="tbl tbl--forms" style="--cols:' + cols.length + '"><caption class="sr-only">' + T('Legal forms in {c}', { c: t(c.name) }) + '</caption><thead><tr><td></td>' +
      cols.map(function (f, i) {
        return '<th scope="col"' + (isRef(f, i) ? ' class="is-ref"' : '') + '><span class="tbl__formhead"><span class="tbl__form">' + esc(f.name) + '</span>' +
          (isRef(f, i) ? '<span class="chip chip--small">' + icon('compare_arrows') + T('Germany · reference') + '</span>' : (f.typical ? '<span class="chip chip--small chip--tonal">' + icon('star') + T('Typical') + '</span>' : '')) + '</span></th>';
      }).join('') + '</tr></thead><tbody>' +
      rowsDef.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th>' + cols.map(function (f, i) { return '<td' + (isRef(f, i) ? ' class="is-ref"' : '') + '>' + r[1](f) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table>';
    var notes = forms.map(function (f) { return '<li><b>' + esc(f.name) + '</b><span>' + esc(t(f.note)) + '</span></li>'; }).join('');

    var typ = forms.filter(function (f) { return f.typical; })[0] || forms[0];
    var cmp = '';
    var costK = sumCost(D.FIRST_YEAR_COST[k]), costDE = sumCost(D.FIRST_YEAR_COST.DE);
    if (typ && ref) {
      var tiles = [
        ['timer', t('Setup time'), t('{r} days', { r: range(typ.setupDays.min, typ.setupDays.max, cnt) }), t('{r} days', { r: range(ref.setupDays.min, ref.setupDays.max, cnt) }), mid(typ.setupDays) - mid(ref.setupDays), ['Faster', 'Slower']],
        ['shopping_cart', t('Setup cost'), eurRange(typ.setupCostEur.min, typ.setupCostEur.max), eurRange(ref.setupCostEur.min, ref.setupCostEur.max), mid(typ.setupCostEur) - mid(ref.setupCostEur), ['Cheaper', 'Costlier']],
        ['savings', t('Capital paid in up front'), eur(typ.minCapital.paidInEur), eur(ref.minCapital.paidInEur), typ.minCapital.paidInEur - ref.minCapital.paidInEur, ['Less', 'More']],
        ['gavel', t('Notary'), t(typ.notary ? 'Required' : 'Not required'), t(ref.notary ? 'Required' : 'Not required'), (typ.notary ? 1 : 0) - (ref.notary ? 1 : 0), ['No notary', 'Notary needed']],
        ['checklist', t('Mandatory steps'), String(typ.steps), String(ref.steps), typ.steps - ref.steps, ['Fewer', 'More']],
        ['event', t('Running costs, year one'), eur(costK.rec), eur(costDE.rec), costK.rec - costDE.rec, ['Cheaper', 'Costlier']]
      ];
      cmp = '<div class="cmp"><h3 class="cmp__title">' + icon('compare_arrows') + (isDE
          ? T('{a} vs {b}', { a: (deForms.filter(function (f) { return f.id === 'ug'; })[0] || typ).name, b: ref.name })
          : T('{a} vs Germany GmbH', { a: typ.name })) + '</h3><ul class="cmp__tiles">' +
        (isDE ? (function () {
          var ug = deForms.filter(function (f) { return f.id === 'ug'; })[0];
          if (!ug) return '';
          return [
            ['timer', t('Setup time'), t('{r} days', { r: range(ug.setupDays.min, ug.setupDays.max, cnt) }), t('{r} days', { r: range(ref.setupDays.min, ref.setupDays.max, cnt) }), mid(ug.setupDays) - mid(ref.setupDays), ['Faster', 'Slower']],
            ['shopping_cart', t('Setup cost'), eurRange(ug.setupCostEur.min, ug.setupCostEur.max), eurRange(ref.setupCostEur.min, ref.setupCostEur.max), mid(ug.setupCostEur) - mid(ref.setupCostEur), ['Cheaper', 'Costlier']],
            ['savings', t('Capital paid in up front'), eur(ug.minCapital.paidInEur), eur(ref.minCapital.paidInEur), ug.minCapital.paidInEur - ref.minCapital.paidInEur, ['Less', 'More']]
          ].map(function (x) { return tile(x, 'GmbH'); }).join('');
        })() : tiles.map(function (x) { return tile(x, t('Germany')); }).join('')) +
        '</ul></div>';
    }
    function tile(x, refName) {
      var d = x[4];
      return '<li class="cmp__tile"><span class="cmp__label">' + icon(x[0]) + esc(x[1]) + '</span><b>' + esc(x[2]) + '</b><span class="cmp__ref">' + esc(refName) + ': ' + esc(x[3]) + '</span>' +
        cmpTag(d < 0, d > 0, x[5]) + '</li>';
    }
    var legal = card('cp-legal', 'gavel', T('Legal forms'), isDE ? T('Germany is the reference') : T('vs Germany GmbH'),
      cmp + tableWrap(lfTable, t('Legal forms table')) +
      (notes ? details(t('Notes on each form'), '<ul class="notelist">' + notes + '</ul>') : ''));

    /* tax at a glance */
    var TF = D.TAX_FACTS[k] || {};
    var taxItems = [
      ['corpTax', 'percent', t('Company profit tax'), S.corpTax],
      ['exitTax', 'sell', t('Selling your shares (exit / capital gains)'), S.exitTax],
      ['esop', 'groups', t('Employee stock options'), S.esop],
      ['personal', 'person', t('Personal income tax'), TF.personal],
      ['dividend', 'savings', t('Dividends'), TF.dividend],
      ['compliance', 'checklist', t('Bookkeeping & compliance'), TF.compliance]
    ].filter(function (x) { return x[3]; }).map(function (x) {
      var f = x[3], scored = !!crit(x[0]);
      return '<li class="taxitem"><div class="taxitem__head">' + icon(x[1]) + '<h3>' + esc(x[2]) + '</h3>' +
        (scored ? '<span class="taxitem__score" title="' + T('Score') + '">' + dots(f.score) + '<b>' + f.score + '</b></span>' : '<span class="ptag">' + T('not scored') + '</span>') + '</div>' +
        '<p class="taxitem__value">' + esc(t(f.value)) + '</p>' +
        '<div class="taxitem__foot">' + srcLinks(f.sources, 2) + (f.confidence ? '<span class="ptag">' + T('{c} confidence', { c: t(f.confidence) }) + '</span>' : '') + '</div>' +
        (f.note ? details(t('Details'), '<p>' + esc(t(f.note)) + '</p>') : '') + '</li>';
    }).join('');
    var tax = card('cp-tax', 'percent', T('Tax at a glance'), T('scored and informational'), '<ul class="taxgrid">' + taxItems + '</ul>');

    /* first-year cost */
    var F = D.FIRST_YEAR_COST[k], FD = D.FIRST_YEAR_COST.DE;
    var costCard = '';
    if (F && F.items) {
      var deItem = function (id) { return (FD && FD.items || []).filter(function (x) { return x.id === id; })[0]; };
      var costRows = F.items.filter(function (it) { return it.id !== 'capitalLocked' && it.id !== 'payrollPerEmployee'; }).map(function (it) {
        var de = deItem(it.id);
        return '<tr><th scope="row"><span class="tbl__item">' + esc(t(it.label)) + '</span><span class="tbl__note">' + esc(t(it.note)) + '</span></th><td><span class="ptag">' + T(it.oneOff ? 'one-off' : 'per year') + '</span></td><td class="num"><b>' + esc(eur(it.eur)) + '</b></td>' +
          (isDE ? '' : '<td class="num is-ref">' + (de ? esc(eur(de.eur)) : '–') + '</td>') + '</tr>';
      }).join('');
      var total = costK.oneOff + costK.rec, totalDE = costDE.oneOff + costDE.rec, diff = total - totalDE;
      var sumRow = function (label, a, b) { return '<tr class="tbl__sum"><th scope="row">' + esc(label) + '</th><td></td><td class="num"><b>' + esc(eur(a)) + '</b></td>' + (isDE ? '' : '<td class="num is-ref">' + esc(eur(b)) + '</td>') + '</tr>'; };
      var lockedRow = function (id, label) {
        var it = F.items.filter(function (x) { return x.id === id; })[0], de = deItem(id);
        if (!it) return '';
        return '<tr class="tbl__aside"><th scope="row"><span class="tbl__item">' + esc(label) + '</span><span class="tbl__note">' + esc(t(it.note)) + '</span></th><td><span class="ptag">' + T('separate') + '</span></td><td class="num">' + esc(eur(it.eur)) + '</td>' + (isDE ? '' : '<td class="num is-ref">' + (de ? esc(eur(de.eur)) : '–') + '</td>') + '</tr>';
      };
      var costTable = '<table class="tbl tbl--cost"><caption class="sr-only">' + T('First-year cost estimate') + '</caption><thead><tr><th scope="col">' + T('Item') + '</th><th scope="col">' + T('Type') + '</th><th scope="col" class="num">' + esc(t(c.name)) + '</th>' + (isDE ? '' : '<th scope="col" class="num is-ref">' + T('Germany') + '</th>') + '</tr></thead><tbody>' +
        costRows + sumRow(t('One-off'), costK.oneOff, costDE.oneOff) + sumRow(t('Per year'), costK.rec, costDE.rec) + sumRow(t('Year one in total'), total, totalDE) +
        lockedRow('capitalLocked', t('Paid-in share capital (not a cost)')) + lockedRow('payrollPerEmployee', t('Employer on-costs per €60k employee')) + '</tbody></table>';
      costCard = card('cp-cost', 'shopping_cart', T('First-year cost'), T('estimate'),
        '<ul class="fact-tiles fact-tiles--plain"><li class="fact-tile">' + icon('shopping_cart') + '<b>' + esc(eur(total)) + '</b><span>' + T('company costs in year one, excl. salaries') + '</span></li>' +
          (isDE ? '' : '<li class="fact-tile">' + icon(diff <= 0 ? 'trending_down' : 'trending_up') + '<b>' + (diff <= 0 ? '−' : '+') + esc(eur(Math.abs(diff))) + '</b><span>' + T('vs Germany ({d})', { d: eur(totalDE) }) + '</span></li>') +
          (costK.payroll != null ? '<li class="fact-tile">' + icon('groups') + '<b>' + esc(eur(costK.payroll)) + '</b><span>' + T('employer on-costs per €60k employee') + '</span></li>' : '') + '</ul>' +
        tableWrap(costTable, t('First-year cost table')) +
        (F.note ? '<p class="muted cost-note">' + icon('info') + '<span>' + esc(t(F.note)) + '</span></p>' : ''));
    }

    /* roadmap */
    var rm = D.ROADMAP[k] || [];
    var roadmap = rm.length ? card('cp-road', 'route', T('Founding roadmap'), T('{n} steps', { n: rm.length }),
      '<ol class="roadmap">' + rm.map(function (s) { return '<li><div><strong>' + esc(t(s.t)) + '</strong><p>' + esc(t(s.d)) + '</p>' + srcLink(s.src) + '</div></li>'; }).join('') + '</ol>') : '';

    /* CTA */
    var ctaText = row
      ? (row.excluded ? T('{c} is greyed out by your relocation answer ({r}).', { c: t(c.name), r: t(row.excluded) }) : T('For your answers, {c} ranks #{p} of 6 with a fit of {s}/100.', { c: t(c.name), p: pos, s: row.score }))
      : T('Answer a few questions to see how {c} fits your startup compared with the other five.', { c: t(c.name) });
    var cta = '<section class="card card--primary cp-cta" aria-labelledby="cp-cta-title"><div><h2 id="cp-cta-title">' + icon('compare_arrows') + T('Compare with my result') + '</h2><p>' + ctaText + '</p></div>' +
      '<div class="page__cta">' + primaryCta() + '<button type="button" class="btn btn--outlined btn--lg" data-action="method">' + icon('menu_book') + T('How scores are calculated') + '</button></div></section>';

    return '<section class="method page page--country has-bg anim">' + pageBg('method') + head + scores + legal + tax + costCard + roadmap + cta + '</section>';
  }

  UI.views.method = viewMethod;
  UI.views.about = viewAbout;
  UI.views.country = viewCountry;
  /* print: the method page's collapsible cards (.print-open) are expanded, then restored */
  if (root.addEventListener && root.document) {
    var printOpened = [];
    root.addEventListener('beforeprint', function () {
      printOpened = Array.prototype.slice.call(root.document.querySelectorAll('.method .print-open details:not([open])'));
      printOpened.forEach(function (d) { d.setAttribute('open', ''); });
    });
    root.addEventListener('afterprint', function () { printOpened.forEach(function (d) { d.removeAttribute('open'); }); printOpened = []; });
  }
  /* in-page jump (method page): data-to = id of a section, card or heading. Not an href="#…" link,
   * because app.js keeps share state in location.hash. Scrolls (smoothly unless reduced motion)
   * and moves focus to the heading so keyboard and screen-reader users land there too. */
  UI.actions.jump = function (el) {
    var target = root.document.getElementById(el.getAttribute('data-to'));
    if (!target) return;
    var box = target.closest('.card, .msec') || target;
    var h = /^H[1-6]$/.test(target.tagName) ? target : box.querySelector('h2, h3');
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  };
  UI.actions.about = function () { A().go('about'); };
  UI.actions.country = function (el) {
    // with data-k: that country; without (top nav): the last profile viewed → the current result's
    // top country → Germany
    var st = A().state, k = el && el.getAttribute('data-k');
    if (!(k && country(k))) {
      k = st.countryId && country(st.countryId) ? st.countryId : null;
      if (!k && hasAnswers()) { try { var r = A().evaluate(); k = r && r.top ? r.top.id : null; } catch (e) { k = null; } }
    }
    st.countryId = k && country(k) ? k : 'DE';
    A().go('country');
  };
})(this);
