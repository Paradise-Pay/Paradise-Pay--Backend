import pool from '../db/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type PromoCodeRow = {
  promo_code_id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  max_uses_per_user: number;
  valid_from: Date;
  valid_until: Date;
  applicable_to: 'all' | 'events' | 'bundles' | 'specific_event' | 'specific_bundle';
  applicable_event_id?: string;
  applicable_bundle_id?: string;
  is_active: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
};

export type PromoCodeUsageRow = {
  usage_id: string;
  promo_code_id: string;
  user_id: string;
  booking_id?: string;
  transaction_id?: string;
  discount_amount: number;
  used_at: Date;
};

export async function createPromoCode(promoData: {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  max_uses_per_user?: number;
  valid_from: Date;
  valid_until: Date;
  applicable_to?: 'all' | 'events' | 'bundles' | 'specific_event' | 'specific_bundle';
  applicable_event_id?: string;
  applicable_bundle_id?: string;
  created_by?: string;
}): Promise<PromoCodeRow> {
  const promo_code_id = uuidv4();
  const sql = `
    INSERT INTO promo_codes (
      promo_code_id, code, description, discount_type, discount_value,
      min_purchase_amount, max_discount_amount, usage_limit, max_uses_per_user,
      valid_from, valid_until, applicable_to, applicable_event_id, applicable_bundle_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      promo_code_id,
      promoData.code.toUpperCase(),
      promoData.description ?? null,
      promoData.discount_type,
      promoData.discount_value,
      promoData.min_purchase_amount ?? 0,
      promoData.max_discount_amount ?? null,
      promoData.usage_limit ?? null,
      promoData.max_uses_per_user ?? 1,
      promoData.valid_from,
      promoData.valid_until,
      promoData.applicable_to || 'all',
      promoData.applicable_event_id ?? null,
      promoData.applicable_bundle_id ?? null,
      promoData.created_by ?? null
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM promo_codes WHERE promo_code_id = ?', [promo_code_id]);
    return rows[0] as PromoCodeRow;
  } finally {
    conn.release();
  }
}

export async function getPromoCodeByCode(code: string): Promise<PromoCodeRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM promo_codes WHERE code = ?',
    [code.toUpperCase()]
  );
  return rows[0] as PromoCodeRow | undefined;
}

export async function getPromoCodeById(promo_code_id: string): Promise<PromoCodeRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM promo_codes WHERE promo_code_id = ?',
    [promo_code_id]
  );
  return rows[0] as PromoCodeRow | undefined;
}

export async function getAllPromoCodes(): Promise<PromoCodeRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM promo_codes ORDER BY created_at DESC'
  );
  return rows as PromoCodeRow[];
}

export async function validatePromoCode(
  code: string,
  user_id: string,
  amount: number,
  event_id?: string,
  bundle_id?: string
): Promise<{ valid: boolean; promo_code?: PromoCodeRow; discount_amount?: number; error?: string }> {
  const promoCode = await getPromoCodeByCode(code);
  
  if (!promoCode) {
    return { valid: false, error: 'Promo code not found' };
  }
  
  if (!promoCode.is_active) {
    return { valid: false, error: 'Promo code is not active' };
  }
  
  const now = new Date();
  if (now < new Date(promoCode.valid_from)) {
    return { valid: false, error: 'Promo code is not yet valid' };
  }
  
  if (now > new Date(promoCode.valid_until)) {
    return { valid: false, error: 'Promo code has expired' };
  }
  
  if (amount < promoCode.min_purchase_amount) {
    return { valid: false, error: `Minimum purchase amount of ${promoCode.min_purchase_amount} required` };
  }
  
  if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
    return { valid: false, error: 'Promo code usage limit reached' };
  }
  
  // Check applicability
  if (promoCode.applicable_to === 'specific_event' && promoCode.applicable_event_id !== event_id) {
    return { valid: false, error: 'Promo code is not applicable to this event' };
  }
  
  if (promoCode.applicable_to === 'specific_bundle' && promoCode.applicable_bundle_id !== bundle_id) {
    return { valid: false, error: 'Promo code is not applicable to this bundle' };
  }
  
  if (promoCode.applicable_to === 'events' && !event_id) {
    return { valid: false, error: 'Promo code is only applicable to events' };
  }
  
  if (promoCode.applicable_to === 'bundles' && !bundle_id) {
    return { valid: false, error: 'Promo code is only applicable to bundles' };
  }
  
  // Check user usage limit
  const [usageRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM promo_code_usage WHERE promo_code_id = ? AND user_id = ?',
    [promoCode.promo_code_id, user_id]
  );
  const userUsageCount = (usageRows[0] as any).count;
  
  if (userUsageCount >= promoCode.max_uses_per_user) {
    return { valid: false, error: 'You have reached the maximum usage limit for this promo code' };
  }
  
  // Calculate discount
  let discountAmount = 0;
  if (promoCode.discount_type === 'percentage') {
    discountAmount = (amount * promoCode.discount_value) / 100;
    if (promoCode.max_discount_amount && discountAmount > promoCode.max_discount_amount) {
      discountAmount = promoCode.max_discount_amount;
    }
  } else {
    discountAmount = promoCode.discount_value;
  }
  
  return { valid: true, promo_code: promoCode, discount_amount: discountAmount };
}

export async function recordPromoCodeUsage(
  promo_code_id: string,
  user_id: string,
  discount_amount: number,
  booking_id?: string,
  transaction_id?: string
): Promise<void> {
  const usage_id = uuidv4();
  await pool.execute(
    'INSERT INTO promo_code_usage (usage_id, promo_code_id, user_id, booking_id, transaction_id, discount_amount) VALUES (?, ?, ?, ?, ?, ?)',
    [usage_id, promo_code_id, user_id, booking_id ?? null, transaction_id ?? null, discount_amount]
  );
  
  // Increment usage count
  await pool.execute(
    'UPDATE promo_codes SET used_count = used_count + 1 WHERE promo_code_id = ?',
    [promo_code_id]
  );
}

export async function updatePromoCode(promo_code_id: string, updates: Partial<PromoCodeRow>): Promise<PromoCodeRow | undefined> {
  const allowedFields = ['description', 'discount_value', 'min_purchase_amount', 'max_discount_amount', 'usage_limit', 'valid_from', 'valid_until', 'is_active'];
  const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
  const values = updateFields.map(field => (updates as any)[field]);
  
  const sql = `UPDATE promo_codes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE promo_code_id = ?`;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [...values, promo_code_id]);
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM promo_codes WHERE promo_code_id = ?', [promo_code_id]);
    return rows[0] as PromoCodeRow | undefined;
  } finally {
    conn.release();
  }
}

export async function deletePromoCode(promo_code_id: string): Promise<boolean> {
  const sql = 'DELETE FROM promo_codes WHERE promo_code_id = ?';
  const [result] = await pool.execute<ResultSetHeader>(sql, [promo_code_id]);
  return result.affectedRows > 0;
}

