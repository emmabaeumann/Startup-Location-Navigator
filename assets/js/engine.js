/*
 * FoundersNavigator – deterministic recommendation engine
 * -------------------------------------------------
 * Same answers in → same result out. No randomness, no network, no AI.
 *
 * 1. Weights   w_c = priority level (0–3, default 1) + documented answer rules (+1, cap 4)
 * 2. Scores    s_kc = evidence score (1–5) + documented whole-step profile adjustments (clamped 1–5)
 *              "Residence & home base" is scored from citizenship(s) and current home.
 * 3. Fit       Fit_k = 100 · Σ w_c·(s_kc − 1)/4 / Σ w_c   (additive value model, 0–100)
 *              100 = the country reaches the top score on every factor you weight.
 * 4. Filters   relocation choices exclude countries (shown greyed, never hidden)
 * 5. Robustness: every weight shifted ±1 level → share of cases with the same winner
 */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.SSN_DATA;

  var QUESTIONS = [
    { id: 'citizenship', block: 'you', type: 'multi', title: 'Which citizenship(s) do you hold?',
      help: 'Your passport decides where you can live and work.',
      options: [
        { v: 'eu', l: 'EU / EEA', s: 'Any EU country, Iceland, Norway' },
        { v: 'ch', l: 'Switzerland' }, { v: 'li', l: 'Liechtenstein' },
        { v: 'uk', l: 'United Kingdom' },
        { v: 'us', l: 'United States', s: 'US passport or green card' },
        { v: 'other', l: 'Other', s: 'Any other passport' }
      ] },
    { id: 'residence', block: 'you', type: 'single', title: 'Where do you live right now?',
      help: 'Local roots help – and often decide where you pay tax.',
      options: [
        { v: 'DE', l: 'Germany' }, { v: 'CH', l: 'Switzerland' }, { v: 'LI', l: 'Liechtenstein' },
        { v: 'UK', l: 'United Kingdom' }, { v: 'US', l: 'United States' }, { v: 'PT', l: 'Portugal' },
        { v: 'euother', l: 'Another EU / EEA country' }, { v: 'elsewhere', l: 'Somewhere else' }
      ] },
    { id: 'relocation', block: 'you', type: 'single', title: 'Are you open to relocating for your startup?',
      help: 'Excluded countries stay visible, greyed out.',
      options: [
        { v: 'stay', l: 'No, I’ll stay where I live', s: 'Keep my current home' },
        { v: 'europe', l: 'Yes, within Europe', s: 'DE, CH, LI, UK, PT' },
        { v: 'anywhere', l: 'Yes, anywhere', s: 'Including the United States' }
      ] },
    { id: 'sector', block: 'startup', type: 'single', title: 'What are you building?',
      help: 'Some hubs are measurably stronger in certain sectors.',
      options: [
        { v: 'software', l: 'Software & SaaS' }, { v: 'ai', l: 'AI & deep tech' },
        { v: 'fintech', l: 'Fintech & crypto' }, { v: 'life', l: 'Health & life sciences' },
        { v: 'climate', l: 'Climate & energy' }, { v: 'hardware', l: 'Hardware, mobility & industrial' },
        { v: 'consumer', l: 'Consumer & marketplaces' }, { v: 'other', l: 'Something else' }
      ] },
    { id: 'market', block: 'startup', type: 'single', title: 'Who will your first customers be?',
      help: 'Selling inside your own market is simpler.',
      options: [
        { v: 'home', l: 'In my home country' }, { v: 'dach', l: 'Germany, Austria, Switzerland' },
        { v: 'eu', l: 'Across the EU' }, { v: 'uk', l: 'United Kingdom' },
        { v: 'us', l: 'United States' }, { v: 'global', l: 'Global from day one' }
      ] },
    { id: 'funding', block: 'capital', type: 'multi', title: 'How do you plan to fund the first two years?',
      help: '',
      options: [
        { v: 'bootstrap', l: 'Own money, friends & family', s: 'Bootstrapping' },
        { v: 'grants', l: 'Grants & public funding', s: 'Non-dilutive' },
        { v: 'angels', l: 'Business angels', s: 'Seed rounds' },
        { v: 'accelerator', l: 'Accelerator or incubator', s: 'Programme + small cheque' },
        { v: 'vc', l: 'Venture capital', s: 'Institutional rounds' }
      ] },
    { id: 'capital', block: 'capital', type: 'single', title: 'How much capital is already secured?',
      help: 'Some legal forms need capital paid in before registration.',
      options: [
        { v: 'none', l: 'Nothing yet' }, { v: 'lt10', l: 'Less than €10k' }, { v: '10to25', l: '€10k – €25k' },
        { v: '25to100', l: '€25k – €100k' }, { v: '100to1m', l: '€100k – €1M' }, { v: 'gt1m', l: 'More than €1M' }
      ] },
    { id: 'investors', block: 'capital', type: 'multi', title: 'Where are your current investors based?',
      help: 'Investors prefer jurisdictions they know.',
      options: [
        { v: 'none', l: 'No investors yet', exclusive: true },
        { v: 'DE', l: 'Germany' }, { v: 'CHLI', l: 'Switzerland / Liechtenstein' },
        { v: 'UK', l: 'United Kingdom' }, { v: 'US', l: 'United States' }, { v: 'EU', l: 'Portugal / other EU' },
        { v: 'elsewhere', l: 'Elsewhere', s: 'Outside these countries' }
      ] },
    { id: 'exit', block: 'exit', type: 'single', title: 'What is your long-term plan for the company?',
      help: 'Decides whether profit tax or exit tax matters more.',
      options: [
        { v: 'hold', l: 'Build and keep it', s: 'Profits & dividends' },
        { v: 'sale', l: 'Sell the company', s: 'Acquisition / trade sale' },
        { v: 'ipo', l: 'Go public', s: 'IPO' },
        { v: 'undecided', l: 'Not decided yet', s: 'Keep options open' }
      ] },
    { id: 'esop', block: 'exit', type: 'single', title: 'Do you want to offer employees equity?',
      help: 'Option taxes differ widely between countries.',
      options: [
        { v: 'all', l: 'Yes, broadly', s: 'Most employees' },
        { v: 'key', l: 'Yes, for key hires' },
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
    { v: 0, l: 'Not important' }, { v: 1, l: 'Somewhat important' }, { v: 2, l: 'Important' }, { v: 3, l: 'Crucial' }
  ];

  var MARKET_TABLE = {
    dach:   { DE: 5, CH: 5, LI: 4, UK: 3, US: 2, PT: 3 },
    eu:     { DE: 5, PT: 5, LI: 4, CH: 3, UK: 2, US: 2 },
    uk:     { UK: 5, DE: 3, CH: 3, LI: 3, PT: 3, US: 3 },
    us:     { US: 5, UK: 3, DE: 2, CH: 2, LI: 2, PT: 2 },
    global: { US: 5, UK: 4, DE: 4, CH: 3, PT: 3, LI: 2 }
  };

  var RES_SCORE = { home: 5, citizen: 4, free: 4, visa: 2, limited: 1 };
  var RES_RANK = { home: 5, citizen: 4, free: 3, visa: 2, limited: 1 };

  var IDS = D.COUNTRIES.map(function (c) { return c.id; });
  var COUNTRY_IN_LIST = { DE: 1, CH: 1, LI: 1, UK: 1, US: 1, PT: 1 };

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function has(arr, v) { return Array.isArray(arr) && arr.indexOf(v) !== -1; }
  function cits(a) { return Array.isArray(a.citizenship) ? a.citizenship : (a.citizenship ? [a.citizenship] : []); }

  /* ---------- 1. Weights ---------- */
  // Default level: 1 ("somewhat important"), except residence & local roots = 2 ("important"),
  // because home advantage is one of the most robust findings (Dahl & Sorenson 2012).
  // Founders who say they would move anywhere signal mobility → back to 1.
  function defaultLevel(id, a) {
    if (id === 'residence') return a.relocation === 'anywhere' ? 1 : 2;
    return 1;
  }
  function computeWeights(a) {
    var pr = a.priorities || {};
    var w = {};
    D.CRITERIA.forEach(function (c) {
      var explicit = typeof pr[c.id] === 'number';
      var lvl = explicit ? pr[c.id] : defaultLevel(c.id, a);
      w[c.id] = { level: lvl, value: lvl, bonus: 0, reasons: [], isDefault: !explicit };
    });
    function bump(id, why) {
      if (w[id].level === 0) return; // an explicit "not important" always wins
      if (w[id].value >= 4 || w[id].bonus >= 1) { if (w[id].reasons.indexOf(why) === -1 && w[id].bonus >= 1) w[id].reasons.push(why); return; }
      w[id].value += 1; w[id].bonus += 1;
      w[id].reasons.push(why);
    }
    if (has(a.funding, 'vc')) bump('vc', 'You plan to raise venture capital');
    if (has(a.funding, 'grants')) bump('grants', 'You plan to use grants');
    if (has(a.funding, 'angels')) bump('grants', 'Investor tax reliefs (e.g. UK SEIS/EIS) target business angels');
    if (has(a.funding, 'accelerator')) bump('talent', 'Accelerators depend on a strong local ecosystem');
    if (has(a.funding, 'bootstrap')) { bump('corpTax', 'Bootstrapped companies live on retained profits'); bump('cost', 'Bootstrapping makes burn rate critical'); }
    if (a.exit === 'sale' || a.exit === 'ipo') bump('exitTax', 'You plan an exit');
    if (a.exit === 'hold') bump('corpTax', 'You plan to keep the company and its profits');
    if (a.esop === 'all') bump('esop', 'You plan broad employee equity');
    if (a.esop === 'no' && w.esop.level > 0) { w.esop.value = 0; w.esop.bonus = 0; w.esop.reasons.push('You do not plan employee equity'); }
    var total = 0;
    D.CRITERIA.forEach(function (c) { total += w[c.id].value; });
    if (total === 0) D.CRITERIA.forEach(function (c) { w[c.id].value = 1; w[c.id].reasons.push('All factors were set to "not important" – equal weights used'); });
    return w;
  }

  /* ---------- residence status ---------- */
  function residenceStatus(a, k) {
    if (a.residence === k) return { level: 'home', text: 'You already live here' };
    var list = cits(a);
    if (!list.length) return null;
    var best = null;
    list.forEach(function (c) {
      var tbl = D.RESIDENCE[c] || {};
      var r = tbl[k];
      if (!r) return;
      var cand = { level: r.level, text: r.text };
      if (!best || RES_RANK[cand.level] > RES_RANK[best.level]) best = cand;
    });
    return best;
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
      if (nv !== o.value) { o.adj.push((nv - o.value > 0 ? '+' : '') + (nv - o.value) + ': ' + why); o.value = nv; }
    }
    function setTo(k, c, target, why) { adj(k, c, target - out[k][c].value, why); }

    // Residence & home base (from profile)
    IDS.forEach(function (k) {
      var rs = residenceStatus(a, k);
      if (rs) setTo(k, 'residence', RES_SCORE[rs.level], rs.text);
      out[k].residence.status = rs;
    });
    // Investors' home jurisdictions
    // Existing investors are part of your local network → "local roots", not the size of the VC market
    var inv = Array.isArray(a.investors) ? a.investors : [];
    if (has(inv, 'DE')) adj('DE', 'residence', 1, 'your investors are based here');
    if (has(inv, 'CHLI')) { adj('CH', 'residence', 1, 'your investors are based here'); adj('LI', 'residence', 1, 'your investors are based in CH/LI'); }
    if (has(inv, 'UK')) adj('UK', 'residence', 1, 'your investors are based here');
    if (has(inv, 'US')) adj('US', 'residence', 1, 'your investors are based here');
    if (has(inv, 'EU')) { adj('PT', 'residence', 1, 'your investors are EU-based'); adj('DE', 'residence', 1, 'your investors are EU-based'); }
    // SBIR ownership rule
    var cl = cits(a);
    if (has(cl, 'us')) adj('US', 'grants', 1, 'SBIR/STTR is open to US-owned companies');
    else if (cl.length) adj('US', 'grants', -1, 'SBIR/STTR needs > 50% US-citizen or green-card ownership');
    // Sector strengths (only where sourced)
    var sec = D.SECTOR_ADJ[a.sector];
    if (sec) IDS.forEach(function (k) { if (sec[k]) adj(k, 'talent', sec[k], 'sector strength'); });
    // Target market
    var mkt = a.market;
    if (mkt === 'home' && a.residence === 'euother') mkt = 'eu';
    if (mkt === 'home' && !COUNTRY_IN_LIST[a.residence]) mkt = null;
    if (mkt === 'home') {
      IDS.forEach(function (k) { setTo(k, 'market', a.residence === k ? 5 : 2, a.residence === k ? 'this is your home market' : 'outside your home market'); });
    } else if (MARKET_TABLE[mkt]) {
      IDS.forEach(function (k) { var t = MARKET_TABLE[mkt][k]; setTo(k, 'market', t, t >= 4 ? 'inside or next to your target market' : 'away from your target market'); });
    }
    // Paid-in capital
    if (a.capital === 'none' || a.capital === 'lt10') {
      adj('CH', 'setup', -1, 'CHF 20,000 must be fully paid in before registration');
      adj('LI', 'setup', -1, 'CHF 10,000 must be fully paid in before registration');
    }
    return out;
  }

  /* ---------- filters ---------- */
  function exclusion(a, k) {
    if (a.relocation === 'europe' && k === 'US') return 'You prefer to stay in Europe';
    if (a.relocation === 'stay' && COUNTRY_IN_LIST[a.residence] && a.residence !== k) return 'You prefer to stay where you live';
    return null;
  }

  /* ---------- 3. Fit score ---------- */
  function fit(scores, weights) {
    var sw = 0, acc = 0, contrib = {};
    D.CRITERIA.forEach(function (c) { sw += weights[c.id].value; });
    D.CRITERIA.forEach(function (c) {
      var part = sw > 0 ? (weights[c.id].value * (scores[c.id].value - 1) / 4) / sw * 100 : 0;
      contrib[c.id] = part; acc += part;
    });
    return { fit: acc, contrib: contrib };
  }

  function rank(a, weights, scores) {
    var rows = IDS.map(function (k) {
      var f = fit(scores[k], weights);
      return {
        id: k, country: D.COUNTRIES[IDS.indexOf(k)], total: f.fit, score: Math.round(f.fit),
        contrib: f.contrib, residence: scores[k].residence.status, excluded: exclusion(a, k), scores: scores[k]
      };
    });
    rows.sort(function (x, y) {
      if (!!x.excluded !== !!y.excluded) return x.excluded ? 1 : -1;
      if (y.total !== x.total) return y.total - x.total;
      return IDS.indexOf(x.id) - IDS.indexOf(y.id); // deterministic tie-break
    });
    return rows;
  }

  /* ---------- 5. Robustness ---------- */
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
  function warnings(a, top) {
    var w = [];
    if (!top) return w;
    var k = top.id;
    var cl = cits(a);
    if (a.relocation === 'stay' && COUNTRY_IN_LIST[a.residence]) {
      w.push({ type: 'info', text: 'Because you want to stay where you live, only ' + D.COUNTRIES[IDS.indexOf(a.residence)].name + ' is ranked. Registering a company abroad while running it from home usually does not move its tax residence: a company is generally taxed where it is actually managed (e.g. §10 AO, §1 KStG in Germany).', src: 'ao10' });
    } else if (a.relocation === 'stay') {
      w.push({ type: 'info', text: 'You want to stay in a country outside this comparison. A company registered in one of these six countries but managed from your home is usually taxed where it is actually managed.', src: 'ao10' });
    }
    if (a.residence === 'DE' && k !== 'DE' && a.relocation !== 'stay') {
      w.push({ type: 'warn', text: 'Moving away from Germany: if you already hold ≥ 1% of a company, emigration can trigger exit tax on unrealised gains (§6 AStG; since 2022 payable in 7 instalments, usually against security). Plan before you move.', src: 'astg6' });
    }
    if (has(cl, 'us') && k !== 'US') {
      w.push({ type: 'warn', text: 'US citizens are taxed on worldwide income wherever they live. Check foreign tax credits and reporting before founding abroad.', src: 'irs_abroad' });
    }
    if (has(a.investors, 'US') && k !== 'US') {
      w.push({ type: 'info', text: 'Your US investors may ask for a "Delaware flip" (a US holding above your local company) before investing. It is common, but costs time and can have tax consequences.', src: 'stripe_flip' });
    }
    if (has(a.investors, 'elsewhere')) {
      w.push({ type: 'info', text: 'Investors based outside these six countries may prefer a structure they know, often a US or UK entity. Ask them early.', src: null });
    }
    if (k === 'US' && cl.length && !has(cl, 'us')) {
      w.push({ type: 'info', text: 'The QSBS exclusion benefits US taxpayers; as a non-US founder your home-country tax rules on the exit still matter.', src: 'qsbs_obbba' });
    }
    if (k === 'LI') w.push({ type: 'warn', text: 'Liechtenstein limits residence permits (partly allocated by lottery). Most people working there live in Switzerland or Austria.', src: 'li_quota' });
    if (k === 'CH') w.push({ type: 'info', text: 'Choose your canton deliberately: the profit tax ranges from ≈ 11.9% (Zug) to ≈ 19.6% (Zurich) and above.', src: 'kpmg_ch' });
    if (k === 'DE' && (a.capital === 'none' || a.capital === 'lt10')) w.push({ type: 'tip', text: 'With little capital, a UG (haftungsbeschränkt) can be founded from €1 and converted into a GmbH later.', src: 'gmbhg' });
    if (k === 'DE' && (a.exit === 'sale' || a.exit === 'ipo')) w.push({ type: 'tip', text: 'Planning an exit from Germany? Holding your shares through a holding GmbH can cut the tax on the sale from ≈ 28.5% to ≈ 1.5% (§8b KStG). Set it up early with a tax adviser.', src: 'kstg8b' });
    var sn = D.SECTOR_NOTES[a.sector];
    if (sn) w.push({ type: 'info', text: sn.text, src: sn.src });
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

  /* ---------- How each answer was used (plain-language transparency) ---------- */
  function names(list) {
    var n = list.map(function (k) { return D.COUNTRIES[IDS.indexOf(k)].name; });
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : (n[0] || '');
  }
  function answerEffects(a, res) {
    var out = [];
    var byLevel = function (lvl) { return res.rows.filter(function (r) { return r.residence && r.residence.level === lvl; }).map(function (r) { return r.id; }); };
    QUESTIONS.forEach(function (q) {
      var v = a[q.id];
      var answered = q.type === 'multi' ? (Array.isArray(v) && v.length) : v != null;
      var label = answered ? (Array.isArray(v) ? v : [v]).map(function (x) { var o = q.options.filter(function (oo) { return oo.v === x; })[0]; return o ? o.l : x; }).join(', ') : 'Not answered';
      var t = '';
      if (!answered) t = 'Skipped – no effect on the result.';
      else if (q.id === 'citizenship') {
        var parts = [];
        var ci = byLevel('citizen'), fr = byLevel('free'), vi = byLevel('visa'), li = byLevel('limited');
        if (ci.length) parts.push('full citizen rights in ' + names(ci));
        if (fr.length) parts.push('free movement in ' + names(fr));
        if (vi.length) parts.push('visa or permit needed for ' + names(vi));
        if (li.length) parts.push('residence quota-limited in ' + names(li));
        t = 'Sets your residence score: ' + parts.join('; ') + '.';
      } else if (q.id === 'residence') {
        t = COUNTRY_IN_LIST[v] ? names([v]) + ' gets the top residence score (5) for your existing home base.' : 'Not one of the six countries, so no home-base bonus.';
      } else if (q.id === 'relocation') {
        if (v === 'europe') t = 'The United States is excluded (still shown, greyed out).';
        else if (v === 'stay') t = COUNTRY_IN_LIST[a.residence] ? 'Only ' + names([a.residence]) + ' is ranked; the others are shown for reference.' : 'No country excluded, because your home is outside the six.';
        else t = 'No exclusions, and residence starts at “somewhat important” because you are mobile.';
      } else if (q.id === 'sector') {
        var sa = D.SECTOR_ADJ[v];
        t = sa ? '+1 on the ecosystem score for ' + names(IDS.filter(function (k) { return sa[k]; })) + '.' : (v === 'ai' ? 'No bonus needed: the leading AI hubs (US, UK) already hold the top score.' : (v === 'software' ? 'No sector bonus: software is the least location-bound sector.' : 'No sector bonus: no comparable country-level evidence.'));
      } else if (q.id === 'market') {
        var best = res.rows.filter(function (r) { return r.scores.market.value === 5; }).map(function (r) { return r.id; });
        t = best.length ? 'Market access is highest (5) for ' + names(best) + '.' : 'No effect, because your home is outside the six countries.';
      } else if (q.id === 'funding') {
        var f = [];
        if (has(v, 'vc')) f.push('VC access');
        if (has(v, 'grants') || has(v, 'angels')) f.push('public funding (incl. angel tax reliefs)');
        if (has(v, 'accelerator')) f.push('talent & ecosystem');
        if (has(v, 'bootstrap')) f.push('low profit tax and low living cost');
        t = f.length ? 'Raises the weight of ' + (f.length > 1 ? f.slice(0, -1).join(', ') + ' and ' + f[f.length - 1] : f[0]) + ' by one level.' : 'No effect.';
      } else if (q.id === 'capital') {
        if (v === 'none' || v === 'lt10') t = '−1 on setup for Switzerland (CHF 20,000) and Liechtenstein (CHF 10,000), where the minimum capital must be fully paid in. In Germany a UG can start from €1.';
        else if (v === '10to25') t = 'Enough for every minimum except possibly Switzerland’s CHF 20,000 (fully paid in) – no score change.';
        else t = 'Minimum capital is no constraint in any of the six countries – no effect on scores.';
      } else if (q.id === 'investors') {
        var map = { DE: ['DE'], CHLI: ['CH', 'LI'], UK: ['UK'], US: ['US'], EU: ['PT', 'DE'] };
        var ks = [];
        v.forEach(function (x) { (map[x] || []).forEach(function (k) { if (ks.indexOf(k) === -1) ks.push(k); }); });
        t = ks.length ? '+1 on “local roots” for ' + names(ks) + ' (your existing network).' : (has(v, 'elsewhere') ? 'No score effect (outside the six countries) – see the note under “Watch out”.' : 'No existing investors – no effect on scores.');
      } else if (q.id === 'exit') {
        t = v === 'hold' ? 'Raises the weight of low profit tax by one level.' : (v === 'undecided' ? 'No effect – both tax criteria keep your chosen weight.' : 'Raises the weight of low exit tax by one level.');
      } else if (q.id === 'esop') {
        t = v === 'all' ? 'Raises the weight of founder-friendly stock options by one level.' : (v === 'no' ? 'Stock-option rules are not counted (weight 0).' : 'No change – stock options keep the weight you chose.');
      }
      out.push({ q: q.id, title: q.title, answer: label, effect: t, answered: !!answered });
    });
    return out;
  }

  /* ---------- What would change the result? ---------- */
  function whatChanges(a, res) {
    if (!res.top) return [];
    var cur = res.weights, found = [];
    D.CRITERIA.forEach(function (c) {
      var curLvl = cur[c.id].level;
      for (var lvl = 0; lvl <= 3; lvl++) {
        if (lvl === curLvl) continue;
        var b = JSON.parse(JSON.stringify(a));
        b.priorities = b.priorities || {};
        b.priorities[c.id] = lvl;
        var r = evaluate(b, true);
        if (r.top && r.top.id !== res.top.id) {
          found.push({ c: c.id, from: curLvl, to: lvl, dist: Math.abs(lvl - curLvl), winner: r.top.id });
        }
      }
    });
    found.sort(function (x, y) { return x.dist - y.dist || D.CRITERIA.map(function (c) { return c.id; }).indexOf(x.c) - D.CRITERIA.map(function (c) { return c.id; }).indexOf(y.c); });
    var seen = {}, out = [];
    found.forEach(function (f) { if (!seen[f.c] && out.length < 3) { seen[f.c] = 1; out.push(f); } });
    return out;
  }

  function evaluate(a, light) {
    a = a || {};
    var weights = computeWeights(a);
    var scores = adjustedScores(a);
    var rows = rank(a, weights, scores);
    var eligible = rows.filter(function (r) { return !r.excluded; });
    var top = eligible[0] || null;
    var gap = eligible.length > 1 ? top.total - eligible[1].total : null;
    var rob = top && !light ? robustness(a, weights, scores, top.id) : null;
    var verdict = 'only';
    if (eligible.length > 1 && rob) verdict = (rob.share >= 0.85 && gap >= 4) ? 'robust' : 'close';
    var res = {
      weights: weights, rows: rows, top: top, runnerUp: eligible[1] || null, gap: gap,
      robustness: rob, verdict: verdict, answered: answeredCount(a), totalQuestions: QUESTIONS.length,
      warnings: warnings(a, top), explain: explain(top, weights)
    };
    if (!light) { res.effects = answerEffects(a, res); res.changes = whatChanges(a, res); }
    return res;
  }

  var api = { QUESTIONS: QUESTIONS, BLOCKS: BLOCKS, LEVELS: LEVELS, MARKET_TABLE: MARKET_TABLE, evaluate: evaluate, computeWeights: computeWeights, defaultLevel: defaultLevel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_ENGINE = api;
})(this);
