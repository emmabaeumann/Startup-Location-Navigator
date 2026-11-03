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
      info: 'What a company pays on top of each employee’s gross salary: the employer’s share of social security (pension, health, unemployment, accident, family funds) and other mandatory employer insurances. To compare like with like we use one full-time employee earning €60,000 gross a year (2026 rates; converted at ≈ CHF 0.93, £0.87, $1.16 per €), age 35–44. Voluntary benefits are not counted.',
      anchors: 'Employer on-cost as % of a €60,000 gross salary: 5 ≤ 10% · 4 ≤ 15% · 3 ≤ 20% · 2 ≤ 25% · 1 > 25%' },
    { id: 'rnd', after: 'grants', name: 'Generous R&D tax incentives', short: 'R&D incentives',
      hint: 'Tax credits / super-deductions for R&D spend',
      info: 'How much of its research and development spending a company gets back through the tax system (R&D tax credits, enhanced deductions, patent boxes) – and whether a loss-making start-up can actually receive it in cash, or only once it pays profit tax.',
      anchors: '5 = benefit ≥ 25% of qualifying R&D spend and paid out in cash to loss-making start-ups · 4 = ≥ 15% and payable/offsettable for loss-makers, or ≥ 30% but only against future profit tax · 3 = ≤ 15% effective or limited use for loss-makers · 2 = enhanced deduction / patent box only at regional level, nothing in cash · 1 = no R&D-specific tax incentive' }
  ];

  /* ---------------------------------------------------------------------------------------------
   * 2. Scores for the new criteria
   * ------------------------------------------------------------------------------------------- */
  var EXTRA_SCORES = {
    DE: {
      labor: { score: 2, value: '≈ 22% on €60k (≈ €13,400): pension 9.3% + health 8.75% + care 1.8% + unemployment 1.3% + accident/levies',
        note: 'Employer shares 2026: pension 9.3% and unemployment 1.3% (ceiling €101,400/yr), health 7.3% + half the average additional contribution of 2.9% = 8.75% and long-term care 1.8% (ceiling €69,750/yr). €60k is below both ceilings, so the full rate applies: 21.15%. On top: statutory accident insurance (Berufsgenossenschaft, employer-only, ≈ 0.5–1% for office work), insolvency levy U3 (0.15%) and maternity levy U2 (≈ 0.4%) → ≈ 22.3%. Firms with ≤ 30 staff also pay the sick-pay levy U1 (≈ 1.5–3%, which reimburses sick pay) → up to ≈ 24%. Health add-on varies by insurer.',
        sources: ['de_sv26', 'de_sv_tk'], confidence: 'high' },
      rnd: { score: 5, value: 'Forschungszulage: 25% of R&D costs (35% for SMEs), base €12m from 2026 → up to €4.2m/yr, paid out even in loss years',
        note: 'Forschungszulagengesetz (FZulG): 25% of eligible R&D personnel and contract costs; SMEs 35% (since 2024). From 2026 the cost base rises from €10m to €12m per year and a 20% flat overhead surcharge applies to projects started after 31 Dec 2025 (Investitionssofortprogramm). The allowance is credited in the tax assessment and paid out in cash if it exceeds the tax due – so loss-making start-ups benefit. Requires a certificate from the BSFZ.',
        sources: ['de_fzul', 'de_fzul_dihk'], confidence: 'high' }
    },
    CH: {
      labor: { score: 4, value: '≈ 10.5% on €60k (≈ €6,300): AHV/IV/EO 5.3% + ALV 1.1% + BVG ≈ 2.6% + FAK/UVG/admin ≈ 1.5%',
        note: 'Employer shares 2026 on CHF 56,000: AHV/IV/EO 5.3% (no ceiling), unemployment ALV 1.1% (up to CHF 148,200), occupational pension BVG at least half of the age credit on the coordinated salary (CHF 56,000 – 26,460; 10% credit at age 35–44 → ≈ 2.6% of salary; 1.8% at 25–34, more at older ages), family allowance fund FAK ≈ 1–2.5% depending on canton, occupational accident UVG ≈ 0.1% (office), AHV admin fee ≈ 0.2%. Total ≈ 9.5–12%; many employers pay more than the BVG minimum. Sickness daily-allowance insurance is common but not mandatory.',
        sources: ['ch_ahv26', 'ch_uzh26'], confidence: 'medium' },
      rnd: { score: 2, value: 'Cantonal R&D super-deduction (≤ +50%) and patent box (≤ 90% relief) – cantonal tax only, no cash',
        note: 'Since the 2020 tax reform (STAF) cantons may grant an additional deduction of up to 50% of domestic R&D costs and a patent box with up to 90% relief, but only for cantonal/communal profit tax; there is no federal incentive and total relief is capped at 70% of profit. Worth roughly 3–6% of R&D spend where available, and only once the company is profitable (loss carry-forward 7 years). Several cantons grant less or nothing.',
        sources: ['ch_staf'], confidence: 'high' }
    },
    LI: {
      labor: { score: 3, value: '≈ 16.5% on €60k (≈ €9,900): AHV/IV/FAK/ALV 7.9% + health-insurance subsidy CHF 180.50/month + pension ≥ 4% + sickness/accident',
        note: 'Government payroll leaflet 2026: employer AHV 4.225%, IV 0.675%, FAK 1.9%, admin 0.585%, ALV 0.5% = 7.885%. Employers must also pay half the national average health-insurance premium (CHF 180.50/month = CHF 2,166/yr ≈ 3.9% of CHF 56,000), at least half of the occupational pension contribution (BPVG; ≈ 4% of salary assumed – statutory minimum not re-verified for 2026), at least half of the mandatory sickness daily-allowance insurance (≈ 0.5–1%) and occupational accident insurance (≈ 0.1–0.3%). Total ≈ 16–17%.',
        sources: ['li_payroll26', 'li_bpvg'], confidence: 'medium' },
      rnd: { score: 1, value: 'No R&D tax incentive · IP box abolished 2017 (phase-out to 2020)',
        note: 'Liechtenstein abolished its IP box with effect from 2017; grandfathered boxes ended in 2020 and IP income has been taxed at the normal 12.5% since 2021. There is no R&D credit or super-deduction. The general notional interest deduction on equity (4%) lowers the tax base for all companies but is not R&D-specific.',
        sources: ['pwc_li_ded'], confidence: 'high' }
    },
    UK: {
      labor: { score: 3, value: '≈ 16% on €60k (≈ €9,700): employer NIC 15% above £5,000 + 3% auto-enrolment pension',
        note: 'From April 2025 employer National Insurance is 15% on pay above the secondary threshold of £5,000/yr (2026/27 unchanged): (£52,200 – £5,000) × 15% = £7,080 (13.6%). Auto-enrolment: employer must pay at least 3% of qualifying earnings (£6,240–£50,270) = £1,321 (2.5%). Total ≈ 16.1%. The Employment Allowance (£10,500/yr off the NIC bill) can wipe out NIC for the first one or two hires – but not for a company whose only employee is a director. Apprenticeship levy only above a £3m pay bill.',
        sources: ['uk_rates26', 'uk_pension'], confidence: 'high' },
      rnd: { score: 4, value: 'Merged R&D scheme: 20% taxable credit (≈ 15–16% net) · ERIS for R&D-intensive loss-makers ≈ 27% in cash',
        note: 'For accounting periods from 1 April 2024: the merged scheme gives a 20% above-the-line credit, payable even in loss years (net ≈ 15–16% after tax). Loss-making SMEs spending ≥ 30% of total costs on R&D can instead use Enhanced R&D Intensive Support (ERIS): 86% extra deduction surrendered for a 14.5% payable credit ≈ 27% of qualifying spend. Patent box (10% rate) for later profits.',
        sources: ['uk_rnd', 'uk_rnd_stats'], confidence: 'high' }
    },
    US: {
      labor: { score: 5, value: '≈ 8.3% statutory on €60k (≈ €5,000): FICA 7.65% + FUTA/SUTA ≈ 0.6% · health insurance (≈ $7.9k) is extra',
        note: 'Employer FICA: Social Security 6.2% (wage base $184,500 in 2026) + Medicare 1.45% = 7.65%. FUTA 0.6% on the first $7,000 ($42) and state unemployment insurance (e.g. ≈ $250–550/yr, new-employer rates vary by state) plus workers’ compensation (≈ 0.1–0.3% for office work) → ≈ 8.3%. Not included: employer health insurance, not mandatory below 50 employees but expected by hires – the average employer share for single coverage was ≈ $7,900 in 2025 (KFF: premium $9,325, worker share $1,440), which would add ≈ 11 percentage points.',
        sources: ['us_ssa26', 'us_futa', 'kff_ehbs25'], confidence: 'high' },
      rnd: { score: 3, value: '§41 credit ≈ 6–10% of QREs (up to $500k/yr usable against payroll tax) · §174A expensing restored 2025',
        note: 'Research credit: 14% of qualified research expenses above 50% of the prior 3-year average (6% for companies without history), ≈ 5–8% net after the §280C reduction. Qualified small businesses (< $5m gross receipts, ≤ 5 years of receipts) can offset up to $500,000 a year against employer payroll taxes – usable while loss-making. The One Big Beautiful Bill Act (2025) restored immediate deduction of domestic R&E costs (new §174A) for tax years from 2025; small businesses may apply it retroactively to 2022–2024 (Rev. Proc. 2025-28). Foreign R&E still amortised over 15 years. State credits (e.g. California) add to this.',
        sources: ['us_41', 'us_174a'], confidence: 'medium' }
    },
    PT: {
      labor: { score: 2, value: '≈ 24.8% on €60k (≈ €14,900): TSU 23.75% + mandatory work-accident insurance ≈ 1%',
        note: 'Employer social security (Taxa Social Única) 23.75% of gross pay, no ceiling (employee pays 11%), Código Contributivo art. 53. Employers must also insure employees against work accidents (≈ 0.5–1.5% for office work) and pay small labour-compensation fund contributions. Total ≈ 24.5–25%. Note: Portuguese salaries are paid in 14 instalments; the €60k is the annual total. Temporary exemptions exist for first-job and long-term-unemployed hires.',
        sources: ['pt_ss26'], confidence: 'high' },
      rnd: { score: 4, value: 'SIFIDE II: 32.5% of R&D spend + 50% of the increase (47.5% for young SMEs) – credit against IRC, 12-year carry-forward',
        note: 'SIFIDE II (art. 35–42 Código Fiscal do Investimento): deduction from corporate tax of 32.5% of R&D expenses plus 50% of the increase over the previous two years’ average (capped at €1.5m); SMEs with < 2 years of activity get a 15-point uplift instead. Not refundable – unused credit carries forward 12 years, so a loss-making start-up only benefits later. Extended to the 2026 tax year by Lei 13/2026, which also ended the indirect route via R&D funds. Patent box: 85% exemption of qualifying IP income.',
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
        minCapital: { amount: 1, currency: 'EUR', eur: 1, paidInEur: 1, text: 'From €1, fully paid in cash; 25% of annual profit must be retained until €25,000 is reached' },
        liability: 'Limited to company assets; shareholders risk only their contribution. Managing directors can be personally liable for late insolvency filing or unpaid social-security contributions.',
        notary: true, notaryText: 'Notarised deed required (in person or by video since Aug 2022); cheapest with the statutory model protocol (≤ 3 shareholders, 1 director).',
        profitTax: '≈ 30% (15.8% corporate tax incl. solidarity surcharge + ≈ 14% trade tax)',
        setupDays: { min: 5, max: 21 }, setupCostEur: { min: 300, max: 800 }, steps: 7,
        note: 'A “mini-GmbH”: same law (§5a GmbHG) and same tax as a GmbH. Low credibility with banks/suppliers at first; converts into a GmbH by raising capital to €25,000. Steps: notary deed → bank account & capital → register filing by notary → Handelsregister entry → trade registration (Gewerbeamt) → tax registration (ELSTER) → employer registration (BA number, Berufsgenossenschaft).',
        sources: ['gmbhg', 'dirug', 'de_gnotkg'], confidence: 'high' },
      { id: 'gmbh', name: 'GmbH', local: 'Gesellschaft mit beschränkter Haftung', typical: true,
        minCapital: { amount: 25000, currency: 'EUR', eur: 25000, paidInEur: 12500, text: '€25,000; at least €12,500 (and 25% of each share) paid in before registration' },
        liability: 'Limited to company assets. Shareholders liable only up to unpaid contributions; managing directors personally liable for breaches of duty (§43 GmbHG), late insolvency filing and unpaid social-security contributions.',
        notary: true, notaryText: 'Articles and share transfers must be notarised (§§2, 15 GmbHG); online video notarisation possible since Aug 2022.',
        profitTax: '≈ 30% (15.8% corporate tax incl. solidarity surcharge + ≈ 14% trade tax); CIT falls to 10% by 2032',
        setupDays: { min: 7, max: 28 }, setupCostEur: { min: 700, max: 1500 }, steps: 7,
        note: 'The standard German start-up vehicle and what VCs expect. Costs = notary + register fees (scale with capital under GNotKG) + trade registration; lawyer-drafted articles for several founders add €1–3k. The notary is the bottleneck: compared with UK/US/PT online filing, Germany is slower and costlier but legally very certain.',
        sources: ['gmbhg', 'dirug', 'ihk_online', 'de_gnotkg', 'cr_nordichq', 'eu_sm'], confidence: 'high' },
      { id: 'ag', name: 'AG', local: 'Aktiengesellschaft', typical: false,
        minCapital: { amount: 50000, currency: 'EUR', eur: 50000, paidInEur: 12500, text: '€50,000; at least 25% of the nominal value (+ any premium) paid in' },
        liability: 'Limited to company assets; management board and supervisory board personally liable for breaches of duty.',
        notary: true, notaryText: 'Notarised articles; formation audit (Gründungsprüfung) and supervisory board (≥ 3 members) required.',
        profitTax: 'Same as GmbH (≈ 30%)',
        setupDays: { min: 21, max: 60 }, setupCostEur: { min: 3000, max: 10000 }, steps: 9,
        note: 'Rare at founding; used for later stages or an IPO. Heavier governance (management board, supervisory board, AGM). For cross-border groups an SE (European company, min. €120,000 capital) is an EU-wide alternative.',
        sources: ['de_aktg', 'cr_se'], confidence: 'medium' }
    ],
    CH: [
      { id: 'gmbh', name: 'GmbH / Sàrl', local: 'Gesellschaft mit beschränkter Haftung', typical: true,
        minCapital: { amount: 20000, currency: 'CHF', eur: 21500, paidInEur: 21500, text: 'CHF 20,000, fully paid in at formation' },
        liability: 'Limited to company assets. Articles may require additional contributions; managing directors liable for breach of duty and, in practice, for unpaid AHV contributions.',
        notary: true, notaryText: 'Formation by public deed (öffentliche Urkunde) before a notary, then commercial-register entry.',
        profitTax: '≈ 12–21% depending on canton (Zug 11.85%, Zurich 19.61%)',
        setupDays: { min: 7, max: 21 }, setupCostEur: { min: 1600, max: 4800 }, steps: 6,
        note: 'At least one managing director with signing authority must be resident in Switzerland. Steps: articles & deed → blocked capital-deposit account → commercial register → AHV compensation fund → accident insurance (UVG) → VAT if turnover ≥ CHF 100k. Shareholders are entered in the public register.',
        sources: ['kmu_gmbh', 'postfinance_gmbh', 'ch_or'], confidence: 'medium' },
      { id: 'ag', name: 'AG / SA', local: 'Aktiengesellschaft', typical: false,
        minCapital: { amount: 100000, currency: 'CHF', eur: 107500, paidInEur: 53800, text: 'CHF 100,000; at least 20% per share and CHF 50,000 in total paid in' },
        liability: 'Limited to company assets; board of directors liable for breach of duty (Art. 754 OR).',
        notary: true, notaryText: 'Public deed before a notary required.',
        profitTax: 'Same as GmbH (≈ 12–21% by canton)',
        setupDays: { min: 7, max: 28 }, setupCostEur: { min: 2200, max: 5400 }, steps: 6,
        note: 'Preferred by many VC-backed Swiss start-ups because shareholders stay anonymous and shares transfer without a notary. One board member with signing authority must be Swiss-resident.',
        sources: ['ch_or'], confidence: 'medium' }
    ],
    LI: [
      { id: 'gmbh', name: 'GmbH', local: 'Gesellschaft mit beschränkter Haftung', typical: true,
        minCapital: { amount: 10000, currency: 'CHF', eur: 10750, paidInEur: 10750, text: 'CHF 10,000 (or EUR/USD 10,000), fully paid in' },
        liability: 'Limited to company assets.',
        notary: true, notaryText: 'Written articles with certified signatures and bank confirmation of capital; usually prepared by a licensed trustee/lawyer.',
        profitTax: '12.5% flat (minimum tax CHF 1,800/yr, creditable)',
        setupDays: { min: 10, max: 30 }, setupCostEur: { min: 2500, max: 6000 }, steps: 7,
        note: 'An operating business needs a trade licence (Gewerbebewilligung) with a qualified managing director resident in Liechtenstein/EEA; Art. 180a PGR may require a locally licensed board member. Cost range is an adviser-based estimate (low certainty).',
        sources: ['li_gmbh', 'li_180a', 'li_bmf'], confidence: 'low' },
      { id: 'ag', name: 'AG', local: 'Aktiengesellschaft', typical: false,
        minCapital: { amount: 50000, currency: 'CHF', eur: 53800, paidInEur: 53800, text: 'CHF 50,000 (or EUR/USD), fully paid in at formation' },
        liability: 'Limited to company assets; board liable for breach of duty.',
        notary: true, notaryText: 'Articles with certified signatures; formation usually via a licensed trustee.',
        profitTax: '12.5% flat (minimum tax CHF 1,800/yr)',
        setupDays: { min: 10, max: 30 }, setupCostEur: { min: 3000, max: 8000 }, steps: 7,
        note: 'The most common Liechtenstein company form. Same local-director/trade-licence issues as the GmbH.',
        sources: ['li_bmf', 'gt_li_ag', 'li_180a'], confidence: 'medium' },
      { id: 'anstalt', name: 'Anstalt (Establishment)', local: 'Anstalt', typical: false,
        minCapital: { amount: 30000, currency: 'CHF', eur: 32300, paidInEur: 32300, text: 'CHF 30,000' },
        liability: 'Limited to the establishment’s assets.',
        notary: true, notaryText: 'Formation deed via a licensed trustee; comes into existence on registration.',
        profitTax: '12.5% flat',
        setupDays: { min: 10, max: 30 }, setupCostEur: { min: 3000, max: 8000 }, steps: 6,
        note: 'A Liechtenstein-specific form without shareholders (founder’s rights instead) – used for holding and asset structures, unusual for a VC-backed start-up.',
        sources: ['li_bmf'], confidence: 'medium' }
    ],
    UK: [
      { id: 'ltd', name: 'Private limited company (Ltd)', local: 'Private company limited by shares', typical: true,
        minCapital: { amount: 0, currency: 'GBP', eur: 0, paidInEur: 0, text: 'No minimum (often £1 or £100 in total)' },
        liability: 'Limited to unpaid share capital; directors liable for wrongful/fraudulent trading and can be disqualified.',
        notary: false, notaryText: 'No notary; online incorporation at Companies House. Directors and PSCs must verify their identity (mandatory since 18 Nov 2025).',
        profitTax: '19% (profits ≤ £50k) to 25% (> £250k)',
        setupDays: { min: 1, max: 3 }, setupCostEur: { min: 115, max: 400 }, steps: 3,
        note: 'Fastest and cheapest of the six: £100 online fee (since Feb 2026), usually registered within 24 hours. Steps: ID verification → online incorporation (also registers for Corporation Tax) → PAYE registration before the first payday. Bank account opening is the main delay for non-residents.',
        sources: ['uk_ltd', 'ch_fees', 'uk_idv', 'uk_ct'], confidence: 'high' },
      { id: 'llp', name: 'Limited liability partnership (LLP)', local: 'LLP', typical: false,
        minCapital: { amount: 0, currency: 'GBP', eur: 0, paidInEur: 0, text: 'No minimum' },
        liability: 'Members’ liability limited; the LLP itself is liable.',
        notary: false, notaryText: 'Online registration at Companies House; at least two designated members.',
        profitTax: 'Tax-transparent – members pay income tax on their share of profit',
        setupDays: { min: 1, max: 3 }, setupCostEur: { min: 115, max: 400 }, steps: 3,
        note: 'Used by professional firms; unsuitable for equity investment (no shares, no EMI/SEIS).',
        sources: ['uk_llp'], confidence: 'medium' }
    ],
    US: [
      { id: 'ccorp', name: 'Delaware C-Corporation', local: 'Delaware corporation', typical: true,
        minCapital: { amount: 0, currency: 'USD', eur: 0, paidInEur: 0, text: 'No minimum (founder shares bought for a nominal amount)' },
        liability: 'Limited to company assets (corporate veil); directors protected by the business-judgment rule.',
        notary: false, notaryText: 'No notary; certificate of incorporation filed online via a Delaware registered agent.',
        profitTax: '21% federal + state tax where the business operates (0–11.5%)',
        setupDays: { min: 1, max: 30 }, setupCostEur: { min: 300, max: 1500 }, steps: 5,
        note: 'The standard for VC-backed start-ups (QSBS, ISOs, YC/SAFE documents). Incorporation takes 1–2 days; an EIN for non-US founders without an SSN can take weeks. Steps: registered agent + certificate of incorporation → bylaws, board consent, founder stock + 83(b) within 30 days → EIN → foreign qualification in the state of operation → bank account. Delaware fees changed on 1 Aug 2026 (HB 400).',
        sources: ['de_corp_fees', 'de_hb400', 'irs_ein', 'irs_83b', 'cr_usagov', 'cr_usacorp'], confidence: 'medium' },
      { id: 'llc', name: 'LLC (Delaware or Wyoming)', local: 'Limited liability company', typical: false,
        minCapital: { amount: 0, currency: 'USD', eur: 0, paidInEur: 0, text: 'No minimum' },
        liability: 'Members’ liability limited to their investment.',
        notary: false, notaryText: 'No notary; certificate of formation filed online.',
        profitTax: 'Pass-through by default (members taxed); may elect corporate taxation',
        setupDays: { min: 1, max: 30 }, setupCostEur: { min: 200, max: 1000 }, steps: 4,
        note: 'Cheap and flexible for bootstrapped or holding businesses, but VCs generally require a C-Corp. Delaware LLC annual tax rose from $300 to $400 from 1 Aug 2026. Foreign-owned single-member LLCs must file Form 5472 (penalty $25,000).',
        sources: ['de_llctax', 'de_hb400', 'irs_5472'], confidence: 'medium' }
    ],
    PT: [
      { id: 'lda', name: 'Lda', local: 'Sociedade por quotas', typical: true,
        minCapital: { amount: 2, currency: 'EUR', eur: 2, paidInEur: 2, text: 'At least €1 per quota (e.g. €2 for two founders); payment can be deferred to the end of the first financial year' },
        liability: 'Limited to company assets; partners liable only for their quotas; managers liable for breach of duty and, subsidiarily, for unpaid tax/social-security debts.',
        notary: false, notaryText: 'No notary with “Empresa na Hora” (pre-approved name and articles) or the online “Empresa Online” service.',
        profitTax: '19% IRC in 2026 (15% on first €50k for SMEs/start-ups) + municipal surcharge up to 1.5%',
        setupDays: { min: 1, max: 5 }, setupCostEur: { min: 360, max: 600 }, steps: 4,
        note: 'Formed in one day at an “Empresa na Hora” desk for €360 (registration, publication, tax number). Then: start-of-activity declaration with the tax authority, social-security registration, beneficial-owner declaration (RCBE) within 30 days. A certified accountant is mandatory.',
        sources: ['pt_lda', 'pt_enh', 'pt_csc', 'pt_rcbe', 'pt_irc26', 'cr_nordichq'], confidence: 'high' },
      { id: 'unipessoal', name: 'Lda Unipessoal', local: 'Sociedade unipessoal por quotas', typical: false,
        minCapital: { amount: 1, currency: 'EUR', eur: 1, paidInEur: 1, text: 'From €1 (single quota)' },
        liability: 'Limited to company assets; a natural person may own only one unipessoal company.',
        notary: false, notaryText: 'Same online / Empresa na Hora procedure as the Lda.',
        profitTax: 'Same as Lda',
        setupDays: { min: 1, max: 5 }, setupCostEur: { min: 360, max: 600 }, steps: 4,
        note: 'Single-founder variant of the Lda; converts into a normal Lda when a second partner joins.',
        sources: ['pt_lda', 'pt_csc'], confidence: 'high' },
      { id: 'sa', name: 'SA', local: 'Sociedade anónima', typical: false,
        minCapital: { amount: 50000, currency: 'EUR', eur: 50000, paidInEur: 15000, text: '€50,000; up to 70% of cash contributions may be deferred for 5 years (≥ €15,000 paid in)' },
        liability: 'Limited to company assets; board liable for breach of duty.',
        notary: false, notaryText: 'Can be formed via Empresa na Hora / online; normally 5+ shareholders (or one company shareholder).',
        profitTax: 'Same as Lda',
        setupDays: { min: 1, max: 14 }, setupCostEur: { min: 360, max: 2000 }, steps: 5,
        note: 'Required supervisory body/statutory auditor; used for larger, investor-backed companies.',
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
    DE: { currency: 'EUR', note: 'GmbH with €25,000 capital and a tax adviser (Steuerberater). Notary and register fees follow the statutory GNotKG schedule; a UG with model protocol costs ≈ €300–500 in total instead. IHK membership fee depends on profit and chamber.',
      items: [
        item('registration', L.registration, 250, true, 'Handelsregister entry ≈ €150–200 + trade registration ≈ €20–60.', ['gmbhg', 'de_gnotkg']),
        item('notary', L.notary, 800, true, 'Notarisation of articles, list of shareholders and register filing; ≈ €600–1,000 for a standard GmbH, more with custom articles.', ['de_gnotkg', 'dirug']),
        item('capitalLocked', L.capitalLocked, 12500, true, 'At least €12,500 of the €25,000 paid in before registration; usable for business expenses afterwards.', ['gmbhg']),
        item('agent', L.agent, 0, false, 'Not required; a German address is needed (virtual office ≈ €300–1,000/yr if none).', ['gmbhg']),
        item('accounting', L.accounting, 4000, false, 'Double-entry bookkeeping, annual accounts (HGB) and tax returns via a tax adviser ≈ €2,500–6,000/yr.', ['de_hgb267']),
        item('compliance', L.compliance, 300, false, 'IHK fee (small GmbH ≈ €150–300), Transparenzregister/Unternehmensregister fees, Berufsgenossenschaft minimum.', ['ihk_online']),
        item('payrollPerEmployee', L.payrollPerEmployee, 13400, false, '≈ 22.3% of €60,000 (see payroll criterion).', ['de_sv26'])
      ] },
    CH: { currency: 'EUR', note: 'GmbH in a mid-tax canton; CHF converted at €1 ≈ CHF 0.93. Founders not resident in Switzerland need a Swiss-resident managing director (nominee services ≈ CHF 3–10k/yr, not included).',
      items: [
        item('registration', L.registration, 700, true, 'Commercial register fee ≈ CHF 600 plus SOGC publication.', ['kmu_gmbh']),
        item('notary', L.notary, 1500, true, 'Public deed and capital-deposit confirmation ≈ CHF 1,000–2,500 (canton-dependent).', ['postfinance_gmbh']),
        item('capitalLocked', L.capitalLocked, 21500, true, 'CHF 20,000 fully paid in; released after registration.', ['ch_or']),
        item('agent', L.agent, 0, false, 'None if a founder lives in Switzerland (domicile address ≈ CHF 500–1,500/yr if needed).', ['kmu_gmbh']),
        item('accounting', L.accounting, 4300, false, 'Bookkeeping, annual accounts and tax return via a fiduciary ≈ CHF 2,500–6,000/yr; audit can be waived (opting-out, ≤ 10 FTE).', ['ch_or']),
        item('compliance', L.compliance, 300, false, 'Cantonal capital tax and minor fees; VAT only from CHF 100k turnover.', ['kpmg_ch']),
        item('payrollPerEmployee', L.payrollPerEmployee, 6300, false, '≈ 10.5% of €60,000 (see payroll criterion).', ['ch_ahv26'])
      ] },
    LI: { currency: 'EUR', note: 'GmbH run with a licensed local director/trustee; CHF at €1 ≈ CHF 0.93. Trustee and director fees vary widely and are adviser estimates (low confidence).',
      items: [
        item('registration', L.registration, 800, true, 'Commercial register and trade-licence fees (estimate).', ['li_gmbh']),
        item('notary', L.notary, 2500, true, 'Formation via trustee/lawyer incl. certification ≈ CHF 2,000–5,000 (estimate).', ['li_gmbh']),
        item('capitalLocked', L.capitalLocked, 10750, true, 'CHF 10,000 fully paid in.', ['li_gmbh']),
        item('agent', L.agent, 8000, false, 'Qualified local managing director / Art. 180a board member ≈ CHF 5,000–15,000/yr (estimate) – only if no founder qualifies.', ['li_180a']),
        item('accounting', L.accounting, 5000, false, 'Bookkeeping, annual accounts and tax return; statutory auditor (Revisionsstelle) often required (estimate).', ['gt_li']),
        item('compliance', L.compliance, 1900, false, 'Minimum corporate tax CHF 1,800/yr (creditable against profit tax; small operating companies with assets ≤ CHF 500k exempt).', ['pwc_li']),
        item('payrollPerEmployee', L.payrollPerEmployee, 9900, false, '≈ 16.5% of €60,000 (see payroll criterion).', ['li_payroll26'])
      ] },
    UK: { currency: 'EUR', note: 'Ltd with an online accountant; £ at €1 ≈ £0.87. Employment Allowance (£10,500 off employer NIC) can make the first hire much cheaper than shown.',
      items: [
        item('registration', L.registration, 115, true, '£100 online incorporation fee (since 1 Feb 2026).', ['ch_fees']),
        item('notary', L.notary, 0, true, 'No notary.', ['uk_ltd']),
        item('capitalLocked', L.capitalLocked, 0, true, 'No minimum capital.', ['uk_ltd']),
        item('agent', L.agent, 150, false, 'Optional registered-office service ≈ £50–200/yr.', ['uk_ltd']),
        item('accounting', L.accounting, 2300, false, 'Bookkeeping, statutory accounts and CT600 ≈ £1,200–3,000/yr; small companies are audit-exempt.', ['uk_audit']),
        item('compliance', L.compliance, 60, false, 'Annual confirmation statement £50 (from Feb 2026).', ['ch_fees']),
        item('payrollPerEmployee', L.payrollPerEmployee, 9700, false, '≈ 16.1% of €60,000 before Employment Allowance (see payroll criterion).', ['uk_rates26'])
      ] },
    US: { currency: 'EUR', note: 'Delaware C-Corp via an incorporation service, operating in one other state; $ at €1 ≈ $1.16. Excludes foreign qualification fees in the state where you operate (e.g. California $800 minimum franchise tax) and health insurance.',
      items: [
        item('registration', L.registration, 300, true, 'Delaware filing fee (≈ $109+ from Aug 2026) plus service/expedite fees; EIN is free.', ['de_corp_fees', 'de_hb400', 'irs_ein']),
        item('notary', L.notary, 0, true, 'No notary.', ['cr_usagov']),
        item('capitalLocked', L.capitalLocked, 0, true, 'No minimum; founder stock purchased for a nominal amount.', ['cr_usacorp']),
        item('agent', L.agent, 200, false, 'Delaware registered agent ≈ $50–300/yr (mandatory).', ['cr_usacorp']),
        item('accounting', L.accounting, 3000, false, 'Bookkeeping and federal Form 1120 + state returns ≈ $2,000–5,000/yr; Form 5472 if ≥ 25% foreign-owned.', ['irs_5472']),
        item('compliance', L.compliance, 400, false, 'Delaware franchise tax (≈ $400 under the assumed-par-value method for a typical start-up) + $50 annual report, due 1 March.', ['de_frtax']),
        item('payrollPerEmployee', L.payrollPerEmployee, 5000, false, '≈ 8.3% of €60,000 statutory; health insurance would add ≈ €6,800 (see payroll criterion).', ['us_ssa26', 'kff_ehbs25'])
      ] },
    PT: { currency: 'EUR', note: 'Lda via Empresa na Hora with a certified accountant. Many founders put in €1,000–5,000 capital voluntarily for credibility.',
      items: [
        item('registration', L.registration, 360, true, 'Empresa na Hora all-in fee (registration, publication, tax number).', ['pt_enh', 'pt_lda']),
        item('notary', L.notary, 0, true, 'No notary.', ['pt_lda']),
        item('capitalLocked', L.capitalLocked, 2, true, '€1 per quota minimum.', ['pt_lda']),
        item('agent', L.agent, 0, false, 'Not required for resident founders; non-residents need a Portuguese tax representative for their personal NIF.', ['pt_lda']),
        item('accounting', L.accounting, 2000, false, 'Certified accountant (contabilista certificado) is mandatory ≈ €100–250/month.', ['pt_csc']),
        item('compliance', L.compliance, 100, false, 'IES annual declaration, RCBE (free), SAF-T – mostly covered by the accountant.', ['pt_rcbe']),
        item('payrollPerEmployee', L.payrollPerEmployee, 14900, false, '≈ 24.8% of €60,000 (see payroll criterion).', ['pt_ss26'])
      ] }
  };

  /* ---------------------------------------------------------------------------------------------
   * 6. Tax facts for founders
   * ------------------------------------------------------------------------------------------- */
  var TAX_FACTS = {
    DE: {
      personal: { value: 'Income tax 14–45% (+ 5.5% solidarity surcharge on high incomes, + church tax if member) · no special founder/expat regime',
        note: '2026 basic allowance €12,348; 42% from ≈ €70k, 45% from ≈ €278k of taxable income (§32a EStG). Top marginal rate ≈ 47.5% incl. solidarity surcharge. No expat or young-founder regime.',
        sources: ['de_estg32a'], confidence: 'high' },
      dividend: { value: '26.375% flat tax on dividends (option: 60% taxed at personal rate) · German shareholders of foreign companies: see each country',
        note: 'Dividends to a privately held stake bear the 25% flat tax + solidarity surcharge = 26.375% (§32d EStG); shareholders with ≥ 25% (or ≥ 1% and working for the company) may opt for the partial-income method. Through a holding GmbH, dividends are 95% exempt (≈ 1.5% tax). Germany withholds 26.375% on dividends to non-residents, reduced under treaties.',
        sources: ['de_estg32d', 'kstg8b'], confidence: 'high' },
      compliance: { value: 'Double-entry bookkeeping (HGB), annual accounts published · audit only for medium/large companies',
        note: 'Small GmbHs (≤ 2 of: €7.5m balance sheet, €15m turnover, 50 employees) need no audit but must file accounts with the company register. E-invoices must be receivable since 2025. Transparency-register data now taken from the commercial register.',
        sources: ['de_hgb267'], confidence: 'high' }
    },
    CH: {
      personal: { value: 'Federal max 11.5% + cantonal/communal tax → top rate ≈ 22% (Zug) to ≈ 45% (Geneva)',
        note: 'Income tax is levied by the Confederation, canton and municipality; the canton of residence matters more than the federal rate. Wealth tax on shares each year. No special expat regime for founders (lump-sum taxation excludes gainful activity).',
        sources: ['pwc_ch_ind'], confidence: 'medium' },
      dividend: { value: 'Qualifying stakes (≥ 10%): 70% taxed federally, ≥ 50% cantonally · 35% withholding, 15% final for German residents',
        note: 'Swiss companies withhold 35% on dividends (refundable to Swiss residents). A German-resident shareholder can reclaim 20 points under the DE–CH treaty, leaving 15% creditable in Germany (lower rates for corporate shareholders).',
        sources: ['pwc_ch_wht', 'pwc_ch_ind'], confidence: 'high' },
      compliance: { value: 'Limited audit, or opt-out with ≤ 10 FTE and all shareholders’ consent · VAT from CHF 100k turnover',
        note: 'Ordinary audit only above 2 of: CHF 20m assets, CHF 40m revenue, 250 FTE (Art. 727 OR). Small companies can waive the audit entirely (opting-out). Annual accounts are not public.',
        sources: ['ch_or'], confidence: 'high' }
    },
    LI: {
      personal: { value: 'National 1–8% × municipal surcharge 150–180% → max ≈ 22.4%',
        note: 'Progressive national scale up to 8% plus a municipal surcharge; a 4% notional return on net wealth is added to taxable income instead of a separate capital-gains tax. No special founder or expat regime; residence permits for EEA nationals are quota-limited.',
        sources: ['pwc_li_ind', 'li_steg'], confidence: 'medium' },
      dividend: { value: 'Dividends tax-free for resident individuals · no withholding tax (German shareholder pays only German tax)',
        note: 'Since the 2011 tax reform Liechtenstein levies no withholding tax on dividends and exempts dividends at the individual level (wealth is taxed via the notional return instead). A German-resident shareholder pays the German 26.375% flat tax.',
        sources: ['pwc_li_wht', 'gt_li'], confidence: 'medium' },
      compliance: { value: 'Minimum tax CHF 1,800/yr · statutory auditor usually required · local qualified director rules',
        note: 'Annual accounts and tax return; small operating companies with assets ≤ CHF 500k are exempt from the minimum tax. Art. 180a PGR board-member requirements and trade-licence rules add local substance. Audit-waiver possibilities for small companies not verified (low certainty).',
        sources: ['pwc_li', 'li_180a'], confidence: 'low' }
    },
    UK: {
      personal: { value: 'Income tax 20/40/45% (Scotland differs) · new arrivals: 4-year foreign income & gains exemption',
        note: 'Personal allowance £12,570 (frozen); higher rate from £50,270, additional rate from £125,140. The non-dom regime was replaced in April 2025 by a 4-year foreign income and gains exemption for people arriving after 10 years of non-residence – relevant for foreign founders, but UK-source salary/dividends stay taxable.',
        sources: ['uk_it'], confidence: 'high' },
      dividend: { value: 'Dividend tax 10.75% / 35.75% / 39.35% above a £500 allowance · no withholding tax',
        note: 'Basic and higher dividend rates rose by 2 points from 6 April 2026. The UK levies no withholding tax on dividends, so a German-resident shareholder pays only German tax.',
        sources: ['uk_div'], confidence: 'high' },
      compliance: { value: 'Small-company audit exemption · annual accounts + confirmation statement · ID verification for directors (2025)',
        note: 'Audit-exempt below 2 of: £15m turnover, £7.5m assets, 50 employees (thresholds raised April 2025). Accounts are public at Companies House. Since 18 Nov 2025 new directors and PSCs must verify their identity; existing directors at their next confirmation statement.',
        sources: ['uk_audit', 'uk_idv'], confidence: 'high' }
    },
    US: {
      personal: { value: 'Federal 10–37% + state 0–13.3% (+ city) · US citizens taxed worldwide',
        note: 'Federal brackets made permanent by the 2025 OBBBA; state income tax ranges from 0% (Texas, Florida) to 13.3% (California) plus e.g. New York City tax. Non-resident founders pay US tax only on US-source income; Delaware incorporation does not make the founder US-taxable.',
        sources: ['us_brackets', 'irs_abroad'], confidence: 'high' },
      dividend: { value: 'Qualified dividends 0/15/20% + 3.8% NIIT · 30% withholding, 15% for German residents under the treaty',
        note: 'C-Corp profits are taxed twice (21% corporate + dividend tax). Payments to a German-resident individual: 15% US withholding under the DE–US treaty (5% for ≥ 10% corporate shareholders), credited against German tax.',
        sources: ['pwc_us_wht', 'us_brackets'], confidence: 'high' },
      compliance: { value: 'No statutory audit for private companies · Delaware franchise tax + annual report · BOI reporting no longer required for US companies',
        note: 'Federal Form 1120, state returns, Delaware report by 1 March, Form 5472 for ≥ 25% foreign-owned companies. FinCEN exempted US-formed companies and US persons from Beneficial Ownership reporting in March 2025 (rule finalised in 2026); only foreign companies registered in a US state still file.',
        sources: ['de_frtax', 'irs_5472', 'us_boi'], confidence: 'medium' }
    },
    PT: {
      personal: { value: 'IRS 12.5–48% (+ 2.5/5% solidarity surcharge) · IRS Jovem for under-35s · IFICI (“NHR 2.0”) 20% flat for 10 years',
        note: 'IRS Jovem: partial exemption of employment/business income for up to 10 years for people aged ≤ 35 (100% in year 1, falling to 25%, capped at 55 × IAS). IFICI (art. 58-A EBF): new residents not resident in the prior 5 years working in qualifying innovation roles – incl. certified start-ups – pay 20% on qualifying Portuguese salary/business income for 10 years, with most foreign income exempt.',
        sources: ['pt_irs26', 'pt_irs_jovem', 'pt_ifici'], confidence: 'medium' },
      dividend: { value: '28% flat on dividends (or opt in: 50% taxed at progressive rates) · 25% withholding, 15% for German residents',
        note: 'Resident individuals pay a 28% final tax or may aggregate 50% of the dividend with other income. Non-residents: 25% withholding, reduced to 15% under the DE–PT treaty and credited in Germany.',
        sources: ['pwc_pt_wht', 'pt_irs26'], confidence: 'high' },
      compliance: { value: 'Certified accountant mandatory · SAF-T & IES filing · audit only above 2 of €1.5m assets / €3m revenue / 50 staff',
        note: 'All Ldas must keep organised accounts through a contabilista certificado and file the annual IES; statutory auditor only when size thresholds are exceeded for two years (art. 262 CSC). RCBE beneficial-owner declaration within 30 days of formation and on changes.',
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
