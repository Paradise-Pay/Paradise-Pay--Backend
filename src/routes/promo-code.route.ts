import { Router } from 'express';
import {
  createPromoCodeHandler,
  getAllPromoCodesHandler,
  validatePromoCodeHandler,
  updatePromoCodeHandler,
  deletePromoCodeHandler
} from '../controllers/promo-code.controller.js';
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

router.post('/', createPromoCodeHandler);
router.get('/', getAllPromoCodesHandler);
router.post('/validate', validatePromoCodeHandler);
router.put('/:promo_code_id', updatePromoCodeHandler);
router.delete('/:promo_code_id', deletePromoCodeHandler);

export default router;

