import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import { getCommentsByReview, getCommentById, getReplies, createComment as createCommentSvc, updateComment as updateCommentSvc, deleteComment as deleteCommentSvc } from '../models/comment.js';
import { getReviewById } from '../models/review.js';

export const listComments = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sort = req.query.sort || 'newest';

    const review = await getReviewById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const result = await getCommentsByReview(reviewId, { page, limit, sort });
    res.json(result);
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getComment = async (req, res) => {
  try {
    const comment = await getCommentById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const replies = await getReplies(req.params.id);
    comment.replies = replies;

    res.json({ comment });
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { review_id, content, parent_id } = req.body;

    if (!review_id) {
      return res.status(400).json({ error: 'review_id is required' });
    }

    const review = await getReviewById(review_id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (parent_id) {
      const parent = await getCommentById(parent_id);
      if (!parent) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      if (parent.review_id !== review_id) {
        return res.status(400).json({ error: 'Parent comment must belong to the same review' });
      }
    }

    const { containsProfanity } = await import('../utils/profanityFilter.js');
    if (containsProfanity(content)) {
      return res.status(400).json({ error: 'Komentar mengandung kata-kata yang tidak pantas (Profanity).' });
    }

    const cleanContent = content.replace(/<[^>]*>?/gm, '').trim();
    if (!cleanContent) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await createCommentSvc({
      review_id,
      user_id: req.user.id,
      parent_id: parent_id || null,
      content: cleanContent,
    });

    if (parent_id) {
      import('../models/comment.js').then(async ({ getCommentById }) => {
        const parent = await getCommentById(parent_id);
        if (parent && parent.user_id !== req.user.id) {
          const { notifyCommentReply } = await import('../models/notification.js');
          await notifyCommentReply({
            parentUserId: parent.user_id,
            replierUser: req.user,
            reviewId: review_id,
          });
        }
      }).catch((e) => console.error('Error notifying comment reply:', e));
    }

    res.status(201).json({ message: 'Comment created', comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateComment = async (req, res) => {
  try {
    const existing = await getCommentById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.id !== existing.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the comment author or admin can edit this comment' });
    }

    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const updated = await updateCommentSvc(req.params.id, { content });
    res.json({ message: 'Comment updated', comment: updated });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const existing = await getCommentById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (req.user.id !== existing.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the comment author or admin can delete this comment' });
    }

    const deleted = await deleteCommentSvc(req.params.id);
    if (deleted) {
      res.json({ message: 'Comment deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};