/*
 * Smart Start Location Navigator — deterministic recommendation engine
 * ---------------------------------------------------------------------
 * Same answers in → same result out. No randomness, no network, no AI.
 *
 * 1. Weights   w_c = priority level (0–3, default 1) + documented answer rules (cap 4)
 * 2. Scores    s_kc = evidence score (1–5) + documented profile adjustments (clamped 1–5)
 * 3. Fit       Fit_k = 100 · Σ w_c·(s_kc − 1)/4 / Σ w_c   (additive value model)
 * 4. Personal  + home advantage, − residence/visa friction (points, clamped 0–100)
 * 5. Filters   relocation choices exclude countries (shown greyed, never hidden)
 * 6. Robustness: every weight shifted ±1 level → share of cases with the same winner
 */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.SSN_DATA;

  var QUESTIONS = [
    { id: 'citizenship', block: 'you', type: 'single', title: 'What is your citizenship?',
      help: 'Decides where you can live and work without a visa.',
      options: [
        { v: 'eu', l: 'EU / EEA', s: 'Any EU country, Iceland, Norway' },
        { v: 'ch', l: 'Switzerland', s: 'Swiss passport' },
        { v: 'uk', l: 'United Kingdom', s: 'British passport' },
        { v: 'us', l: 'United States', s: 'US passport or green card' },
        { v: 'other', l: 'Other', s: 'Non-EU, non-Swiss, non-UK, non-US' }
      ] },
    { id: 'residence', block: 'you', type: 'single', title: 'Where do you live right now?',
      help: 'Founders tend to do better where they have local roots — and where you manage the company usually decides where it pays tax.',
      options: [
        { v: 'DE', l: 'Germany' }, { v: 'CH', l: 'Switzerland' }, { v: 'LI', l: 'Liechtenstein' },
        { v: 'UK', l: 'United Kingdom' }, { v: 'US', l: 'United States' }, { v: 'PT', l: 'Portugal' },
        { v: 'euother', l: 'Another EU / EEA country' }, { v: 'elsewhere', l: 'Somewhere else' }
      ] },
    { id: 'relocation', block: 'you', type: 'single', title: 'Would you move for your startup?',
      help: 'Countries you would not move to are shown greyed out, not hidden.',
      options: [
        { v: 'stay', l: 'No, I’ll stay where I live', s: 'Keep my current home' },
        { v: 'europe', l: 'Yes, within Europe', s: 'DE, CH, LI, UK, PT' },
        { v: 'anywhere', l: 'Yes, anywhere', s: 'Including the United States' }
      ] },
    { id: 'sector', block: 'startup', type: 'single', title: 'What are you building?',
      help: 'Some ecosystems are notably stronger in certain sectors.',
      options: [
        { v: 'software', l: 'Software & SaaS' }, { v: 'ai', l: 'AI & deep tech' },
        { v: 'fintech', l: 'Fintech & crypto' }, { v: 'life', l: 'Life sciences & health' },
        { v: 'hardware', l: 'Hardware, climate & industrial' }, { v: 'consumer', l: 'Consumer & e-commerce' }
      ] },
    { id: 'market', block: 'startup', type: 'single', title: 'Who are your first customers?',
      help: 'Being inside your customers’ market simplifies contracts, VAT and regulation.',
      options: [
        { v: 'home', l: 'In my home country' }, { v: 'dach', l: 'Germany, Austria, Switzerland' },
        { v: 'eu', l: 'Across the EU' }, { v: 'uk', l: 'United Kingdom' },
        { v: 'us', l: 'United States' }, { v: 'global', l: 'Global from day one' }
      ] },
    { id: 'funding', block: 'capital', type: 'multi', title: 'How will you fund the first two years?',
      help: 'Select all that apply.',
      options: [
        { v: 'bootstrap', l: 'Revenue / own money', s: 'Bootstrapping' },
        { v: 'grants', l: 'Grants & public funding', s: 'Non-dilutive' },
        { v: 'angels', l: 'Business angels', s: 'Seed rounds' },
        { v: 'vc', l: 'Venture capital', s: 'Institutional rounds' }
      ] },
    { id: 'capital', block: 'capital', type: 'single', title: 'How much capital is already secured?',
      help: 'Some legal forms need share capital paid in before registration.',
      options: [
        { v: 'none', l: 'Nothing yet' }, { v: 'lt50', l: 'Up to €50k' }, { v: '50to250', l: '€50k – €250k' },
        { v: '250to1m', l: '€250k – €1M' }, { v: 'gt1m', l: 'More than €1M' }
      ] },
    { id: 'investors', block: 'capital', type: 'multi', title: 'Where are your current investors based?',
      help: 'Investors often prefer a company in a jurisdiction they know.',
      options: [
        { v: 'none', l: 'No investors yet', exclusive: true },
        { v: 'DE', l: 'Germany' }, { v: 'CHLI', l: 'Switzerland / Liechtenstein' },
        { v: 'UK', l: 'United Kingdom' }, { v: 'US', l: 'United States' }, { v: 'EU', l: 'Portugal / other EU' }
      ] },
    { id: 'exit', block: 'exit', type: 'single', title: 'What is your long-term plan?',
      help: 'Decides whether profit tax or exit tax matters more to you.',
      options: [
        { v: 'hold', l: 'Build and keep it', s: 'Profits & dividends' },
        { v: 'sale', l: 'Sell the company', s: 'Trade sale' },
        { v: 'ipo', l: 'Go public', s: 'IPO' }
      ] },
    { id: 'esop', block: 'exit', type: 'single', title: 'Will you give employees equity?',
      help: 'Stock options are a key hiring tool — but taxed very differently.',
      options: [
        { v: 'all', l: 'Yes, broadly', s: 'Most employees' },
        { v: 'key', l: 'Key hires only' },
        { v: 'no', l: 'No' }
      ] }
  ];

  var BLOCKS = [
    { id: 'you', name: 'About you' },
    { id: 'startup', name: 'Your startup' },
    { id: 'capital', name: 'Capital' },
    { id: 'exit', name: 'Exit & team' },
    { id: 'priorities', name: 'Your priorities' }
  ];

  var LEVELS = [
    { v: 0, l: 'Not needed' }, { v: 1, l: 'Nice to have' }, { v: 2, l: 'Important' }, { v: 3, l: 'Critical' }
  ];

  var MARKET_TABLE = {
    dach:   { DE: 5, CH: 5, LI: 4, UK: 3, US: 2, PT: 3 },
    eu:     { DE: 5, PT: 5, LI: 4, CH: 3, UK: 2, US: 2 },
    uk:     { UK: 5, DE: 3, CH: 3, LI: 3, PT: 3, US: 3 },
    us:     { US: 5, UK: 3, DE: 2, CH: 2, LI: 2, PT: 2 },
    global: { US: 5, UK: 4, DE: 4, CH: 3, PT: 3, LI: 2 }
  };

  var IDS = D.COUNTRIES.map(function (c) { return c.id; });
  var COUNTRY_IN_LIST = { DE: 1, CH: 1, LI: 1, UK: 1, US: 1, PT: 1 };

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function has(arr, v) { return Array.isArray(arr) && arr.indexOf(v) !== -1; }
  function round1(x) { return Math.round(x * 10) / 10; }

  /* ---------- 1. Weights ---------- */
  function computeWeights(a) {
    var pr = a.priorities || {};
    var w = {};
    D.CRITERIA.forEach(function (c) {
      var lvl = (typeof pr[c.id] === 'number') ? pr[c.id] : 1;
      w[c.id] = { level: lvl, value: lvl, reasons: [] };
    });
    function bump(id, by, why) {
      if (w[id].level === 0) return; // explicit "not needed" always wins
      w[id].value = clamp(w[id].value + by, 0, 4);
      w[id].reasons.push(why);
    }
    if (has(a.funding, 'vc')) bump('vc', 1, 'You plan to raise venture capital');
    if (has(a.funding, 'grants')) bump('grants', 1, 'You plan to use grants');
    if (has(a.funding, 'bootstrap')) { bump('corpTax', 1, 'Bootstrapped companies live on retained profits'); bump('cost', 1, 'Bootstrapping makes burn rate critical'); }
    if (a.exit === 'sale' || a.exit === 'ipo') bump('exitTax', 1, 'You plan an exit');
    if (a.exit === 'hold') bump('corpTax', 1, 'You plan to keep the company and its profits');
    if (a.esop === 'all') bump('esop', 1, 'You plan broad employee equity');
    if (a.esop === 'no' && w.esop.level > 0) { w.esop.value = 0; w.esop.reasons.push('You do not plan employee equity'); }
    var total = 0;
    D.CRITERIA.forEach(function (c) { total += w[c.id].value; });
    if (total === 0) D.CRITERIA.forEach(function (c) { w[c.id].value = 1; w[c.id].reasons.push('All priorities were set to "not needed" — equal weights used'); });
    return w;
  }

  /* ---------- 2. Adjusted criterion scores ---------- */
  function adjustedScores(a) {
    var out = {};
    IDS.forEach(function (k) {
      out[k] = {};
      D.CRITERIA.forEach(function (c) {
        var cell = D.SCORES[k][c.id];
        out[k][c.id] = { base: cell.score, value: cell.score, adj: [] };
      });
    });
    function adj(k, c, by, why) {
      var o = out[k][c];
      var nv = clamp(o.value + by, 1, 5);
      if (nv !== o.value) { o.adj.push((by > 0 ? '+' : '') + by + ': ' + why); o.value = nv; }
    }
    // Investors' home jurisdictions
    var inv = Array.isArray(a.investors) ? a.investors : [];
    if (has(inv, 'DE')) adj('DE', 'vc', 1, 'your investors are based here');
    if (has(inv, 'CHLI')) { adj('CH', 'vc', 1, 'your investors are based here'); adj('LI', 'vc', 1, 'your investors are based in CH/LI'); }
    if (has(inv, 'UK')) adj('UK', 'vc', 1, 'your investors are based here');
    if (has(inv, 'US')) adj('US', 'vc', 1, 'your investors are based here (US VCs usually expect a Delaware C-Corp)');
    if (has(inv, 'EU')) { adj('PT', 'vc', 1, 'your investors are EU-based'); adj('DE', 'vc', 0.5, 'your investors are EU-based'); }
    // SBIR ownership rule
    if (a.citizenship === 'us') adj('US', 'grants', 1, 'SBIR/STTR open to US-owned companies');
    else if (a.citizenship) adj('US', 'grants', -1, 'SBIR/STTR needs > 50% US-citizen or green-card ownership');
    // Sector strengths
    var sec = D.SECTOR_ADJ[a.sector];
    if (sec) IDS.forEach(function (k) { if (sec[k]) adj(k, 'talent', sec[k], 'sector strength'); });
    // Target market
    var mkt = a.market;
    if (mkt === 'home' && a.residence === 'euother') mkt = 'eu';
    if (mkt === 'home' && !COUNTRY_IN_LIST[a.residence]) mkt = null;
    if (mkt === 'home') {
      IDS.forEach(function (k) {
        var target = (a.residence === k) ? 5 : 2;
        adj(k, 'market', target - out[k].market.value, target === 5 ? 'this is your home market' : 'outside your home market');
      });
    } else if (MARKET_TABLE[mkt]) {
      IDS.forEach(function (k) {
        var t = MARKET_TABLE[mkt][k];
        adj(k, 'market', t - out[k].market.value, t >= 4 ? 'inside or next to your target market' : 'away from your target market');
      });
    }
    // Paid-in capital when nothing is secured yet
    if (a.capital === 'none') {
      adj('CH', 'setup', -1, 'CHF 20,000 must be fully paid in before registration');
      adj('LI', 'setup', -1, 'CHF 10,000 must be fully paid in before registration');
    }
    IDS.forEach(function (k) { D.CRITERIA.forEach(function (c) { out[k][c.id].value = round1(out[k][c.id].value); }); });
    return out;
  }

  /* ---------- 4. Personal fit & 5. filters ---------- */
  function residenceStatus(a, k) {
    if (a.residence === k) return { level: 'home', text: 'You already live here' };
    if (!a.citizenship) return null;
    var tbl = D.RESIDENCE[a.citizenship] || {};
    return tbl[k] || null;
  }

  function personal(a, k) {
    var items = [];
    if (a.residence === k) items.push({ pts: 5, text: 'Home advantage — your existing local network (Dahl & Sorenson 2012)' });
    var rs = residenceStatus(a, k);
    if (rs && a.residence !== k) {
      if (rs.level === 'visa') items.push({ pts: -5, text: 'Visa or permit needed: ' + rs.text });
      if (rs.level === 'limited') items.push({ pts: -10, text: 'Residence is hard to get: ' + rs.text });
    }
    return { items: items, residence: rs };
  }

  function exclusion(a, k) {
    if (a.relocation === 'europe' && k === 'US') return 'You prefer to stay in Europe';
    if (a.relocation === 'stay' && COUNTRY_IN_LIST[a.residence] && a.residence !== k) return 'You prefer to stay where you live';
    return null;
  }

  /* ---------- 3. Fit score ---------- */
  function fit(scores, weights) {
    var sw = 0, acc = 0, contrib = {};
    D.CRITERIA.forEach(function (c) {
      var wv = weights[c.id].value;
      sw += wv;
    });
    D.CRITERIA.forEach(function (c) {
      var wv = weights[c.id].value;
      var part = sw > 0 ? (wv * (scores[c.id].value - 1) / 4) / sw * 100 : 0;
      contrib[c.id] = part;
      acc += part;
    });
    return { fit: acc, contrib: contrib };
  }

  function rank(a, weights, scores) {
    var rows = IDS.map(function (k) {
      var f = fit(scores[k], weights);
      var p = personal(a, k);
      var pts = p.items.reduce(function (s, i) { return s + i.pts; }, 0);
      var total = clamp(f.fit + pts, 0, 100);
      return {
        id: k, country: D.COUNTRIES[IDS.indexOf(k)], fitRaw: f.fit, total: total, score: Math.round(total),
        contrib: f.contrib, personal: p.items, residence: p.residence, excluded: exclusion(a, k), scores: scores[k]
      };
    });
    rows.sort(function (x, y) {
      if (!!x.excluded !== !!y.excluded) return x.excluded ? 1 : -1;
      if (y.total !== x.total) return y.total - x.total;
      return IDS.indexOf(x.id) - IDS.indexOf(y.id); // deterministic tie-break
    });
    return rows;
  }

  /* ---------- 6. Robustness ---------- */
  function robustness(a, weights, scores, winner) {
    var same = 0, total = 0;
    D.CRITERIA.forEach(function (c) {
      [-1, 1].forEach(function (d) {
        var w2 = {};
        D.CRITERIA.forEach(function (x) { w2[x.id] = { value: weights[x.id].value }; });
        var nv = clamp(w2[c.id].value + d, 0, 4);
        if (nv === w2[c.id].value) return;
        w2[c.id].value = nv;
        var r = rank(a, w2, scores);
        total++;
        if (r[0].id === winner) same++;
      });
    });
    return { same: same, total: total, share: total ? same / total : 1 };
  }

  function answeredCount(a) {
    var n = 0;
    QUESTIONS.forEach(function (q) {
      var v = a[q.id];
      if (q.type === 'multi' ? (Array.isArray(v) && v.length) : (v !== undefined && v !== null)) n++;
    });
    return n;
  }

  /* ---------- Explanations ---------- */
  function warnings(a, top, rows) {
    var w = [];
    if (!top) return w;
    var k = top.id;
    if (a.relocation === 'stay' && COUNTRY_IN_LIST[a.residence]) {
      w.push({ type: 'info', text: 'Because you want to stay where you live, only ' + D.COUNTRIES[IDS.indexOf(a.residence)].name + ' is ranked. Registering a company abroad while running it from home usually does not move its tax residence — a company is generally taxed where it is actually managed (e.g. §10 AO, §1 KStG in Germany).', src: 'ao10' });
    } else if (a.relocation === 'stay') {
      w.push({ type: 'info', text: 'You want to stay in a country outside this comparison. A company registered in one of these six countries but managed from your home is usually taxed where it is actually managed.', src: 'ao10' });
    }
    if (a.residence === 'DE' && k !== 'DE' && a.relocation !== 'stay') {
      w.push({ type: 'warn', text: 'Moving away from Germany: if you already hold ≥ 1% of a company, emigration can trigger exit tax on unrealised gains (§6 AStG; since 2022 only payable in 7 instalments, usually against security). Plan before you move.', src: 'astg6' });
    }
    if (a.citizenship === 'us' && k !== 'US') {
      w.push({ type: 'warn', text: 'US citizens are taxed on worldwide income wherever they live — check foreign tax credits and reporting before founding abroad.', src: 'irs_abroad' });
    }
    if (has(a.investors, 'US') && k !== 'US') {
      w.push({ type: 'info', text: 'Your US investors may ask for a "Delaware flip" (a US holding above your local company) before investing — it is common, but costs time and can have tax consequences.', src: 'stripe_flip' });
    }
    if (k === 'US' && a.citizenship && a.citizenship !== 'us') {
      w.push({ type: 'info', text: 'The QSBS exclusion benefits US taxpayers; as a non-US founder your home-country tax rules on the exit still matter.', src: 'qsbs_obbba' });
    }
    if (k === 'LI') w.push({ type: 'warn', text: 'Liechtenstein limits residence permits (partly allocated by lottery) — most people working there live in Switzerland or Austria.', src: 'li_quota' });
    if (k === 'CH') w.push({ type: 'info', text: 'Choose your canton deliberately: the profit tax ranges from ≈ 11.9% (Zug) to ≈ 19.6% (Zurich) and above.', src: 'kpmg_ch' });
    if (k === 'DE' && (a.exit === 'sale' || a.exit === 'ipo')) w.push({ type: 'tip', text: 'Planning an exit from Germany? Holding your shares through a holding GmbH can cut the tax on the sale from ≈ 28.5% to ≈ 1.5% (§8b KStG). Set it up early with a tax adviser.', src: 'kstg8b' });
    var lowConf = D.CRITERIA.filter(function (c) { return D.SCORES[k][c.id].confidence === 'low'; }).map(function (c) { return c.short; });
    if (lowConf.length >= 2) w.push({ type: 'info', text: 'Data for ' + top.country.name + ' is thin on: ' + lowConf.join(', ') + '. Treat those scores as estimates.', src: null });
    return w;
  }

  function explain(top, weights) {
    if (!top) return { why: [], tradeoffs: [] };
    var why = D.CRITERIA.filter(function (c) { return weights[c.id].value > 0 && top.scores[c.id].value >= 4; })
      .sort(function (x, y) { return top.contrib[y.id] - top.contrib[x.id]; }).slice(0, 3);
    var trade = D.CRITERIA.filter(function (c) { return weights[c.id].value >= 1 && top.scores[c.id].value <= 2; })
      .sort(function (x, y) { return weights[y.id].value - weights[x.id].value; }).slice(0, 3);
    return { why: why.map(function (c) { return c.id; }), tradeoffs: trade.map(function (c) { return c.id; }) };
  }

  function evaluate(a) {
    a = a || {};
    var weights = computeWeights(a);
    var scores = adjustedScores(a);
    var rows = rank(a, weights, scores);
    var eligible = rows.filter(function (r) { return !r.excluded; });
    var top = eligible[0] || null;
    var gap = eligible.length > 1 ? top.total - eligible[1].total : null;
    var rob = top ? robustness(a, weights, scores, top.id) : null;
    var verdict = 'only';
    if (eligible.length > 1) verdict = (rob.share >= 0.85 && gap >= 4) ? 'robust' : 'close';
    return {
      weights: weights, rows: rows, top: top, runnerUp: eligible[1] || null, gap: gap,
      robustness: rob, verdict: verdict, answered: answeredCount(a), totalQuestions: QUESTIONS.length,
      warnings: warnings(a, top, rows), explain: explain(top, weights)
    };
  }

  var api = { QUESTIONS: QUESTIONS, BLOCKS: BLOCKS, LEVELS: LEVELS, MARKET_TABLE: MARKET_TABLE, evaluate: evaluate, computeWeights: computeWeights };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_ENGINE = api;
})(this);
