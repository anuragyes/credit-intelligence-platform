import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../config/db.js';

// Mounted at /api/agent-runs — returns the full per-stage pipeline trace for
// a company, in order, for reviewer/debug purposes (ARCHITECTURE.md §5.2).
export const agentRunsRouter = Router();
agentRunsRouter.use(requireAuth);
agentRunsRouter.get('/:companyId', async (req, res, next) => {
  try {
    const runs = await prisma.agentRun.findMany({ where: { companyId: req.params.companyId }, orderBy: { startedAt: 'asc' } });
    res.json({ data: runs });
  } catch (err) {
    next(err);
  }
});
