import * as service from './recommendationsService.js';

export const getRecommendationHandler = async (req, res, next) => {
  try {
    res.json(await service.getRecommendation(req.params.id, req.query.version));
  } catch (err) {
    next(err);
  }
};

export const listVersionsHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.listRecommendationVersions(req.params.id) });
  } catch (err) {
    next(err);
  }
};

export const getEvidenceHandler = async (req, res, next) => {
  try {
    res.json(await service.getEvidenceSource(req.params.type, req.params.id));
  } catch (err) {
    next(err);
  }
};
