import { Router } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { matchingController } from '@/modules/posting/controllers/matching.controller';
import { confirmMatchCandidateSchema, createMatchRequestSchema } from '@/modules/posting/matching.schema';

const router = Router();

router.get(
  '/match-requests/scan-state',
  authMiddleware,
  matchingController.getScanState
);

router.get(
  '/match-requests/pending-result',
  authMiddleware,
  matchingController.getLatestPendingResult
);

router.post(
  '/match-requests',
  authMiddleware,
  validate(createMatchRequestSchema),
  matchingController.createMatchRequest
);

router.post(
  '/match-requests/:requestId/confirm-candidate',
  authMiddleware,
  validate(confirmMatchCandidateSchema),
  matchingController.confirmCandidate
);

export default router;
