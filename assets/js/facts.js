/*
 * FoundersNavigator – extended evidence base (loaded BEFORE data.js)
 * ------------------------------------------------
 * data.js merges this file:
 *   - EXTRA_CRITERIA are appended to CRITERIA (scored criteria, same shape as in data.js)
 *   - EXTRA_SCORES[country][criterionId] are merged into SCORES (same cell shape:
 *     { score, value, note, sources: [sourceId], confidence: 'high'|'medium'|'low', nodata? })
 *   - EXTRA_SOURCES are merged into SOURCES (same shape: { t, p, u, type })
 *   - LEGAL_FORMS, FIRST_YEAR_COST, TAX_FACTS, COURSE_READING are exported as-is.
 *
 * Schemas
 *   LEGAL_FORMS[country] = [{
 *     id, name, local,                     // e.g. 'gmbh', 'GmbH', 'Gesellschaft mit beschränkter Haftung'
 *     typical: bool,                       // the form the tool recommends by default
 *     minCapital: { amount, currency, eur, paidInEur, text },
 *     liability: string,                   // who is liable for what
 *     notary: bool, notaryText: string,
 *     profitTax: string,                   // short; full detail lives in SCORES.corpTax
 *     setupDays: { min, max }, setupCostEur: { min, max },
 *     steps: number,                       // mandatory procedures to register
 *     note, sources: [sourceId], confidence
 *   }]
 *   FIRST_YEAR_COST[country] = { currency, items: [{ id, label, eur, oneOff: bool, note, sources }], note }
 *     item ids: 'registration','notary','capitalLocked','agent','accounting','compliance','payrollPerEmployee'
 *     'capitalLocked' is paid-in share capital (not a cost, shown separately); 'payrollPerEmployee'
 *     = employer on-costs on a €60k gross salary.
 *   TAX_FACTS[country] = { personal: Fact, dividend: Fact, compliance: Fact }
 *     Fact = { value, note, sources: [sourceId], confidence }
 *   COURSE_READING = [{ t, u }]          // links from the TUM T18 reading list
 *
 * Conventions used below (researched 3 Nov 2026):
 *   - Exchange rates for conversions: €1 ≈ CHF 0.93 ≈ £0.87 ≈ US$1.16 (approximate, autumn 2026).
 *     A €60,000 gross salary is therefore ≈ CHF 56,000 ≈ £52,200 ≈ US$69,600.
 *   - Payroll on-costs = statutory employer contributions and mandatory employer insurances on top of
 *     gross salary for one full-time employee aged 35–44, 2026 rates. Voluntary benefits are excluded
 *     (US health insurance is mentioned separately because it is market practice).
 */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------------------------------------------
   * 1. New scored criteria
   * ------------------------------------------------------------------------------------------- */
  var EXTRA_CRITERIA = [
    { id: 'labor', after: 'cost', name: 'Low employer payroll cost', short: 'Low payroll cost',
      hint: 'Employer social charges on a €60k salary',
      info: 'Employer cost on top of gross salary: social security share (pension, health, unemployment, accident, family funds) plus other mandatory insurance. Basis: €60,000 gross/yr, full-time, age 35–44, 2026 rates (≈ CHF 0.93, £0.87, $1.16 per €). Voluntary benefits excluded.',
      anchors: 'Employer on-cost as % of €60,000 gross: 5 ≤ 10%; 4 ≤ 15%; 3 ≤ 20%; 2 ≤ 25%; 1 > 25%' },
    { id: 'rnd', after: 'grants', name: 'Generous R&D tax incentives', short: 'R&D incentives',
      hint: 'Tax credits / super-deductions for R&D spend',
      info: 'R&D spend returned via tax (credits, enhanced deductions, patent boxes), and whether loss-makers get it in cash or only once they pay profit tax.',
      anchors: '5 = ≥ 25% of qualifying R&D spend, paid in cash to loss-makers; 4 = ≥ 15% and payable/offsettable for loss-makers, or ≥ 30% but only against future profit tax; 3 = ≤ 15% effective or limited use for loss-makers; 2 = regional enhanced deduction/patent box only, no cash; 1 = no R&D tax incentive' }
  ];

  /* ---------------------------------------------------------------------------------------------
   * 2. Scores for the new criteria
   * ------------------------------------------------------------------------------------------- */
  var EXTRA_SCORES = {
    DE: {
      labor: { score: 2, value: '≈ 22% on €60k (≈ €13,400): pension 9.3% + health 8.75% + care 1.8% + unemployment 1.3% + accident/levies',
        note: 'Employer 2026: pension 9.3%, unemployment 1.3% (ceiling €101,400/yr), health 7.3% + half the 2.9% average add-on = 8.75%, care 1.8% (ceiling €69,750/yr). €60k is under both ceilings: 21.15%. Plus accident insurance (Berufsgenossenschaft, employer-only, ≈ 0.5–1% office), U3 insolvency levy 0.15%, U2 maternity levy ≈ 0.4% → ≈ 22.3%. ≤ 30 staff: U1 sick-pay levy ≈ 1.5–3% (reimburses sick pay) → up to ≈ 24%. Health add-on varies by insurer.',
        sources: ['de_sv26', 'de_sv_tk'], confidence: 'high' },
      rnd: { score: 5, value: 'Forschungszulage: 25% of R&D costs (35% for SMEs), base €12m from 2026 → up to €4.2m/yr, paid out even in loss years',
        note: 'FZulG: 25% of eligible R&D personnel and contract costs; SMEs 35% (since 2024). 2026: cost base €12m/yr (was €10m); 20% flat overhead for projects started after 31 Dec 2025 (Investitionssofortprogramm). Credited against tax, excess paid in cash, so loss-makers benefit. Needs a BSFZ certificate.',
        sources: ['de_fzul', 'de_fzul_dihk'], confidence: 'high' }
    },
    CH: {
      labor: { score: 4, value: '≈ 10.5% on €60k (≈ €6,300): AHV/IV/EO 5.3% + ALV 1.1% + BVG ≈ 2.6% + FAK/UVG/admin ≈ 1.5%',
        note: 'Employer 2026 on CHF 56,000: AHV/IV/EO 5.3% (no ceiling); ALV 1.1% (to CHF 148,200); BVG ≥ half the age credit on the coordinated salary (CHF 56,000 – 26,460; 10% credit at 35–44 ≈ 2.6% of salary; 1.8% at 25–34, more when older); FAK ≈ 1–2.5% by canton; UVG ≈ 0.1% (office); AHV admin ≈ 0.2%. Total ≈ 9.5–12%; many pay above the BVG minimum. Sickness daily-allowance insurance: common, not mandatory.',
        sources: ['ch_ahv26', 'ch_uzh26'], confidence: 'medium' },
      rnd: { score: 2, value: 'Cantonal R&D super-deduction (≤ +50%) and patent box (≤ 90% relief) – cantonal tax only, no cash',
        note: 'STAF (2020): cantons may grant up to 50% extra deduction on domestic R&D costs and a patent box with up to 90% relief, cantonal/communal profit tax only. No federal incentive; total relief capped at 70% of profit. Worth ≈ 3–6% of R&D spend where offered, only once profitable (7-year loss carry-forward). Several cantons grant less or nothing.',
        sources: ['ch_staf'], confidence: 'high' }
    },
    LI: {
      labor: { score: 3, value: '≈ 16.5% on €60k (≈ €9,900): AHV/IV/FAK/ALV 7.9% + health-insurance subsidy CHF 180.50/month + pension ≥ 4% + sickness/accident',
        note: 'Payroll leaflet 2026: employer AHV 4.225%, IV 0.675%, FAK 1.9%, admin 0.585%, ALV 0.5% = 7.885%. Also: half the national average health premium (CHF 180.50/month = CHF 2,166/yr ≈ 3.9% of CHF 56,000); ≥ half of occupational pension (BPVG; ≈ 4% assumed, 2026 minimum not re-verified); ≥ half of mandatory sickness daily-allowance insurance (≈ 0.5–1%); accident insurance ≈ 0.1–0.3%. Total ≈ 16–17%.',
        sources: ['li_payroll26', 'li_bpvg'], confidence: 'medium' },
      rnd: { score: 1, value: 'No R&D tax incentive; IP box abolished 2017 (phase-out to 2020)',
        note: 'IP box abolished 2017; grandfathering ended 2020; IP income taxed at the normal 12.5% since 2021. No R&D credit or super-deduction. The 4% notional interest deduction on equity applies to all companies, not R&D-specific.',
        sources: ['pwc_li_ded'], confidence: 'high' }
    },
    UK: {
      labor: { score: 3, value: '≈ 16% on €60k (≈ €9,700): employer NIC 15% above £5,000 + 3% auto-enrolment pension',
        note: 'Employer NIC since April 2025 (2026/27 unchanged): 15% above £5,000/yr → (£52,200 – £5,000) × 15% = £7,080 (13.6%). Auto-enrolment: ≥ 3% of qualifying earnings (£6,240–£50,270) = £1,321 (2.5%). Total ≈ 16.1%. Employment Allowance (£10,500/yr off NIC) can zero NIC for the first one or two hires, not if the sole employee is a director. Apprenticeship levy only above a £3m pay bill.',
        sources: ['uk_rates26', 'uk_pension'], confidence: 'high' },
      rnd: { score: 4, value: 'Merged R&D scheme: 20% taxable credit (≈ 15–16% net); ERIS for R&D-intensive loss-makers ≈ 27% in cash',
        note: 'Periods from 1 April 2024: merged scheme, 20% above-the-line credit, payable in loss years (≈ 15–16% net). Loss-making SMEs with R&D ≥ 30% of total costs can use ERIS instead: 86% extra deduction surrendered for a 14.5% payable credit ≈ 27% of qualifying spend. Patent box (10%) for later profits.',
        sources: ['uk_rnd', 'uk_rnd_stats'], confidence: 'high' }
    },
    US: {
      labor: { score: 5, value: '≈ 8.3% statutory on €60k (≈ €5,000): FICA 7.65% + FUTA/SUTA ≈ 0.6%; health insurance (≈ $7.9k) extra',
        note: 'Employer FICA: Social Security 6.2% (wage base $184,500 in 2026) + Medicare 1.45% = 7.65%. Plus FUTA 0.6% on the first $7,000 ($42), state unemployment (≈ $250–550/yr, new-employer rates vary by state), workers’ compensation (≈ 0.1–0.3% office) → ≈ 8.3%. Excluded: health insurance. Not mandatory under 50 employees but expected; average employer share, single coverage, 2025: ≈ $7,900 (KFF: premium $9,325, worker $1,440), ≈ +11 percentage points.',
        sources: ['us_ssa26', 'us_futa', 'kff_ehbs25'], confidence: 'high' },
      rnd: { score: 3, value: '§41 credit ≈ 6–10% of QREs (up to $500k/yr against payroll tax); §174A expensing restored 2025',
        note: 'Research credit: 14% of qualified research expenses above 50% of the prior 3-year average (6% without history), ≈ 5–8% net after §280C. Qualified small businesses (< $5m gross receipts, ≤ 5 years of receipts): up to $500,000/yr against employer payroll tax, usable while loss-making. One Big Beautiful Bill Act (2025): domestic R&E expensed immediately again (new §174A) from tax year 2025; small businesses may go back to 2022–2024 (Rev. Proc. 2025-28). Foreign R&E: 15-year amortisation. State credits (e.g. California) on top.',
        sources: ['us_41', 'us_174a'], confidence: 'medium' }
    },
    PT: {
      labor: { score: 2, value: '≈ 24.8% on €60k (≈ €14,900): TSU 23.75% + mandatory work-accident insurance ≈ 1%',
        note: 'Employer social security (Taxa Social Única): 23.75% of gross, no ceiling (employee 11%), Código Contributivo art. 53. Plus mandatory work-accident insurance (≈ 0.5–1.5% office) and small labour-compensation fund contributions. Total ≈ 24.5–25%. Pay comes in 14 instalments; €60k is the annual total. Temporary exemptions for first-job and long-term-unemployed hires.',
        sources: ['pt_ss26'], confidence: 'high' },
      rnd: { score: 4, value: 'SIFIDE II: 32.5% of R&D spend + 50% of the increase (47.5% for young SMEs) – credit against IRC, 12-year carry-forward',
        note: 'SIFIDE II (art. 35–42 Código Fiscal do Investimento): 32.5% of R&D expenses off corporate tax, plus 50% of the increase over the prior two-year average (cap €1.5m); SMEs active < 2 years get +15 points instead. Not refundable; 12-year carry-forward, so loss-makers benefit later. Extended to 2026 by Lei 13/2026, which closed the indirect R&D-fund route. Patent box: 85% exemption of qualifying IP income.',
        sources: ['pt_sifide', 'pt_sifide26', 'pwc_pt_inc'], confidence: 'medium' }
    }
  };

  /* ---------------------------------------------------------------------------------------------
   * 3. Sources for everything above and below (accessed 3 Nov 2026)
   * ------------------------------------------------------------------------------------------- */
  var EXTRA_SOURCES = {
    /* payroll */
    de_sv26: { t: 'Sozialversicherungs-Rechengrößen 2026 (contribution ceilings)', p: 'Deutsche Rentenversicherung', u: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2025/250910-sv-rechengroessen-vo-2026.html', type: 'official' },
    de_sv_tk: { t: 'Sozialversicherungs-Rechengrößen und Beitragssätze 2026', p: 'Techniker Krankenkasse', u: 'https://www.tk.de/firmenkunden/fachthemen/fachthema-beitraege/sozialversicherungs-rechengroessen-2026-2203234', type: 'official' },
    ch_ahv26: { t: 'Update „Sozialversicherungen in der Schweiz“ – Stand 1. Januar 2026', p: 'Informationsstelle AHV/IV', u: 'https://www.shop.ahv-iv.ch/data/docs/de/82816/Update-%C2%ABSozialversicherungen-in-der-Schweiz%C2%BB-Stand-1.-Januar-2026.pdf', type: 'official' },
    ch_uzh26: { t: 'Social security contributions – rates from 1 Jan 2026', p: 'University of Zurich (employer payroll office)', u: 'https://www.staff.uzh.ch/dam/jcr:1975370a-7d4c-4534-bcbc-a7171360765c/Social%20Security%20Contributions_Reglement_EN_20260101.pdf', type: 'official' },
    li_payroll26: { t: 'Merkblatt Lohnabrechnung 2026 (AHV/IV/FAK/ALV rates, employer health-insurance contribution)', p: 'Regierung des Fürstentums Liechtenstein', u: 'https://www.regierung.li/files/attachments/2026-merkblatt-lohnabrechnung.pdf', type: 'official' },
    li_bpvg: { t: 'Gesetz über die betriebliche Personalvorsorge (BPVG)', p: 'gesetze.li', u: 'https://www.gesetze.li/konso/pdf/1988012000', type: 'law' },
    uk_rates26: { t: 'Rates and thresholds for employers 2026 to 2027', p: 'HMRC / GOV.UK', u: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027', type: 'official' },
    uk_pension: { t: 'Workplace pensions – what you, your employer and the government pay', p: 'GOV.UK', u: 'https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay', type: 'official' },
    us_ssa26: { t: '2026 Social Security changes – fact sheet (wage base $184,500)', p: 'Social Security Administration', u: 'https://www.ssa.gov/news/en/cola/factsheets/2026.html', type: 'official' },
    us_futa: { t: 'Topic no. 759, Form 940 – Employer’s Annual Federal Unemployment (FUTA) Tax Return', p: 'IRS', u: 'https://www.irs.gov/taxtopics/tc759', type: 'official' },
    kff_ehbs25: { t: '2025 Employer Health Benefits Survey', p: 'KFF', u: 'https://www.kff.org/health-costs/report/2025-employer-health-benefits-survey/', type: 'report' },
    pt_ss26: { t: 'Guia Fiscal 2026 – Segurança Social', p: 'PwC Portugal', u: 'https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/seguranca-social.html', type: 'expert' },

    /* R&D */
    de_fzul: { t: 'Forschungszulagengesetz (FZulG)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/fzulg/', type: 'law' },
    de_fzul_dihk: { t: 'Mehr Förderung für Innovationen – Forschungszulage ab 2026', p: 'DIHK', u: 'https://www.dihk.de/de/serviceportal/fuer-gewerbetreibende-unternehmer/recht-regeln-und-sicherheit/mehr-foerderung-fuer-innovationen--141676', type: 'official' },
    uk_rnd: { t: 'Work out your Research and Development tax relief (merged scheme and ERIS)', p: 'HMRC / GOV.UK', u: 'https://www.gov.uk/guidance/work-out-your-research-and-development-tax-relief', type: 'official' },
    uk_rnd_stats: { t: 'Research and Development tax credits – background and quality report', p: 'HMRC / GOV.UK', u: 'https://www.gov.uk/government/statistics/background-information-and-quality-report-research-and-development-tax-credits/background-information-and-quality-report-research-and-development-tax-credits', type: 'official' },
    us_41: { t: 'Instructions for Form 6765 – Credit for Increasing Research Activities', p: 'IRS', u: 'https://www.irs.gov/instructions/i6765', type: 'official' },
    us_174a: { t: 'Rev. Proc. 2025-28 – domestic research expenditures under new §174A (OBBBA)', p: 'IRS', u: 'https://www.irs.gov/pub/irs-drop/rp-25-28.pdf', type: 'law' },
    ch_staf: { t: 'Steuerreform und AHV-Finanzierung (STAF) – Patentbox, F&E-Abzug, Entlastungsbegrenzung', p: 'Swiss Federal Tax Administration (ESTV)', u: 'https://www.estv2.admin.ch/stp/ds/b-staf-de.pdf', type: 'official' },
    pwc_li_ded: { t: 'Liechtenstein – corporate deductions (IP box abolition, notional interest)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/liechtenstein/corporate/deductions', type: 'expert' },
    pt_sifide: { t: 'Guia prático SIFIDE II', p: 'Agência Nacional de Inovação (ANI)', u: 'https://arquivo.ani.pt/media/7910/guia-pr%C3%A1tico-sifide_fev2023_v2.pdf', type: 'official' },
    pt_sifide26: { t: 'SIFIDE II: prorrogação e novas regras até 2026 (Lei 13/2026)', p: 'Cuatrecasas', u: 'https://www.cuatrecasas.com/pt/portugal/tributacao/art/sifide-ii-prorrogacao-novas-regras-2026', type: 'expert' },
    pwc_pt_inc: { t: 'Portugal – tax credits and incentives (patent box)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/portugal/corporate/tax-credits-and-incentives', type: 'expert' },

    /* legal forms & set-up */
    de_aktg: { t: 'Aktiengesetz (§§7, 23, 33, 36a AktG)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/aktg/', type: 'law' },
    de_gnotkg: { t: 'Gerichts- und Notarkostengesetz (GNotKG) – notary and register fees', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/gnotkg/', type: 'law' },
    ch_or: { t: 'Obligationenrecht – AG (Art. 621, 632) and GmbH (Art. 773, 777), audit (Art. 727 ff.)', p: 'Swiss Confederation (Fedlex)', u: 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de', type: 'law' },
    li_bmf: { t: 'Länderspezifische Information Liechtenstein – Gesellschaftsformen (AG, GmbH, Anstalt)', p: 'Austrian Federal Ministry of Finance', u: 'https://www.bmf.gv.at:443/dam/jcr:0a4ddcba-5b61-483d-9dd6-0d00cc1c23cd/L%C3%A4nderspezifische%20Information%20-%20Liechtenstein%20-%20BMF%202020-12-02.pdf', type: 'official' },
    gt_li_ag: { t: 'Overview of the Liechtenstein AG (Ltd)', p: 'Grant Thornton', u: 'https://www.grantthornton.ch/globalassets/1.-member-firms/switzerland/insights/pdf/2023/overview-liechtenstein-ag-ltd.pdf', type: 'expert' },
    uk_llp: { t: 'Set up a business partnership / limited liability partnership', p: 'GOV.UK', u: 'https://www.gov.uk/set-up-business-partnership', type: 'official' },
    de_corp_fees: { t: 'Delaware Division of Corporations – fee schedule', p: 'State of Delaware', u: 'https://corp.delaware.gov/fee/', type: 'official' },
    de_frtax: { t: 'Delaware franchise tax and annual report (corporations)', p: 'State of Delaware', u: 'https://corp.delaware.gov/frtax/', type: 'official' },
    de_llctax: { t: 'Delaware LLC / LP annual taxes', p: 'State of Delaware', u: 'https://corp.delaware.gov/paytaxes/', type: 'official' },
    de_hb400: { t: 'Delaware House Bill 400 – fee changes from 1 Aug 2026', p: 'Maples Group', u: 'https://maples.com/knowledge/delaware-house-bill-400-introduces-new-fee-changes', type: 'expert' },
    irs_5472: { t: 'About Form 5472 (25% foreign-owned US corporations and foreign-owned disregarded LLCs)', p: 'IRS', u: 'https://www.irs.gov/forms-pubs/about-form-5472', type: 'official' },
    pt_csc: { t: 'Código das Sociedades Comerciais (Lda arts. 197–270-G; SA arts. 271 ff.; audit art. 262)', p: 'Diário da República', u: 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1986-34443975', type: 'law' },
    pt_rcbe: { t: 'Registo Central do Beneficiário Efetivo (RCBE)', p: 'Ministério da Justiça', u: 'https://rcbe.justica.gov.pt/', type: 'official' },

    /* personal & dividend tax, compliance */
    de_estg32a: { t: '§32a EStG – income tax scale', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/estg/__32a.html', type: 'law' },
    de_estg32d: { t: '§32d EStG – flat tax on investment income (incl. option for partial-income method)', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/estg/__32d.html', type: 'law' },
    de_hgb267: { t: '§§267, 316 HGB – size classes and statutory audit', p: 'Federal Ministry of Justice', u: 'https://www.gesetze-im-internet.de/hgb/__267.html', type: 'law' },
    pwc_ch_ind: { t: 'Switzerland – taxes on personal income', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/switzerland/individual/taxes-on-personal-income', type: 'expert' },
    pwc_ch_wht: { t: 'Switzerland – withholding taxes (35% and treaty rates)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/switzerland/corporate/withholding-taxes', type: 'expert' },
    pwc_li_ind: { t: 'Liechtenstein – taxes on personal income (1–8% national scale, 150–180% municipal surcharge)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/liechtenstein/individual/taxes-on-personal-income', type: 'expert' },
    pwc_li_wht: { t: 'Liechtenstein – withholding taxes', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/liechtenstein/corporate/withholding-taxes', type: 'expert' },
    uk_it: { t: 'Income Tax rates and Personal Allowances', p: 'GOV.UK', u: 'https://www.gov.uk/income-tax-rates', type: 'official' },
    uk_div: { t: 'Tax on dividends', p: 'GOV.UK', u: 'https://www.gov.uk/tax-on-dividends', type: 'official' },
    uk_audit: { t: 'Audit exemptions for private limited companies', p: 'GOV.UK', u: 'https://www.gov.uk/audit-exemptions-for-private-limited-companies', type: 'official' },
    uk_idv: { t: 'Verifying your identity for Companies House (mandatory from 18 Nov 2025)', p: 'Companies House / GOV.UK', u: 'https://www.gov.uk/guidance/verifying-your-identity-for-companies-house', type: 'official' },
    us_brackets: { t: 'Federal income tax rates and brackets', p: 'IRS', u: 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets', type: 'official' },
    us_boi: { t: 'Beneficial Ownership Information reporting (US companies exempt since March 2025)', p: 'FinCEN', u: 'https://www.fincen.gov/boi', type: 'official' },
    pwc_us_wht: { t: 'United States – withholding taxes (30% and treaty rates)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/united-states/corporate/withholding-taxes', type: 'expert' },
    pt_irs_jovem: { t: 'Portugal – Significant developments (IRS Jovem extended by the 2025 State Budget)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/Portugal/Individual/Significant-developments', type: 'expert' },
    pt_irs26: { t: 'Portugal – Taxes on personal income (2026 rates)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/portugal/individual/taxes-on-personal-income', type: 'expert' },
    pt_ifici: { t: 'Portaria 352/2024/1 – IFICI (art. 58-A EBF, 20% special rate)', p: 'Autoridade Tributária', u: 'https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Portaria_352_2024_1.pdf', type: 'law' },
    pwc_pt_wht: { t: 'Portugal – withholding taxes (25% and treaty rates)', p: 'PwC Worldwide Tax Summaries', u: 'https://taxsummaries.pwc.com/portugal/corporate/withholding-taxes', type: 'expert' },

    /* TUM T18 reading list */
    cr_se: { t: 'Your Europe – Setting up a European company (SE)', p: 'European Commission', u: 'https://europa.eu/youreurope/business/running-business/developing-business/setting-up-european-company/index_en.htm', type: 'official' },
    cr_multi: { t: 'How to register a company in multiple countries', p: 'Open a European Company', u: 'https://www.openaeuropeancompany.com/blog/how-to-register-a-company-in-multiple-countries/', type: 'expert' },
    cr_usacorp: { t: 'How to start a US business as a non-resident', p: 'USA Corporate Services', u: 'https://www.usa-corporate.com/start-us-company-non-resident/how-to-start-business/', type: 'expert' },
    cr_usagov: { t: 'Start a business', p: 'USA.gov', u: 'https://www.usa.gov/start-business', type: 'official' },
    cr_nordichq: { t: 'List of legal entity types by country in Europe', p: 'NordicHQ', u: 'https://web.archive.org/web/2025/https://www.nordichq.com/guides/list-of-legal-entity-types-by-country-in-europe/', type: 'expert' }
  };

  /* ---------------------------------------------------------------------------------------------
   * 4. Legal forms
   * ------------------------------------------------------------------------------------------- */
  var LEGAL_FORMS = {
    DE: [
      { id: 'ug', name: 'UG (haftungsbeschränkt)', local: 'Unternehmergesellschaft (haftungsbeschränkt)', typical: false,
        minCapital: { amount: 1, currency: 'EUR', eur: 1, paidInEur: 1, text: 'From €1, paid in cash in full; retain 25% of annual profit until reserves reach €25,000' },
        liability: 'Limited to company assets; shareholders risk only their contribution. Directors can be personally liable for late insolvency filing or unpaid social-security contributions.',
        notary: true, notaryText: 'Notarised deed required (in person, or by video since Aug 2022); cheapest with the statutory model protocol (≤ 3 shareholders, 1 director).',
        profitTax: '≈ 30% (15.8% corporate tax incl. solidarity surcharge + ≈ 14% trade tax)',
        setupDays: { min: 5, max: 21 }, setupCostEur: { min: 300, max: 800 }, steps: 7,
        note: '“Mini-GmbH”: same law (§5a GmbHG) and tax as a GmbH. Low initial credibility with banks/suppliers; becomes a GmbH at €25,000 capital. Steps: notary deed → bank account & capital → notary files register → Handelsregister entry → trade registration (Gewerbeamt) → tax registration (ELSTER) → employer registration (BA number, Berufsgenossenschaft).',
        sources: ['gmbhg', 'dirug', 'de_gnotkg'], confidence: 'high' },
      { id: 'gmbh', name: 'GmbH', local: 'Gesellschaft mit beschränkter Haftung', typical: true,
        minCapital: { amount: 25000, currency: 'EUR', eur: 25000, paidInEur: 12500, text: '€25,000; ≥ €12,500 (and 25% of each share) paid in before registration' },
        liability: 'Limited to company assets. Shareholders liable only for unpaid contributions; directors personally liable for breach of duty (§43 GmbHG), late insolvency filing, unpaid social-security contributions.',
        notary: true, notaryText: 'Articles and share transfers must be notarised (§§2, 15 GmbHG); video notarisation possible since Aug 2022.',
        profitTax: '≈ 30% (15.8% corporate tax incl. solidarity surcharge + ≈ 14% trade tax); CIT falls to 10% by 2032',
        setupDays: { min: 7, max: 28 }, setupCostEur: { min: 700, max: 1500 }, steps: 7,
        note: 'Default German start-up vehicle; VCs expect it. Costs: notary + register fees (scale with capital, GNotKG) + trade registration; lawyer-drafted articles for several founders +€1–3k. Notary is the bottleneck: slower and costlier than UK/US/PT online filing, but legally very certain.',
        sources: ['gmbhg', 'dirug', 'ihk_online', 'de_gnotkg', 'cr_nordichq', 'eu_sm'], confidence: 'high' },
      { id: 'ag', name: 'AG', local: 'Aktiengesellschaft', typical: false,
        minCapital: { amount: 50000, currency: 'EUR', eur: 50000, paidInEur: 12500, text: '€50,000; ≥ 25% of nominal value (+ any premium) paid in' },
        liability: 'Limited to company assets; management board and supervisory board personally liable for breaches of duty.',
        notary: true, notaryText: 'Notarised articles; formation audit (Gründungsprüfung) and supervisory board (≥ 3 members) required.',
        profitTax: 'Same as GmbH (≈ 30%)',
        setupDays: { min: 21, max: 60 }, setupCostEur: { min: 3000, max: 10000 }, steps: 9,
        note: 'Rare at founding; for later stages or an IPO. Heavier governance (management board, supervisory board, AGM). Cross-border groups: SE (European company, min. €120,000 capital) works EU-wide.',
        sources: ['de_aktg', 'cr_se'], confidence: 'medium' }
    ],
    CH: [
      { id: 'gmbh', name: 'GmbH / Sàrl', local: 'Gesellschaft mit beschränkter Haftung', typical: true,
        minCapital: { amount: 20000, currency: 'CHF', eur: 21500, paidInEur: 21500, text: 'CHF 20,000, fully paid in at formation' },
        liability: 'Limited to company assets. Articles may require additional contributions; managing directors liable for breach of duty and, in practice, unpaid AHV contributions.',
        notary: true, notaryText: 'Public deed (öffentliche Urkunde) before a notary, then commercial-register entry.',
        profitTax: '≈ 12–21% depending on canton (Zug 11.85%, Zurich 19.61%)',
        setupDays: { min: 7, max: 21 }, setupCostEur: { min: 1600, max: 4800 }, steps: 6,
        note: '≥ 1 director with signing authority must live in Switzerland. Steps: articles & deed → blocked capital account → commercial register → AHV fund → accident insurance (UVG) → VAT from CHF 100k turnover. Shareholders are listed in the public register.',
        sources: ['kmu_gmbh', 'postfinance_gmbh', 'ch_or'], confidence: 'medium' },
      { id: 'ag', name: 'AG / SA', local: 'Aktiengesellschaft', typical: false,
        minCapital: { amount: 100000, currency: 'CHF', eur: 107500, paidInEur: 53800, text: 'CHF 100,000; ≥ 20% per share and CHF 50,000 in total paid in' },
        liability: 'Limited to company assets; board of directors liable for breach of duty (Art. 754 OR).',
        notary: true, notaryText: 'Public deed before a notary.',
        profitTax: 'Same as GmbH (≈ 12–21% by canton)',
        setupDays: { min: 7, max: 28 }, setupCostEur: { min: 2200, max: 5400 }, steps: 6,
        note: 'Preferred by many VC-backed Swiss start-ups: anonymous shareholders, share transfers without a notary. One board member with signing authority must live in Switzerland.',
        sources: ['ch_or'], confidence: 'medium' }
    ],
    LI: [
      { id: 'gmbh', name: 'GmbH', local: 'Gesellschaft mit beschränkter Haftung', typical: true,
        minCapital: { amount: 10000, currency: 'CHF', eur: 10750, paidInEur: 10750, text: 'CHF 10,000 (or EUR/USD 10,000), fully paid in' },
        liability: 'Limited to company assets.',
        notary: true, notaryText: 'Written articles with certified signatures plus bank confirmation of capital; usually prepared by a licensed trustee/lawyer.',
        profitTax: '12.5% flat (minimum tax CHF 1,800/yr, creditable)',
        setupDays: { min: 10, max: 30 }, setupCostEur: { min: 2500, max: 6000 }, steps: 7,
        note: 'Operating businesses need a trade licence (Gewerbebewilligung) with a qualified director resident in Liechtenstein/EEA; Art. 180a PGR may require a locally licensed board member. Costs: adviser estimate (low certainty).',
        sources: ['li_gmbh', 'li_180a', 'li_bmf'], confidence: 'low' },
      { id: 'ag', name: 'AG', local: 'Aktiengesellschaft', typical: false,
        minCapital: { amount: 50000, currency: 'CHF', eur: 53800, paidInEur: 53800, text: 'CHF 50,000 (or EUR/USD), fully paid in at formation' },
        liability: 'Limited to company assets; board liable for breach of duty.',
        notary: true, notaryText: 'Articles with certified signatures; usually formed via a licensed trustee.',
        profitTax: '12.5% flat (minimum tax CHF 1,800/yr)',
        setupDays: { min: 10, max: 30 }, setupCostEur: { min: 3000, max: 8000 }, steps: 7,
        note: 'Most common Liechtenstein company form. Same local-director and trade-licence requirements as the GmbH.',
        sources: ['li_bmf', 'gt_li_ag', 'li_180a'], confidence: 'medium' },
      { id: 'anstalt', name: 'Anstalt (Establishment)', local: 'Anstalt', typical: false,
        minCapital: { amount: 30000, currency: 'CHF', eur: 32300, paidInEur: 32300, text: 'CHF 30,000' },
        liability: 'Limited to the establishment’s assets.',
        notary: true, notaryText: 'Formation deed via a licensed trustee; exists from registration.',
        profitTax: '12.5% flat',
        setupDays: { min: 10, max: 30 }, setupCostEur: { min: 3000, max: 8000 }, steps: 6,
        note: 'Liechtenstein-specific form with founder’s rights instead of shareholders. Used for holding and asset structures; unusual for VC-backed start-ups.',
        sources: ['li_bmf'], confidence: 'medium' }
    ],
    UK: [
      { id: 'ltd', name: 'Private limited company (Ltd)', local: 'Private company limited by shares', typical: true,
        minCapital: { amount: 0, currency: 'GBP', eur: 0, paidInEur: 0, text: 'No minimum (often £1 or £100 in total)' },
        liability: 'Limited to unpaid share capital; directors liable for wrongful/fraudulent trading and can be disqualified.',
        notary: false, notaryText: 'No notary; online incorporation at Companies House. Identity verification for directors and PSCs mandatory since 18 Nov 2025.',
        profitTax: '19% (profits ≤ £50k) to 25% (> £250k)',
        setupDays: { min: 1, max: 3 }, setupCostEur: { min: 115, max: 400 }, steps: 3,
        note: 'Fastest and cheapest of the six: £100 online fee (since Feb 2026), registered usually within 24 hours. Steps: ID verification → online incorporation (includes Corporation Tax registration) → PAYE before first payday. Main delay for non-residents: bank account.',
        sources: ['uk_ltd', 'ch_fees', 'uk_idv', 'uk_ct'], confidence: 'high' },
      { id: 'llp', name: 'Limited liability partnership (LLP)', local: 'LLP', typical: false,
        minCapital: { amount: 0, currency: 'GBP', eur: 0, paidInEur: 0, text: 'No minimum' },
        liability: 'Members’ liability limited; the LLP itself is liable.',
        notary: false, notaryText: 'Online registration at Companies House; ≥ 2 designated members.',
        profitTax: 'Tax-transparent: members pay income tax on their profit share',
        setupDays: { min: 1, max: 3 }, setupCostEur: { min: 115, max: 400 }, steps: 3,
        note: 'Used by professional firms; unsuitable for equity investment (no shares, no EMI/SEIS).',
        sources: ['uk_llp'], confidence: 'medium' }
    ],
    US: [
      { id: 'ccorp', name: 'Delaware C-Corporation', local: 'Delaware corporation', typical: true,
        minCapital: { amount: 0, currency: 'USD', eur: 0, paidInEur: 0, text: 'No minimum (founder shares bought at nominal value)' },
        liability: 'Limited to company assets (corporate veil); directors protected by the business-judgment rule.',
        notary: false, notaryText: 'No notary; certificate of incorporation filed online via a Delaware registered agent.',
        profitTax: '21% federal + state tax where the business operates (0–11.5%)',
        setupDays: { min: 1, max: 30 }, setupCostEur: { min: 300, max: 1500 }, steps: 5,
        note: 'Standard for VC-backed start-ups (QSBS, ISOs, YC/SAFE documents). Incorporation 1–2 days; EIN for non-US founders without SSN can take weeks. Steps: registered agent + certificate of incorporation → bylaws, board consent, founder stock + 83(b) within 30 days → EIN → foreign qualification in the operating state → bank account. Delaware fees changed 1 Aug 2026 (HB 400).',
        sources: ['de_corp_fees', 'de_hb400', 'irs_ein', 'irs_83b', 'cr_usagov', 'cr_usacorp'], confidence: 'medium' },
      { id: 'llc', name: 'LLC (Delaware or Wyoming)', local: 'Limited liability company', typical: false,
        minCapital: { amount: 0, currency: 'USD', eur: 0, paidInEur: 0, text: 'No minimum' },
        liability: 'Members’ liability limited to their investment.',
        notary: false, notaryText: 'No notary; certificate of formation filed online.',
        profitTax: 'Pass-through by default (members taxed); corporate taxation optional',
        setupDays: { min: 1, max: 30 }, setupCostEur: { min: 200, max: 1000 }, steps: 4,
        note: 'Cheap, flexible for bootstrapped or holding businesses; VCs generally require a C-Corp. Delaware LLC annual tax $300 → $400 from 1 Aug 2026. Foreign-owned single-member LLCs must file Form 5472 (penalty $25,000).',
        sources: ['de_llctax', 'de_hb400', 'irs_5472'], confidence: 'medium' }
    ],
    PT: [
      { id: 'lda', name: 'Lda', local: 'Sociedade por quotas', typical: true,
        minCapital: { amount: 2, currency: 'EUR', eur: 2, paidInEur: 2, text: '≥ €1 per quota (e.g. €2 for two founders); payment can be deferred to the end of the first financial year' },
        liability: 'Limited to company assets; partners liable only for their quotas. Managers liable for breach of duty and, subsidiarily, for unpaid tax/social-security debts.',
        notary: false, notaryText: 'No notary via “Empresa na Hora” (pre-approved name and articles) or the online “Empresa Online” service.',
        profitTax: '19% IRC in 2026 (15% on the first €50k for SMEs/start-ups) + municipal surcharge up to 1.5%',
        setupDays: { min: 1, max: 5 }, setupCostEur: { min: 360, max: 600 }, steps: 4,
        note: 'Formed in one day at an “Empresa na Hora” desk for €360 (registration, publication, tax number). Then: start-of-activity declaration (tax authority), social-security registration; RCBE beneficial-owner declaration within 30 days. Certified accountant mandatory.',
        sources: ['pt_lda', 'pt_enh', 'pt_csc', 'pt_rcbe', 'pt_irc26', 'cr_nordichq'], confidence: 'high' },
      { id: 'unipessoal', name: 'Lda Unipessoal', local: 'Sociedade unipessoal por quotas', typical: false,
        minCapital: { amount: 1, currency: 'EUR', eur: 1, paidInEur: 1, text: 'From €1 (single quota)' },
        liability: 'Limited to company assets; one natural person may own only one unipessoal company.',
        notary: false, notaryText: 'Same as Lda (online/Empresa na Hora).',
        profitTax: 'Same as Lda',
        setupDays: { min: 1, max: 5 }, setupCostEur: { min: 360, max: 600 }, steps: 4,
        note: 'Single-founder Lda; becomes a normal Lda once a second partner joins.',
        sources: ['pt_lda', 'pt_csc'], confidence: 'high' },
      { id: 'sa', name: 'SA', local: 'Sociedade anónima', typical: false,
        minCapital: { amount: 50000, currency: 'EUR', eur: 50000, paidInEur: 15000, text: '€50,000; up to 70% of cash deferrable 5 years (≥ €15,000 paid in)' },
        liability: 'Limited to company assets; board liable for breach of duty.',
        notary: false, notaryText: 'Empresa na Hora/online; usually 5+ shareholders (or one corporate shareholder).',
        profitTax: 'Same as Lda',
        setupDays: { min: 1, max: 14 }, setupCostEur: { min: 360, max: 2000 }, steps: 5,
        note: 'Supervisory body/auditor mandatory; for larger, investor-backed companies.',
        sources: ['pt_csc'], confidence: 'medium' }
    ]
  };

  /* ---------------------------------------------------------------------------------------------
   * 5. First-year cost for the typical form (EUR)
   * ------------------------------------------------------------------------------------------- */
  function item(id, label, eur, oneOff, note, sources) {
    return { id: id, label: label, eur: eur, oneOff: oneOff, note: note, sources: sources };
  }
  var L = { registration: 'Registration & official fees', notary: 'Notary / formation deed', capitalLocked: 'Paid-in share capital (not a cost)',
    agent: 'Registered agent / local director', accounting: 'Bookkeeping & annual accounts', compliance: 'Annual fees, taxes & filings',
    payrollPerEmployee: 'Employer on-costs per €60k employee' };

  var FIRST_YEAR_COST = {
    DE: { currency: 'EUR', note: 'GmbH, €25,000 capital, Steuerberater. Notary/register fees per statutory GNotKG schedule. UG with model protocol: ≈ €300–500 total. IHK fee varies by profit and chamber.',
      items: [
        item('registration', L.registration, 250, true, 'Handelsregister ≈ €150–200 + trade registration ≈ €20–60.', ['gmbhg', 'de_gnotkg']),
        item('notary', L.notary, 800, true, 'Notarised articles, shareholder list, filing: ≈ €600–1,000 (standard GmbH); more with custom articles.', ['de_gnotkg', 'dirug']),
        item('capitalLocked', L.capitalLocked, 12500, true, '≥ €12,500 of €25,000 paid in before registration; spendable afterwards.', ['gmbhg']),
        item('agent', L.agent, 0, false, 'None; German address required (virtual office ≈ €300–1,000/yr if you have none).', ['gmbhg']),
        item('accounting', L.accounting, 4000, false, 'Double-entry books, HGB accounts, tax returns via Steuerberater ≈ €2,500–6,000/yr.', ['de_hgb267']),
        item('compliance', L.compliance, 300, false, 'IHK (small GmbH ≈ €150–300), Transparenz-/Unternehmensregister fees, Berufsgenossenschaft minimum.', ['ihk_online']),
        item('payrollPerEmployee', L.payrollPerEmployee, 13400, false, '≈ 22.3% of €60,000 (see payroll criterion).', ['de_sv26'])
      ] },
    CH: { currency: 'EUR', note: 'GmbH, mid-tax canton; €1 ≈ CHF 0.93. Non-resident founders need a Swiss-resident managing director (nominee ≈ CHF 3–10k/yr, excluded).',
      items: [
        item('registration', L.registration, 700, true, 'Commercial register ≈ CHF 600 + SOGC publication.', ['kmu_gmbh']),
        item('notary', L.notary, 1500, true, 'Public deed + capital-deposit confirmation ≈ CHF 1,000–2,500 (by canton).', ['postfinance_gmbh']),
        item('capitalLocked', L.capitalLocked, 21500, true, 'CHF 20,000 fully paid in; released after registration.', ['ch_or']),
        item('agent', L.agent, 0, false, 'None if a founder lives in CH (else domicile ≈ CHF 500–1,500/yr).', ['kmu_gmbh']),
        item('accounting', L.accounting, 4300, false, 'Books, accounts, tax return via fiduciary ≈ CHF 2,500–6,000/yr; audit opt-out ≤ 10 FTE.', ['ch_or']),
        item('compliance', L.compliance, 300, false, 'Cantonal capital tax, minor fees; VAT from CHF 100k turnover.', ['kpmg_ch']),
        item('payrollPerEmployee', L.payrollPerEmployee, 6300, false, '≈ 10.5% of €60,000 (see payroll criterion).', ['ch_ahv26'])
      ] },
    LI: { currency: 'EUR', note: 'GmbH with licensed local director/trustee; €1 ≈ CHF 0.93. Trustee/director fees vary widely; adviser estimates (low confidence).',
      items: [
        item('registration', L.registration, 800, true, 'Commercial register and trade-licence fees (est.).', ['li_gmbh']),
        item('notary', L.notary, 2500, true, 'Trustee/lawyer formation incl. certification ≈ CHF 2,000–5,000 (est.).', ['li_gmbh']),
        item('capitalLocked', L.capitalLocked, 10750, true, 'CHF 10,000 fully paid in.', ['li_gmbh']),
        item('agent', L.agent, 8000, false, 'Qualified local director / Art. 180a board member ≈ CHF 5,000–15,000/yr (est.); only if no founder qualifies.', ['li_180a']),
        item('accounting', L.accounting, 5000, false, 'Books, accounts, tax return; Revisionsstelle (auditor) often required (est.).', ['gt_li']),
        item('compliance', L.compliance, 1900, false, 'Minimum tax CHF 1,800/yr, creditable against profit tax; small operating companies with assets ≤ CHF 500k exempt.', ['pwc_li']),
        item('payrollPerEmployee', L.payrollPerEmployee, 9900, false, '≈ 16.5% of €60,000 (see payroll criterion).', ['li_payroll26'])
      ] },
    UK: { currency: 'EUR', note: 'Ltd, online accountant; €1 ≈ £0.87. Employment Allowance (£10,500 off employer NIC) can make the first hire much cheaper.',
      items: [
        item('registration', L.registration, 115, true, '£100 online incorporation (since 1 Feb 2026).', ['ch_fees']),
        item('notary', L.notary, 0, true, 'No notary.', ['uk_ltd']),
        item('capitalLocked', L.capitalLocked, 0, true, 'No minimum capital.', ['uk_ltd']),
        item('agent', L.agent, 150, false, 'Optional registered office ≈ £50–200/yr.', ['uk_ltd']),
        item('accounting', L.accounting, 2300, false, 'Books, statutory accounts, CT600 ≈ £1,200–3,000/yr; small companies audit-exempt.', ['uk_audit']),
        item('compliance', L.compliance, 60, false, 'Confirmation statement £50/yr (from Feb 2026).', ['ch_fees']),
        item('payrollPerEmployee', L.payrollPerEmployee, 9700, false, '≈ 16.1% of €60,000 before Employment Allowance (see payroll criterion).', ['uk_rates26'])
      ] },
    US: { currency: 'EUR', note: 'Delaware C-Corp via formation service, operating in one other state; €1 ≈ $1.16. Excludes health insurance and foreign-qualification fees in your operating state (e.g. California: $800 minimum franchise tax).',
      items: [
        item('registration', L.registration, 300, true, 'Delaware filing fee (≈ $109+ from Aug 2026) + service/expedite fees; EIN free.', ['de_corp_fees', 'de_hb400', 'irs_ein']),
        item('notary', L.notary, 0, true, 'No notary.', ['cr_usagov']),
        item('capitalLocked', L.capitalLocked, 0, true, 'No minimum; founder stock bought at a nominal amount.', ['cr_usacorp']),
        item('agent', L.agent, 200, false, 'Delaware registered agent ≈ $50–300/yr (mandatory).', ['cr_usacorp']),
        item('accounting', L.accounting, 3000, false, 'Books, Form 1120 + state returns ≈ $2,000–5,000/yr; Form 5472 if ≥ 25% foreign-owned.', ['irs_5472']),
        item('compliance', L.compliance, 400, false, 'Delaware franchise tax ≈ $400 (assumed-par-value method, typical start-up) + $50 annual report; due 1 March.', ['de_frtax']),
        item('payrollPerEmployee', L.payrollPerEmployee, 5000, false, '≈ 8.3% of €60,000 statutory; health insurance adds ≈ €6,800 (see payroll criterion).', ['us_ssa26', 'kff_ehbs25'])
      ] },
    PT: { currency: 'EUR', note: 'Lda via Empresa na Hora, certified accountant. Many founders voluntarily pay in €1,000–5,000 for credibility.',
      items: [
        item('registration', L.registration, 360, true, 'Empresa na Hora flat fee (registration, publication, tax number).', ['pt_enh', 'pt_lda']),
        item('notary', L.notary, 0, true, 'No notary.', ['pt_lda']),
        item('capitalLocked', L.capitalLocked, 2, true, '€1 per quota minimum.', ['pt_lda']),
        item('agent', L.agent, 0, false, 'None for resident founders; non-residents need a Portuguese tax representative for their personal NIF.', ['pt_lda']),
        item('accounting', L.accounting, 2000, false, 'Contabilista certificado mandatory ≈ €100–250/month.', ['pt_csc']),
        item('compliance', L.compliance, 100, false, 'Annual IES, RCBE (free), SAF-T; mostly done by the accountant.', ['pt_rcbe']),
        item('payrollPerEmployee', L.payrollPerEmployee, 14900, false, '≈ 24.8% of €60,000 (see payroll criterion).', ['pt_ss26'])
      ] }
  };

  /* ---------------------------------------------------------------------------------------------
   * 6. Tax facts for founders
   * ------------------------------------------------------------------------------------------- */
  var TAX_FACTS = {
    DE: {
      personal: { value: 'Income tax 14–45% (+ 5.5% solidarity surcharge on high incomes, + church tax for members); no founder/expat regime',
        note: '2026 allowance €12,348; 42% from ≈ €70k, 45% from ≈ €278k taxable (§32a EStG). Top marginal ≈ 47.5% incl. solidarity surcharge. No expat/young-founder regime.',
        sources: ['de_estg32a'], confidence: 'high' },
      dividend: { value: '26.375% flat dividend tax (or 60% taxed at personal rate); German holders of foreign companies: see country',
        note: 'Private stake: 25% flat + solidarity surcharge = 26.375% (§32d EStG). ≥ 25% holders (or ≥ 1% and working there) can opt for partial-income method. Via holding GmbH: 95% exempt (≈ 1.5% tax). Non-resident withholding 26.375%, treaty-reduced.',
        sources: ['de_estg32d', 'kstg8b'], confidence: 'high' },
      compliance: { value: 'Double-entry bookkeeping (HGB), accounts published; audit only for medium/large companies',
        note: 'Small GmbH (under at least 2 of 3 thresholds: €7.5m balance sheet, €15m turnover, 50 staff): no audit; accounts filed with company register. E-invoice receipt mandatory since 2025. Transparency register now fed from commercial register.',
        sources: ['de_hgb267'], confidence: 'high' }
    },
    CH: {
      personal: { value: 'Federal max 11.5% + cantonal/communal → top rate ≈ 22% (Zug) to ≈ 45% (Geneva)',
        note: 'Confederation, canton and municipality tax income; residence canton outweighs federal rate. Annual wealth tax on shares. No founder expat regime (lump-sum taxation excludes gainful work).',
        sources: ['pwc_ch_ind'], confidence: 'medium' },
      dividend: { value: 'Stakes ≥ 10%: 70% taxed federally, ≥ 50% cantonally; 35% withholding, 15% final for German residents',
        note: '35% dividend withholding (refundable to Swiss residents). German residents reclaim 20 points (DE–CH treaty); 15% credited in Germany. Lower for corporate holders.',
        sources: ['pwc_ch_wht', 'pwc_ch_ind'], confidence: 'high' },
      compliance: { value: 'Limited audit, or opt-out (≤ 10 FTE, all shareholders consent); VAT from CHF 100k turnover',
        note: 'Ordinary audit only above 2 of CHF 20m assets, CHF 40m revenue, 250 FTE (Art. 727 OR). Small companies can opt out fully. Accounts not public.',
        sources: ['ch_or'], confidence: 'high' }
    },
    LI: {
      personal: { value: 'National 1–8% × municipal surcharge 150–180% → max ≈ 22.4%',
        note: 'Progressive national rate up to 8% + municipal surcharge. No capital-gains tax; 4% notional return on net wealth added to taxable income. No founder/expat regime. EEA residence permits quota-limited.',
        sources: ['pwc_li_ind', 'li_steg'], confidence: 'medium' },
      dividend: { value: 'Dividends tax-free for residents; no withholding (German holders pay German tax only)',
        note: 'Since 2011: no dividend withholding; dividends exempt for individuals (wealth taxed via notional return). German residents pay 26.375% German flat tax.',
        sources: ['pwc_li_wht', 'gt_li'], confidence: 'medium' },
      compliance: { value: 'Minimum tax CHF 1,800/yr; auditor usually required; local qualified-director rules',
        note: 'Annual accounts, tax return. Companies with assets ≤ CHF 500k exempt from minimum tax. Art. 180a PGR board and trade-licence rules require local substance. Small-company audit waiver unverified (low certainty).',
        sources: ['pwc_li', 'li_180a'], confidence: 'low' }
    },
    UK: {
      personal: { value: 'Income tax 20/40/45% (Scotland differs); new arrivals: 4-year foreign income/gains exemption',
        note: 'Allowance £12,570 (frozen); higher rate from £50,270, additional from £125,140. Non-dom regime replaced April 2025: 4-year foreign income/gains exemption after 10 years non-residence. Helps foreign founders; UK-source salary/dividends stay taxable.',
        sources: ['uk_it'], confidence: 'high' },
      dividend: { value: 'Dividend tax 10.75/35.75/39.35% above £500 allowance; no withholding',
        note: 'Basic and higher dividend rates +2 points from 6 April 2026. No UK dividend withholding; German residents pay German tax only.',
        sources: ['uk_div'], confidence: 'high' },
      compliance: { value: 'Small-company audit exemption; accounts + confirmation statement; director ID checks (2025)',
        note: 'Audit-exempt below 2 of £15m turnover, £7.5m assets, 50 staff (raised April 2025). Accounts public (Companies House). ID verification: new directors and PSCs since 18 Nov 2025; existing directors at next confirmation statement.',
        sources: ['uk_audit', 'uk_idv'], confidence: 'high' }
    },
    US: {
      personal: { value: 'Federal 10–37% + state 0–13.3% (+ city); citizens taxed worldwide',
        note: 'Federal brackets permanent since 2025 OBBBA. State tax 0% (Texas, Florida) to 13.3% (California), plus e.g. NYC tax. Non-residents pay US tax only on US-source income; Delaware incorporation alone does not change that.',
        sources: ['us_brackets', 'irs_abroad'], confidence: 'high' },
      dividend: { value: 'Qualified dividends 0/15/20% + 3.8% NIIT; 30% withholding, 15% for German residents (treaty)',
        note: 'Double taxation: 21% corporate + dividend tax. German-resident individuals: 15% US withholding (DE–US treaty; 5% for ≥ 10% corporate holders), credited in Germany.',
        sources: ['pwc_us_wht', 'us_brackets'], confidence: 'high' },
      compliance: { value: 'No audit for private companies; Delaware franchise tax + annual report; no BOI filing for US companies',
        note: 'Form 1120, state returns, Delaware report by 1 March, Form 5472 if ≥ 25% foreign-owned. BOI: FinCEN exempted US companies and US persons (March 2025, final 2026); only foreign companies registered in a US state file.',
        sources: ['de_frtax', 'irs_5472', 'us_boi'], confidence: 'medium' }
    },
    PT: {
      personal: { value: 'IRS 12.5–48% (+ 2.5/5% solidarity surcharge); IRS Jovem under 35; IFICI (“NHR 2.0”) 20% flat, 10 years',
        note: 'IRS Jovem: age ≤ 35; work/business income partly exempt up to 10 years (100% in year 1, down to 25%; cap 55 × IAS). IFICI (art. 58-A EBF): new residents (none in prior 5 years) in qualifying innovation roles, incl. certified start-ups: 20% on qualifying Portuguese salary/business income for 10 years; most foreign income exempt.',
        sources: ['pt_irs26', 'pt_irs_jovem', 'pt_ifici'], confidence: 'medium' },
      dividend: { value: '28% flat on dividends (or 50% taxed progressively); 25% withholding, 15% for German residents',
        note: 'Residents: 28% final, or add 50% of dividend to income. Non-residents: 25% withholding, 15% under DE–PT treaty, credited in Germany.',
        sources: ['pwc_pt_wht', 'pt_irs26'], confidence: 'high' },
      compliance: { value: 'Certified accountant mandatory; SAF-T & IES; audit only above 2 of €1.5m assets / €3m revenue / 50 staff',
        note: 'Every Lda: books via contabilista certificado, annual IES. Auditor only after size thresholds exceeded two years (art. 262 CSC). RCBE beneficial-owner filing within 30 days of formation and on changes.',
        sources: ['pt_csc', 'pt_rcbe'], confidence: 'medium' }
    }
  };

  /* ---------------------------------------------------------------------------------------------
   * 7. TUM T18 course reading list
   * ------------------------------------------------------------------------------------------- */
  var COURSE_READING = [
    { t: 'Your Europe – Setting up a European company (SE)', u: 'https://europa.eu/youreurope/business/running-business/developing-business/setting-up-european-company/index_en.htm' },
    { t: 'Open a European Company – How to register a company in multiple countries', u: 'https://www.openaeuropeancompany.com/blog/how-to-register-a-company-in-multiple-countries/' },
    { t: 'Your Europe – Starting a business in the EU', u: 'https://europa.eu/youreurope/business/running-business/start-ups/starting-business/index_en.htm' },
    { t: 'USA Corporate Services – How to start a US company as a non-resident', u: 'https://www.usa-corporate.com/start-us-company-non-resident/how-to-start-business/' },
    { t: 'USA.gov – Start a business', u: 'https://www.usa.gov/start-business' },
    { t: 'NordicHQ – List of legal entity types by country in Europe (archived copy; original page removed)', u: 'https://web.archive.org/web/2025/https://www.nordichq.com/guides/list-of-legal-entity-types-by-country-in-europe/' }
  ];

  var api = {
    EXTRA_CRITERIA: EXTRA_CRITERIA, EXTRA_SCORES: EXTRA_SCORES, EXTRA_SOURCES: EXTRA_SOURCES,
    LEGAL_FORMS: LEGAL_FORMS, FIRST_YEAR_COST: FIRST_YEAR_COST, TAX_FACTS: TAX_FACTS, COURSE_READING: COURSE_READING
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSN_FACTS = api;
})(this);
