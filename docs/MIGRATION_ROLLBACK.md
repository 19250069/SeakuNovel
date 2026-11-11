# SEAKUNOVEL: Migration Rollback & Disaster Recovery Guide

**Document:** `docs/MIGRATION_ROLLBACK.md`  
**Date:** 2026-11-11  

---

## 1. Quick Rollback: Switching Back to Express.js

If at any point during production testing or cutover an unexpected blocker occurs, you can revert completely back to the legacy Node.js Express server in **less than 1 minute** without data loss.

### Step 1: Point Vite Proxy back to Port 3001
In `vite.config.ts`, change:
```typescript
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
    },
  },
```

### Step 2: Start the Legacy Express Server
```bash
npm run server:express:legacy
```
*(Runs `node server/index.js` on port 3001)*

### Step 3: Stop Laravel (if running on same port)
Stop the Laravel process via `Ctrl + C` or terminal manager.

---

## 2. Database Recovery (If ever needed)

A clean pre-migration database snapshot was created before any write operations:
* **Location:** `database/backup_before_migration.sql` (338 KB)
* **Command to restore database:**
```bash
mysql -h 127.0.0.1 -u root seaku_novel < database/backup_before_migration.sql
```
*(Or via Laragon: Right Click Laragon -> MySQL -> Open database tool / HeidiSQL -> Run SQL File)*

---

## 3. Preserved File Assets

* All user uploaded covers and avatars remain in `uploads/`. No files were moved or deleted.
* All Express files in `server/` remain 100% intact as a standalone fallback until final decommissioning is approved.
