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

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function run() {
  try {
    const { token, user } = await createTokenFor();
    const api = axios.create({ baseURL: 'http://localhost:3001/api', headers: { Authorization: 'Bearer ' + token } });

    const novelsRes = await api.get('/novels', { params: { limit: 1 } });
    const novel = novelsRes.data.novels[0];

    const payload = { novel_id: novel.id, user_id: user.id, rating: 5, title: 'E2E Test Review', content: 'This is a test review from automated e2e.' };
    console.log('Creating review for novel', novel.id);
    let createRes;
    try {
      createRes = await api.post('/reviews', payload);
      console.log('Create response:', createRes.data);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        console.log('Review already exists, continuing to verification');
      } else {
        throw err;
      }
    }

    await wait(300);
    const list = await api.get(`/reviews/novel/${novel.id}`);
    const found = (list.data.reviews || []).some(r => r.title === payload.title && r.user_id === user.id);
    console.log('Review present in list:', found);
    if (!found) throw new Error('Created review not found');

    console.log('E2E reviews flow succeeded');
  } catch (err) {
    console.error('E2E reviews failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
