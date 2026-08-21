export function detectRisingLeverage(seriesMetrics) {
  const { perPeriod, trends } = seriesMetrics;
  const first = perPeriod[0].metrics.debt_to_ebitda.value;
  const last = perPeriod[perPeriod.length - 1].metrics.debt_to_ebitda.value;

  if (trends.debt_to_ebitda === 'deteriorating' && last != null) {
    return {
      key: 'rising_leverage',
      severity: last >= 4.5 ? 'high' : last >= 3 ? 'medium' : 'low',
      direction: 'risk',
      description:
        `Debt/EBITDA has moved from ${first?.toFixed(2) ?? 'n/a'}x to ${last.toFixed(2)}x over the observed periods. ` +
        'Debt is growing faster than the earnings base that services it — each incremental rupee of new debt (including the facility under review) adds more strain than it would have in earlier periods.',
      evidenceMetricNames: ['debt_to_ebitda'],
    };
  }
  return null;
}
