import { Router } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { matchingController } from '@/modules/posting/controllers/matching.controller';
import { createMatchRequestSchema } from '@/modules/posting/matching.schema';

const router = Router();

router.get(
  '/match-requests/scan-state',
  authMiddleware,
  matchingController.getScanState
);

router.post(
  '/match-requests',
  authMiddleware,
  validate(createMatchRequestSchema),
  matchingController.createMatchRequest
);

export default router;
