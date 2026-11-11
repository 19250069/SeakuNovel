import { query } from './server/config/db.js';

// Find any user with novels
const novels = await query(
  `SELECT n.id, n.title, n.status, n.author_id, n.total_words,
    (SELECT GROUP_CONCAT(g.name) FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
    (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) AS chapters_count
   FROM novels n LIMIT 3`
);
console.log('Novels:', JSON.stringify(novels.slice(0,2).map(n => ({
  id: n.id,
  title: n.title.substring(0,30),
  genres: n.genres,
  chapters_count: n.chapters_count,
  total_words: n.total_words,
  status: n.status
})), null, 2));
process.exit(0);
