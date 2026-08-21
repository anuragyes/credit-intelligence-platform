export function detectRisingReceivableDays(seriesMetrics) {
  const { perPeriod, trends } = seriesMetrics;
  const days = perPeriod.map((p) => p.metrics.debtor_days.value).filter((v) => v != null);
  if (days.length < 2) return null;

  const first = days[0];
  const last = days[days.length - 1];

  if (trends.debtor_days === 'deteriorating') {
    return {
      key: 'rising_receivable_days',
      severity: last - first >= 40 ? 'high' : 'medium',
      direction: 'risk',
      description: `Debtor/receivable days have risen from ${first} to ${last}. This usually means counterparties are taking longer to pay, raising the risk that reported revenue overstates near-term cash availability.`,
      evidenceMetricNames: ['debtor_days'],
    };
  }
  return null;
}
