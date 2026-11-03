/* FoundersNavigator – one-click example founders for the landing page (and the live demo).
 * Answers use the option values of SSN_ENGINE.QUESTIONS; tests/examples.test.js checks they are valid.
 * desc   = one-line profile summary under the label
 * label  = shown on the chip and in the results banner (passed through t() at render time)
 * icon   = Material Symbols name (must be in index.html icon_names)
 */
(function (root) {
  'use strict';
  var EXAMPLES = [
    { id: 'tum-saas', icon: 'school', label: 'TUM student, SaaS, wants VC', desc: 'EU citizen in Munich, German angel, 1–2 hires',
      answers: { citizenship: ['eu'], residence: 'DE', relocation: 'europe', sector: 'software', market: 'dach',
        funding: ['vc', 'grants'], capital: 'lt10', investors: ['DE'], exit: 'sale', esop: 'key', hires: '1to2' } },
    { id: 'noneu-deeptech', icon: 'public', label: 'Non-EU deeptech founder', desc: 'AI startup, open to move anywhere, needs a visa',
      answers: { citizenship: ['other'], residence: 'elsewhere', relocation: 'anywhere', sector: 'ai', market: 'global',
        funding: ['accelerator', 'vc'], capital: 'lt10', investors: ['none'], exit: 'ipo', esop: 'all', hires: '3to5',
        priorities: { residence: 3 } } },
    { id: 'pt-bootstrap', icon: 'savings', label: 'Portuguese bootstrapper', desc: 'Consumer app, own money, keeps the company',
      answers: { citizenship: ['eu'], residence: 'PT', relocation: 'europe', sector: 'consumer', market: 'home',
        funding: ['bootstrap'], capital: 'lt10', investors: ['none'], exit: 'hold', esop: 'no', hires: '0' } },
    { id: 'ch-fintech', icon: 'account_balance', label: 'Swiss fintech', desc: 'Lives in Zurich, Swiss investors, EU customers',
      answers: { citizenship: ['ch'], residence: 'CH', relocation: 'europe', sector: 'fintech', market: 'eu',
        funding: ['vc'], capital: '100to1m', investors: ['CHLI'], exit: 'hold', esop: 'key', hires: '3to5' } }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = EXAMPLES;
  else root.SSN_EXAMPLES = EXAMPLES;
})(this);
