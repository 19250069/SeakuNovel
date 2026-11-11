import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createReportController, listReportsController, getReportsForTargetController, removeReportController } from '../controllers/reportController.js';

const router = Router();

router.post('/', authenticateToken, createReportController);
router.get('/', authenticateToken, listReportsController);
router.get('/:targetType/:targetId', authenticateToken, getReportsForTargetController);
router.delete('/:id', authenticateToken, removeReportController);

export default router;
