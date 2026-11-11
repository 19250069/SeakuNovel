import { query } from './config/db.js';
import { addBookmark } from './models/bookmark.js';

(async () => {
  try {
    const users = await query('SELECT id FROM users LIMIT 1');
    const novels = await query('SELECT id FROM novels LIMIT 1');
    if (!users[0] || !novels[0]) { console.log('no users or novels'); process.exit(0); }
    const userId = users[0].id;
    const novelId = novels[0].id;
    const res = await addBookmark(userId, novelId);
    console.log('addBookmark result:', res);
  } catch (err) {
    console.error('debug add bookmark err', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
