import * as service from './financialsService.js';

export const getFinancialsHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.getFinancials(req.params.id) });
  } catch (err) {
    next(err);
  }
};

export const getMetricsHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.getMetrics(req.params.id) });
  } catch (err) {
    next(err);
  }
};

export const getSignalsHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.getSignals(req.params.id) });
  } catch (err) {
    next(err);
  }
};

export const getDiscrepanciesHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.getDiscrepancies(req.params.id) });
  } catch (err) {
    next(err);
  }
};

export const resolveDiscrepancyHandler = async (req, res, next) => {
  try {
    const result = await service.resolveDiscrepancy({
      discrepancyId: req.params.discrepancyId,
      resolvedValue: req.body.resolvedValue,
      resolutionStrategy: req.body.resolutionStrategy ?? 'manual',
      note: req.body.note,
      userId: req.user?.sub,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
