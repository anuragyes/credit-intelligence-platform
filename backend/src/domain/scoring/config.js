/**
 * All tunable thresholds/weights for the scoring engine live in this single
 * file on purpose — this is what a reviewer should be pointed to first when
 * asked "what if we required a higher DSCR" or similar live-review questions.
 * Nothing in decisionEngine.js hardcodes a magic number outside this file.
 */

export const ASSUMED_WORKING_CAPITAL_LOAN_RATE = 0.11; // annual interest rate assumption for a WC/cash-credit facility

export const THRESHOLDS = {
  interestCoverage: { healthy: 4, watch: 2 }, // >=4 healthy, 2-4 watch, <2 weak
  incrementalDSCR: { healthy: 1.5, watch: 1.1 }, // >=1.5 healthy, 1.1-1.5 watch, <1.1 weak
  debtToEbitda: { healthy: 3, watch: 4.5 }, // <=3 healthy, 3-4.5 watch, >4.5 weak
  debtToEquity: { healthy: 0.6, watch: 1.2 },
  cashConversion: { healthy: 0.7, watch: 0.3 }, // CFO / EBITDA. >=0.7 healthy, 0.3-0.7 watch, <0.3 weak (negative is worst)
  currentRatioProxy: { healthy: 1.3, watch: 1.0 },
};

export const SIGNAL_SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3 };
export const SIGNAL_DIRECTION_SIGN = { risk: -1, opportunity: 1 };

// Composite scoring weights — must sum to 1 across the four sub-scores.
export const COMPOSITE_WEIGHTS = {
  leverage: 0.3,
  liquidityAndCash: 0.3,
  dscr: 0.25,
  signals: 0.15,
};

// Composite score (0-100) -> decision thresholds
export const DECISION_THRESHOLDS = {
  approve: 70,
  approveWithConditions: 45, // between watch and approve -> conditions; below -> decline
};

// Data-quality confidence penalty knobs
export const DATA_QUALITY = {
  perOpenDiscrepancyPenalty: 0.08,
  lowConfidencePeriodPenalty: 0.1, // applied when the latest period's own confidence < this module's threshold
  lowConfidencePeriodThreshold: 0.6,
  maxPenalty: 0.45,
};
