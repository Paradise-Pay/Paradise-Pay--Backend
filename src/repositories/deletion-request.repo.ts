import pool from '../db/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type DeletionRequestRow = {
  request_id: string;
  user_id: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: Date;
  processed_at?: Date;
  processed_by?: string;
};

export async function createDeletionRequest(requestData: {
  user_id: string;
  reason?: string;
}): Promise<DeletionRequestRow> {
  const request_id = uuidv4();
  const sql = `
    INSERT INTO deletion_requests (request_id, user_id, reason)
    VALUES (?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [request_id, requestData.user_id, requestData.reason ?? null]);
    
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM deletion_requests WHERE request_id = ?',
      [request_id]
    );
    return rows[0] as DeletionRequestRow;
  } finally {
    conn.release();
  }
}

export async function getDeletionRequestById(request_id: string): Promise<DeletionRequestRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM deletion_requests WHERE request_id = ?',
    [request_id]
  );
  return rows[0] as DeletionRequestRow | undefined;
}

export async function getDeletionRequestByUserId(user_id: string): Promise<DeletionRequestRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM deletion_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1',
    [user_id]
  );
  return rows[0] as DeletionRequestRow | undefined;
}

export async function getAllDeletionRequests(status?: string): Promise<any[]> {
  let sql = `
    SELECT 
      dr.*,
      u.name as user_name,
      u.email as user_email,
      p.name as processed_by_name
    FROM deletion_requests dr
    JOIN users u ON dr.user_id = u.user_id
    LEFT JOIN users p ON dr.processed_by = p.user_id
  `;
  
  const params: any[] = [];
  if (status) {
    sql += ' WHERE dr.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY dr.requested_at DESC';
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows;
}

export async function updateDeletionRequest(
  request_id: string,
  status: 'pending' | 'approved' | 'rejected' | 'completed',
  processed_by: string
): Promise<void> {
  await pool.execute(
    'UPDATE deletion_requests SET status = ?, processed_at = NOW(), processed_by = ? WHERE request_id = ?',
    [status, processed_by, request_id]
  );
}

