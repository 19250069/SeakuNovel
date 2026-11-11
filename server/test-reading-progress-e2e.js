import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from './config/db.js';

dotenv.config();

async function createTokenFor(username = 'mayasari') {
  const users = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  if (!users || users.length === 0) throw new Error('User not found');
  const user = users[0];
  const jti = crypto.randomUUID();
  const payload = { id: user.id, username: user.username, email: user.email, role: user.role, jti };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  const sessionId = crypto.randomUUID();
  await query('INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [sessionId, user.id, jti, 'e2e-agent', '127.0.0.1']);
  return { token, user };
}

async function run() {
  try {
    const { token, user } = await createTokenFor();
    const api = axios.create({ baseURL: 'http://localhost:3001/api', headers: { Authorization: 'Bearer ' + token } });

    const novelsRes = await api.get('/novels', { params: { limit: 1 } });
    const novel = novelsRes.data.novels[0];

    // Post a progress update
    console.log('Posting progress...');
    await api.post(`/reading-progress/${novel.id}`, { chapter_id: novel.total_chapters ? null : null, progress_percent: 12.5 });

    // Wait a bit then call continue
    await new Promise(r => setTimeout(r, 300));
    const cont = await api.get('/reading-progress/continue');
    console.log('Continue entry:', cont.data);
    console.log('Reading progress e2e passed');
  } catch (err) {
    console.error('Reading progress e2e failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
