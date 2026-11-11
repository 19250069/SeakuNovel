import crypto from 'crypto';
import { query } from '../config/db.js';

export async function getReadingProgress(userId, novelId) {
  const rows = await query(
    `SELECT rp.*, c.chapter_number, c.title AS chapter_title
     FROM reading_progress rp
     LEFT JOIN chapters c ON rp.last_chapter_id = c.id
     WHERE rp.user_id = ? AND rp.novel_id = ?`,
    [userId, novelId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getReadingHistory(userId, { page = 1, limit = 20 } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM reading_progress WHERE user_id = ?`,
    [userId]
  );
  const total = parseInt(countRows[0].total, 10);

  const history = await query(
    `SELECT rp.*, n.title AS novel_title, n.slug AS novel_slug, 
            n.cover_url AS novel_cover_url, n.total_chapters,
            c.chapter_number, c.title AS chapter_title
     FROM reading_progress rp
     JOIN novels n ON rp.novel_id = n.id
     LEFT JOIN chapters c ON rp.last_chapter_id = c.id
     WHERE rp.user_id = ?
     ORDER BY rp.last_read_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [userId]
  );

  return { history, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export async function getAllReadingProgress(userId) {
  const rows = await query(
    `SELECT rp.*, n.title AS novel_title, n.slug AS novel_slug,
            n.total_chapters, n.status AS novel_status,
            c.chapter_number, c.title AS chapter_title
     FROM reading_progress rp
     JOIN novels n ON rp.novel_id = n.id
     LEFT JOIN chapters c ON rp.last_chapter_id = c.id
     WHERE rp.user_id = ?
     ORDER BY rp.last_read_at DESC`,
    [userId]
  );
  return rows;
}

export async function upsertReadingProgress(userId, novelId, { chapterId, progressPercent }) {
  const existing = await getReadingProgress(userId, novelId);
  
  if (existing) {
    await query(
      `UPDATE reading_progress 
       SET last_chapter_id = ?, progress_percent = ?, last_read_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND novel_id = ?`,
      [chapterId, progressPercent, userId, novelId]
    );
    return { updated: true };
  } else {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO reading_progress (id, user_id, novel_id, last_chapter_id, progress_percent, last_read_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, userId, novelId, chapterId, progressPercent]
    );
    return { created: true };
  }
}

export async function deleteReadingProgress(userId, novelId) {
  await query(
    'DELETE FROM reading_progress WHERE user_id = ? AND novel_id = ?',
    [userId, novelId]
  );
  return { deleted: true };
}

export async function getCompletedNovels(userId) {
  const rows = await query(
    `SELECT rp.*, n.title AS novel_title, n.slug AS novel_slug,
            n.cover_url AS novel_cover_url, n.total_chapters
     FROM reading_progress rp
     JOIN novels n ON rp.novel_id = n.id
     WHERE rp.user_id = ? AND rp.progress_percent >= 100.00
     ORDER BY rp.last_read_at DESC`,
    [userId]
  );
  return rows;
}

export async function getContinueReading(userId) {
  const rows = await query(
    `SELECT rp.*, n.title AS novel_title, n.slug AS novel_slug,
            n.cover_url AS novel_cover_url, n.total_chapters,
            c.chapter_number, c.title AS chapter_title
     FROM reading_progress rp
     JOIN novels n ON rp.novel_id = n.id
     LEFT JOIN chapters c ON rp.last_chapter_id = c.id
     WHERE rp.user_id = ? AND rp.last_chapter_id IS NOT NULL
     ORDER BY rp.last_read_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}