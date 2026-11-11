import { query } from './server/config/db.js';
const r = await query('SHOW TABLES');
const tables = r.map(row => Object.values(row)[0]);
console.log('Tables:', tables.join(', '));
process.exit(0);
