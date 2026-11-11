import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db.js';

function extractTokenFromCookieHeader(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) {
      return decodeURIComponent(p.split('=')[1]);
    }
  }
  return null;
}

export async function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback to cookie token if present
  if (!token) {
    const cookieToken = extractTokenFromCookieHeader(req.headers.cookie, 'seaku_token');
    if (cookieToken) token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If sessions table is present, validate jti
    if (decoded.jti) {
      const rows = await query('SELECT id FROM sessions WHERE jti = ? AND user_id = ? AND expires_at > NOW()', [decoded.jti, decoded.id]);
      if (!rows || rows.length === 0) {
        return res.status(403).json({ error: 'Session not found or expired' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Like authenticateToken but never rejects the request. If a valid token is
// present, req.user is populated; otherwise the request continues anonymously.
// Used by public read endpoints that need to allow owners to see their drafts.
export async function optionalAuth(req, _res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    const cookieToken = extractTokenFromCookieHeader(req.headers.cookie, 'seaku_token');
    if (cookieToken) token = cookieToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Invalid token: proceed as anonymous rather than rejecting.
    }
  }
  next();
}

export function generateToken(user) {
  const jti = crypto.randomUUID();
  const payload = { id: user.id, username: user.username, email: user.email, role: user.role, jti };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  return { token, jti };
}

export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireAuthor = requireRole(['author', 'admin']);

export default authenticateToken;