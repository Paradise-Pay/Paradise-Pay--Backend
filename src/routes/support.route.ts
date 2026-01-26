import { Router } from 'express';
import {
  createTicketHandler,
  getTicketsHandler,
  getTicketHandler,
  updateTicketHandler,
  addResponseHandler
} from '../controllers/support.controller.js';
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

router.post('/tickets', createTicketHandler);
router.get('/tickets', getTicketsHandler);
router.get('/tickets/:ticket_id', getTicketHandler);
router.put('/tickets/:ticket_id', updateTicketHandler);
router.post('/tickets/:ticket_id/responses', addResponseHandler);

export default router;

