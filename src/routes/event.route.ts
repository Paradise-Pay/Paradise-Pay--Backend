import { Router } from 'express';
import {
  searchEvents,
  getFeaturedEvents,
  getEventCategories,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTicketTypes,
  createTicketType,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  getOrganizerEvents,
  getEventAnalytics
} from '../controllers/event.controller.js';
import { verifyAccessToken } from '../services/jwt.service.js';
import { findUserById } from '../repositories/user.repo.js';

const router = Router();

const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header required' });

    let token: string = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    const payload = verifyAccessToken(token) as any;
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Invalid token - user not found' });

    (req as any).user = user;
    (req as any).userId = payload.sub;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireOrganizerRole = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'Organizer' && req.user.role !== 'Admin')) {
    return res.status(403).json({ message: 'Organizer role required' });
  }
  next();
};

router.get('/organizer', authenticateToken, requireOrganizerRole, getOrganizerEvents);
router.get('/search', searchEvents);
router.get('/featured', getFeaturedEvents);
router.get('/categories', getEventCategories);
router.get('/favorites/list', authenticateToken, getUserFavorites);
router.get('/:event_id', getEventById);
router.get('/:event_id/ticket-types', getEventTicketTypes);

// Protected dynamic routes
router.use(authenticateToken);
router.post('/:event_id/favorites', addToFavorites);
router.delete('/:event_id/favorites', removeFromFavorites);

// Organizer dynamic routes
router.post('/', requireOrganizerRole, createEvent);
router.put('/:event_id', requireOrganizerRole, updateEvent);
router.delete('/:event_id', requireOrganizerRole, deleteEvent);
router.post('/:event_id/ticket-types', requireOrganizerRole, createTicketType);
router.get('/:event_id/analytics', requireOrganizerRole, getEventAnalytics);

export default router;