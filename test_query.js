import { query } from './server/config/db.js';

async function test() {
  try {
    const res = await query('SELECT COALESCE(SUM(total_views), 0) AS total_views FROM novels');
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
