import pool from '../db/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type ActiveDeviceRow = {
  device_id: string;
  user_id: string;
  device_name?: string;
  device_type?: string;
  device_token?: string;
  ip_address?: string;
  user_agent?: string;
  last_active_at: Date;
  created_at: Date;
};

export async function createOrUpdateDevice(deviceData: {
  user_id: string;
  device_name?: string;
  device_type?: string;
  device_token?: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<ActiveDeviceRow> {
  // Check if device already exists for this user with same token
  if (deviceData.device_token) {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM active_devices WHERE user_id = ? AND device_token = ?',
      [deviceData.user_id, deviceData.device_token]
    );
    
    if (existing.length > 0) {
      // Update existing device
      await pool.execute(
        'UPDATE active_devices SET device_name = ?, device_type = ?, ip_address = ?, user_agent = ?, last_active_at = CURRENT_TIMESTAMP WHERE device_id = ?',
        [
          deviceData.device_name ?? null,
          deviceData.device_type ?? null,
          deviceData.ip_address ?? null,
          deviceData.user_agent ?? null,
          existing[0].device_id
        ]
      );
      
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM active_devices WHERE device_id = ?',
        [existing[0].device_id]
      );
      return rows[0] as ActiveDeviceRow;
    }
  }
  
  // Create new device
  const device_id = uuidv4();
  const sql = `
    INSERT INTO active_devices (device_id, user_id, device_name, device_type, device_token, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      device_id,
      deviceData.user_id,
      deviceData.device_name ?? null,
      deviceData.device_type ?? null,
      deviceData.device_token ?? null,
      deviceData.ip_address ?? null,
      deviceData.user_agent ?? null
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM active_devices WHERE device_id = ?',
      [device_id]
    );
    return rows[0] as ActiveDeviceRow;
  } finally {
    conn.release();
  }
}

export async function getUserDevices(user_id: string): Promise<ActiveDeviceRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM active_devices WHERE user_id = ? ORDER BY last_active_at DESC',
    [user_id]
  );
  return rows as ActiveDeviceRow[];
}

export async function removeDevice(device_id: string, user_id: string): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM active_devices WHERE device_id = ? AND user_id = ?',
    [device_id, user_id]
  );
  return result.affectedRows > 0;
}

export async function removeAllUserDevices(user_id: string): Promise<void> {
  await pool.execute('DELETE FROM active_devices WHERE user_id = ?', [user_id]);
}

export async function updateDeviceLastActive(device_id: string): Promise<void> {
  await pool.execute(
    'UPDATE active_devices SET last_active_at = CURRENT_TIMESTAMP WHERE device_id = ?',
    [device_id]
  );
}

