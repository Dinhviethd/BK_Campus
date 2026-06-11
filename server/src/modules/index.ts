import { Router } from 'express';
import authRoute from './auth/auth.route';
import postRoute from './posting/routes/post.route';
import matchingRoute from './posting/routes/matching.route';
import webhookRoute from './posting/routes/webhook.route';
import realtimeRoute from './realtime/realtime.route';

const router = Router();

router.use('/auth', authRoute);
router.use('/posts', postRoute);
router.use('/matching', matchingRoute);
router.use('/webhook', webhookRoute);
router.use('/realtime', realtimeRoute);

export default router;
