import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import {
  getReadingProgress,
  getReadingHistory,
  getAllReadingProgress,
  upsertReadingProgress,
  deleteReadingProgress,
  getCompletedNovels,
  getContinueReading,
} from '../models/readingProgress.js';
import { getNovelById } from '../models/novel.js';
import { getChapterById } from '../models/chapter.js';

export const getProgress = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const progress = await getReadingProgress(req.user.id, novelId);
    if (!progress) {
      return res.json({ progress: null });
    }

    res.json({ progress });
  } catch (error) {
    console.error('Get reading progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const novelId = req.params.novelId;
    const { chapter_id, progress_percent } = req.body;

    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (chapter_id) {
      const chapter = await getChapterById(chapter_id);
      if (!chapter || chapter.novel_id !== novelId) {
        return res.status(404).json({ error: 'Chapter not found in this novel' });
      }
    }

    if (progress_percent < 0 || progress_percent > 100) {
      return res.status(400).json({ error: 'Progress percent must be between 0 and 100' });
    }

    const result = await upsertReadingProgress(req.user.id, novelId, {
      chapterId: chapter_id || null,
      progressPercent: progress_percent,
    });

    const progress = await getReadingProgress(req.user.id, novelId);
    res.json({ message: result.created ? 'Progress created' : 'Progress updated', progress });
  } catch (error) {
    console.error('Update reading progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await getReadingHistory(req.user.id, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get reading history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const continueReading = async (req, res) => {
  try {
    const progress = await getContinueReading(req.user.id);
    if (!progress) {
      return res.json({ progress: null });
    }
    res.json({ progress });
  } catch (error) {
    console.error('Continue reading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCompleted = async (req, res) => {
  try {
    const completed = await getCompletedNovels(req.user.id);
    res.json({ completed });
  } catch (error) {
    console.error('Get completed novels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllProgress = async (req, res) => {
  try {
    const progressList = await getAllReadingProgress(req.user.id);
    res.json({ progress: progressList });
  } catch (error) {
    console.error('Get all reading progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeProgress = async (req, res) => {
  try {
    const novelId = req.params.novelId;
    const novel = await getNovelById(novelId);
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    await deleteReadingProgress(req.user.id, novelId);
    res.json({ message: 'Reading progress deleted' });
  } catch (error) {
    console.error('Delete reading progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};