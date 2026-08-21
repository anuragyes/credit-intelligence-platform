import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';
import { runPipelineForCompany } from '../src/pipeline/orchestrator.js';
import { logger } from '../src/common/logger.js';

async function main() {
  logger.info('Seeding database...');

  const passwordHash = await bcrypt.hash('analyst123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'analyst@creditintel.dev' },
    update: {},
    create: { name: 'Demo Analyst', email: 'analyst@creditintel.dev', passwordHash, role: 'analyst' },
  });
  logger.info({ email: user.email }, 'Seed user ready (password: analyst123)');

  const existing = await prisma.company.findUnique({ where: { companyKey: 'knr-constructions' } });
  if (existing) {
    logger.info('KNR Constructions already seeded — skipping pipeline run. Delete the row or use /refresh to re-run.');
    return;
  }

  const company = await prisma.company.create({
    data: {
      name: 'KNR Constructions Limited',
      companyKey: 'knr-constructions',
      ticker: 'KNRCON',
      isin: 'INE634I01029',
      cin: 'L45201TG1995PLC019313',
      sector: 'Infrastructure / Road & Irrigation EPC',
      exchange: 'NSE/BSE',
      createdBy: user.id,
    },
  });

  logger.info({ companyId: company.id }, 'Running full pipeline for KNR Constructions (₹1cr requested facility)...');
  const result = await runPipelineForCompany({ companyId: company.id, companyKey: 'knr-constructions', loanAmount: 1 });

  logger.info(
    { decision: result.recommendation.decision, confidence: result.recommendation.overallConfidence },
    'Seed pipeline run complete',
  );
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
