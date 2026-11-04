# FoundersNavigator – where to found your startup

An interactive, evidence-based decision helper for founders asking: **in which of six countries – Germany, Switzerland, Liechtenstein, the United Kingdom, the United States or Portugal – should I found my startup, and how?**

Built for the TUM seminar *Smart Start – Financial, Tax, and Legal Fundamentals for Entrepreneurs* (topic T18). Deterministic · sourced · reproducible: no AI at run time, so the same answers always give the same result, and every score links to its source.

## What it answers (T18)
| Seminar question | Where the tool answers it |
|---|---|
| Legal forms: setup requirements, liability, taxation | Results → *Legal forms & founding vs Germany*; country profiles (all forms, capital, liability, notary, profit tax) |
| Founding process vs Germany: bureaucracy, speed, cost | Same card (days, € cost, notary, steps vs the German GmbH) and *First-year cost* |
| Ecosystems, funding, investor networks | Criteria *VC access*, *Public funding & grants*, *R&D incentives*, *Talent & ecosystem* |
| Tax and legal differences: stock options, exit tax, capital gains | Criteria *Exit tax*, *Employee stock options*, *Profit tax*; tax facts on each country profile |
| Recommendation and concrete next steps | Ranking with robustness and confidence, *Why X over Y*, *What could flip it*, founding roadmap per country |

## Features
- **11 click-only questions + priorities on 12 criteria.** Every question can be skipped, several citizenships can be selected, and a "why we ask" line explains each one.
- **Live ranking** that re-scores all six countries with every click and says why a country moved.
- **Result:** winner with match score, tie / close-call / robust verdict, confidence, *Why X over Y*, why / trade-offs / watch-out, legal forms vs Germany, first-year cost (incl. payroll for planned hires), a 6 × 12 evidence matrix (tap a cell for the source), a what-if priority panel and a founding roadmap.
- **Example founders** on the landing page – one click to a full, realistic result.
- **Method & sources page** with the formula, every rule, tie-break, robustness and confidence definitions, limitations, peer-reviewed literature, the course reading list and all 149 sources. **Country profiles** and an **About** page.
- Material Design 3 (light / dark / system theme), keyboard and screen-reader accessible, English and German UI, print-to-PDF layout, share link.
- Runs entirely in the browser – no backend, nothing is sent anywhere. Answers stay in `localStorage`; a share link encodes them in the URL hash.

## Run it
Open `index.html` in a modern browser, or serve the folder (no build step):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Test it
```bash
npm test            # unit tests (node --test, Node ≥ 20) – engine, audit cases, state, examples
npm run simulate    # 3,000 random founder profiles: win shares, ties, robustness sanity checks
```
GitHub Actions runs the tests on Node 20 and 22 (`.github/workflows/test.yml`).

## Deploy on GitHub Pages
Settings → Pages → *Deploy from a branch* → choose the branch and `/ (root)`. Bump the `?v=` query strings in `index.html` after changes so browsers fetch the new assets.

## Project structure
| File | Purpose |
|---|---|
| `assets/js/facts.js` | Extended evidence: legal forms, first-year costs, tax facts, extra criteria, course reading |
| `assets/js/data.js` | Evidence base: criteria and anchors, scores per country, sources, roadmaps (merges `facts.js`) |
| `assets/js/engine.js` | Questions and the deterministic scoring model (weights, adjustments, ranking, tie-break, robustness, confidence, costs) |
| `assets/js/state.js` | Saving, loading and validating answers; share links |
| `assets/js/ui.js` | Shared HTML helpers and the view/action registry |
| `assets/js/i18n.js` | Language switch and German dictionary (keyed by the English text) |
| `assets/js/app.js` | Navigation, landing page, questionnaire, live ranking, snackbar, theme, events |
| `assets/js/results.js` | Results view and the evidence dialog |
| `assets/js/pages.js` | Method, About and country-profile pages |
| `assets/js/examples.js` | Example founder profiles |
| `assets/css/styles.css` → `results.css` → `pages.css` → `global.css` | M3 tokens and components → view styles → decor, motion, responsive and print (load order matters) |
| `tests/` | Unit tests, personas and the simulation |

## Method (short)
`Match score = 100 × Σ w·(s−1)/4 ÷ Σ w` – 100 means the top score on every criterion the founder weights.
- **Scores `s` (1–5)** come from fixed anchor scales applied to legal and statistical facts; missing data is the neutral 3 and labelled. *Residence & local roots* is scored from citizenship(s) and current home: living there gives 5, or 3 when no passport gives free movement there (founding then depends on the permit, e.g. a student permit allows employment only).
- **Weights `w`** come from the founder's priorities (0–3) plus documented answer rules (+1, capped at 4).
- **Ties:** totals less than 0.5 points apart are shown as a tie; equal totals are ordered by the stronger home base, then the founder's most important criteria.
- **Robustness:** every priority is shifted by one level; "robust" means no single change flips the winner and the lead is at least 4 points.
- **Confidence:** the share of the score that rests on estimates or missing data (high < 15 %, medium < 35 %).

The full method, the literature and all sources are on the in-app *Method & sources* page.

## Maintaining the data
All facts live in `assets/js/data.js` and `assets/js/facts.js`; each cell carries its sources and a confidence level. When a law or statistic changes, update the cell's `score`, `value`, `note` and `sources`, then bump `DATA_AS_OF`. Data as of: **3 November 2026**.

*Orientation, not legal or tax advice.*
