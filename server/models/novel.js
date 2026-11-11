import crypto from 'crypto';
import { query } from '../config/db.js';

export async function getAllNovels({ page = 1, limit = 20, search = '', genre = '', sort = 'created_at', status = '' } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  // Public listing must only ever expose published novels.
  // Only an explicit status override (used by author's "my novels" endpoint
  // which has its own controller) can change this.
  if (status) {
    conditions.push('n.status = ?');
    params.push(status);
  } else {
    conditions.push("n.status = 'published'");
  }

  if (search) {
    conditions.push('(n.title LIKE ? OR n.synopsis LIKE ? OR u.username LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (genre) {
    conditions.push('ng.genre_id = ?');
    params.push(genre);
  }

  // For genre filter, we need to add the join condition properly
  let fromClause = ' FROM novels n JOIN users u ON n.author_id = u.id';
  
  if (genre) {
    fromClause += ' JOIN novel_genres ng ON n.id = ng.novel_id';
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await query(
    `SELECT COUNT(*) AS total${fromClause} ${whereClause}`,
    params
  );
  const total = parseInt(countRows[0].total, 10);

  const validSortFields = ['created_at', 'title', 'total_views', 'average_rating', 'total_words'];
  const sortField = validSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = sort === 'total_views' || sort === 'average_rating' || sort === 'total_words' ? 'DESC' : 'DESC';

  let sql = `SELECT n.*, u.username AS author_name,
    (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
    (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS total_chapters,
    (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.novel_id = n.id) AS average_rating,
    (SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c2.id FROM chapters c2 WHERE c2.novel_id = n.id)) AS total_views
    ${fromClause}`;
  
  if (whereClause) {
    sql += ' ' + whereClause;
  }
  
  const safeLimit = parseInt(limit, 10);
  const safeOffset = parseInt(offset, 10);
  sql += ` ORDER BY n.${sortField} ${sortOrder} LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  
  // Debug: log SQL and params when running getAllNovels to trace errors seen by frontend
  try {
    const novels = await query(sql, params);
    return {
      novels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    console.error('getAllNovels error:', err && err.stack ? err.stack : err);
    throw err;
  }
}

export async function getNovelById(id) {
  if (!id) return null;
  const novels = await query(
    `SELECT n.*, u.username AS author_name, u.display_name AS author_display_name,
      (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
      (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.novel_id = n.id) AS average_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) AS rating_count,
      (SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c.id FROM chapters c WHERE c.novel_id = n.id)) AS total_views
     FROM novels n
     JOIN users u ON n.author_id = u.id
     WHERE n.id = ?`,
    [id]
  );

  if (novels.length === 0) {
    return null;
  }

  const novel = novels[0];
  const chapterCount = await query(
    'SELECT COUNT(*) AS total FROM chapters WHERE novel_id = ?',
    [id]
  );
  novel.total_chapters = chapterCount[0].total;
  // Ensure numeric types
  novel.average_rating = parseFloat(novel.average_rating) || 0;
  novel.rating_count = parseInt(novel.rating_count, 10) || 0;
  novel.total_views = parseInt(novel.total_views, 10) || 0;

  return novel;
}

export async function createNovel(data, coverUrl = null) {
  const id = crypto.randomUUID();
  const { title, slug, synopsis, author_id, source_draft_id, status, genre_ids } = data;

  await query(
    'INSERT INTO novels (id, title, slug, synopsis, cover_url, author_id, source_draft_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, slug, synopsis || '', coverUrl, author_id, source_draft_id || null, status || 'draft']
  );

  if (genre_ids && genre_ids.length > 0) {
    for (const genreId of genre_ids) {
      await query('INSERT INTO novel_genres (novel_id, genre_id) VALUES (?, ?)', [id, genreId]);
    }
  }

  return getNovelById(id);
}

export async function updateNovel(id, data, coverUrl = null) {
  const existing = await getNovelById(id);
  if (!existing) {
    return null;
  }

  const { title, slug, synopsis, source_draft_id, status, genre_ids, is_completed } = data;

  // Build sets and params dynamically to avoid passing undefined values
  const sets = [];
  const params = [];
  
  if (title !== undefined) { sets.push('title = ?'); params.push(title); }
  if (slug !== undefined) { sets.push('slug = ?'); params.push(slug); }
  if (synopsis !== undefined) { sets.push('synopsis = ?'); params.push(synopsis); }
  if (source_draft_id !== undefined) { sets.push('source_draft_id = ?'); params.push(source_draft_id || null); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (is_completed !== undefined) { sets.push('is_completed = ?'); params.push(is_completed ? 1 : 0); }
  if (coverUrl !== null) { sets.push('cover_url = ?'); params.push(coverUrl); }
  
  if (sets.length === 0) {
    return getNovelById(id);
  }
  
  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await query(
    `UPDATE novels SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  if (genre_ids !== undefined) {
    await query('DELETE FROM novel_genres WHERE novel_id = ?', [id]);
    for (const genreId of genre_ids) {
      await query('INSERT INTO novel_genres (novel_id, genre_id) VALUES (?, ?)', [id, genreId]);
    }
  }

  return getNovelById(id);
}

export async function deleteNovel(id) {
  const existing = await getNovelById(id);
  if (!existing) {
    return false;
  }

  await query('DELETE FROM novels WHERE id = ?', [id]);
  return true;
}

export async function getAllGenres() {
  return query(`
    SELECT g.id, g.name, g.slug,
      (SELECT COUNT(*) FROM novel_genres ng 
       JOIN novels n ON ng.novel_id = n.id 
       WHERE ng.genre_id = g.id AND n.status = 'published') AS novel_count
    FROM genres g
    ORDER BY g.name ASC
  `);
}

export async function getNovelGenres(novelId) {
  return query(
    'SELECT g.id, g.name, g.slug FROM novel_genres ng JOIN genres g ON ng.genre_id = g.id WHERE ng.novel_id = ?',
    [novelId]
  );
}