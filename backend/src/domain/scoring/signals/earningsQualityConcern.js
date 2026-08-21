export function detectEarningsQualityConcern(seriesMetrics) {
  const { perPeriod } = seriesMetrics;
  const latest = perPeriod[perPeriod.length - 1];
  const profitGrowth = latest.metrics.net_profit_growth_yoy.value;
  const ebitdaGrowth = latest.metrics.ebitda_growth_yoy.value;
  const otherIncomeShare = latest.metrics.other_income_share_of_pbt.value;

  const profitOutpacingOperatingEarnings =
    profitGrowth != null && ebitdaGrowth != null && profitGrowth > ebitdaGrowth + 0.15;

  if (profitOutpacingOperatingEarnings || (otherIncomeShare != null && otherIncomeShare > 0.12)) {
    return {
      key: 'earnings_quality_concern',
      severity: 'medium',
      direction: 'risk',
      description: `Net profit growth (${(profitGrowth * 100).toFixed(1)}%) outpaced core EBITDA growth (${(ebitdaGrowth * 100).toFixed(1)}%). ${
        otherIncomeShare != null && otherIncomeShare > 0.12 
        ? `Additionally, non-operating income makes up ${(otherIncomeShare * 100).toFixed(1)}% of pre-tax profit.` 
        : ''
      } Indicates profit improvement is heavily reliant on non-core activities.`,
      evidenceMetricNames: ['net_profit_growth_yoy', 'ebitda_growth_yoy', 'other_income_share_of_pbt'],
    };
  }
  return null;
}
