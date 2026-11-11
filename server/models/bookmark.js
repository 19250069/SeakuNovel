import crypto from 'crypto';
import { query } from '../config/db.js';

export async function getBookmarks(userId, { page = 1, limit = 20, sort = 'latest', search = '' } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;
  const conditions = [];
  const params = [userId];

  if (search) {
    conditions.push('n.title LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM bookmarks b JOIN novels n ON b.novel_id = n.id WHERE b.user_id = ? ${whereClause}`,
    params
  );
  const total = parseInt(countRows[0].total, 10);

  const validSortFields = {
    latest: 'b.created_at DESC',
    title: 'n.title ASC',
  };
  const orderBy = validSortFields[sort] || validSortFields.latest;

  const bookmarks = await query(
    `SELECT b.*, n.title AS novel_title, n.slug AS novel_slug, n.cover_url AS novel_cover_url,
      n.average_rating AS novel_average_rating, n.total_chapters AS novel_total_chapters,
      u.username AS author_username
     FROM bookmarks b
     JOIN novels n ON b.novel_id = n.id
     JOIN users u ON n.author_id = u.id
     WHERE b.user_id = ? ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  return { bookmarks, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export const getBookmarkedNovels = getBookmarks;

export async function isBookmarked(userId, novelId) {
  const rows = await query(
    'SELECT * FROM bookmarks WHERE user_id = ? AND novel_id = ?',
    [userId, novelId]
  );
  return rows.length > 0;
}

export async function addBookmark(userId, novelId) {
  const existing = await isBookmarked(userId, novelId);
  if (existing) {
    return { alreadyBookmarked: true };
  }

  const id = crypto.randomUUID();
  await query(
    'INSERT INTO bookmarks (id, user_id, novel_id) VALUES (?, ?, ?)',
    [id, userId, novelId]
  );

  return { bookmarked: true };
}

export async function removeBookmark(userId, novelId) {
  const existing = await isBookmarked(userId, novelId);
  if (!existing) {
    return { alreadyRemoved: true };
  }

  await query(
    'DELETE FROM bookmarks WHERE user_id = ? AND novel_id = ?',
    [userId, novelId]
  );

  return { removed: true };
}

export async function toggleBookmark(userId, novelId) {
  const existing = await isBookmarked(userId, novelId);

  if (existing) {
    await query(
      'DELETE FROM bookmarks WHERE user_id = ? AND novel_id = ?',
      [userId, novelId]
    );
    return { bookmarked: false, toggled: true };
  } else {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO bookmarks (id, user_id, novel_id) VALUES (?, ?, ?)',
      [id, userId, novelId]
    );
    return { bookmarked: true, toggled: true };
  }
}

export async function getBookmarkCount(userId) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM bookmarks WHERE user_id = ?',
    [userId]
  );
  return parseInt(rows[0].total, 10);
}