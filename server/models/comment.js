import crypto from 'crypto';
import { query } from '../config/db.js';

export async function getCommentsByReview(reviewId, { page = 1, limit = 20, sort = 'newest' } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;

  const countRows = await query(
    'SELECT COUNT(*) AS total FROM comments WHERE review_id = ? AND parent_id IS NULL',
    [reviewId]
  );
  const total = parseInt(countRows[0].total, 10);

  const validSortFields = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
  };
  const orderBy = validSortFields[sort] || validSortFields.newest;

  const comments = await query(
    `SELECT c.*, u.username AS author_username, u.display_name AS author_display_name
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.review_id = ? AND c.parent_id IS NULL
     ORDER BY ${orderBy}
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [reviewId]
  );

  return { comments, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export async function getCommentById(id) {
  const rows = await query(
    `SELECT c.*, u.username AS author_username, u.display_name AS author_display_name
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getReplies(commentId) {
  return query(
    `SELECT c.*, u.username AS author_username, u.display_name AS author_display_name
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.parent_id = ?
     ORDER BY c.created_at ASC`,
    [commentId]
  );
}

export async function createComment(data) {
  const id = crypto.randomUUID();
  const { review_id, user_id, parent_id, content } = data;

  await query(
    'INSERT INTO comments (id, review_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)',
    [id, review_id, user_id, parent_id || null, content]
  );

  await syncCommentCount(review_id);

  return getCommentById(id);
}

export async function updateComment(id, data) {
  const existing = await getCommentById(id);
  if (!existing) return null;

  const { content } = data;

  await query(
    'UPDATE comments SET content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [content, id]
  );

  return getCommentById(id);
}

export async function deleteComment(id) {
  const existing = await getCommentById(id);
  if (!existing) return false;

  const reviewId = existing.review_id;

  await query('DELETE FROM comments WHERE id = ?', [id]);

  await syncCommentCount(reviewId);

  return true;
}

async function syncCommentCount(reviewId) {
  const rows = await query(
    'SELECT COUNT(*) AS cnt FROM comments WHERE review_id = ?',
    [reviewId]
  );
  await query('UPDATE reviews SET comments_count = ? WHERE id = ?', [rows[0].cnt, reviewId]);
}