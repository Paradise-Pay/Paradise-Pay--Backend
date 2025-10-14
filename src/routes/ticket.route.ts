import { Router } from 'express';
import {
  purchaseTickets,
  confirmPayment,
  cancelBooking,
  validateTicket,
  useTicket,
  getUserTickets,
  getUserBookings,
  getBookingDetails,
  getTicketDetails,
  getBookingStatistics,
  getTicketQRCode
} from '../controllers/ticket.controller.js';
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

// Middleware to check if user is organizer or admin
const requireOrganizerRole = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'Organizer' && req.user.role !== 'Admin')) {
    return res.status(403).json({ message: 'Organizer role required' });
  }
  next();
};

// Public routes (no authentication required)
router.post('/validate', validateTicket);

// Protected routes (authentication required)
router.use(authenticateToken);

// User routes
router.post('/purchase', purchaseTickets);
router.post('/bookings/:booking_id/confirm', confirmPayment);
router.post('/bookings/:booking_id/cancel', cancelBooking);
router.get('/user/tickets', getUserTickets);
router.get('/bookings/user', getUserBookings);
router.get('/bookings/:booking_id', getBookingDetails);
router.get('/:ticket_id', getTicketDetails);
router.get('/qr/:ticket_number', getTicketQRCode);

// Organizer/Admin routes
router.post('/:ticket_id/use', requireOrganizerRole, useTicket);
router.get('/statistics/overview', requireOrganizerRole, getBookingStatistics);

export default router;
