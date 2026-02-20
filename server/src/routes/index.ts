import { Router } from 'express';
import authRoute from './apis/auth.route';
import postRoute from './apis/post.route';


const router = Router();

router.use('/auth', authRoute);
router.use('/posts', postRoute);
export default router;
