import { Request, Response } from 'express';
import {
  createPromoCode,
  getAllPromoCodes,
  getPromoCodeById,
  validatePromoCode,
  updatePromoCode,
  deletePromoCode
} from '../repositories/promo-code.repo';

export async function createPromoCodeHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const {
      code,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      max_uses_per_user,
      valid_from,
      valid_until,
      applicable_to,
      applicable_event_id,
      applicable_bundle_id
    } = req.body;

    if (!code || !discount_type || !discount_value || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const promoCode = await createPromoCode({
      code,
      description,
      discount_type,
      discount_value: parseFloat(discount_value),
      min_purchase_amount: min_purchase_amount ? parseFloat(min_purchase_amount) : 0,
      max_discount_amount: max_discount_amount ? parseFloat(max_discount_amount) : undefined,
      usage_limit: usage_limit ? parseInt(usage_limit) : undefined,
      max_uses_per_user: max_uses_per_user ? parseInt(max_uses_per_user) : 1,
      valid_from: new Date(valid_from),
      valid_until: new Date(valid_until),
      applicable_to: applicable_to || 'all',
      applicable_event_id,
      applicable_bundle_id,
      created_by: (req as any).userId
    });

    return res.status(201).json({
      success: true,
      data: promoCode,
      message: 'Promo code created successfully'
    });
  } catch (error: any) {
    console.error('Create promo code error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Promo code already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getAllPromoCodesHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const promoCodes = await getAllPromoCodes();

    return res.json({
      success: true,
      data: promoCodes
    });
  } catch (error) {
    console.error('Get promo codes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function validatePromoCodeHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { code, amount, event_id, bundle_id } = req.body;

    if (!code || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Code and amount are required',
      });
    }

    const validation = await validatePromoCode(
      code,
      userId,
      parseFloat(amount),
      event_id,
      bundle_id
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    return res.json({
      success: true,
      data: {
        promo_code: validation.promo_code,
        discount_amount: validation.discount_amount,
        final_amount: parseFloat(amount) - (validation.discount_amount || 0)
      }
    });
  } catch (error) {
    console.error('Validate promo code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function updatePromoCodeHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { promo_code_id } = req.params;
    const updates = req.body;

    const updated = await updatePromoCode(promo_code_id, updates);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
      });
    }

    return res.json({
      success: true,
      data: updated,
      message: 'Promo code updated successfully'
    });
  } catch (error) {
    console.error('Update promo code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function deletePromoCodeHandler(req: Request, res: Response) {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { promo_code_id } = req.params;

    const deleted = await deletePromoCode(promo_code_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
      });
    }

    return res.json({
      success: true,
      message: 'Promo code deleted successfully'
    });
  } catch (error) {
    console.error('Delete promo code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

