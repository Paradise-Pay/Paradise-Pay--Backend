-- Event Ticketing System Migration
-- Add this to the existing database

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
  external_event_id VARCHAR(255), -- For third-party platform integration
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

-- Ticket types for events (different pricing tiers)
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

-- Individual tickets (one per person)
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
  qr_code_data TEXT NOT NULL, -- Base64 encoded QR code
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
  is_verified TINYINT(1) DEFAULT 0, -- Only verified attendees can review
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
