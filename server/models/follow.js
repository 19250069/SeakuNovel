import crypto from 'crypto';
import { query } from '../config/db.js';

export async function isFollowing(userId, targetType, targetId) {
  if (!userId || !targetType || !targetId) return false;
  const rows = await query(
    'SELECT id FROM follows WHERE user_id = ? AND target_type = ? AND target_id = ?',
    [userId, targetType, targetId]
  );
  return rows.length > 0;
}

export async function toggleFollow(userId, targetType, targetId) {
  const existing = await query(
    'SELECT id FROM follows WHERE user_id = ? AND target_type = ? AND target_id = ?',
    [userId, targetType, targetId]
  );

  if (existing.length > 0) {
    await query('DELETE FROM follows WHERE id = ?', [existing[0].id]);
    return { followed: false };
  } else {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO follows (id, user_id, target_type, target_id) VALUES (?, ?, ?, ?)',
      [id, userId, targetType, targetId]
    );
    return { followed: true };
  }
}

export async function getFollowersCount(targetType, targetId) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM follows WHERE target_type = ? AND target_id = ?',
    [targetType, targetId]
  );
  return parseInt(rows[0]?.total || 0, 10);
}

export async function getUserFollows(userId, targetType = null) {
  let sql = `
    SELECT f.*, 
      CASE 
        WHEN f.target_type = 'novel' THEN n.title 
        WHEN f.target_type = 'author' THEN u.display_name 
      END AS target_name,
      CASE 
        WHEN f.target_type = 'novel' THEN n.cover_url 
        WHEN f.target_type = 'author' THEN u.avatar_url 
      END AS target_image
    FROM follows f
    LEFT JOIN novels n ON f.target_type = 'novel' AND f.target_id = n.id
    LEFT JOIN users u ON f.target_type = 'author' AND f.target_id = u.id
    WHERE f.user_id = ?
  `;
  const params = [userId];

  if (targetType) {
    sql += ' AND f.target_type = ?';
    params.push(targetType);
  }

  sql += ' ORDER BY f.created_at DESC';

  return await query(sql, params);
}

export default { isFollowing, toggleFollow, getFollowersCount, getUserFollows };
