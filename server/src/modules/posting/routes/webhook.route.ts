import { Router } from 'express';
import { webhookController } from '@/modules/posting/controllers/webhook.controller';
import { validate } from '@/middlewares/validate.middleware';
import { aiAnalyzeCallbackSchema, aiEmbeddingCallbackSchema } from '@/modules/posting/webhook.schema';
import { aiMatchingCallbackSchema } from '@/modules/posting/matching.schema';

const router = Router();

router.post(
	'/ai/analyze-callback',
	validate(aiAnalyzeCallbackSchema),
	webhookController.aiAnalyzeCallback
);

router.post(
	'/ai/embedding-callback',
	validate(aiEmbeddingCallbackSchema),
	webhookController.aiEmbeddingCallback
);

router.post(
	'/ai/matching-callback',
	validate(aiMatchingCallbackSchema),
	webhookController.matchingHistoryCallback
);

export default router;
