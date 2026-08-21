import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  getFinancialsHandler,
  getMetricsHandler,
  getSignalsHandler,
  getDiscrepanciesHandler,
  resolveDiscrepancyHandler,
} from './financialsController.js';

// Mounted at /api/companies/:id/...
export const companyFinancialsRouter = Router({ mergeParams: true });
companyFinancialsRouter.use(requireAuth);
companyFinancialsRouter.get('/financials', getFinancialsHandler);
companyFinancialsRouter.get('/metrics', getMetricsHandler);
companyFinancialsRouter.get('/signals', getSignalsHandler);
companyFinancialsRouter.get('/discrepancies', getDiscrepanciesHandler);

// Mounted at /api/discrepancies/...
export const discrepanciesRouter = Router();
discrepanciesRouter.use(requireAuth);
discrepanciesRouter.patch('/:discrepancyId/resolve', resolveDiscrepancyHandler);
