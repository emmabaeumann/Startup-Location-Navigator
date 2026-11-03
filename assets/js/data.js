/*
 * FoundersNavigator – evidence base
 * ------------------------------------------------
 * Every country score (1–5) is derived from the documented facts in `value`/`note`
 * and the cited `sources`. Scores follow the anchor scales in CRITERIA[].anchors.
 * Research cut-off: 3 November 2026 (evidence review: E-2 list, Eurostat 2024 price
 * levels, 2025 VC totals, complete 1–5 anchors for grants/ecosystem/ESOP). Update this
 * file to refresh the tool.
 */
(function (root) {
  'use strict';

  var DATA_AS_OF = '2026-11-03';

  var COUNTRIES = [
    { id: 'DE', name: 'Germany', hub: 'Berlin · Munich', entity: 'GmbH or UG (haftungsbeschränkt)' },
    { id: 'CH', name: 'Switzerland', hub: 'Zurich · Zug · Lausanne', entity: 'GmbH or AG' },
    { id: 'LI', name: 'Liechtenstein', hub: 'Vaduz', entity: 'GmbH or AG' },
    { id: 'UK', name: 'United Kingdom', hub: 'London', entity: 'Private limited company (Ltd)' },
    { id: 'US', name: 'United States', hub: 'Bay Area · New York', entity: 'Delaware C-Corporation' },
    { id: 'PT', name: 'Portugal', hub: 'Lisbon · Porto', entity: 'Sociedade por quotas (Lda)' }
  ];

  /* Criteria and the anchor scales used to translate facts into 1–5 scores. */
  var CRITERIA = [
    { id: 'setup', name: 'Fast, simple company setup', short: 'Easy setup',
      hint: 'Time, fees, notary, minimum capital',
      info: 'How quickly and cheaply you can register the company: online vs. notary, official fees, and how much share capital must be paid in before registration.',
      anchors: '5 = online, no notary, ≈€0 minimum capital, fees ≤ €400 · 3 = notary or partial capital required · 1 = several mandatory intermediaries and high paid-in capital' },
    { id: 'corpTax', name: 'Low tax on company profits', short: 'Low profit tax',
      hint: 'Total profit tax on €100k of company profit',
      info: 'How much of its profit the company pays in tax. To compare like with like, we use the effective tax on €100,000 of profit, including national, regional and municipal taxes.',
      anchors: 'Effective tax on €100,000 of profit: 5 ≤ 13% · 4 ≤ 18% · 3 ≤ 26% · 2 ≤ 32% · 1 > 32%' },
    { id: 'exitTax', name: 'Low tax when you sell your shares', short: 'Low exit tax',
      hint: 'Founder capital gains on an exit',
      info: 'The tax you personally pay when you sell your shares in an exit. Standard case: a founder holding the shares directly as a private person (no holding structure).',
      anchors: 'Top effective rate on a founder’s share sale (individual, standard case): 5 ≈ 0% · 4 ≤ 15% · 3 ≤ 24% · 2 ≤ 30% · 1 > 30%' },
    { id: 'vc', name: 'Easy access to venture capital', short: 'VC access',
      hint: 'Size of the local VC market',
      info: 'How much venture capital is invested in the country each year – a proxy for how many investors you can meet locally.',
      anchors: 'Annual VC invested (2025): 5 > $100bn · 4 $15–100bn · 3 $3–15bn · 2 $0.5–3bn · 1 < $0.5bn' },
    { id: 'grants', name: 'Generous public funding & grants', short: 'Grants',
      hint: 'Non-dilutive start-up programmes',
      info: 'Government money you do not have to pay back and that costs no equity, e.g. founder stipends, innovation grants or investor tax reliefs.',
      anchors: '5 = several national non-dilutive programmes open to most new founders, including direct cash to founders (stipend or grant) · 4 = at least one broad national programme, but competitive project grants or indirect support (investor tax relief) only · 3 = programmes exist but narrow (age, region, sector, call deadlines) or restricted for foreign-owned companies · 2 = only general SME support, no start-up-specific programme · 1 = no national programme identified' },
    { id: 'talent', name: 'Strong talent pool & startup ecosystem', short: 'Ecosystem',
      hint: 'Innovation capacity, start-up hubs',
      info: 'How strong the innovation system and start-up hubs are: universities, skilled people, founders and mentors around you. Based on the WIPO Global Innovation Index and Startup Genome rankings.',
      anchors: 'WIPO GII 2025 rank and Startup Genome hub rankings: 5 = a global top-3 hub · 4 = a top-10 European hub or GII top-15 · 3 = a ranked or emerging hub outside Europe’s top 10, or GII 16–35 · 2 = no ranked hub and GII rank below 35 · 1 = no ranked hub and not ranked in the GII' },
    { id: 'esop', name: 'Founder-friendly employee stock options', short: 'ESOP rules',
      hint: 'Tax treatment of employee equity',
      info: 'How employee stock options are taxed. Friendly rules let employees pay tax only when they sell – making equity a stronger hiring tool.',
      anchors: '5 = statutory tax-advantaged scheme widely used by start-ups: no income tax at grant or exercise, the gain is taxed only on sale at capital-gains rates · 4 = statutory scheme that taxes only on sale (or at reduced rates), but with material limits (eligibility, holding periods, annual caps, AMT or exit-from-residence triggers) · 3 = deferral regime: the benefit is still taxed as employment income, but later than exercise, under conditions · 2 = no start-up regime: options taxed as employment income at exercise (later growth may be tax-free) · 1 = taxed at grant or vesting before any liquidity (dry tax charge)' },
    { id: 'cost', name: 'Low cost of living', short: 'Low living cost',
      hint: 'Price level for people and salaries',
      info: 'How expensive everyday life is, which also drives salary levels and your burn rate. Measured as the national household price level.',
      anchors: 'Household price level, EU27 = 100: 5 ≤ 95 · 4 ≤ 115 · 3 ≤ 135 · 2 ≤ 160 · 1 > 160' },
    { id: 'market', name: 'Easy access to your target market', short: 'Market access',
      hint: 'Single market, customers, regulation',
      info: 'How easy it is to sell to your first customers from this country: single market, customs, regulation. Depends on the market you selected.',
      anchors: 'Base: 4 = full access to a large single market (EU/EEA single market or the US) · 3 = national market with only partial or treaty-based access to a large market (e.g. Swiss bilaterals, UK–EU Trade and Cooperation Agreement). Adjusted by your target market.' },
    { id: 'residence', name: 'Easy residence & local roots', short: 'Residence',
      hint: 'Your right to live there, your local roots',
      info: 'Can you live and work there, and do you already have roots there? Founders do better where they have local networks (Dahl & Sorenson 2012). Calculated from your citizenship(s) and where you live.',
      anchors: '5 = you already live there · 4 = your passport country or free movement for your passport · 3 = not yet known · 2 = visa or permit needed · 1 = residence quota-limited or very hard to get' }
  ];

  /* S = score table. Each cell: score, value (one-line fact), note, sources, confidence. */
  var SCORES = {
    DE: {
      setup: { score: 3, value: 'Notary required (online since 2022) · GmbH €25k (≥ €12.5k paid in) or UG from €1',
        note: 'Formation must be notarised (§2 GmbHG); since 1 Aug 2022 this can be done by video (DiRUG). Minimum share capital is €25,000 with at least €12,500 paid in before registration (§§5, 7 GmbHG); a UG (haftungsbeschränkt) can start with €1 (§5a GmbHG). With the statutory model protocol, the register should decide within 5 working days.',
        sources: ['gmbhg', 'ihk_online', 'dirug'], confidence: 'high' },
      corpTax: { score: 2, value: '≈ 29.9% on €100k profit (15.8% CIT + trade tax) · CIT falls to 10% by 2032',
        note: 'Corporate income tax 15% + 5.5% solidarity surcharge plus municipal trade tax; OECD combined rate 29.9% (2025), ≈33% in Munich. The 2025 investment programme cuts CIT by 1 pp a year from 2028 to 10% in 2032.',
        sources: ['oecd_cit', 'taxfound_cit', 'de_invest'], confidence: 'high' },
      exitTax: { score: 2, value: '≈ 28.5% held privately (§17 EStG) · tip: ≈ 1.5% via a holding GmbH',
        note: 'A founder holding ≥ 1% is taxed under §17 EStG with the partial-income method: 60% of the gain at the personal rate (top 45% + soli) → ≈ 28.5%. Holding the shares through a holding GmbH reduces this to ≈ 1.5% (95% exemption, §8b KStG) – a common structure.',
        sources: ['estg17', 'kstg8b'], confidence: 'high' },
      vc: { score: 3, value: '€7.2–8.4bn (≈ $8.1–9.5bn) VC invested in 2025',
        note: 'Two trackers for 2025: EY Startup-Barometer €8.4bn (+19% on 2024); KfW Research on Dealroom data €7.2bn (roughly flat). At the ECB 2025 average of 1.13 USD/EUR this is ≈ $8.1–9.5bn – both inside the $3–15bn band (score 3).',
        sources: ['ey_sb26', 'kfw_vc', 'ecb_fx'], confidence: 'high' },
      grants: { score: 5, value: 'EXIST stipend (up to €3,000/month per founder) plus federal and Länder programmes',
        note: 'Anchor 5: several national non-dilutive programmes including direct cash to founders. EXIST start-up grant: monthly stipend up to €3,000 (PhD) per founder, up to €10k (solo) / €30k (team) material costs plus €5k coaching, for university-linked teams. Further federal and Länder programmes exist. (High-Tech Gründerfonds is seed equity, i.e. dilutive, and is not counted here.)',
        sources: ['exist'], confidence: 'high' },
      talent: { score: 4, value: 'GII 2025 rank 11 · Berlin #3 in Europe (Startup Genome 2026)',
        note: 'Anchor 4 (top-10 European hub / GII top-15). Germany ranks 11th in the WIPO Global Innovation Index 2025. Berlin is Europe’s #3 ecosystem in Startup Genome’s GSER 2026; Munich was #7 in Europe in GSER 2025. No German hub is in the global top 3.',
        sources: ['gii_de', 'gser26_eu', 'gser25_eu'], confidence: 'high' },
      esop: { score: 3, value: 'Deferred taxation under §19a EStG (still in force 2026)',
        note: 'Anchor 3 (deferral regime). Under §19a EStG (extended by the Future Financing Act from 1 Jan 2024) the benefit from discounted or free employee equity in qualifying start-ups/SMEs is still wage income, but the tax is usually deferred until sale (other triggers: 15 years, certain employer changes); €2,000 annual allowance (§3 No. 39). Practitioners in 2026 still call the scope too narrow (company age ≤ 20 years, size thresholds). It is not a sale-only capital-gains scheme, hence not 4–5.',
        sources: ['estg19a', 'orrick_19a', 'index_rt'], confidence: 'medium' },
      cost: { score: 4, value: 'Price level 108.6 (EU27 = 100, 2024)',
        note: 'Eurostat price level index for household final consumption expenditure (prc_ppp_ind, E011), 2024: 108.6. Anchor 4 (≤ 115). 2024 is the latest year in the dataset as of 3 Nov 2026.',
        sources: ['eurostat_hfce'], confidence: 'high' },
      market: { score: 4, value: 'EU single market (27 countries)', note: 'Full access to the EU single market and customs union.',
        sources: ['eu_sm'], confidence: 'high' }
    },
    CH: {
      setup: { score: 2, value: 'Public deed by notary · GmbH CHF 20,000 fully paid in · ≈ CHF 2–4.5k costs',
        note: 'GmbH minimum capital CHF 20,000, fully paid in at formation (Art. 773 OR). Formation must be by public deed before a notary, as for the AG (federal SME portal); only later share transfers no longer need notarisation. Then commercial-register entry. Advisers estimate CHF 2,000–4,500 in notary and register fees. Free model articles on EasyGov.',
        sources: ['kmu_gmbh', 'postfinance_gmbh'], confidence: 'high' },
      corpTax: { score: 4, value: '≈ 14.4% on €100k profit (Swiss average) · Zug 11.85% · Zurich 19.61%',
        note: 'KPMG Swiss Tax Report 2025: average combined profit tax 14.4%; lowest Zug 11.85%, Zurich 19.61%. The canton you choose matters.',
        sources: ['kpmg_ch'], confidence: 'high' },
      exitTax: { score: 5, value: 'Private capital gains tax-free (Art. 16 para. 3 DBG) · annual wealth tax on shares',
        note: 'Gains on privately held shares are tax-exempt for Swiss residents. Main exceptions: indirect partial liquidation (Art. 20a DBG, e.g. selling ≥ 20% to a corporate buyer who uses company reserves), professional trading. Annual cantonal wealth tax applies to the shares.',
        sources: ['dbg16', 'ch_itl'], confidence: 'high' },
      vc: { score: 3, value: 'CHF 2.95bn (≈ $3.6bn) VC invested in 2025',
        note: 'Swiss Venture Capital Report 2026 (SECA/startupticker): CHF 2.95bn across 354 rounds in 2025 (+24%); EY counts CHF 3.3bn. ≈ $3.6bn at ECB 2025 average rates – score 3 ($3–15bn). High per capita.',
        sources: ['seca_vc26', 'ecb_fx'], confidence: 'high' },
      grants: { score: 4, value: 'Innosuisse start-up innovation projects (up to 70% of costs)',
        note: 'Anchor 4: a broad national programme, but competitive project funding rather than direct founder stipends. Innosuisse funds science-based projects of start-ups < 5 years old and < 50 FTE, covering up to 70% of direct project costs; applications on a rolling basis. Cantonal programmes add to this.',
        sources: ['innosuisse'], confidence: 'high' },
      talent: { score: 4, value: 'GII 2025 rank 1 (15th year) · Zurich #6 in Europe (GSER 2025)',
        note: 'Anchor 4 (GII top-15 / top-10 European hub). Switzerland tops the WIPO GII for the 15th consecutive year. Zurich ranked 6th in Europe in GSER 2025; Greater Lausanne is #10 among emerging ecosystems in 2026. No global top-3 hub; small labour market.',
        sources: ['gii_res', 'gser25_eu', 'gser26_emerging'], confidence: 'high' },
      esop: { score: 2, value: 'Options usually taxed as income at exercise (ESTV Circular 37)',
        note: 'Anchor 2 (taxed as employment income at exercise, no start-up regime). Non-tradable options (typical for start-ups) are taxed at exercise on the spread; private-company shares are valued by formula; blocked shares get a 6%/year discount. Later growth is a tax-free private capital gain. Some cantons (e.g. Geneva) have friendlier practices.',
        sources: ['ch_ks37'], confidence: 'medium' },
      cost: { score: 1, value: 'Price level 174 (EU27 = 100, 2024) – highest in Europe',
        note: 'Eurostat price level index for household final consumption expenditure (prc_ppp_ind, E011), 2024: 174.4 – the highest of the countries covered. Anchor 1 (> 160). (The broader "actual individual consumption" index is 184.)',
        sources: ['eurostat_hfce'], confidence: 'high' },
      market: { score: 3, value: 'Bilateral agreements with the EU (no full single market)',
        note: 'Access to the EU market via sectoral bilateral agreements; free movement of persons with the EU/EFTA.',
        sources: ['ch_bilaterals'], confidence: 'medium' }
    },
    LI: {
      setup: { score: 2, value: 'GmbH CHF 10,000 fully paid in (AG CHF 50,000) · trade licence with a qualified managing director',
        note: 'Liechtenstein GmbH: minimum capital CHF 10,000 (or EUR/USD 10,000), fully paid in at formation (Commercial Register factsheet); an AG needs CHF 50,000 (Art. 122 PGR). An operating start-up needs a trade licence (Gewerbebewilligung) from the Office of Economic Affairs: it must appoint a managing director (Geschäftsführer) who is an EEA/Swiss national (or has 12 years’ residence), speaks German, is actually active at a local business premises and, for regulated trades, is professionally qualified (Art. 8, 12 GewG). The Art. 180a PGR duty to have a locally licensed qualified board member mainly targets non-trading companies; it does not apply where a trade-law managing director is required.',
        sources: ['li_gmbh', 'li_gewg', 'li_ag_cap', 'li_180a', 'li_180a_ex'], confidence: 'medium' },
      corpTax: { score: 5, value: '12.5% on €100k profit (flat) · CHF 1,800 minimum tax',
        note: 'Flat 12.5% corporate income tax; annual minimum tax CHF 1,800, credited against the actual tax (small-company exemptions exist).',
        sources: ['li_tax', 'pwc_li'], confidence: 'high' },
      exitTax: { score: 5, value: 'Capital gains on shares not taxable · 4% notional return on wealth taxed yearly',
        note: 'Private capital gains are not part of taxable income; instead a notional return of 4% on net wealth (Sollertrag) is taxed as income each year.',
        sources: ['li_steg', 'gt_li'], confidence: 'medium' },
      vc: { score: 1, value: 'No meaningful domestic VC market (no recorded rounds in 2024–2025)',
        note: 'Score kept at 1 with a citation (not nodata): tech.eu’s funding tracker records only a handful of Liechtenstein rounds ever (€200m in 2022, mostly one €190m deal; €1.8m in 2023) and none in 2024–2025 – far below the $0.5bn threshold. Dealroom’s country totals are paywalled. Founders typically raise from Swiss, Austrian or international investors.',
        sources: ['techeu_li'], confidence: 'medium' },
      grants: { score: 3, nodata: true, value: 'No data: no national programme comparable to EXIST or Innosuisse identified',
        note: 'Our research found no dedicated national start-up grant programme of comparable scale. Because absence of evidence is not evidence of absence, the score is set to the neutral midpoint (3).',
        sources: [], confidence: 'low' },
      talent: { score: 1, value: 'Not ranked in GII or Startup Genome · ≈ 40k inhabitants',
        note: 'Anchor 1 (no ranked hub, not in the GII 2025). Very small labour market; many employees commute from Switzerland and Austria. Strength in finance and blockchain (Token and VT Service Provider Act).',
        sources: ['gii_res'], confidence: 'medium' },
      esop: { score: 2, value: 'Options taxed as employment income at exercise; later gain tax-free',
        note: 'Anchor 2 (same pattern as Switzerland). Liechtenstein has no start-up option regime: unlisted, blocked employee options are taxed at exercise on the spread (market value minus strike) as income under the Erwerbssteuer; the shares then count towards the 4% notional wealth return, and the gain on a later sale is a tax-free private capital gain. Based on a Grant Thornton practitioner article (2022), not an official circular.',
        sources: ['gt_li_mbp', 'li_steg'], confidence: 'medium' },
      cost: { score: 1, value: 'Assumed Swiss-like price level (no Eurostat index for Liechtenstein)',
        note: 'Assumption, not a measurement: Eurostat publishes no price level index for Liechtenstein. Liechtenstein uses the Swiss franc and forms a customs union with Switzerland, so we use Switzerland’s 2024 household price level (174.4, EU27 = 100) as a proxy → score 1.',
        sources: ['eurostat_hfce'], confidence: 'low' },
      market: { score: 4, value: 'EEA single market + customs union with Switzerland',
        note: 'Anchor 4 – same basis as Germany and Portugal: as an EEA member Liechtenstein has full single-market access (free movement of goods, services, capital and persons). It is not in the EU customs union but in a customs union with Switzerland, so goods exports to the EU need origin/customs formalities. Tiny home market.',
        sources: ['eu_sm'], confidence: 'high' }
    },
    UK: {
      setup: { score: 5, value: 'Online incorporation, £100 fee (since Feb 2026), no minimum capital',
        note: 'Private limited companies are registered online with Companies House; the digital incorporation fee rose from £50 to £100 on 1 Feb 2026. No minimum share capital, no notary.',
        sources: ['ch_fees'], confidence: 'high' },
      corpTax: { score: 3, value: '≈ 22.0% on €100k (≈ £83.6k) profit (19% / 25% with marginal relief)',
        note: 'Corporation tax: 19% up to £50,000, 25% above £250,000, marginal relief in between. €100,000 = £83,580 at the ECB reference rate of 0.8358 GBP/EUR (2 Nov 2026). Tax: 25% × £83,580 − 3/200 × (£250,000 − £83,580) = £20,895 − £2,496 = £18,399, i.e. ≈ 22.0% → score 3 (≤ 26%).',
        sources: ['uk_ct', 'taxfound_cit', 'ecb_fx'], confidence: 'high' },
      exitTax: { score: 3, value: '18% with Business Asset Disposal Relief (≤ £1m lifetime) · 24% above',
        note: 'From 6 April 2026 qualifying gains under Business Asset Disposal Relief are taxed at 18% (14% in 2025/26, 10% before) up to a £1m lifetime limit; other gains at 24% for higher-rate taxpayers. BADR generally requires ≥ 5% of the shares and being an employee or director for 2 years. Both rates fall in the ≤ 24% band (score 3).',
        sources: ['hmrc_badr', 'uk_cgt_rates'], confidence: 'high' },
      vc: { score: 4, value: '≈ $23.6bn VC invested in 2025 – Europe’s largest',
        note: 'Dealroom/HSBC: UK start-ups raised $23.6bn in 2025, more than Germany, France and Switzerland combined. Crunchbase reports a lower ≈ $17bn – both fall in the $15–100bn band (score 4).',
        sources: ['dealroom_uk25'], confidence: 'medium' },
      grants: { score: 4, value: 'SEIS/EIS investor tax reliefs · Innovate UK',
        note: 'Anchor 4: broad national schemes, but indirect (investor tax relief) or competitive project grants – no founder stipend. SEIS: companies can raise up to £250,000; investors get 50% income-tax relief on up to £200,000 a year. EIS for later rounds; Innovate UK competitive grants.',
        sources: ['seis'], confidence: 'high' },
      talent: { score: 5, value: 'GII 2025 rank 6 · London #3 globally, #1 in Europe (2026)',
        note: 'Anchor 5 (global top-3 hub). UK ranks 6th in the GII 2025. London is #1 in Europe and #3 worldwide in Startup Genome’s GSER 2026.',
        sources: ['gii_res', 'gser26_eu', 'gser26_global'], confidence: 'high' },
      esop: { score: 5, value: 'EMI options: tax-advantaged, company limit £6m (from Apr 2026)',
        note: 'Anchor 5: statutory scheme with no income tax at grant or exercise (if the strike is at least market value at grant); the gain is taxed only on sale as a capital gain (BADR may apply). Up to £250,000 per employee; for options granted from 6 April 2026 the company limit rose from £3m to £6m, gross assets from £30m to £120m, employees from 250 to 500 and the exercise period from 10 to 15 years. Index Ventures rates EMI among Europe’s best.',
        sources: ['emi_2026', 'index_rt'], confidence: 'high' },
      cost: { score: 3, value: 'Price level 124.7 (EU27 = 100, 2024) · London premium',
        note: 'Eurostat price level index for household final consumption expenditure (prc_ppp_ind, E011), 2024: 124.7 (Eurostat still publishes the UK in this dataset). Anchor 3 (≤ 135). London is markedly more expensive.',
        sources: ['eurostat_hfce'], confidence: 'high' },
      market: { score: 3, value: 'National market of ≈ 69m; outside the EU single market',
        note: 'Since Brexit, trade with the EU runs under the Trade and Cooperation Agreement without single-market access.',
        sources: ['eu_sm'], confidence: 'high' }
    },
    US: {
      setup: { score: 4, value: 'Online Delaware filing, no minimum capital · EIN/banking slower for non-residents',
        note: 'A Delaware C-Corp is filed online with no minimum capital; you need a registered agent and an EIN. Delaware House Bill 400 (signed 21 May 2026) raised many Division of Corporations filing and service fees from 1 Aug 2026 – check the official fee schedule. Non-US founders often face slower EIN and banking set-up.',
        sources: ['de_corp_fees', 'de_hb400'], confidence: 'medium' },
      corpTax: { score: 3, value: '≈ 25.6% on €100k profit (21% federal + state average)',
        note: 'Federal corporate tax 21% plus state tax where the company operates; OECD combined average 25.6%.',
        sources: ['taxfound_cit', 'oecd_cit'], confidence: 'high' },
      exitTax: { score: 3, value: '≈ 23.8% standard case · QSBS can reduce it to 0% (US taxpayers, after 5 years)',
        note: 'Scored on the standard case per the anchor: long-term capital gains 20% top rate plus 3.8% net investment income tax = 23.8% → score 3 (≤ 24%). Section 1202 QSBS is shown as a note, not scored: it only helps US taxpayers holding original-issue C-Corp stock (issued after 4 Jul 2025: 50% excluded after 3 years, 75% after 4, 100% after 5, capped at $15m per issuer). Non-US-resident founders are generally taxed on the sale in their home country. State income tax (e.g. up to 13.3% in California) is not included.',
        sources: ['qsbs_obbba'], confidence: 'medium' },
      vc: { score: 5, value: '≈ $339bn VC invested in 2025',
        note: 'PitchBook-NVCA: US start-ups raised $339.4bn across 16,709 deals in 2025 (NVCA Yearbook: ≈ $320bn).',
        sources: ['pitchbook_25', 'nvca_yb'], confidence: 'high' },
      grants: { score: 3, value: 'SBIR/STTR – requires > 50% US-citizen or green-card ownership',
        note: 'Anchor 3 (restricted for foreign-owned companies). SBIR/STTR is the largest early-stage grant programme, but the company must be more than 50% owned by US citizens or permanent residents. The programmes lapsed on 30 Sep 2025 and were reauthorised on 13 Apr 2026 through 2031, with tighter foreign-affiliation screening.',
        sources: ['sbir', 'sbir_reauth'], confidence: 'high' },
      talent: { score: 5, value: 'GII 2025 rank 3 · Silicon Valley #1 & New York #2 globally',
        note: 'Anchor 5 (global top-3 hub). The US ranks 3rd in the GII 2025; Silicon Valley and New York top Startup Genome’s 2026 global ranking.',
        sources: ['gii_res', 'gser26_global'], confidence: 'high' },
      esop: { score: 4, value: 'ISOs: no regular tax at exercise, capital-gains rates on a qualifying sale – with limits',
        note: 'Anchor 4: incentive stock options (ISOs) are a statutory scheme – no regular income tax at grant or exercise, and the gain is taxed at long-term capital-gains rates if the shares are held > 2 years from grant and > 1 year from exercise. Material limits keep it below 5: the exercise spread counts for the alternative minimum tax (AMT), only $100,000 of options may first become exercisable per employee per year, and non-qualified options (NSOs, common for contractors and above the limit) are taxed as wages at exercise.',
        sources: ['irs_tc427', 'index_rt'], confidence: 'medium' },
      cost: { score: 2, value: 'Price level 138.7 (EU27 = 100, 2024) · hubs far higher',
        note: 'Eurostat price level index for household final consumption expenditure (prc_ppp_ind, E011), 2024: 138.7 for the US. Anchor 2 (≤ 160). Bay Area and New York are much higher.',
        sources: ['eurostat_hfce'], confidence: 'high' },
      market: { score: 4, value: 'Largest single national market (GDP ≈ $29tn)', note: 'Anchor 4: one large consumer and enterprise market under one federal customs and trade regime – the world’s largest economy by GDP (World Bank). Regulation, sales tax and licensing vary by state.',
        sources: ['wb_gdp'], confidence: 'medium' }
    },
    PT: {
      setup: { score: 5, value: '"Empresa na Hora": €360 all-in, €1 minimum per quota',
        note: 'One-stop formation ("Empresa na Hora") costs €360 including registration and publication. No minimum capital since 2011 – each quota at least €1.',
        sources: ['pt_lda', 'pt_enh'], confidence: 'high' },
      corpTax: { score: 3, value: '≈ 18.5% on €100k profit (15% on first €50k, 19% above, + up to 1.5% municipal)',
        note: 'IRC (art. 87 CIRC as amended by Lei 64/2025): 19% for 2026, scheduled 18% in 2027 and 17% from 2028; SMEs and small mid-caps pay 15% on the first €50,000. On €100,000: €7,500 + €9,500 = €17,000 = 17%. Municipalities may add a derrama of up to 1.5% of taxable profit (art. 18 Lei 73/2013; many charge the maximum in Lisbon/Porto) → ≈ 18.5%. That is just above the 18% ceiling of anchor 4, so the score is 3; without derrama (or in a municipality with a reduced rate) it would be 17% and score 4. The state surcharge (derrama estadual) only applies above €1.5m profit.',
        sources: ['pt_irc87', 'pt_irc26', 'pt_derrama'], confidence: 'high' },
      exitTax: { score: 4, value: '≈ 14%: 28% on 50% of the gain (unlisted micro/small companies)',
        note: 'Gains on shares are taxed at a flat 28% (art. 72 CIRS). For unlisted micro and small Portuguese companies, which covers most start-ups, only 50% of the gain is counted (art. 43 CIRS) → ≈ 14% effective. Larger companies: 28% (score 2). Conditions apply; verify with an adviser.',
        sources: ['pt_cirs43'], confidence: 'medium' },
      vc: { score: 2, value: '≈ €0.5bn (≈ $0.53bn) equity funding in 2025',
        note: 'tech.eu counted €473m in equity rounds for Portuguese start-ups in 2025 (€681m in 2024). At the ECB 2025 average of 1.13 USD/EUR this is ≈ $0.53bn – inside the $0.5–3bn band (score 2), though close to its lower edge; tracker coverage differs from the sources used for the other countries.',
        sources: ['techeu_pt25', 'techeu_pt', 'ecb_fx'], confidence: 'medium' },
      grants: { score: 3, value: 'Startup Voucher (COMPETE 2030), IAPMEI start-up vouchers (PRR), EU programmes',
        note: 'Anchor 3: real non-dilutive programmes exist but are narrow. Startup Voucher (IAPMEI, COMPETE 2030; Nov 2025 edition, €5m): €900/month for up to 9 months plus mentoring, only for founders up to 29 who are not working or studying, in the Norte, Centro and Alentejo regions. "Vouchers para Startups" (PRR, €65m 2nd call) for green and digital products, and "Vales" for incubators/accelerators – PRR funding ends in 2026. EU programmes (e.g. EIC Accelerator) are open in all EU/EEA countries. (The Startup Visa is a residence route, not a grant.)',
        sources: ['pt_voucher', 'pt_vouchers_prr'], confidence: 'medium' },
      talent: { score: 3, value: 'GII 2025 rank 31 · Porto among emerging ecosystems (2026)',
        note: 'Anchor 3 (emerging hub / GII 16–35). Portugal ranks 31st of 139 in the GII 2025; Porto appears in Startup Genome’s 2026 emerging-ecosystem ranking (#51–60).',
        sources: ['gii_pt', 'gser26_eu'], confidence: 'high' },
      esop: { score: 4, value: 'Start-up regime: taxed only on sale, 50% of the gain counted',
        note: 'Anchor 4. Art. 43-C EBF (Lei 21/2023): for options granted by qualifying start-ups, SMEs/small mid-caps or innovation-active companies, the gain is taxed only when the shares are sold – or earlier if the employee leaves Portuguese tax residence or gifts them – and only 50% of it is counted. Limits keep it below 5: eligibility conditions, a 1-year minimum holding period and the exit-from-residence trigger (a possible dry tax charge).',
        sources: ['pt_startuplaw'], confidence: 'medium' },
      cost: { score: 5, value: 'Price level 87.0 (EU27 = 100, 2024)',
        note: 'Eurostat price level index for household final consumption expenditure (prc_ppp_ind, E011), 2024: 87.0 – 13% below the EU average. Anchor 5 (≤ 95). Housing costs in Lisbon have risen sharply.',
        sources: ['eurostat_hfce', 'ine_pin'], confidence: 'high' },
      market: { score: 4, value: 'EU single market (27 countries)', note: 'Full access to the EU single market and customs union.',
        sources: ['eu_sm'], confidence: 'high' }
    }
  };

  /* Residence & work rights by citizenship → destination.
     level: 'home' | 'free' | 'visa' | 'limited' */
  var RESIDENCE = {
    eu: {
      DE: { level: 'free', text: 'EU free movement' },
      PT: { level: 'free', text: 'EU free movement' },
      CH: { level: 'free', text: 'Free movement under the EU–Swiss agreement; register with the canton' },
      LI: { level: 'limited', text: 'EEA nationals: residence permits are quota-limited (partly by lottery); commuting from CH/AT is the common route' },
      UK: { level: 'visa', text: 'Visa needed since Brexit – e.g. Innovator Founder (endorsement, no fixed investment minimum)' },
      US: { level: 'visa', text: 'Visa needed – E-2 treaty investor for most EU nationalities (incl. German, and Portuguese since 15 Mar 2024; not Cyprus, Hungary or Malta, Greece E-1 only), otherwise O-1 or others' }
    },
    ch: {
      CH: { level: 'citizen', text: 'Your passport country – full rights' },
      DE: { level: 'free', text: 'Free movement under the EU–Swiss agreement' },
      PT: { level: 'free', text: 'Free movement under the EU–Swiss agreement' },
      LI: { level: 'limited', text: 'Residence permits are quota-limited; commuting is common' },
      UK: { level: 'visa', text: 'Visa needed – e.g. Innovator Founder' },
      US: { level: 'visa', text: 'Visa needed – E-2 treaty investor is open to Swiss nationals (treaty of 1855)' }
    },
    li: {
      LI: { level: 'citizen', text: 'Your passport country – full rights' },
      DE: { level: 'free', text: 'EEA free movement' },
      PT: { level: 'free', text: 'EEA free movement' },
      CH: { level: 'free', text: 'Free movement under the EFTA Convention' },
      UK: { level: 'visa', text: 'Visa needed – e.g. Innovator Founder' },
      US: { level: 'visa', text: 'Visa needed – Liechtenstein is not on the E-1/E-2 treaty list; O-1 or others' }
    },
    uk: {
      UK: { level: 'citizen', text: 'Your passport country – full rights' },
      DE: { level: 'visa', text: 'Residence permit for self-employment needed (§21 AufenthG)' },
      PT: { level: 'visa', text: 'Visa needed – e.g. Startup Visa or D2 entrepreneur visa' },
      CH: { level: 'limited', text: 'Third-country quotas apply to UK nationals since 2021' },
      LI: { level: 'limited', text: 'Third-country rules; permits are scarce' },
      US: { level: 'visa', text: 'Visa needed – E-2 treaty investor is open to UK nationals' }
    },
    us: {
      US: { level: 'citizen', text: 'Your passport country – full rights' },
      DE: { level: 'visa', text: 'Residence permit for self-employment needed (§21 AufenthG)' },
      PT: { level: 'visa', text: 'Visa needed – e.g. Startup Visa or D2 entrepreneur visa' },
      UK: { level: 'visa', text: 'Visa needed – e.g. Innovator Founder' },
      CH: { level: 'limited', text: 'Third-country quotas apply' },
      LI: { level: 'limited', text: 'Third-country rules; permits are scarce' }
    },
    other: {
      DE: { level: 'visa', text: 'Residence permit for self-employment needed (§21 AufenthG)' },
      PT: { level: 'visa', text: 'Startup Visa via a certified incubator (IAPMEI) or D2 visa' },
      UK: { level: 'visa', text: 'Innovator Founder visa (endorsement required)' },
      US: { level: 'visa', text: 'Visa needed – E-2 only for treaty nationals; otherwise O-1 or others' },
      CH: { level: 'limited', text: 'Strict third-country quotas' },
      LI: { level: 'limited', text: 'Third-country rules; permits are scarce' }
    }
  };
  // EU citizens are "home" in Germany/Portugal only if they live there – handled in engine.

  var RESIDENCE_SOURCES = ['state_e2', 'e2_table', 'uk_if', 'li_quota', 'pt_sv'];

  /* Residence & home base is calculated from the profile; this base cell is used until citizenship/residence is known. */
  COUNTRIES.forEach(function (c) {
    SCORES[c.id].residence = { score: 3, value: 'Depends on your citizenship(s) and where you live',
      note: 'Scored from your answers: 5 if you already live here (home advantage), 4 if you hold its citizenship or have free movement for one of your passports, 2 if a visa or permit is needed, 1 if residence is quota-limited. Without answers it stays at the neutral 3.',
      sources: RESIDENCE_SOURCES.concat(['dahl_sorenson']), confidence: 'medium' };
  });

  /* Sector adjustments to the ecosystem score (documented, small). */
  /* Sector adjustments to the ecosystem score – only where a source supports them (whole steps only). */
  var SECTOR_ADJ = {
    fintech: { CH: 1, LI: 1, src: ['gfci', 'tvtg'], label: 'Fintech & crypto: Zurich ranks among the top-10 global financial centres (GFCI); Liechtenstein has a dedicated blockchain law (TVTG, in force since 1 Jan 2020). London and New York already score the maximum.' },
    life: { CH: 1, src: ['gser26_emerging'], label: 'Health & life sciences: the Lausanne (Biopôle) and Basel clusters – Greater Lausanne is #10 among Startup Genome’s 2026 emerging ecosystems.' },
    hardware: { DE: 1, CH: 1, src: ['wb_manuf'], label: 'Hardware, mobility & industrial: manufacturing is ≈ 19% of GDP in Germany and ≈ 18% in Switzerland, vs ≈ 8% in the UK and ≈ 12% in Portugal (World Bank, 2024).' }
  };

  /* How each sector is treated – shown on the results page so the effect (or non-effect) is transparent. */
  var SECTOR_NOTES = {
    software: { text: 'Software & SaaS is the least location-bound sector: you can sell remotely, so VC access, talent and your target market drive the difference – all already scored.', src: null },
    ai: { text: 'AI & deep tech: AI took more than 65% of all US venture funding in 2025, and the US and UK lead Stanford’s Global AI Vibrancy ranking. Both already hold the top ecosystem and VC scores here, so no extra bonus is needed; Germany ranks around 8th, consistent with its score of 4.', src: ['nvca_yb', 'stanford_ai'] },
    fintech: { text: 'Fintech & crypto: +1 on the ecosystem score for Switzerland (Zurich in the GFCI top 10) and Liechtenstein (blockchain law TVTG). London and New York already hold the top score.', src: ['gfci', 'tvtg'] },
    life: { text: 'Health & life sciences: +1 on the ecosystem score for Switzerland (Lausanne/Basel clusters).', src: ['gser26_emerging'] },
    hardware: { text: 'Hardware, mobility & industrial: +1 on the ecosystem score for Germany and Switzerland, where manufacturing is ≈ 19% and ≈ 18% of GDP.', src: ['wb_manuf'] },
    climate: { text: 'Climate & energy: we found no comparable country-level evidence for a sector bonus, so this choice does not change the scores. Grants and VC access tend to matter most – weight them accordingly.', src: null },
    consumer: { text: 'Consumer & marketplaces: success depends mostly on access to your target market and on costs, which are already scored – no sector bonus applied.', src: null },
    other: null
  };

  /* Practical roadmap per country (each step points to an official source). */
  var ROADMAP = {
    DE: [
      { t: 'Pick your legal form', d: 'GmbH (€25,000, at least €12,500 paid in) or UG from €1 – the UG must retain 25% of profits until it reaches €25,000.', src: 'gmbhg' },
      { t: 'Notarise the formation', d: 'In person or by video with a German notary; the model protocol is cheapest for up to 3 founders.', src: 'ihk_online' },
      { t: 'Open a business account & pay in capital', d: 'The register needs proof that the share capital was paid in.', src: 'dirug' },
      { t: 'Commercial register, trade office, tax office', d: 'Register entry via the notary, Gewerbeanmeldung, then the tax registration form on ELSTER.', src: 'existenz' },
      { t: 'Apply for non-dilutive funding', d: 'Check EXIST via your university’s start-up centre before you incorporate.', src: 'exist' },
      { t: 'Consider a holding GmbH before you raise', d: 'Holding your shares via your own GmbH can cut the tax on a later exit from ≈ 28.5% to ≈ 1.5% (§8b KStG). It adds set-up and running costs – decide early with a tax adviser.', src: 'kstg8b' }
    ],
    CH: [
      { t: 'Choose canton and legal form', d: 'GmbH (CHF 20,000 fully paid in) or AG – the canton drives your profit tax (Zug ≈ 11.9% vs Zurich ≈ 19.6%).', src: 'kpmg_ch' },
      { t: 'Open a capital deposit account', d: 'Deposit the full share capital; the bank confirms it for the notary.', src: 'kmu_gmbh' },
      { t: 'Public deed & commercial register', d: 'Notarise the articles (model articles on EasyGov) and file with the cantonal register.', src: 'kmu_gmbh' },
      { t: 'Register for VAT and social insurance', d: 'One online procedure via EasyGov.swiss.', src: 'kmu_gmbh' },
      { t: 'Apply to Innosuisse', d: 'Start-up innovation projects cover up to 70% of direct costs.', src: 'innosuisse' }
    ],
    LI: [
      { t: 'Clarify where you will live', d: 'Residence permits are quota-limited; many founders live in Switzerland or Austria and commute.', src: 'li_quota' },
      { t: 'Pay in CHF 10,000', d: 'The GmbH minimum capital must be fully paid in at formation.', src: 'li_gmbh' },
      { t: 'Appoint a qualified managing director', d: 'The trade licence requires a Geschäftsführer who is an EEA/Swiss national, speaks German and actually works at the local premises; regulated trades also need a professional qualification. (Art. 180a PGR board-member rules mainly concern non-trading companies.)', src: 'li_gewg' },
      { t: 'Register with the Office of Justice', d: 'File the formation documents with the Liechtenstein commercial register.', src: 'li_gmbh' },
      { t: 'Obtain the trade licence and register for tax', d: 'Gewerbebewilligung from the Office of Economic Affairs; minimum tax CHF 1,800 a year, credited against the 12.5% profit tax.', src: 'li_tax' }
    ],
    UK: [
      { t: 'Check your visa first', d: 'Non-UK founders typically use the Innovator Founder route (endorsing body, £1,000 endorsement fee).', src: 'uk_if' },
      { t: 'Incorporate online', d: 'Private limited company via Companies House – £100 digital fee, usually registered within 24 hours.', src: 'uk_ltd' },
      { t: 'Get SEIS advance assurance', d: 'Lets angels claim 50% income-tax relief; you can raise up to £250,000 under SEIS.', src: 'seis' },
      { t: 'Set up an EMI option plan', d: 'Tax-advantaged employee options; from April 2026 company limit £6m, gross assets £120m, up to 500 employees.', src: 'emi_2026' },
      { t: 'Register for Corporation Tax', d: 'Tell HMRC once you start trading.', src: 'uk_ct' }
    ],
    US: [
      { t: 'Sort out your visa', d: 'E-2 (treaty investor) is open to German, Swiss and UK nationals and – since 15 March 2024 – Portuguese nationals (3-year domicile rule if citizenship was acquired by investment); not to Liechtenstein nationals. Otherwise O-1 or others.', src: 'state_e2' },
      { t: 'Form a Delaware C-Corp', d: 'The standard for VC funding and required for QSBS; appoint a registered agent. Fees changed on 1 Aug 2026 (HB 400).', src: 'de_corp_fees' },
      { t: 'Get an EIN and bank account', d: 'Founders without an SSN apply to the IRS with form SS-4.', src: 'irs_ein' },
      { t: 'File 83(b) elections for founder stock', d: 'Within 30 days of the share issue – late filing cannot be fixed.', src: 'irs_83b' },
      { t: 'Plan for QSBS', d: 'Hold C-Corp stock 3–5 years to exclude 50–100% of gains (up to $15m).', src: 'qsbs_obbba' }
    ],
    PT: [
      { t: 'Check residence (non-EU founders)', d: 'Startup Visa via an IAPMEI-certified incubator, or the D2 entrepreneur visa.', src: 'pt_sv' },
      { t: 'Form an Lda in one day', d: '"Empresa na Hora": €360 all-in; capital from €1 per partner.', src: 'pt_enh' },
      { t: 'Get your NIF and register with Social Security', d: 'Tax number for the company and the founders.', src: 'pt_lda' },
      { t: 'Use the start-up regime', d: 'Startup Law (Lei 21/2023): deferred taxation of employee stock options.', src: 'pt_startuplaw' },
      { t: 'Check the 15% SME rate', d: 'IRC 15% on the first €50,000 of profit for SMEs in 2026.', src: 'pt_irc26' }
    ]
  };

  /* Sources (accessed 31 Oct – 3 Nov 2026). type: law | official | intl | report | academic | expert */
  var SOURCES = {
    gmbhg: { t: 'GmbH-Gesetz (§§2, 5, 5a, 7 GmbHG)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/gmbhg/', type: 'law' },
    dirug: { t: 'DiRUG – online formation of GmbH/UG since 1 Aug 2022 (BR-Drs. 171/22)', p: 'Deutscher Bundestag', u: 'https://dserver.bundestag.de/brd/2022/0171-22.pdf', type: 'law' },
    ihk_online: { t: 'Online-Gründung der GmbH', p: 'IHK Frankfurt am Main', u: 'https://www.frankfurt-main.ihk.de/recht/uebersicht-alle-rechtsthemen/gesellschaftsrecht2/uebersicht/online-gruendung-einer-gmbh-5608078', type: 'official' },
    existenz: { t: 'Existenzgründungsportal', p: 'Federal Ministry for Economic Affairs', u: 'https://www.existenzgruendungsportal.de', type: 'official' },
    estg17: { t: '§17 and §3 No. 40 EStG (partial-income method)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/estg/__17.html', type: 'law' },
    kstg8b: { t: '§8b KStG (participation exemption)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/kstg_1977/__8b.html', type: 'law' },
    estg19a: { t: '§19a EStG – employee equity in start-ups (Future Financing Act 2024)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/estg/__19a.html', type: 'law' },
    de_invest: { t: 'Steuerliches Investitionssofortprogramm (BGBl. 18 Jul 2025)', p: 'IHK München', u: 'https://www.ihk-muenchen.de/ratgeber/steuern/investitionsprogramm/', type: 'official' },
    astg6: { t: '§6 AStG – exit taxation on emigration', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/astg/__6.html', type: 'law' },
    ao10: { t: '§10 AO (place of management) & §1 KStG', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/ao_1977/__10.html', type: 'law' },
    exist: { t: 'EXIST-Gründungsstipendium', p: 'Projektträger Jülich / BMWE', u: 'https://www.ptj.de/foerdermoeglichkeiten/exist/gruendungsstipendium', type: 'official' },
    kfw_vc: { t: 'KfW Venture Capital Dashboard Q4 2025', p: 'KfW Research', u: 'https://www.kfw.de/PDF/Download-Center/Konzernthemen/Research/PDF-Dokumente-Dashboard/KfW-VC-Dashboard-Q4-2025_EN.pdf', type: 'report' },
    gii_de: { t: 'Germany in the Global Innovation Index 2025', p: 'WIPO', u: 'https://www.wipo.int/edocs/gii-ranking/2025/de.pdf', type: 'intl' },
    gii_pt: { t: 'Portugal in the Global Innovation Index 2025', p: 'WIPO', u: 'https://www.wipo.int/edocs/gii-ranking/2025/pt.pdf', type: 'intl' },
    gii_res: { t: 'Global Innovation Index 2025 – results', p: 'WIPO', u: 'https://www.wipo.int/web-publications/global-innovation-index-2025/en/gii-2025-results.html', type: 'intl' },
    gser26_eu: { t: 'Europe’s 2026 comeback (GSER 2026, Europe ranking)', p: 'Startup Genome', u: 'https://startupgenome.com/insights/europe-s-2026-comeback-funding-ai-defensetech-frontier', type: 'report' },
    gser26_global: { t: 'Global Startup Ecosystem Ranking 2026 – Top 40', p: 'Startup Genome', u: 'https://startupgenome.com/report/the-global-startup-ecosystem-report-2026/global-startup-ecosystem-ranking-2026-top-40', type: 'report' },
    gser26_emerging: { t: 'Greater Lausanne in GSER 2026 emerging ecosystems', p: 'Biopôle', u: 'https://www.biopole.ch/global-startup-ecosystem-report-2026/', type: 'report' },
    index_rt: { t: 'Rewarding Talent – stock options policy in Europe', p: 'Index Ventures', u: 'https://www.indexventures.com/rewardingtalent', type: 'report' },
    eurostat_pli: { t: 'Comparative price levels of consumer goods and services (2024)', p: 'Eurostat', u: 'https://ec.europa.eu/eurostat/statistics-explained/index.php/comparative_price_levels_of_consumer_goods_and_services', type: 'intl' },
    oecd_pl: { t: 'Comparative price levels (PPPs for GDP), via JILPT Databook', p: 'OECD / JILPT', u: 'https://www.jil.go.jp/kokunai/statistics/databook/2025/01/d2025_1T-16.pdf', type: 'intl' },
    ine_pin: { t: 'Península Ibérica em Números 2025 – price levels', p: 'INE Portugal', u: 'https://www.ine.pt/ine_novidades/PIN2025/42/', type: 'official' },
    eu_sm: { t: 'Your Europe – doing business in the single market', p: 'European Commission', u: 'https://europa.eu/youreurope/business/running-business/start-ups/starting-business/index_en.htm', type: 'official' },
    ch_bilaterals: { t: 'Switzerland–EU bilateral agreements', p: 'Swiss Federal Council (EDA)', u: 'https://www.eda.admin.ch/europa/en/home.html', type: 'official' },
    oecd_cit: { t: 'Corporate Tax Statistics 2025 / Corporate income tax rates database', p: 'OECD', u: 'https://www.oecd.org/en/data/datasets/corporate-income-tax-rates-database.html', type: 'intl' },
    taxfound_cit: { t: 'Corporate income tax rates in Europe 2025 (OECD data)', p: 'Tax Foundation', u: 'https://taxfoundation.org/data/all/eu/corporate-income-tax-rates-europe', type: 'report' },
    kmu_gmbh: { t: 'GmbH: Haftung, Stammkapital, Gründung', p: 'SECO KMU-Portal', u: 'https://www.kmu.admin.ch/de/gmbh-haftung-stammkapital-gruendung', type: 'official' },
    postfinance_gmbh: { t: 'GmbH gründen in der Schweiz', p: 'PostFinance', u: 'https://www.postfinance.ch/de/blog/business-blog/gmbh-gruenden-schweiz.html', type: 'expert' },
    kpmg_ch: { t: 'Swiss Tax Report 2025', p: 'KPMG Switzerland', u: 'https://kpmg.com/ch/en/media/press-releases/2025/05/clarity-swiss-taxes.html', type: 'report' },
    dbg16: { t: 'Art. 16 para. 3 and Art. 20a DBG (tax-free private capital gains; indirect partial liquidation)', p: 'Swiss Confederation (Fedlex)', u: 'https://www.fedlex.admin.ch/eli/cc/1991/1184_1184_1184/de', type: 'law' },
    ch_itl: { t: 'Indirekte Teilliquidation bei natürlichen Personen', p: 'WEKA', u: 'https://www.weka.ch/themen/finanzen-controlling/steuern/natuerliche-personen/article/indirekte-teilliquidation-das-verfahren-bei-natuerlichen-personen/', type: 'expert' },
    ch_ks37: { t: 'ESTV Circular No. 37 – employee participations (summary)', p: 'International Tax Review', u: 'https://www.internationaltaxreview.com/article/b1fbsx9hcr13cp/employee-participation-plans-new-swiss-rules-on-taxation-of-employee-participation-plans', type: 'expert' },
    innosuisse: { t: 'Start-up innovation projects', p: 'Innosuisse', u: 'https://www.innosuisse.admin.ch/en/start-up-innovation-projects', type: 'official' },
    li_gmbh: { t: 'Merkblatt zur GmbH', p: 'Amt für Justiz, Handelsregister Liechtenstein', u: 'https://www.llv.li/serviceportal2/amtsstellen/amt-fuer-justiz/handelsregister/merkblaetter/007_merkblatt_zur_gmbh.pdf', type: 'official' },
    li_180a: { t: 'Art. 180a PGR – qualified board members', p: 'FMA Liechtenstein', u: 'https://fma-li.li/fma-li/documents/rechtsgrundlagen/wegleitungen/fma-wl-2018-24-antrag-auf-erteilung-einer-bewilligung-zur-ausuebung-von-taetigkeiten-nach-art.-180a-pgr-durch-angestellte.pdf', type: 'official' },
    li_tax: { t: 'The corporate earnings tax', p: 'Liechtenstein Business (Government)', u: 'https://www.liechtenstein-business.li/en/Service-for-entrepreneurs/After-founding-the-company/Taxes-in-Liechtenstein-simple-fair-and-modern/The-corporate-earnings-tax', type: 'official' },
    pwc_li: { t: 'Liechtenstein – taxes on corporate income', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/liechtenstein/corporate/taxes-on-corporate-income', type: 'expert' },
    li_steg: { t: 'Steuergesetz (SteG), Sollertrag 4%', p: 'gesetze.li', u: 'https://gesetze.li/konso/pdf/2010340000', type: 'law' },
    gt_li: { t: 'Steuerstandort Liechtenstein – Factsheet', p: 'Grant Thornton', u: 'https://www.grantthornton.ch/globalassets/1.-member-firms/switzerland/insights/pdf/2020/202003/steuerstandort_liechtenstein_factsheet_de2.pdf', type: 'expert' },
    li_quota: { t: 'Aufenthalt in Liechtenstein (EEA permit quotas and lottery)', p: 'Liechtenstein-Institut', u: 'https://liechtenstein-institut.li/download_file/1223/728', type: 'academic' },
    gfci: { t: 'Global Financial Centres Index 38 (Sept 2025)', p: 'Z/Yen / Long Finance', u: 'https://www.longfinance.net/programmes/financial-centre-futures/global-financial-centres-index/press/press-release-global-financial-centres-index-38-leading-financial-centres-in-close-competition/', type: 'report' },
    tvtg: { t: 'Token and TT Service Provider Act (TVTG)', p: 'FMA Liechtenstein', u: 'https://www.fma-li.li/en/supervision-regulation/fintech/tvtg', type: 'law' },
    wb_manuf: { t: 'Manufacturing, value added (% of GDP), indicator NV.IND.MANF.ZS', p: 'World Bank (via TheGlobalEconomy)', u: 'https://www.theglobaleconomy.com/rankings/Share_of_manufacturing/', type: 'intl' },
    dahl_sorenson: { t: 'Dahl & Sorenson (2012): Home sweet home – entrepreneurs’ location choices and performance', p: 'Management Science 58(6)', u: 'https://doi.org/10.1287/mnsc.1110.1476', type: 'academic' },
    stanford_ai: { t: 'Global AI Vibrancy Tool (AI Index)', p: 'Stanford HAI', u: 'https://www.businesswire.com/news/home/20241121006002/en/United-States-China-and-United-Kingdom-Lead-the-Global-AI-Ranking-According-to-Stanford-HAIs-Global-AI-Vibrancy-Tool', type: 'academic' },
    irs_abroad: { t: 'U.S. citizens and resident aliens abroad', p: 'IRS', u: 'https://www.irs.gov/individuals/international-taxpayers/us-citizens-and-resident-aliens-abroad', type: 'official' },
    stripe_flip: { t: 'What is a Delaware flip?', p: 'Stripe', u: 'https://stripe.com/resources/more/what-is-a-delaware-flip', type: 'expert' },
    uk_ltd: { t: 'Set up a private limited company', p: 'GOV.UK', u: 'https://www.gov.uk/limited-company-formation', type: 'official' },
    uk_ct: { t: 'Corporation Tax', p: 'GOV.UK', u: 'https://www.gov.uk/corporation-tax', type: 'official' },
    irs_ein: { t: 'Apply for an Employer Identification Number (EIN)', p: 'IRS', u: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', type: 'official' },
    irs_83b: { t: 'About Form 15620, Section 83(b) Election', p: 'IRS', u: 'https://www.irs.gov/forms-pubs/about-form-15620', type: 'official' },
    ch_fees: { t: 'Companies House fees are changing from 1 February 2026', p: 'GOV.UK', u: 'https://www.gov.uk/government/news/companies-house-fees-are-changing-from-1-february-2026', type: 'official' },
    hmrc_badr: { t: 'CG63955 – Business Asset Disposal Relief: broad outline', p: 'HMRC', u: 'https://www.gov.uk/hmrc-internal-manuals/capital-gains-manual/cg63955', type: 'official' },
    dealroom_uk25: { t: 'UK VC investment rebounds in 2025 (Dealroom/HSBC Innovation Banking)', p: 'FF News / Dealroom', u: 'https://ffnews.com/newsarticle/uk-vc-investment-rebounds-in-2025-marking-first-annual-growth-in-four-years', type: 'report' },
    seis: { t: 'Increasing the limits of the Seed Enterprise Investment Scheme', p: 'HM Treasury / HMRC', u: 'https://www.gov.uk/government/publications/venture-capital-schemes-expansion-of-the-seed-enterprise-investment-scheme-seis/increasing-the-limits-of-the-seed-enterprise-investment-scheme', type: 'official' },
    emi_2026: { t: 'Expanding the eligibility limits of the EMI scheme', p: 'HM Treasury', u: 'https://www.gov.uk/government/publications/enterprise-management-incentive-scheme-increasing-the-limits/expanding-the-eligibility-limits-of-the-enterprise-management-incentive-scheme', type: 'official' },
    uk_if: { t: 'Innovator Founder visa', p: 'GOV.UK', u: 'https://www.gov.uk/innovator-founder-visa', type: 'official' },
    qsbs_obbba: { t: 'Section 1202 QSBS changes under the One Big Beautiful Bill Act', p: 'Gibson Dunn', u: 'https://www.gibsondunn.com/focus-on-qsbs-provisions-in-the-one-big-beautiful-bill-act/', type: 'expert' },
    pitchbook_25: { t: 'Q4 2025 PitchBook-NVCA Venture Monitor', p: 'PitchBook / NVCA', u: 'https://nvca.org/wp-content/uploads/2026/01/q4-2025-pitchbook-nvca-venture-monitor.pdf', type: 'report' },
    nvca_yb: { t: 'NVCA 2026 Yearbook', p: 'NVCA', u: 'https://nvca.org/wp-content/uploads/2026/04/NVCA-2026-Yearbook-4.9.26.pdf', type: 'report' },
    sbir: { t: 'SBIR eligibility (13 CFR 121.702)', p: 'SBIR.gov / U.S. SBA', u: 'https://www.sbir.gov/tutorials/program-basics/tutorial-2', type: 'official' },
    state_e2: { t: 'Treaty countries (E-1/E-2)', p: 'U.S. Department of State', u: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/treaty.html', type: 'official' },
    pt_lda: { t: 'Sociedade por quotas – constituição', p: 'gov.pt', u: 'https://www.gov.pt/servicos/sociedade-por-quotas-constituicao', type: 'official' },
    pt_enh: { t: 'Empresa na Hora – custos', p: 'Doutor Finanças', u: 'https://www.doutorfinancas.pt/carreira-e-negocios/empresa-na-hora-quanto-custa-e-onde-posso-fazer/', type: 'expert' },
    pt_irc26: { t: 'Lei do Orçamento do Estado 2026 – IRC', p: 'PwC Portugal', u: 'https://www.pwc.pt/pt/pwcinforfisco/orcamentoestado/irc.html', type: 'expert' },
    pt_cirs43: { t: 'Circular 7/2014 – art. 43 CIRS, micro and small companies', p: 'Autoridade Tributária', u: 'https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Circular_7_2014.pdf', type: 'official' },
    pt_startuplaw: { t: 'Art. 43-C EBF – stock options regime (Lei 21/2023)', p: 'Autoridade Tributária', u: 'https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/ra/Pages/ebf43c_ra202312.aspx', type: 'law' },
    pt_sv: { t: 'Startup Visa', p: 'Startup Portugal', u: 'https://startupportugal.com/?p=81', type: 'official' },
    techeu_pt: { t: 'Portugal start-up funding 2024 / H1 2025', p: 'tech.eu', u: 'https://funding.tech.eu/geographies/portugal/2024', type: 'report' },
    eurostat_hfce: { t: 'Price level indices, household final consumption expenditure (prc_ppp_ind, E011, EU27_2020 = 100), 2024', p: 'Eurostat', u: 'https://ec.europa.eu/eurostat/databrowser/view/prc_ppp_ind/default/table', type: 'official' },
    ecb_fx: { t: 'Euro foreign exchange reference rates (EXR: USD, GBP, CHF; 2025 averages and 2 Nov 2026)', p: 'European Central Bank', u: 'https://data.ecb.europa.eu/data/datasets/EXR', type: 'official' },
    ey_sb26: { t: 'EY Startup-Barometer Deutschland, January 2026 (2025: €8.4bn)', p: 'EY', u: 'https://www.ey.com/de_de/newsroom/2026/01/ey-startup-barometer-2026', type: 'report' },
    seca_vc26: { t: 'Swiss Venture Capital Report 2026 (2025: CHF 2.95bn)', p: 'SECA / startupticker.ch', u: 'https://www.seca.ch/media/dfom01dp/vcreport_2026_web.pdf', type: 'report' },
    techeu_pt25: { t: 'Portugal start-up funding 2025 (€473m equity)', p: 'tech.eu', u: 'https://funding.tech.eu/geographies/portugal/2025', type: 'report' },
    techeu_li: { t: 'Liechtenstein start-up funding by year (no rounds recorded 2024–2025)', p: 'tech.eu', u: 'https://funding.tech.eu/geographies/liechtenstein', type: 'report' },
    gser25_eu: { t: 'Europe slips, AI surges: GSER 2025 (European top 10 incl. Zurich #6, Munich #7)', p: 'Silicon Canals (on Startup Genome GSER 2025)', u: 'https://siliconcanals.com/europe-slips-ai-surges-gser-2025/', type: 'report' },
    orrick_19a: { t: 'Mitarbeiterbeteiligungen nach § 19a EStG (Sept 2026)', p: 'Orrick (Schultes-Schnitzlein / Engelings)', u: 'https://www.orrick.com/de-DE/Insights/2026/09/Equity-Grants-to-Employees-and-Section-19a-EStG-A-Strong-Legal-Framework-That-Deserves-a-Wider-Reach', type: 'expert' },
    gt_li_mbp: { t: 'Steuerliche Fallstricke bei Mitarbeiterbeteiligungen in Liechtenstein (Vaterland, 11 Feb 2022)', p: 'Grant Thornton AG (Reichert / Rupp)', u: 'https://www.grantthornton.ch/globalassets/1.-member-firms/switzerland/insights/pdf/2022/fallstricke-mbp-li-wr.pdf', type: 'expert' },
    li_gewg: { t: 'Gewerbegesetz (GewG, LGBl. 2006 Nr. 184), Art. 8 and 12', p: 'gesetze.li', u: 'https://www.gesetze.li/konso/pdf/2006184000', type: 'law' },
    li_ag_cap: { t: 'Path to incorporate a joint stock company in Liechtenstein (AG CHF 50,000, Art. 122 PGR)', p: 'Chambers and Partners', u: 'https://chambers.com/articles/path-to-incorporate-a-joint-stock-company-in-liechtenstein-process-breakdown', type: 'expert' },
    li_180a_ex: { t: 'The administrative bodies under Art. 180a PGR (scope and exemptions)', p: 'Chambers and Partners', u: 'https://chambers.com/articles/understanding-the-role-of-the-administrative-bodies-under-art-180a-pgr-in-liechtensteins-corporate', type: 'expert' },
    irs_tc427: { t: 'Topic no. 427, Stock options', p: 'IRS', u: 'https://www.irs.gov/taxtopics/tc427', type: 'official' },
    sbir_reauth: { t: 'SBIR/STTR programs revived with some notable changes (reauthorised 13 Apr 2026)', p: 'JD Supra', u: 'https://www.jdsupra.com/legalnews/sbir-sttr-programs-revived-with-some-5880107', type: 'expert' },
    wb_gdp: { t: 'GDP (current US$), indicator NY.GDP.MKTP.CD', p: 'World Bank', u: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD', type: 'official' },
    uk_cgt_rates: { t: 'Capital Gains Tax rates and allowances', p: 'GOV.UK', u: 'https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances', type: 'official' },
    pt_irc87: { t: 'Art. 87.º CIRC – taxas (as amended by Lei 64/2025)', p: 'Informador Fiscal (consolidated text)', u: 'https://informador.pt/legislacao/lexit/codigos/direito-fiscal/codigo-do-irc/capitulo-iv-taxas/artigo-87-o-taxas/', type: 'law' },
    pt_derrama: { t: 'Derrama municipal (art. 18 Lei 73/2013, max. 1.5%)', p: 'Diário da República – Lexionário', u: 'https://diariodarepublica.pt/dr/lexionario/termo/derrama-municipal', type: 'official' },
    pt_voucher: { t: 'Governo lança nova edição do Startup Voucher (Nov 2025)', p: 'AICEP Portugal Global', u: 'https://portugalglobal.pt/noticias/2025/novembro/governo-lanca-nova-edicao-do-startup-voucher/', type: 'official' },
    pt_vouchers_prr: { t: '2.º Aviso dos Vouchers e Vales para start-ups (PRR, €75m)', p: 'Government of Portugal', u: 'https://portugal.gov.pt/gc23/comunicacao/comunicados/2-aviso-dos-vouchers-e-vales-para-start-ups-abre-com-75m', type: 'official' },
    e2_table: { t: 'E-2 treaty country table (reproduces State Dept list incl. Portugal from 15 Mar 2024)', p: 'Mayo Law (secondary)', u: 'https://mayo.law/articles/e2-visa-countries/', type: 'expert' }
  };

  /* Peer-reviewed literature behind the method (shown on the methodology page). */
  var LITERATURE = [
    { c: 'Dahl, M. S., & Sorenson, O. (2012). Home sweet home: Entrepreneurs’ location choices and the performance of their ventures. Management Science, 58(6), 1059–1071.', u: 'https://doi.org/10.1287/mnsc.1110.1476', use: 'Basis for the home-advantage bonus: ventures perform better where founders have deep local roots.' },
    { c: 'Figueiredo, O., Guimarães, P., & Woodward, D. (2002). Home-field advantage: Location decisions of Portuguese entrepreneurs. Journal of Urban Economics, 52(2), 341–361.', u: 'https://scholar.google.com/scholar?q=Home-field+advantage%3A+location+decisions+of+Portuguese+entrepreneurs', use: 'Confirms the strong pull of the home region in founders’ location choices.' },
    { c: 'Stam, E., & van de Ven, A. (2021). Entrepreneurial ecosystem elements. Small Business Economics, 56, 809–832.', u: 'https://doi.org/10.1007/s11187-019-00270-6', use: 'Selection of ecosystem criteria: finance, talent, knowledge, networks, formal institutions.' },
    { c: 'Djankov, S., La Porta, R., Lopez-de-Silanes, F., & Shleifer, A. (2002). The regulation of entry. Quarterly Journal of Economics, 117(1), 1–37.', u: 'https://doi.org/10.1162/003355302753399436', use: 'Why setup cost, time and procedures are a criterion.' },
    { c: 'Klapper, L., Laeven, L., & Rajan, R. (2006). Entry regulation as a barrier to entrepreneurship. Journal of Financial Economics, 82(3), 591–629.', u: 'https://scholar.google.com/scholar?q=Entry+regulation+as+a+barrier+to+entrepreneurship+Klapper+Laeven+Rajan', use: 'Entry costs reduce new-firm creation, especially in high-growth sectors.' },
    { c: 'Da Rin, M., Nicodano, G., & Sembenelli, A. (2006). Public policy and the creation of active venture capital markets. Journal of Public Economics, 90(8–9), 1699–1723.', u: 'https://scholar.google.com/scholar?q=Public+policy+and+the+creation+of+active+venture+capital+markets', use: 'Capital-gains taxation and VC market depth as criteria.' },
    { c: 'Keeney, R. L., & Raiffa, H. (1976; reissued 1993). Decisions with Multiple Objectives: Preferences and Value Tradeoffs. Wiley / Cambridge University Press.', u: 'https://doi.org/10.1017/CBO9781139174084', use: 'Additive multi-attribute value model used for the fit score.' },
    { c: 'OECD & JRC (2008). Handbook on Constructing Composite Indicators: Methodology and User Guide. OECD Publishing.', u: 'https://doi.org/10.1787/9789264043466-en', use: 'Normalisation on anchored scales, transparent weighting and sensitivity analysis.' }
  ];

  /* Merge the extended evidence base (assets/js/facts.js). A criterion with `after: '<id>'`
     is inserted after that criterion; otherwise it is appended before 'residence'. */
  var F = (typeof module !== 'undefined' && module.exports) ? require('./facts.js') : root.SSN_FACTS;
  F = F || {};
  (F.EXTRA_CRITERIA || []).forEach(function (c) {
    var ids = CRITERIA.map(function (x) { return x.id; });
    var at = c.after && ids.indexOf(c.after) !== -1 ? ids.indexOf(c.after) + 1 : ids.indexOf('residence');
    CRITERIA.splice(at === -1 ? CRITERIA.length : at, 0, c);
  });
  Object.keys(F.EXTRA_SCORES || {}).forEach(function (k) {
    Object.keys(F.EXTRA_SCORES[k]).forEach(function (cid) { SCORES[k][cid] = F.EXTRA_SCORES[k][cid]; });
  });
  Object.keys(F.EXTRA_SOURCES || {}).forEach(function (s) { SOURCES[s] = F.EXTRA_SOURCES[s]; });

  var api = {
    LEGAL_FORMS: F.LEGAL_FORMS || {}, FIRST_YEAR_COST: F.FIRST_YEAR_COST || {}, TAX_FACTS: F.TAX_FACTS || {},
    COURSE_READING: F.COURSE_READING || [],
    DATA_AS_OF: DATA_AS_OF, COUNTRIES: COUNTRIES, CRITERIA: CRITERIA, SCORES: SCORES,
    RESIDENCE: RESIDENCE, RESIDENCE_SOURCES: RESIDENCE_SOURCES, SECTOR_ADJ: SECTOR_ADJ, SECTOR_NOTES: SECTOR_NOTES,
    ROADMAP: ROADMAP, SOURCES: SOURCES, LITERATURE: LITERATURE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_DATA = api;
})(this);
