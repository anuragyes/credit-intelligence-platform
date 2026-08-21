export function detectRisingWorkingCapital(seriesMetrics) {
  const { perPeriod, trends } = seriesMetrics;
  const days = perPeriod.map((p) => p.metrics.working_capital_days.value).filter((v) => v != null);
  if (days.length < 2) return null;

  const first = days[0];
  const last = days[days.length - 1];
  const growthMultiple = first > 0 ? last / first : null;

  if (trends.working_capital_days === 'deteriorating' || (growthMultiple && growthMultiple >= 1.5)) {
    return {
      key: 'rising_working_capital_requirement',
      severity: growthMultiple && growthMultiple >= 2 ? 'high' : 'medium',
      direction: 'risk',
      description: `Working-capital days have risen from ${first} to ${last}${growthMultiple ? ` (${growthMultiple.toFixed(1)}x)` : ''}. More cash is tied up per rupee of revenue, increasing reliance on external financing.`,
      evidenceMetricNames: ['working_capital_days'],
    };
  }
  return null;
}
