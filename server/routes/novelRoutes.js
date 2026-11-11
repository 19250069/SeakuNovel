import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import upload from '../config/upload.js';
import {
  listNovels,
  getNovel,
  createNovel,
  updateNovel,
  deleteNovel,
  getGenres,
  getMyNovels,
  publishNovel,
  unpublishNovel,
  getNovelAnalytics,
} from '../controllers/novelController.js';
import { body } from 'express-validator';
import { listChapters } from '../controllers/chapterController.js';

const router = Router();

router.get('/', listNovels);

router.get('/genres', getGenres);

router.get('/me', authenticateToken, getMyNovels);

router.get('/:id/analytics', authenticateToken, getNovelAnalytics);

router.get('/:novelId/chapters', optionalAuth, listChapters);

router.get('/:id', optionalAuth, getNovel);

router.post(
  '/',
  authenticateToken,
  upload.single('cover'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('slug').trim().notEmpty().withMessage('Slug is required'),
  createNovel
);

router.put('/:id/publish', authenticateToken, publishNovel);

router.put('/:id/unpublish', authenticateToken, unpublishNovel);

router.put(
  '/:id',
  authenticateToken,
  upload.single('cover'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('slug').optional().trim().notEmpty().withMessage('Slug cannot be empty'),
  body('synopsis').optional().trim().notEmpty().withMessage('Synopsis cannot be empty'),
  updateNovel
);

router.delete('/:id', authenticateToken, deleteNovel);

export default router;
