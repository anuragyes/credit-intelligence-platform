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

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  app.use('/api/companies/:id', companyFinancialsRouter);
  app.use('/api/companies/:id', companyRecommendationRouter);
  app.use('/api/discrepancies', discrepanciesRouter);
  app.use('/api/evidence', evidenceRouter);
  app.use('/api/agent-runs', agentRunsRouter);

  // Serve frontend static files
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  // Catch-all route for SPA navigation
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
