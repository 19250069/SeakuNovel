import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import { getBookmarkedNovels, isBookmarked, addBookmark as addBookmarkSvc, removeBookmark as removeBookmarkSvc, toggleBookmark as toggleBookmarkSvc, getBookmarkCount as getBookmarkCountSvc } from '../models/bookmark.js';
import { getNovelById } from '../models/novel.js';
import { notifyNovelBookmarked } from '../models/notification.js';

export const listBookmarks = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'latest';

    const result = await getBookmarkedNovels(req.user.id, { page, limit, search, sort });
    res.json(result);
  } catch (error) {
    console.error('List bookmarks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkBookmarkStatus = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const bookmarked = await isBookmarked(req.user.id, novelId);
    res.json({ bookmarked });
  } catch (error) {
    console.error('Check bookmark status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addBookmark = async (req, res) => {
  try {
    const novelId = req.body.novel_id || req.params.novelId;

    if (!novelId) {
      return res.status(400).json({ error: 'novel_id is required' });
    }

    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const result = await addBookmarkSvc(req.user.id, novelId);
    if (result.alreadyBookmarked) {
      return res.status(409).json({ error: 'Already bookmarked', bookmarked: true });
    }

    notifyNovelBookmarked({ authorId: novel.author_id, user: req.user, novel }).catch(console.error);

    res.status(201).json({ message: 'Bookmarked', bookmarked: true });
  } catch (error) {
    console.error('Add bookmark error:', error && error.stack ? error.stack : error);
    // Return stack in development for debugging
    res.status(500).json({ error: 'Internal server error', details: error && error.stack ? String(error.stack).slice(0,1000) : String(error) });
  }
};

export const removeBookmark = async (req, res) => {
  try {
    const novelId = req.params.novelId;

    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const result = await removeBookmarkSvc(req.user.id, novelId);
    if (result.alreadyRemoved) {
      return res.status(404).json({ error: 'Not bookmarked', bookmarked: false });
    }

    res.json({ message: 'Bookmark removed', bookmarked: false });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    const novelId = req.params.novelId;

    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const result = await toggleBookmarkSvc(req.user.id, novelId);
    
    if (result.bookmarked) {
      notifyNovelBookmarked({ authorId: novel.author_id, user: req.user, novel }).catch(console.error);
    }

    res.json({ message: result.bookmarked ? 'Bookmarked' : 'Bookmark removed', bookmarked: result.bookmarked });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookmarkCount = async (req, res) => {
  try {
    const total = await getBookmarkCountSvc(req.user.id);
    res.json({ total });
  } catch (error) {
    console.error('Get bookmark count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};