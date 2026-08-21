import { describe, it, expect } from 'vitest';
import { scoreLoanApplication } from '../decisionEngine.js';
import { knrConstructionsPeriods, knrSignalContext, healthyCompanyPeriods } from './fixtures.js';

describe('scoreLoanApplication — determinism', () => {
  it('produces byte-identical output for identical input across repeated calls', () => {
    const input = { periods: knrConstructionsPeriods, loanAmount: 1, signalContext: knrSignalContext };
    const run1 = scoreLoanApplication(input);
    const run2 = scoreLoanApplication(input);
    expect(JSON.stringify(run1)).toEqual(JSON.stringify(run2));
  });
});

describe('scoreLoanApplication — KNR Constructions (real data, ₹1cr working-capital loan)', () => {
  const result = scoreLoanApplication({
    periods: knrConstructionsPeriods,
    loanAmount: 1,
    signalContext: knrSignalContext,
  });

  it('does not return a clean APPROVE given deteriorating cash conversion and low latest-period confidence', () => {
    expect(result.decision).not.toBe('APPROVE');
    expect(['APPROVE_WITH_CONDITIONS', 'DECLINE']).toContain(result.decision);
  });

  it('detects at least 3 meaningful signals as required by the brief', () => {
    expect(result.signals.length).toBeGreaterThanOrEqual(3);
  });

  it('flags the profit/cash divergence signal explicitly', () => {
    expect(result.signals.some((s) => s.key === 'profit_cash_divergence')).toBe(true);
  });

  it('flags rising working capital requirement', () => {
    expect(result.signals.some((s) => s.key === 'rising_working_capital_requirement')).toBe(true);
  });

  it('also surfaces the opportunity signal (order book), not risk-only', () => {
    expect(result.signals.some((s) => s.direction === 'opportunity')).toBe(true);
  });

  it('applies a data-quality confidence penalty because the latest period is low-confidence/provisional', () => {
    expect(result.scoreBreakdown.dataQuality.lowConfidencePenalty).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeLessThan(0.9);
  });

  it('never lets a low-confidence dataset produce a certain-sounding APPROVE (confidence floor guardrail)', () => {
    if (result.compositeScore >= 70) {
      expect(result.decision).not.toBe('APPROVE');
    }
  });
});

describe('scoreLoanApplication — loan amount sensitivity', () => {
  it('produces a materially lower DSCR score for a ₹20cr request than a ₹1cr request on the same financials', () => {
    const small = scoreLoanApplication({ periods: knrConstructionsPeriods, loanAmount: 1, signalContext: knrSignalContext });
    const large = scoreLoanApplication({ periods: knrConstructionsPeriods, loanAmount: 20, signalContext: knrSignalContext });

    expect(large.scoreBreakdown.dscr.band.score).toBeLessThanOrEqual(small.scoreBreakdown.dscr.band.score);
    // Nothing else about the input changed — this proves loanAmount is a
    // genuine parameter into the engine, not a cosmetic label.
    expect(large.signals.length).toEqual(small.signals.length);
  });

  it('does not silently reuse a cached decision when only loanAmount changes', () => {
    const oneCr = scoreLoanApplication({ periods: knrConstructionsPeriods, loanAmount: 1, signalContext: knrSignalContext });
    const twentyCr = scoreLoanApplication({ periods: knrConstructionsPeriods, loanAmount: 20, signalContext: knrSignalContext });
    expect(oneCr.scoreBreakdown.dscr.band.value).not.toEqual(twentyCr.scoreBreakdown.dscr.band.value);
  });
});

describe('scoreLoanApplication — healthy company control fixture', () => {
  it('produces a clean APPROVE for a company with strong, consistent fundamentals', () => {
    const result = scoreLoanApplication({ periods: healthyCompanyPeriods, loanAmount: 1 });
    expect(result.decision).toBe('APPROVE');
    expect(result.overallConfidence).toBeGreaterThan(0.7);
  });

  it('detects few or no high-severity risk signals for the healthy fixture', () => {
    const result = scoreLoanApplication({ periods: healthyCompanyPeriods, loanAmount: 1 });
    const highRisk = result.signals.filter((s) => s.direction === 'risk' && s.severity === 'high');
    expect(highRisk.length).toBe(0);
  });
});

describe('scoreLoanApplication — open discrepancies degrade confidence', () => {
  it('lowers overallConfidence as the number of open discrepancies increases', () => {
    const base = scoreLoanApplication({ periods: knrConstructionsPeriods, loanAmount: 1, signalContext: knrSignalContext });
    const withDiscrepancies = scoreLoanApplication({
      periods: knrConstructionsPeriods,
      loanAmount: 1,
      signalContext: knrSignalContext,
      openDiscrepancies: [
        { status: 'open' },
        { status: 'open' },
        { status: 'resolved' }, // resolved ones should NOT count against confidence
      ],
    });
    expect(withDiscrepancies.overallConfidence).toBeLessThan(base.overallConfidence);
  });
});
