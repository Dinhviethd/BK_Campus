import { Router } from 'express';
import authRoute from './apis/auth.route';
import workspaceRoute from './apis/workspace.route';
import boardRoute from './apis/board.route';
import listRoute from './apis/list.route';
import cardRoute from './apis/card.route';
import labelRoute from './apis/label.route';

const router = Router();

router.use('/auth', authRoute);
router.use('/workspaces', workspaceRoute);
router.use('/boards', boardRoute);
router.use('/lists', listRoute);
router.use('/cards', cardRoute);
router.use('/labels', labelRoute);

export default router;
