import { query } from './db.js';

export async function ensureAllTables() {
  try {
    // 1. Sessions
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        jti VARCHAR(255) NOT NULL,
        user_agent VARCHAR(512) NULL,
        ip VARCHAR(100) NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sessions_user (user_id),
        UNIQUE KEY uk_sessions_jti (jti),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 2. Chapter Views
    await query(`
      CREATE TABLE IF NOT EXISTS chapter_views (
        id CHAR(36) NOT NULL,
        chapter_id CHAR(36) NOT NULL,
        view_count INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_chapter_views_chapter (chapter_id),
        KEY idx_cv_chapter (chapter_id),
        CONSTRAINT fk_cv_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 3. Follows
    await query(`
      CREATE TABLE IF NOT EXISTS follows (
        id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        target_type ENUM('novel','author') NOT NULL,
        target_id CHAR(36) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_follows_user_target (user_id, target_type, target_id),
        KEY idx_follows_user (user_id),
        CONSTRAINT fk_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. Notifications
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        data JSON NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_notifications_user (user_id),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. Reports
    await query(`
      CREATE TABLE IF NOT EXISTS reports (
        id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        target_type ENUM('novel','chapter','comment','review','user') NOT NULL,
        target_id CHAR(36) NOT NULL,
        reason TEXT NOT NULL,
        details TEXT NULL,
        status ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_reports_user (user_id),
        KEY idx_reports_status (status),
        CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    const reportStatusCol = await query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='reports' AND column_name='status'");
    if (reportStatusCol.length === 0) {
      await query("ALTER TABLE reports ADD COLUMN status ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open'");
    }

    // 6. Scheduled Publications
    await query(`
      CREATE TABLE IF NOT EXISTS scheduled_publications (
        id CHAR(36) NOT NULL,
        novel_id CHAR(36) NOT NULL,
        chapter_id CHAR(36) NULL,
        publish_at DATETIME NOT NULL,
        status ENUM('scheduled','published','cancelled') NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sp_novel (novel_id),
        CONSTRAINT fk_sp_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
        CONSTRAINT fk_sp_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // 7. Analytics
    await query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id CHAR(36) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        user_id CHAR(36) NULL,
        novel_id CHAR(36) NULL,
        chapter_id CHAR(36) NULL,
        metadata JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_analytics_event (event_type),
        KEY idx_analytics_user (user_id)
      ) ENGINE=InnoDB;
    `);

    // Ensure parent_id exists on comments table for threaded replies
    const commentParentCol = await query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='comments' AND column_name='parent_id'");
    if (commentParentCol.length === 0) {
      await query("ALTER TABLE comments ADD COLUMN parent_id CHAR(36) NULL, ADD KEY idx_comments_parent (parent_id)");
    }

    console.log('✓ All database tables ensured.');
  } catch (err) {
    console.error('Failed to ensure database tables:', err);
    throw err;
  }
}

export default ensureAllTables;
