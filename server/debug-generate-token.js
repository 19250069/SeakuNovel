import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from './config/db.js';

dotenv.config();

async function run() {
  const username = process.argv[2] || 'aryapratama';
  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  if (!rows || rows.length === 0) {
    console.error('User not found:', username);
    process.exit(1);
  }
  const user = rows[0];
  const jti = crypto.randomUUID();
  const payload = { id: user.id, username: user.username, email: user.email, role: user.role, jti };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

  // Insert session record so authenticateToken accepts this token
  try {
    const sessionId = crypto.randomUUID();
    await query('INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [sessionId, user.id, jti, 'debug-agent', '127.0.0.1']);
    console.log('Session inserted for user', user.username);
  } catch (err) {
    console.error('Failed to insert session:', err);
    process.exit(1);
  }

  console.log('TOKEN=' + token);
}

run().catch((err) => { console.error(err); process.exit(1); });
