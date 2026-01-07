import pool from '../db/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type EventCategoryRow = {
  category_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  created_at: Date;
};

export type EventRow = {
  event_id: string;
  organizer_id: string;
  category_id: string;
  title: string;
  description?: string;
  venue_name: string;
  venue_address: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  event_date: Date;
  event_end_date?: Date;
  registration_start_date?: Date;
  registration_end_date?: Date;
  max_attendees?: number;
  current_attendees: number;
  ticket_price: number;
  currency: string;
  event_image_url?: string;
  event_banner_url?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  is_featured: number;
  tags?: string;
  external_event_id?: string;
  external_platform: 'ticketmaster' | 'eventbrite' | 'none';
  created_at: Date;
  updated_at: Date;
};

export type TicketTypeRow = {
  ticket_type_id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  available_quantity: number;
  sold_quantity: number;
  sales_start_date?: Date;
  sales_end_date?: Date;
  max_per_user: number;
  is_active: number;
  created_at: Date;
  updated_at: Date;
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

export interface EventSearchFilters {
  category_id?: string;
  city?: string;
  state?: string;
  country?: string;
  date_from?: Date;
  date_to?: Date;
  price_min?: number;
  price_max?: number;
  status?: string;
  search_query?: string;
  is_featured?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
}

export interface EventListOptions {
  page?: number;
  limit?: number;
  sort_by?: 'event_date' | 'created_at' | 'title' | 'price' | 'popularity';
  sort_order?: 'ASC' | 'DESC';
}

// Event Categories
export async function getAllEventCategories(): Promise<EventCategoryRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM event_categories ORDER BY name');
  return rows as EventCategoryRow[];
}

export async function getEventCategoryById(category_id: string): Promise<EventCategoryRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM event_categories WHERE category_id = ?', [category_id]);
  return rows[0] as EventCategoryRow | undefined;
}

// Events
export async function createEvent(eventData: {
  organizer_id: string;
  category_id: string;
  title: string;
  description?: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  state?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  event_date: Date;
  event_end_date?: Date | null;
  registration_start_date?: Date | null;
  registration_end_date?: Date | null;
  max_attendees?: number | null;
  ticket_price?: number | null;
  currency?: string | null;
  event_image_url?: string | null;
  event_banner_url?: string | null;
  tags?: string[] | null;
}): Promise<EventRow> {
  const event_id = uuidv4();
  const sql = `
    INSERT INTO events (
      event_id, organizer_id, category_id, title, description, venue_name, 
      venue_address, city, state, country, latitude, longitude, event_date, 
      event_end_date, registration_start_date, registration_end_date, 
      max_attendees, ticket_price, currency, event_image_url, event_banner_url, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      event_id, 
      eventData.organizer_id, 
      eventData.category_id, 
      eventData.title, 
      eventData.description ?? null, 
      eventData.venue_name, 
      eventData.venue_address,
      eventData.city, 
      eventData.state ?? null, 
      eventData.country, 
      eventData.latitude ?? null,
      eventData.longitude ?? null, 
      eventData.event_date, 
      eventData.event_end_date ?? null,
      eventData.registration_start_date ?? null, 
      eventData.registration_end_date ?? null,
      eventData.max_attendees ?? null, 
      eventData.ticket_price ?? 0, 
      eventData.currency || 'GHS',
      eventData.event_image_url ?? null, 
      eventData.event_banner_url ?? null, 
      eventData.tags ? JSON.stringify(eventData.tags) : null
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM events WHERE event_id = ?', [event_id]);
    return rows[0] as EventRow;
  } finally {
    conn.release();
  }
}

export async function getEventById(event_id: string): Promise<EventRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM events WHERE event_id = ?', [event_id]);
  return rows[0] as EventRow | undefined;
}

export async function getEventWithDetails(event_id: string): Promise<any> {
  const sql = `
    SELECT 
      e.*,
      c.name as category_name,
      c.icon_url as category_icon,
      u.name as organizer_name,
      u.email as organizer_email,
      AVG(r.rating) as average_rating,
      COUNT(r.review_id) as review_count
    FROM events e
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    LEFT JOIN users u ON e.organizer_id = u.user_id
    LEFT JOIN event_reviews r ON e.event_id = r.event_id
    WHERE e.event_id = ?
    GROUP BY e.event_id
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [event_id]);
  return rows[0];
}

export async function searchEvents(filters: EventSearchFilters = {}, options: EventListOptions = {}): Promise<{
  events: any[];
  total: number;
  page: number;
  limit: number;
}> {
  const { 
    category_id, city, state, country, date_from, date_to, 
    price_min, price_max, status, search_query, is_featured,
    latitude, longitude, radius 
  } = filters;
  
  const { 
    page = 1, 
    limit = 20, 
    sort_by = 'event_date', 
    sort_order = 'ASC' 
  } = options;

  // ✅ 1. SANITIZE NUMBERS FIRST
  // Convert to pure numbers. If invalid, default to 20 and 0.
  const safeLimit = Number(limit) || 20;
  const safePage = Number(page) || 1;
  const safeOffset = (safePage - 1) * safeLimit;
  
  let whereConditions: string[] = [];
  let queryParams: any[] = [];
  
  // Build WHERE conditions
  if (category_id) {
    whereConditions.push('e.category_id = ?');
    queryParams.push(category_id);
  }
  
  if (city) {
    whereConditions.push('e.city LIKE ?');
    queryParams.push(`%${city}%`);
  }
  
  if (state) {
    whereConditions.push('e.state LIKE ?');
    queryParams.push(`%${state}%`);
  }
  
  if (country) {
    whereConditions.push('e.country = ?');
    queryParams.push(country);
  }
  
  if (date_from) {
    whereConditions.push('e.event_date >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('e.event_date <= ?');
    queryParams.push(date_to);
  }
  
  if (price_min !== undefined) {
    whereConditions.push('e.ticket_price >= ?');
    queryParams.push(price_min);
  }
  
  if (price_max !== undefined) {
    whereConditions.push('e.ticket_price <= ?');
    queryParams.push(price_max);
  }
  
  if (status) {
    whereConditions.push('e.status = ?');
    queryParams.push(status);
  }
  
  if (search_query) {
    whereConditions.push('(e.title LIKE ? OR e.description LIKE ? OR e.venue_name LIKE ?)');
    const searchPattern = `%${search_query}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }
  
  if (is_featured !== undefined) {
    whereConditions.push('e.is_featured = ?');
    queryParams.push(is_featured ? 1 : 0);
  }
  
  // Location-based search
  if (latitude && longitude && radius) {
    whereConditions.push(`
      (6371 * acos(cos(radians(?)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(?)) + sin(radians(?)) * sin(radians(e.latitude)))) <= ?
    `);
    queryParams.push(latitude, longitude, latitude, radius);
  }
  
  // Only show published events by default
  if (!status) {
    whereConditions.push('e.status = "published"');
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // Count total results
  const countSql = `
    SELECT COUNT(*) as total
    FROM events e
    ${whereClause}
  `;
  
  const [countRows] = await pool.execute<RowDataPacket[]>(countSql, queryParams);
  const total = (countRows[0] as any).total;
  
  // ✅ 2. INJECT NUMBERS DIRECTLY INTO SQL
  // We use ${safeLimit} instead of ? to bypass the driver's binding issues
  const dataSql = `
    SELECT 
      e.*,
      c.name as category_name,
      c.icon_url as category_icon,
      u.name as organizer_name,
      COUNT(r.review_id) as review_count,
      COUNT(eb.booking_id) as booking_count
    FROM events e
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    LEFT JOIN users u ON e.organizer_id = u.user_id
    LEFT JOIN event_reviews r ON e.event_id = r.event_id
    LEFT JOIN event_bookings eb ON e.event_id = eb.event_id AND eb.booking_status = 'confirmed'
    ${whereClause}
    GROUP BY e.event_id
    ORDER BY e.${sort_by} ${sort_order}
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;
  
  // ✅ 3. EXECUTE WITHOUT LIMIT PARAMETERS (They are already in the string)
  const [eventRows] = await pool.execute<RowDataPacket[]>(dataSql, queryParams);
  
  return {
    events: eventRows,
    total,
    page: safePage,
    limit: safeLimit
  };
}

export async function getFeaturedEvents(limit: number = 10): Promise<any[]> {
  // ✅ 1. SANITIZE NUMBER FIRST
  const safeLimit = Number(limit) || 10;

  // ✅ 2. INJECT DIRECTLY
  const sql = `
    SELECT 
      e.*,
      c.name as category_name,
      c.icon_url as category_icon,
      u.name as organizer_name,
      AVG(r.rating) as average_rating,
      COUNT(r.review_id) as review_count
    FROM events e
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    LEFT JOIN users u ON e.organizer_id = u.user_id
    LEFT JOIN event_reviews r ON e.event_id = r.event_id
    WHERE e.status = 'published' AND e.is_featured = 1 AND e.event_date > NOW()
    GROUP BY e.event_id
    ORDER BY e.event_date ASC
    LIMIT ${safeLimit}
  `;
  
  // ✅ 3. EXECUTE WITH EMPTY ARRAY (No parameters to bind)
  const [rows] = await pool.execute<RowDataPacket[]>(sql, []);
  return rows;
}

export async function getEventsByOrganizer(organizer_id: string, status?: string): Promise<EventRow[]> {
  let sql = 'SELECT * FROM events WHERE organizer_id = ?';
  const params: any[] = [organizer_id];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as EventRow[];
}

export async function updateEvent(event_id: string, updates: Partial<EventRow>): Promise<EventRow | undefined> {
  const allowedFields = [
    'title', 'description', 'venue_name', 'venue_address', 'city', 'state', 'country',
    'latitude', 'longitude', 'event_date', 'event_end_date', 'registration_start_date',
    'registration_end_date', 'max_attendees', 'ticket_price', 'currency', 'event_image_url',
    'event_banner_url', 'status', 'is_featured', 'tags'
  ];
  
  const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
  const values = updateFields.map(field => {
    if (field === 'tags' && updates.tags) {
      return JSON.stringify(updates.tags);
    }
    return (updates as any)[field];
  });
  
  const sql = `UPDATE events SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?`;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [...values, event_id]);
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM events WHERE event_id = ?', [event_id]);
    return rows[0] as EventRow | undefined;
  } finally {
    conn.release();
  }
}

export async function deleteEvent(event_id: string): Promise<boolean> {
  const sql = 'DELETE FROM events WHERE event_id = ?';
  const [result] = await pool.execute<ResultSetHeader>(sql, [event_id]);
  return result.affectedRows > 0;
}

export async function incrementEventAttendees(event_id: string, increment: number = 1): Promise<void> {
  await pool.execute(
    'UPDATE events SET current_attendees = current_attendees + ? WHERE event_id = ?',
    [increment, event_id]
  );
}

// Ticket Types
export async function createTicketType(ticketTypeData: {
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  available_quantity: number;
  sales_start_date?: Date;
  sales_end_date?: Date;
  max_per_user?: number;
}): Promise<TicketTypeRow> {
  const ticket_type_id = uuidv4();
  const sql = `
    INSERT INTO ticket_types (
      ticket_type_id, event_id, name, description, price, currency,
      available_quantity, sales_start_date, sales_end_date, max_per_user
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      ticket_type_id, ticketTypeData.event_id, ticketTypeData.name,
      ticketTypeData.description, ticketTypeData.price, ticketTypeData.currency || 'USD',
      ticketTypeData.available_quantity, ticketTypeData.sales_start_date,
      ticketTypeData.sales_end_date, ticketTypeData.max_per_user || 1
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM ticket_types WHERE ticket_type_id = ?', [ticket_type_id]);
    return rows[0] as TicketTypeRow;
  } finally {
    conn.release();
  }
}

export async function getTicketTypesByEvent(event_id: string): Promise<TicketTypeRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM ticket_types WHERE event_id = ? AND is_active = 1 ORDER BY price ASC',
    [event_id]
  );
  return rows as TicketTypeRow[];
}

export async function updateTicketTypeAvailability(ticket_type_id: string, sold_quantity: number): Promise<void> {
  await pool.execute(
    'UPDATE ticket_types SET sold_quantity = sold_quantity + ? WHERE ticket_type_id = ?',
    [sold_quantity, ticket_type_id]
  );
}

// Event Favorites
export async function addEventToFavorites(user_id: string, event_id: string): Promise<void> {
  const favorite_id = uuidv4();
  await pool.execute(
    'INSERT INTO event_favorites (favorite_id, user_id, event_id) VALUES (?, ?, ?)',
    [favorite_id, user_id, event_id]
  );
}

export async function removeEventFromFavorites(user_id: string, event_id: string): Promise<void> {
  await pool.execute(
    'DELETE FROM event_favorites WHERE user_id = ? AND event_id = ?',
    [user_id, event_id]
  );
}

export async function getUserFavoriteEvents(user_id: string): Promise<any[]> {
  const sql = `
    SELECT 
      e.*,
      c.name as category_name,
      c.icon_url as category_icon,
      u.name as organizer_name
    FROM event_favorites f
    JOIN events e ON f.event_id = e.event_id
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    LEFT JOIN users u ON e.organizer_id = u.user_id
    WHERE f.user_id = ? AND e.status = 'published'
    ORDER BY f.created_at DESC
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [user_id]);
  return rows;
}

export async function isEventFavorited(user_id: string, event_id: string): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM event_favorites WHERE user_id = ? AND event_id = ?',
    [user_id, event_id]
  );
  return rows.length > 0;
}
