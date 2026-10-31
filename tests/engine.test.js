// Run: node --test tests/engine.test.js
const test = require('node:test');
const assert = require('node:assert');
const D = require('../assets/js/data.js');
const E = require('../assets/js/engine.js');

test('every score cell is 1–5 and cites existing sources', () => {
  for (const c of D.COUNTRIES) for (const k of D.CRITERIA) {
    const cell = D.SCORES[c.id][k.id];
    assert.ok(cell, `${c.id}.${k.id} missing`);
    assert.ok(cell.score >= 1 && cell.score <= 5);
    for (const s of cell.sources) assert.ok(D.SOURCES[s], `unknown source ${s}`);
  }
});

test('deterministic: same answers give identical results', () => {
  const a = { citizenship: ['eu'], residence: 'DE', relocation: 'anywhere', sector: 'ai', funding: ['vc'], priorities: { vc: 3 } };
  assert.deepStrictEqual(JSON.stringify(E.evaluate(a)), JSON.stringify(E.evaluate(JSON.parse(JSON.stringify(a)))));
});

test('scores stay within 0–100', () => {
  const r = E.evaluate({ priorities: { corpTax: 3, exitTax: 3, setup: 0, vc: 0, grants: 0, talent: 0, esop: 0, cost: 0, market: 0, residence: 0 } });
  for (const row of r.rows) assert.ok(row.score >= 0 && row.score <= 100);
});

test('relocation filters exclude but keep countries visible', () => {
  const r = E.evaluate({ relocation: 'europe' });
  assert.strictEqual(r.rows.length, 6);
  assert.ok(r.rows.find(x => x.id === 'US').excluded);
  const s = E.evaluate({ residence: 'PT', relocation: 'stay' });
  assert.strictEqual(s.top.id, 'PT');
  assert.strictEqual(s.verdict, 'only');
});

test('representative profiles land where the evidence points', () => {
  const cheap = E.evaluate({ citizenship: ['eu'], residence: 'euother', relocation: 'europe', funding: ['bootstrap'], exit: 'hold', priorities: { cost: 3, setup: 3, vc: 0, grants: 0 } });
  assert.strictEqual(cheap.top.id, 'PT');
  const usVc = E.evaluate({ citizenship: ['eu'], residence: 'DE', relocation: 'anywhere', market: 'us', funding: ['vc'], investors: ['US'], priorities: { vc: 3, talent: 3, market: 3 } });
  assert.strictEqual(usVc.top.id, 'US');
  const swissExit = E.evaluate({ citizenship: ['ch'], residence: 'CH', relocation: 'europe', sector: 'life', exit: 'sale', priorities: { exitTax: 3, talent: 3 } });
  assert.strictEqual(swissExit.top.id, 'CH');
});

test('skipped answers have no effect', () => {
  assert.deepStrictEqual(E.evaluate({}).rows.map(r => r.score), E.evaluate({ investors: [], funding: [] }).rows.map(r => r.score));
});

test('"not needed" priority is never raised by answer rules', () => {
  const w = E.computeWeights({ funding: ['vc'], priorities: { vc: 0 } });
  assert.strictEqual(w.vc.value, 0);
});

test('several citizenships: the most favourable residence status counts', () => {
  const r = E.evaluate({ citizenship: ['other', 'eu'] });
  const de = r.rows.find(x => x.id === 'DE');
  assert.strictEqual(de.scores.residence.value, 4);
  const uk = E.evaluate({ citizenship: ['eu', 'uk'] }).rows.find(x => x.id === 'UK');
  assert.strictEqual(uk.scores.residence.value, 4);
});

test('living in a country gives the home-base maximum', () => {
  const r = E.evaluate({ residence: 'PT' });
  assert.strictEqual(r.rows.find(x => x.id === 'PT').scores.residence.value, 5);
});

test('all adjusted scores are whole steps', () => {
  const r = E.evaluate({ citizenship: ['eu'], investors: ['EU', 'CHLI'], sector: 'fintech', market: 'dach', capital: 'none' });
  for (const row of r.rows) for (const k of Object.keys(row.scores)) assert.ok(Number.isInteger(row.scores[k].value));
});

test('unknown data is neutral, not penalised', () => {
  assert.strictEqual(D.SCORES.LI.grants.score, 3);
  assert.ok(D.SCORES.LI.grants.nodata);
});

test('residence defaults to important unless the founder would move anywhere', () => {
  assert.strictEqual(E.computeWeights({}).residence.value, 2);
  assert.strictEqual(E.computeWeights({ relocation: 'anywhere' }).residence.value, 1);
  assert.strictEqual(E.computeWeights({ relocation: 'anywhere', priorities: { residence: 3 } }).residence.value, 3);
});
