import fs from 'fs';
import path from 'path';
import { query } from '../config/db.js';
import { getReports, updateReportStatus, removeReport } from '../models/report.js';

/**
 * Get aggregated system statistics for admin dashboard
 */
export async function getStats(req, res) {
  try {
    // 1. User stats
    const userStatsRows = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'reader' THEN 1 ELSE 0 END) AS readers,
        SUM(CASE WHEN role = 'author' THEN 1 ELSE 0 END) AS authors,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
      FROM users
    `);

    // 2. Novel stats
    const novelStatsRows = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
      FROM novels
    `);

    // 3. Chapter stats
    const chapterStatsRows = await query(`
      SELECT 
        COUNT(*) AS total_chapters,
        COALESCE(SUM(word_count), 0) AS total_words
      FROM chapters
    `);

    // 4. Report stats
    const reportStatsRows = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_reports,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_reports,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed_reports
      FROM reports
    `);

    // 5. Engagement stats
    const reviewStatsRows = await query('SELECT COUNT(*) AS total FROM reviews');
    const commentStatsRows = await query('SELECT COUNT(*) AS total FROM comments');
    const bookmarkStatsRows = await query('SELECT COUNT(*) AS total FROM bookmarks');

    // 6. Recent activities
    const recentUsers = await query(`
      SELECT id, username, display_name, email, role, created_at
      FROM users ORDER BY created_at DESC LIMIT 5
    `);

    const recentNovels = await query(`
      SELECT n.id, n.title, n.status, n.created_at, u.display_name AS author_name
      FROM novels n
      JOIN users u ON n.author_id = u.id
      ORDER BY n.created_at DESC LIMIT 5
    `);

    const recentReports = await query(`
      SELECT r.*, u.display_name AS reporter_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC LIMIT 5
    `);

    res.json({
      users: {
        total: parseInt(userStatsRows[0]?.total || 0, 10),
        readers: parseInt(userStatsRows[0]?.readers || 0, 10),
        authors: parseInt(userStatsRows[0]?.authors || 0, 10),
        admins: parseInt(userStatsRows[0]?.admins || 0, 10),
      },
      novels: {
        total: parseInt(novelStatsRows[0]?.total || 0, 10),
        published: parseInt(novelStatsRows[0]?.published || 0, 10),
        drafts: parseInt(novelStatsRows[0]?.drafts || 0, 10),
      },
      chapters: {
        total: parseInt(chapterStatsRows[0]?.total_chapters || 0, 10),
        totalWords: parseInt(chapterStatsRows[0]?.total_words || 0, 10),
      },
      reports: {
        total: parseInt(reportStatsRows[0]?.total || 0, 10),
        open: parseInt(reportStatsRows[0]?.open_reports || 0, 10),
        resolved: parseInt(reportStatsRows[0]?.resolved_reports || 0, 10),
        dismissed: parseInt(reportStatsRows[0]?.dismissed_reports || 0, 10),
      },
      engagement: {
        reviews: parseInt(reviewStatsRows[0]?.total || 0, 10),
        comments: parseInt(commentStatsRows[0]?.total || 0, 10),
        bookmarks: parseInt(bookmarkStatsRows[0]?.total || 0, 10),
      },
      recent: {
        users: recentUsers,
        novels: recentNovels,
        reports: recentReports,
      },
    });
  } catch (err) {
    console.error('Admin getStats error:', err);
    res.status(500).json({ error: 'Gagal memuat statistik sistem' });
  }
}

/**
 * Get paginated users list with search and role filters
 */
export async function getUsers(req, res) {
  try {
    const safeLimit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const safePage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const safeOffset = (safePage - 1) * safeLimit;
    const { search = '', role = '' } = req.query;

    let sql = `
      SELECT id, username, email, display_name, role, avatar_url, bio, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      sql += ` AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (role && ['reader', 'author', 'admin'].includes(role)) {
      sql += ` AND role = ?`;
      params.push(role);
    }

    sql += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const users = await query(sql, params);

    // Count
    let countSql = `SELECT COUNT(*) AS total FROM users WHERE 1=1`;
    const countParams = [];
    if (search.trim()) {
      countSql += ` AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)`;
      const term = `%${search.trim()}%`;
      countParams.push(term, term, term);
    }
    if (role && ['reader', 'author', 'admin'].includes(role)) {
      countSql += ` AND role = ?`;
      countParams.push(role);
    }
    const countRows = await query(countSql, countParams);
    const total = parseInt(countRows[0]?.total || 0, 10);

    res.json({
      users,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    console.error('Admin getUsers error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar pengguna' });
  }
}

/**
 * Update user role
 */
export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['reader', 'author', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }

    // Protect against self-demoting the logged in admin
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Anda tidak dapat menurunkan peran akun Anda sendiri' });
    }

    await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    const updated = await query('SELECT id, username, display_name, email, role FROM users WHERE id = ?', [id]);

    res.json({ message: 'Peran pengguna berhasil diperbarui', user: updated[0] });
  } catch (err) {
    console.error('Admin updateUserRole error:', err);
    res.status(500).json({ error: 'Gagal memperbarui peran pengguna' });
  }
}

/**
 * Delete user
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' });
    }

    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (err) {
    console.error('Admin deleteUser error:', err);
    res.status(500).json({ error: 'Gagal menghapus pengguna' });
  }
}

/**
 * Get paginated novels list for admin moderation
 */
export async function getNovels(req, res) {
  try {
    const safeLimit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const safePage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const safeOffset = (safePage - 1) * safeLimit;
    const { search = '', status = '' } = req.query;

    let sql = `
      SELECT n.*, u.display_name AS author_name, u.username AS author_username
      FROM novels n
      JOIN users u ON n.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      sql += ` AND (n.title LIKE ? OR n.synopsis LIKE ? OR u.display_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status && ['draft', 'published'].includes(status)) {
      sql += ` AND n.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY n.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const novels = await query(sql, params);

    // Count
    let countSql = `
      SELECT COUNT(*) AS total
      FROM novels n
      JOIN users u ON n.author_id = u.id
      WHERE 1=1
    `;
    const countParams = [];
    if (search.trim()) {
      countSql += ` AND (n.title LIKE ? OR n.synopsis LIKE ? OR u.display_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      countParams.push(term, term, term);
    }
    if (status && ['draft', 'published'].includes(status)) {
      countSql += ` AND n.status = ?`;
      countParams.push(status);
    }
    const countRows = await query(countSql, countParams);
    const total = parseInt(countRows[0]?.total || 0, 10);

    res.json({
      novels,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    console.error('Admin getNovels error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar novel' });
  }
}

/**
 * Update novel status (e.g. published vs draft)
 */
export async function updateNovelStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Status novel tidak valid' });
    }

    await query('UPDATE novels SET status = ? WHERE id = ?', [status, id]);
    const updated = await query('SELECT * FROM novels WHERE id = ?', [id]);

    res.json({ message: 'Status novel berhasil diperbarui', novel: updated[0] });
  } catch (err) {
    console.error('Admin updateNovelStatus error:', err);
    res.status(500).json({ error: 'Gagal memperbarui status novel' });
  }
}

/**
 * Delete novel as admin
 */
export async function deleteNovel(req, res) {
  try {
    const { id } = req.params;
    const novelRows = await query('SELECT cover_image_url FROM novels WHERE id = ?', [id]);
    if (novelRows.length === 0) {
      return res.status(404).json({ error: 'Novel tidak ditemukan' });
    }

    const coverUrl = novelRows[0].cover_image_url;
    if (coverUrl && coverUrl.startsWith('/uploads/covers/')) {
      const filename = path.basename(coverUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'covers', filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not delete cover file:', e);
        }
      }
    }

    await query('DELETE FROM novels WHERE id = ?', [id]);
    res.json({ message: 'Novel berhasil dihapus' });
  } catch (err) {
    console.error('Admin deleteNovel error:', err);
    res.status(500).json({ error: 'Gagal menghapus novel' });
  }
}

/**
 * Get reports list
 */
export async function getAdminReports(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status } = req.query;

    const result = await getReports({ page, limit, status: status || undefined });
    res.json(result);
  } catch (err) {
    console.error('Admin getAdminReports error:', err);
    res.status(500).json({ error: 'Gagal memuat laporan' });
  }
}

/**
 * Update report status (open, resolved, dismissed)
 */
export async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Status laporan tidak valid' });
    }

    const updated = await updateReportStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    res.json({ message: 'Status laporan berhasil diperbarui', report: updated });
  } catch (err) {
    console.error('Admin updateReport error:', err);
    res.status(500).json({ error: 'Gagal memperbarui status laporan' });
  }
}

/**
 * Delete report
 */
export async function deleteReportAction(req, res) {
  try {
    const { id } = req.params;
    await removeReport(id);
    res.json({ message: 'Laporan berhasil dihapus' });
  } catch (err) {
    console.error('Admin deleteReportAction error:', err);
    res.status(500).json({ error: 'Gagal menghapus laporan' });
  }
}
