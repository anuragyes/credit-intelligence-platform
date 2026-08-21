// Real, researched KNR Constructions figures (see backend/data/knr-constructions.sources.json
// for citations). Used as the primary integration-style fixture for the scoring engine so the
// test suite is validating against an actual company's numbers, not just synthetic data.
export const knrConstructionsPeriods = [
  {
    periodLabel: 'FY2023', periodEnd: '2023-03-31', confidence: 0.95,
    revenue: 4062, ebitda: 918, otherIncome: 98, interestExpense: 153, depreciation: 181,
    netProfit: 439, totalDebt: 652, equityCapital: 56, reserves: 2723,
    cashFromOps: 1194, debtorDays: 56, workingCapitalDays: 77,
  },
  {
    periodLabel: 'FY2024', periodEnd: '2024-03-31', confidence: 0.95,
    revenue: 4429, ebitda: 1049, otherIncome: 162, interestExpense: 106, depreciation: 157,
    netProfit: 752, totalDebt: 1262, equityCapital: 56, reserves: 3498,
    cashFromOps: -297, debtorDays: 56, workingCapitalDays: 77,
  },
  {
    periodLabel: 'FY2025', periodEnd: '2025-03-31', confidence: 0.9,
    revenue: 4753, ebitda: 1610, otherIncome: 172, interestExpense: 208, depreciation: 314,
    netProfit: 1002, totalDebt: 1849, equityCapital: 56, reserves: 4485,
    cashFromOps: -567, debtorDays: 71, workingCapitalDays: 154,
  },
  {
    // Interim/provisional period — deliberately given lower confidence to
    // exercise the "handle uncertainty" path in the engine.
    periodLabel: 'FY2026-Provisional', periodEnd: '2026-03-31', confidence: 0.5, isPartialPeriod: true,
    revenue: 2698, ebitda: 711, otherIncome: 65, interestExpense: 212, depreciation: 59,
    netProfit: 437, totalDebt: 2444, equityCapital: 56, reserves: 4916,
    cashFromOps: -149, debtorDays: 109, workingCapitalDays: 345,
  },
];

export const knrSignalContext = {
  orderBookTotal: 5051.8,
  fullYearRevenues: [4062, 4429, 4753],
};

// A synthetic, clean fixture used to confirm the engine can also produce a
// clean APPROVE — i.e. the thresholds aren't rigged to always find risk.
export const healthyCompanyPeriods = [
  {
    periodLabel: 'FY2023', periodEnd: '2023-03-31', confidence: 0.95,
    revenue: 1000, ebitda: 220, otherIncome: 10, interestExpense: 20, depreciation: 30,
    netProfit: 140, totalDebt: 300, equityCapital: 50, reserves: 900,
    cashFromOps: 210, debtorDays: 40, workingCapitalDays: 50,
  },
  {
    periodLabel: 'FY2024', periodEnd: '2024-03-31', confidence: 0.95,
    revenue: 1150, ebitda: 260, otherIncome: 12, interestExpense: 22, depreciation: 32,
    netProfit: 168, totalDebt: 320, equityCapital: 50, reserves: 1040,
    cashFromOps: 245, debtorDays: 39, workingCapitalDays: 48,
  },
  {
    periodLabel: 'FY2025', periodEnd: '2025-03-31', confidence: 0.95,
    revenue: 1320, ebitda: 305, otherIncome: 13, interestExpense: 24, depreciation: 34,
    netProfit: 200, totalDebt: 340, equityCapital: 50, reserves: 1210,
    cashFromOps: 288, debtorDays: 38, workingCapitalDays: 46,
  },
];
