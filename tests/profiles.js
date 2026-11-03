// Shared seeded profile generator for the property tests and tests/simulate.js (not a test file).
const E = require('../assets/js/engine.js');
const D = require('../assets/js/data.js');

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function randomProfile(rnd, opts = {}) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  const a = {};
  E.QUESTIONS.forEach(q => {
    if (rnd() < (opts.skip ?? 0.15)) return;
    const vals = q.options.map(o => o.v);
    if (q.type === 'single') a[q.id] = pick(vals);
    else {
      let s = vals.filter(() => rnd() < 0.3);
      if (q.id === 'investors' && s.includes('none')) s = ['none'];
      if (!s.length) s = [pick(vals)];
      a[q.id] = s;
    }
  });
  if (rnd() < (opts.prio ?? 0.8)) {
    a.priorities = {};
    D.CRITERIA.forEach(c => { if (rnd() < 0.7) a.priorities[c.id] = Math.floor(rnd() * 4); });
  }
  return a;
}

const PERSONAS = {
  'DE student SaaS VC (lives DE, Europe)': { citizenship: ['eu'], residence: 'DE', relocation: 'europe', sector: 'software', market: 'dach', funding: ['vc', 'grants'], capital: 'none', investors: ['none'], exit: 'sale', esop: 'key' },
  'DE student SaaS VC (anywhere)': { citizenship: ['eu'], residence: 'DE', relocation: 'anywhere', sector: 'software', market: 'global', funding: ['vc'], capital: 'lt10', investors: ['none'], exit: 'sale', esop: 'all' },
  'US citizen deeptech in US': { citizenship: ['us'], residence: 'US', relocation: 'anywhere', sector: 'ai', market: 'us', funding: ['vc', 'grants'], capital: '100to1m', investors: ['US'], exit: 'ipo', esop: 'all' },
  'PT bootstrapper (lives PT)': { citizenship: ['eu'], residence: 'PT', relocation: 'europe', sector: 'consumer', market: 'home', funding: ['bootstrap'], capital: 'lt10', investors: ['none'], exit: 'hold', esop: 'no' },
  'PT bootstrapper, cost+tax crucial, anywhere': { citizenship: ['eu'], residence: 'PT', relocation: 'anywhere', sector: 'software', market: 'eu', funding: ['bootstrap'], capital: 'lt10', exit: 'hold', esop: 'no', priorities: { cost: 3, corpTax: 3 } },
  'Non-EU elsewhere, residence crucial, anywhere': { citizenship: ['other'], residence: 'elsewhere', relocation: 'anywhere', sector: 'software', market: 'global', funding: ['accelerator', 'angels'], capital: 'lt10', investors: ['none'], exit: 'undecided', esop: 'key', priorities: { residence: 3 } },
  'LI fintech (LI citizen, lives LI)': { citizenship: ['li'], residence: 'LI', relocation: 'europe', sector: 'fintech', market: 'dach', funding: ['angels'], capital: '25to100', investors: ['CHLI'], exit: 'hold', esop: 'key' },
  'Swiss fintech living in CH, CH investors, EU market': { citizenship: ['ch'], residence: 'CH', relocation: 'europe', sector: 'fintech', market: 'eu', funding: ['vc'], capital: '100to1m', investors: ['CHLI'], exit: 'hold', esop: 'key' },
  'UK citizen in UK, hardware, EU market': { citizenship: ['uk'], residence: 'UK', relocation: 'europe', sector: 'hardware', market: 'eu', funding: ['grants'], capital: '25to100', exit: 'sale', esop: 'key' },
  'EU (DE) climate, grants crucial, anywhere': { citizenship: ['eu'], residence: 'DE', relocation: 'anywhere', sector: 'climate', market: 'eu', funding: ['grants'], priorities: { grants: 3, cost: 2 } },
  'Nothing answered': {}
};

module.exports = { rng, randomProfile, PERSONAS };
