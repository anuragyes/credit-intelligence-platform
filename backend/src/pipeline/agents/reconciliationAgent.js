const METRIC_TO_PERIOD_FIELD = {
  revenue: 'revenue',
  operating_profit: 'ebitda',
  other_income: 'otherIncome',
  interest_expense: 'interestExpense',
  depreciation: 'depreciation',
  net_profit: 'netProfit',
  total_debt: 'totalDebt',
  equity_capital: 'equityCapital',
  reserves: 'reserves',
  cash_from_ops: 'cashFromOps',
  debtor_days: 'debtorDays',
  working_capital_days: 'workingCapitalDays',
};

/**
 * Reconciliation Agent — pivots flat line items into one row per fiscal
 * period (the shape the scoring engine expects), and turns any pre-flagged
 * cross-source/cross-method conflicts into first-class Discrepancy records
 * instead of silently averaging them away.
 */
export function runReconciliationAgent({ lineItems, derivedDiscrepancies = [] }) {
  const periodsByLabel = new Map();

  for (const item of lineItems) {
    const field = METRIC_TO_PERIOD_FIELD[item.metric];
    if (!field) continue; // metrics like order_book_* are handled separately as context, not per-period fields

    if (!periodsByLabel.has(item.period)) {
      periodsByLabel.set(item.period, {
        periodLabel: item.period,
        periodEnd: item.periodEnd,
        isPartialPeriod: item.isPartialPeriod,
        confidenceSum: 0,
        confidenceCount: 0,
        sourceLineItemRefs: [],
      });
    }
    const period = periodsByLabel.get(item.period);
    period[field] = item.value;
    period.confidenceSum += item.trustScore ?? 0.7;
    period.confidenceCount += 1;
    period.sourceLineItemRefs.push({ metric: item.metric, sourceId: item.sourceId, value: item.value });
  }

  const periods = [...periodsByLabel.values()].map((p) => ({
    ...p,
    confidence: p.confidenceCount ? Number((p.confidenceSum / p.confidenceCount).toFixed(2)) : 0.6,
  }));

  const orderBookItem = lineItems.find((i) => i.metric === 'order_book_total');
  const orderBookTotal = orderBookItem?.value ?? null;

  const fullYearRevenues = periods
    .filter((p) => !p.isPartialPeriod)
    .sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd))
    .map((p) => p.revenue)
    .filter((v) => v != null);

  const discrepancies = derivedDiscrepancies.map((d) => ({
    metricKey: d.metricKey,
    periodLabel: d.period,
    periodEnd: d.periodEnd,
    labelA: d.methodA.label,
    valueA: d.methodA.value,
    sourceRefA: d.methodA.sourceId,
    labelB: d.methodB.label,
    valueB: d.methodB.value,
    sourceRefB: d.methodB.sourceId,
    deltaPct: Number((Math.abs(d.methodA.value - d.methodB.value) / Math.max(d.methodA.value, d.methodB.value)).toFixed(3)),
    resolutionStrategy: 'flagged_for_analyst',
    resolvedValue: null,
    resolvedConfidence: 0.4,
    status: 'open',
    note: d.note,
  }));

  return { periods, discrepancies, signalContext: { orderBookTotal, fullYearRevenues } };
}
