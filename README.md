# FoundersNavigator – where to found your startup

An interactive, evidence-based decision helper for founders asking: **in which of six countries – Germany, Switzerland, Liechtenstein, the United Kingdom, the United States or Portugal – should I found my startup?**

Built for the TUM seminar *Smart Start – Financial, Tax, and Legal Fundamentals for Entrepreneurs* (topic T18).

## What it does
- Click-only questionnaire (10 questions + priorities on 10 criteria). Every question can be skipped; several citizenships can be selected.
- Live ranking that updates with every click and explains why a country moved.
- Result: the most advantageous location, a robustness check, reasons, trade-offs, warnings, a 6×9 comparison matrix with a source behind every cell, a what-if priority panel and a founding roadmap.
- Fully deterministic: there is no AI at run time, so the same answers always give the same result.
- Runs entirely in the browser with no backend. Answers are stored in `localStorage`; results can be shared as a link (the answers are encoded in the URL hash).

## Run it
Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy on GitHub Pages
Settings → Pages → *Deploy from a branch* → choose the branch and `/ (root)`.

## Project structure
| File | Purpose |
|---|---|
| `assets/js/data.js` | Evidence base: scores, facts, sources, roadmaps (update here) |
| `assets/js/engine.js` | Questions and the deterministic scoring model |
| `assets/js/app.js` | UI, navigation, persistence, share links |
| `assets/css/styles.css` | Design tokens (TUM blue, dark blue, Smart Start pink) and layout |
| `tests/engine.test.js` | Unit tests (`node --test tests/engine.test.js`) |

## Method (short)
`Fit = 100 × Σ w·(s−1)/4 ÷ Σ w` – 100 means the top score on every factor the founder weights. The scores `s` (1–5) come from fixed anchor scales applied to legal and statistical facts; missing data is set to the neutral 3. *Residence & home base* is scored from citizenship(s) and current home. The weights `w` come from the founder's priorities plus documented answer rules. A robustness check shifts each weight by ±1 level. The full method, the literature and all sources are listed on the in-app *Method & sources* page.

## Maintaining the data
All facts live in `assets/js/data.js`, and each cell carries its sources and a confidence level. When a law or statistic changes, update the cell's `score`, `value`, `note` and `sources`, then bump `DATA_AS_OF`. Research cut-off for this version: **31 October 2026**.

*Not legal or tax advice.*
