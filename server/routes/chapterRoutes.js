import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { body } from 'express-validator';
import {
  listChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  publishChapter,
  unpublishChapter,
  scheduleChapter,
  listTrashedChapters,
  restoreChapter,
  getChapterComments,
  addChapterComment,
  recordView
} from '../controllers/chapterController.js';

const router = Router();

// Specific routes first (before parameterized routes)
router.get('/novel/:novelId', optionalAuth, listChapters);
router.get('/trash/:novelId', authenticateToken, listTrashedChapters);

router.put(
  '/reorder/:novelId',
  authenticateToken,
  body('orders').isArray().withMessage('orders must be an array'),
  reorderChapters
);

// Chapter by ID routes
// Public read access; the controller enforces draft/publish visibility.
router.get('/:id', optionalAuth, getChapter);

router.put(
  '/:id',
  authenticateToken,
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('slug').optional().trim().notEmpty().withMessage('Slug cannot be empty'),
  body('chapter_number').optional().isInt({ min: 1 }).withMessage('Chapter number must be a positive integer'),
  body('order_index').optional().isInt({ min: 1 }).withMessage('Order index must be a positive integer'),
  body('is_published').optional().isBoolean().withMessage('is_published must be a boolean'),
  updateChapter
);

router.delete('/:id', authenticateToken, deleteChapter);
router.post('/:id/restore', authenticateToken, restoreChapter);

router.post('/:id/publish', authenticateToken, publishChapter);
router.post('/:id/unpublish', authenticateToken, unpublishChapter);
router.post('/:id/schedule', authenticateToken, scheduleChapter);
// [SECURITY] Rate limit view tracking: max 5 view pings per chapter per IP per minute.
// This prevents bot inflation of view counts without breaking normal reading behaviour.
const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.params.id}`,
  message: { error: 'Too many view requests' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/:id/view', viewLimiter, recordView);

// Inline comments
router.get('/:id/comments', getChapterComments);
router.post(
  '/:id/comments',
  authenticateToken,
  body('paragraph_index').isInt().withMessage('Paragraph index is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  addChapterComment
);


// Chapter creation (under novel)
router.post(
  '/create',
  authenticateToken,
  body('novel_id').trim().notEmpty().withMessage('novel_id is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('slug').trim().notEmpty().withMessage('Slug is required'),
  body('chapter_number').optional().isInt({ min: 1 }).withMessage('Chapter number must be a positive integer'),
  body('order_index').optional().isInt({ min: 1 }).withMessage('Order index must be a positive integer'),
  createChapter
);

export default router;