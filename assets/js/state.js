/*
 * FoundersNavigator – persisted state helpers (load/save/share-link parsing/sanitising).
 * Pure functions, testable in Node: storage, hash, question list and criteria are passed in.
 * Anything malformed (garbage JSON, wrong types, out-of-range step, unknown view, bad base64)
 * degrades to a clean default instead of throwing.
 */
(function (root) {
  'use strict';

  var VIEWS = ['landing', 'wizard', 'results', 'method', 'about', 'country'];
  // Views that are never restored on reload (the method page is reached from a fresh page).
  var NO_RESTORE = { method: 'landing' };
  var COUNTRY_IDS = ['DE', 'CH', 'LI', 'UK', 'US', 'PT'];

  function isPlainObject(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x) && Object.prototype.toString.call(x) === '[object Object]';
  }

  function defaultState() { return { view: 'landing', step: 0, answers: {}, skipped: {}, countryId: null }; }

  /* Keep only known questions with known option values, and priorities 0–3 for known criteria. */
  function sanitize(a, questions, criteria) {
    var out = {};
    if (!isPlainObject(a)) return out;
    (questions || []).forEach(function (q) {
      var v = a[q.id], vals = q.options.map(function (o) { return o.v; });
      if (q.type === 'multi' && Array.isArray(v)) {
        var f = [];
        v.forEach(function (x) { if (vals.indexOf(x) !== -1 && f.indexOf(x) === -1) f.push(x); });
        // an exclusive option (e.g. "No investors yet") cannot be combined with others
        var excl = q.options.filter(function (o) { return o.exclusive && f.indexOf(o.v) !== -1; })[0];
        if (excl && f.length > 1) f = f.filter(function (x) { return x !== excl.v; });
        if (f.length) out[q.id] = f;
      } else if (q.type === 'single' && typeof v === 'string' && vals.indexOf(v) !== -1) out[q.id] = v;
    });
    // a question that is not asked for these answers (showIf false) takes its auto value,
    // e.g. capital 'Nothing yet' → investors 'No investors yet', whatever was stored
    (questions || []).forEach(function (q) {
      if (typeof q.showIf === 'function' && Array.isArray(q.autoValue) && !q.showIf(out)) out[q.id] = q.autoValue.slice();
    });
    if (isPlainObject(a.priorities)) {
      out.priorities = {};
      (criteria || []).forEach(function (c) { var l = a.priorities[c.id]; if (l === 0 || l === 1 || l === 2 || l === 3) out.priorities[c.id] = l; });
    }
    return out;
  }

  function sanitizeSkipped(s, questions) {
    var out = {};
    if (!isPlainObject(s)) return out;
    (questions || []).forEach(function (q) { if (s[q.id] === true) out[q.id] = true; });
    return out;
  }

  /* opts: { questions, criteria, maxStep, views? } → always returns a complete, valid state. */
  function fromObject(s, opts) {
    var st = defaultState();
    if (!isPlainObject(s)) return st;
    opts = opts || {};
    var views = opts.views || VIEWS;
    var maxStep = typeof opts.maxStep === 'number' && opts.maxStep >= 0 ? Math.floor(opts.maxStep) : 0;
    st.answers = sanitize(s.answers, opts.questions, opts.criteria);
    st.skipped = sanitizeSkipped(s.skipped, opts.questions);
    // an auto-filled (not asked) question cannot be skipped
    (opts.questions || []).forEach(function (q) { if (st.skipped[q.id] && typeof q.showIf === 'function' && !q.showIf(st.answers)) delete st.skipped[q.id]; });
    var step = typeof s.step === 'number' && isFinite(s.step) ? Math.floor(s.step) : 0;
    st.step = Math.max(0, Math.min(maxStep, step));
    st.view = typeof s.view === 'string' && views.indexOf(s.view) !== -1 ? s.view : 'landing';
    if (NO_RESTORE[st.view]) st.view = NO_RESTORE[st.view];
    // country profile: keep only a known country id; without one the page cannot be shown
    var ids = opts.countries || COUNTRY_IDS;
    st.countryId = typeof s.countryId === 'string' && ids.indexOf(s.countryId) !== -1 ? s.countryId : null;
    if (st.view === 'country' && !st.countryId) st.view = 'landing';
    return st;
  }

  function load(storage, key, opts) {
    var raw = null;
    try { raw = storage ? storage.getItem(key) : null; } catch (e) { raw = null; }
    if (!raw) return defaultState();
    var s;
    try { s = JSON.parse(raw); } catch (e) { return defaultState(); }
    return fromObject(s, opts);
  }

  function save(storage, key, state) {
    if (!storage || !state) return false;
    try {
      storage.setItem(key, JSON.stringify({ view: state.view, step: state.step, answers: state.answers, skipped: state.skipped, countryId: state.countryId || null }));
      return true;
    } catch (e) { return false; /* storage unavailable or full */ }
  }

  function b64encode(str) {
    var b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64decode(s) {
    var b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(b)));
    return Buffer.from(b, 'base64').toString('utf8');
  }

  function encodeShare(answers) { return b64encode(JSON.stringify({ v: 1, a: answers })); }

  /* hash like '#r=<base64url>' → sanitised answers, or null for anything malformed. */
  function readShare(hash, questions, criteria) {
    if (typeof hash !== 'string') return null;
    var m = hash.match(/^#r=([A-Za-z0-9_-]+)$/) || hash.match(/^#r=([A-Za-z0-9_-]+)(?:[&?].*)?$/);
    if (!m) return null;
    try {
      var obj = JSON.parse(b64decode(m[1]));
      if (isPlainObject(obj) && isPlainObject(obj.a)) return sanitize(obj.a, questions, criteria);
    } catch (e) { /* invalid link */ }
    return null;
  }

  var api = {
    VIEWS: VIEWS, defaultState: defaultState, sanitize: sanitize, sanitizeSkipped: sanitizeSkipped,
    fromObject: fromObject, load: load, save: save, encodeShare: encodeShare, readShare: readShare
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_STATE = api;
})(this);
