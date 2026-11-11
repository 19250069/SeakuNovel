import crypto from 'crypto';
import { query } from '../config/db.js';

export async function createNotification(userId, type, data = {}) {
  const id = crypto.randomUUID();
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  await query(
    'INSERT INTO notifications (id, user_id, type, data, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
    [id, userId, type, dataStr]
  );
  return { id, user_id: userId, type, data, is_read: 0 };
}

export async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;

  let sql = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [userId];

  if (unreadOnly) {
    sql += ' AND is_read = 0';
  }

  sql += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const rows = await query(sql, params);

  const parsed = rows.map((r) => ({
    ...r,
    is_read: Boolean(r.is_read),
    data: typeof r.data === 'string' ? safeJsonParse(r.data) : r.data || {},
  }));

  const countRows = await query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_total FROM notifications WHERE user_id = ?`,
    [userId]
  );

  const total = parseInt(countRows[0]?.total || 0, 10);
  const unreadTotal = parseInt(countRows[0]?.unread_total || 0, 10);

  return {
    notifications: parsed,
    unreadCount: unreadTotal,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUnreadCount(userId) {
  const rows = await query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return parseInt(rows[0]?.count || 0, 10);
}

export async function markAsRead(id, userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

export async function markAllAsRead(userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  return true;
}

/**
 * Notify followers of a novel or author when a new chapter is published
 */
export async function notifyFollowersOfNewChapter({ chapter, novel }) {
  try {
    if (!novel || !novel.id) return;

    // 1. Get novel followers
    const novelFollowers = await query(
      "SELECT user_id FROM follows WHERE target_type = 'novel' AND target_id = ?",
      [novel.id]
    );

    // 2. Get author followers
    const authorFollowers = novel.author_id
      ? await query("SELECT user_id FROM follows WHERE target_type = 'author' AND target_id = ?", [novel.author_id])
      : [];

    // Collect distinct recipient user IDs excluding author
    const recipientSet = new Set();
    novelFollowers.forEach((r) => recipientSet.add(r.user_id));
    authorFollowers.forEach((r) => recipientSet.add(r.user_id));
    if (novel.author_id) {
      recipientSet.delete(novel.author_id);
    }

    if (recipientSet.size === 0) return;

    const notifData = {
      novelId: novel.id,
      novelTitle: novel.title,
      novelSlug: novel.slug,
      chapterId: chapter.id,
      chapterTitle: chapter.title || `Bab ${chapter.chapter_number}`,
      chapterNumber: chapter.chapter_number,
      message: `Bab ${chapter.chapter_number}: "${chapter.title || 'Bab Baru'}" telah diterbitkan di novel ${novel.title}`,
      url: `/reader/${novel.id}/${chapter.id}`,
    };

    const notifDataStr = JSON.stringify(notifData);
    for (const recipientId of recipientSet) {
      const id = crypto.randomUUID();
      await query(
        'INSERT INTO notifications (id, user_id, type, data, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
        [id, recipientId, 'new_chapter', notifDataStr]
      );
    }
  } catch (err) {
    console.error('Error notifying followers of new chapter:', err);
  }
}

/**
 * Notify parent comment owner when a reply is posted
 */
export async function notifyCommentReply({ parentUserId, replierUser, novel, reviewId }) {
  try {
    if (!parentUserId || parentUserId === replierUser.id) return;

    const notifData = {
      novelId: novel?.id,
      novelTitle: novel?.title,
      reviewId,
      replierName: replierUser.display_name || replierUser.username,
      message: `${replierUser.display_name || replierUser.username} membalas komentar Anda di ulasan novel ${novel?.title || ''}.`,
      url: novel?.id ? `/novel/${novel.id}` : '#',
    };

    await createNotification(parentUserId, 'comment_reply', notifData);
  } catch (err) {
    console.error('Error notifying comment reply:', err);
  }
}

/**
 * Notify author when a new review is posted for their novel
 */
export async function notifyNovelReview({ authorId, reviewerUser, novel, rating }) {
  try {
    if (!authorId || authorId === reviewerUser.id) return;

    const notifData = {
      novelId: novel.id,
      novelTitle: novel.title,
      reviewerName: reviewerUser.display_name || reviewerUser.username,
      rating,
      message: `${reviewerUser.display_name || reviewerUser.username} memberikan ulasan ⭐${rating} pada novel "${novel.title}".`,
      url: `/novel/${novel.id}`,
    };

    await createNotification(authorId, 'novel_review', notifData);
  } catch (err) {
    console.error('Error notifying novel review:', err);
  }
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

/**
 * Notify author when a user bookmarks their novel
 */
export async function notifyNovelBookmarked({ authorId, user, novel }) {
  try {
    if (!authorId || authorId === user.id) return;
    const notifData = {
      novelId: novel.id,
      novelTitle: novel.title,
      userName: user.display_name || user.username,
      message: `${user.display_name || user.username} menambahkan novel "${novel.title}" ke pustaka mereka.`,
      url: `/novel/${novel.id}`,
    };
    await createNotification(authorId, 'novel_bookmarked', notifData);
  } catch (err) {
    console.error('Error notifying novel bookmarked:', err);
  }
}

/**
 * Notify followers when a novel is published (status changed to published)
 */
export async function notifyNovelPublished({ authorId, novel, authorName }) {
  try {
    const followers = await query("SELECT user_id FROM follows WHERE target_type = 'author' AND target_id = ?", [authorId]);
    if (followers.length === 0) return;

    const notifData = {
      novelId: novel.id,
      novelTitle: novel.title,
      authorName: authorName,
      message: `${authorName} baru saja menerbitkan novel baru: "${novel.title}"!`,
      url: `/novel/${novel.id}`,
    };
    const notifDataStr = JSON.stringify(notifData);
    
    // Require crypto if not already required
    const crypto = await import('crypto');

    for (const f of followers) {
      if (f.user_id === authorId) continue;
      const id = crypto.default.randomUUID();
      await query(
        'INSERT INTO notifications (id, user_id, type, data, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
        [id, f.user_id, 'novel_published', notifDataStr]
      );
    }
  } catch (err) {
    console.error('Error notifying novel published:', err);
  }
}

/**
 * Notify user when their password is changed
 */
export async function notifyPasswordChanged({ userId }) {
  try {
    const notifData = {
      message: `Password akun Anda telah berhasil diubah. Jika ini bukan Anda, segera hubungi tim support!`,
      url: `/profile`,
    };
    await createNotification(userId, 'security_alert', notifData);
  } catch (err) {
    console.error('Error notifying password changed:', err);
  }
}
