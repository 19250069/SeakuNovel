import { query } from '../config/db.js';
import crypto from 'crypto';

export async function getReviews({ page = 1, limit = 20, novelId = '', userId = '', sort = 'latest' } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;
  const conditions = [];
  const params = [];

  if (novelId) {
    conditions.push('r.novel_id = ?');
    params.push(novelId);
  }

  if (userId) {
    conditions.push('r.user_id = ?');
    params.push(userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM reviews r ${whereClause}`,
    params
  );
  const total = parseInt(countRows[0].total, 10);

  const validSortFields = {
    latest: 'r.created_at DESC',
    highest_rating: 'r.rating DESC',
    most_liked: 'r.likes_count DESC',
  };
  const orderBy = validSortFields[sort] || validSortFields.latest;

  const reviews = await query(
    `SELECT r.*, u.username AS author_username, u.display_name AS author_display_name,
      n.title AS novel_title, n.cover_url AS novel_cover_url,
      (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) AS user_liked
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN novels n ON r.novel_id = n.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  return { reviews, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export async function getReviewsByNovel(novelId, { page = 1, limit = 20, sort = 'latest' } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;

  const countRows = await query(
    'SELECT COUNT(*) AS total FROM reviews WHERE novel_id = ?',
    [novelId]
  );
  const total = parseInt(countRows[0].total, 10);

  const validSortFields = {
    latest: 'created_at DESC',
    highest_rating: 'rating DESC',
    most_liked: 'likes_count DESC',
  };
  const orderBy = validSortFields[sort] || validSortFields.latest;

  const sql = `SELECT r.*, u.username AS author_username, u.display_name AS author_display_name,
      (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) AS user_liked
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.novel_id = ?
     ORDER BY ${orderBy}
     LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const params = [novelId];
  const reviews = await query(sql, params);

  return { reviews, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export async function getReviewById(id) {
  const rows = await query(
    `SELECT r.*, u.username AS author_username, u.display_name AS author_display_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getReviewByNovelAndUser(novelId, userId) {
  const rows = await query(
    'SELECT * FROM reviews WHERE novel_id = ? AND user_id = ?',
    [novelId, userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createReview(data) {
  const id = crypto.randomUUID();
  const { novel_id, user_id, rating, title, content } = data;

  // Double-check existence to avoid duplicate key errors
  const existing = await getReviewByNovelAndUser(novel_id, user_id);
  if (existing) {
    return { alreadyExists: true, review: existing };
  }

  try {
    await query(
      'INSERT INTO reviews (id, novel_id, user_id, rating, title, content) VALUES (?, ?, ?, ?, ?, ?)',
      [id, novel_id, user_id, rating, title, content]
    );
  } catch (err) {
    // Handle duplicate key race condition gracefully
    if (err && err.code === 'ER_DUP_ENTRY') {
      const existing2 = await getReviewByNovelAndUser(novel_id, user_id);
      return { alreadyExists: true, review: existing2 };
    }
    throw err;
  }

  await syncAverageRating(novel_id);

  return getReviewById(id);
}

export async function updateReview(id, data) {
  const existing = await getReviewById(id);
  if (!existing) return null;

  const { rating, title, content } = data;

  await query(
    'UPDATE reviews SET rating = COALESCE(?, rating), title = COALESCE(?, title), content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [rating, title, content, id]
  );

  await syncAverageRating(existing.novel_id);

  return getReviewById(id);
}

export async function deleteReview(id) {
  const existing = await getReviewById(id);
  if (!existing) return false;

  const novelId = existing.novel_id;

  await query('DELETE FROM reviews WHERE id = ?', [id]);

  await syncAverageRating(novelId);

  return true;
}

async function syncAverageRating(novelId) {
  try {
    const rows = await query(
      'SELECT COALESCE(AVG(rating), 0) AS avg_rating FROM reviews WHERE novel_id = ?',
      [novelId]
    );
    const raw = rows && rows[0] && rows[0].avg_rating;
    let avg = 0;
    if (raw === null || raw === undefined) {
      avg = 0;
    } else if (typeof raw === 'number') {
      avg = raw;
    } else {
      avg = parseFloat(String(raw)) || 0;
    }
    // round to 2 decimals
    avg = Math.round(avg * 100) / 100;
    await query('UPDATE novels SET average_rating = ? WHERE id = ?', [avg, novelId]);
  } catch (err) {
    console.error('syncAverageRating error:', err && err.stack ? err.stack : err);
  }
}