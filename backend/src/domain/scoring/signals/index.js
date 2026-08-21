import { detectProfitCashDivergence } from './profitCashDivergence.js';
import { detectRisingWorkingCapital } from './risingWorkingCapital.js';
import { detectRisingReceivableDays } from './risingReceivableDays.js';
import { detectRisingLeverage } from './risingLeverage.js';
import { detectWeakeningInterestCoverage } from './weakeningInterestCoverage.js';
import { detectEarningsQualityConcern } from './earningsQualityConcern.js';
import { detectStrongOrderBookOpportunity } from './strongOrderBookOpportunity.js';

// Each rule is a pure function: (seriesMetrics, context) => Signal | null.
// Adding a new signal is adding one file here and one line below — nothing
// else in the pipeline needs to change.
export const SIGNAL_RULES = [
  detectProfitCashDivergence,
  detectRisingWorkingCapital,
  detectRisingReceivableDays,
  detectRisingLeverage,
  detectWeakeningInterestCoverage,
  detectEarningsQualityConcern,
  detectStrongOrderBookOpportunity,
];

export function detectAllSignals(seriesMetrics, context) {
  return SIGNAL_RULES
    .map((rule) => rule(seriesMetrics, context))
    .filter(Boolean)
    .map((s) => ({ confidence: 0.75, ...s }));
}
