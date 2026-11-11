import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { body } from 'express-validator';
import {
  listComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/commentController.js';

const router = Router();

router.get(
  '/review/:reviewId',
  optionalAuth,
  listComments
);

router.get('/:id', optionalAuth, getComment);

router.post(
  '/',
  authenticateToken,
  body('review_id').notEmpty().withMessage('review_id is required'),
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  body('parent_id').optional().isUUID().withMessage('parent_id must be a valid UUID'),
  createComment
);

router.put(
  '/:id',
  authenticateToken,
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  updateComment
);

router.delete('/:id', authenticateToken, deleteComment);

export default router;