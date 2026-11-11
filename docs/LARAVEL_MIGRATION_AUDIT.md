# SEAKUNOVEL: Express.js to Laravel API Migration Audit

**Document:** `docs/LARAVEL_MIGRATION_AUDIT.md`  
**Date:** 2026-11-11  
**Author:** Principal Full-Stack & Laravel Migration Architect  
**Project:** SeakuNovel  
**Status:** Audit Completed & Baseline Verified  

---

## 1. Environment & Architecture Overview

### 1.1 Verified System Versions
| Component | Detected Version | Location / Note |
|---|---|---|
| **OS** | Windows 10/11 x64 | Host environment |
| **Laragon Path** | `D:\Laragon\laragon` | Workspace in `D:\Laragon\laragon\www\SeakuNovel` |
| **PHP CLI (Default)** | PHP 8.1.10 (cli) | `D:\Laragon\laragon\bin\php\php-8.1.10-Win32-vs16-x64` |
| **PHP CLI (Target / High-Performance)** | **PHP 8.3.16 (cli)** | `D:\Laragon\laragon\bin\php\php-8.3.16-Win32-vs16-x64` (Tested & verified) |
| **PHP Extensions Verified** | `bcmath`, `curl`, `dom`, `fileinfo`, `json`, `mbstring`, `mysqli`, `mysqlnd`, `openssl`, `PDO`, `pdo_mysql`, `session`, `SimpleXML`, `tokenizer`, `xml`, `zip` | All necessary extensions enabled in PHP 8.3 |
| **Composer** | Composer 2.11.2 | `D:\Laragon\laragon\bin\composer\composer.phar` |
| **MySQL Server** | MySQL 8.0.30 Community Server | Port 3306, `127.0.0.1`, user `root`, no password, database `seaku_novel` |
| **Node.js** | v18.8.0 / npm 8.18.0 | Used for Vite React SPA development & builds |
| **Target Laravel Version** | **Laravel 11.x** (compatible with PHP 8.2 & 8.3) | Clean JSON API without Blade/Inertia/Breeze |

### 1.2 Target Project Structure
```
d:\Laragon\laragon\www\SeakuNovel\
├── backend/                       <-- New Laravel 11 HTTP/JSON API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/   <-- Express controllers ported to Laravel
│   │   │   ├── Middleware/        <-- JWT & optional auth, role guards
│   │   │   └── Requests/          <-- FormRequest validators
│   │   ├── Models/                <-- Eloquent models matching live schema
│   │   └── Services/              <-- Business logic & notification dispatchers
│   ├── bootstrap/
│   ├── config/
│   ├── public/                    <-- Web server document root
│   │   └── index.php
│   ├── routes/
│   │   └── api.php                <-- Full 56 endpoints mapped 1:1
│   └── .env                       <-- Laravel config (DB, JWT_SECRET, CORS)
├── src/                           <-- Existing React + TypeScript SPA (FROZEN UI)
│   ├── app/                       <-- UI components, Pages, Routes (UNTOUCHED)
│   ├── services/                  <-- API client (baseURL configured)
│   └── contexts/AuthContext.tsx   <-- Token & Auth state handler
├── uploads/                       <-- Shared upload storage (covers & avatars preserved)
├── database/                      <-- Schemas & verified pre-migration backups
│   ├── backup_before_migration.sql (338 KB verified)
│   └── live_schema_dump.sql
├── docs/                          <-- Migration audit, matrix, QA & rollback specs
└── server/                        <-- Legacy Express.js backend (KEPT FOR FALLBACK)
```

---

## 2. Database Schema & Data Preservation Audit

### 2.1 Live Tables & Record Count (Verified via PDO on `seaku_novel`)
| Table Name | Row Count | Primary Key | Key Relationships / Constraints |
|---|---|---|---|
| `users` | 34 rows | `id` (CHAR 36, UUID) | Author/Reader accounts with bcrypt hashes |
| `novels` | 28 rows | `id` (CHAR 36, UUID) | `author_id` -> users.id, `cover_url`, status, stats |
| `chapters` | 99 rows | `id` (CHAR 36, UUID) | `novel_id` -> novels.id, order_index, content |
| `reviews` | 53 rows | `id` (CHAR 36, UUID) | `novel_id`, `user_id` (Unique per user/novel) |
| `review_likes` | 5 rows | `id` (CHAR 36, UUID) | `review_id`, `user_id` |
| `comments` | 90 rows | `id` (CHAR 36, UUID) | `review_id`, `user_id`, `parent_id` (threaded) |
| `chapter_comments`| 0 rows | `id` (CHAR 36, UUID) | `chapter_id`, `user_id`, paragraph_index |
| `chapter_views` | 4 rows | `id` (CHAR 36, UUID) | `chapter_id` (Unique), view_count |
| `genres` | 8 rows | `id` (INT auto-inc) | Fantasy, Romance, Sci-Fi, Horror, Mystery, etc. |
| `novel_genres` | 28 rows | Composite | `novel_id`, `genre_id` |
| `bookmarks` | 53 rows | Composite/UUID | `user_id`, `novel_id` |
| `reading_progress`| 9 rows | Composite/UUID | `user_id`, `novel_id`, `last_chapter_id` |
| `follows` | 42 rows | `id` (CHAR 36, UUID) | `user_id`, `target_type` (novel/author), `target_id` |
| `notifications` | 6 rows | `id` (CHAR 36, UUID) | `user_id`, type, title, message, is_read |
| `reports` | 7 rows | `id` (CHAR 36, UUID) | `user_id`, target_type, target_id, reason, status |
| `sessions` | 130 rows | `id` (CHAR 36, UUID) | `user_id`, `jti`, expires_at |
| `scheduled_publications` | 1 row | `id` (CHAR 36, UUID) | `novel_id`, `chapter_id`, publish_at, status |
| `drafts` | 0 rows | `id` (CHAR 36, UUID) | Legacy draft workspace |
| `analytics` | 0 rows | `id` (CHAR 36, UUID) | Aggregated historical metrics |

### 2.2 Live MySQL Triggers Verified
1. `trg_chapters_after_insert` on `chapters` (AFTER INSERT)
2. `trg_chapters_after_update` on `chapters` (AFTER UPDATE)
3. `trg_chapters_after_delete` on `chapters` (AFTER DELETE)
4. `trg_review_likes_after_insert` on `review_likes` (AFTER INSERT)
5. `trg_review_likes_after_delete` on `review_likes` (AFTER DELETE)
6. `trg_reviews_after_insert` on `reviews` (AFTER INSERT)
7. `trg_reviews_after_delete` on `reviews` (AFTER DELETE)

> **Critical Safety Rule:** Eloquent models and Controllers MUST NOT manually alter fields calculated by MySQL triggers (such as `likes_count` on reviews or `chapters_count` on novels) to avoid race conditions and double-counting.

### 2.3 Password Hashing Verification
* Live password hashes: standard bcrypt (`$2b$10$...` and `$2y$10$...`).
* Tested in PHP 8.3: `password_verify('123123', $user->password_hash)` returned **`VERIFY_OK`**.
* Zero password conversions or user resets required.

---

## 3. Authentication Architecture: Compatibility (Option B)

### 3.1 Decision
* The React SPA communicates with the backend via `axios` (`src/services/api.js`).
* Tokens are stored in `localStorage` under key `token`, sent via header `Authorization: Bearer <token>`.
* Fallback support for `seaku_token` HttpOnly cookie is implemented.
* The token payload contains: `{ id, username, email, role, jti }`.
* Each token has a corresponding record in the `sessions` table matched by `jti` and `user_id`.
* **Strategy:** Implement JWT authentication in Laravel using standard HMAC-SHA256 with the existing `JWT_SECRET`. Laravel's auth middleware decodes the token, verifies `jti` in the `sessions` table, and injects the authenticated User instance into `$request->user()`.
* **Outcome:** Existing active sessions remain valid. Frontend login/register flow works out of the box with zero breaking changes.

---

## 4. File Storage & Media Asset Preservation

* **Location:** `d:\Laragon\laragon\www\SeakuNovel\uploads\` contains 24 active image files (e.g. `cover-1789292632142-505205500.png`).
* **Serving Strategy:** The Laravel backend configures public disk symbolic link or a dedicated route/virtual directory for `/uploads` so that `/uploads/{filename}` serves the exact physical files from the root `uploads/` folder.
* **No file moving or deletion** will take place during migration.

---

## 5. Risk Assessment & Mitigation

| Identified Risk | Impact | Mitigation Strategy |
|---|---|---|
| Database alteration or data loss | Catastrophic | Backup created at `database/backup_before_migration.sql` (338 KB). Strict prohibition of destructive migrations (`migrate:fresh`, `db:wipe`). |
| Frontend UI regression | High | Frontend React code is frozen. All endpoint shapes and JSON keys (`user`, `token`, `pagination`, `genres`, etc.) in Laravel match Express 1:1. |
| Incompatible password hashing | High | Verified: PHP `password_verify` natively supports Express `bcryptjs` hashes. |
| Port collision during testing | Medium | Express runs on `3001`. Laravel runs on `3002` (or `8000`) during side-by-side verification, then cutover via Vite proxy on `3001`. |
| Soft delete mismatch | Low | Chapters utilize `deleted_at IS NULL`. Laravel Chapter model uses `Illuminate\Database\Eloquent\SoftDeletes`. |
