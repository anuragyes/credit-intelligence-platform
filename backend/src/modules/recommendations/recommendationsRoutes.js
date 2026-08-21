import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getRecommendationHandler, listVersionsHandler, getEvidenceHandler } from './recommendationsController.js';

// Mounted at /api/companies/:id
export const companyRecommendationRouter = Router({ mergeParams: true });
companyRecommendationRouter.use(requireAuth);
companyRecommendationRouter.get('/recommendation', getRecommendationHandler);
companyRecommendationRouter.get('/recommendation/versions', listVersionsHandler);

// Mounted at /api/evidence
export const evidenceRouter = Router();
evidenceRouter.use(requireAuth);
evidenceRouter.get('/:type/:id/source', getEvidenceHandler);
