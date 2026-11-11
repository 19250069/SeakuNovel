import { Router } from 'express';
import { authenticateToken, requireAuthor } from '../middleware/auth.js';
import { getAuthorDashboard } from '../controllers/authorController.js';

const router = Router();

router.get('/dashboard', authenticateToken, requireAuthor, getAuthorDashboard);
router.get('/analytics', authenticateToken, requireAuthor, getAuthorDashboard);

export default router;
