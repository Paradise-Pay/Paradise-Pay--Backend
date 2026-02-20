import pool from '../db/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type UserRow = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash: string;
  mfa_enabled: number;
  role: 'User' | 'Organizer' | 'Admin';
  profile_picture_url?: string;
  nickname?: string;
  email_verified: number;
  user_plan?: 'Free' | 'Basic' | 'Premium' | 'Enterprise';
  google_id?: string;
  mfa_secret?: string;
  mfa_backup_codes?: string;
  created_at: Date;
  updated_at: Date;
};

export async function createUser({
  name,
  email,
  phone,
  nickname, 
  passwordHash,
  role = 'User'
}: {
  name: string;
  email: string;
  phone?: string;
  nickname?: string; 
  passwordHash: string;
  role?: 'User' | 'Organizer' | 'Admin';
}) {
  const id = uuidv4();
  
  const sql = `
    INSERT INTO users (user_id, name, email, phone, nickname, password_hash, role) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      id, 
      name, 
      email, 
      phone ?? null, 
      nickname ?? null, 
      passwordHash, 
      role
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM users WHERE user_id = ?', [id]);
    return rows[0] as UserRow;
  } finally {
    conn.release();
  }
}

export async function findUserByEmail(email: string) {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] as UserRow | undefined;
}

export async function findUserById(user_id: string) {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE user_id = ?', [user_id]);
  return rows[0] as UserRow | undefined;
}

export async function setEmailVerified(user_id: string) {
  await pool.execute('UPDATE users SET email_verified = 1 WHERE user_id = ?', [user_id]);
}

export async function updatePassword(user_id: string, passwordHash: string) {
  await pool.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, user_id]);
}

export async function findUserByGoogleId(google_id: string) {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE google_id = ?', [google_id]);
  return rows[0] as UserRow | undefined;
}

export async function createGoogleUser({
  name,
  email,
  google_id,
  role = 'User'
}: {
  name: string;
  email: string;
  google_id: string;
  role?: 'User' | 'Organizer' | 'Admin';
}) {
  const id = uuidv4();
  const sql = `
    INSERT INTO users (user_id, name, email, google_id, role, email_verified, password_hash) 
    VALUES (?, ?, ?, ?, ?, 1, '')
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [id, name, email, google_id, role]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM users WHERE user_id = ?', [id]);
    return rows[0] as UserRow;
  } finally {
    conn.release();
  }
}

export async function updateUserPlan(user_id: string, user_plan: 'Free' | 'Basic' | 'Premium' | 'Enterprise') {
  await pool.execute('UPDATE users SET user_plan = ? WHERE user_id = ?', [user_plan, user_id]);
}

export async function setMfaSecret(user_id: string, secret: string, backupCodes: string[]) {
  await pool.execute(
    'UPDATE users SET mfa_secret = ?, mfa_backup_codes = ? WHERE user_id = ?',
    [secret, JSON.stringify(backupCodes), user_id]
  );
}

export async function enableMfa(user_id: string) {
  await pool.execute('UPDATE users SET mfa_enabled = 1 WHERE user_id = ?', [user_id]);
}

export async function disableMfa(user_id: string) {
  await pool.execute('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, mfa_backup_codes = NULL WHERE user_id = ?', [user_id]);
}

export async function getAllUsers(page: number = 1, limit: number = 20): Promise<{ users: UserRow[]; total: number; page: number; limit: number }> {
  const safeLimit = Number(limit) || 20;
  const safePage = Number(page) || 1;
  const safeOffset = (safePage - 1) * safeLimit;
  
  // Count total
  const [countRows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) as total FROM users');
  const total = (countRows[0] as any).total;
  
  // Get users
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM users ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`
  );
  
  return {
    users: rows as UserRow[],
    total,
    page: safePage,
    limit: safeLimit
  };
}
