import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { body } from 'express-validator';
import {
  getProgress,
  updateProgress,
  getHistory,
  continueReading,
  getCompleted,
  getAllProgress,
  removeProgress,
} from '../controllers/readingProgressController.js';

const router = Router();

router.get('/continue', authenticateToken, continueReading);

router.get('/history', authenticateToken, getHistory);

router.get('/completed', authenticateToken, getCompleted);

router.get('/', authenticateToken, getAllProgress);

router.get('/:novelId', authenticateToken, getProgress);

router.post(
  '/:novelId',
  authenticateToken,
  body('chapter_id').optional().isUUID().withMessage('chapter_id must be a valid UUID'),
  body('progress_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('progress_percent must be a number between 0 and 100'),
  updateProgress
);

router.delete('/:novelId', authenticateToken, removeProgress);

export default router;