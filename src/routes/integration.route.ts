import { Router } from 'express';
import {
  searchThirdPartyEvents,
  importThirdPartyEvent,
  getThirdPartyCategories,
  getTicketmasterEventDetails,
  getEventbriteEventDetails
} from '../controllers/integration.controller.js';
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

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    // Get user details
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    req.user = user;
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Public routes (no authentication required)
router.get('/search', searchThirdPartyEvents);
router.get('/categories', getThirdPartyCategories);
router.get('/ticketmaster/events/:event_id', getTicketmasterEventDetails);
router.get('/eventbrite/events/:event_id', getEventbriteEventDetails);

// Protected routes (authentication required)
router.use(authenticateToken);

// Import routes
router.post('/import', importThirdPartyEvent);

export default router;
