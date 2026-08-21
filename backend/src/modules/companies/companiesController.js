import * as service from './companiesService.js';

export async function createCompanyHandler(req, res, next) {
  try {
    const { name, companyKey, loanAmount } = req.body;
    const result = await service.createCompanyAndRunPipeline({ name, companyKey, loanAmount, userId: req.user?.sub });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function searchCompaniesHandler(req, res, next) {
  try {
    const query = req.query.q;
    const results = await service.searchCompanies(query);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

export async function deleteCompanyHandler(req, res, next) {
  try {
    await service.deleteCompany(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function listCompaniesHandler(req, res, next) {
  try {
    res.json({ data: await service.listCompanies() });
  } catch (err) {
    next(err);
  }
}

export async function getCompanyHandler(req, res, next) {
  try {
    res.json(await service.getCompanyOverview(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function pipelineStatusHandler(req, res, next) {
  try {
    res.json({ data: await service.getPipelineStatus(req.params.id) });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req, res, next) {
  try {
    const result = await service.refreshCompanyPipeline({ companyId: req.params.id, loanAmount: req.body?.loanAmount });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function simulateHandler(req, res, next) {
  try {
    const result = await service.simulateForCompany({ companyId: req.params.id, loanAmount: req.body.loanAmount });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
