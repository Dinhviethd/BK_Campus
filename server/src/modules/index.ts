import { Router } from 'express';
import authRoute from './auth/auth.route';
import postRoute from './posting/routes/post.route';
import webhookRoute from './posting/routes/webhook.route';

const router = Router();

router.use('/auth', authRoute);
router.use('/posts', postRoute);
router.use('/webhook', webhookRoute);

export default router;
