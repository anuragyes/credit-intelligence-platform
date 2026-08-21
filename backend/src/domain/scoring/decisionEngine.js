import {
  THRESHOLDS,
  COMPOSITE_WEIGHTS,
  DECISION_THRESHOLDS,
  DATA_QUALITY,
  SIGNAL_SEVERITY_WEIGHT,
  SIGNAL_DIRECTION_SIGN,
  ASSUMED_WORKING_CAPITAL_LOAN_RATE,
} from './config.js';
import { computeSeriesMetrics } from './metrics.js';
import { detectAllSignals } from './signals/index.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Maps a ratio value onto a 0-100 sub-score against a healthy/watch band. */
function scoreBand(value, { healthy, watch }, higherIsBetter) {
  if (value == null) return { score: 40, value, note: 'missing data — scored conservatively, not optimistically' };

  if (higherIsBetter) {
    if (value >= healthy) return { score: 100, value, note: `>= healthy threshold (${healthy})` };
    if (value <= watch) return { score: 20, value, note: `<= watch threshold (${watch})` };
    const pct = (value - watch) / (healthy - watch);
    return { score: Math.round(20 + pct * 80), value, note: `between watch (${watch}) and healthy (${healthy})` };
  }

  if (value <= healthy) return { score: 100, value, note: `<= healthy threshold (${healthy})` };
  if (value >= watch) return { score: 20, value, note: `>= watch threshold (${watch})` };
  const pct = (watch - value) / (watch - healthy);
  return { score: Math.round(20 + pct * 80), value, note: `between healthy (${healthy}) and watch (${watch})` };
}

function scoreSignals(signals) {
  let base = 60;
  const contributions = signals.map((s) => {
    const magnitude = SIGNAL_SEVERITY_WEIGHT[s.severity] ?? 1;
    const sign = SIGNAL_DIRECTION_SIGN[s.direction] ?? 0;
    // Opportunities partially offset risks but are weighted more
    // conservatively (0.6x) — a strong order book should not be treated as
    // fully cancelling a cash-conversion problem.
    const points = sign > 0 ? magnitude * 5 * 0.6 : magnitude * 8;
    return { key: s.key, direction: s.direction, severity: s.severity, pointsApplied: sign * points };
  });
  const total = contributions.reduce((sum, c) => sum + c.pointsApplied, base === 60 ? 0 : 0, 0);
  const score = clamp(base + contributions.reduce((s, c) => s + c.pointsApplied, 0), 0, 100);
  return { score, base, contributions };
}

function scoreDataQuality({ openDiscrepancyCount, latestPeriodConfidence }) {
  const discrepancyPenalty = openDiscrepancyCount * DATA_QUALITY.perOpenDiscrepancyPenalty;
  const lowConfidencePenalty =
    latestPeriodConfidence < DATA_QUALITY.lowConfidencePeriodThreshold ? DATA_QUALITY.lowConfidencePeriodPenalty : 0;
  const penalty = clamp(discrepancyPenalty + lowConfidencePenalty, 0, DATA_QUALITY.maxPenalty);
  return { penalty, discrepancyPenalty, lowConfidencePenalty };
}

function toDecision(compositeScore) {
  if (compositeScore >= DECISION_THRESHOLDS.approve) return 'APPROVE';
  if (compositeScore >= DECISION_THRESHOLDS.approveWithConditions) return 'APPROVE_WITH_CONDITIONS';
  return 'DECLINE';
}

/**
 * The single entry point of the deterministic engine. No LLM call happens
 * anywhere in this function or anything it calls — every number here is
 * reproducible from the same inputs, every run, which is the explicit
 * requirement in the assignment brief.
 *
 * @param {object} params
 * @param {Array} params.periods - normalized per-period financials (see metrics.js)
 * @param {number} params.loanAmount - requested facility amount, INR crore
 * @param {number} [params.assumedRate] - assumed annual rate for the incremental DSCR calc
 * @param {Array} params.openDiscrepancies - open Discrepancy rows for this company
 * @param {object} [params.signalContext] - extra context passed to signal rules (e.g. orderBookTotal)
 */
export function scoreLoanApplication({
  periods,
  loanAmount,
  assumedRate = ASSUMED_WORKING_CAPITAL_LOAN_RATE,
  openDiscrepancies = [],
  signalContext = {},
}) {
  const seriesMetrics = computeSeriesMetrics(periods, { loanAmount, assumedRate });
  const latest = seriesMetrics.latest;
  const signals = detectAllSignals(seriesMetrics, signalContext);

  const leverageBand = scoreBand(latest.metrics.debt_to_ebitda.value, THRESHOLDS.debtToEbitda, false);
  const equityBand = scoreBand(latest.metrics.debt_to_equity.value, THRESHOLDS.debtToEquity, false);
  const leverageScore = Math.round((leverageBand.score + equityBand.score) / 2);

  const cashBand = scoreBand(latest.metrics.cash_conversion_ratio.value, THRESHOLDS.cashConversion, true);
  const liquidityAndCashScore = cashBand.score;

  const dscrBand = scoreBand(latest.metrics.incremental_dscr.value, THRESHOLDS.incrementalDSCR, true);
  const dscrScore = dscrBand.score;

  const signalsScoring = scoreSignals(signals);

  const compositeScore = Math.round(
    leverageScore * COMPOSITE_WEIGHTS.leverage +
      liquidityAndCashScore * COMPOSITE_WEIGHTS.liquidityAndCash +
      dscrScore * COMPOSITE_WEIGHTS.dscr +
      signalsScoring.score * COMPOSITE_WEIGHTS.signals,
  );

  const dataQuality = scoreDataQuality({
    openDiscrepancyCount: openDiscrepancies.filter((d) => d.status === 'open').length,
    latestPeriodConfidence: latest.confidence,
  });

  let decision = toDecision(compositeScore);
  const overrideNotes = [];

  const baseConfidence = latest.confidence;
  const overallConfidence = clamp(baseConfidence - dataQuality.penalty, 0.05, 0.99);

  // Explicit guardrail: never let a low-confidence data set produce a clean
  // APPROVE. This is the code-level answer to "do not pretend uncertain
  // information is certain."
  if (decision === 'APPROVE' && overallConfidence < 0.55) {
    decision = 'APPROVE_WITH_CONDITIONS';
    overrideNotes.push(
      `Composite score (${compositeScore}) qualified for APPROVE, but overall confidence (${overallConfidence.toFixed(2)}) was below the 0.55 certainty floor, so the decision was downgraded. See data-quality breakdown.`,
    );
  }

  return {
    decision,
    overallConfidence: Number(overallConfidence.toFixed(2)),
    compositeScore,
    scoreBreakdown: {
      leverage: { score: leverageScore, weight: COMPOSITE_WEIGHTS.leverage, debtToEbitda: leverageBand, debtToEquity: equityBand },
      liquidityAndCash: { score: liquidityAndCashScore, weight: COMPOSITE_WEIGHTS.liquidityAndCash, cashConversion: cashBand },
      dscr: { score: dscrScore, weight: COMPOSITE_WEIGHTS.dscr, band: dscrBand, loanAmount, assumedRate },
      signals: { score: signalsScoring.score, weight: COMPOSITE_WEIGHTS.signals, contributions: signalsScoring.contributions },
      dataQuality,
      overrideNotes,
    },
    signals,
    seriesMetrics,
  };
}
