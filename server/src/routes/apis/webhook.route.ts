import { Router } from 'express';
import { webhookController } from '@/controllers/webhook.controller';

const router = Router();

// Bot chạy xong → Supabase DB trigger gọi endpoint này → server refresh cache
router.post('/crawl-complete', webhookController.crawlComplete);

// Health check — xem thông tin cache (debug)
router.get('/cache-stats', webhookController.cacheStats);

export default router;
