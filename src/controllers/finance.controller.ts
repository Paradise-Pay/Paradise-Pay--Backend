import { Request, Response } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionStatistics,
  updateTransactionStatus
} from '../repositories/finance.repo';

export async function getTransactionsHandler(req: Request, res: Response) {
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

    // Non-admin users can only see their own transactions
    if (userRole !== 'Admin') {
      filters.user_id = userId;
    } else {
      // Admins can filter by user
      if (req.query.user_id) {
        filters.user_id = req.query.user_id as string;
      }
    }

    if (req.query.event_id) filters.event_id = req.query.event_id as string;
    if (req.query.bundle_id) filters.bundle_id = req.query.bundle_id as string;
    if (req.query.transaction_type) filters.transaction_type = req.query.transaction_type as string;
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.date_from) filters.date_from = new Date(req.query.date_from as string);
    if (req.query.date_to) filters.date_to = new Date(req.query.date_to as string);
    if (req.query.min_amount) filters.min_amount = parseFloat(req.query.min_amount as string);
    if (req.query.max_amount) filters.max_amount = parseFloat(req.query.max_amount as string);

    const result = await getTransactions(filters, options);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getTransactionStatisticsHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;
    
    const filters: any = {};

    // Non-admin users can only see their own statistics
    if (userRole !== 'Admin') {
      filters.user_id = userId;
    } else {
      if (req.query.user_id) filters.user_id = req.query.user_id as string;
    }

    if (req.query.event_id) filters.event_id = req.query.event_id as string;
    if (req.query.date_from) filters.date_from = new Date(req.query.date_from as string);
    if (req.query.date_to) filters.date_to = new Date(req.query.date_to as string);

    const statistics = await getTransactionStatistics(filters);

    return res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get transaction statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function updateTransactionStatusHandler(req: Request, res: Response) {
  try {
    const { transaction_id } = req.params;
    const { status } = req.body;
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    if (!['pending', 'completed', 'failed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    await updateTransactionStatus(transaction_id, status);

    return res.json({
      success: true,
      message: 'Transaction status updated successfully'
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

