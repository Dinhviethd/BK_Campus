import { Router } from 'express';
import { boardController } from '@/controllers/board.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware);

// Lấy danh sách boards trong workspace
router.get('/workspace/:workspaceId', boardController.getBoardsByWorkspace);

// CRUD boards
router.get('/:id', boardController.getBoardById);
router.post('/', boardController.createBoard);
router.put('/:id', boardController.updateBoard);
router.delete('/:id', boardController.deleteBoard);

export default router;
