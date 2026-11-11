# SeakuNovel 📚

Platform baca dan tulis web novel modern dengan frontend React SPA (Vite + TypeScript) dan backend Laravel 13 REST API.

---

## 🏛️ Arsitektur Aplikasi

```
BROWSER (Pengguna / Penulis / Admin)
  └── React + TypeScript SPA [Vite, Tailwind CSS, Radix UI, Lucide, Tiptap Editor]
         └── HTTP / JSON API (Port 3002)
                └── Laravel 13 (PHP 8.3) [Controllers, Eloquent Models, Form Requests, Services]
                       └── MySQL Database (`seaku_novel`)
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons, Tiptap Editor.
- **Backend API:** Laravel 13.x (PHP 8.3.16) di folder `backend/`, menyediakan 56 endpoint RESTful JSON dengan autentikasi JWT terpusat yang 100% kompatibel dengan token lama.
- **Database:** MySQL 8.x (`seaku_novel`), skema dan data produksi/development dipertahankan penuh.
- **Legacy Fallback:** Server Node.js Express (`server/index.js`) tetap dipertahankan untuk opsi rollback instan jika diperlukan.

---

## 📋 Prasyarat Sistem (Laragon di Windows)

1. **Laragon** dengan:
   - **PHP 8.3.16+** (Pastikan path `laragon/bin/php/php-8.3.x` aktif atau terdaftar di environment PATH).
   - **MySQL 8.0+** running di port `3306`.
   - **Composer 2.2+**.
2. **Node.js 18+** & **npm 9+**.

---

## 🚀 Panduan Menjalankan Proyek

### 1. Persiapan Database MySQL
Pastikan service MySQL di Laragon telah berjalan dan database `seaku_novel` sudah siap:
- Nama Database: `seaku_novel`
- Port: `3306`
- User: `root` (default Laragon tanpa password)

> Skema DDL lengkap tersimpan di [`database/live_schema_dump.sql`](database/live_schema_dump.sql).

### 2. Konfigurasi Backend (Laravel API)
Buka terminal di root proyek:

```bash
# Masuk ke folder backend
cd backend

# Salin file konfigurasi environment
copy .env.example .env

# Install dependensi PHP (jika belum)
composer install

# Generate application key
php artisan key:generate
```

Pastikan variabel di `backend/.env` sesuai:
```ini
APP_NAME=SeakuNovel
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:3002

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seaku_novel
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync

JWT_SECRET=your_jwt_secret_key_here
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3. Menjalankan Aplikasi

Anda dapat menjalankan backend dan frontend melalui root package scripts:

#### Jalankan Backend Laravel (Port 3002):
```bash
npm run server
```
*Atau secara manual:*
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=3002
```

#### Jalankan Frontend React (Port 5173):
Buka terminal baru di root:
```bash
npm run dev
```
Akses aplikasi di browser: **`http://localhost:5173`**

Vite dev server secara otomatis mem-proxy semua request `/api` dan `/uploads` ke backend Laravel di `http://127.0.0.1:3002`.

---

## 📦 Build Frontend untuk Produksi

```bash
npm run build
```
Hasil build disimpan di direktori `dist/`.

---

## 🔄 Fallback ke Legacy Express Backend

Jika diperlukan rollback instan ke backend lama Express.js:
1. Jalankan Express:
   ```bash
   npm run server:express:legacy
   ```
2. Ubah target proxy di `vite.config.ts` kembali ke port `3001`.
3. Panduan lengkap tersedia di [`docs/MIGRATION_ROLLBACK.md`](docs/MIGRATION_ROLLBACK.md).

---

## 📚 Dokumentasi Migrasi Lengkap

Dokumentasi audit, kontrak API, pengujian QA, dan mitigasi risiko tersedia di folder `docs/`:

- 📄 [Audit Awal Migrasi](docs/LARAVEL_MIGRATION_AUDIT.md) — Inventaris sistem, dependensi, dan analisis risiko.
- 📄 [Matriks Paritas 56 Endpoint API](docs/EXPRESS_TO_LARAVEL_API_MATRIX.md) — Pemetaan detail Express.js vs Laravel.
- 📄 [Laporan QA & Verifikasi](docs/MIGRATION_QA_REPORT.md) — Hasil uji integrasi, pengujian security, dan verifikasi endpoint.
- 📄 [Panduan Rollback & Disaster Recovery](docs/MIGRATION_ROLLBACK.md) — Prosedur pemulihan data dan rollback darurat.

---

## 🛡️ Keamanan & Integritas Data

- **Zero Data Loss:** Seluruh 34 user, 28 novel, 99 chapter, ulasan, komentar, dan bookmark MySQL tetap terjaga tanpa `migrate:fresh` atau destructive SQL.
- **Bcrypt Password Compatibility:** Hash kata sandi lama tetap valid tanpa memerlukan reset password bagi user yang sudah ada.
- **JWT HS256 Compatibility:** Token format lama tetap didukung dengan session tracking pada tabel `sessions`.
