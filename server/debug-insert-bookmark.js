import crypto from 'crypto';
import { query } from './config/db.js';

const [,, userId, novelId] = process.argv;
if (!userId || !novelId) {
  console.error('Usage: node debug-insert-bookmark.js <userId> <novelId>');
  process.exit(1);
}

(async () => {
  try {
    const id = crypto.randomUUID();
    await query('INSERT INTO bookmarks (id, user_id, novel_id) VALUES (?, ?, ?)', [id, userId, novelId]);
    console.log('Inserted bookmark', id);
  } catch (err) {
    console.error('Insert error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
