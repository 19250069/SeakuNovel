import fs from 'fs';
import path from 'path';
import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import { getChaptersByNovel, getChapterById, getPublishedChapterById, createChapter as createChapterSvc, updateChapter as updateChapterSvc, deleteChapter as deleteChapterSvc, restoreChapter as restoreChapterSvc, reorderChapters as reorderChaptersSvc, publishChapter as publishChapterSvc, unpublishChapter as unpublishChapterSvc } from '../models/chapter.js';
import { getNovelById } from '../models/novel.js';

// Determine whether the current request is allowed to see draft chapters
// for a given novel. Authors (and admins) can see their own drafts; everyone
// else only sees published chapters of published novels.
function canSeeDrafts(novel, req) {
  if (!novel) return false;
  if (req.user && req.user.role === 'admin') return true;
  if (req.user && novel.author_id === req.user.id) return true;
  return false;
}

export const listChapters = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // Non-owners must not browse chapters of an unpublished novel at all.
    if (!canSeeDrafts(novel, req)) {
      if (novel.status !== 'published') {
        return res.status(404).json({ error: 'Novel not found' });
      }
    }

    const publishedOnly = !canSeeDrafts(novel, req);
    const result = await getChaptersByNovel(novelId, { page, limit, search, publishedOnly });
    res.json(result);
  } catch (error) {
    console.error('List chapters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChapter = async (req, res) => {
  try {
    const chapter = await getChapterById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = await getNovelById(chapter.novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // Public access: only published chapters of published novels.
    if (!canSeeDrafts(novel, req)) {
      if (novel.status !== 'published' || !chapter.is_published) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
    }

    res.json({ chapter });
  } catch (error) {
    console.error('Get chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createChapter = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const novelId = req.body.novel_id;
    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can create chapters' });
    }

    const chapter = await createChapterSvc({ ...req.body, novel_id: novelId });
    res.status(201).json({ message: 'Chapter created', chapter });
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const existing = await getChapterById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const novel = await getNovelById(existing.novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can update chapters' });
    }

    
    const updated = await updateChapterSvc(req.params.id, req.body);
    res.json({ message: 'Chapter updated', chapter: updated });
  } catch (error) {
    console.error('Update chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const existing = await getChapterById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = await getNovelById(existing.novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can delete chapters' });
    }

    const deleted = await deleteChapterSvc(req.params.id);
    if (deleted) {
      res.json({ message: 'Chapter deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete chapter' });
    }
  } catch (error) {
    console.error('Delete chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reorderChapters = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can reorder chapters' });
    }

    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders must be an array' });
    }

    await reorderChaptersSvc(novelId, orders);
    res.json({ message: 'Chapters reordered' });
  } catch (error) {
    console.error('Reorder chapters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const publishChapter = async (req, res) => {
  try {
    const existing = await getChapterById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = await getNovelById(existing.novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can publish chapters' });
    }

    const updated = await publishChapterSvc(req.params.id);

    // Notify followers in background
    import('../models/notification.js').then(({ notifyFollowersOfNewChapter }) => {
      notifyFollowersOfNewChapter({ chapter: updated, novel }).catch((e) =>
        console.error('Failed to notify followers on chapter publish:', e)
      );
    }).catch(() => {});

    res.json({ message: 'Chapter published', chapter: updated });
  } catch (error) {
    console.error('Publish chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unpublishChapter = async (req, res) => {
  try {
    const existing = await getChapterById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = await getNovelById(existing.novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can unpublish chapters' });
    }

    const updated = await unpublishChapterSvc(req.params.id);
    res.json({ message: 'Chapter unpublished', chapter: updated });
  } catch (error) {
    console.error('Unpublish chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const scheduleChapter = async (req, res) => {
  try {
    const { publish_at } = req.body;
    if (!publish_at) {
      return res.status(400).json({ error: 'publish_at datetime is required' });
    }

    const existing = await getChapterById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = await getNovelById(existing.novel_id);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the novel owner or admin can schedule chapters' });
    }

    const { schedulePublication } = await import('../workers/scheduler.js');
    const scheduled = await schedulePublication({
      novel_id: existing.novel_id,
      chapter_id: existing.id,
      publish_at,
    });

    res.json({ message: 'Chapter scheduled for publication', scheduled });
  } catch (error) {
    console.error('Schedule chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listTrashedChapters = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const novel = await getNovelById(novelId);
    if (!novel) return res.status(404).json({ error: 'Novel not found' });
    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await getChaptersByNovel(novelId, { ...req.query, trashedOnly: true });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const restoreChapter = async (req, res) => {
  try {
    const existing = await getChapterById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Chapter not found' });
    const novel = await getNovelById(existing.novel_id);
    if (req.user.role !== 'admin' && novel.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await restoreChapterSvc(req.params.id);
    res.json({ message: 'Chapter restored successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChapterComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url 
       FROM chapter_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.chapter_id = ?
       ORDER BY c.paragraph_index ASC, c.created_at ASC`,
      [id]
    );
    res.json(comments);
  } catch (error) {
    console.error('Error fetching chapter comments:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

import { containsProfanity, maskProfanity } from '../utils/profanityFilter.js';

export const addChapterComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paragraph_index, content } = req.body;
    const userId = req.user.id;

    if (containsProfanity(content)) {
      return res.status(400).json({ error: 'Komentar mengandung kata-kata yang tidak pantas (Profanity).' });
    }

    // Validate chapter exists
    const chapterCheck = await query('SELECT id FROM chapters WHERE id = ?', [id]);
    if (chapterCheck.length === 0) return res.status(404).json({ error: 'Chapter not found' });

    const commentId = crypto.randomUUID();
    await query(
      `INSERT INTO chapter_comments (id, chapter_id, user_id, paragraph_index, content) 
       VALUES (?, ?, ?, ?, ?)`,
      [commentId, id, userId, paragraph_index, content]
    );

    const [newComment] = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url 
       FROM chapter_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding chapter comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
export const recordView = async (req, res) => {
  try {
    const chapterId = req.params.id;
    const chapters = await query('SELECT id, novel_id FROM chapters WHERE id = ?', [chapterId]);
    if (chapters.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    const novelId = chapters[0].novel_id;
    await query('INSERT INTO chapter_views (id, chapter_id, view_count, updated_at) VALUES (UUID(), ?, 1, NOW()) ON DUPLICATE KEY UPDATE view_count = view_count + 1, updated_at = NOW()', [chapterId]);
    
    // Return the novel's fresh total_views so frontend can update immediately
    const [viewRow] = await query(
      'SELECT COALESCE(SUM(cv.view_count), 0) AS total_views FROM chapter_views cv JOIN chapters c ON cv.chapter_id = c.id WHERE c.novel_id = ?',
      [novelId]
    );
    res.json({ success: true, novel_id: novelId, total_views: parseInt(viewRow?.total_views || 0, 10) });
  } catch (err) {
    console.error('Failed to record view:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

