/*
 * FoundNorth – evidence base
 * ------------------------------------------------
 * Every country score (1–5) is derived from the documented facts in `value`/`note`
 * and the cited `sources`. Scores follow the anchor scales in CRITERIA[].anchors.
 * Research cut-off: 31 October 2026. Update this file to refresh the tool.
 */
(function (root) {
  'use strict';

  var DATA_AS_OF = '2026-10-31';

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
      anchors: '5 = several national programmes open to new founders · 3 = programmes exist but narrow or restricted · 1 = no dedicated national programme identified' },
    { id: 'talent', name: 'Strong talent pool & startup ecosystem', short: 'Ecosystem',
      hint: 'Innovation capacity, start-up hubs',
      info: 'How strong the innovation system and start-up hubs are: universities, skilled people, founders and mentors around you. Based on the WIPO Global Innovation Index and Startup Genome rankings.',
      anchors: 'WIPO GII 2025 rank and Startup Genome hub rankings: 5 = global top-3 hub · 4 = top European hub or GII top-15 · 3 = emerging hub · 1 = no ranked hub' },
    { id: 'esop', name: 'Founder-friendly employee stock options', short: 'ESOP rules',
      hint: 'Tax treatment of employee equity',
      info: 'How employee stock options are taxed. Friendly rules let employees pay tax only when they sell – making equity a stronger hiring tool.',
      anchors: '5 = tax-advantaged statutory scheme, taxed only on sale · 3 = deferral regime with conditions · 2 = taxed as income at exercise / no regime' },
    { id: 'cost', name: 'Low cost of living', short: 'Low living cost',
      hint: 'Price level for people and salaries',
      info: 'How expensive everyday life is, which also drives salary levels and your burn rate. Measured as the national household price level.',
      anchors: 'Household price level, EU27 = 100: 5 ≤ 95 · 4 ≤ 115 · 3 ≤ 135 · 2 ≤ 160 · 1 > 160' },
    { id: 'market', name: 'Easy access to your target market', short: 'Market access',
      hint: 'Single market, customers, regulation',
      info: 'How easy it is to sell to your first customers from this country: single market, customs, regulation. Depends on the market you selected.',
      anchors: 'Base: 4 = large single market (EU 27 / US) · 3 = national market with partial or treaty access. Adjusted by your target market.' },
    { id: 'residence', name: 'Easy residence & local roots', short: 'Residence',
      hint: 'Your right to live there, your local roots',
      info: 'Can you live and work there, and do you already have roots there? Founders do better where they have local networks (Dahl & Sorenson 2012). Calculated from your citizenship(s), where you live and where your existing investors are based.',
      anchors: '5 = you already live there · 4 = free movement for your passport · 3 = not yet known · 2 = visa or permit needed · 1 = residence quota-limited or very hard to get · +1 if your existing investors are based there (local network)' }
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
      vc: { score: 3, value: '≈ $8.1bn VC invested in 2025',
        note: 'Dealroom/HSBC put German start-up VC at ≈ $8.1bn in 2025; KfW reports the market roughly matched the prior year.',
        sources: ['dealroom_uk25', 'kfw_vc'], confidence: 'medium' },
      grants: { score: 5, value: 'EXIST (up to €3,000/month per founder), High-Tech Gründerfonds, state programmes',
        note: 'EXIST start-up grant: monthly stipend up to €3,000 (PhD) per founder, up to €10k (solo) / €30k (team) material costs plus €5k coaching. Further federal and Länder programmes exist.',
        sources: ['exist'], confidence: 'high' },
      talent: { score: 4, value: 'GII 2025 rank 11 · Berlin #3 in Europe (Startup Genome 2026)',
        note: 'Germany ranks 11th in the WIPO Global Innovation Index 2025. Berlin is Europe’s #3 ecosystem in Startup Genome’s GSER 2026; Munich was #7 in Europe in 2025.',
        sources: ['gii_de', 'gser26_eu'], confidence: 'high' },
      esop: { score: 3, value: 'Deferred taxation under §19a EStG (improved 2024)',
        note: 'Since the Future Financing Act (from 1 Jan 2024) start-up employee equity can be taxed later rather than at grant (§19a EStG); tax-free allowance €2,000. Index Ventures still rates Germany behind the UK and France.',
        sources: ['estg19a', 'index_rt'], confidence: 'medium' },
      cost: { score: 4, value: 'Price level 109 (EU27 = 100, 2024)',
        note: 'Eurostat household price level index 2024: 109% of the EU average.',
        sources: ['eurostat_pli'], confidence: 'high' },
      market: { score: 4, value: 'EU single market (27 countries)', note: 'Full access to the EU single market and customs union.',
        sources: ['eu_sm'], confidence: 'high' }
    },
    CH: {
      setup: { score: 2, value: 'Public deed by notary · GmbH CHF 20,000 fully paid in · ≈ CHF 2–4.5k costs',
        note: 'GmbH minimum capital CHF 20,000, fully paid in at formation (Art. 773 OR); formation by public deed (the federal SME portal states this is no longer always required – verify with the cantonal register) and commercial-register entry. Advisers estimate CHF 2,000–4,500 in notary and register fees. Free model articles on EasyGov.',
        sources: ['kmu_gmbh', 'postfinance_gmbh'], confidence: 'medium' },
      corpTax: { score: 4, value: '≈ 14.4% on €100k profit (Swiss average) · Zug 11.85% · Zurich 19.61%',
        note: 'KPMG Swiss Tax Report 2025: average combined profit tax 14.4%; lowest Zug 11.85%, Zurich 19.61%. The canton you choose matters.',
        sources: ['kpmg_ch'], confidence: 'high' },
      exitTax: { score: 5, value: 'Private capital gains tax-free (Art. 16 para. 3 DBG) · annual wealth tax on shares',
        note: 'Gains on privately held shares are tax-exempt for Swiss residents. Main exceptions: indirect partial liquidation (Art. 20a DBG, e.g. selling ≥ 20% to a corporate buyer who uses company reserves), professional trading. Annual cantonal wealth tax applies to the shares.',
        sources: ['dbg16', 'ch_itl'], confidence: 'high' },
      vc: { score: 3, value: '≈ $3.6bn VC invested in 2025',
        note: 'Crunchbase/Dealroom: ≈ $3.6bn in 2025, Europe’s 4th-largest VC market; high per capita.',
        sources: ['dealroom_uk25'], confidence: 'medium' },
      grants: { score: 4, value: 'Innosuisse start-up innovation projects (up to 70% of costs)',
        note: 'Innosuisse funds science-based projects of start-ups < 5 years old and < 50 FTE, covering up to 70% of direct project costs; applications on a rolling basis. Cantonal programmes add to this.',
        sources: ['innosuisse'], confidence: 'high' },
      talent: { score: 4, value: 'GII 2025 rank 1 (15th year) · Zurich #6 in Europe (2025)',
        note: 'Switzerland tops the WIPO GII for the 15th consecutive year. Zurich ranked 6th in Europe in GSER 2025; Greater Lausanne is #10 among emerging ecosystems in 2026. Small labour market.',
        sources: ['gii_res', 'gser26_eu', 'gser26_emerging'], confidence: 'high' },
      esop: { score: 2, value: 'Options usually taxed as income at exercise (ESTV Circular 37)',
        note: 'Non-tradable options (typical for start-ups) are taxed at exercise on the spread; private-company shares are valued by formula; blocked shares get a 6%/year discount. Some cantons (e.g. Geneva) have friendlier practices.',
        sources: ['ch_ks37'], confidence: 'medium' },
      cost: { score: 1, value: 'Price level 184 (EU27 = 100, 2024) – highest in Europe',
        note: 'Eurostat 2024: Switzerland is the most expensive of 36 European countries at 184% of the EU average.',
        sources: ['eurostat_pli'], confidence: 'high' },
      market: { score: 3, value: 'Bilateral agreements with the EU (no full single market)',
        note: 'Access to the EU market via sectoral bilateral agreements; free movement of persons with the EU/EFTA.',
        sources: ['ch_bilaterals'], confidence: 'medium' }
    },
    LI: {
      setup: { score: 2, value: 'GmbH CHF 10,000 fully paid in · local qualified board member may be required',
        note: 'Liechtenstein GmbH: minimum capital CHF 10,000 (or EUR/USD 10,000), fully paid in at formation (Commercial Register factsheet). Art. 180a PGR requires certain companies to have a locally licensed, qualified board member – whether it applies to an operating start-up needs to be verified.',
        sources: ['li_gmbh', 'li_180a'], confidence: 'medium' },
      corpTax: { score: 5, value: '12.5% on €100k profit (flat) · CHF 1,800 minimum tax',
        note: 'Flat 12.5% corporate income tax; annual minimum tax CHF 1,800, credited against the actual tax (small-company exemptions exist).',
        sources: ['li_tax', 'pwc_li'], confidence: 'high' },
      exitTax: { score: 5, value: 'Capital gains on shares not taxable · 4% notional return on wealth taxed yearly',
        note: 'Private capital gains are not part of taxable income; instead a notional return of 4% on net wealth (Sollertrag) is taxed as income each year.',
        sources: ['li_steg', 'gt_li'], confidence: 'medium' },
      vc: { score: 1, value: 'No meaningful domestic VC market',
        note: 'Liechtenstein does not appear as a separate VC market in Dealroom, Crunchbase or tech.eu reporting; founders typically raise from Swiss, Austrian or international investors.',
        sources: [], confidence: 'low' },
      grants: { score: 3, nodata: true, value: 'No data: no national programme comparable to EXIST or Innosuisse identified',
        note: 'Our research found no dedicated national start-up grant programme of comparable scale. Because absence of evidence is not evidence of absence, the score is set to the neutral midpoint (3).',
        sources: [], confidence: 'low' },
      talent: { score: 1, value: 'Not ranked in GII or Startup Genome · ≈ 40k inhabitants',
        note: 'Very small labour market; many employees commute from Switzerland and Austria. Strength in finance and blockchain (Token and VT Service Provider Act).',
        sources: ['gii_res'], confidence: 'medium' },
      esop: { score: 3, nodata: true, value: 'No data: no dedicated start-up ESOP regime identified',
        note: 'We found no specific tax-advantaged employee equity scheme and no reliable description of current practice, so the score is set to the neutral midpoint (3).',
        sources: [], confidence: 'low' },
      cost: { score: 1, value: 'Swiss-franc price level (no Eurostat index)',
        note: 'Liechtenstein uses the Swiss franc and forms a customs union with Switzerland; no official comparative price index – we assume a Swiss-like level.',
        sources: ['eurostat_pli'], confidence: 'low' },
      market: { score: 3, value: 'EEA single market + customs union with Switzerland',
        note: 'EEA member: access to the EU single market for goods, services and capital; tiny home market.',
        sources: ['eu_sm'], confidence: 'high' }
    },
    UK: {
      setup: { score: 5, value: 'Online incorporation, £100 fee (since Feb 2026), no minimum capital',
        note: 'Private limited companies are registered online with Companies House; the digital incorporation fee rose from £50 to £100 on 1 Feb 2026. No minimum share capital, no notary.',
        sources: ['ch_fees'], confidence: 'high' },
      corpTax: { score: 3, value: '≈ 22.8% on £100k profit (19% / 25% with marginal relief)',
        note: 'Corporation tax: 19% up to £50,000, 25% above £250,000, marginal relief in between. On £100,000 profit: 25% × £100,000 − 3/200 × (£250,000 − £100,000) = £22,750, i.e. ≈ 22.8%.',
        sources: ['taxfound_cit', 'oecd_cit'], confidence: 'high' },
      exitTax: { score: 3, value: '18% with Business Asset Disposal Relief (≤ £1m lifetime) · 24% above',
        note: 'From 6 April 2026 qualifying gains under Business Asset Disposal Relief are taxed at 18% up to a £1m lifetime limit; other gains at 24% for higher-rate taxpayers. BADR generally requires ≥ 5% of the shares and being an employee or director for 2 years.',
        sources: ['hmrc_badr'], confidence: 'high' },
      vc: { score: 4, value: '≈ $23.6bn VC invested in 2025 – Europe’s largest',
        note: 'Dealroom/HSBC: UK start-ups raised $23.6bn in 2025, more than Germany, France and Switzerland combined. Crunchbase reports a lower ≈ $17bn – both fall in the same band.',
        sources: ['dealroom_uk25'], confidence: 'medium' },
      grants: { score: 4, value: 'SEIS/EIS investor tax reliefs · Innovate UK',
        note: 'SEIS: companies can raise up to £250,000; investors get 50% income-tax relief on up to £200,000 a year. EIS for later rounds; Innovate UK grants.',
        sources: ['seis'], confidence: 'high' },
      talent: { score: 5, value: 'GII 2025 rank 6 · London #3 globally, #1 in Europe (2026)',
        note: 'UK ranks 6th in the GII 2025. London is #1 in Europe and #3 worldwide in Startup Genome’s GSER 2026.',
        sources: ['gii_res', 'gser26_eu'], confidence: 'high' },
      esop: { score: 5, value: 'EMI options: tax-advantaged, company limit £6m (from Apr 2026)',
        note: 'Enterprise Management Incentives: up to £250,000 per employee; company limit rose to £6m and the gross-assets test to £120m for grants from 6 April 2026. Index Ventures rates EMI among Europe’s best.',
        sources: ['emi_2026', 'index_rt'], confidence: 'high' },
      cost: { score: 3, value: '≈ 9% above Germany (OECD price levels) · London premium',
        note: 'Estimate: OECD comparative price levels (2022) put the UK ≈ 9% above Germany (105 vs 96, OECD = 100); scaled to Eurostat’s 2024 German value this is ≈ 119 (EU27 = 100). Mixed years and bases – treat as an approximation. London is markedly more expensive.',
        sources: ['oecd_pl'], confidence: 'low' },
      market: { score: 3, value: 'National market of ≈ 69m; outside the EU single market',
        note: 'Since Brexit, trade with the EU runs under the Trade and Cooperation Agreement without single-market access.',
        sources: ['eu_sm'], confidence: 'high' }
    },
    US: {
      setup: { score: 4, value: 'Online Delaware filing, no minimum capital · EIN/banking slower for non-residents',
        note: 'A Delaware C-Corp is filed online with no minimum capital; you need a registered agent and an EIN. Delaware updated its fee schedule on 1 Aug 2026. Non-US founders often face slower EIN and banking set-up.',
        sources: ['de_fees_2026'], confidence: 'medium' },
      corpTax: { score: 3, value: '≈ 25.6% on €100k profit (21% federal + state average)',
        note: 'Federal corporate tax 21% plus state tax where the company operates; OECD combined average 25.6%.',
        sources: ['taxfound_cit', 'oecd_cit'], confidence: 'high' },
      exitTax: { score: 4, value: '≈ 23.8% without QSBS · 0% with QSBS after 5 years (up to $15m)',
        note: 'Long-term capital gains 15–20% plus 3.8% net investment income tax (≈ 23.8% top rate = score 3). Section 1202 QSBS (C-Corp stock issued after 4 Jul 2025): 50% excluded after 3 years, 75% after 4, 100% after 5, capped at $15m per issuer (= score 5). The 4 is a deliberate blend because many VC-backed founders qualify. State income tax (e.g. up to 13.3% in California) is not included; QSBS benefits US taxpayers.',
        sources: ['qsbs_obbba'], confidence: 'high' },
      vc: { score: 5, value: '≈ $339bn VC invested in 2025',
        note: 'PitchBook-NVCA: US start-ups raised $339.4bn across 16,709 deals in 2025 (NVCA Yearbook: ≈ $320bn).',
        sources: ['pitchbook_25', 'nvca_yb'], confidence: 'high' },
      grants: { score: 3, value: 'SBIR/STTR – requires > 50% US-citizen or green-card ownership',
        note: 'SBIR/STTR is the largest early-stage grant programme, but the company must be more than 50% owned by US citizens or permanent residents. Limited for foreign founders.',
        sources: ['sbir'], confidence: 'high' },
      talent: { score: 5, value: 'GII 2025 rank 3 · Silicon Valley #1 & New York #2 globally',
        note: 'The US ranks 3rd in the GII 2025; Silicon Valley and New York top Startup Genome’s 2026 global ranking.',
        sources: ['gii_res', 'gser26_global'], confidence: 'high' },
      esop: { score: 4, value: 'ISOs/NSOs standard; widely understood by employees',
        note: 'Incentive stock options and 83(b) elections are standard market practice; Index Ventures rates the UK’s EMI as more generous than US arrangements.',
        sources: ['index_rt'], confidence: 'medium' },
      cost: { score: 2, value: '≈ 30% above Germany (OECD price levels) · hubs far higher',
        note: 'Estimate: OECD comparative price levels (2022): US 125 vs Germany 96 (OECD = 100); scaled to Eurostat’s 2024 German value this is ≈ 142 (EU27 = 100). Mixed years and bases – treat as an approximation. Bay Area and New York are much higher.',
        sources: ['oecd_pl'], confidence: 'low' },
      market: { score: 4, value: 'Largest single national market', note: 'One large, uniform consumer and enterprise market; regulation varies by state.',
        sources: [], confidence: 'high' }
    },
    PT: {
      setup: { score: 5, value: '"Empresa na Hora": €360 all-in, €1 minimum per quota',
        note: 'One-stop formation ("Empresa na Hora") costs €360 including registration and publication. No minimum capital since 2011 – each quota at least €1.',
        sources: ['pt_lda', 'pt_enh'], confidence: 'high' },
      corpTax: { score: 3, value: '≈ 18.5% on €100k profit (15% on first €50k, 19% above, + up to 1.5% municipal)',
        note: 'IRC 19% for 2026 (scheduled 18% in 2027, 17% in 2028); SMEs pay 15% on the first €50,000. On €100,000: €7,500 + €9,500 = 17%, plus a municipal surcharge of up to 1.5% → ≈ 18.5%. State surcharge only above €1.5m profit.',
        sources: ['pt_irc26'], confidence: 'high' },
      exitTax: { score: 4, value: '≈ 14%: 28% on 50% of the gain (unlisted micro/small companies)',
        note: 'Gains on shares are taxed at a flat 28% (art. 72 CIRS). For unlisted micro and small Portuguese companies, which covers most start-ups, only 50% of the gain is counted (art. 43 CIRS) → ≈ 14% effective. Larger companies: 28% (score 2). Conditions apply; verify with an adviser.',
        sources: ['pt_cirs43'], confidence: 'medium' },
      vc: { score: 2, value: '≈ €0.7bn VC raised in 2024',
        note: 'tech.eu counted €681m across 48 rounds in 2024 and €190m in H1 2025. No full-year 2025 figure was available, and the source and currency differ from the other countries – the band is wide enough that this does not change the score.',
        sources: ['techeu_pt'], confidence: 'medium' },
      grants: { score: 3, value: 'Startup Visa, Startup Portugal programmes, EU recovery funds',
        note: 'National programmes via Startup Portugal and IAPMEI plus EU-funded schemes; 2023 Startup Law (Lei 21/2023) added tax incentives.',
        sources: ['pt_startuplaw', 'pt_sv'], confidence: 'medium' },
      talent: { score: 3, value: 'GII 2025 rank 31 · Porto among emerging ecosystems (2026)',
        note: 'Portugal ranks 31st of 139 in the GII 2025; Porto appears in Startup Genome’s 2026 emerging-ecosystem ranking (#51–60).',
        sources: ['gii_pt', 'gser26_eu'], confidence: 'high' },
      esop: { score: 4, value: 'Start-up regime: taxed only on sale, 50% of the gain exempt',
        note: 'Lei 21/2023 (art. 43-C EBF) defers taxation of qualifying SME stock options until the shares are sold and exempts half of the gain; conditions apply.',
        sources: ['pt_startuplaw'], confidence: 'medium' },
      cost: { score: 5, value: 'Below the EU average in most categories (2024)',
        note: 'INE/Eurostat 2024: Portuguese prices were below the EU27 average in most consumption categories (exceptions: food and communications). We did not obtain the exact index value, so the score is an estimate. Housing costs in Lisbon have risen sharply.',
        sources: ['ine_pin'], confidence: 'low' },
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
      US: { level: 'visa', text: 'Visa needed – E-2 treaty investor (DE, PT and many EU states), O-1 or others' }
    },
    ch: {
      CH: { level: 'home', text: 'Home country' },
      DE: { level: 'free', text: 'Free movement under the EU–Swiss agreement' },
      PT: { level: 'free', text: 'Free movement under the EU–Swiss agreement' },
      LI: { level: 'limited', text: 'Residence permits are quota-limited; commuting is common' },
      UK: { level: 'visa', text: 'Visa needed – e.g. Innovator Founder' },
      US: { level: 'visa', text: 'Visa needed – E-2 treaty investor available to Swiss nationals' }
    },
    uk: {
      UK: { level: 'home', text: 'Home country' },
      DE: { level: 'visa', text: 'Residence permit for self-employment needed (§21 AufenthG)' },
      PT: { level: 'visa', text: 'Visa needed – e.g. Startup Visa or D2 entrepreneur visa' },
      CH: { level: 'limited', text: 'Third-country quotas apply to UK nationals since 2021' },
      LI: { level: 'limited', text: 'Third-country rules; permits are scarce' },
      US: { level: 'visa', text: 'Visa needed – E-2 treaty investor available to UK nationals' }
    },
    us: {
      US: { level: 'home', text: 'Home country' },
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

  var RESIDENCE_SOURCES = ['state_e2', 'uk_if', 'li_quota', 'pt_sv'];

  /* Residence & home base is calculated from the profile; this base cell is used until citizenship/residence is known. */
  COUNTRIES.forEach(function (c) {
    SCORES[c.id].residence = { score: 3, value: 'Depends on your citizenship(s) and where you live',
      note: 'Scored from your answers: 5 if you already live here (home advantage), 4 with free movement for one of your passports, 2 if a visa or permit is needed, 1 if residence is quota-limited. Without answers it stays at the neutral 3.',
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

  /* Example profiles for a one-click demo */
  var EXAMPLES = [
    { id: 'deeptech', title: 'TUM deep-tech founder', sub: 'EU citizen in Munich · AI · grants + VC',
      answers: { citizenship: ['eu'], residence: 'DE', relocation: 'europe', sector: 'ai', market: 'eu', funding: ['grants', 'vc'], capital: 'none', investors: ['none'], exit: 'sale', esop: 'all', priorities: { grants: 3, vc: 3, talent: 2 } } },
    { id: 'bootstrap', title: 'Bootstrapped e-commerce', sub: 'EU citizen · low costs · keep the profits',
      answers: { citizenship: ['eu'], residence: 'euother', relocation: 'europe', sector: 'consumer', market: 'eu', funding: ['bootstrap'], capital: 'lt10', investors: ['none'], exit: 'hold', esop: 'no', priorities: { cost: 3, setup: 3, corpTax: 2, vc: 0, grants: 0 } } },
    { id: 'fintech', title: 'Fintech with UK angels', sub: 'British founder in London · angels + VC',
      answers: { citizenship: ['uk'], residence: 'UK', relocation: 'europe', sector: 'fintech', market: 'uk', funding: ['angels', 'vc'], capital: '25to100', investors: ['UK'], exit: 'sale', esop: 'all', priorities: { esop: 3, vc: 3, setup: 2 } } }
  ];

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
      { t: 'Check the Art. 180a PGR requirement', d: 'Some companies need a locally licensed, qualified board member.', src: 'li_180a' },
      { t: 'Register with the Office of Justice', d: 'File the formation documents with the Liechtenstein commercial register.', src: 'li_gmbh' },
      { t: 'Obtain a trade licence and tax registration', d: 'Minimum tax CHF 1,800 a year, credited against the 12.5% profit tax.', src: 'li_tax' }
    ],
    UK: [
      { t: 'Check your visa first', d: 'Non-UK founders typically use the Innovator Founder route (endorsing body, £1,000 endorsement fee).', src: 'uk_if' },
      { t: 'Incorporate online', d: 'Private limited company via Companies House – £100 digital fee, usually registered within 24 hours.', src: 'uk_ltd' },
      { t: 'Get SEIS advance assurance', d: 'Lets angels claim 50% income-tax relief; you can raise up to £250,000 under SEIS.', src: 'seis' },
      { t: 'Set up an EMI option plan', d: 'Tax-advantaged employee options; company limit £6m from April 2026.', src: 'emi_2026' },
      { t: 'Register for Corporation Tax', d: 'Tell HMRC once you start trading.', src: 'uk_ct' }
    ],
    US: [
      { t: 'Sort out your visa', d: 'E-2 (treaty investor) is open to German, Swiss, UK and Portuguese nationals; otherwise O-1 or others.', src: 'state_e2' },
      { t: 'Form a Delaware C-Corp', d: 'The standard for VC funding and required for QSBS; appoint a registered agent.', src: 'de_fees_2026' },
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

  /* Sources (accessed 31 Oct 2026). type: law | official | intl | report | academic | expert */
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
    ch_fees: { t: 'Companies House fee changes from 1 February 2026', p: 'GOV.UK', u: 'https://www.gov.uk/government/news/update-regarding-companies-house-fee-changes', type: 'official' },
    hmrc_badr: { t: 'CG63955 – Business Asset Disposal Relief: broad outline', p: 'HMRC', u: 'https://www.gov.uk/hmrc-internal-manuals/capital-gains-manual/cg63955', type: 'official' },
    dealroom_uk25: { t: 'UK VC investment rebounds in 2025 (Dealroom/HSBC Innovation Banking)', p: 'FF News / Dealroom', u: 'https://ffnews.com/newsarticle/uk-vc-investment-rebounds-in-2025-marking-first-annual-growth-in-four-years', type: 'report' },
    seis: { t: 'Increasing the limits of the Seed Enterprise Investment Scheme', p: 'HM Treasury / HMRC', u: 'https://www.gov.uk/government/publications/venture-capital-schemes-expansion-of-the-seed-enterprise-investment-scheme-seis/increasing-the-limits-of-the-seed-enterprise-investment-scheme', type: 'official' },
    emi_2026: { t: 'Expanding the eligibility limits of the EMI scheme', p: 'HM Treasury', u: 'https://www.gov.uk/government/publications/enterprise-management-incentive-scheme-increasing-the-limits/expanding-the-eligibility-limits-of-the-enterprise-management-incentive-scheme', type: 'official' },
    uk_if: { t: 'Innovator Founder visa', p: 'GOV.UK', u: 'https://www.gov.uk/innovator-founder-visa', type: 'official' },
    de_fees_2026: { t: 'Delaware business filing fee changes from 1 Aug 2026', p: 'InCorp (secondary; official schedule at corp.delaware.gov)', u: 'https://www.incorp.com/resources/knowledge-base/delaware-business-filing-fee-increase', type: 'expert' },
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
    techeu_pt: { t: 'Portugal start-up funding 2024 / H1 2025', p: 'tech.eu', u: 'https://funding.tech.eu/geographies/portugal/2024', type: 'report' }
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

  var api = {
    DATA_AS_OF: DATA_AS_OF, COUNTRIES: COUNTRIES, CRITERIA: CRITERIA, SCORES: SCORES,
    RESIDENCE: RESIDENCE, RESIDENCE_SOURCES: RESIDENCE_SOURCES, SECTOR_ADJ: SECTOR_ADJ, SECTOR_NOTES: SECTOR_NOTES, EXAMPLES: EXAMPLES,
    ROADMAP: ROADMAP, SOURCES: SOURCES, LITERATURE: LITERATURE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_DATA = api;
})(this);
