import { Request, Response } from 'express';
import { getTransactionStatistics } from '../repositories/finance.repo.js';
import { getAllBundles, getBundlesByOrganizer } from '../repositories/bundle.repo.js';
import { getEventsByOrganizer, searchEvents } from '../repositories/event.repo.js';
import pool from '../db/db.js';
import { RowDataPacket } from 'mysql2';

export async function getEventStatistics(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;
    const { event_id, organizer_id, date_from, date_to } = req.query;

    let filters: any = {};
    if (date_from) filters.date_from = new Date(date_from as string);
    if (date_to) filters.date_to = new Date(date_to as string);

    // Get event statistics
    let eventStats: any = {};

    if (event_id) {
      const [eventData] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          e.*,
          COUNT(DISTINCT eb.booking_id) as total_bookings,
          COUNT(DISTINCT t.ticket_id) as total_tickets_sold,
          SUM(eb.total_amount) as total_revenue,
          COUNT(DISTINCT CASE WHEN eb.booking_status = 'confirmed' THEN eb.booking_id END) as confirmed_bookings,
          COUNT(DISTINCT CASE WHEN t.is_used = 1 THEN t.ticket_id END) as tickets_used
        FROM events e
        LEFT JOIN event_bookings eb ON e.event_id = eb.event_id
        LEFT JOIN tickets t ON eb.booking_id = t.booking_id
        WHERE e.event_id = ?
        GROUP BY e.event_id`,
        [event_id]
      );

      eventStats = eventData[0] || {};
    } else {
      // Get all events statistics
      const organizerFilter = userRole === 'Admin' ? (organizer_id ? `WHERE e.organizer_id = '${organizer_id}'` : '') : `WHERE e.organizer_id = '${userId}'`;
      
      const [stats] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_events,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_events,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_events,
          SUM(current_attendees) as total_attendees,
          AVG(ticket_price) as average_ticket_price
        FROM events e
        ${organizerFilter}`
      );

      eventStats = stats[0] || {};
    }

    return res.json({
      success: true,
      data: eventStats
    });
  } catch (error) {
    console.error('Get event statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getBundleStatistics(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;
    const { bundle_id, date_from, date_to } = req.query;

    let bundles;
    if (userRole === 'Admin') {
      bundles = await getAllBundles();
    } else {
      bundles = await getBundlesByOrganizer(userId);
    }

    let bundleStats: any = {};

    if (bundle_id) {
      const [bundleData] = await pool.execute<RowDataPacket[]>(
        `SELECT 
          b.*,
          COUNT(be.event_id) as total_events,
          COUNT(DISTINCT ft.transaction_id) as total_purchases,
          SUM(CASE WHEN ft.status = 'completed' THEN ft.amount ELSE 0 END) as total_revenue
        FROM bundles b
        LEFT JOIN bundle_events be ON b.bundle_id = be.bundle_id
        LEFT JOIN financial_transactions ft ON b.bundle_id = ft.bundle_id AND ft.transaction_type = 'payment'
        WHERE b.bundle_id = ?
        GROUP BY b.bundle_id`,
        [bundle_id]
      );

      bundleStats = bundleData[0] || {};
    } else {
      // Aggregate statistics
      bundleStats = {
        total_bundles: bundles.length,
        active_bundles: bundles.filter(b => b.is_active).length,
        total_revenue: 0,
        average_price: bundles.length > 0 
          ? bundles.reduce((sum, b) => sum + parseFloat(b.price.toString()), 0) / bundles.length 
          : 0
      };

      // Get revenue from transactions
      const bundleIds = bundles.map(b => b.bundle_id);
      if (bundleIds.length > 0) {
        const [revenueData] = await pool.execute<RowDataPacket[]>(
          `SELECT SUM(amount) as total_revenue 
           FROM financial_transactions 
           WHERE bundle_id IN (${bundleIds.map(() => '?').join(',')}) 
           AND status = 'completed' 
           AND transaction_type = 'payment'`,
          bundleIds
        );
        bundleStats.total_revenue = (revenueData[0] as any)?.total_revenue || 0;
      }
    }

    return res.json({
      success: true,
      data: bundleStats
    });
  } catch (error) {
    console.error('Get bundle statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getUserStatistics(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;
    const { user_id, date_from, date_to } = req.query;

    if (userRole !== 'Admin' && user_id !== (req as any).userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    const targetUserId = user_id || (req as any).userId;

    // Get user statistics
    const [userStats] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        u.*,
        COUNT(DISTINCT e.event_id) as events_created,
        COUNT(DISTINCT eb.booking_id) as total_bookings,
        COUNT(DISTINCT t.ticket_id) as total_tickets,
        SUM(CASE WHEN ft.transaction_type = 'payment' AND ft.status = 'completed' THEN ft.amount ELSE 0 END) as total_spent,
        COUNT(DISTINCT st.ticket_id) as support_tickets_count
      FROM users u
      LEFT JOIN events e ON u.user_id = e.organizer_id
      LEFT JOIN event_bookings eb ON u.user_id = eb.user_id
      LEFT JOIN tickets t ON eb.booking_id = t.booking_id
      LEFT JOIN financial_transactions ft ON u.user_id = ft.user_id
      LEFT JOIN support_tickets st ON u.user_id = st.user_id
      WHERE u.user_id = ?
      GROUP BY u.user_id`,
      [targetUserId]
    );

    return res.json({
      success: true,
      data: userStats[0] || {}
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getOverallStatistics(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { date_from, date_to } = req.query;

    // User statistics
    const [userStats] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN user_plan = 'Premium' THEN 1 END) as premium_users,
        COUNT(CASE WHEN mfa_enabled = 1 THEN 1 END) as mfa_enabled_users
      FROM users`
    );

    // Event statistics
    const [eventStats] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_events,
        SUM(current_attendees) as total_attendees
      FROM events`
    );

    // Financial statistics
    const financeStats = await getTransactionStatistics({
      date_from: date_from ? new Date(date_from as string) : undefined,
      date_to: date_to ? new Date(date_to as string) : undefined
    });

    // Bundle statistics
    const [bundleStats] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_bundles,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_bundles
      FROM bundles`
    );

    return res.json({
      success: true,
      data: {
        users: userStats[0],
        events: eventStats[0],
        finance: financeStats,
        bundles: bundleStats[0]
      }
    });
  } catch (error) {
    console.error('Get overall statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

