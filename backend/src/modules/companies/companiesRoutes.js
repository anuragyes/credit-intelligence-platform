import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createCompanySchema, simulateSchema } from './schema.js';
import {
  createCompanyHandler,
  deleteCompanyHandler,
  listCompaniesHandler,
  getCompanyHandler,
  pipelineStatusHandler,
  refreshHandler,
  simulateHandler,
  searchCompaniesHandler,
} from './companiesController.js';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);
companiesRouter.get('/', listCompaniesHandler);
companiesRouter.get('/search', searchCompaniesHandler);
companiesRouter.post('/', validate(createCompanySchema), createCompanyHandler);
companiesRouter.get('/:id', getCompanyHandler);
companiesRouter.delete('/:id', deleteCompanyHandler);
companiesRouter.get('/:id/pipeline-status', pipelineStatusHandler);
companiesRouter.post('/:id/refresh', refreshHandler);
companiesRouter.post('/:id/recommendation/simulate', validate(simulateSchema), simulateHandler);
