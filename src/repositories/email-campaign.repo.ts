import pool from '../db/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type EmailCampaignRow = {
  campaign_id: string;
  created_by: string;
  subject: string;
  content: string;
  recipient_type: 'all' | 'subscribers' | 'users' | 'organizers' | 'custom';
  recipient_list?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  scheduled_at?: Date;
  sent_count: number;
  failed_count: number;
  created_at: Date;
  updated_at: Date;
};

export async function createEmailCampaign(campaignData: {
  created_by: string;
  subject: string;
  content: string;
  recipient_type: 'all' | 'subscribers' | 'users' | 'organizers' | 'custom';
  recipient_list?: string[];
  scheduled_at?: Date;
}): Promise<EmailCampaignRow> {
  const campaign_id = uuidv4();
  const sql = `
    INSERT INTO email_campaigns (
      campaign_id, created_by, subject, content, recipient_type, recipient_list, scheduled_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      campaign_id,
      campaignData.created_by,
      campaignData.subject,
      campaignData.content,
      campaignData.recipient_type,
      campaignData.recipient_list ? JSON.stringify(campaignData.recipient_list) : null,
      campaignData.scheduled_at ?? null
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM email_campaigns WHERE campaign_id = ?',
      [campaign_id]
    );
    return rows[0] as EmailCampaignRow;
  } finally {
    conn.release();
  }
}

export async function getCampaignById(campaign_id: string): Promise<EmailCampaignRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM email_campaigns WHERE campaign_id = ?',
    [campaign_id]
  );
  return rows[0] as EmailCampaignRow | undefined;
}

export async function getAllCampaigns(): Promise<EmailCampaignRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM email_campaigns ORDER BY created_at DESC'
  );
  return rows as EmailCampaignRow[];
}

export async function updateCampaignStatus(
  campaign_id: string,
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled'
): Promise<void> {
  await pool.execute(
    'UPDATE email_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?',
    [status, campaign_id]
  );
}

export async function incrementCampaignSentCount(campaign_id: string, success: boolean = true): Promise<void> {
  if (success) {
    await pool.execute(
      'UPDATE email_campaigns SET sent_count = sent_count + 1 WHERE campaign_id = ?',
      [campaign_id]
    );
  } else {
    await pool.execute(
      'UPDATE email_campaigns SET failed_count = failed_count + 1 WHERE campaign_id = ?',
      [campaign_id]
    );
  }
}

