import mysql from 'mysql2/promise';

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seaku_novel',
  });

  const sql = `CREATE TABLE IF NOT EXISTS chapter_views (
    id CHAR(36) NOT NULL,
    chapter_id CHAR(36) NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_chapter_views_chapter (chapter_id),
    KEY idx_cv_chapter (chapter_id)
  ) ENGINE=InnoDB;`;

  try {
    await pool.execute(sql);
    console.log('chapter_views table ensured');
    process.exit(0);
  } catch (err) {
    console.error('create table error', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
