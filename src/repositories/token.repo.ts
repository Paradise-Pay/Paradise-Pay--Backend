import pool from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function storeRefreshToken(userId: string, token: string, expiresAt: Date) {
  const id = uuidv4();
  // store hash of token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.execute(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [id, userId, tokenHash, expiresAt]
  );
  return id;
}

export async function revokeRefreshTokenByHash(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash]);
}

export async function findRefreshToken(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await pool.execute('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0', [tokenHash]);
  return (rows as any[])[0];
}
