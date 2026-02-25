import { Router } from 'express';
import authRoute from './apis/auth.route';
import postRoute from './apis/post.route';
import webhookRoute from './apis/webhook.route';

const router = Router();

router.use('/auth', authRoute);
router.use('/posts', postRoute);
router.use('/webhook', webhookRoute);

export default router;
