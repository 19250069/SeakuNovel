import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getNovels,
  updateNovelStatus,
  deleteNovel,
  getAdminReports,
  updateReport,
  deleteReportAction,
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, requireRole(['admin']));

// Platform Statistics
router.get('/stats', getStats);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Novel Moderation
router.get('/novels', getNovels);
router.put('/novels/:id/status', updateNovelStatus);
router.delete('/novels/:id', deleteNovel);

// Content Reports & Moderation
router.get('/reports', getAdminReports);
router.put('/reports/:id', updateReport);
router.delete('/reports/:id', deleteReportAction);

export default router;
