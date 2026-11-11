import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMyProfile, changePassword, becomeAuthor, registerValidation, loginValidation } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 FAILED requests per windowMs
  skipSuccessfulRequests: true, // Only failed attempts count
  message: { error: 'Terlalu banyak percobaan login/register, silakan coba lagi setelah 15 menit.' }
});

const router = Router();

// [SECURITY] Rate limiter: max 10 FAILED attempts per IP per 15 min.
// skipSuccessfulRequests=true: successful logins don't count toward the limit.
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMyProfile);
router.get('/profile', authenticateToken, getMyProfile);
router.put('/change-password', authenticateToken, changePassword);

// [SECURITY] Limit role escalation requests — max 3 per IP per day.
const becomeAuthorLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: { error: 'Terlalu banyak permintaan. Coba lagi besok.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/become-author', authenticateToken, becomeAuthorLimiter, becomeAuthor);

export default router;