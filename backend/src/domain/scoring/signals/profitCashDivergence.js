/**
 * Textbook signal named explicitly in the assignment brief:
 * "profit is growing but cash generation is deteriorating".
 */
export function detectProfitCashDivergence(seriesMetrics) {
  const { perPeriod, latestFull } = seriesMetrics;
  const cashConversion = perPeriod.map((p) => p.metrics.cash_conversion_ratio.value);
  const negativeCashPeriods = cashConversion.filter((v) => v != null && v < 0).length;

  // Profit-growth check is deliberately based on the latest *full* fiscal
  // year rather than the raw latest period: comparing a partial/provisional
  // period's profit to a prior full year's profit is not a like-for-like
  // YoY comparison and would produce a misleading "profit fell" reading
  // purely from a period-basis mismatch, not from real deterioration.
  const profitGrowingRecently = (latestFull?.metrics?.net_profit_growth_yoy?.value ?? null) > 0.1;
  const cashDeteriorating = negativeCashPeriods >= 2 || (cashConversion[cashConversion.length - 1] ?? 0) < 0;

  if (profitGrowingRecently && cashDeteriorating) {
    return {
      key: 'profit_cash_divergence',
      severity: 'high',
      direction: 'risk',
      description: `Net profit grew ${(latestFull.metrics.net_profit_growth_yoy.value * 100).toFixed(0)}% YoY, but operating cash flow was negative in ${negativeCashPeriods} of the last ${cashConversion.length} periods. Earnings are not converting into liquid cash, posing a severe debt service risk.`,
      evidenceMetricNames: ['net_profit_growth_yoy', 'cash_conversion_ratio'],
    };
  }
  return null;
}
