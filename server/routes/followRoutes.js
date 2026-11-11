import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { toggleFollow, checkFollowStatus, getMyFollows } from '../controllers/followController.js';

const router = Router();

router.post('/toggle', authenticateToken, toggleFollow);
router.post('/', authenticateToken, toggleFollow);
router.get('/status', optionalAuth, checkFollowStatus);
router.get('/check', optionalAuth, checkFollowStatus);
router.get('/my', authenticateToken, getMyFollows);

export default router;
