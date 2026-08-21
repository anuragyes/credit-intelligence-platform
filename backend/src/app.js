import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './common/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { authRouter } from './modules/auth/authRoutes.js';
import { companiesRouter } from './modules/companies/companiesRoutes.js';
import { companyFinancialsRouter, discrepanciesRouter } from './modules/financials/financialsRoutes.js';
import { companyRecommendationRouter, evidenceRouter } from './modules/recommendations/recommendationsRoutes.js';
import { agentRunsRouter } from './modules/agentRuns/agentRunsRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use('/api', apiRateLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/companies', companiesRouter);
  // Nested company sub-resources — each router uses mergeParams to read :id
  app.use('/api/companies/:id', companyFinancialsRouter);
  app.use('/api/companies/:id', companyRecommendationRouter);
  app.use('/api/discrepancies', discrepanciesRouter);
  app.use('/api/evidence', evidenceRouter);
  app.use('/api/agent-runs', agentRunsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
