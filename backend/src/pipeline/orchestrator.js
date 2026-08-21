import { prisma } from '../config/db.js';
import { logger } from '../common/logger.js';
import { runResearchAgent } from './agents/researchAgent.js';
import { runExtractionAgent } from './agents/extractionAgent.js';
import { runReconciliationAgent } from './agents/reconciliationAgent.js';
import { scoreLoanApplication } from '../domain/scoring/decisionEngine.js';
import { generateNarrative } from './llm/adapter.js';

/** Wraps a pipeline stage with AgentRun persistence so every step is replayable. */
async function withAgentRun({ companyId, stage, input, fn }) {
  const run = await prisma.agentRun.create({
    data: { companyId, stage, status: 'running', inputSnapshot: input ?? {} },
  });
  const started = Date.now();
  try {
    const output = await fn();
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'succeeded',
        outputSnapshot: safeJson(output),
        latencyMs: Date.now() - started,
        completedAt: new Date(),
      },
    });
    return output;
  } catch (err) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'failed', error: String(err?.message ?? err), latencyMs: Date.now() - started, completedAt: new Date() },
    });
    throw err;
  }
}

function safeJson(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { note: 'output not serializable, omitted' };
  }
}

/**
 * Runs the full 6-stage pipeline for a company and persists every artifact:
 * data sources -> line items -> normalized financials -> derived metrics ->
 * risk signals -> discrepancies -> recommendation (+evidence) -> narrative.
 *
 * This is the "refresh" path: research + extraction run again, producing a
 * new version. See `simulateRecommendation` below for the cheaper
 * scoring-only re-run used when only the loan amount changes.
 */
export async function runPipelineForCompany({ companyId, companyKey, loanAmount }) {
  const research = await withAgentRun({
    companyId,
    stage: 'research',
    input: { companyKey },
    fn: () => runResearchAgent({ companyKey }),
  });

  // Update the Company record with the dynamically scraped sector and exchange
  if (research.company) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        sector: research.company.sector,
        exchange: research.company.exchange,
        ticker: research.company.ticker,
      }
    });
  }

  const extraction = await withAgentRun({
    companyId,
    stage: 'extraction',
    input: { sourceCount: research.sources.length },
    fn: () => runExtractionAgent({ sources: research.sources }),
  });

  const reconciliation = await withAgentRun({
    companyId,
    stage: 'reconciliation',
    input: { lineItemCount: extraction.lineItems.length },
    fn: () => runReconciliationAgent({ lineItems: extraction.lineItems, derivedDiscrepancies: research.derivedDiscrepancies }),
  });

  // Persist data sources + line items for provenance drill-down.
  const sourceIdMap = new Map();
  for (const src of research.sources) {
    const row = await prisma.dataSource.create({
      data: {
        companyId,
        sourceType: src.sourceType,
        title: src.title,
        publisher: src.publisher,
        url: src.url,
        trustScore: src.trustScore,
        trustRationale: src.trustRationale,
      },
    });
    sourceIdMap.set(src.id, row.id);
  }
  for (const item of extraction.lineItems) {
    await prisma.financialLineItem.create({
      data: {
        companyId,
        sourceId: sourceIdMap.get(item.sourceId),
        lineItem: item.metric,
        periodLabel: item.period,
        periodEnd: new Date(item.periodEnd),
        value: item.value,
        unit: item.unit,
        confidence: item.trustScore ?? 0.7,
      },
    });
  }

  // Persist normalized financials (one row per company/period/metric).
  for (const period of reconciliation.periods) {
    for (const [field, value] of Object.entries(period)) {
      if (!['revenue', 'ebitda', 'otherIncome', 'interestExpense', 'depreciation', 'netProfit', 'totalDebt', 'equityCapital', 'reserves', 'cashFromOps', 'debtorDays', 'workingCapitalDays'].includes(field)) continue;
      if (value == null) continue;
      await prisma.normalizedFinancial.upsert({
        where: { companyId_periodEnd_metricKey: { companyId, periodEnd: new Date(period.periodEnd), metricKey: field } },
        create: { companyId, periodLabel: period.periodLabel, periodEnd: new Date(period.periodEnd), metricKey: field, value, confidence: period.confidence },
        update: { value, confidence: period.confidence },
      });
    }
  }

  // Persist discrepancies from reconciliation.
  const discrepancyRows = [];
  for (const d of reconciliation.discrepancies) {
    const row = await prisma.discrepancy.create({
      data: {
        companyId,
        metricKey: d.metricKey,
        periodLabel: d.periodLabel,
        periodEnd: new Date(d.periodEnd),
        labelA: d.labelA,
        valueA: d.valueA,
        sourceRefA: d.sourceRefA,
        labelB: d.labelB,
        valueB: d.valueB,
        sourceRefB: d.sourceRefB,
        deltaPct: d.deltaPct,
        resolutionStrategy: d.resolutionStrategy,
        resolvedValue: d.resolvedValue,
        resolvedConfidence: d.resolvedConfidence,
        status: d.status,
        note: d.note,
      },
    });
    discrepancyRows.push(row);
  }

  const analysisAndScoring = await withAgentRun({
    companyId,
    stage: 'scoring',
    input: { loanAmount, periodCount: reconciliation.periods.length },
    fn: async () =>
      scoreLoanApplication({
        periods: reconciliation.periods,
        loanAmount,
        openDiscrepancies: discrepancyRows,
        signalContext: reconciliation.signalContext,
      }),
  });

  // Persist derived metrics.
  const metricRows = [];
  for (const periodMetrics of analysisAndScoring.seriesMetrics.perPeriod) {
    for (const [metricName, m] of Object.entries(periodMetrics.metrics)) {
      if (m.value == null) continue;
      const row = await prisma.metricDerived.create({
        data: {
          companyId,
          periodLabel: periodMetrics.periodLabel,
          periodEnd: new Date(periodMetrics.periodEnd),
          metricName,
          value: m.value,
          formula: m.formula,
          inputs: {},
          trend: analysisAndScoring.seriesMetrics.trends[metricName] ?? null,
        },
      });
      metricRows.push(row);
    }
  }

  // Persist risk/opportunity signals.
  const signalRows = [];
  for (const s of analysisAndScoring.signals) {
    const row = await prisma.riskSignal.create({
      data: {
        companyId,
        signalKey: s.key,
        severity: s.severity,
        direction: s.direction,
        description: s.description,
        evidenceMetricNames: s.evidenceMetricNames ?? [],
        confidence: s.confidence ?? 0.75,
      },
    });
    signalRows.push(row);
  }

  const narrative = await withAgentRun({
    companyId,
    stage: 'narrative',
    input: { decision: analysisAndScoring.decision },
    fn: () => generateNarrative({ companyName: research.company.name, loanAmount, decisionResult: analysisAndScoring }),
  });

  const previousVersion = await prisma.recommendation.findFirst({ where: { companyId }, orderBy: { version: 'desc' } });
  const version = (previousVersion?.version ?? 0) + 1;

  const recommendation = await prisma.recommendation.create({
    data: {
      companyId,
      loanAmountRequested: loanAmount,
      decision: analysisAndScoring.decision,
      overallConfidence: analysisAndScoring.overallConfidence,
      scoreBreakdown: analysisAndScoring.scoreBreakdown,
      narrative: narrative.text,
      version,
    },
  });

  // Link evidence: every persisted metric + signal + open discrepancy feeds the trace.
  const evidenceData = [
    ...metricRows.map((m) => ({ recommendationId: recommendation.id, evidenceType: 'metric', metricId: m.id })),
    ...signalRows.map((s) => ({ recommendationId: recommendation.id, evidenceType: 'signal', signalId: s.id })),
    ...discrepancyRows.map((d) => ({ recommendationId: recommendation.id, evidenceType: 'discrepancy', discrepancyId: d.id })),
  ];
  if (evidenceData.length) {
    await prisma.recommendationEvidence.createMany({ data: evidenceData });
  }

  logger.info({ companyId, decision: recommendation.decision, version }, 'Pipeline run complete');

  return { recommendation, signals: signalRows, discrepancies: discrepancyRows, metrics: metricRows, narrative: narrative.text };
}

/**
 * Cheap re-score path used by POST /companies/:id/recommendation/simulate.
 * Deliberately skips research/extraction/reconciliation against external
 * sources — it reads the *already persisted* normalized financials and
 * discrepancies for the company, and only re-runs the deterministic scoring
 * + narrative stages against a different `loanAmount`. This is what makes
 * the "loan amount changes from ₹1cr to ₹20cr" live-round scenario an
 * instant re-score instead of a full pipeline re-run.
 */
export async function simulateRecommendation({ companyId, companyKey, loanAmount }) {
  const normalized = await prisma.normalizedFinancial.findMany({ where: { companyId } });
  if (!normalized.length) {
    throw new Error('No persisted financials for this company yet — run the pipeline first.');
  }

  const byPeriod = new Map();
  for (const row of normalized) {
    const key = row.periodLabel;
    if (!byPeriod.has(key)) {
      byPeriod.set(key, {
        periodLabel: row.periodLabel,
        periodEnd: row.periodEnd.toISOString(),
        isPartialPeriod: /provisional/i.test(row.periodLabel),
        confidenceSum: 0,
        confidenceCount: 0,
      });
    }
    const period = byPeriod.get(key);
    period[row.metricKey] = row.value;
    period.confidenceSum += row.confidence;
    period.confidenceCount += 1;
  }
  const periods = [...byPeriod.values()].map((p) => ({ ...p, confidence: Number((p.confidenceSum / p.confidenceCount).toFixed(2)) }));

  const openDiscrepancies = await prisma.discrepancy.findMany({ where: { companyId, status: 'open' } });

  // Cheap local read (no network/LLM) purely to recover order-book context
  // for the opportunity signal — see function docblock above.
  let signalContext = {};
  try {
    const research = runResearchAgent({ companyKey });
    const orderBookItem = research.sources
      .flatMap((s) => s.extractedLineItems ?? [])
      .find((i) => i.metric === 'order_book_total');
    signalContext = {
      orderBookTotal: orderBookItem?.value ?? null,
      fullYearRevenues: periods.filter((p) => !p.isPartialPeriod).sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd)).map((p) => p.revenue).filter(Boolean),
    };
  } catch {
    signalContext = { fullYearRevenues: periods.filter((p) => !p.isPartialPeriod).map((p) => p.revenue).filter(Boolean) };
  }

  const result = scoreLoanApplication({ periods, loanAmount, openDiscrepancies, signalContext });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const narrative = await generateNarrative({ companyName: company.name, loanAmount, decisionResult: result });

  const previousVersion = await prisma.recommendation.findFirst({ where: { companyId }, orderBy: { version: 'desc' } });
  const version = (previousVersion?.version ?? 0) + 1;

  const recommendation = await prisma.recommendation.create({
    data: {
      companyId,
      loanAmountRequested: loanAmount,
      decision: result.decision,
      overallConfidence: result.overallConfidence,
      scoreBreakdown: result.scoreBreakdown,
      narrative: narrative.text,
      version,
    },
  });

  return { recommendation, signals: result.signals, narrative: narrative.text, simulated: true };
}
