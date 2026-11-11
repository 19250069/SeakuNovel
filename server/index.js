import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import novelRoutes from './routes/novelRoutes.js';
import chapterRoutes from './routes/chapterRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import readingProgressRoutes from './routes/readingProgressRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import upload from './config/upload.js';
import cookieParser from 'cookie-parser';
import { authenticateToken } from './middleware/auth.js';
import { query } from './config/db.js';
import { getMyProfile, updateProfile, updateAvatar, getUserProfile } from './controllers/authController.js';

dotenv.config();

const app = express();

// CORS must be the absolute first middleware to handle OPTIONS preflight
// before any other middleware (body parser, helmet, etc.)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Allow localhost in all environments for local development
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }

    // [SECURITY] Tunnel origins (ngrok, pinggy) only in non-production.
    // In production, ALL traffic must come from the registered CORS_ORIGIN.
    if (process.env.NODE_ENV !== 'production') {
      if (
        origin.endsWith('.ngrok-free.app') ||
        origin.endsWith('.pinggy.link')
      ) {
        return callback(null, true);
      }
    }

    // Production CORS — exact match only
    const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    if (origin === allowedOrigin) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parser
app.use(express.json());

// Cookie parser needed for HttpOnly cookie session tokens
app.use(cookieParser());

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Needed for uploaded images
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // [SECURITY] unsafe-inline only in dev (needed for Vite HMR).
      // Production Vite builds produce external bundle files — no inline scripts needed.
      scriptSrc: process.env.NODE_ENV === 'production'
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
      connectSrc: ["'self'", "http://localhost:5173", "http://127.0.0.1:3001", "https://*.ngrok-free.app", "https://*.pinggy.link"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
}));

// General API rate limiter (100 requests per minute)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased from 10 to 100 to prevent locking out legitimate users easily
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

import followRoutes from './routes/followRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/reading-progress', readingProgressRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/author', authorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);



// Profile routes (mounted at /api for frontend compatibility)
app.get('/api/profile/me', authenticateToken, getMyProfile);
app.put('/api/profile', authenticateToken, upload.single('avatar'), updateProfile);
app.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), updateAvatar);
app.get('/api/users/:id/profile', getUserProfile);

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  // Multer file type error
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
  });
});

const PORT = process.env.PORT || 3001;

import { ensureAllTables } from './config/ensureSchema.js';
import { startScheduler } from './workers/scheduler.js';

(async () => {
  await ensureAllTables();
  startScheduler();
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`SeakuNovel API server running on port ${PORT}`);
  });
})();


