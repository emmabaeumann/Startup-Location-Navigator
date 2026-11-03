// Regression tests for the Nov 2026 engine audit (ties, robustness, home base, new outputs).
const test = require('node:test');
const assert = require('node:assert');
const D = require('../assets/js/data.js');
const E = require('../assets/js/engine.js');
const { rng, randomProfile, PERSONAS } = require('./profiles.js');

const IDS = D.COUNTRIES.map(c => c.id);
const CR = D.CRITERIA.map(c => c.id);
const hasCrit = id => CR.includes(id);
const eligible = r => r.rows.filter(x => !x.excluded);
const withPrio = (a, c, lvl) => Object.assign({}, a, { priorities: Object.assign({}, a.priorities || {}, { [c]: lvl }) });
const allLevels = lvl => Object.fromEntries(CR.map(c => [c, lvl]));

/* ---------- 1. ties ---------- */
test('totals are rounded to 1e-6 and exact ties follow the documented tie-break', () => {
  const rnd = rng(7);
  let exact = 0;
  for (let i = 0; i < 4000; i++) {
    const r = E.evaluate(randomProfile(rnd), true);
    for (const row of r.rows) assert.strictEqual(row.total, Math.round(row.total * 1e6) / 1e6);
    const el = eligible(r);
    const order = Object.keys(r.weights).map((id, i) => ({ id, w: r.weights[id].value, i }))
      .filter(c => c.w > 0).sort((p, q) => q.w - p.w || p.i - q.i).map(c => c.id);
    for (let j = 1; j < el.length; j++) {
      const x = el[j - 1], y = el[j];
      assert.ok(x.total >= y.total);
      if (x.total !== y.total) continue;
      exact++;
      // 1. home base, 2. founder's criteria by importance, 3. fixed country order
      const key = row => [row.scores.residence.value].concat(order.map(c => row.scores[c].value));
      const kx = key(x), ky = key(y);
      const d = kx.findIndex((v, k) => v !== ky[k]);
      if (d === -1) assert.ok(IDS.indexOf(x.id) < IDS.indexOf(y.id));
      else assert.ok(kx[d] > ky[d], `tie-break order wrong for ${x.id} vs ${y.id}`);
    }
  }
  assert.ok(exact > 0, 'sample should contain exact ties');
});

test('a gap below 0.5 points is reported as a tie (verdict "tie", tied ids listed)', () => {
  const rnd = rng(11);
  let ties = 0;
  for (let i = 0; i < 1500; i++) {
    const r = E.evaluate(randomProfile(rnd));
    const el = eligible(r);
    if (el.length < 2) { assert.strictEqual(r.tie, null); continue; }
    if (r.gap < E.TIE_POINTS) {
      ties++;
      assert.strictEqual(r.verdict, 'tie');
      assert.ok(Array.isArray(r.tie) && r.tie[0] === r.top.id && r.tie.includes(r.runnerUp.id));
      for (const id of r.tie) assert.ok(r.top.total - r.rows.find(x => x.id === id).total < E.TIE_POINTS);
      assert.ok(r.rows.filter(x => x.tie).length === r.tie.length);
    } else {
      assert.strictEqual(r.tie, null);
      assert.notStrictEqual(r.verdict, 'tie');
    }
  }
  assert.ok(ties > 0);
});

/* ---------- 2. robustness ⇔ what changes ---------- */
test('property: verdict, robustness and "what changes" agree (3000 seeded profiles)', () => {
  const rnd = rng(2026);
  const counts = { robust: 0, close: 0, tie: 0, only: 0 };
  for (let i = 0; i < 3000; i++) {
    const a = randomProfile(rnd);
    const r = E.evaluate(a);
    counts[r.verdict]++;
    const el = eligible(r);
    if (el.length < 2) { assert.strictEqual(r.robustness, null); assert.strictEqual(r.verdict, 'only'); assert.deepStrictEqual(r.changes, []); continue; }
    const rob = r.robustness;
    assert.strictEqual(rob.same + rob.flips.length, rob.total);
    const oneLevel = r.changes.filter(c => c.dist === 1);
    if (r.verdict === 'robust') {
      assert.strictEqual(oneLevel.length, 0, 'robust but a 1-level change flips: ' + JSON.stringify(a));
      assert.strictEqual(rob.flips.length, 0);
      assert.ok(r.gap >= E.ROBUST_GAP);
    }
    // every 1-level flip found by robustness shows up in the panel (closest change per criterion)
    const critsFlipping = new Set(rob.flips.map(f => f.c));
    const shown = new Set(r.changes.map(c => c.c));
    if (rob.flips.length) assert.ok(r.changes.length > 0 && r.changes[0].dist === 1);
    for (const c of oneLevel) assert.ok(critsFlipping.has(c.c));
    if (critsFlipping.size <= 3) for (const c of critsFlipping) assert.ok(shown.has(c));
    // each listed change reproduces when the founder actually makes it
    if (i % 10 === 0) for (const c of r.changes) {
      const r2 = E.evaluate(withPrio(a, c.c, c.to), true);
      assert.strictEqual(r2.top.id, c.winner);
      assert.ok(c.to >= 0 && c.to <= 3 && c.from >= 0 && c.from <= 3);
    }
  }
  assert.ok(counts.robust > 0 && counts.close > 0);
});

test('perturbations skip scenarios in which every weight would be 0', () => {
  const pr = allLevels(0); pr.cost = 1;
  const a = { relocation: 'anywhere', priorities: pr };
  const r = E.evaluate(a);
  // cost 1→0 would leave nothing weighted: skipped. Every other criterion 0→1 and cost 1→2 are tested.
  assert.strictEqual(r.robustness.total, CR.length);
  assert.ok(!r.changes.some(c => c.c === 'cost' && c.to === 0));
  assert.strictEqual(r.allZero, false);
});

test('fewer than two eligible countries: robustness null, verdict only', () => {
  const r = E.evaluate({ residence: 'PT', relocation: 'stay' });
  assert.strictEqual(r.robustness, null);
  assert.strictEqual(r.verdict, 'only');
  assert.deepStrictEqual(r.changes, []);
  assert.strictEqual(r.comparison, null);
});

/* ---------- 3. home base ---------- */
test('Swiss founder living in CH with CH investors and EU market: CH now ahead of PT', () => {
  const r = E.evaluate(PERSONAS['Swiss fintech living in CH, CH investors, EU market']);
  const ch = r.rows.find(x => x.id === 'CH'), pt = r.rows.find(x => x.id === 'PT');
  assert.ok(ch.total > pt.total, `CH ${ch.total} vs PT ${pt.total}`);
  assert.ok(ch.scores.vc.adj.some(s => /investors are based here/.test(s)) || ch.scores.vc.base === 5);
});

test('local investors never change residence', () => {
  const a = { citizenship: ['eu'], residence: 'DE' };
  for (const inv of ['DE', 'CHLI', 'UK', 'US', 'EU']) {
    const r0 = E.evaluate(a, true), r1 = E.evaluate(Object.assign({ investors: [inv] }, a), true);
    for (const k of IDS) assert.strictEqual(r1.rows.find(x => x.id === k).scores.residence.value, r0.rows.find(x => x.id === k).scores.residence.value);
  }
});

test('home-base cap: residence + home-market uplift never exceeds HOME_BASE_CAP steps', () => {
  for (const cit of [['eu'], ['other'], ['uk'], ['us'], ['ch'], []]) for (const home of ['DE', 'CH', 'LI', 'UK', 'US', 'PT']) {
    const base = E.evaluate(cit.length ? { citizenship: cit } : {}, true).rows.find(x => x.id === home);
    const a = { residence: home, market: 'home' }; if (cit.length) a.citizenship = cit;
    const row = E.evaluate(a, true).rows.find(x => x.id === home);
    const upRes = row.scores.residence.value - base.scores.residence.value;
    const upMkt = row.scores.market.value - row.scores.market.base;
    assert.strictEqual(row.scores.residence.value, 5, 'living there always gives residence 5');
    assert.ok(upMkt >= 0);
    assert.ok(upMkt === 0 || upRes + upMkt <= E.HOME_BASE_CAP, `${cit}/${home}: res +${upRes}, market +${upMkt}`);
  }
});

/* ---------- 4. ESOP ---------- */
test('esop "no" switches ESOP off only while its priority is the default', () => {
  assert.strictEqual(E.computeWeights({ esop: 'no' }).esop.value, 0);
  assert.strictEqual(E.computeWeights({ esop: 'no', priorities: { esop: 3 } }).esop.value, 3);
  assert.strictEqual(E.computeWeights({ esop: 'no', priorities: { esop: 1 } }).esop.value, 1);
  assert.strictEqual(E.computeWeights({ esop: 'no', priorities: { esop: 0 } }).esop.value, 0);
});

/* ---------- 5. stay warning ---------- */
test('"stay outside this comparison" note only when the founder said where they live', () => {
  const txt = /outside this comparison/;
  assert.ok(!E.evaluate({ relocation: 'stay' }).warnings.some(w => txt.test(w.text)));
  assert.ok(E.evaluate({ relocation: 'stay', residence: 'elsewhere' }).warnings.some(w => txt.test(w.text)));
  assert.ok(E.evaluate({ relocation: 'stay', residence: 'euother' }).warnings.some(w => txt.test(w.text)));
});

/* ---------- 6. all zero ---------- */
test('all priorities 0: equal-weight fallback and res.allZero', () => {
  const r = E.evaluate({ priorities: allLevels(0), funding: ['vc'] });
  assert.strictEqual(r.allZero, true);
  for (const c of CR) assert.strictEqual(r.weights[c].value, 1);
  assert.strictEqual(E.evaluate({}).allZero, false);
});

/* ---------- 7. new criteria (guarded: only when facts.js has added them) ---------- */
test('labor: counted when the founder plans to hire', { skip: !hasCrit('labor') && 'labor not in data yet' }, () => {
  assert.strictEqual(E.computeWeights({}).labor.value, 0);
  assert.strictEqual(E.computeWeights({ esop: 'key' }).labor.value, 1);
  assert.strictEqual(E.computeWeights({ esop: 'all' }).labor.value, 1);
  assert.strictEqual(E.computeWeights({ esop: 'all', priorities: { labor: 0 } }).labor.value, 0);
  assert.strictEqual(E.computeWeights({ esop: 'key', priorities: { labor: 2 } }).labor.value, 3);
});
test('rnd: counted for R&D-heavy sectors', { skip: !hasCrit('rnd') && 'rnd not in data yet' }, () => {
  assert.strictEqual(E.computeWeights({}).rnd.value, 0);
  for (const s of ['ai', 'hardware', 'life']) assert.strictEqual(E.computeWeights({ sector: s }).rnd.value, 1);
  assert.strictEqual(E.computeWeights({ sector: 'software' }).rnd.value, 0);
});
test('new criteria default to 0, so profiles without related answers are unaffected', () => {
  const w = E.computeWeights({ sector: 'software', esop: 'no' });
  for (const id of ['labor', 'rnd']) if (w[id]) assert.strictEqual(w[id].value, 0);
});

/* ---------- 8. new outputs ---------- */
test('confidence: share of the winner score on low-confidence / no-data cells', () => {
  const rnd = rng(5);
  for (let i = 0; i < 500; i++) {
    const r = E.evaluate(randomProfile(rnd), true);
    const c = r.confidence;
    assert.ok(c && ['high', 'medium', 'low'].includes(c.level));
    assert.ok(c.estShare >= 0 && c.estShare <= 1);
    const exp = c.estShare < E.CONF_HIGH_MAX ? 'high' : c.estShare < E.CONF_MED_MAX ? 'medium' : 'low';
    assert.strictEqual(c.level, exp);
    let low = 0;
    for (const id of CR) {
      const cell = D.SCORES[r.top.id][id];
      const derived = id === 'residence' && r.top.scores.residence.status;
      if (!derived && (cell.nodata || cell.confidence === 'low')) low += r.top.contrib[id];
    }
    assert.ok(Math.abs(c.estShare - (r.top.total > 0 ? low / r.top.total : 0)) < 1e-5);
  }
});

test('comparison: per-criterion deltas sum to the gap and are sorted by size', () => {
  const rnd = rng(9);
  for (let i = 0; i < 1000; i++) {
    const r = E.evaluate(randomProfile(rnd), true);
    if (!r.runnerUp) { assert.strictEqual(r.comparison, null); continue; }
    const sum = r.comparison.reduce((s, x) => s + x.deltaPoints, 0);
    assert.ok(Math.abs(sum - r.gap) < 1e-4, `${sum} vs ${r.gap}`);
    assert.strictEqual(r.comparison.length, CR.length);
    for (let j = 1; j < r.comparison.length; j++) assert.ok(Math.abs(r.comparison[j - 1].deltaPoints) >= Math.abs(r.comparison[j].deltaPoints));
    const x = r.comparison[0];
    assert.ok('c' in x && 'winnerScore' in x && 'runnerScore' in x && 'weight' in x);
  }
});

test('firstYearCost: null without data, sums items (capital & payroll separate) with data', () => {
  const saved = D.FIRST_YEAR_COST;
  try {
    D.FIRST_YEAR_COST = {};
    assert.strictEqual(E.evaluate({}).firstYearCost, null);
    D.FIRST_YEAR_COST = undefined;
    assert.strictEqual(E.evaluate({}).firstYearCost, null);
    D.FIRST_YEAR_COST = { DE: { currency: 'EUR', items: [
      { id: 'registration', eur: 300, oneOff: true }, { id: 'notary', eur: 700, oneOff: true },
      { id: 'capitalLocked', eur: 25000, oneOff: true }, { id: 'accounting', eur: 3000, oneOff: false },
      { id: 'payrollPerEmployee', eur: 12000, oneOff: false }, { id: 'compliance', eur: 'n/a', oneOff: false }
    ] } };
    const f = E.evaluate({}).firstYearCost;
    assert.deepStrictEqual([f.DE.oneOff, f.DE.recurring, f.DE.capitalLocked, f.DE.payrollPerEmployee, f.DE.hires, f.DE.payroll, f.DE.total], [1000, 3000, 25000, 12000, 0, 0, 4000]);
    assert.strictEqual(f.PT, null);
    const g = E.evaluate({ hires: 3 }).firstYearCost;
    assert.strictEqual(g.DE.payroll, 36000);
    assert.strictEqual(g.DE.total, 40000);
  } finally { D.FIRST_YEAR_COST = saved; }
});

test('firstYearCost from the real data set is well-formed when present', { skip: !Object.keys(D.FIRST_YEAR_COST || {}).length && 'FIRST_YEAR_COST not in facts.js yet' }, () => {
  const f = E.evaluate({}).firstYearCost;
  for (const k of IDS) if (f[k]) for (const n of ['oneOff', 'recurring', 'total']) assert.ok(Number.isFinite(f[k][n]) && f[k][n] >= 0, k + '.' + n);
});

test('excluded and filteredOut list the greyed-out countries with reasons', () => {
  const r = E.evaluate({ relocation: 'europe' });
  assert.deepStrictEqual(r.excluded, [{ id: 'US', reason: 'You prefer to stay in Europe' }]);
  assert.deepStrictEqual(r.filteredOut.map(x => x.id), ['US']);
  assert.ok(!r.eligible.includes('US'));
  assert.deepStrictEqual(E.evaluate({}).excluded, []);
});

test('the new fields are deterministic and JSON-serialisable', () => {
  const rnd = rng(3);
  for (let i = 0; i < 50; i++) {
    const a = randomProfile(rnd);
    assert.strictEqual(JSON.stringify(E.evaluate(a)), JSON.stringify(E.evaluate(JSON.parse(JSON.stringify(a)))));
  }
});
