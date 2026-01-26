import { Request, Response } from 'express';
import {
  createEmailCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaignStatus,
  incrementCampaignSentCount
} from '../repositories/email-campaign.repo.js';
import { sendEmail } from '../services/email.service.js';
import { getAllUsers } from '../repositories/user.repo.js';
import pool from '../db/db.js';
import { RowDataPacket } from 'mysql2';

async function getAllEmailSubscriptions() {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT email FROM email_subscriptions WHERE is_active = 1'
  );
  return rows.map((row: any) => row.email);
}

export async function createBulkEmailCampaignHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { subject, content, recipient_type, recipient_list, scheduled_at } = req.body;

    if (!subject || !content || !recipient_type) {
      return res.status(400).json({
        success: false,
        message: 'Subject, content, and recipient_type are required',
      });
    }

    const campaign = await createEmailCampaign({
      created_by: (req as any).userId,
      subject,
      content,
      recipient_type,
      recipient_list,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined
    });

    // If not scheduled, send immediately
    if (!scheduled_at) {
      // Send emails in background (don't wait)
      sendBulkEmails(campaign).catch(console.error);
    }

    return res.status(201).json({
      success: true,
      data: campaign,
      message: scheduled_at ? 'Email campaign scheduled successfully' : 'Email campaign created and sending started'
    });
  } catch (error) {
    console.error('Create bulk email campaign error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function sendBulkEmails(campaign: any) {
  try {
    await updateCampaignStatus(campaign.campaign_id, 'sending');

    let recipients: string[] = [];

    switch (campaign.recipient_type) {
      case 'all':
        // Get all users
        const allUsers = await getAllUsers(1, 10000);
        recipients = allUsers.users.map(u => u.email);
        break;
      case 'subscribers':
        recipients = await getAllEmailSubscriptions();
        break;
      case 'users':
        const users = await getAllUsers(1, 10000);
        recipients = users.users.filter(u => u.role === 'User').map(u => u.email);
        break;
      case 'organizers':
        const organizers = await getAllUsers(1, 10000);
        recipients = organizers.users.filter(u => u.role === 'Organizer').map(u => u.email);
        break;
      case 'custom':
        if (campaign.recipient_list) {
          recipients = JSON.parse(campaign.recipient_list);
        }
        break;
    }

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const email of recipients) {
      try {
        await sendEmail(email, campaign.subject, campaign.content);
        sentCount++;
        await incrementCampaignSentCount(campaign.campaign_id, true);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        failedCount++;
        await incrementCampaignSentCount(campaign.campaign_id, false);
      }
    }

    await updateCampaignStatus(campaign.campaign_id, 'completed');
  } catch (error) {
    console.error('Send bulk emails error:', error);
    await updateCampaignStatus(campaign.campaign_id, 'cancelled');
  }
}

export async function getAllCampaignsHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const campaigns = await getAllCampaigns();

    return res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getCampaignHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { campaign_id } = req.params;
    const campaign = await getCampaignById(campaign_id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    return res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function cancelCampaignHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { campaign_id } = req.params;
    await updateCampaignStatus(campaign_id, 'cancelled');

    return res.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel campaign error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

