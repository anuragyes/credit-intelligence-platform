import { prisma } from '../../config/db.js';
import { NotFoundError } from '../../common/errors.js';

export async function getRecommendation(companyId, version) {
  const where = version ? { companyId, version: Number(version) } : { companyId };
  const recommendation = await prisma.recommendation.findFirst({
    where,
    orderBy: version ? undefined : { version: 'desc' },
  });
  if (!recommendation) throw new NotFoundError('Recommendation', companyId);

  const evidence = await prisma.recommendationEvidence.findMany({
    where: { recommendationId: recommendation.id },
    include: { metric: true, signal: true, discrepancy: true },
  });

  return { recommendation, evidence };
}

export async function listRecommendationVersions(companyId) {
  return prisma.recommendation.findMany({ where: { companyId }, orderBy: { version: 'desc' }, select: { id: true, version: true, decision: true, overallConfidence: true, loanAmountRequested: true, generatedAt: true } });
}

export async function getEvidenceSource(evidenceType, evidenceId) {
  if (evidenceType === 'discrepancy') {
    const discrepancy = await prisma.discrepancy.findUnique({ where: { id: evidenceId } });
    if (!discrepancy) throw new NotFoundError('Discrepancy', evidenceId);
    return { type: 'discrepancy', discrepancy };
  }

  if (evidenceType === 'metric') {
    const metric = await prisma.metricDerived.findUnique({ where: { id: evidenceId } });
    if (!metric) throw new NotFoundError('MetricDerived', evidenceId);
    const lineItems = await prisma.financialLineItem.findMany({
      where: { companyId: metric.companyId, periodEnd: metric.periodEnd },
      include: { source: true },
    });
    return { type: 'metric', metric, lineItems };
  }

  if (evidenceType === 'signal') {
    const signal = await prisma.riskSignal.findUnique({ where: { id: evidenceId } });
    if (!signal) throw new NotFoundError('RiskSignal', evidenceId);
    const relatedMetrics = await prisma.metricDerived.findMany({
      where: { companyId: signal.companyId, metricName: { in: signal.evidenceMetricNames } },
      orderBy: { periodEnd: 'asc' },
    });
    return { type: 'signal', signal, relatedMetrics };
  }

  throw new NotFoundError('Unknown evidence type', evidenceType);
}
