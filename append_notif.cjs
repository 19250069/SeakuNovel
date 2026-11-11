const fs = require('fs');

const code = `
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
      message: \`\${user.display_name || user.username} menambahkan novel "\${novel.title}" ke pustaka mereka.\`,
      url: \`/novel/\${novel.id}\`,
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
      message: \`\${authorName} baru saja menerbitkan novel baru: "\${novel.title}"!\`,
      url: \`/novel/\${novel.id}\`,
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
      message: \`Password akun Anda telah berhasil diubah. Jika ini bukan Anda, segera hubungi tim support!\`,
      url: \`/profile\`,
    };
    await createNotification(userId, 'security_alert', notifData);
  } catch (err) {
    console.error('Error notifying password changed:', err);
  }
}
`;

fs.appendFileSync('server/models/notification.js', code);
