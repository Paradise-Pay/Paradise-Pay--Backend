import pool from '../db/db.js';
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
  created_at: Date;
  updated_at: Date;
};

export async function createUser({ name, email, phone, passwordHash, role = 'User' }: { name: string; email: string; phone?: string; passwordHash: string; role?: 'User'|'Organizer'|'Admin'; }) {
  const id = uuidv4();
  const sql = `INSERT INTO users (user_id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`;
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [id, name, email, phone ?? null, passwordHash, role]);
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
