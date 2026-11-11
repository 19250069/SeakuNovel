// Test what getMyNovels actually returns
import bcrypt from 'bcryptjs';
import { query } from './server/config/db.js';

// Get author token first
const rows = await query('SELECT id, username, email, role FROM users WHERE email = ?', ['author@seakunovel.com']);
const user = rows[0];
console.log('User:', user.email, user.role);

// Check their novels
const novels = await query(
  `SELECT n.*, u.username AS author_name,
    (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres
   FROM novels n
   JOIN users u ON n.author_id = u.id
   WHERE n.author_id = ?
   ORDER BY n.updated_at DESC LIMIT 3`,
  [user.id]
);
console.log('Novels count:', novels.length);
if (novels.length > 0) {
  console.log('Novel shape (key fields):', {
    id: novels[0].id,
    title: novels[0].title,
    genres: novels[0].genres,         // GROUP_CONCAT string
    chapters_count: novels[0].chapters_count, // Does this field exist?
    total_words: novels[0].total_words,
    status: novels[0].status,
  });
}
process.exit(0);
