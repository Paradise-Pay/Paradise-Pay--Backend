import pool from '../db/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type BundleRow = {
  bundle_id: string;
  organizer_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_active: number;
  created_at: Date;
  updated_at: Date;
};

export type BundleEventRow = {
  bundle_event_id: string;
  bundle_id: string;
  event_id: string;
  created_at: Date;
};

export async function createBundle(bundleData: {
  organizer_id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
}): Promise<BundleRow> {
  const bundle_id = uuidv4();
  const sql = `
    INSERT INTO bundles (bundle_id, organizer_id, name, description, price, currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      bundle_id,
      bundleData.organizer_id,
      bundleData.name,
      bundleData.description ?? null,
      bundleData.price,
      bundleData.currency || 'USD'
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM bundles WHERE bundle_id = ?', [bundle_id]);
    return rows[0] as BundleRow;
  } finally {
    conn.release();
  }
}

export async function getBundleById(bundle_id: string): Promise<BundleRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM bundles WHERE bundle_id = ?', [bundle_id]);
  return rows[0] as BundleRow | undefined;
}

export async function getBundlesByOrganizer(organizer_id: string): Promise<BundleRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM bundles WHERE organizer_id = ? ORDER BY created_at DESC',
    [organizer_id]
  );
  return rows as BundleRow[];
}

export async function getAllBundles(): Promise<BundleRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM bundles ORDER BY created_at DESC');
  return rows as BundleRow[];
}

export async function updateBundle(bundle_id: string, updates: Partial<BundleRow>): Promise<BundleRow | undefined> {
  const allowedFields = ['name', 'description', 'price', 'currency', 'is_active'];
  const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
  const values = updateFields.map(field => (updates as any)[field]);
  
  const sql = `UPDATE bundles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE bundle_id = ?`;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [...values, bundle_id]);
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM bundles WHERE bundle_id = ?', [bundle_id]);
    return rows[0] as BundleRow | undefined;
  } finally {
    conn.release();
  }
}

export async function deleteBundle(bundle_id: string): Promise<boolean> {
  const sql = 'DELETE FROM bundles WHERE bundle_id = ?';
  const [result] = await pool.execute<ResultSetHeader>(sql, [bundle_id]);
  return result.affectedRows > 0;
}

// Bundle Events
export async function addEventToBundle(bundle_id: string, event_id: string): Promise<void> {
  const bundle_event_id = uuidv4();
  await pool.execute(
    'INSERT INTO bundle_events (bundle_event_id, bundle_id, event_id) VALUES (?, ?, ?)',
    [bundle_event_id, bundle_id, event_id]
  );
}

export async function removeEventFromBundle(bundle_id: string, event_id: string): Promise<void> {
  await pool.execute(
    'DELETE FROM bundle_events WHERE bundle_id = ? AND event_id = ?',
    [bundle_id, event_id]
  );
}

export async function getBundleEvents(bundle_id: string): Promise<any[]> {
  const sql = `
    SELECT 
      be.*,
      e.*,
      c.name as category_name
    FROM bundle_events be
    JOIN events e ON be.event_id = e.event_id
    LEFT JOIN event_categories c ON e.category_id = c.category_id
    WHERE be.bundle_id = ?
    ORDER BY be.created_at ASC
  `;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, [bundle_id]);
  return rows;
}

export async function getBundleWithEvents(bundle_id: string): Promise<any> {
  const bundle = await getBundleById(bundle_id);
  if (!bundle) return undefined;
  
  const events = await getBundleEvents(bundle_id);
  return {
    ...bundle,
    events
  };
}

