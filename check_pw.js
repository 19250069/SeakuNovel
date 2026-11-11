import bcrypt from 'bcryptjs';
import { query } from './server/config/db.js';

const testPasswords = ['Admin1234', 'admin123', 'Admin123', 'admin1234', 'Admin1234!', 'Password123'];

const rows = await query('SELECT password_hash FROM users WHERE email = ?', ['admin@seakunovel.com']);
const hash = rows[0].password_hash;
console.log('Full hash:', hash);

for (const pw of testPasswords) {
  const match = await bcrypt.compare(pw, hash);
  console.log(`"${pw}": ${match}`);
}
process.exit(0);
