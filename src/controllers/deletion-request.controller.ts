import { Request, Response } from 'express';
import {
  createDeletionRequest,
  getDeletionRequestByUserId,
  getAllDeletionRequests,
  updateDeletionRequest
} from '../repositories/deletion-request.repo';
import pool from '../db/db';

export async function createDeletionRequestHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { reason } = req.body;

    // Check if there's already a pending request
    const existing = await getDeletionRequestByUserId(userId);
    if (existing && existing.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending deletion request',
      });
    }

    const request = await createDeletionRequest({
      user_id: userId,
      reason
    });

    return res.status(201).json({
      success: true,
      data: request,
      message: 'Deletion request submitted successfully. Our team will review it shortly.'
    });
  } catch (error) {
    console.error('Create deletion request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getDeletionRequestHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;

    if (userRole === 'Admin') {
      const status = req.query.status as string;
      const requests = await getAllDeletionRequests(status);
      return res.json({
        success: true,
        data: requests
      });
    } else {
      const request = await getDeletionRequestByUserId(userId);
      return res.json({
        success: true,
        data: request || null
      });
    }
  } catch (error) {
    console.error('Get deletion request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function processDeletionRequestHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;
    const adminId = (req as any).userId;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { request_id } = req.params;
    const { status, delete_user } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected',
      });
    }

    await updateDeletionRequest(request_id, status, adminId);

    // If approved and delete_user is true, delete the user account
    if (status === 'approved' && delete_user) {
      // Get the request to find user_id
      const [requestRows] = await pool.execute(
        'SELECT user_id FROM deletion_requests WHERE request_id = ?',
        [request_id]
      );
      const request = (requestRows as any[])[0];

      if (request) {
        // Delete user (cascade will handle related records)
        await pool.execute('DELETE FROM users WHERE user_id = ?', [request.user_id]);
        
        // Update request status to completed
        await updateDeletionRequest(request_id, 'completed', adminId);
      }
    }

    return res.json({
      success: true,
      message: `Deletion request ${status} successfully`
    });
  } catch (error) {
    console.error('Process deletion request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

