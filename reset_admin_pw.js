import bcrypt from 'bcryptjs';
import { query } from './server/config/db.js';

// Reset admin password to 'Admin123' (meets complexity: uppercase + number + 8 chars)
const newHash = await bcrypt.hash('Admin123', 10);
await query("UPDATE users SET password_hash = ? WHERE email = 'admin@seakunovel.com'", [newHash]);
console.log('Admin password reset to: Admin123');

// Verify
const rows = await query("SELECT password_hash FROM users WHERE email = 'admin@seakunovel.com'");
const ok = await bcrypt.compare('Admin123', rows[0].password_hash);
console.log('Verify:', ok);
process.exit(0);
