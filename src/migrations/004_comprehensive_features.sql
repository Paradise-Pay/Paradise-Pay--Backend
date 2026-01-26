-- Comprehensive Features Migration
-- Includes: User plans, Bundles, Finance, Promo codes, 2FA, Support, Active devices, Deletion requests

-- Add user_plan and other fields to users table
-- Note: These will fail if columns already exist - that's okay, just means migration was already run
ALTER TABLE users ADD COLUMN user_plan ENUM('Free', 'Basic', 'Premium', 'Enterprise') DEFAULT 'Free' AFTER role;
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER email;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255) AFTER mfa_enabled;
ALTER TABLE users ADD COLUMN mfa_backup_codes JSON AFTER mfa_secret;

-- Bundles table
CREATE TABLE IF NOT EXISTS bundles (
  bundle_id CHAR(36) NOT NULL PRIMARY KEY,
  organizer_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_organizer (organizer_id),
  INDEX idx_active (is_active)
);

-- Bundle events (many-to-many relationship)
CREATE TABLE IF NOT EXISTS bundle_events (
  bundle_event_id CHAR(36) NOT NULL PRIMARY KEY,
  bundle_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bundle_id) REFERENCES bundles(bundle_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  UNIQUE KEY unique_bundle_event (bundle_id, event_id),
  INDEX idx_bundle (bundle_id),
  INDEX idx_event (event_id)
);

-- Finance management table
CREATE TABLE IF NOT EXISTS financial_transactions (
  transaction_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36),
  event_id CHAR(36),
  bundle_id CHAR(36),
  booking_id CHAR(36),
  transaction_type ENUM('payment', 'refund', 'payout', 'fee', 'commission', 'subscription') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50),
  payment_reference VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  description TEXT,
  metadata JSON,
  processed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (bundle_id) REFERENCES bundles(bundle_id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES event_bookings(booking_id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_event (event_id),
  INDEX idx_status (status),
  INDEX idx_type (transaction_type),
  INDEX idx_created (created_at)
);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  promo_code_id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  max_uses_per_user INT DEFAULT 1,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  applicable_to ENUM('all', 'events', 'bundles', 'specific_event', 'specific_bundle') DEFAULT 'all',
  applicable_event_id CHAR(36),
  applicable_bundle_id CHAR(36),
  is_active TINYINT(1) DEFAULT 1,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicable_event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (applicable_bundle_id) REFERENCES bundles(bundle_id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_valid_dates (valid_from, valid_until)
);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_usage (
  usage_id CHAR(36) NOT NULL PRIMARY KEY,
  promo_code_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  booking_id CHAR(36),
  transaction_id CHAR(36),
  discount_amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(promo_code_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES event_bookings(booking_id) ON DELETE SET NULL,
  FOREIGN KEY (transaction_id) REFERENCES financial_transactions(transaction_id) ON DELETE SET NULL,
  INDEX idx_promo_code (promo_code_id),
  INDEX idx_user (user_id)
);

-- Active devices tracking
CREATE TABLE IF NOT EXISTS active_devices (
  device_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  device_token VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_last_active (last_active_at)
);

-- Support complaints/tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('technical', 'billing', 'account', 'event', 'general', 'other') DEFAULT 'general',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  assigned_to CHAR(36),
  resolution TEXT,
  resolved_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_priority (priority)
);

-- Support ticket responses
CREATE TABLE IF NOT EXISTS support_ticket_responses (
  response_id CHAR(36) NOT NULL PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  is_internal TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_ticket (ticket_id)
);

-- Account deletion requests
CREATE TABLE IF NOT EXISTS deletion_requests (
  request_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by CHAR(36),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- Bulk email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  campaign_id CHAR(36) NOT NULL PRIMARY KEY,
  created_by CHAR(36) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  recipient_type ENUM('all', 'subscribers', 'users', 'organizers', 'custom') NOT NULL,
  recipient_list JSON,
  status ENUM('draft', 'scheduled', 'sending', 'completed', 'cancelled') DEFAULT 'draft',
  scheduled_at DATETIME,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
);

