import { query } from './config/db.js';

async function main() {
  try {
    const rows = await query('SELECT COUNT(*) AS c FROM sessions');
    console.log('sessions count:', rows[0].c);
    const sample = await query('SELECT id, user_id, jti, created_at, expires_at FROM sessions ORDER BY created_at DESC LIMIT 5');
    console.log(sample);
  } catch (err) {
    console.error('Error querying sessions:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
