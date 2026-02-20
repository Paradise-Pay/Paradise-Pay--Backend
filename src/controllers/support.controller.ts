import { Request, Response } from 'express';
import {
  createSupportTicket,
  getTickets,
  getTicketWithResponses,
  updateTicket,
  addTicketResponse
} from '../repositories/support.repo';

export async function createTicketHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { subject, description, category, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required',
      });
    }

    const ticket = await createSupportTicket({
      user_id: userId,
      subject,
      description,
      category,
      priority
    });

    return res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getTicketsHandler(req: Request, res: Response) {
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

    // Non-admin users can only see their own tickets
    if (userRole !== 'Admin') {
      filters.user_id = userId;
    } else {
      if (req.query.user_id) filters.user_id = req.query.user_id as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.priority) filters.priority = req.query.priority as string;
      if (req.query.assigned_to) filters.assigned_to = req.query.assigned_to as string;
    }

    const result = await getTickets(filters, options);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getTicketHandler(req: Request, res: Response) {
  try {
    const { ticket_id } = req.params;
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;

    const ticket = await getTicketWithResponses(ticket_id, userRole === 'Admin');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Non-admin users can only see their own tickets
    if (userRole !== 'Admin' && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function updateTicketHandler(req: Request, res: Response) {
  try {
    const { ticket_id } = req.params;
    const userRole = (req as any).user?.role;
    const updates = req.body;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const updated = await updateTicket(ticket_id, updates);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    return res.json({
      success: true,
      data: updated,
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function addResponseHandler(req: Request, res: Response) {
  try {
    const { ticket_id } = req.params;
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;
    const { message, is_internal } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Only admins can add internal responses
    const internal = userRole === 'Admin' && is_internal;

    const response = await addTicketResponse({
      ticket_id,
      user_id: userId,
      message,
      is_internal: internal
    });

    return res.status(201).json({
      success: true,
      data: response,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Add response error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

