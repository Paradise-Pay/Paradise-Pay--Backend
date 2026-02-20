import pool from '../db/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type SupportTicketRow = {
  ticket_id: string;
  user_id?: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'account' | 'event' | 'general' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  resolution?: string;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export type SupportTicketResponseRow = {
  response_id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: number;
  created_at: Date;
};

export interface TicketFilters {
  user_id?: string;
  status?: string;
  category?: string;
  priority?: string;
  assigned_to?: string;
}

export interface TicketListOptions {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'priority' | 'status';
  sort_order?: 'ASC' | 'DESC';
}

export async function createSupportTicket(ticketData: {
  user_id?: string;
  subject: string;
  description: string;
  category?: 'technical' | 'billing' | 'account' | 'event' | 'general' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}): Promise<SupportTicketRow> {
  const ticket_id = uuidv4();
  const sql = `
    INSERT INTO support_tickets (ticket_id, user_id, subject, description, category, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      ticket_id,
      ticketData.user_id ?? null,
      ticketData.subject,
      ticketData.description,
      ticketData.category || 'general',
      ticketData.priority || 'medium'
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM support_tickets WHERE ticket_id = ?', [ticket_id]);
    return rows[0] as SupportTicketRow;
  } finally {
    conn.release();
  }
}

export async function getTicketById(ticket_id: string): Promise<SupportTicketRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM support_tickets WHERE ticket_id = ?',
    [ticket_id]
  );
  return rows[0] as SupportTicketRow | undefined;
}

export async function getTickets(
  filters: TicketFilters = {},
  options: TicketListOptions = {}
): Promise<{ tickets: any[]; total: number; page: number; limit: number }> {
  const { user_id, status, category, priority, assigned_to } = filters;
  const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'DESC' } = options;
  
  const safeLimit = Number(limit) || 20;
  const safePage = Number(page) || 1;
  const safeOffset = (safePage - 1) * safeLimit;
  
  let whereConditions: string[] = [];
  let queryParams: any[] = [];
  
  if (user_id) {
    whereConditions.push('st.user_id = ?');
    queryParams.push(user_id);
  }
  
  if (status) {
    whereConditions.push('st.status = ?');
    queryParams.push(status);
  }
  
  if (category) {
    whereConditions.push('st.category = ?');
    queryParams.push(category);
  }
  
  if (priority) {
    whereConditions.push('st.priority = ?');
    queryParams.push(priority);
  }
  
  if (assigned_to) {
    whereConditions.push('st.assigned_to = ?');
    queryParams.push(assigned_to);
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // Count total
  const countSql = `SELECT COUNT(*) as total FROM support_tickets st ${whereClause}`;
  const [countRows] = await pool.execute<RowDataPacket[]>(countSql, queryParams);
  const total = (countRows[0] as any).total;
  
  // Get tickets with user info
  const dataSql = `
    SELECT 
      st.*,
      u.name as user_name,
      u.email as user_email,
      a.name as assigned_to_name
    FROM support_tickets st
    LEFT JOIN users u ON st.user_id = u.user_id
    LEFT JOIN users a ON st.assigned_to = a.user_id
    ${whereClause}
    ORDER BY st.${sort_by} ${sort_order}
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;
  
  const [ticketRows] = await pool.execute<RowDataPacket[]>(dataSql, queryParams);
  
  return {
    tickets: ticketRows,
    total,
    page: safePage,
    limit: safeLimit
  };
}

export async function updateTicket(
  ticket_id: string,
  updates: Partial<SupportTicketRow>
): Promise<SupportTicketRow | undefined> {
  const allowedFields = ['status', 'priority', 'assigned_to', 'resolution'];
  const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  let setClause = updateFields.map(field => `${field} = ?`).join(', ');
  const values = updateFields.map(field => (updates as any)[field]);
  
  // If status is being set to resolved, set resolved_at
  if (updates.status === 'resolved' && !updates.resolved_at) {
    setClause += ', resolved_at = NOW()';
  }
  
  const sql = `UPDATE support_tickets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?`;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [...values, ticket_id]);
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM support_tickets WHERE ticket_id = ?', [ticket_id]);
    return rows[0] as SupportTicketRow | undefined;
  } finally {
    conn.release();
  }
}

export async function addTicketResponse(responseData: {
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal?: boolean;
}): Promise<SupportTicketResponseRow> {
  const response_id = uuidv4();
  const sql = `
    INSERT INTO support_ticket_responses (response_id, ticket_id, user_id, message, is_internal)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      response_id,
      responseData.ticket_id,
      responseData.user_id,
      responseData.message,
      responseData.is_internal ? 1 : 0
    ]);
    
    // Update ticket updated_at
    await pool.execute('UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?', [responseData.ticket_id]);
    
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM support_ticket_responses WHERE response_id = ?',
      [response_id]
    );
    return rows[0] as SupportTicketResponseRow;
  } finally {
    conn.release();
  }
}

export async function getTicketResponses(ticket_id: string, includeInternal: boolean = false): Promise<any[]> {
  let sql = `
    SELECT 
      str.*,
      u.name as user_name,
      u.email as user_email
    FROM support_ticket_responses str
    JOIN users u ON str.user_id = u.user_id
    WHERE str.ticket_id = ?
  `;
  
  if (!includeInternal) {
    sql += ' AND str.is_internal = 0';
  }
  
  sql += ' ORDER BY str.created_at ASC';
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [ticket_id]);
  return rows;
}

export async function getTicketWithResponses(ticket_id: string, includeInternal: boolean = false): Promise<any> {
  const ticket = await getTicketById(ticket_id);
  if (!ticket) return undefined;
  
  const responses = await getTicketResponses(ticket_id, includeInternal);
  return {
    ...ticket,
    responses
  };
}

