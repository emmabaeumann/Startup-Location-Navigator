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
 * 5. Robustness: every PRIORITY LEVEL moved ±1 (clamped 0–3), weights recomputed through the same
 *              answer rules → share of scenarios with the same winner. 'robust' only if NO single
 *              1-level change flips the winner and the gap is ≥ 4 points.
 * 6. Ties      totals are rounded to 1e-6 before sorting (no float noise); a gap < 0.5 points between
 *              #1 and #2 is reported as a tie (verdict 'tie'). Exact ties fall back to the fixed
 *              country order DE, CH, LI, UK, US, PT – documented, deterministic, but not a preference.
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
    { id: 'relocation', block: 'you', type: 'single', title: 'Would you relocate for your startup?',
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
        { v: 'consumer', l: 'Consumer & marketplaces' }, { v: 'other', l: 'Something else / not sure yet', s: 'No effect on the score' }
      ] },
    { id: 'market', block: 'startup', type: 'single', title: 'Who will your first customers be?',
      help: 'Selling inside your own market is simpler.',
      options: [
        { v: 'home', l: 'In my home country' }, { v: 'dach', l: 'Germany, Austria, Switzerland' },
        { v: 'eu', l: 'Across the EU' }, { v: 'uk', l: 'United Kingdom' },
        { v: 'us', l: 'United States' }, { v: 'global', l: 'Global from day one' },
        { v: 'unsure', l: 'Not sure yet', s: 'No effect on the score' }
      ] },
    { id: 'funding', block: 'capital', type: 'multi', title: 'How do you plan to fund the first two years?',
      help: '',
      options: [
        { v: 'bootstrap', l: 'Own money, friends & family', s: 'Bootstrapping' },
        { v: 'grants', l: 'Grants & public funding', s: 'Non-dilutive' },
        { v: 'angels', l: 'Business angels', s: 'Seed rounds' },
        { v: 'accelerator', l: 'Accelerator or incubator', s: 'Programme + small cheque' },
        { v: 'vc', l: 'Venture capital', s: 'Institutional rounds' },
        { v: 'unsure', l: 'Not sure yet', s: 'No effect on the score', exclusive: true }
      ] },
    { id: 'capital', block: 'capital', type: 'single', title: 'How much capital is already secured?',
      help: 'Paid in before registration: Switzerland CHF 20,000; Liechtenstein CHF 10,000; German GmbH €12,500 (UG from €1); UK, US, Portugal practically nothing.',
      options: [
        { v: 'none', l: 'Nothing yet' }, { v: 'lt10', l: 'Less than €10k' }, { v: '10to25', l: '€10k – €25k' },
        { v: '25to100', l: '€25k – €100k' }, { v: '100to1m', l: '€100k – €1M' }, { v: 'gt1m', l: 'More than €1M' }
      ] },
    { id: 'investors', block: 'capital', type: 'multi', title: 'Where are your current investors based?',
      help: 'Investors prefer jurisdictions they know.',
      // Not asked when no capital is secured yet: the answer is then recorded as 'No investors yet'.
      showIf: function (a) { return !a || a.capital !== 'none'; }, autoValue: ['none'], dependsOn: 'capital',
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
    { id: 'esop', block: 'exit', type: 'single', title: 'Will you offer employees equity?',
      help: 'Option taxes differ widely between countries.',
      options: [
        { v: 'all', l: 'Yes, broadly', s: 'Most employees' },
        { v: 'key', l: 'Yes, for key hires' },
        { v: 'no', l: 'No' },
        { v: 'unsure', l: 'Not sure yet', s: 'No effect on the score' }
      ] },
    { id: 'hires', block: 'exit', type: 'single', title: 'How many people will you hire in year one?',
      help: 'Employer payroll costs differ widely between countries.',
      options: [
        { v: '0', l: 'Nobody yet', s: 'Founders only' },
        { v: '1to2', l: '1–2 people' },
        { v: '3to5', l: '3–5 people' },
        { v: '6plus', l: '6 or more' }
      ] }
  ];
  // The hires answer is stored as an option value; the engine works with a head count
  // (upper end of each band, so first-year payroll is not understated). Numbers are accepted too.
  var HIRES_NUM = { '0': 0, '1to2': 2, '3to5': 4, '6plus': 6 };
  function hiresOf(a) {
    var h = a.hires;
    if (typeof h === 'number') return isFinite(h) && h > 0 ? Math.floor(h) : 0;
    if (typeof h === 'string' && Object.prototype.hasOwnProperty.call(HIRES_NUM, h)) return HIRES_NUM[h];
    return null; // not answered
  }

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

  // 'permit' = you live there, but no passport gives free movement there: local roots count, the right to
  // found depends on the permit you hold (a student permit, for example, allows employment only) → 3.
  var RES_SCORE = { home: 5, citizen: 4, free: 4, permit: 3, visa: 2, limited: 1 };
  var RES_RANK = { home: 5, citizen: 4, free: 3, visa: 2, limited: 1 };
  // Passports whose holders, once living in Switzerland or Liechtenstein, already have the quota-limited permit.
  var EEA_CH = { eu: 1, ch: 1, li: 1 };

  var IDS = D.COUNTRIES.map(function (c) { return c.id; });
  var COUNTRY_IN_LIST = { DE: 1, CH: 1, LI: 1, UK: 1, US: 1, PT: 1 };

  var HOME_BASE_CAP = 2;      // max combined score steps from "I live here" + "my home market" (see below)
  var TIE_POINTS = 0.5;       // #1 and #2 closer than this (0–100 scale) → reported as a tie
  var ROBUST_GAP = 4;         // minimum lead (points) for a 'robust' verdict
  // Confidence of the winner: share of its fit score resting on cells with confidence 'low' or nodata.
  var CONF_HIGH_MAX = 0.15;   // < 15 % → 'high'
  var CONF_MED_MAX = 0.35;    // 15–35 % → 'medium', otherwise 'low'

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function round6(x) { return Math.round(x * 1e6) / 1e6; }
  // A missing cell (criterion added before its scores) is neutral and flagged as no data.
  function cellOf(k, cid) {
    var c = D.SCORES[k] && D.SCORES[k][cid];
    return c || { score: 3, nodata: true, confidence: 'low', sources: [], value: 'No data yet' };
  }
  function has(arr, v) { return Array.isArray(arr) && arr.indexOf(v) !== -1; }
  function cits(a) { return Array.isArray(a.citizenship) ? a.citizenship : (a.citizenship ? [a.citizenship] : []); }

  /* ---------- 1. Weights ---------- */
  // Default level: 1 ("somewhat important"), except residence & local roots = 2 ("important"),
  // because home advantage is one of the most robust findings (Dahl & Sorenson 2012).
  // Founders who say they would move anywhere signal mobility → back to 1.
  // The two later-added criteria ('labor' = employer payroll on-costs, 'rnd' = R&D tax incentives)
  // start at 0 so that results for founders who give no related answer are unchanged; the answer
  // rules below raise them to 1 when they matter (planned hires / R&D-heavy sector).
  var DEFAULT_ZERO = { labor: 1, rnd: 1 };
  var RND_SECTORS = { ai: 1, hardware: 1, life: 1 };
  // An explicit head count decides; without it, planned employee equity implies hiring.
  function plansToHire(a) { var h = hiresOf(a); return h !== null ? h > 0 : (a.esop === 'all' || a.esop === 'key'); }
  function defaultLevel(id, a) {
    if (id === 'residence') return a.relocation === 'anywhere' ? 1 : 2;
    if (DEFAULT_ZERO[id]) return 0;
    return 1;
  }
  function isLevel(x) { return x === 0 || x === 1 || x === 2 || x === 3; }
  // Returns { w, allZero }. allZero = every weight ended at 0 → equal-weight fallback was used.
  function weightsInfo(a) {
    var pr = a.priorities || {};
    var w = {};
    D.CRITERIA.forEach(function (c) {
      var explicit = isLevel(pr[c.id]);
      var lvl = explicit ? pr[c.id] : defaultLevel(c.id, a);
      w[c.id] = { level: lvl, value: lvl, bonus: 0, reasons: [], isDefault: !explicit };
    });
    function bump(id, why) {
      if (!w[id]) return; // criterion not (yet) in the data set
      if (w[id].level === 0 && !w[id].isDefault) return; // an explicit "not important" always wins
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
    if (plansToHire(a)) bump('labor', 'You plan to hire employees');
    if (RND_SECTORS[a.sector]) bump('rnd', 'R&D-heavy sector: R&D tax incentives matter');
    // "No employee equity" only switches the ESOP factor off while its priority is still the default;
    // a priority the founder set explicitly is respected.
    if (a.esop === 'no' && w.esop && w.esop.isDefault && w.esop.level > 0) { w.esop.value = 0; w.esop.bonus = 0; w.esop.reasons.push('You do not plan employee equity'); }
    var total = 0;
    D.CRITERIA.forEach(function (c) { total += w[c.id].value; });
    if (total === 0) D.CRITERIA.forEach(function (c) { w[c.id].value = 1; w[c.id].reasons.push('All factors were set to "not important" – equal weights used'); });
    return { w: w, allZero: total === 0 };
  }
  function computeWeights(a) { return weightsInfo(a || {}).w; }

  /* ---------- residence status ---------- */
  function residenceStatus(a, k) {
    var list = cits(a);
    var best = passportStatus(list, k);
    if (a.residence === k) {
      // Living somewhere is only the full home advantage when a passport also gives the right to found there.
      // Unknown citizenship keeps the home score (most residents are citizens or have free movement).
      var noRight = best && (best.level === 'visa' || (best.level === 'limited' && !list.some(function (c) { return EEA_CH[c]; })));
      if (noRight) return { level: 'permit', text: D.RESIDENT_PERMIT[k] || D.RESIDENT_PERMIT._ };
      return { level: 'home', text: 'You already live here' };
    }
    return best;
  }
  // Best right the founder's passport(s) give in country k, ignoring where they live.
  function passportStatus(list, k) {
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
        var cell = cellOf(k, c.id);
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
    // Baseline without the "where do you live" answer (citizenship only) – needed for the home-base cap.
    var noHome = {}; for (var key in a) if (Object.prototype.hasOwnProperty.call(a, key) && key !== 'residence') noHome[key] = a[key];
    var resBaseline = {};
    IDS.forEach(function (k) {
      var rs0 = residenceStatus(noHome, k);
      resBaseline[k] = rs0 ? RES_SCORE[rs0.level] : out[k].residence.base;
      var rs = residenceStatus(a, k);
      if (rs) setTo(k, 'residence', RES_SCORE[rs.level], rs.text);
      out[k].residence.status = rs;
    });
    // Investors' home jurisdictions
    // Existing investors make the next round easier where they invest → +1 on VC access (clamped at 5).
    // (Until Nov 2026 this was +1 on residence, which was silently lost for founders already living there.)
    var inv = Array.isArray(a.investors) ? a.investors : [];
    if (has(inv, 'DE')) adj('DE', 'vc', 1, 'your investors are based here');
    if (has(inv, 'CHLI')) { adj('CH', 'vc', 1, 'your investors are based here'); adj('LI', 'vc', 1, 'your investors are based here'); }
    if (has(inv, 'UK')) adj('UK', 'vc', 1, 'your investors are based here');
    if (has(inv, 'US')) adj('US', 'vc', 1, 'your investors are based here');
    if (has(inv, 'EU')) { adj('PT', 'vc', 1, 'your investors are based here'); adj('DE', 'vc', 1, 'your investors are based here'); }
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
    /* HOME-BASE CAP (quoted on the method page)
     * Living in a country and selling to its market are both real advantages, but they describe the
     * same fact – "this is home". So the combined uplift that the home country receives from the
     * home answers (residence 5 – or 3 without free movement – instead of the citizenship-based score, plus market 5 instead of the
     * evidence score when your first customers are "in my home country") is capped at
     * HOME_BASE_CAP = 2 score steps. Any excess is taken off the market uplift; the residence score
     * itself is never reduced (an existing residence permit is a real, separate advantage). Local
     * investors no longer touch residence at all; they count once, on VC access. */
    if (COUNTRY_IN_LIST[a.residence] && a.market === 'home') {
      var h = a.residence;
      var upRes = Math.max(0, out[h].residence.value - resBaseline[h]);
      var upMkt = Math.max(0, out[h].market.value - out[h].market.base);
      var cut = Math.min(upMkt, Math.max(0, upRes + upMkt - HOME_BASE_CAP));
      if (cut > 0) adj(h, 'market', -cut, 'home-base cap: already counted under residence');
      out[h].market.homeCapped = cut;
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
        // total is rounded to 1e-6 so that float noise (e.g. 62.50000000000001) never decides the order
        id: k, country: D.COUNTRIES[IDS.indexOf(k)], total: round6(f.fit), score: Math.round(f.fit),
        contrib: f.contrib, residence: scores[k].residence.status, excluded: exclusion(a, k), scores: scores[k]
      };
    });
    // Tie-break for equal totals (documented on the method page):
    //   1. the stronger home base wins (higher residence score) – relocating has costs the model does
    //      not score, and ventures do better where founders have roots (Dahl & Sorenson 2012);
    //   2. then the countries' scores on the founder's criteria from most to least important
    //      (by weight, then criteria order) – the first difference decides;
    //   3. only if all of that is equal does the fixed order DE, CH, LI, UK, US, PT apply.
    var byImportance = D.CRITERIA.map(function (c, i) { return { id: c.id, w: weights[c.id].value, i: i }; })
      .filter(function (c) { return c.w > 0; })
      .sort(function (p, q) { return q.w - p.w || p.i - q.i; });
    rows.sort(function (x, y) {
      if (!!x.excluded !== !!y.excluded) return x.excluded ? 1 : -1;
      if (y.total !== x.total) return y.total - x.total;
      var dr = y.scores.residence.value - x.scores.residence.value;
      if (dr !== 0) return dr;
      for (var i = 0; i < byImportance.length; i++) {
        var cid = byImportance[i].id, d = y.scores[cid].value - x.scores[cid].value;
        if (d !== 0) return d;
      }
      return IDS.indexOf(x.id) - IDS.indexOf(y.id);
    });
    return rows;
  }
  function winnerOf(rows) { return rows[0] && !rows[0].excluded ? rows[0].id : null; }

  /* ---------- 5. Robustness & "what would change it" – one shared perturbation ----------
   * A scenario = the founder's priority level for ONE criterion set to another level (0–3), with
   * weights recomputed through computeWeights (so answer rules apply exactly as for the real
   * profile). Scenarios in which every weight is 0 are skipped (they would only trigger the
   * equal-weight fallback). Robustness uses the ±1 scenarios; "what changes" lists all levels. */
  function scenario(a, cid, lvl) {
    var b = {};
    for (var key in a) if (Object.prototype.hasOwnProperty.call(a, key)) b[key] = a[key];
    var pr = {};
    if (a.priorities) for (var p in a.priorities) if (Object.prototype.hasOwnProperty.call(a.priorities, p)) pr[p] = a.priorities[p];
    pr[cid] = lvl; b.priorities = pr;
    var wi = weightsInfo(b);
    return wi.allZero ? null : wi.w;
  }
  function flipsFor(a, weights, scores, winner, maxDist) {
    var out = [], tested = 0;
    var lo = LEVELS[0].v, hi = LEVELS[LEVELS.length - 1].v;
    D.CRITERIA.forEach(function (c) {
      var cur = weights[c.id].level;
      for (var lvl = lo; lvl <= hi; lvl++) {
        var dist = Math.abs(lvl - cur);
        if (!dist || dist > maxDist) continue;
        var w2 = scenario(a, c.id, lvl);
        if (!w2) continue;
        if (dist === 1) tested++;
        var r = rank(a, w2, scores);
        var win = winnerOf(r);
        if (win !== winner) out.push({ c: c.id, from: cur, to: lvl, dist: dist, winner: win });
      }
    });
    return { flips: out, tested: tested };
  }
  function robustness(a, weights, scores, winner) {
    var f = flipsFor(a, weights, scores, winner, 1);
    var flipped = f.flips.length;
    return { same: f.tested - flipped, total: f.tested, share: f.tested ? (f.tested - flipped) / f.tested : 1, flips: f.flips };
  }

  // A question with a showIf condition is only asked when the condition holds for the current answers.
  function isAsked(q, a) { return !q || typeof q.showIf !== 'function' || !!q.showIf(a || {}); }
  // Answers as the engine reads them: a question that is not asked takes its auto value
  // (capital 'none' → investors ['none']), whatever was stored (old saved state, share links).
  function normalize(a) {
    a = a || {};
    var out = null;
    QUESTIONS.forEach(function (q) {
      if (isAsked(q, a) || !q.autoValue) return;
      if (JSON.stringify(a[q.id]) === JSON.stringify(q.autoValue)) return;
      if (!out) { out = {}; Object.keys(a).forEach(function (k) { out[k] = a[k]; }); }
      out[q.id] = q.autoValue.slice();
    });
    return out || a;
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
    if (top.residence && top.residence.level === 'permit') {
      if (k === 'DE') w.push({ type: 'warn', title: 'Check your residence permit', text: 'Living in Germany is not the same as being allowed to found here. A student permit allows employment only (§16b AufenthG); self-employment needs approval (§21 (6)). With a degree from a German university, a self-employment permit is the standard route if the startup relates to your studies (§21 (2a)). A settlement permit already allows it.', src: 'aufenthg21' });
      else w.push({ type: 'warn', title: 'Check your residence permit', text: 'You live here, but no passport of yours gives free movement here. Check that your current permit allows self-employment before you register the company; if not, apply for a founder or self-employment permit first.', src: null });
    }
    if (a.relocation === 'stay' && COUNTRY_IN_LIST[a.residence]) {
      var stayTpl = 'Only {c} is ranked because you stay where you live. A company registered abroad but run from home usually stays tax-resident where it is actually managed (e.g. §10 AO, §1 KStG in Germany).';
      var stayName = D.COUNTRIES[IDS.indexOf(a.residence)].name;
      // tpl + vars let the UI translate the sentence (vars are English names, translated at render time)
      w.push({ type: 'info', title: 'Tax follows where you manage', text: stayTpl.replace('{c}', stayName), tpl: stayTpl, vars: { c: stayName }, src: 'ao10' });
    } else if (a.relocation === 'stay' && (a.residence === 'euother' || a.residence === 'elsewhere')) {
      w.push({ type: 'info', title: 'Tax follows where you manage', text: 'You stay in a country outside this comparison. A company registered in one of the six but managed from your home is usually taxed where it is actually managed.', src: 'ao10' });
    }
    if (a.residence === 'DE' && k !== 'DE' && a.relocation !== 'stay') {
      w.push({ type: 'warn', title: 'Exit tax when leaving Germany', text: 'Leaving Germany while holding ≥ 1% of a company can trigger exit tax on unrealised gains (§6 AStG; since 2022 payable in 7 instalments, usually against security). Plan before you move.', src: 'astg6' });
    }
    if (has(cl, 'us') && k !== 'US') {
      w.push({ type: 'warn', title: 'US tax on worldwide income', text: 'US citizens are taxed on worldwide income wherever they live. Check foreign tax credits and reporting before founding abroad.', src: 'irs_abroad' });
    }
    if (has(a.investors, 'US') && k !== 'US') {
      w.push({ type: 'info', title: 'US investors may want a Delaware flip', text: 'US investors may require a "Delaware flip" (a US holding above your local company) before investing. Common, but costs time and can have tax consequences.', src: 'stripe_flip' });
    }
    if (has(a.investors, 'elsewhere')) {
      w.push({ type: 'info', title: 'Ask your investors early', text: 'Investors outside these six countries may prefer a structure they know, often a US or UK entity. Ask early.', src: null });
    }
    if (k === 'US' && cl.length && !has(cl, 'us')) {
      w.push({ type: 'info', title: 'QSBS helps US taxpayers only', text: 'QSBS exclusion benefits US taxpayers only; as a non-US founder, your home-country tax rules on the exit still apply.', src: 'qsbs_obbba' });
    }
    if (k === 'LI') w.push({ type: 'warn', title: 'Residence permits are limited', text: 'Liechtenstein limits residence permits (partly allocated by lottery). Most people working there live in Switzerland or Austria.', src: 'li_quota' });
    if (k === 'CH') w.push({ type: 'info', title: 'Pick your canton carefully', text: 'Profit tax ranges from ≈ 11.9% (Zug) to ≈ 19.6% (Zurich) and above.', src: 'kpmg_ch' });
    if (k === 'DE' && (a.capital === 'none' || a.capital === 'lt10')) w.push({ type: 'tip', title: 'Start as a UG from €1', text: 'Low on capital: found a UG (haftungsbeschränkt) from €1, convert to a GmbH later.', src: 'gmbhg' });
    if (k === 'DE' && (a.exit === 'sale' || a.exit === 'ipo')) w.push({ type: 'tip', title: 'Use a holding GmbH for the exit', text: 'Exit from Germany: holding your shares via a holding GmbH can cut tax on the sale from ≈ 28.5% to ≈ 1.5% (§8b KStG). Set it up early with a tax adviser.', src: 'kstg8b' });
    var sn = D.SECTOR_NOTES[a.sector];
    if (sn) w.push({ type: 'sector', text: sn.text, src: sn.src });
    var lowConf = D.CRITERIA.filter(function (c) { return cellOf(k, c.id).confidence === 'low'; }).map(function (c) { return c.short; });
    if (lowConf.length >= 2) {
      var thinTpl = 'Thin data for {c}: {list}. Treat those scores as estimates.';
      w.push({ type: 'info', title: 'Some scores are estimates', text: thinTpl.replace('{c}', top.country.name).replace('{list}', lowConf.join(', ')), tpl: thinTpl, vars: { c: top.country.name, list: lowConf }, src: null });
    }
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
  /* Answer effects are built from templates so the UI can translate them:
   *   effectParts = [{ k: 'English template with {x}', v: { x: ['DE','CH'] | ['VC access', …] | 5 } }]
   *   effect      = the English text (parts joined with a space). Arrays of country ids render as names. */
  function fillTpl(k, v) {
    return k.replace(/\{(\w+)\}/g, function (m, key) {
      var x = v[key];
      if (Array.isArray(x)) {
        var isIds = x.every(function (i) { return COUNTRY_IN_LIST[i]; });
        var n = isIds ? x.map(function (i) { return D.COUNTRIES.filter(function (c) { return c.id === i; })[0].name; }) : x;
        return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : (n[0] || '');
      }
      return x == null ? m : String(x);
    });
  }
  function answerEffects(a, res) {
    var out = [];
    var byLevel = function (lvl) { return res.rows.filter(function (r) { return r.residence && r.residence.level === lvl; }).map(function (r) { return r.id; }); };
    QUESTIONS.forEach(function (q) {
      var v = a[q.id];
      var answered = q.type === 'multi' ? (Array.isArray(v) && v.length) : v != null;
      var label = answered ? (Array.isArray(v) ? v : [v]).map(function (x) { var o = q.options.filter(function (oo) { return oo.v === x; })[0]; return o ? o.l : x; }).join(', ') : 'Not answered';
      var P = [];
      function say(k, vars) { P.push({ k: k, v: vars || {} }); }
      if (!answered) say('Skipped – no effect on the result.');
      else if (q.id === 'citizenship') {
        var ci = byLevel('citizen'), fr = byLevel('free'), vi = byLevel('visa'), li = byLevel('limited');
        say('Sets your residence score:');
        if (ci.length) say('full citizen rights in {list};', { list: ci });
        if (fr.length) say('free movement in {list};', { list: fr });
        if (vi.length) say('visa or permit needed for {list};', { list: vi });
        if (li.length) say('residence quota-limited in {list};', { list: li });
      } else if (q.id === 'residence') {
        var hr = res.rows.filter(function (r) { return r.id === v; })[0];
        if (COUNTRY_IN_LIST[v] && hr && hr.residence && hr.residence.level === 'permit') {
          say('{c} gets residence score 3, not 5: you live there, but no passport of yours gives free movement there, so founding depends on your permit.', { c: [v] });
          if (a.market === 'home') say('With your home market, this home-base uplift is capped at {n} score steps (no double counting).', { n: HOME_BASE_CAP });
        } else if (COUNTRY_IN_LIST[v]) {
          say('{c} gets the top residence score (5) for your existing home base.', { c: [v] });
          if (a.market === 'home') say('With your home market, this home-base uplift is capped at {n} score steps (no double counting).', { n: HOME_BASE_CAP });
        } else say('Not one of the six countries, so no home-base bonus.');
      } else if (q.id === 'relocation') {
        if (v === 'europe') say('The United States is excluded (still shown, greyed out).');
        else if (v === 'stay') { if (COUNTRY_IN_LIST[a.residence]) say('Only {c} is ranked; the others are shown for reference.', { c: [a.residence] }); else say('No country excluded: your home is outside the six.'); }
        else say('No exclusions; residence starts at “somewhat important” because you are mobile.');
      } else if (q.id === 'sector') {
        var sa = D.SECTOR_ADJ[v];
        if (v === 'other') say('No effect – no sector bonus applied.');
        else if (sa) say('+1 on the ecosystem score for {list}.', { list: IDS.filter(function (k) { return sa[k]; }) });
        else say(v === 'ai' ? 'No bonus needed: the leading AI hubs (US, UK) already score 5.' : (v === 'software' ? 'No sector bonus: software is the least location-bound sector.' : 'No sector bonus: no comparable country-level evidence.'));
      } else if (q.id === 'market' && v === 'unsure') {
        say('Not sure yet – market access keeps its evidence score for every country.');
      } else if (q.id === 'market') {
        var best = res.rows.filter(function (r) { return r.scores.market.value === 5; }).map(function (r) { return r.id; });
        if (best.length) say('Market access is highest (5) for {list}.', { list: best }); else say('No effect: your home is outside the six countries.');
      } else if (q.id === 'funding') {
        var f = [];
        if (has(v, 'vc')) f.push('VC access');
        if (has(v, 'grants') || has(v, 'angels')) f.push('public funding (incl. angel tax reliefs)');
        if (has(v, 'accelerator')) f.push('talent & ecosystem');
        if (has(v, 'bootstrap')) f.push('low profit tax and low living cost');
        if (f.length) say('Raises the weight of {list} by one level.', { list: f }); else say(has(v, 'unsure') ? 'Not sure yet – funding criteria keep your chosen weights.' : 'No effect.');
      } else if (q.id === 'capital') {
        if (v === 'none' || v === 'lt10') say('−1 on setup for Switzerland (CHF 20,000) and Liechtenstein (CHF 10,000): minimum capital must be fully paid in. In Germany a UG starts from €1.');
        else if (v === '10to25') say('Covers the paid-in minimum in Liechtenstein (CHF 10,000) and for a German UG; a German GmbH (€12,500) and Switzerland (CHF 20,000) may need more. No score change.');
        else say('Covers the paid-in minimum in all six countries; no penalty.');
      } else if (q.id === 'investors') {
        var map = { DE: ['DE'], CHLI: ['CH', 'LI'], UK: ['UK'], US: ['US'], EU: ['PT', 'DE'] };
        var ks = [];
        v.forEach(function (x) { (map[x] || []).forEach(function (k) { if (ks.indexOf(k) === -1) ks.push(k); }); });
        if (ks.length) say('+1 on VC access for {list} (your investors are there; max. score 5).', { list: ks });
        else say(has(v, 'elsewhere') ? 'No score effect (outside the six countries); see “Watch out”.' : 'No existing investors; no score effect.');
      } else if (q.id === 'exit') {
        say(v === 'hold' ? 'Raises the weight of low profit tax by one level.' : (v === 'undecided' ? 'No effect – both tax criteria keep your chosen weight.' : 'Raises the weight of low exit tax by one level.'));
      } else if (q.id === 'esop') {
        say(v === 'all' ? 'Raises the weight of founder-friendly stock options by one level.' : (v === 'no' ? (res.weights.esop && !res.weights.esop.isDefault ? 'You set a stock-option priority yourself; it is kept.' : 'Stock-option rules are not counted (weight 0).') : (v === 'unsure' ? 'Not sure yet – stock options keep the weight you chose.' : 'No change – stock options keep the weight you chose.')));
        if (res.weights.labor && plansToHire(a) && res.weights.labor.value > 0) say('Because you plan to hire, employer payroll costs are counted.');
      } else if (q.id === 'hires') {
        var hn = hiresOf(a), lw = res.weights.labor;
        if (!hn) say(lw && lw.value > 0 && !lw.isDefault ? 'No hires in year one, but your own priority for employer payroll costs is kept.' : 'No hires in year one: employer payroll costs are not counted.');
        else { say(lw && lw.bonus ? 'Raises the weight of employer payroll costs by one level.' : 'Employer payroll costs keep the weight you chose.'); say('First-year cost estimate includes payroll for {n} employees.', { n: hn }); }
      }
      var text = P.map(function (p) { return fillTpl(p.k, p.v); }).join(' ').replace(/;$/, '.');
      out.push({ q: q.id, title: q.title, answer: label, effect: text, effectParts: P, answered: !!answered });
    });
    return out;
  }

  /* ---------- What would change the result? ----------
   * Same scenarios as robustness (one priority level changed, weights through computeWeights,
   * all-zero scenarios skipped), all levels 0–3. Closest change per criterion, max 3 entries. */
  function whatChanges(a, res) {
    if (!res.top || !res.runnerUp) return [];
    var found = flipsFor(a, res.weights, res._scores, res.top.id, LEVELS.length).flips;
    var order = D.CRITERIA.map(function (c) { return c.id; });
    found.sort(function (x, y) { return x.dist - y.dist || order.indexOf(x.c) - order.indexOf(y.c) || x.to - y.to; });
    var seen = {}, out = [];
    found.forEach(function (f) { if (!seen[f.c] && out.length < 3) { seen[f.c] = 1; out.push({ c: f.c, from: f.from, to: f.to, dist: f.dist, winner: f.winner }); } });
    return out;
  }

  /* ---------- Confidence of the recommendation ---------- */
  function lowCell(k, cid, scores) {
    if (cid === 'residence' && scores[k].residence.status) return false; // derived from your own answers
    var cell = cellOf(k, cid);
    return !!cell.nodata || cell.confidence === 'low';
  }
  function confidenceOf(top, scores) {
    if (!top) return null;
    var low = 0, lowIds = [];
    D.CRITERIA.forEach(function (c) {
      if (lowCell(top.id, c.id, scores) && top.contrib[c.id] > 0) { low += top.contrib[c.id]; lowIds.push(c.id); }
    });
    var share = top.total > 0 ? round6(low / top.total) : 0;
    // informational split of the rest: how much rests on 'medium'-confidence cells (not used for the level)
    var med = 0;
    D.CRITERIA.forEach(function (c) {
      if (!lowCell(top.id, c.id, scores) && top.contrib[c.id] > 0 && !(c.id === 'residence' && scores[top.id].residence.status) && cellOf(top.id, c.id).confidence === 'medium') med += top.contrib[c.id];
    });
    var medShare = top.total > 0 ? round6(med / top.total) : 0;
    return { level: share < CONF_HIGH_MAX ? 'high' : (share < CONF_MED_MAX ? 'medium' : 'low'), estShare: share, medShare: medShare, highShare: round6(Math.max(0, 1 - share - medShare)), lowCriteria: lowIds };
  }

  /* ---------- Winner vs runner-up, per criterion (points on the 0–100 scale; Σ = gap) ---------- */
  function comparisonOf(top, run, weights) {
    if (!top || !run) return null;
    var out = D.CRITERIA.map(function (c) {
      return { c: c.id, winnerScore: top.scores[c.id].value, runnerScore: run.scores[c.id].value, weight: weights[c.id].value, deltaPoints: round6(top.contrib[c.id] - run.contrib[c.id]) };
    });
    out.sort(function (x, y) { return Math.abs(y.deltaPoints) - Math.abs(x.deltaPoints); });
    return out;
  }

  /* ---------- First-year cost (from D.FIRST_YEAR_COST, if present) ----------
   * oneOff = Σ one-off items, recurring = Σ recurring items, both excluding 'capitalLocked'
   * (paid-in share capital is not spent; shown separately) and 'payrollPerEmployee'
   * (shown per employee; multiplied by a.hires when a number of hires is known, else 0). */
  function firstYearCostOf(a) {
    var F = D.FIRST_YEAR_COST;
    if (!F || typeof F !== 'object' || !Object.keys(F).length) return null;
    var hires = hiresOf(a) || 0;
    var out = {};
    IDS.forEach(function (k) {
      var e = F[k];
      if (!e || !Array.isArray(e.items)) { out[k] = null; return; }
      var oneOff = 0, recurring = 0, locked = null, perEmp = null;
      e.items.forEach(function (it) {
        var eur = typeof it.eur === 'number' && isFinite(it.eur) ? it.eur : 0;
        if (it.id === 'capitalLocked') { locked = eur; return; }
        if (it.id === 'payrollPerEmployee') { perEmp = eur; return; }
        if (it.oneOff) oneOff += eur; else recurring += eur;
      });
      var payroll = perEmp != null ? perEmp * hires : 0;
      out[k] = { currency: 'EUR', oneOff: oneOff, recurring: recurring, total: oneOff + recurring + payroll,
        capitalLocked: locked, payrollPerEmployee: perEmp, hires: hires, payroll: payroll, items: e.items, note: e.note || null };
    });
    return out;
  }

  function evaluate(a, light) {
    a = normalize(a);
    var wi = weightsInfo(a);
    var weights = wi.w;
    var scores = adjustedScores(a);
    var rows = rank(a, weights, scores);
    var eligible = rows.filter(function (r) { return !r.excluded; });
    var top = eligible[0] || null;
    var run = eligible[1] || null;
    var gap = run ? round6(top.total - run.total) : null;
    var rob = run && !light ? robustness(a, weights, scores, top.id) : null;
    var tie = null;
    if (run && gap < TIE_POINTS) tie = eligible.filter(function (r) { return top.total - r.total < TIE_POINTS; }).map(function (r) { return r.id; });
    rows.forEach(function (r) { r.tie = !!(tie && tie.indexOf(r.id) !== -1); });
    var verdict = 'only';
    if (run) {
      if (tie) verdict = 'tie';
      else if (rob) verdict = (rob.flips.length === 0 && gap >= ROBUST_GAP) ? 'robust' : 'close';
      else verdict = gap >= ROBUST_GAP ? 'robust' : 'close'; // light mode: no perturbation run
    }
    var filtered = rows.filter(function (r) { return r.excluded; });
    var res = {
      weights: weights, rows: rows, top: top, runnerUp: run, gap: gap,
      robustness: rob, verdict: verdict, answered: answeredCount(a), totalQuestions: QUESTIONS.length,
      warnings: warnings(a, top), explain: explain(top, weights),
      // --- added Nov 2026 (additive) ---
      tie: tie, allZero: wi.allZero,
      confidence: confidenceOf(top, scores),
      comparison: comparisonOf(top, run, weights),
      firstYearCost: firstYearCostOf(a),
      excluded: filtered.map(function (r) { return { id: r.id, reason: r.excluded }; }),
      filteredOut: filtered,
      eligible: eligible.map(function (r) { return r.id; })
    };
    if (!light) {
      res.effects = answerEffects(a, res);
      Object.defineProperty(res, '_scores', { value: scores, enumerable: false });
      res.changes = whatChanges(a, res);
    }
    return res;
  }

  var api = { QUESTIONS: QUESTIONS, BLOCKS: BLOCKS, LEVELS: LEVELS, MARKET_TABLE: MARKET_TABLE, evaluate: evaluate, isAsked: isAsked, normalize: normalize, computeWeights: computeWeights, defaultLevel: defaultLevel, hiresOf: hiresOf,
    HOME_BASE_CAP: HOME_BASE_CAP, TIE_POINTS: TIE_POINTS, ROBUST_GAP: ROBUST_GAP, CONF_HIGH_MAX: CONF_HIGH_MAX, CONF_MED_MAX: CONF_MED_MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_ENGINE = api;
})(this);
