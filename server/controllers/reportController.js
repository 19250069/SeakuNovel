import { validationResult } from 'express-validator';
import { createReport, getReports, getReportsByTarget, removeReport } from '../models/report.js';

export const createReportController = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { target_type, target_id, reason, details } = req.body;
    if (!target_type || !target_id || !reason) return res.status(400).json({ error: 'target_type, target_id and reason are required' });

    const cleanReason = String(reason).replace(/<[^>]*>?/gm, '').trim();
    const cleanDetails = details ? String(details).replace(/<[^>]*>?/gm, '').trim() : '';

    if (!cleanReason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const report = await createReport(userId, target_type, target_id, cleanReason, cleanDetails);
    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listReportsController = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await getReports({ page, limit });
    res.json(result);
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportsForTargetController = async (req, res) => {
  try {
    // [SECURITY] Only admins may see who reported a piece of content.
    // Exposing this to regular users would allow doxxing of reporters.
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { targetType, targetId } = req.params;
    const rows = await getReportsByTarget(targetType, targetId);
    res.json({ reports: rows });
  } catch (err) {
    console.error('Get reports for target error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeReportController = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const id = req.params.id;
    await removeReport(id);
    res.json({ message: 'Report removed' });
  } catch (err) {
    console.error('Remove report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  createReportController,
  listReportsController,
  getReportsForTargetController,
  removeReportController,
};
