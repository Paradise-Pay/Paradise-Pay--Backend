import pool from '../db/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type TicketRow = {
  ticket_id: string;
  booking_id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  ticket_number: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  qr_code: string;
  qr_code_data: string;
  is_used: number;
  used_at?: Date;
  seat_number?: string;
  created_at: Date;
};

export type EventBookingRow = {
  booking_id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  booking_reference: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
};

export interface BookingDetails {
  booking: EventBookingRow;
  event: any;
  ticketType: any;
  tickets: TicketRow[];
}

export interface TicketPurchaseData {
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

// Event Bookings
export async function createEventBooking(bookingData: {
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  total_amount: number;
  currency?: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}): Promise<EventBookingRow> {
  const booking_id = uuidv4();
  const booking_reference = `PP${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  const sql = `
    INSERT INTO event_bookings (
      booking_id, user_id, event_id, ticket_type_id, quantity, total_amount,
      currency, payment_method, payment_reference, booking_reference, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      booking_id, bookingData.user_id, bookingData.event_id, bookingData.ticket_type_id,
      bookingData.quantity, bookingData.total_amount, bookingData.currency || 'USD',
      bookingData.payment_method, bookingData.payment_reference, booking_reference,
      bookingData.notes
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM event_bookings WHERE booking_id = ?', [booking_id]);
    return rows[0] as EventBookingRow;
  } finally {
    conn.release();
  }
}

export async function getBookingById(booking_id: string): Promise<EventBookingRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM event_bookings WHERE booking_id = ?', [booking_id]);
  return rows[0] as EventBookingRow | undefined;
}

export async function getBookingByReference(booking_reference: string): Promise<EventBookingRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM event_bookings WHERE booking_reference = ?', [booking_reference]);
  return rows[0] as EventBookingRow | undefined;
}

export async function getBookingWithDetails(booking_id: string): Promise<BookingDetails | undefined> {
  const sql = `
    SELECT 
      eb.*,
      e.title as event_title,
      e.event_date,
      e.venue_name,
      e.venue_address,
      e.city,
      e.state,
      e.country,
      tt.name as ticket_type_name,
      tt.price as ticket_price,
      c.name as category_name,
      u.name as organizer_name,
      u.email as organizer_email
    FROM event_bookings eb
    JOIN events e ON eb.event_id = e.event_id
    JOIN ticket_types tt ON eb.ticket_type_id = tt.ticket_type_id
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    LEFT JOIN users u ON e.organizer_id = u.user_id
    WHERE eb.booking_id = ?
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [booking_id]);
  if (rows.length === 0) return undefined;
  
  const booking = rows[0];
  const tickets = await getTicketsByBooking(booking_id);
  
  return {
    booking: booking as EventBookingRow,
    event: {
      event_id: booking.event_id,
      title: booking.event_title,
      event_date: booking.event_date,
      venue_name: booking.venue_name,
      venue_address: booking.venue_address,
      city: booking.city,
      state: booking.state,
      country: booking.country,
      category_name: booking.category_name,
      organizer_name: booking.organizer_name,
      organizer_email: booking.organizer_email
    },
    ticketType: {
      ticket_type_id: booking.ticket_type_id,
      name: booking.ticket_type_name,
      price: booking.ticket_price
    },
    tickets
  };
}

export async function getUserBookings(user_id: string, status?: string): Promise<any[]> {
  let sql = `
    SELECT 
      eb.*,
      e.title as event_title,
      e.event_date,
      e.venue_name,
      e.city,
      e.state,
      e.country,
      e.event_image_url,
      tt.name as ticket_type_name,
      tt.price as ticket_price,
      c.name as category_name,
      c.icon_url as category_icon
    FROM event_bookings eb
    JOIN events e ON eb.event_id = e.event_id
    JOIN ticket_types tt ON eb.ticket_type_id = tt.ticket_type_id
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    WHERE eb.user_id = ?
  `;
  
  const params: any[] = [user_id];
  
  if (status) {
    sql += ' AND eb.booking_status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY eb.created_at DESC';
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows;
}

export async function updateBookingStatus(
  booking_id: string, 
  booking_status?: string, 
  payment_status?: string
): Promise<boolean> {
  const updates: string[] = [];
  const params: any[] = [];
  
  if (booking_status) {
    updates.push('booking_status = ?');
    params.push(booking_status);
  }
  
  if (payment_status) {
    updates.push('payment_status = ?');
    params.push(payment_status);
  }
  
  if (updates.length === 0) return false;
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(booking_id);
  
  const sql = `UPDATE event_bookings SET ${updates.join(', ')} WHERE booking_id = ?`;
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  
  return result.affectedRows > 0;
}

export async function updateBookingPayment(
  booking_id: string,
  payment_status: string,
  payment_reference?: string
): Promise<boolean> {
  const sql = `
    UPDATE event_bookings 
    SET payment_status = ?, payment_reference = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE booking_id = ?
  `;
  
  const [result] = await pool.execute<ResultSetHeader>(sql, [payment_status, payment_reference, booking_id]);
  return result.affectedRows > 0;
}

export async function getEventBookings(event_id: string): Promise<any[]> {
  const sql = `
    SELECT 
      eb.*,
      u.name as user_name,
      u.email as user_email,
      tt.name as ticket_type_name,
      tt.price as ticket_price
    FROM event_bookings eb
    JOIN users u ON eb.user_id = u.user_id
    JOIN ticket_types tt ON eb.ticket_type_id = tt.ticket_type_id
    WHERE eb.event_id = ?
    ORDER BY eb.created_at DESC
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [event_id]);
  return rows;
}

// Tickets
export async function createTicket(ticketData: {
  booking_id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  qr_code: string;
  qr_code_data: string;
  seat_number?: string;
}): Promise<TicketRow> {
  const ticket_id = uuidv4();
  const ticket_number = `T${Date.now()}${Math.floor(Math.random() * 10000)}`;
  
  const sql = `
    INSERT INTO tickets (
      ticket_id, booking_id, user_id, event_id, ticket_type_id, ticket_number,
      attendee_name, attendee_email, attendee_phone, qr_code, qr_code_data, seat_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      ticket_id, ticketData.booking_id, ticketData.user_id, ticketData.event_id,
      ticketData.ticket_type_id, ticket_number, ticketData.attendee_name,
      ticketData.attendee_email, ticketData.attendee_phone, ticketData.qr_code,
      ticketData.qr_code_data, ticketData.seat_number
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM tickets WHERE ticket_id = ?', [ticket_id]);
    return rows[0] as TicketRow;
  } finally {
    conn.release();
  }
}

export async function getTicketById(ticket_id: string): Promise<TicketRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM tickets WHERE ticket_id = ?', [ticket_id]);
  return rows[0] as TicketRow | undefined;
}

export async function getTicketByNumber(ticket_number: string): Promise<TicketRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM tickets WHERE ticket_number = ?', [ticket_number]);
  return rows[0] as TicketRow | undefined;
}

export async function getTicketWithDetails(ticket_id: string): Promise<any> {
  const sql = `
    SELECT 
      t.*,
      e.title as event_title,
      e.event_date,
      e.venue_name,
      e.venue_address,
      e.city,
      e.state,
      e.country,
      tt.name as ticket_type_name,
      tt.price as ticket_price,
      c.name as category_name,
      c.icon_url as category_icon,
      u.name as organizer_name,
      eb.booking_reference,
      eb.booking_status,
      eb.payment_status
    FROM tickets t
    JOIN events e ON t.event_id = e.event_id
    JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
    JOIN event_bookings eb ON t.booking_id = eb.booking_id
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    LEFT JOIN users u ON e.organizer_id = u.user_id
    WHERE t.ticket_id = ?
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [ticket_id]);
  return rows[0];
}

export async function getTicketsByBooking(booking_id: string): Promise<TicketRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM tickets WHERE booking_id = ? ORDER BY created_at ASC',
    [booking_id]
  );
  return rows as TicketRow[];
}

export async function getUserTickets(user_id: string): Promise<any[]> {
  const sql = `
    SELECT 
      t.*,
      e.title as event_title,
      e.event_date,
      e.venue_name,
      e.city,
      e.state,
      e.country,
      e.event_image_url,
      tt.name as ticket_type_name,
      tt.price as ticket_price,
      c.name as category_name,
      c.icon_url as category_icon,
      eb.booking_reference,
      eb.booking_status,
      eb.payment_status
    FROM tickets t
    JOIN events e ON t.event_id = e.event_id
    JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
    JOIN event_bookings eb ON t.booking_id = eb.booking_id
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [user_id]);
  return rows;
}

export async function getEventTickets(event_id: string): Promise<any[]> {
  const sql = `
    SELECT 
      t.*,
      u.name as user_name,
      u.email as user_email,
      tt.name as ticket_type_name,
      tt.price as ticket_price,
      eb.booking_reference,
      eb.booking_status
    FROM tickets t
    JOIN users u ON t.user_id = u.user_id
    JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
    JOIN event_bookings eb ON t.booking_id = eb.booking_id
    WHERE t.event_id = ?
    ORDER BY t.created_at ASC
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [event_id]);
  return rows;
}

export async function markTicketAsUsed(ticket_id: string): Promise<boolean> {
  const sql = `
    UPDATE tickets 
    SET is_used = 1, used_at = CURRENT_TIMESTAMP 
    WHERE ticket_id = ? AND is_used = 0
  `;
  
  const [result] = await pool.execute<ResultSetHeader>(sql, [ticket_id]);
  return result.affectedRows > 0;
}

export async function validateTicketForEntry(ticket_number: string, event_id: string): Promise<{
  valid: boolean;
  ticket?: TicketRow;
  message: string;
}> {
  const sql = `
    SELECT t.*, e.event_date, e.status as event_status
    FROM tickets t
    JOIN events e ON t.event_id = e.event_id
    WHERE t.ticket_number = ? AND t.event_id = ?
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [ticket_number, event_id]);
  
  if (rows.length === 0) {
    return {
      valid: false,
      message: 'Ticket not found for this event'
    };
  }
  
  const ticket = rows[0] as TicketRow & { event_date: Date; event_status: string };
  
  // Check if event is published
  if (ticket.event_status !== 'published') {
    return {
      valid: false,
      ticket,
      message: 'Event is not active'
    };
  }
  
  // Check if ticket is already used
  if (ticket.is_used) {
    return {
      valid: false,
      ticket,
      message: 'Ticket has already been used'
    };
  }
  
  // Check if event date has passed (optional - you might want to allow entry up to a certain time after)
  const now = new Date();
  const eventDate = new Date(ticket.event_date);
  if (now > eventDate) {
    return {
      valid: false,
      ticket,
      message: 'Event date has passed'
    };
  }
  
  return {
    valid: true,
    ticket,
    message: 'Ticket is valid for entry'
  };
}

// Statistics and Analytics
export async function getBookingStats(event_id?: string): Promise<{
  total_bookings: number;
  total_revenue: number;
  confirmed_bookings: number;
  pending_bookings: number;
  cancelled_bookings: number;
}> {
  let whereClause = '';
  const params: any[] = [];
  
  if (event_id) {
    whereClause = 'WHERE event_id = ?';
    params.push(event_id);
  }
  
  const sql = `
    SELECT 
      COUNT(*) as total_bookings,
      SUM(CASE WHEN booking_status = 'confirmed' THEN total_amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
      SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
      SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings
    FROM event_bookings
    ${whereClause}
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows[0] as any;
}

export async function getTicketStats(event_id?: string): Promise<{
  total_tickets: number;
  used_tickets: number;
  unused_tickets: number;
  usage_rate: number;
}> {
  let whereClause = '';
  const params: any[] = [];
  
  if (event_id) {
    whereClause = 'WHERE event_id = ?';
    params.push(event_id);
  }
  
  const sql = `
    SELECT 
      COUNT(*) as total_tickets,
      SUM(is_used) as used_tickets,
      SUM(CASE WHEN is_used = 0 THEN 1 ELSE 0 END) as unused_tickets,
      ROUND((SUM(is_used) / COUNT(*)) * 100, 2) as usage_rate
    FROM tickets
    ${whereClause}
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows[0] as any;
}
