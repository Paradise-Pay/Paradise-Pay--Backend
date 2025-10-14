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

// Middleware to verify JWT token and attach user info
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    let token: string;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }

    const payload = verifyAccessToken(token) as any;
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    (req as any).user = user;
    (req as any).userId = payload.sub;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is organizer or admin
const requireOrganizerRole = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'Organizer' && req.user.role !== 'Admin')) {
    return res.status(403).json({ message: 'Organizer role required' });
  }
  next();
};

// Public routes (no authentication required)
router.get('/search', searchEvents);
router.get('/featured', getFeaturedEvents);
router.get('/categories', getEventCategories);
router.get('/:event_id', getEventById);
router.get('/:event_id/ticket-types', getEventTicketTypes);

// Protected routes (authentication required)
router.use(authenticateToken);

// User routes
router.post('/:event_id/favorites', addToFavorites);
router.delete('/:event_id/favorites', removeFromFavorites);
router.get('/favorites/list', getUserFavorites);

// Organizer routes
router.post('/', requireOrganizerRole, createEvent);
router.put('/:event_id', requireOrganizerRole, updateEvent);
router.delete('/:event_id', requireOrganizerRole, deleteEvent);
router.post('/:event_id/ticket-types', requireOrganizerRole, createTicketType);
router.get('/organizer/events', requireOrganizerRole, getOrganizerEvents);
router.get('/:event_id/analytics', requireOrganizerRole, getEventAnalytics);

export default router;
