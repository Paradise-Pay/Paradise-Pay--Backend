CREATE DATABASE IF NOT EXISTS railway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE railway;

-- users
CREATE TABLE IF NOT EXISTS users (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  mfa_enabled TINYINT(1) DEFAULT 0,
  role ENUM('User','Organizer','Admin') DEFAULT 'User',
  user_plan ENUM('Free', 'Basic', 'Premium', 'Enterprise') DEFAULT 'Free',
  profile_picture_url VARCHAR(500),
  nickname VARCHAR(100),
  email_verified TINYINT(1) DEFAULT 0,
  google_id VARCHAR(255) UNIQUE,
  mfa_secret VARCHAR(255),
  mfa_backup_codes JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- refresh tokens (revocable)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  revoked TINYINT(1) DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- digital cards
CREATE TABLE IF NOT EXISTS digital_cards (
  card_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  card_number VARCHAR(32) NOT NULL UNIQUE,
  qr_code_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  meta JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id)
);

-- ========== Event Ticketing System (from 002) ==========
-- Categories for events
CREATE TABLE IF NOT EXISTS event_categories (
  category_id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  organizer_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  venue_name VARCHAR(255) NOT NULL,
  venue_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  event_date DATETIME NOT NULL,
  event_end_date DATETIME,
  registration_start_date DATETIME,
  registration_end_date DATETIME,
  max_attendees INT DEFAULT NULL,
  current_attendees INT DEFAULT 0,
  ticket_price DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  event_image_url VARCHAR(500),
  event_banner_url VARCHAR(500),
  status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft',
  is_featured TINYINT(1) DEFAULT 0,
  tags JSON,
  external_event_id VARCHAR(255),
  external_platform ENUM('ticketmaster', 'eventbrite', 'none') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES event_categories(category_id) ON DELETE RESTRICT,
  INDEX idx_event_date (event_date),
  INDEX idx_city (city),
  INDEX idx_status (status),
  INDEX idx_external (external_event_id, external_platform)
);

-- Ticket types for events
CREATE TABLE IF NOT EXISTS ticket_types (
  ticket_type_id CHAR(36) NOT NULL PRIMARY KEY,
  event_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  available_quantity INT NOT NULL,
  sold_quantity INT DEFAULT 0,
  sales_start_date DATETIME,
  sales_end_date DATETIME,
  max_per_user INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  INDEX idx_event_active (event_id, is_active)
);

-- User ticket purchases/bookings
CREATE TABLE IF NOT EXISTS event_bookings (
  booking_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  ticket_type_id CHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'refunded') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  booking_reference VARCHAR(50) NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(ticket_type_id) ON DELETE CASCADE,
  INDEX idx_user_bookings (user_id),
  INDEX idx_event_bookings (event_id),
  INDEX idx_booking_reference (booking_reference)
);

-- Individual tickets
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  ticket_type_id CHAR(36) NOT NULL,
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  attendee_name VARCHAR(255) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  attendee_phone VARCHAR(30),
  qr_code VARCHAR(500) NOT NULL,
  qr_code_data TEXT NOT NULL,
  is_used TINYINT(1) DEFAULT 0,
  used_at DATETIME NULL,
  seat_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES event_bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(ticket_type_id) ON DELETE CASCADE,
  INDEX idx_user_tickets (user_id),
  INDEX idx_event_tickets (event_id),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_qr_code (qr_code)
);

-- Event favorites/bookmarks
CREATE TABLE IF NOT EXISTS event_favorites (
  favorite_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_event (user_id, event_id)
);

-- Event reviews and ratings
CREATE TABLE IF NOT EXISTS event_reviews (
  review_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_event_review (user_id, event_id),
  INDEX idx_event_rating (event_id, rating)
);

-- Insert default event categories
INSERT IGNORE INTO event_categories (category_id, name, description, icon_url) VALUES
(UUID(), 'Music', 'Concerts, festivals, and musical performances', 'https://example.com/icons/music.svg'),
(UUID(), 'Sports', 'Sports events, games, and tournaments', 'https://example.com/icons/sports.svg'),
(UUID(), 'Technology', 'Tech conferences, meetups, and workshops', 'https://example.com/icons/tech.svg'),
(UUID(), 'Food & Drink', 'Food festivals, wine tastings, and culinary events', 'https://example.com/icons/food.svg'),
(UUID(), 'Arts & Culture', 'Art exhibitions, theater, and cultural events', 'https://example.com/icons/arts.svg'),
(UUID(), 'Business', 'Business conferences, networking events, and seminars', 'https://example.com/icons/business.svg'),
(UUID(), 'Education', 'Educational workshops, courses, and training', 'https://example.com/icons/education.svg'),
(UUID(), 'Health & Wellness', 'Fitness events, wellness retreats, and health seminars', 'https://example.com/icons/wellness.svg'),
(UUID(), 'Entertainment', 'Comedy shows, magic shows, and entertainment events', 'https://example.com/icons/entertainment.svg'),
(UUID(), 'Community', 'Local community events, fundraisers, and gatherings', 'https://example.com/icons/community.svg');

-- ========== Comprehensive Features (from 004) ==========
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
