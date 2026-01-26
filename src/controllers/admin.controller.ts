import { Request, Response } from 'express';
import { getAllUsers, updateUserPlan } from '../repositories/user.repo.js';
import { searchEvents, getAllEventCategories } from '../repositories/event.repo.js';
import { getTransactions, getTransactionStatistics } from '../repositories/finance.repo.js';
import { getAllBundles } from '../repositories/bundle.repo.js';
import pool from '../db/db.js';
import { RowDataPacket } from 'mysql2';

export async function listAllUsers(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getAllUsers(page, limit);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function listAllEvents(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;

    const filters: any = {};
    const options: any = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort_by: (req.query.sort_by as string) || 'created_at',
      sort_order: (req.query.sort_order as 'ASC' | 'DESC') || 'DESC'
    };

    // Non-admin organizers can only see their own events
    if (userRole !== 'Admin') {
      // Get events by organizer
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT e.*, c.name as category_name, u.name as organizer_name 
         FROM events e 
         LEFT JOIN event_categories c ON e.category_id = c.category_id 
         LEFT JOIN users u ON e.organizer_id = u.user_id 
         WHERE e.organizer_id = ? 
         ORDER BY e.created_at DESC 
         LIMIT ${options.limit} OFFSET ${(options.page - 1) * options.limit}`,
        [userId]
      );

      const [countRows] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM events WHERE organizer_id = ?',
        [userId]
      );

      return res.json({
        success: true,
        data: {
          events: rows,
          total: (countRows[0] as any).total,
          page: options.page,
          limit: options.limit
        }
      });
    } else {
      // Admin can see all events
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.organizer_id) {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT e.*, c.name as category_name, u.name as organizer_name 
           FROM events e 
           LEFT JOIN event_categories c ON e.category_id = c.category_id 
           LEFT JOIN users u ON e.organizer_id = u.user_id 
           WHERE e.organizer_id = ? 
           ORDER BY e.created_at DESC 
           LIMIT ${options.limit} OFFSET ${(options.page - 1) * options.limit}`,
          [req.query.organizer_id]
        );

        const [countRows] = await pool.execute<RowDataPacket[]>(
          'SELECT COUNT(*) as total FROM events WHERE organizer_id = ?',
          [req.query.organizer_id]
        );

        return res.json({
          success: true,
          data: {
            events: rows,
            total: (countRows[0] as any).total,
            page: options.page,
            limit: options.limit
          }
        });
      }

      const result = await searchEvents(filters, options);
      return res.json({
        success: true,
        data: result
      });
    }
  } catch (error) {
    console.error('List events error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function updateUserPlanHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { user_id } = req.params;
    const { user_plan } = req.body;

    if (!['Free', 'Basic', 'Premium', 'Enterprise'].includes(user_plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user plan',
      });
    }

    await updateUserPlan(user_id, user_plan);

    return res.json({
      success: true,
      message: 'User plan updated successfully'
    });
  } catch (error) {
    console.error('Update user plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getAdminDashboard(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Get statistics
    const [userStats] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total_users, COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d FROM users'
    );

    const [eventStats] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total_events, COUNT(CASE WHEN status = "published" THEN 1 END) as published_events FROM events'
    );

    const financeStats = await getTransactionStatistics({});

    const [bundleStats] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total_bundles FROM bundles'
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
    console.error('Get admin dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

