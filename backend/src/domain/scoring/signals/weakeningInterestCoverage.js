import { THRESHOLDS } from '../config.js';

export function detectWeakeningInterestCoverage(seriesMetrics) {
  const { perPeriod, trends } = seriesMetrics;
  const latest = perPeriod[perPeriod.length - 1].metrics.interest_coverage_ratio.value;
  if (latest == null) return null;

  if (trends.interest_coverage_ratio === 'deteriorating' || latest < THRESHOLDS.interestCoverage.watch) {
    return {
      key: 'weakening_interest_coverage',
      severity: latest < THRESHOLDS.interestCoverage.watch ? 'high' : 'medium',
      direction: 'risk',
      description:
        `Interest coverage (EBITDA / interest expense) is at ${latest.toFixed(2)}x in the latest period` +
        (trends.interest_coverage_ratio === 'deteriorating' ? ' and trending down.' : '.') +
        ` A comfortable buffer is generally ${THRESHOLDS.interestCoverage.healthy}x+; below ${THRESHOLDS.interestCoverage.watch}x, a modest earnings dip could jeopardise debt service.`,
      evidenceMetricNames: ['interest_coverage_ratio'],
    };
  }
  return null;
}
