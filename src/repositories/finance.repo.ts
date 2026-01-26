import pool from '../db/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export type FinancialTransactionRow = {
  transaction_id: string;
  user_id?: string;
  event_id?: string;
  bundle_id?: string;
  booking_id?: string;
  transaction_type: 'payment' | 'refund' | 'payout' | 'fee' | 'commission' | 'subscription';
  amount: number;
  currency: string;
  payment_method?: string;
  payment_provider?: string;
  payment_reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description?: string;
  metadata?: string;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export interface TransactionFilters {
  user_id?: string;
  event_id?: string;
  bundle_id?: string;
  transaction_type?: string;
  status?: string;
  date_from?: Date;
  date_to?: Date;
  min_amount?: number;
  max_amount?: number;
}

export interface TransactionListOptions {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'amount' | 'status';
  sort_order?: 'ASC' | 'DESC';
}

export async function createTransaction(transactionData: {
  user_id?: string;
  event_id?: string;
  bundle_id?: string;
  booking_id?: string;
  transaction_type: 'payment' | 'refund' | 'payout' | 'fee' | 'commission' | 'subscription';
  amount: number;
  currency?: string;
  payment_method?: string;
  payment_provider?: string;
  payment_reference?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description?: string;
  metadata?: any;
}): Promise<FinancialTransactionRow> {
  const transaction_id = uuidv4();
  const sql = `
    INSERT INTO financial_transactions (
      transaction_id, user_id, event_id, bundle_id, booking_id, transaction_type,
      amount, currency, payment_method, payment_provider, payment_reference,
      status, description, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, [
      transaction_id,
      transactionData.user_id ?? null,
      transactionData.event_id ?? null,
      transactionData.bundle_id ?? null,
      transactionData.booking_id ?? null,
      transactionData.transaction_type,
      transactionData.amount,
      transactionData.currency || 'USD',
      transactionData.payment_method ?? null,
      transactionData.payment_provider ?? null,
      transactionData.payment_reference ?? null,
      transactionData.status || 'pending',
      transactionData.description ?? null,
      transactionData.metadata ? JSON.stringify(transactionData.metadata) : null
    ]);
    
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM financial_transactions WHERE transaction_id = ?',
      [transaction_id]
    );
    return rows[0] as FinancialTransactionRow;
  } finally {
    conn.release();
  }
}

export async function getTransactionById(transaction_id: string): Promise<FinancialTransactionRow | undefined> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM financial_transactions WHERE transaction_id = ?',
    [transaction_id]
  );
  return rows[0] as FinancialTransactionRow | undefined;
}

export async function getTransactions(
  filters: TransactionFilters = {},
  options: TransactionListOptions = {}
): Promise<{ transactions: any[]; total: number; page: number; limit: number }> {
  const {
    user_id, event_id, bundle_id, transaction_type, status,
    date_from, date_to, min_amount, max_amount
  } = filters;
  
  const {
    page = 1,
    limit = 20,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = options;
  
  const safeLimit = Number(limit) || 20;
  const safePage = Number(page) || 1;
  const safeOffset = (safePage - 1) * safeLimit;
  
  let whereConditions: string[] = [];
  let queryParams: any[] = [];
  
  if (user_id) {
    whereConditions.push('ft.user_id = ?');
    queryParams.push(user_id);
  }
  
  if (event_id) {
    whereConditions.push('ft.event_id = ?');
    queryParams.push(event_id);
  }
  
  if (bundle_id) {
    whereConditions.push('ft.bundle_id = ?');
    queryParams.push(bundle_id);
  }
  
  if (transaction_type) {
    whereConditions.push('ft.transaction_type = ?');
    queryParams.push(transaction_type);
  }
  
  if (status) {
    whereConditions.push('ft.status = ?');
    queryParams.push(status);
  }
  
  if (date_from) {
    whereConditions.push('ft.created_at >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('ft.created_at <= ?');
    queryParams.push(date_to);
  }
  
  if (min_amount !== undefined) {
    whereConditions.push('ft.amount >= ?');
    queryParams.push(min_amount);
  }
  
  if (max_amount !== undefined) {
    whereConditions.push('ft.amount <= ?');
    queryParams.push(max_amount);
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // Count total
  const countSql = `SELECT COUNT(*) as total FROM financial_transactions ft ${whereClause}`;
  const [countRows] = await pool.execute<RowDataPacket[]>(countSql, queryParams);
  const total = (countRows[0] as any).total;
  
  // Get transactions with related data
  const dataSql = `
    SELECT 
      ft.*,
      u.name as user_name,
      u.email as user_email,
      e.title as event_title,
      b.name as bundle_name
    FROM financial_transactions ft
    LEFT JOIN users u ON ft.user_id = u.user_id
    LEFT JOIN events e ON ft.event_id = e.event_id
    LEFT JOIN bundles b ON ft.bundle_id = b.bundle_id
    ${whereClause}
    ORDER BY ft.${sort_by} ${sort_order}
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;
  
  const [transactionRows] = await pool.execute<RowDataPacket[]>(dataSql, queryParams);
  
  return {
    transactions: transactionRows,
    total,
    page: safePage,
    limit: safeLimit
  };
}

export async function updateTransactionStatus(
  transaction_id: string,
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'
): Promise<void> {
  await pool.execute(
    'UPDATE financial_transactions SET status = ?, processed_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
    [status, transaction_id]
  );
}

export async function getTransactionStatistics(filters: TransactionFilters = {}): Promise<any> {
  const { user_id, event_id, date_from, date_to } = filters;
  
  let whereConditions: string[] = [];
  let queryParams: any[] = [];
  
  if (user_id) {
    whereConditions.push('user_id = ?');
    queryParams.push(user_id);
  }
  
  if (event_id) {
    whereConditions.push('event_id = ?');
    queryParams.push(event_id);
  }
  
  if (date_from) {
    whereConditions.push('created_at >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('created_at <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const sql = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN transaction_type = 'payment' AND status = 'completed' THEN amount ELSE 0 END) as total_payments,
      SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END) as total_refunds,
      AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as average_transaction_amount,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
    FROM financial_transactions
    ${whereClause}
  `;
  
  const [rows] = await pool.execute<RowDataPacket[]>(sql, queryParams);
  return rows[0];
}

