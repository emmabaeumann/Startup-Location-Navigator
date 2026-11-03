/* FoundersNavigator – shared UI helpers and module registry (vanilla JS, no build step) · Material 3
 *
 * Module layout (all loaded as plain <script>s, in this order):
 *   ui.js       helpers (pure HTML builders) + registries   → window.SSN_UI
 *   i18n.js     t(), language switch, DE dictionary          → SSN_UI.t / SSN_UI.i18n
 *   results.js  results view, detail dialog, results actions → SSN_UI.views.results, SSN_UI.actions.*
 *   pages.js    method / about / country-profile pages       → SSN_UI.views.method|about|country
 *   app.js      state, navigation, wizard, landing, events, boot. Sets SSN_UI.app (the shared context)
 *
 * View modules never hold state; they read it at render time from SSN_UI.app:
 *   app.state, app.evaluate(), app.render(), app.go(view, opts), app.save(), app.announce(msg),
 *   app.flash(sel), app.snackbar(msg, opts), app.prioRows(withHint), app.answerLabel(q),
 *   app.closeDialog(), app.dialog, app.STEPS, app.Q, app.root (the #app element)
 * Views:   SSN_UI.views[name] = function () { return html; }   (state.view === name)
 * Actions: SSN_UI.actions[name] = function (el, event) { … }  (click on [data-action=name])
 */
(function (root) {
  'use strict';
  var D = root.SSN_DATA;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function t(s, vars) {
    if (UI.i18n && UI.i18n.t) return UI.i18n.t(s, vars);
    return vars ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }) : s;
  }
  function country(id) { return D.COUNTRIES.filter(function (c) { return c.id === id; })[0]; }
  function crit(id) { return D.CRITERIA.filter(function (c) { return c.id === id; })[0]; }
  function src(id) { return D.SOURCES[id]; }
  /* Material Symbols Rounded (ligature font). Every name used must be in the icon_names list in index.html. */
  function icon(name, cls) { return '<span class="msr' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + name + '</span>'; }
  function srcLink(id, label) {
    var s = src(id); if (!s) return '';
    return '<a class="srclink" href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + icon('open_in_new') + esc(label || s.p) + '<span class="sr-only"> (' + esc(t('opens in a new tab')) + ')</span></a>';
  }
  var CRIT_ICONS = { setup: 'rocket_launch', corpTax: 'percent', exitTax: 'sell', vc: 'trending_up', grants: 'savings', rnd: 'science', talent: 'hub', esop: 'groups', cost: 'shopping_cart', labor: 'payments', market: 'storefront', residence: 'home_pin' };
  function critIcon(id) { return icon(CRIT_ICONS[id] || 'radio_button_checked'); }
  /* Round country flag (assets/flags/*.svg, copied from the flag-icons package, 1x1 set). Decorative:
   * the country name is always given as visible or sr-only text next to it. Unknown codes fall back to letters. */
  var FLAGS = { DE: 'de', CH: 'ch', LI: 'li', UK: 'gb', US: 'us', PT: 'pt' };
  function avatar(code, lead, cls) {
    var f = FLAGS[code], c = 'avatar' + (f ? ' avatar--flag' : '') + (lead ? ' avatar--lead' : '') + (cls ? ' ' + cls : '');
    if (!f) return '<span class="' + c + '">' + esc(code) + '</span>';
    return '<span class="' + c + '" aria-hidden="true"><img src="assets/flags/' + f + '.svg" alt="" width="36" height="36"></span>';
  }
  function dots(v) {
    var out = '<span class="dots" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) out += '<i class="' + (v >= i ? 'on' : (v >= i - 0.5 ? 'half' : '')) + '"></i>';
    return out + '</span>';
  }
  function wdots(w) {
    var lvl = w.value === 0 ? 0 : Math.min(w.level, 3);
    var out = '<span class="wdots" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) out += '<i class="' + (lvl >= i ? 'on' : '') + '"></i>';
    if (w.bonus) out += '<b class="wplus">+</b>';
    return out + '</span>';
  }
  function details(summary, body, open) { return '<details class="details"' + (open ? ' open' : '') + '><summary>' + icon('expand_more') + esc(summary) + '</summary><div class="details__body">' + body + '</div></details>'; }
  function de() { return !!(UI.i18n && UI.i18n.lang && UI.i18n.lang() === 'de'); }
  /* € amounts follow the UI language: "€32,150" (EN) / "32.150 €" (DE) */
  function eur(n) { var v = Math.round(n); return de() ? v.toLocaleString('de-DE') + ' €' : '€' + v.toLocaleString('en-GB'); }
  /* € range in the UI language: "€115–400" (EN) / "115–400 €" (DE); equal ends → one amount */
  function eurRange(min, max) {
    if (min && typeof min === 'object') { max = min.max; min = min.min; }
    var a = Math.round(min), b = Math.round(max);
    if (a === b) return eur(a);
    return de() ? a.toLocaleString('de-DE') + '–' + b.toLocaleString('de-DE') + ' €' : '€' + a.toLocaleString('en-GB') + '–' + b.toLocaleString('en-GB');
  }
  /* translated list: ids of countries render as (translated) names, other strings are translated */
  function listText(arr) {
    var n = arr.map(function (x) { var c = country(x); return t(c ? c.name : x); });
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' ' + t('and') + ' ' + n[n.length - 1] : (n[0] || '');
  }
  /* engine answer effect → text in the UI language (uses effectParts templates when present) */
  function effectText(ef) {
    if (!ef) return '';
    if (!ef.effectParts) return t(ef.effect);
    return ef.effectParts.map(function (p) {
      var v = {};
      Object.keys(p.v).forEach(function (k) { v[k] = Array.isArray(p.v[k]) ? listText(p.v[k]) : p.v[k]; });
      return t(p.k, v);
    }).join(' ').replace(/;$/, '.');
  }

  /* M3 expressive shapes: polar "rounded polygon" (cookie, clover, burst); viewBox 0 0 200 200 */
  function shapePath(lobes, amp, rot) {
    var d = '', N = 180;
    for (var i = 0; i <= N; i++) {
      var a = i / N * Math.PI * 2;
      var r = 96 * (1 + amp * Math.cos(lobes * (a + (rot || 0)))) / (1 + amp);
      d += (i ? 'L' : 'M') + (100 + r * Math.cos(a)).toFixed(1) + ' ' + (100 + r * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  function shapeSvg(cls, path) { return '<svg class="bg-shape ' + cls + '" viewBox="0 0 200 200"><path d="' + path + '"/></svg>'; }
  var PILL = function (cls) { return '<svg class="bg-shape ' + cls + '" viewBox="0 0 200 80"><rect x="2" y="2" width="196" height="76" rx="38"/></svg>'; };
  var ARCH = function (cls) { return '<svg class="bg-shape ' + cls + '" viewBox="0 0 200 200"><path d="M10 200V100a90 90 0 0 1 180 0v100z"/></svg>'; };
  function pageBg(variant) {
    var parts = {
      wizard: shapeSvg('pg-clover', shapePath(4, .32, Math.PI / 4)) + shapeSvg('pg-cookie pg-cookie--soft', shapePath(12, .07)) + PILL('pg-pill'),
      results: shapeSvg('pg-cookie', shapePath(12, .07)) + shapeSvg('pg-burst', shapePath(8, .14)) + ARCH('pg-arch') +
        shapeSvg('pg-clover pg-clover--low', shapePath(4, .32, Math.PI / 4)) + PILL('pg-pill pg-pill--low') + shapeSvg('pg-cookie pg-cookie--low', shapePath(12, .07)),
      method: ARCH('pg-arch pg-arch--method') + shapeSvg('pg-burst pg-burst--method', shapePath(8, .14)) + shapeSvg('pg-clover pg-clover--method', shapePath(4, .32, Math.PI / 4)) +
        PILL('pg-pill pg-pill--method') + shapeSvg('pg-cookie pg-cookie--method', shapePath(12, .07))
    }[variant] || '';
    return '<div class="page-bg page-bg--' + variant + '" aria-hidden="true"><div class="bg-grid"></div>' + parts + '</div>';
  }

  var UI = root.SSN_UI = {
    esc: esc, t: t, country: country, crit: crit, src: src, srcLink: srcLink, icon: icon, CRIT_ICONS: CRIT_ICONS,
    critIcon: critIcon, avatar: avatar, dots: dots, wdots: wdots, details: details, eur: eur, eurRange: eurRange, effectText: effectText, listText: listText,
    shapePath: shapePath, shapeSvg: shapeSvg, pageBg: pageBg,
    views: {}, actions: {}, app: null, i18n: null
  };
})(this);
