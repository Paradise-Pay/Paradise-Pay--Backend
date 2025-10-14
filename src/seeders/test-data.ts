import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Quick test data seeder for development and testing
 * Creates minimal data for testing specific features
 */

export async function seedTestData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });
  
  try {
    console.log('🧪 Seeding test data...');

    // Create a test organizer
    await conn.execute(
      'INSERT INTO users (user_id, name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      ['test-organizer', 'Test Organizer', 'organizer@test.com', 'hashed_password', 'Organizer', 1]
    );

    // Create a test user
    await conn.execute(
      'INSERT INTO users (user_id, name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      ['test-user', 'Test User', 'user@test.com', 'hashed_password', 'User', 1]
    );

    // Create test event categories
    await conn.execute(
      'INSERT INTO event_categories (category_id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      ['test-cat-1', 'Test Music', 'Test music category']
    );

    // Create a test event
    await conn.execute(
      `INSERT INTO events (
        event_id, organizer_id, category_id, title, description, venue_name, 
        venue_address, city, country, event_date, max_attendees, 
        ticket_price, currency, status, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [
        'test-event-1', 'test-organizer', 'test-cat-1', 'Test Event',
        'A test event for development', 'Test Venue', '123 Test St',
        'Test City', 'Test Country', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        100, 50.00, 'USD', 'published', 1
      ]
    );

    // Create test ticket type
    await conn.execute(
      `INSERT INTO ticket_types (
        ticket_type_id, event_id, name, description, price, currency,
        available_quantity, sold_quantity, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [
        'test-ticket-type-1', 'test-event-1', 'General Admission',
        'Test ticket type', 50.00, 'USD', 100, 0, 1
      ]
    );

    console.log('✅ Test data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

export async function clearTestData() {
  const conn = await pool.getConnection();
  
  try {
    console.log('🧹 Clearing test data...');

    const testIds = ['test-organizer', 'test-user', 'test-event-1', 'test-cat-1', 'test-ticket-type-1'];
    
    await conn.execute('DELETE FROM tickets WHERE user_id IN (?) OR event_id IN (?)', [testIds, testIds]);
    await conn.execute('DELETE FROM event_bookings WHERE user_id IN (?) OR event_id IN (?)', [testIds, testIds]);
    await conn.execute('DELETE FROM ticket_types WHERE event_id IN (?)', [testIds]);
    await conn.execute('DELETE FROM events WHERE event_id IN (?)', [testIds]);
    await conn.execute('DELETE FROM event_categories WHERE category_id IN (?)', [testIds]);
    await conn.execute('DELETE FROM users WHERE user_id IN (?)', [testIds]);

    console.log('✅ Test data cleared');
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

export async function createTestBooking() {
  const conn = await pool.getConnection();
  
  try {
    const bookingId = uuidv4();
    const ticketId = uuidv4();
    const ticketNumber = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create test booking
    await conn.execute(
      `INSERT INTO event_bookings (
        booking_id, user_id, event_id, ticket_type_id, quantity, total_amount,
        currency, booking_status, payment_status, booking_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId, 'test-user', 'test-event-1', 'test-ticket-type-1',
        1, 50.00, 'USD', 'confirmed', 'paid', `PP${Date.now()}`
      ]
    );

    // Create test ticket
    await conn.execute(
      `INSERT INTO tickets (
        ticket_id, booking_id, user_id, event_id, ticket_type_id, ticket_number,
        attendee_name, attendee_email, qr_code, qr_code_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId, bookingId, 'test-user', 'test-event-1', 'test-ticket-type-1',
        ticketNumber, 'Test Attendee', 'test@example.com', ticketNumber,
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      ]
    );

    // Update ticket type sold quantity
    await conn.execute(
      'UPDATE ticket_types SET sold_quantity = sold_quantity + 1 WHERE ticket_type_id = ?',
      ['test-ticket-type-1']
    );

    console.log(`✅ Test booking created: ${bookingId}`);
    return { bookingId, ticketId, ticketNumber };
  } catch (error) {
    console.error('❌ Error creating test booking:', error);
    throw error;
  } finally {
    await conn.end();
  }
}
