import { query } from '../config/db.js';

export const getAuthorDashboard = async (req, res) => {
  try {
    const authorId = req.user.id;

    // 1. Novel counts
    const [novelCounts] = await query(
      `SELECT 
        COUNT(*) AS total_novels,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_novels,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_novels,
        COALESCE(SUM(total_views), 0) AS total_views,
        COALESCE(SUM(total_words), 0) AS total_words,
        AVG(CASE WHEN average_rating IS NOT NULL THEN average_rating ELSE NULL END) AS avg_rating
       FROM novels
       WHERE author_id = ?`,
      [authorId]
    );

    // 2. Chapter count
    const [chapterCount] = await query(
      `SELECT COUNT(*) AS total_chapters
       FROM chapters c
       JOIN novels n ON c.novel_id = n.id
       WHERE n.author_id = ?`,
      [authorId]
    );

    // 3. Followers count
    const [followerCount] = await query(
      `SELECT COUNT(*) AS total_followers
       FROM follows
       WHERE target_type = 'author' AND target_id = ?`,
      [authorId]
    );

    // 4. Bookmarks count
    const [bookmarkCount] = await query(
      `SELECT COUNT(*) AS total_bookmarks
       FROM bookmarks b
       JOIN novels n ON b.novel_id = n.id
       WHERE n.author_id = ?`,
      [authorId]
    );

    // 5. Total reviews
    const [reviewCount] = await query(
      `SELECT COUNT(*) AS total_reviews
       FROM reviews r
       JOIN novels n ON r.novel_id = n.id
       WHERE n.author_id = ?`,
      [authorId]
    );

    // 6. Novel performance details
    const novelsPerformance = await query(
      `SELECT 
        n.id, n.title, n.slug, n.status, n.total_chapters, n.total_words,
        n.total_views, n.average_rating, n.created_at, n.cover_url,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.novel_id = n.id) AS bookmarks_count,
        (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) AS reviews_count,
        (SELECT COUNT(*) FROM follows f WHERE f.target_type = 'novel' AND f.target_id = n.id) AS novel_followers
       FROM novels n
       WHERE n.author_id = ?
       ORDER BY n.total_views DESC, n.created_at DESC`,
      [authorId]
    );

    // 7. Recent reading activity on author's novels
    const recentActivity = await query(
      `SELECT 
        rp.last_read_at, rp.progress_percent,
        n.title AS novel_title,
        c.title AS chapter_title, c.chapter_number,
        u.display_name AS reader_name
       FROM reading_progress rp
       JOIN novels n ON rp.novel_id = n.id
       LEFT JOIN chapters c ON rp.last_chapter_id = c.id
       JOIN users u ON rp.user_id = u.id
       WHERE n.author_id = ? AND rp.last_read_at IS NOT NULL
       ORDER BY rp.last_read_at DESC
       LIMIT 10`,
      [authorId]
    );

    res.json({
      stats: {
        total_novels: parseInt(novelCounts.total_novels || 0, 10),
        published_novels: parseInt(novelCounts.published_novels || 0, 10),
        draft_novels: parseInt(novelCounts.draft_novels || 0, 10),
        total_chapters: parseInt(chapterCount.total_chapters || 0, 10),
        total_views: parseInt(novelCounts.total_views || 0, 10),
        total_words: parseInt(novelCounts.total_words || 0, 10),
        total_followers: parseInt(followerCount.total_followers || 0, 10),
        total_bookmarks: parseInt(bookmarkCount.total_bookmarks || 0, 10),
        total_reviews: parseInt(reviewCount.total_reviews || 0, 10),
        average_rating: novelCounts.avg_rating ? parseFloat(novelCounts.avg_rating) : null,
      },
      novels: novelsPerformance,
      recentActivity,
    });
  } catch (err) {
    console.error('Get author dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getAuthorDashboard };
