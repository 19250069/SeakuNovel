CREATE DATABASE IF NOT EXISTS seaku_novel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE seaku_novel;

CREATE TABLE users (
  id CHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  bio TEXT NULL,
  role ENUM('reader', 'author', 'admin') NOT NULL DEFAULT 'reader',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE genres (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_genres_name (name),
  UNIQUE KEY uk_genres_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE drafts (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  genre_id INT NOT NULL,
  content TEXT NULL,
  chapter_count INT NOT NULL DEFAULT 0,
  word_count INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'review') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_drafts_user (user_id),
  KEY idx_drafts_user_status (user_id, status),
  KEY idx_drafts_genre (genre_id),
  CONSTRAINT fk_drafts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_drafts_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE RESTRICT,
  CONSTRAINT ck_drafts_chapters CHECK (chapter_count >= 0),
  CONSTRAINT ck_drafts_words CHECK (word_count >= 0)
) ENGINE=InnoDB;

CREATE TABLE novels (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  synopsis TEXT NOT NULL,
  cover_url VARCHAR(500) NULL,
  author_id CHAR(36) NOT NULL,
  source_draft_id CHAR(36) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  total_chapters INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NULL,
  total_views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_novels_slug (slug),
  KEY idx_novels_author (author_id),
  KEY idx_novels_author_status (author_id, status),
  KEY idx_novels_status (status),
  KEY idx_novels_rating (average_rating),
  KEY idx_novels_source_draft (source_draft_id),
  KEY idx_novels_created (created_at),
  KEY idx_novels_status_rating (status, average_rating),
  FULLTEXT INDEX ft_novels_search (title, synopsis),
  CONSTRAINT fk_novels_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_novels_source_draft FOREIGN KEY (source_draft_id) REFERENCES drafts(id) ON DELETE SET NULL,
  CONSTRAINT ck_novels_rating CHECK (average_rating IS NULL OR (average_rating >= 1.00 AND average_rating <= 5.00)),
  CONSTRAINT ck_novels_total_chapters CHECK (total_chapters >= 0),
  CONSTRAINT ck_novels_total_words CHECK (total_words >= 0),
  CONSTRAINT ck_novels_total_views CHECK (total_views >= 0)
) ENGINE=InnoDB;

CREATE TABLE chapters (
  id CHAR(36) NOT NULL,
  novel_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  chapter_number INT NOT NULL,
  word_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_chapters_slug_per_novel (novel_id, slug),
  UNIQUE KEY uk_chapters_number_per_novel (novel_id, chapter_number),
  KEY idx_chapters_novel (novel_id),
  KEY idx_chapters_novel_published_order (novel_id, is_published, order_index),
  KEY idx_chapters_order (novel_id, order_index),
  CONSTRAINT fk_chapters_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  CONSTRAINT ck_chapters_number CHECK (chapter_number > 0),
  CONSTRAINT ck_chapters_words CHECK (word_count >= 0)
) ENGINE=InnoDB;

CREATE TABLE novel_genres (
  novel_id CHAR(36) NOT NULL,
  genre_id INT NOT NULL,
  PRIMARY KEY (novel_id, genre_id),
  KEY idx_ng_genre (genre_id),
  CONSTRAINT fk_ng_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  CONSTRAINT fk_ng_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id CHAR(36) NOT NULL,
  novel_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reviews_novel_user (novel_id, user_id),
  KEY idx_reviews_novel (novel_id),
  KEY idx_reviews_novel_created (novel_id, created_at),
  KEY idx_reviews_user (user_id),
  KEY idx_reviews_rating (rating),
  KEY idx_reviews_created (created_at),
  CONSTRAINT fk_reviews_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_reviews_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB;

CREATE TABLE review_likes (
  id CHAR(36) NOT NULL,
  review_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_review_likes_review_user (review_id, user_id),
  KEY idx_rl_user (user_id),
  CONSTRAINT fk_rl_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_rl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookmarks (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  novel_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookmarks_user_novel (user_id, novel_id),
  KEY idx_bookmarks_user (user_id),
  KEY idx_bookmarks_novel (novel_id),
  KEY idx_bookmarks_user_created (user_id, created_at),
  CONSTRAINT fk_bm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bm_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reading_progress (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  novel_id CHAR(36) NOT NULL,
  last_chapter_id CHAR(36) NULL,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  last_read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reading_progress_user_novel (user_id, novel_id),
  KEY idx_rp_user (user_id),
  KEY idx_rp_novel (novel_id),
  KEY idx_rp_chapter (last_chapter_id),
  KEY idx_rp_last_read (user_id, last_read_at),
  CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_chapter FOREIGN KEY (last_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
  CONSTRAINT ck_rp_progress CHECK (progress_percent >= 0.00 AND progress_percent <= 100.00)
) ENGINE=InnoDB;

CREATE TABLE comments (
  id CHAR(36) NOT NULL,
  review_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_review (review_id),
  KEY idx_comments_review_created (review_id, created_at),
  KEY idx_comments_user (user_id),
  KEY idx_comments_parent (parent_id),
  CONSTRAINT fk_comments_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT ck_comments_max_depth CHECK (parent_id IS NULL)
) ENGINE=InnoDB;

DELIMITER $$

CREATE TRIGGER trg_chapters_after_insert
AFTER INSERT ON chapters
FOR EACH ROW
BEGIN
  UPDATE novels
  SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE novel_id = NEW.novel_id),
      total_words = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = NEW.novel_id)
  WHERE id = NEW.novel_id;
END$$

CREATE TRIGGER trg_chapters_after_update
AFTER UPDATE ON chapters
FOR EACH ROW
BEGIN
  UPDATE novels
  SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE novel_id = NEW.novel_id),
      total_words = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = NEW.novel_id)
  WHERE id = NEW.novel_id;
END$$

CREATE TRIGGER trg_chapters_after_delete
AFTER DELETE ON chapters
FOR EACH ROW
BEGIN
  UPDATE novels
  SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE novel_id = OLD.novel_id),
      total_words = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = OLD.novel_id)
  WHERE id = OLD.novel_id;
END$$

CREATE TRIGGER trg_reviews_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE novels
  SET average_rating = (SELECT AVG(rating) FROM reviews WHERE novel_id = NEW.novel_id)
  WHERE id = NEW.novel_id;
END$$

CREATE TRIGGER trg_reviews_after_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
  UPDATE novels
  SET average_rating = (SELECT AVG(rating) FROM reviews WHERE novel_id = OLD.novel_id)
  WHERE id = OLD.novel_id;
END$$

CREATE TRIGGER trg_review_likes_after_insert
AFTER INSERT ON review_likes
FOR EACH ROW
BEGIN
  UPDATE reviews
  SET likes_count = likes_count + 1
  WHERE id = NEW.review_id;
END$$

CREATE TRIGGER trg_review_likes_after_delete
AFTER DELETE ON review_likes
FOR EACH ROW
BEGIN
  UPDATE reviews
  SET likes_count = likes_count - 1
  WHERE id = OLD.review_id;
END$$

DELIMITER ;

-- Sessions table for server-side session management (HttpOnly tokens)
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

-- Additional tables for follows, notifications, reports, scheduled publications,
-- chapter views and platform analytics. These are idempotent additions for
-- production-ready features and analytics.

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

CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) NOT NULL,
  reporter_id CHAR(36) NOT NULL,
  target_type ENUM('novel','chapter','comment','review','user') NOT NULL,
  target_id CHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_reporter (reporter_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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