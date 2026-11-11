import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import { getReviews, getReviewsByNovel, getReviewById, getReviewByNovelAndUser, createReview as createReviewSvc, updateReview as updateReviewSvc, deleteReview as deleteReviewSvc } from '../models/review.js';
import { getNovelById } from '../models/novel.js';

export const listReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const novelId = req.query.novel_id || '';
    const userId = req.query.user_id || '';
    const sort = req.query.sort || 'latest';

    const result = await getReviews({ page, limit, novelId, userId, sort });
    res.json(result);
  } catch (error) {
    console.error('List reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listNovelReviews = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sort = req.query.sort || 'latest';

    const result = await getReviewsByNovel(novelId, { page, limit, sort });
    res.json(result);
  } catch (error) {
    console.error('List novel reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReview = async (req, res) => {
  try {
    const review = await getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ review });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { novel_id, user_id, rating, title, content } = req.body;

    if (!novel_id || !user_id) {
      return res.status(400).json({ error: 'novel_id and user_id are required' });
    }

    const novel = await getNovelById(novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Can only create a review for yourself' });
    }

    const existing = await getReviewByNovelAndUser(novel_id, user_id);
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this novel' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const { containsProfanity } = await import('../utils/profanityFilter.js');
    if (containsProfanity(title) || containsProfanity(content)) {
      return res.status(400).json({ error: 'Ulasan mengandung kata-kata yang tidak pantas (Profanity).' });
    }

    const cleanTitle = (title || '').replace(/<[^>]*>?/gm, '').trim();
    if (!cleanTitle) {
      return res.status(400).json({ error: 'Review title is required' });
    }

    const cleanContent = (content || '').replace(/<[^>]*>?/gm, '').trim();
    if (!cleanContent) {
      return res.status(400).json({ error: 'Review content is required' });
    }

    // Trace create flow
    const result = await createReviewSvc({ novel_id, user_id, rating, title: cleanTitle, content: cleanContent });
    if (result && result.alreadyExists) {
      return res.status(409).json({ error: 'You have already reviewed this novel', review: result.review });
    }

    // Notify author of novel
    import('../models/notification.js').then(({ notifyNovelReview }) => {
      notifyNovelReview({
        authorId: novel.author_id,
        reviewerUser: req.user,
        novel,
        rating,
      }).catch((e) => console.error('Failed to notify novel review:', e));
    }).catch(() => {});

    // Fetch fresh novel stats after review creation so frontend can update immediately
    const freshNovel = await getNovelById(novel_id);
    res.status(201).json({
      message: 'Review created',
      review: result,
      novelStats: {
        average_rating: freshNovel?.average_rating || 0,
        rating_count: freshNovel?.rating_count || 0,
        total_views: freshNovel?.total_views || 0,
      }
    });
  } catch (error) {
    const errText = error && error.stack ? error.stack : String(error);
    console.error('Create review error:', errText);
    try {
      await import('fs').then(fs => fs.appendFileSync('server/review-error.log', new Date().toISOString() + ' ' + errText + '\n'));
    } catch (e) {
      // ignore file write errors
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReview = async (req, res) => {
  try {
    const existing = await getReviewById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.id !== existing.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the reviewer or admin can update this review' });
    }

    const { rating, title, content } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const updated = await updateReviewSvc(req.params.id, { rating, title, content });
    res.json({ message: 'Review updated', review: updated });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const existing = await getReviewById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (req.user.id !== existing.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the reviewer or admin can delete this review' });
    }

    const deleted = await deleteReviewSvc(req.params.id);
    if (deleted) {
      res.json({ message: 'Review deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete review' });
    }
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likeReview = async (req, res) => {
  try {
    const review = await getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const existingLike = await query(
      'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existingLike.length > 0) {
      await query('DELETE FROM review_likes WHERE id = ?', [existingLike[0].id]);
      res.json({ message: 'Review unliked', liked: false });
    } else {
      await query(
        'INSERT INTO review_likes (id, review_id, user_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), req.params.id, req.user.id]
      );
      res.json({ message: 'Review liked', liked: true });
    }
  } catch (error) {
    console.error('Like review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  listReviews,
  listNovelReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
};