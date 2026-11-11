import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { generateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { notifyPasswordChanged } from '../models/notification.js';

export const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('display_name').trim().notEmpty().withMessage('Display name is required'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, display_name } = req.body;

  try {
    const existingUser = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await query(
      'INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, passwordHash, display_name]
    );

    const user = { id: userId, username, email, display_name, role: 'reader' };
    const { token, jti } = generateToken(user);

    // Create server-side session record for the token
    try {
      const sessionId = crypto.randomUUID();
      const userAgent = req.headers['user-agent'] || null;
      const ip = req.ip || req.connection?.remoteAddress || null;
      await query(
        'INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
        [sessionId, userId, jti, userAgent, ip]
      );
    } catch (err) {
      console.error('Failed to create session record:', err);
    }

    // If configured, set an HttpOnly cookie for the session token (production)
    if (process.env.USE_HTTP_COOKIE === 'true') {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      };
      res.cookie('seaku_token', token, cookieOptions);
    }

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, username, email, display_name, role: 'reader' },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { token, jti } = generateToken(user);

    // Create session record
    try {
      const sessionId = crypto.randomUUID();
      const userAgent = req.headers['user-agent'] || null;
      const ip = req.ip || req.connection?.remoteAddress || null;
      await query(
        'INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
        [sessionId, user.id, jti, userAgent, ip]
      );
    } catch (err) {
      console.error('Failed to create session record:', err);
    }

    if (process.env.USE_HTTP_COOKIE === 'true') {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      };
      res.cookie('seaku_token', token, cookieOptions);
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (_req, res) => {
  // When using server-side sessions the middleware will have set req.user
  try {
    const cookieToken = _req.headers.cookie ? (function getToken() {
      const m = (_req.headers.cookie || '').split(';').map(p => p.trim());
      for (const p of m) { if (p.startsWith('seaku_token=')) return decodeURIComponent(p.split('=')[1]); }
      return null;
    })() : null;

    // If req.user is present (protected route), remove session by jti
    if (_req.user && _req.user.jti) {
      query('DELETE FROM sessions WHERE jti = ? AND user_id = ?', [_req.user.jti, _req.user.id]).catch(() => {});
    } else if (cookieToken) {
      try {
        const decoded = require('jsonwebtoken').verify(cookieToken, process.env.JWT_SECRET);
        if (decoded && decoded.jti) {
          query('DELETE FROM sessions WHERE jti = ? AND user_id = ?', [decoded.jti, decoded.id]).catch(() => {});
        }
      } catch (err) {
        // ignore
      }
    }

    res.clearCookie('seaku_token', { path: '/' });
  } catch (err) {
    // ignore
  }
  res.json({ message: 'Logout successful' });
};

export const getProfile = async (req, res) => {
  try {
    const users = await query('SELECT id, username, email, display_name, avatar_url, bio, role, created_at FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function resolveAvatarPath(avatarUrl) {
  if (!avatarUrl) return null;
  return path.normalize(avatarUrl.replace(/^\//, ''));
}

async function getProfileStats(userId) {
  const [novelRows] = await query('SELECT COUNT(*) AS total_novels FROM novels WHERE author_id = ? AND status = ?', [userId, 'published']);
  const [chapterRows] = await query(
    `SELECT COUNT(*) AS total_chapters
     FROM chapters c
     JOIN novels n ON c.novel_id = n.id
     WHERE n.author_id = ? AND n.status = ?`,
    [userId, 'published']
  );
  const [viewRows] = await query('SELECT COALESCE(SUM(total_views), 0) AS total_views FROM novels WHERE author_id = ? AND status = ?', [userId, 'published']);
  const [bookmarkRows] = await query(
    `SELECT COUNT(*) AS total_bookmarks
     FROM bookmarks b
     JOIN novels n ON b.novel_id = n.id
     WHERE n.author_id = ?`,
    [userId]
  );

  let totalFollowers = 0;
  try {
    const [followerRows] = await query(
      `SELECT COUNT(*) AS total_followers FROM follows WHERE target_type = 'author' AND target_id = ?`,
      [userId]
    );
    totalFollowers = parseInt(followerRows?.total_followers || 0, 10);
  } catch (_e) {
    totalFollowers = 0;
  }

  return {
    total_novels: parseInt(novelRows.total_novels, 10) || 0,
    total_chapters: parseInt(chapterRows.total_chapters, 10) || 0,
    total_views: parseInt(viewRows.total_views, 10) || 0,
    total_bookmarks: parseInt(bookmarkRows.total_bookmarks, 10) || 0,
    total_followers: totalFollowers,
  };
}

async function buildProfilePayload(userId, includeEmail = false) {
  const users = await query(
    `SELECT id, username${includeEmail ? ', email' : ''}, display_name, avatar_url, bio, role, created_at FROM users WHERE id = ?`,
    [userId]
  );

  if (users.length === 0) {
    return null;
  }

  const profile = users[0];
  const stats = await getProfileStats(profile.id);
  const novels = await query(
    'SELECT id, title, slug, cover_url, status, total_views, created_at FROM novels WHERE author_id = ? ORDER BY created_at DESC LIMIT 12',
    [profile.id]
  );

  return { profile: { ...profile, ...stats }, novels };
}

export const getMyProfile = async (req, res) => {
  try {
    const payload = await buildProfilePayload(req.user.id, true);
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(payload);
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { display_name, username, bio } = req.body;
    const updates = [];
    const params = [];

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    if (req.file) {
      const currentUsers = await query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
      const currentAvatar = currentUsers[0]?.avatar_url;
      const oldPath = resolveAvatarPath(currentAvatar);
      if (oldPath && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      updates.push('avatar_url = ?');
      params.push(`/uploads/${req.file.filename}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No profile changes provided' });
    }

    params.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const payload = await buildProfilePayload(req.user.id, true);
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Avatar image is required' });
    }

    const currentUsers = await query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
    const currentAvatar = currentUsers[0]?.avatar_url;
    const oldPath = resolveAvatarPath(currentAvatar);
    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    await query('UPDATE users SET avatar_url = ? WHERE id = ?', [`/uploads/${req.file.filename}`, req.user.id]);
    const payload = await buildProfilePayload(req.user.id, true);
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const payload = await buildProfilePayload(req.params.id, false);
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }

    const publicNovels = payload.novels.filter((novel) => novel.status === 'published');
    res.json({ profile: payload.profile, novels: publicNovels });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
    }

    if (new_password.length < 8 || !/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({
        error: 'Password baru minimal 8 karakter, mengandung setidaknya 1 huruf besar dan 1 angka',
      });
    }

    const rows = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const isValid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Password saat ini tidak cocok' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    notifyPasswordChanged({ userId: req.user.id }).catch(console.error);

    res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const becomeAuthor = async (req, res) => {
  try {
    const rows = await query('SELECT id, username, email, display_name, avatar_url, bio, role FROM users WHERE id = ?', [req.user.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const user = rows[0];
    if (user.role === 'reader') {
      await query("UPDATE users SET role = 'author' WHERE id = ?", [user.id]);
      user.role = 'author';
    }

    const { token, jti } = generateToken(user);

    // Update sessions
    try {
      const sessionId = crypto.randomUUID();
      const userAgent = req.headers['user-agent'] || null;
      const ip = req.ip || req.connection?.remoteAddress || null;
      await query(
        'INSERT INTO sessions (id, user_id, jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
        [sessionId, user.id, jti, userAgent, ip]
      );
    } catch (err) {
      console.error('Failed to create session on role upgrade:', err);
    }

    if (process.env.USE_HTTP_COOKIE === 'true') {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      };
      res.cookie('seaku_token', token, cookieOptions);
    }

    res.json({
      message: 'Selamat! Akun Anda kini terdaftar sebagai Penulis.',
      token,
      user,
    });
  } catch (error) {
    console.error('Become author error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { register, login, logout, getProfile, getMyProfile, updateProfile, updateAvatar, getUserProfile, changePassword, becomeAuthor };