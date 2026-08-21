import { describe, it, expect } from 'vitest';
import {
  ebitdaMargin,
  interestCoverageRatio,
  debtToEbitda,
  debtToEquity,
  cashConversionRatio,
  incrementalDSCR,
  yoyGrowth,
  computeSeriesMetrics,
} from '../metrics.js';
import { knrConstructionsPeriods } from './fixtures.js';

const fy2025 = knrConstructionsPeriods[2];

describe('pure ratio functions', () => {
  it('computes EBITDA margin correctly', () => {
    expect(ebitdaMargin(fy2025)).toBeCloseTo(1610 / 4753, 4);
  });

  it('computes interest coverage ratio correctly', () => {
    expect(interestCoverageRatio(fy2025)).toBeCloseTo(1610 / 208, 4);
  });

  it('computes debt/EBITDA correctly', () => {
    expect(debtToEbitda(fy2025)).toBeCloseTo(1849 / 1610, 4);
  });

  it('computes debt/equity correctly using equity + reserves as net worth', () => {
    expect(debtToEquity(fy2025)).toBeCloseTo(1849 / (56 + 4485), 4);
  });

  it('computes negative cash conversion when operating cash flow is negative', () => {
    expect(cashConversionRatio(fy2025)).toBeCloseTo(-567 / 1610, 4);
    expect(cashConversionRatio(fy2025)).toBeLessThan(0);
  });

  it('incremental DSCR decreases as loanAmount increases, holding everything else fixed', () => {
    const dscr1cr = incrementalDSCR(fy2025, 1, 0.11);
    const dscr20cr = incrementalDSCR(fy2025, 20, 0.11);
    expect(dscr20cr).toBeLessThan(dscr1cr);
  });

  it('returns null rather than throwing/guessing when a denominator is zero or missing', () => {
    expect(interestCoverageRatio({ ebitda: 100, interestExpense: 0 })).toBeNull();
    expect(debtToEquity({ totalDebt: 100, equityCapital: 0, reserves: 0 })).toBeNull();
  });

  it('yoyGrowth handles missing previous-period data by returning null, not NaN', () => {
    expect(yoyGrowth(100, null)).toBeNull();
    expect(yoyGrowth(100, undefined)).toBeNull();
  });
});

describe('computeSeriesMetrics', () => {
  const series = computeSeriesMetrics(knrConstructionsPeriods, { loanAmount: 1, assumedRate: 0.11 });

  it('sorts periods chronologically regardless of input order', () => {
    const shuffled = [...knrConstructionsPeriods].reverse();
    const reSeries = computeSeriesMetrics(shuffled, { loanAmount: 1, assumedRate: 0.11 });
    expect(reSeries.perPeriod.map((p) => p.periodLabel)).toEqual(series.perPeriod.map((p) => p.periodLabel));
  });

  it('flags working_capital_days trend as deteriorating for KNR (77 -> 345)', () => {
    expect(series.trends.working_capital_days).toBe('deteriorating');
  });

  it('flags cash_conversion_ratio trend as deteriorating', () => {
    expect(series.trends.cash_conversion_ratio).toBe('deteriorating');
  });

  it('every metric carries its formula string for UI/explainability purposes', () => {
    for (const metricKey of Object.keys(series.latest.metrics)) {
      expect(series.latest.metrics[metricKey]).toHaveProperty('formula');
      expect(typeof series.latest.metrics[metricKey].formula).toBe('string');
    }
  });
});
