/**
 * Pure functions that turn a normalized per-period financial record into
 * derived ratios. No I/O, no LLM calls — fully unit-testable and
 * reproducible, which is the explicit requirement in the assignment brief.
 *
 * Expected shape of a `period` object (one row per fiscal period):
 * {
 *   periodLabel, periodEnd, revenue, ebitda, otherIncome, interestExpense,
 *   depreciation, netProfit, totalDebt, equityCapital, reserves,
 *   cashFromOps, debtorDays, workingCapitalDays, confidence
 * }
 */

export function netWorth(period) {
  return (period.equityCapital ?? 0) + (period.reserves ?? 0);
}

export function ebitdaMargin(period) {
  if (!period.revenue) return null;
  return period.ebitda / period.revenue;
}

export function interestCoverageRatio(period) {
  if (!period.interestExpense) return null;
  return period.ebitda / period.interestExpense;
}

export function debtToEbitda(period) {
  if (!period.ebitda || period.ebitda <= 0) return null;
  return period.totalDebt / period.ebitda;
}

export function debtToEquity(period) {
  const nw = netWorth(period);
  if (!nw) return null;
  return period.totalDebt / nw;
}

export function cashConversionRatio(period) {
  if (!period.ebitda || period.ebitda === 0) return null;
  return period.cashFromOps / period.ebitda;
}

/**
 * Incremental Debt Service Coverage Ratio for the *requested* facility.
 * This is intentionally the one ratio that is a function of `loanAmount`,
 * so re-scoring with a different requested amount (₹1cr -> ₹20cr) produces
 * a materially different number without touching any other code path.
 */
export function incrementalDSCR(period, loanAmount, assumedRate) {
  const existingInterest = period.interestExpense ?? 0;
  const incrementalAnnualInterest = loanAmount * assumedRate;
  const totalDebtService = existingInterest + incrementalAnnualInterest;
  if (!totalDebtService) return null;
  return period.ebitda / totalDebtService;
}

/** Simple current-ratio proxy from working-capital-days trend direction is not
 * enough on its own; we approximate liquidity using net-working-capital
 * intensity relative to revenue as a proxy current-ratio-like signal, since
 * a full balance-sheet current asset/liability split isn't in the curated
 * source set for this company. Documented explicitly as an approximation.
 */
export function workingCapitalIntensity(period) {
  if (!period.revenue) return null;
  return (period.workingCapitalDays ?? 0) / 365;
}

export function yoyGrowth(current, previous) {
  if (previous == null || previous === 0 || current == null) return null;
  return (current - previous) / Math.abs(previous);
}

/**
 * Direction-aware trend classifier. `higherIsBetter` must be supplied
 * explicitly per metric — for metrics like working-capital days or debtor
 * days, a *rising* value is deteriorating, not improving, so this cannot be
 * inferred generically from "value went up."
 */
function trendOf(values, higherIsBetter) {
  const clean = values.filter((v) => v != null);
  if (clean.length < 2) return null;
  const first = clean[0];
  const last = clean[clean.length - 1];
  const rose = last > first * 1.05;
  const fell = last < first * 0.95;
  if (!rose && !fell) return 'stable';
  const wentGoodDirection = higherIsBetter ? rose : fell;
  return wentGoodDirection ? 'improving' : 'deteriorating';
}

/**
 * Computes the full derived-metric set for every period in a sorted series,
 * plus trend direction across the series for the key ratios. Returns a flat
 * array shaped for persistence into `metrics_derived`.
 */
export function computeSeriesMetrics(periods, { loanAmount, assumedRate }) {
  const sorted = [...periods].sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd));

  const perPeriod = sorted.map((p, idx) => {
    const prev = sorted[idx - 1];
    return {
      periodLabel: p.periodLabel,
      periodEnd: p.periodEnd,
      confidence: p.confidence ?? 0.8,
      isPartialPeriod: Boolean(p.isPartialPeriod),
      metrics: {
        ebitda_margin: { value: ebitdaMargin(p), formula: 'ebitda / revenue' },
        interest_coverage_ratio: { value: interestCoverageRatio(p), formula: 'ebitda / interest_expense' },
        debt_to_ebitda: { value: debtToEbitda(p), formula: 'total_debt / ebitda' },
        debt_to_equity: { value: debtToEquity(p), formula: 'total_debt / (equity_capital + reserves)' },
        cash_conversion_ratio: { value: cashConversionRatio(p), formula: 'cash_from_ops / ebitda' },
        incremental_dscr: {
          value: incrementalDSCR(p, loanAmount, assumedRate),
          formula: `ebitda / (interest_expense + loan_amount(${loanAmount}) * assumed_rate(${assumedRate}))`,
        },
        revenue_growth_yoy: { value: prev ? yoyGrowth(p.revenue, prev.revenue) : null, formula: '(revenue - prev_revenue) / prev_revenue' },
        ebitda_growth_yoy: { value: prev ? yoyGrowth(p.ebitda, prev.ebitda) : null, formula: '(ebitda - prev_ebitda) / prev_ebitda' },
        net_profit_growth_yoy: { value: prev ? yoyGrowth(p.netProfit, prev.netProfit) : null, formula: '(net_profit - prev_net_profit) / prev_net_profit' },
        other_income_share_of_pbt: {
          value: p.netProfit ? (p.otherIncome ?? 0) / (p.netProfit + (p.interestExpense ?? 0) - (p.otherIncome ?? 0)) : null,
          formula: 'other_income / approx_pbt',
        },
        working_capital_days: { value: p.workingCapitalDays ?? null, formula: 'as reported' },
        debtor_days: { value: p.debtorDays ?? null, formula: 'as reported' },
      },
    };
  });

  const trends = {
    interest_coverage_ratio: trendOf(perPeriod.map((p) => p.metrics.interest_coverage_ratio.value), true),
    debt_to_ebitda: trendOf(perPeriod.map((p) => p.metrics.debt_to_ebitda.value), false),
    cash_conversion_ratio: trendOf(perPeriod.map((p) => p.metrics.cash_conversion_ratio.value), true),
    working_capital_days: trendOf(perPeriod.map((p) => p.metrics.working_capital_days.value), false),
    debtor_days: trendOf(perPeriod.map((p) => p.metrics.debtor_days.value), false),
  };

  const fullPeriods = perPeriod.filter((p, idx) => !sorted[idx].isPartialPeriod);

  return {
    perPeriod,
    trends,
    latest: perPeriod[perPeriod.length - 1],
    latestFull: fullPeriods[fullPeriods.length - 1] ?? perPeriod[perPeriod.length - 1],
  };
}
