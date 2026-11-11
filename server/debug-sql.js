import mysql from 'mysql2/promise';

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seaku_novel',
  });

  const sql = `SELECT n.*, u.username AS author_name,
    (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
    (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS total_chapters,
    (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.novel_id = n.id) AS average_rating,
    (SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c2.id FROM chapters c2 WHERE c2.novel_id = n.id)) AS total_views
    FROM novels n JOIN users u ON n.author_id = u.id
    WHERE n.status = 'published' ORDER BY n.average_rating DESC LIMIT 6 OFFSET 0;`;

  try {
    const [rows] = await pool.execute(sql);
    console.log('rows', rows.length);
    if (rows.length > 0) console.log(rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('SQL ERR', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
