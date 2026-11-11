import fs from 'fs';
import path from 'path';
import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import { getAllNovels, getNovelById, createNovel as createNovelSvc, updateNovel as updateNovelSvc, deleteNovel as deleteNovelSvc, getAllGenres } from '../models/novel.js';
import { notifyNovelPublished } from '../models/notification.js';

function resolveCoverPath(coverUrl) {
  if (!coverUrl) return null;
  return path.normalize(coverUrl.replace(/^\//, ''));
}

export const listNovels = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const genre = req.query.genre || '';
    const sort = req.query.sort || 'created_at';
    const status = req.query.status || '';

    const result = await getAllNovels({ page, limit, search, genre, sort, status });
    res.json(result);
  } catch (error) {
    console.error('List novels error:', error && error.stack ? error.stack : error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNovel = async (req, res) => {
  try {
    const novel = await getNovelById(req.params.id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // Draft/archived novels are only visible to their author (or admin).
    const isOwner = req.user && novel.author_id === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';
    if (novel.status !== 'published' && !isOwner && !isAdmin) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    res.json({ novel });
  } catch (error) {
    console.error('Get novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNovel = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const authorId = req.user.id;
    if (req.user.role === 'reader') {
      await query("UPDATE users SET role = 'author' WHERE id = ?", [authorId]);
      req.user.role = 'author';
    }

    let coverUrl = null;
    if (req.file) {
      coverUrl = `/uploads/${req.file.filename}`;
    }

    // Normalize genre_ids: FormData sends as 'genre_ids[]', JSON sends as 'genre_ids'
    let genre_ids = req.body['genre_ids[]'] || req.body.genre_ids || [];
    if (!Array.isArray(genre_ids)) genre_ids = [genre_ids];
    genre_ids = genre_ids.filter(Boolean).map(Number).filter(id => !isNaN(id) && id > 0);

    const novel = await createNovelSvc({ ...req.body, genre_ids, author_id: authorId }, coverUrl);
    res.status(201).json({ message: 'Novel created', novel });
  } catch (error) {
    console.error('Create novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNovel = async (req, res) => {
  try {
    const existing = await getNovelById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'admin' && existing.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the author or admin can update this novel' });
    }

    let coverUrl = existing.cover_url;
    if (req.file) {
      const oldPath = resolveCoverPath(existing.cover_url);
      if (oldPath && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      coverUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await updateNovelSvc(req.params.id, req.body, coverUrl);
    res.json({ message: 'Novel updated', novel: updated });
  } catch (error) {
    console.error('Update novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNovel = async (req, res) => {
  try {
    const existing = await getNovelById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && existing.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the author or admin can delete this novel' });
    }

    const oldPath = resolveCoverPath(existing.cover_url);
    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    const deleted = await deleteNovelSvc(req.params.id);
    if (deleted) {
      res.json({ message: 'Novel deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete novel' });
    }
  } catch (error) {
    console.error('Delete novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGenres = async (req, res) => {
  try {
    const genres = await getAllGenres();
    res.json({ genres });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyNovels = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereClause = 'WHERE n.author_id = ?';
    const params = [req.user.id];

    if (status) {
      whereClause += ' AND n.status = ?';
      params.push(status);
    }

    const totalRows = await query(
      `SELECT COUNT(*) AS total FROM novels n ${whereClause}`,
      params
    );
    const total = parseInt(totalRows[0].total, 10);

    const safeLimit = parseInt(limit, 10);
    const safeOffset = parseInt(offset, 10);
    const novels = await query(
      `SELECT n.*, u.username AS author_name,
        (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
        (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) AS chapters_count
       FROM novels n
       JOIN users u ON n.author_id = u.id
       ${whereClause}
       ORDER BY n.updated_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    res.json({
      novels,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get my novels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const publishNovel = async (req, res) => {
  try {
    const novel = await getNovelById(req.params.id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (novel.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the author or admin can publish this novel' });
    }

    if (!novel.title || !novel.title.trim()) {
      return res.status(400).json({ error: 'Judul novel tidak boleh kosong' });
    }
    if (!novel.synopsis || !novel.synopsis.trim()) {
      return res.status(400).json({ error: 'Sinopsis novel tidak boleh kosong' });
    }

    const [publishedChapters] = await query(
      'SELECT COUNT(*) as c FROM chapters WHERE novel_id = ? AND is_published = TRUE',
      [novel.id]
    );
    if (parseInt(publishedChapters.c, 10) < 1) {
      return res.status(400).json({ error: 'Novel harus memiliki minimal 1 bab yang dipublikasikan sebelum dapat dipublikasikan.' });
    }

    const updated = await updateNovelSvc(req.params.id, { status: 'published' });
    
    // Notify followers
    notifyNovelPublished({ 
      authorId: novel.author_id, 
      novel: updated, 
      authorName: req.user.display_name || req.user.username 
    }).catch(console.error);

    res.json({ message: 'Novel published', novel: updated });
  } catch (error) {
    console.error('Publish novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unpublishNovel = async (req, res) => {
  try {
    const novel = await getNovelById(req.params.id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (novel.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the author or admin can unpublish this novel' });
    }

    const updated = await updateNovelSvc(req.params.id, { status: 'draft' });
    res.json({ message: 'Novel unpublished', novel: updated });
  } catch (error) {
    console.error('Unpublish novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getNovelAnalytics = async (req, res) => {
  try {
    const novelId = req.params.id;
    const existing = await getNovelById(novelId);
    if (!existing) return res.status(404).json({ error: 'Novel not found' });
    
    if (req.user.role !== 'admin' && existing.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [viewsData] = await query(
      `SELECT COALESCE(SUM(view_count), 0) as total_views FROM chapter_views cv 
       JOIN chapters c ON cv.chapter_id = c.id WHERE c.novel_id = ?`,
      [novelId]
    );

    const [followersData] = await query(
      `SELECT COUNT(*) as total_followers FROM follows WHERE target_type = 'novel' AND target_id = ?`,
      [novelId]
    );

    const chapterPerformance = await query(
      `SELECT c.id, c.title, c.chapter_number, COALESCE(cv.view_count, 0) as views,
       (SELECT COUNT(*) FROM chapter_comments cc WHERE cc.chapter_id = c.id) as comments
       FROM chapters c
       LEFT JOIN chapter_views cv ON c.id = cv.chapter_id
       WHERE c.novel_id = ? AND c.deleted_at IS NULL
       ORDER BY c.chapter_number ASC`,
      [novelId]
    );

    res.json({
      total_views: viewsData ? viewsData.total_views : 0,
      total_followers: followersData ? followersData.total_followers : 0,
      chapters: chapterPerformance
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
