import { Router } from 'express';
import { listController } from '@/controllers/list.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware);

// Lấy danh sách lists trong board
router.get('/board/:boardId', listController.getListsByBoard);

// CRUD lists
router.post('/', listController.createList);
router.put('/:id', listController.updateList);
router.delete('/:id', listController.deleteList);

// Archive list
router.post('/:id/archive', listController.archiveList);

export default router;
