const test = require('node:test');
const assert = require('node:assert');
const D = require('../assets/js/data.js');
const E = require('../assets/js/engine.js');
const S = require('../assets/js/state.js');
const X = require('../assets/js/examples.js');

test('landing examples: valid answers (survive sanitize unchanged), unique ids, a winner each', () => {
  assert.ok(X.length >= 3 && X.length <= 4);
  assert.strictEqual(new Set(X.map(x => x.id)).size, X.length);
  for (const x of X) {
    assert.ok(x.label && x.icon);
    assert.deepStrictEqual(S.sanitize(x.answers, E.QUESTIONS, D.CRITERIA), x.answers, x.id);
    const r = E.evaluate(x.answers);
    assert.ok(r.top, x.id + ' has a winner');
    console.log('  ' + x.label + ' → ' + r.top.id + ' ' + r.top.score + ' (' + r.verdict + ')');
  }
});
