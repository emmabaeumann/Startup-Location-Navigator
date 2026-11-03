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
  /* Long evidence note → sentences. Splits on ". " before a capital, but not after abbreviations
   * (e.g., z. B., i. d. F., Art., Nov.) or German ordinals ("2. Nov.", "ab 1. Mai"). Works on EN and DE text. */
  var ABBR = /(?:^|[\s(])(?:e\.g|i\.e|vs|ca|bzw|inkl|zzgl|ggf|bspw|sog|gem|Nr|Abs|Art|art|para|sec|Dr|St|No|Rev|Proc|approx|incl|Mio|Mrd|Jan|Feb|Mär|Apr|Jun|Jul|Aug|Sep|Sept|Okt|Oct|Nov|Dez|Dec)\.$/;
  var ORD_NEXT = /^(?:Jan|Feb|März|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez|Mal\b)/;
  function sentences(s) {
    var out = [], buf = '', parts = String(s || '').trim().split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9€£$„"(≈§])/);
    parts.forEach(function (p, i) {
      buf = buf ? buf + ' ' + p : p;
      var ordinal = /(?:^|[\s(])\d{1,2}\.$/.test(buf) && ORD_NEXT.test(parts[i + 1] || '');
      var open = (buf.match(/\(/g) || []).length > (buf.match(/\)/g) || []).length;
      if (open || ABBR.test(buf) || /(?:^|[\s(])[A-Za-zÄÖÜäöü]\.$/.test(buf) || ordinal) return;
      out.push(buf); buf = '';
    });
    if (buf) out.push(buf);
    return out;
  }
  /* sentence → HTML; a short leading label ("Tax:", "Employer shares 2026:") is set in bold so the list scans */
  function sentenceHtml(s) {
    var m = /^([^:.;()]{2,40}):\s+(\S[\s\S]*)$/.exec(s);
    return m && m[1].split(/\s+/).length <= 5 ? '<b>' + esc(m[1]) + ':</b> ' + esc(m[2]) : esc(s);
  }
  /* note text (already translated) → readable blocks: one sentence stays a paragraph, more become a bullet list */
  function noteBlocks(text, cls) {
    var ss = sentences(text);
    if (!ss.length) return '';
    if (ss.length === 1) return '<p class="nb' + (cls ? ' ' + cls : '') + '">' + sentenceHtml(ss[0]) + '</p>';
    return '<ul class="nb nb--list' + (cls ? ' ' + cls : '') + '">' + ss.map(function (s) { return '<li>' + sentenceHtml(s) + '</li>'; }).join('') + '</ul>';
  }
  /* Anchor text → { caption, levels: [{ n, text }], numeric, note } or null (caller shows the raw text).
   *   'Effective tax on €100,000 of profit: 5 ≤ 13% · 4 ≤ 18% · …'  → caption + numeric levels
   *   '5 = online, no notary … · 3 = … · 1 = …'                     → qualitative levels (gaps allowed)
   * A trailing sentence after the last level ('… Agreement). Adjusted by your target market.') becomes `note`.
   * Works on the German translations too (same structure). */
  function parseAnchors(s) {
    var m = /(^|:\s+)([1-5])(?=\s)/.exec(s || '');
    if (!m) return null;
    var start = m.index + m[1].length, caption = s.slice(0, start).replace(/:\s*$/, '').trim();
    var levels = [], ok = true, prev = 6;
    s.slice(start).split(/\s+·\s+/).forEach(function (seg) {
      var p = /^([1-5])(\s*=\s*|\s+)(\S[\s\S]*)$/.exec(seg.trim());
      if (!p || +p[1] >= prev) { ok = false; return; }
      prev = +p[1];
      levels.push({ n: prev, text: p[3].trim(), eq: p[2].indexOf('=') >= 0 });
    });
    if (!ok || levels.length < 2) return null;
    var numeric = levels.every(function (l) { return !l.eq; }), note = '';
    if (!numeric) {
      var last = levels[levels.length - 1], q = /^([\s\S]*?\S{2}\.)\s+([A-ZÄÖÜ][^.]*\.)$/.exec(last.text);
      if (q) { last.text = q[1].replace(/\.$/, ''); note = q[2]; }
    }
    return { caption: caption, levels: levels, numeric: numeric, note: note };
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
    sentences: sentences, noteBlocks: noteBlocks, parseAnchors: parseAnchors,
    shapePath: shapePath, shapeSvg: shapeSvg, pageBg: pageBg,
    views: {}, actions: {}, app: null, i18n: null
  };
})(this);
