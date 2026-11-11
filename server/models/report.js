import crypto from 'crypto';
import { query } from '../config/db.js';

export async function createReport(userId, targetType, targetId, reason, details = '') {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO reports (id, user_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, targetType, targetId, reason, details]
  );
  return { id, user_id: userId, target_type: targetType, target_id: targetId, reason, details };
}

export async function getReports({ page = 1, limit = 50, status } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 50);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;

  let sql = `
    SELECT r.*, u.username AS reporter_username, u.display_name AS reporter_name
    FROM reports r 
    JOIN users u ON r.user_id = u.id
  `;
  const params = [];

  if (status) {
    sql += ` WHERE r.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY r.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const rows = await query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM reports';
  const countParams = [];
  if (status) {
    countSql += ' WHERE status = ?';
    countParams.push(status);
  }

  const countRows = await query(countSql, countParams);
  const total = parseInt(countRows[0]?.total || 0, 10);
  return { reports: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function updateReportStatus(reportId, status) {
  await query('UPDATE reports SET status = ? WHERE id = ?', [status, reportId]);
  const rows = await query('SELECT * FROM reports WHERE id = ?', [reportId]);
  return rows[0] || null;
}

export async function getReportsByTarget(targetType, targetId) {
  return query('SELECT r.*, u.username AS reporter_username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.target_type = ? AND r.target_id = ? ORDER BY r.created_at DESC', [targetType, targetId]);
}

export async function removeReport(reportId) {
  await query('DELETE FROM reports WHERE id = ?', [reportId]);
  return true;
}
