-- Email Subscriptions Migration
-- Table for storing email addresses for coming soon page updates

CREATE TABLE IF NOT EXISTS email_subscriptions (
  subscription_id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) DEFAULT 1,
  unsubscribed_at DATETIME NULL,
  INDEX idx_email (email),
  INDEX idx_active (is_active)
);

