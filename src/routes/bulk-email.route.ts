import { Router } from 'express';
import {
  createBulkEmailCampaignHandler,
  getAllCampaignsHandler,
  getCampaignHandler,
  cancelCampaignHandler
} from '../controllers/bulk-email.controller.js';
import { verifyAccessToken } from '../services/jwt.service.js';
import { findUserById } from '../repositories/user.repo.js';

const router = Router();

const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header required' });

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Invalid token - user not found' });

    req.user = user;
    req.userId = payload.sub;
    next();
  } catch (error: any) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.use(authenticateToken);
router.use(requireAdmin);

router.post('/campaigns', createBulkEmailCampaignHandler);
router.get('/campaigns', getAllCampaignsHandler);
router.get('/campaigns/:campaign_id', getCampaignHandler);
router.put('/campaigns/:campaign_id/cancel', cancelCampaignHandler);

export default router;

