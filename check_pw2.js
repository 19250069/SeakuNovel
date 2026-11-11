import bcrypt from 'bcryptjs';
import { query } from './server/config/db.js';

// Check all seed users
const testAccounts = [
  { email: 'admin@seakunovel.com', pws: ['Admin1234', 'admin123', 'Admin123', 'SeakuAdmin123', 'admin@seaku123'] },
  { email: 'author@seakunovel.com', pws: ['Admin1234', 'author123', 'Author123', 'Password123', 'Author1234'] },
  { email: '123@123.com', pws: ['123', '123123', '123456', 'Pass123', 'Admin123'] },
];

for (const acc of testAccounts) {
  const rows = await query('SELECT password_hash FROM users WHERE email = ?', [acc.email]);
  if (!rows.length) { console.log(acc.email, 'NOT FOUND'); continue; }
  const hash = rows[0].password_hash;
  let found = false;
  for (const pw of acc.pws) {
    const match = await bcrypt.compare(pw, hash);
    if (match) { console.log(`MATCH: ${acc.email} -> "${pw}"`); found = true; break; }
  }
  if (!found) console.log(`NO MATCH for ${acc.email}, hash: ${hash.substring(0, 20)}`);
}
process.exit(0);
