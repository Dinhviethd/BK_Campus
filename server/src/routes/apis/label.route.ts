import { Router } from 'express';
import { labelController } from '@/controllers/label.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware);

// Lấy danh sách labels trong board
router.get('/board/:boardId', labelController.getLabelsByBoard);

// CRUD labels
router.post('/', labelController.createLabel);
router.put('/:id', labelController.updateLabel);
router.delete('/:id', labelController.deleteLabel);

// Thêm/Xóa label khỏi card
router.post('/card/:cardId', labelController.addLabelToCard);
router.delete('/card/:cardId/:labelId', labelController.removeLabelFromCard);

export default router;
