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
  const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role, jti }, process.env.JWT_SECRET, { expiresIn: '24h' });
  await query('INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [crypto.randomUUID(), user.id, jti, 'e2e-agent', '127.0.0.1']);
  return { token, user };
}

async function run() {
  try {
    const { token, user } = await createTokenFor();
    const api = axios.create({ baseURL: 'http://localhost:3001/api', headers: { Authorization: 'Bearer ' + token } });
    const novelsRes = await api.get('/novels', { params: { limit: 1 } });
    const novel = novelsRes.data.novels[0];

    console.log('Submitting report for novel', novel.id);
    const res = await api.post('/reports', { target_type: 'novel', target_id: novel.id, reason: 'spam', details: 'Automated test report' });
    console.log('Report response:', res.data);

    // Now verify as admin
    const adminRows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', ['admin']);
    const admin = adminRows[0];
    const adminJti = crypto.randomUUID();
    const adminToken = jwt.sign({ id: admin.id, username: admin.username, email: admin.email, role: admin.role, jti: adminJti }, process.env.JWT_SECRET, { expiresIn: '24h' });
    await query('INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [crypto.randomUUID(), admin.id, adminJti, 'e2e-agent', '127.0.0.1']);

    const adminApi = axios.create({ baseURL: 'http://localhost:3001/api', headers: { Authorization: 'Bearer ' + adminToken } });
    const list = await adminApi.get('/reports', { params: { limit: 10 } });
    console.log('Admin reports count:', list.data.pagination.total);
    const found = (list.data.reports || []).some(r => r.target_id === novel.id && r.reason === 'spam');
    console.log('Report found in admin list:', found);
    if (!found) throw new Error('Report missing in admin list');

    console.log('Report e2e passed');
  } catch (err) {
    console.error('Report e2e failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
