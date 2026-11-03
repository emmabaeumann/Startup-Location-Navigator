#!/usr/bin/env node
// Seeded Monte-Carlo simulation of the engine: win shares, verdicts, ties, personas.
// Run: npm run simulate   (optional: node tests/simulate.js <N> <seed>)
const E = require('../assets/js/engine.js');
const D = require('../assets/js/data.js');
const { rng, randomProfile, PERSONAS } = require('./profiles.js');

const N = parseInt(process.argv[2], 10) || 20000;
const SEED = parseInt(process.argv[3], 10) || 42;
const IDS = D.COUNTRIES.map(c => c.id);
const pct = (o, n) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (100 * v / n).toFixed(1) + '%']));

const rnd = rng(SEED);
const win = Object.fromEntries(IDS.map(k => [k, 0])), winFree = Object.fromEntries(IDS.map(k => [k, 0]));
let free = 0, exact = 0, ties = 0, under1 = 0, nan = 0;
for (let i = 0; i < N; i++) {
  const a = randomProfile(rnd);
  const r = E.evaluate(a, true);
  if (r.rows.some(x => !Number.isFinite(x.total))) nan++;
  win[r.top.id]++;
  if (a.relocation !== 'stay' && a.relocation !== 'europe') { free++; winFree[r.top.id]++; }
  if (r.runnerUp) { if (r.gap === 0) exact++; if (r.tie) ties++; if (r.gap < 1) under1++; }
}
console.log(`== Random profiles (N=${N}, seed=${SEED}) – criteria: ${D.CRITERIA.map(c => c.id).join(', ')}`);
console.log('   win share:', pct(win, N));
console.log(`   unconstrained (relocation anywhere/skipped, n=${free}):`, pct(winFree, free));
console.log(`   exact ties: ${exact}  ties (<${E.TIE_POINTS} pt, verdict 'tie'): ${ties} (${(100 * ties / N).toFixed(1)}%)  gap < 1 pt: ${under1}  NaN: ${nan}`);

const M = Math.min(3000, N), verdicts = { robust: 0, close: 0, tie: 0, only: 0 };
let inconsistent = 0, conf = { high: 0, medium: 0, low: 0 };
for (let i = 0; i < M; i++) {
  const r = E.evaluate(randomProfile(rnd));
  verdicts[r.verdict]++;
  if (r.confidence) conf[r.confidence.level]++;
  if (r.verdict === 'robust' && r.changes.some(c => c.dist === 1)) inconsistent++;
}
console.log(`== Full evaluation (N=${M}) verdicts:`, verdicts, ' robust-but-1-level-flip:', inconsistent, ' confidence:', conf);

console.log('== Personas');
for (const [name, a] of Object.entries(PERSONAS)) {
  const r = E.evaluate(a);
  const el = r.rows.filter(x => !x.excluded).map(x => x.id + ':' + x.total.toFixed(1)).join(' ');
  const flips = r.changes.map(c => `${c.c} ${c.from}->${c.to}=>${c.winner}`).join(', ');
  console.log(` ${name} -> ${r.top.id} [${r.verdict}${r.robustness ? ' ' + r.robustness.same + '/' + r.robustness.total : ''} gap ${(r.gap ?? 0).toFixed(1)} conf ${r.confidence.level}] ${el}${flips ? ' | flips: ' + flips : ''}`);
}
