import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { body } from 'express-validator';
import {
  listReviews,
  listNovelReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
} from '../controllers/reviewController.js';

const router = Router();

router.get('/', optionalAuth, listReviews);

router.get('/:id', optionalAuth, getReview);

router.get('/novel/:novelId', optionalAuth, listNovelReviews);

router.post(
  '/',
  authenticateToken,
  body('novel_id').notEmpty().withMessage('novel_id is required'),
  body('user_id').notEmpty().withMessage('user_id is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().notEmpty().withMessage('Review title is required'),
  body('content').trim().notEmpty().withMessage('Review content is required'),
  createReview
);

router.put(
  '/:id',
  authenticateToken,
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
  updateReview
);

router.delete('/:id', authenticateToken, deleteReview);

router.post('/:id/like', authenticateToken, likeReview);

export default router;