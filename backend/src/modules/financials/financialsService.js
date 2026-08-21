import { prisma } from '../../config/db.js';

export async function getFinancials(companyId) {
  return prisma.normalizedFinancial.findMany({ where: { companyId }, orderBy: { periodEnd: 'asc' } });
}

export async function getMetrics(companyId) {
  return prisma.metricDerived.findMany({ where: { companyId }, orderBy: { periodEnd: 'asc' } });
}

export async function getSignals(companyId) {
  return prisma.riskSignal.findMany({ where: { companyId }, orderBy: { detectedAt: 'desc' } });
}

export async function getDiscrepancies(companyId) {
  return prisma.discrepancy.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
}

export async function resolveDiscrepancy({ discrepancyId, resolvedValue, resolutionStrategy, userId, note }) {
  const updated = await prisma.discrepancy.update({
    where: { id: discrepancyId },
    data: { status: 'resolved', resolvedValue, resolutionStrategy, resolvedConfidence: 0.85, note },
  });
  await prisma.auditLog.create({
    data: { userId, action: 'resolve_discrepancy', entity: 'Discrepancy', entityId: discrepancyId, metadata: { resolvedValue, resolutionStrategy } },
  });
  return updated;
}
