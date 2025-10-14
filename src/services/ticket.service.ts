import { v4 as uuidv4 } from 'uuid';
import {
  createEventBooking,
  getBookingById,
  getBookingWithDetails,
  getUserBookings,
  updateBookingStatus,
  updateBookingPayment,
  createTicket,
  getTicketById,
  getTicketWithDetails,
  getTicketsByBooking,
  getUserTickets,
  markTicketAsUsed,
  validateTicketForEntry,
  getBookingStats,
  getTicketStats,
  TicketPurchaseData
} from '../repositories/ticket.repo.js';
import { getTicketTypesByEvent, updateTicketTypeAvailability } from '../repositories/event.repo.js';
import { qrService } from './qr.service.js';
import { sendEmail } from './email.service.js';

export interface PurchaseTicketRequest {
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  attendee_details: Array<{
    name: string;
    email: string;
    phone?: string;
    seat_number?: string;
  }>;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}

export interface PurchaseTicketResponse {
  success: boolean;
  booking_id?: string;
  booking_reference?: string;
  tickets?: Array<{
    ticket_id: string;
    ticket_number: string;
    qr_code: string;
    attendee_name: string;
    attendee_email: string;
  }>;
  total_amount?: number;
  currency?: string;
  message?: string;
  error?: string;
}

export interface TicketValidationResponse {
  valid: boolean;
  ticket?: any;
  event?: any;
  message: string;
  error?: string;
}

class TicketService {
  /**
   * Purchase tickets for an event
   */
  async purchaseTickets(purchaseData: PurchaseTicketRequest): Promise<PurchaseTicketResponse> {
    try {
      const { user_id, event_id, ticket_type_id, quantity, attendee_details } = purchaseData;

      // Validate input
      if (!attendee_details || attendee_details.length !== quantity) {
        return {
          success: false,
          message: 'Attendee details must match quantity',
          error: 'INVALID_ATTENDEE_DETAILS'
        };
      }

      // Get ticket type information
      const ticketTypes = await getTicketTypesByEvent(event_id);
      const ticketType = ticketTypes.find(tt => tt.ticket_type_id === ticket_type_id);

      if (!ticketType) {
        return {
          success: false,
          message: 'Ticket type not found',
          error: 'TICKET_TYPE_NOT_FOUND'
        };
      }

      if (!ticketType.is_active) {
        return {
          success: false,
          message: 'Ticket type is not available',
          error: 'TICKET_TYPE_INACTIVE'
        };
      }

      // Check availability
      const availableTickets = ticketType.available_quantity - ticketType.sold_quantity;
      if (availableTickets < quantity) {
        return {
          success: false,
          message: `Only ${availableTickets} tickets available`,
          error: 'INSUFFICIENT_TICKETS'
        };
      }

      // Check sales date restrictions
      const now = new Date();
      if (ticketType.sales_start_date && now < ticketType.sales_start_date) {
        return {
          success: false,
          message: 'Ticket sales have not started yet',
          error: 'SALES_NOT_STARTED'
        };
      }

      if (ticketType.sales_end_date && now > ticketType.sales_end_date) {
        return {
          success: false,
          message: 'Ticket sales have ended',
          error: 'SALES_ENDED'
        };
      }

      // Calculate total amount
      const total_amount = ticketType.price * quantity;

      // Create booking
      const booking = await createEventBooking({
        user_id,
        event_id,
        ticket_type_id,
        quantity,
        total_amount,
        currency: ticketType.currency,
        payment_method: purchaseData.payment_method,
        payment_reference: purchaseData.payment_reference,
        notes: purchaseData.notes
      });

      // Generate tickets with QR codes
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const attendee = attendee_details[i];
        
        // Generate QR code for ticket
        const { qrData, qrCodeBase64 } = await qrService.generateTicketQRCode({
          ticket_id: uuidv4(),
          ticket_number: `T${Date.now()}${Math.floor(Math.random() * 10000)}`,
          event_id,
          user_id,
          attendee_name: attendee.name,
          attendee_email: attendee.email
        });

        // Create ticket in database
        const ticket = await createTicket({
          booking_id: booking.booking_id,
          user_id,
          event_id,
          ticket_type_id,
          attendee_name: attendee.name,
          attendee_email: attendee.email,
          attendee_phone: attendee.phone,
          qr_code: qrData.ticket_number,
          qr_code_data: qrCodeBase64,
          seat_number: attendee.seat_number
        });

        tickets.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          qr_code: qrCodeBase64,
          attendee_name: attendee.name,
          attendee_email: attendee.email
        });
      }

      // Update ticket type availability
      await updateTicketTypeAvailability(ticket_type_id, quantity);

      // Send confirmation email
      await this.sendTicketConfirmationEmail(booking.booking_id, tickets);

      return {
        success: true,
        booking_id: booking.booking_id,
        booking_reference: booking.booking_reference,
        tickets,
        total_amount,
        currency: ticketType.currency,
        message: 'Tickets purchased successfully'
      };

    } catch (error) {
      console.error('Error purchasing tickets:', error);
      return {
        success: false,
        message: 'Failed to purchase tickets',
        error: 'PURCHASE_FAILED'
      };
    }
  }

  /**
   * Confirm payment and activate tickets
   */
  async confirmPayment(booking_id: string, payment_reference?: string): Promise<boolean> {
    try {
      const booking = await getBookingById(booking_id);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update booking status
      await updateBookingStatus(booking_id, 'confirmed', 'paid');
      
      if (payment_reference) {
        await updateBookingPayment(booking_id, 'paid', payment_reference);
      }

      // Send ticket details email
      const tickets = await getTicketsByBooking(booking_id);
      await this.sendTicketDetailsEmail(booking_id, tickets);

      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  /**
   * Cancel booking and refund tickets
   */
  async cancelBooking(booking_id: string, reason?: string): Promise<boolean> {
    try {
      const booking = await getBookingById(booking_id);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update booking status
      await updateBookingStatus(booking_id, 'cancelled', 'refunded');

      // Refund tickets (reduce sold quantity)
      const tickets = await getTicketsByBooking(booking_id);
      if (tickets.length > 0) {
        await updateTicketTypeAvailability(booking.ticket_type_id, -booking.quantity);
      }

      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return false;
    }
  }

  /**
   * Validate ticket for event entry
   */
  async validateTicketForEntry(
    ticket_number: string, 
    event_id: string
  ): Promise<TicketValidationResponse> {
    try {
      const validation = await validateTicketForEntry(ticket_number, event_id);
      
      if (!validation.valid) {
        return {
          valid: false,
          message: validation.message,
          error: 'INVALID_TICKET'
        };
      }

      // Get ticket details
      const ticketDetails = await getTicketWithDetails(ticket_number);
      
      return {
        valid: true,
        ticket: validation.ticket,
        event: ticketDetails ? {
          title: ticketDetails.event_title,
          event_date: ticketDetails.event_date,
          venue_name: ticketDetails.venue_name,
          venue_address: ticketDetails.venue_address
        } : undefined,
        message: 'Ticket is valid for entry'
      };

    } catch (error) {
      console.error('Error validating ticket:', error);
      return {
        valid: false,
        message: 'Error validating ticket',
        error: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Use ticket for event entry
   */
  async useTicket(ticket_id: string): Promise<boolean> {
    try {
      return await markTicketAsUsed(ticket_id);
    } catch (error) {
      console.error('Error using ticket:', error);
      return false;
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(user_id: string): Promise<any[]> {
    try {
      return await getUserTickets(user_id);
    } catch (error) {
      console.error('Error getting user tickets:', error);
      return [];
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(user_id: string, status?: string): Promise<any[]> {
    try {
      return await getUserBookings(user_id, status);
    } catch (error) {
      console.error('Error getting user bookings:', error);
      return [];
    }
  }

  /**
   * Get booking details
   */
  async getBookingDetails(booking_id: string): Promise<any> {
    try {
      return await getBookingWithDetails(booking_id);
    } catch (error) {
      console.error('Error getting booking details:', error);
      return null;
    }
  }

  /**
   * Get ticket details
   */
  async getTicketDetails(ticket_id: string): Promise<any> {
    try {
      return await getTicketWithDetails(ticket_id);
    } catch (error) {
      console.error('Error getting ticket details:', error);
      return null;
    }
  }

  /**
   * Get booking statistics
   */
  async getBookingStatistics(event_id?: string): Promise<any> {
    try {
      const bookingStats = await getBookingStats(event_id);
      const ticketStats = await getTicketStats(event_id);
      
      return {
        bookings: bookingStats,
        tickets: ticketStats
      };
    } catch (error) {
      console.error('Error getting booking statistics:', error);
      return null;
    }
  }

  /**
   * Send ticket confirmation email
   */
  private async sendTicketConfirmationEmail(booking_id: string, tickets: any[]): Promise<void> {
    try {
      const bookingDetails = await getBookingWithDetails(booking_id);
      if (!bookingDetails) return;

      const { booking, event, ticketType } = bookingDetails;
      
      const emailSubject = `Ticket Confirmation - ${event.title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Ticket Purchase Confirmation</h2>
          <p>Hello ${bookingDetails.tickets[0]?.attendee_name || 'Customer'},</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details</h3>
            <p><strong>Event:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue_name}</p>
            <p><strong>Address:</strong> ${event.venue_address}</p>
            <p><strong>Ticket Type:</strong> ${ticketType.name}</p>
            <p><strong>Quantity:</strong> ${booking.quantity}</p>
            <p><strong>Total Amount:</strong> ${booking.currency} ${booking.total_amount}</p>
            <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3>Your Tickets</h3>
            ${tickets.map(ticket => `
              <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
                <p><strong>Attendee:</strong> ${ticket.attendee_name}</p>
                <p><strong>Email:</strong> ${ticket.attendee_email}</p>
              </div>
            `).join('')}
          </div>
          
          <p style="color: #666;">
            Please bring your digital ticket with QR code for entry to the event.
            You can also access your tickets through the Paradise Pay app.
          </p>
          
          <p>Thank you for using Paradise Pay!</p>
        </div>
      `;

      // Send email to the first attendee (primary contact)
      await sendEmail(
        tickets[0]?.attendee_email || bookingDetails.tickets[0]?.attendee_email,
        emailSubject,
        emailHtml
      );

    } catch (error) {
      console.error('Error sending ticket confirmation email:', error);
    }
  }

  /**
   * Send ticket details email
   */
  private async sendTicketDetailsEmail(booking_id: string, tickets: any[]): Promise<void> {
    try {
      const bookingDetails = await getBookingWithDetails(booking_id);
      if (!bookingDetails) return;

      const { booking, event } = bookingDetails;
      
      const emailSubject = `Your Digital Tickets - ${event.title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Digital Tickets</h2>
          <p>Your payment has been confirmed! Here are your digital tickets:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details</h3>
            <p><strong>Event:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue_name}</p>
            <p><strong>Address:</strong> ${event.venue_address}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3>Digital Tickets</h3>
            ${tickets.map(ticket => `
              <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; text-align: center;">
                <h4>${ticket.attendee_name}</h4>
                <p><strong>Ticket #${ticket.ticket_number}</strong></p>
                <div style="margin: 15px 0;">
                  <img src="data:image/png;base64,${ticket.qr_code_data}" 
                       alt="QR Code" 
                       style="width: 200px; height: 200px; border: 1px solid #ccc;" />
                </div>
                <p style="font-size: 12px; color: #666;">
                  Show this QR code at the event entrance
                </p>
              </div>
            `).join('')}
          </div>
          
          <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Important Instructions:</h4>
            <ul>
              <li>Bring your digital ticket with QR code for entry</li>
              <li>Each QR code can only be used once</li>
              <li>Arrive at least 15 minutes before the event starts</li>
              <li>Contact support if you have any issues</li>
            </ul>
          </div>
          
          <p>Thank you for using Paradise Pay!</p>
        </div>
      `;

      // Send email to the primary attendee
      await sendEmail(
        tickets[0]?.attendee_email,
        emailSubject,
        emailHtml
      );

    } catch (error) {
      console.error('Error sending ticket details email:', error);
    }
  }
}

// Export singleton instance
export const ticketService = new TicketService();
export default ticketService;
