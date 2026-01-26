import pool from '../db/db.js';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type EmailSubscriptionRow = {
  subscription_id: string;
  email: string;
  subscribed_at: Date;
  is_active: number;
  unsubscribed_at?: Date;
};

export async function createEmailSubscription(email: string): Promise<EmailSubscriptionRow> {
  const subscriptionId = uuidv4();
  
  const sql = `
    INSERT INTO email_subscriptions (subscription_id, email, is_active)
    VALUES (?, ?, 1)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [subscriptionId, email]);
    
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM email_subscriptions WHERE subscription_id = ?',
      [subscriptionId]
    );
    return rows[0] as EmailSubscriptionRow;
  } finally {
    conn.release();
  }
}

export async function findEmailSubscriptionByEmail(email: string): Promise<EmailSubscriptionRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM email_subscriptions WHERE email = ?',
    [email]
  );
  return rows[0] as EmailSubscriptionRow | undefined;
}

export async function reactivateEmailSubscription(email: string): Promise<void> {
  await pool.execute(
    'UPDATE email_subscriptions SET is_active = 1, unsubscribed_at = NULL WHERE email = ?',
    [email]
  );
}

