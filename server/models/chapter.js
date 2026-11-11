import crypto from 'crypto';
import { query } from '../config/db.js';

export async function getChaptersByNovel(novelId, { page = 1, limit = 20, search = '', publishedOnly = false, trashedOnly = false } = {}) {
  const offset = parseInt(page, 10) - 1;
  const rowsPerPage = parseInt(limit, 10);
  const dbOffset = offset * rowsPerPage;
  const params = [novelId];
  const clauses = [];

  if (trashedOnly) {
    clauses.push('c.deleted_at IS NOT NULL');
  } else {
    clauses.push('c.deleted_at IS NULL');
  }


  if (publishedOnly) {
    clauses.push('c.is_published = ?');
    params.push(true);
  }

  if (search) {
    clauses.push('c.title LIKE ?');
    params.push(`%${search}%`);
  }

  const extraClause = clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '';

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM chapters c WHERE c.novel_id = ?${extraClause}`,
    params
  );
  const total = parseInt(countRows[0].total, 10);

  const chapters = await query(
    `SELECT c.* FROM chapters c WHERE c.novel_id = ?${extraClause} ORDER BY c.order_index ASC LIMIT ${rowsPerPage} OFFSET ${dbOffset}`,
    params
  );

  return { chapters, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getChapterById(id) {
  const rows = await query('SELECT * FROM chapters WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function getPublishedChapterById(id) {
  const rows = await query('SELECT * FROM chapters WHERE id = ? AND is_published = ?', [id, true]);
  return rows.length > 0 ? rows[0] : null;
}

export async function createChapter(data) {
  const id = crypto.randomUUID();
  let { novel_id, title, slug, content, chapter_number, order_index } = data;

  // Auto-resolve unique chapter_number to prevent ER_DUP_ENTRY deadlock
  const maxRow = await query('SELECT MAX(chapter_number) as max_num FROM chapters WHERE novel_id = ?', [novel_id]);
  const safeNumber = (maxRow[0].max_num || 0) + 1;
  
  // Use the safe number to bypass any soft-deleted chapter conflicts
  chapter_number = safeNumber;
  order_index = safeNumber;

  await query(
    'INSERT INTO chapters (id, novel_id, title, slug, content, chapter_number, word_count, is_published, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, novel_id, title, slug, content || '', chapter_number, countWords(content || ''), false, order_index]
  );

  await updateNovelWordCount(novel_id);

  return getChapterById(id);
}

export async function updateChapter(id, data) {
  const existing = await getChapterById(id);
  if (!existing) return null;

  const { title, slug, content, chapter_number, order_index, is_published, author_notes, author_notes_position } = data;

  const sets = [];
  const params = [];

  if (title !== undefined) { sets.push('title = ?'); params.push(title); }
  if (slug !== undefined) { sets.push('slug = ?'); params.push(slug); }
  if (content !== undefined) { sets.push('content = ?'); params.push(content); sets.push('word_count = ?'); params.push(countWords(content)); }
  if (chapter_number !== undefined) { sets.push('chapter_number = ?'); params.push(chapter_number); }
  if (order_index !== undefined) { sets.push('order_index = ?'); params.push(order_index); }
  if (is_published !== undefined) { sets.push('is_published = ?'); params.push(is_published); }

  if (author_notes !== undefined) { sets.push('author_notes = ?'); params.push(author_notes); }
  if (author_notes_position !== undefined) { sets.push('author_notes_position = ?'); params.push(author_notes_position); }


  if (sets.length === 0) return existing;

  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await query(`UPDATE chapters SET ${sets.join(', ')} WHERE id = ?`, params);

  await updateNovelWordCount(existing.novel_id);

  return getChapterById(id);
}


export async function deleteChapter(id) {
  const existing = await getChapterById(id);
  if (!existing) return false;
  await query('UPDATE chapters SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  await updateNovelWordCount(existing.novel_id);
  return true;
}

export async function restoreChapter(id) {
  const existing = await getChapterById(id);
  if (!existing) return false;
  await query('UPDATE chapters SET deleted_at = NULL WHERE id = ?', [id]);
  await updateNovelWordCount(existing.novel_id);
  return true;
}


export async function reorderChapters(novelId, chapterOrders) {
  for (const { id, order_index } of chapterOrders) {
    await query('UPDATE chapters SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND novel_id = ?', [order_index, id, novelId]);
  }
  return true;
}

export async function publishChapter(id) {
  const existing = await getChapterById(id);
  if (!existing) return null;

  await query('UPDATE chapters SET is_published = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

  const updated = await getChapterById(id);
  return updated;
}

export async function unpublishChapter(id) {
  const existing = await getChapterById(id);
  if (!existing) return null;

  await query('UPDATE chapters SET is_published = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

  const updated = await getChapterById(id);
  return updated;
}

async function updateNovelWordCount(novelId) {
  const rows = await query(
    'SELECT COALESCE(SUM(word_count), 0) AS total FROM chapters WHERE novel_id = ?',
    [novelId]
  );
  await query('UPDATE novels SET total_words = ? WHERE id = ?', [rows[0].total, novelId]);
}

function countWords(str) {
  if (!str || str.trim().length === 0) return 0;
  return str.trim().split(/\s+/).length;
}