import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { body } from 'express-validator';
import {
  listBookmarks,
  checkBookmarkStatus,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  getBookmarkCount,
} from '../controllers/bookmarkController.js';

const router = Router();

router.get('/', authenticateToken, listBookmarks);

router.get('/count', authenticateToken, getBookmarkCount);

router.get('/:novelId/status', authenticateToken, checkBookmarkStatus);

router.post(
  '/:novelId',
  authenticateToken,
  addBookmark
);

router.delete('/:novelId', authenticateToken, removeBookmark);

router.post(
  '/:novelId/toggle',
  authenticateToken,
  toggleBookmark
);

export default router;