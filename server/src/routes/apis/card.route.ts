import { Router } from 'express';
import { cardController } from '@/controllers/card.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware);

// Lấy danh sách cards trong list
router.get('/list/:listId', cardController.getCardsByList);

// Lấy danh sách cards trong board
router.get('/board/:boardId', cardController.getCardsByBoard);

// CRUD cards
router.get('/:id', cardController.getCardById);
router.post('/', cardController.createCard);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);

// Di chuyển card
router.post('/:id/move', cardController.moveCard);

// Archive/Unarchive card
router.post('/:id/archive', cardController.archiveCard);
router.post('/:id/unarchive', cardController.unarchiveCard);

export default router;
