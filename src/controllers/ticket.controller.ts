import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { verifyAccessToken } from '../services/jwt.service';

/**
 * @openapi
 * /api/v1/tickets/purchase:
 *   post:
 *     summary: Purchase tickets for an event
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_id
 *               - ticket_type_id
 *               - quantity
 *               - attendee_details
 *             properties:
 *               event_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               ticket_type_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               attendee_details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - email
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *                     seat_number:
 *                       type: string
 *                       example: "A12"
 *               payment_method:
 *                 type: string
 *                 example: "credit_card"
 *               payment_reference:
 *                 type: string
 *                 example: "pay_1234567890"
 *               notes:
 *                 type: string
 *                 example: "Special dietary requirements"
 *     responses:
 *       200:
 *         description: Tickets purchased successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function purchaseTickets(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const purchaseData = {
      ...req.body,
      user_id: payload.sub
    };

    const result = await ticketService.purchaseTickets(purchaseData);
    
    if (!result.success) {
      return res.status(400).json({
        message: result.message,
        error: result.error
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error purchasing tickets:', error);
    res.status(500).json({ message: 'Failed to purchase tickets' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/bookings/{booking_id}/confirm:
 *   post:
 *     summary: Confirm payment and activate tickets
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: booking_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_reference:
 *                 type: string
 *                 example: "pay_1234567890"
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function confirmPayment(req: Request, res: Response) {
  try {
    const { booking_id } = req.params;
    const { payment_reference } = req.body;

    const confirmed = await ticketService.confirmPayment(booking_id, payment_reference);
    
    if (!confirmed) {
      return res.status(400).json({ message: 'Failed to confirm payment' });
    }

    res.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/bookings/{booking_id}/cancel:
 *   post:
 *     summary: Cancel booking and refund tickets
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: booking_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Change of plans"
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function cancelBooking(req: Request, res: Response) {
  try {
    const { booking_id } = req.params;
    const { reason } = req.body;

    const cancelled = await ticketService.cancelBooking(booking_id, reason);
    
    if (!cancelled) {
      return res.status(400).json({ message: 'Failed to cancel booking' });
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/validate:
 *   post:
 *     summary: Validate ticket for event entry
 *     tags:
 *       - Tickets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticket_number
 *               - event_id
 *             properties:
 *               ticket_number:
 *                 type: string
 *                 example: "T1703123456789"
 *               event_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Ticket validation result
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

export async function validateTicket(req: Request, res: Response) {
  try {
    const { ticket_number, event_id } = req.body;

    if (!ticket_number || !event_id) {
      return res.status(400).json({ message: 'Ticket number and event ID are required' });
    }

    const validation = await ticketService.validateTicketForEntry(ticket_number, event_id);
    res.json(validation);
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ message: 'Failed to validate ticket' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/{ticket_id}/use:
 *   post:
 *     summary: Mark ticket as used for event entry
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticket_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket marked as used successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function useTicket(req: Request, res: Response) {
  try {
    const { ticket_id } = req.params;

    const used = await ticketService.useTicket(ticket_id);
    
    if (!used) {
      return res.status(400).json({ message: 'Failed to mark ticket as used' });
    }

    res.json({ message: 'Ticket marked as used successfully' });
  } catch (error) {
    console.error('Error using ticket:', error);
    res.status(500).json({ message: 'Failed to use ticket' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/user:
 *   get:
 *     summary: Get user's tickets
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User tickets retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getUserTickets(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const tickets = await ticketService.getUserTickets(payload.sub);
    res.json(tickets);
  } catch (error) {
    console.error('Error getting user tickets:', error);
    res.status(500).json({ message: 'Failed to get user tickets' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/bookings/user:
 *   get:
 *     summary: Get user's bookings
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, refunded]
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getUserBookings(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const status = req.query.status as string;
    const bookings = await ticketService.getUserBookings(payload.sub, status);
    res.json(bookings);
  } catch (error) {
    console.error('Error getting user bookings:', error);
    res.status(500).json({ message: 'Failed to get user bookings' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/bookings/{booking_id}:
 *   get:
 *     summary: Get booking details
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: booking_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getBookingDetails(req: Request, res: Response) {
  try {
    const { booking_id } = req.params;
    const bookingDetails = await ticketService.getBookingDetails(booking_id);
    
    if (!bookingDetails) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(bookingDetails);
  } catch (error) {
    console.error('Error getting booking details:', error);
    res.status(500).json({ message: 'Failed to get booking details' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/{ticket_id}:
 *   get:
 *     summary: Get ticket details
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticket_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getTicketDetails(req: Request, res: Response) {
  try {
    const { ticket_id } = req.params;
    const ticketDetails = await ticketService.getTicketDetails(ticket_id);
    
    if (!ticketDetails) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticketDetails);
  } catch (error) {
    console.error('Error getting ticket details:', error);
    res.status(500).json({ message: 'Failed to get ticket details' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/statistics/overview:
 *   get:
 *     summary: Get booking and ticket statistics
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *         description: Filter statistics by event ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getBookingStatistics(req: Request, res: Response) {
  try {
    const { event_id } = req.query;
    const statistics = await ticketService.getBookingStatistics(event_id as string);
    
    if (!statistics) {
      return res.status(404).json({ message: 'Statistics not found' });
    }

    res.json(statistics);
  } catch (error) {
    console.error('Error getting booking statistics:', error);
    res.status(500).json({ message: 'Failed to get booking statistics' });
  }
}

/**
 * @openapi
 * /api/v1/tickets/qr/{ticket_number}:
 *   get:
 *     summary: Get ticket QR code and details
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticket_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket number
 *     responses:
 *       200:
 *         description: Ticket QR code and details retrieved successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getTicketQRCode(req: Request, res: Response) {
  try {
    const { ticket_number } = req.params;
    const ticketDetails = await ticketService.getTicketDetails(ticket_number);
    
    if (!ticketDetails) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Return ticket details with QR code
    const response = {
      ticket_id: ticketDetails.ticket_id,
      ticket_number: ticketDetails.ticket_number,
      attendee_name: ticketDetails.attendee_name,
      attendee_email: ticketDetails.attendee_email,
      event: {
        title: ticketDetails.event_title,
        event_date: ticketDetails.event_date,
        venue_name: ticketDetails.venue_name,
        venue_address: ticketDetails.venue_address
      },
      qr_code: ticketDetails.qr_code_data,
      is_used: ticketDetails.is_used,
      used_at: ticketDetails.used_at
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting ticket QR code:', error);
    res.status(500).json({ message: 'Failed to get ticket QR code' });
  }
}
