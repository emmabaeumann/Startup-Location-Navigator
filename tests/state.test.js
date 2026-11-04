const test = require('node:test');
const assert = require('node:assert');
const D = require('../assets/js/data.js');
const E = require('../assets/js/engine.js');
const S = require('../assets/js/state.js');

const Q = E.QUESTIONS, C = D.CRITERIA, KEY = 'fn-test';
const MAX = Q.length; // app: STEPS = questions + priorities page → max index = Q.length
const OPTS = { questions: Q, criteria: C, maxStep: MAX };
function mem(init) {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m };
}
const put = obj => mem({ [KEY]: typeof obj === 'string' ? obj : JSON.stringify(obj) });

test('save → load round trip', () => {
  const st = mem();
  const s = { view: 'wizard', step: 3, answers: { residence: 'DE', funding: ['vc'], priorities: { vc: 3 } }, skipped: { market: true }, countryId: null };
  assert.ok(S.save(st, KEY, s));
  assert.deepStrictEqual(S.load(st, KEY, OPTS), s);
});

test('load: empty, garbage JSON, non-object and throwing storage → clean default', () => {
  const def = S.defaultState();
  assert.deepStrictEqual(S.load(mem(), KEY, OPTS), def);
  assert.deepStrictEqual(S.load(put('{not json'), KEY, OPTS), def);
  assert.deepStrictEqual(S.load(put('42'), KEY, OPTS), def);
  assert.deepStrictEqual(S.load(put('null'), KEY, OPTS), def);
  assert.deepStrictEqual(S.load(put('[1,2]'), KEY, OPTS), def);
  assert.deepStrictEqual(S.load({ getItem() { throw new Error('denied'); } }, KEY, OPTS), def);
  assert.deepStrictEqual(S.load(null, KEY, OPTS), def);
});

test('load: step clamped, view whitelisted, skipped must be a plain object', () => {
  assert.strictEqual(S.load(put({ step: 99 }), KEY, OPTS).step, MAX);
  assert.strictEqual(S.load(put({ step: -4 }), KEY, OPTS).step, 0);
  assert.strictEqual(S.load(put({ step: '3' }), KEY, OPTS).step, 0);
  assert.strictEqual(S.load(put({ step: 2.7 }), KEY, OPTS).step, 2);
  assert.strictEqual(S.load(put({ view: 'evil' }), KEY, OPTS).view, 'landing');
  assert.strictEqual(S.load(put({ view: 'method' }), KEY, OPTS).view, 'landing');
  assert.strictEqual(S.load(put({ view: 'results' }), KEY, OPTS).view, 'results');
  assert.deepStrictEqual(S.load(put({ skipped: 'x' }), KEY, OPTS).skipped, {});
  assert.deepStrictEqual(S.load(put({ skipped: ['market'] }), KEY, OPTS).skipped, {});
  assert.deepStrictEqual(S.load(put({ skipped: { market: true, bogus: true, sector: 'yes' } }), KEY, OPTS).skipped, { market: true });
});

test('sanitize drops unknown questions, values, types and priorities', () => {
  const out = S.sanitize({
    residence: 'Mars', relocation: 'europe', sector: ['ai'], funding: ['vc', 'lottery', 'vc'],
    investors: ['none', 'DE'], hacker: 1, priorities: { vc: 3, cost: 7, talent: '2', bogus: 1 }
  }, Q, C);
  assert.deepStrictEqual(out, { relocation: 'europe', funding: ['vc'], investors: ['DE'], priorities: { vc: 3 } });
  assert.deepStrictEqual(S.sanitize(null, Q, C), {});
  assert.deepStrictEqual(S.sanitize('x', Q, C), {});
  assert.deepStrictEqual(S.sanitize({ priorities: [3] }, Q, C), {});
  assert.deepStrictEqual(S.load(put({ answers: 'x' }), KEY, OPTS).answers, {});
});

test('readShare: valid link round-trips; malformed hash → null', () => {
  const a = { residence: 'CH', funding: ['vc', 'grants'], priorities: { esop: 2 } };
  assert.deepStrictEqual(S.readShare('#r=' + S.encodeShare(a), Q, C), a);
  assert.deepStrictEqual(S.readShare('#r=' + S.encodeShare({ sector: 'ai', evil: '<script>' }), Q, C), { sector: 'ai' });
  for (const h of ['', '#', '#r=', '#r=!!!', '#r=%%%', '#r=bm90IGpzb24', '#x=abc', '#r=' + Buffer.from('[1]').toString('base64'),
    '#r=' + Buffer.from('{"a":"x"}').toString('base64'), '#r=' + Buffer.from('{"v":1}').toString('base64'), '#r=////', '#r=_-_-_']) {
    assert.strictEqual(S.readShare(h, Q, C), null, JSON.stringify(h));
  }
  assert.strictEqual(S.readShare(undefined, Q, C), null);
  assert.strictEqual(S.readShare(null, Q, C), null);
});

test('save never throws when storage fails', () => {
  assert.strictEqual(S.save({ setItem() { throw new Error('quota'); } }, KEY, S.defaultState()), false);
  assert.strictEqual(S.save(null, KEY, S.defaultState()), false);
});

test('sanitize: hires keeps known option values only; info views restore to landing', () => {
  assert.deepStrictEqual(S.sanitize({ hires: '3to5' }, Q, C), { hires: '3to5' });
  assert.deepStrictEqual(S.sanitize({ hires: 3 }, Q, C), {});
  assert.deepStrictEqual(S.sanitize({ hires: '7' }, Q, C), {});
  assert.strictEqual(S.load(put({ view: 'method' }), KEY, OPTS).view, 'landing');
  assert.strictEqual(S.load(put({ view: 'about' }), KEY, OPTS).view, 'about');
  assert.strictEqual(S.load(put({ view: 'country' }), KEY, OPTS).view, 'landing', 'country without id → landing');
  assert.strictEqual(S.load(put({ view: 'country', countryId: 'XX' }), KEY, OPTS).view, 'landing', 'unknown id → landing');
  const c = S.load(put({ view: 'country', countryId: 'CH' }), KEY, OPTS);
  assert.deepStrictEqual([c.view, c.countryId], ['country', 'CH']);
  assert.strictEqual(S.load(put({ view: 'country', countryId: 'CH' }), KEY, Object.assign({ countries: ['DE'] }, OPTS)).countryId, null);
  const st = mem(); S.save(st, KEY, { view: 'country', step: 0, answers: {}, skipped: {}, countryId: 'PT' });
  assert.strictEqual(S.load(st, KEY, OPTS).countryId, 'PT');
  assert.strictEqual(S.load(put({ view: 'wizard', step: MAX }), KEY, OPTS).step, MAX);
});

test('sanitize records "No investors yet" when no capital is secured; skips are dropped', () => {
  assert.deepStrictEqual(S.sanitize({ capital: 'none', investors: ['US'] }, Q, C), { capital: 'none', investors: ['none'] });
  assert.deepStrictEqual(S.sanitize({ capital: 'none' }, Q, C), { capital: 'none', investors: ['none'] });
  assert.deepStrictEqual(S.sanitize({ capital: 'lt10', investors: ['US'] }, Q, C), { capital: 'lt10', investors: ['US'] });
  const st = S.fromObject({ view: 'wizard', step: 8, answers: { capital: 'none' }, skipped: { investors: true } }, OPTS);
  assert.deepStrictEqual(st.skipped, {});
  assert.deepStrictEqual(st.answers.investors, ['none']);
  const link = '#r=' + S.encodeShare({ capital: 'none', investors: ['US'] }).split('#r=').pop();
  assert.deepStrictEqual(S.readShare(link, Q, C).investors, ['none']);
});
