import { prisma } from '../../config/db.js';
import { NotFoundError, ConflictError } from '../../common/errors.js';
import { runPipelineForCompany, simulateRecommendation } from '../../pipeline/orchestrator.js';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const COMMON_TYPOS = {
  'relaince': 'reliance',
  'infy': 'infosys',
  'tcs': 'tata consultancy',
  'hfdc': 'hdfc',
  'icici': 'icici bank',
};

export async function searchCompanies(query) {
  if (!query || query.length < 2) return [];
  try {
    // 1. Check for common typos or short-hands
    let searchQuery = query.toLowerCase();
    for (const [typo, correction] of Object.entries(COMMON_TYPOS)) {
      if (searchQuery.includes(typo)) {
        searchQuery = searchQuery.replace(typo, correction);
      }
    }

    // Yahoo search gets confused and slow if we arbitrarily append "India".
    // We search the exact query, then strictly filter for Indian Equities (.NS / .BO).
    const results = await yahooFinance.search(searchQuery);
    if (!results || !results.quotes) return [];
    
    return results.quotes
      .filter(q => 
        q.symbol && 
        q.shortname && 
        q.quoteType === 'EQUITY' && // Exclude Mutual Funds and Indices which cause 500 errors
        (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'))
      )
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname,
        exchange: q.exchange,
        sector: q.sector || 'Unknown'
      }))
      .slice(0, 10);
  } catch (err) {
    return [];
  }
}

async function cascadeDeleteCompany(companyId) {
  await prisma.$transaction([
    prisma.recommendationEvidence.deleteMany({ where: { recommendation: { companyId } } }),
    prisma.recommendation.deleteMany({ where: { companyId } }),
    prisma.document.deleteMany({ where: { source: { companyId } } }),
    prisma.financialLineItem.deleteMany({ where: { companyId } }),
    prisma.dataSource.deleteMany({ where: { companyId } }),
    prisma.normalizedFinancial.deleteMany({ where: { companyId } }),
    prisma.metricDerived.deleteMany({ where: { companyId } }),
    prisma.riskSignal.deleteMany({ where: { companyId } }),
    prisma.discrepancy.deleteMany({ where: { companyId } }),
    prisma.agentRun.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ]);
}

export async function createCompanyAndRunPipeline({ name, companyKey, loanAmount, userId }) {
  let company;
  try {
    company = await prisma.company.create({
      data: {
        name,
        companyKey,
        createdBy: userId ?? null,
        sector: 'Infrastructure / Road & Irrigation EPC',
        exchange: 'NSE/BSE',
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError(`Company with ticker/key "${companyKey}" has already been analysed. You can view it on the dashboard or delete the existing record first.`);
    }
    throw err;
  }

  try {
    const result = await runPipelineForCompany({ companyId: company.id, companyKey, loanAmount });
    return { company, ...result };
  } catch (err) {
    // Clean up the newly created company if the pipeline fails during initial creation
    await cascadeDeleteCompany(company.id);
    throw err;
  }
}

export async function deleteCompany(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company', companyId);
  await cascadeDeleteCompany(companyId);
  return { success: true };
}

export async function refreshCompanyPipeline({ companyId, loanAmount }) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company', companyId);

  return runPipelineForCompany({
    companyId,
    companyKey: company.companyKey,
    loanAmount: loanAmount ?? (await latestLoanAmount(companyId)),
  });
}

export async function simulateForCompany({ companyId, loanAmount }) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company', companyId);
  return simulateRecommendation({ companyId, companyKey: company.companyKey, loanAmount });
}

async function latestLoanAmount(companyId) {
  const rec = await prisma.recommendation.findFirst({ where: { companyId }, orderBy: { version: 'desc' } });
  return rec?.loanAmountRequested ?? 1;
}

export async function getCompanyOverview(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company', companyId);

  const recommendation = await prisma.recommendation.findFirst({ where: { companyId }, orderBy: { version: 'desc' } });
  const openDiscrepancyCount = await prisma.discrepancy.count({ where: { companyId, status: 'open' } });
  const signalCount = await prisma.riskSignal.count({ where: { companyId } });

  return { company, recommendation, openDiscrepancyCount, signalCount };
}

export async function listCompanies() {
  return prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getPipelineStatus(companyId) {
  return prisma.agentRun.findMany({ where: { companyId }, orderBy: { startedAt: 'asc' } });
}
