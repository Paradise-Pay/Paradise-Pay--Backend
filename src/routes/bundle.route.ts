/**
 * @openapi
 * /api/v1/bundles:
 *   post:
 *     summary: Create a new bundle
 *     tags:
 *       - Bundles
 *   get:
 *     summary: Get all bundles
 *     tags:
 *       - Bundles
 */

import { Router } from 'express';
import {
  createBundleHandler,
  getBundlesHandler,
  getBundleHandler,
  updateBundleHandler,
  deleteBundleHandler,
  addEventToBundleHandler,
  removeEventFromBundleHandler
} from '../controllers/bundle.controller.js';
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

router.use(authenticateToken);

router.post('/', createBundleHandler);
router.get('/', getBundlesHandler);
router.get('/:bundle_id', getBundleHandler);
router.put('/:bundle_id', updateBundleHandler);
router.delete('/:bundle_id', deleteBundleHandler);
router.post('/:bundle_id/events', addEventToBundleHandler);
router.delete('/:bundle_id/events/:event_id', removeEventFromBundleHandler);

export default router;

