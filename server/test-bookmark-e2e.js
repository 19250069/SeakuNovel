import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from './config/db.js';

dotenv.config();

async function createTokenFor(username = 'aryapratama') {
  const users = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  if (!users || users.length === 0) throw new Error('User not found');
  const user = users[0];
  const jti = crypto.randomUUID();
  const payload = { id: user.id, username: user.username, email: user.email, role: user.role, jti };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  const sessionId = crypto.randomUUID();
  await query('INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [sessionId, user.id, jti, 'e2e-agent', '127.0.0.1']);
  return token;
}

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function run() {
  try {
    const token = await createTokenFor();
    const api = axios.create({ baseURL: 'http://localhost:3001/api', headers: { Authorization: 'Bearer ' + token } });

    console.log('Fetching a novel...');
    const novelsRes = await api.get('/novels', { params: { limit: 1 } });
    const novel = novelsRes.data.novels[0];
    console.log('Using novel', novel.id);

    console.log('Checking status...');
    const statusRes = await api.get(`/bookmarks/${novel.id}/status`);
    console.log('Initial status:', statusRes.data);

    console.log('Toggling bookmark...');
    await wait(300);
    const toggleRes = await api.post(`/bookmarks/${novel.id}/toggle`);
    console.log('Toggle result:', toggleRes.data);

    console.log('Verifying status...');
    await wait(300);
    const status2 = await api.get(`/bookmarks/${novel.id}/status`);
    console.log('Status after toggle:', status2.data);

    console.log('Removing bookmark if present...');
    if (status2.data.bookmarked) {
      await wait(300);
      const rem = await api.delete(`/bookmarks/${novel.id}`);
      console.log('Remove result:', rem.data);
    }

    console.log('Final check...');
    const final = await api.get(`/bookmarks/${novel.id}/status`);
    console.log('Final status:', final.data);

    console.log('E2E bookmark flow completed successfully');
  } catch (err) {
    console.error('E2E failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
