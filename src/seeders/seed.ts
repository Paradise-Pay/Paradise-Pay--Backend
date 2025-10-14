import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  let conn;
  try {
    // Connect directly to the database instead of using the pool
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database');

    // Clear existing data (in reverse order of dependencies)
    await clearExistingData(conn);
    
    // Seed data
    await seedUsers(conn);
    await seedEventCategories(conn);
    await seedEvents(conn);
    await seedTicketTypes(conn);
    await seedEventBookings(conn);
    await seedTickets(conn);
    await seedEventFavorites(conn);
    await seedEventReviews(conn);
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

async function clearExistingData(conn: any) {
  console.log('🧹 Clearing existing data...');
  
  const tables = [
    'event_reviews',
    'event_favorites', 
    'tickets',
    'event_bookings',
    'ticket_types',
    'events',
    'event_categories',
    'refresh_tokens',
    'digital_cards',
    'users'
  ];
  
  for (const table of tables) {
    await conn.execute(`DELETE FROM ${table}`);
  }
  
  // Reset auto increment counters
  await conn.execute('ALTER TABLE users AUTO_INCREMENT = 1');
  await conn.execute('ALTER TABLE events AUTO_INCREMENT = 1');
  await conn.execute('ALTER TABLE event_categories AUTO_INCREMENT = 1');
  
  console.log('✅ Existing data cleared');
}

async function seedUsers(conn: any) {
  console.log('👥 Seeding users...');
  
  const BCRYPT_SALT_ROUNDS = 12;
  const users = [
    {
      user_id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      password_hash: await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS),
      role: 'User',
      email_verified: 1,
      nickname: 'Johnny'
    },
    {
      user_id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1234567891',
      password_hash: await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS),
      role: 'User',
      email_verified: 1,
      nickname: 'Jane'
    },
    {
      user_id: 'organizer-1',
      name: 'Event Organizer',
      email: 'organizer@example.com',
      phone: '+1234567892',
      password_hash: await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS),
      role: 'Organizer',
      email_verified: 1,
      nickname: 'EventMaster'
    },
    {
      user_id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '+1234567893',
      password_hash: await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS),
      role: 'Admin',
      email_verified: 1,
      nickname: 'Admin'
    }
  ];

  for (const user of users) {
    await conn.execute(
      'INSERT INTO users (user_id, name, email, phone, password_hash, role, email_verified, nickname) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.user_id, user.name, user.email, user.phone, user.password_hash, user.role, user.email_verified, user.nickname]
    );
  }

  // Create digital cards for users
  await conn.execute('INSERT INTO digital_cards (card_id, user_id, card_number) VALUES (?, ?, ?)', 
    [uuidv4(), 'user-1', 'PP123456789']);
  await conn.execute('INSERT INTO digital_cards (card_id, user_id, card_number) VALUES (?, ?, ?)', 
    [uuidv4(), 'user-2', 'PP123456790']);
  await conn.execute('INSERT INTO digital_cards (card_id, user_id, card_number) VALUES (?, ?, ?)', 
    [uuidv4(), 'organizer-1', 'PP123456791']);

  console.log('✅ Users seeded');
}

async function seedEventCategories(conn: any) {
  console.log('📂 Seeding event categories...');
  
  const categories = [
    { category_id: 'cat-1', name: 'Music', description: 'Concerts, festivals, and musical performances', icon_url: 'https://example.com/icons/music.svg' },
    { category_id: 'cat-2', name: 'Sports', description: 'Sports events, games, and tournaments', icon_url: 'https://example.com/icons/sports.svg' },
    { category_id: 'cat-3', name: 'Technology', description: 'Tech conferences, meetups, and workshops', icon_url: 'https://example.com/icons/tech.svg' },
    { category_id: 'cat-4', name: 'Food & Drink', description: 'Food festivals, wine tastings, and culinary events', icon_url: 'https://example.com/icons/food.svg' },
    { category_id: 'cat-5', name: 'Arts & Culture', description: 'Art exhibitions, theater, and cultural events', icon_url: 'https://example.com/icons/arts.svg' }
  ];

  for (const category of categories) {
    await conn.execute(
      'INSERT INTO event_categories (category_id, name, description, icon_url) VALUES (?, ?, ?, ?)',
      [category.category_id, category.name, category.description, category.icon_url]
    );
  }

  console.log('✅ Event categories seeded');
}

async function seedEvents(conn: any) {
  console.log('🎉 Seeding events...');
  
  const events = [
    {
      event_id: 'event-1',
      organizer_id: 'organizer-1',
      category_id: 'cat-1',
      title: 'Summer Music Festival 2024',
      description: 'An amazing summer music festival featuring top artists from around the world',
      venue_name: 'Central Park',
      venue_address: '123 Music Ave, New York, NY',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      latitude: 40.7589,
      longitude: -73.9851,
      event_date: new Date('2024-07-15T18:00:00Z'),
      event_end_date: new Date('2024-07-15T23:00:00Z'),
      registration_start_date: new Date('2024-06-01T00:00:00Z'),
      registration_end_date: new Date('2024-07-14T23:59:59Z'),
      max_attendees: 1000,
      current_attendees: 150,
      ticket_price: 75.00,
      currency: 'USD',
      event_image_url: 'https://example.com/images/summer-fest.jpg',
      event_banner_url: 'https://example.com/images/summer-fest-banner.jpg',
      status: 'published',
      is_featured: 1,
      tags: JSON.stringify(['music', 'festival', 'summer']),
      external_platform: 'none'
    },
    {
      event_id: 'event-2',
      organizer_id: 'organizer-1',
      category_id: 'cat-2',
      title: 'NBA Finals Watch Party',
      description: 'Watch the NBA Finals with fellow basketball fans in an exciting atmosphere',
      venue_name: 'Sports Bar Downtown',
      venue_address: '456 Sports St, Los Angeles, CA',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      latitude: 34.0522,
      longitude: -118.2437,
      event_date: new Date('2024-06-20T20:00:00Z'),
      event_end_date: new Date('2024-06-20T23:30:00Z'),
      registration_start_date: new Date('2024-06-01T00:00:00Z'),
      registration_end_date: new Date('2024-06-19T23:59:59Z'),
      max_attendees: 200,
      current_attendees: 45,
      ticket_price: 25.00,
      currency: 'USD',
      event_image_url: 'https://example.com/images/nba-watch-party.jpg',
      event_banner_url: 'https://example.com/images/nba-watch-party-banner.jpg',
      status: 'published',
      is_featured: 0,
      tags: JSON.stringify(['sports', 'basketball', 'watch-party']),
      external_platform: 'none'
    },
    {
      event_id: 'event-3',
      organizer_id: 'organizer-1',
      category_id: 'cat-3',
      title: 'Tech Conference 2024',
      description: 'Annual technology conference featuring the latest innovations and networking opportunities',
      venue_name: 'Convention Center',
      venue_address: '789 Tech Blvd, San Francisco, CA',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      latitude: 37.7749,
      longitude: -122.4194,
      event_date: new Date('2024-08-10T09:00:00Z'),
      event_end_date: new Date('2024-08-12T17:00:00Z'),
      registration_start_date: new Date('2024-07-01T00:00:00Z'),
      registration_end_date: new Date('2024-08-09T23:59:59Z'),
      max_attendees: 500,
      current_attendees: 200,
      ticket_price: 299.00,
      currency: 'USD',
      event_image_url: 'https://example.com/images/tech-conference.jpg',
      event_banner_url: 'https://example.com/images/tech-conference-banner.jpg',
      status: 'published',
      is_featured: 1,
      tags: JSON.stringify(['technology', 'conference', 'networking']),
      external_platform: 'none'
    }
  ];

  for (const event of events) {
    await conn.execute(
      `INSERT INTO events (
        event_id, organizer_id, category_id, title, description, venue_name, 
        venue_address, city, state, country, latitude, longitude, event_date, 
        event_end_date, registration_start_date, registration_end_date, 
        max_attendees, current_attendees, ticket_price, currency, event_image_url, 
        event_banner_url, status, is_featured, tags, external_platform
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.event_id, event.organizer_id, event.category_id, event.title, event.description,
        event.venue_name, event.venue_address, event.city, event.state, event.country,
        event.latitude, event.longitude, event.event_date, event.event_end_date,
        event.registration_start_date, event.registration_end_date, event.max_attendees,
        event.current_attendees, event.ticket_price, event.currency, event.event_image_url,
        event.event_banner_url, event.status, event.is_featured, event.tags, event.external_platform
      ]
    );
  }

  console.log('✅ Events seeded');
}

async function seedTicketTypes(conn: any) {
  console.log('🎫 Seeding ticket types...');
  
  const ticketTypes = [
    {
      ticket_type_id: 'ticket-type-1',
      event_id: 'event-1',
      name: 'General Admission',
      description: 'Standard entry ticket for the music festival',
      price: 75.00,
      currency: 'USD',
      available_quantity: 500,
      sold_quantity: 150,
      sales_start_date: new Date('2024-06-01T00:00:00Z'),
      sales_end_date: new Date('2024-07-14T23:59:59Z'),
      max_per_user: 4,
      is_active: 1
    },
    {
      ticket_type_id: 'ticket-type-2',
      event_id: 'event-1',
      name: 'VIP Pass',
      description: 'VIP access with premium seating and amenities',
      price: 150.00,
      currency: 'USD',
      available_quantity: 100,
      sold_quantity: 25,
      sales_start_date: new Date('2024-06-01T00:00:00Z'),
      sales_end_date: new Date('2024-07-14T23:59:59Z'),
      max_per_user: 2,
      is_active: 1
    },
    {
      ticket_type_id: 'ticket-type-3',
      event_id: 'event-2',
      name: 'Standard Entry',
      description: 'Entry to the NBA watch party',
      price: 25.00,
      currency: 'USD',
      available_quantity: 200,
      sold_quantity: 45,
      sales_start_date: new Date('2024-06-01T00:00:00Z'),
      sales_end_date: new Date('2024-06-19T23:59:59Z'),
      max_per_user: 6,
      is_active: 1
    },
    {
      ticket_type_id: 'ticket-type-4',
      event_id: 'event-3',
      name: 'Early Bird',
      description: 'Early bird pricing for tech conference',
      price: 249.00,
      currency: 'USD',
      available_quantity: 100,
      sold_quantity: 100,
      sales_start_date: new Date('2024-07-01T00:00:00Z'),
      sales_end_date: new Date('2024-07-15T23:59:59Z'),
      max_per_user: 3,
      is_active: 0
    },
    {
      ticket_type_id: 'ticket-type-5',
      event_id: 'event-3',
      name: 'Regular Admission',
      description: 'Regular admission to tech conference',
      price: 299.00,
      currency: 'USD',
      available_quantity: 400,
      sold_quantity: 200,
      sales_start_date: new Date('2024-07-16T00:00:00Z'),
      sales_end_date: new Date('2024-08-09T23:59:59Z'),
      max_per_user: 5,
      is_active: 1
    }
  ];

  for (const ticketType of ticketTypes) {
    await conn.execute(
      `INSERT INTO ticket_types (
        ticket_type_id, event_id, name, description, price, currency,
        available_quantity, sold_quantity, sales_start_date, sales_end_date, max_per_user, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketType.ticket_type_id, ticketType.event_id, ticketType.name, ticketType.description,
        ticketType.price, ticketType.currency, ticketType.available_quantity, ticketType.sold_quantity,
        ticketType.sales_start_date, ticketType.sales_end_date, ticketType.max_per_user, ticketType.is_active
      ]
    );
  }

  console.log('✅ Ticket types seeded');
}

async function seedEventBookings(conn: any) {
  console.log('📋 Seeding event bookings...');
  
  const bookings = [
    {
      booking_id: 'booking-1',
      user_id: 'user-1',
      event_id: 'event-1',
      ticket_type_id: 'ticket-type-1',
      quantity: 2,
      total_amount: 150.00,
      currency: 'USD',
      booking_status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'credit_card',
      payment_reference: 'pay_1234567890',
      booking_reference: 'PP1703123456789',
      notes: 'Looking forward to the festival!'
    },
    {
      booking_id: 'booking-2',
      user_id: 'user-2',
      event_id: 'event-2',
      ticket_type_id: 'ticket-type-3',
      quantity: 1,
      total_amount: 25.00,
      currency: 'USD',
      booking_status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'paypal',
      payment_reference: 'pay_1234567891',
      booking_reference: 'PP1703123456790',
      notes: 'NBA Finals party!'
    },
    {
      booking_id: 'booking-3',
      user_id: 'user-1',
      event_id: 'event-3',
      ticket_type_id: 'ticket-type-5',
      quantity: 1,
      total_amount: 299.00,
      currency: 'USD',
      booking_status: 'pending',
      payment_status: 'pending',
      payment_method: null,
      payment_reference: null,
      booking_reference: 'PP1703123456791',
      notes: 'Tech conference registration'
    }
  ];

  for (const booking of bookings) {
    await conn.execute(
      `INSERT INTO event_bookings (
        booking_id, user_id, event_id, ticket_type_id, quantity, total_amount,
        currency, booking_status, payment_status, payment_method, payment_reference,
        booking_reference, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        booking.booking_id, booking.user_id, booking.event_id, booking.ticket_type_id,
        booking.quantity, booking.total_amount, booking.currency, booking.booking_status,
        booking.payment_status, booking.payment_method, booking.payment_reference,
        booking.booking_reference, booking.notes
      ]
    );
  }

  console.log('✅ Event bookings seeded');
}

async function seedTickets(conn: any) {
  console.log('🎟️ Seeding tickets...');
  
  const tickets = [
    {
      ticket_id: 'ticket-1',
      booking_id: 'booking-1',
      user_id: 'user-1',
      event_id: 'event-1',
      ticket_type_id: 'ticket-type-1',
      ticket_number: 'T1703123456789',
      attendee_name: 'John Doe',
      attendee_email: 'john@example.com',
      attendee_phone: '+1234567890',
      qr_code: 'T1703123456789',
      qr_code_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      is_used: 0,
      used_at: null,
      seat_number: null
    },
    {
      ticket_id: 'ticket-2',
      booking_id: 'booking-1',
      user_id: 'user-1',
      event_id: 'event-1',
      ticket_type_id: 'ticket-type-1',
      ticket_number: 'T1703123456790',
      attendee_name: 'Jane Guest',
      attendee_email: 'jane.guest@example.com',
      attendee_phone: '+1234567891',
      qr_code: 'T1703123456790',
      qr_code_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      is_used: 0,
      used_at: null,
      seat_number: null
    },
    {
      ticket_id: 'ticket-3',
      booking_id: 'booking-2',
      user_id: 'user-2',
      event_id: 'event-2',
      ticket_type_id: 'ticket-type-3',
      ticket_number: 'T1703123456791',
      attendee_name: 'Jane Smith',
      attendee_email: 'jane@example.com',
      attendee_phone: '+1234567891',
      qr_code: 'T1703123456791',
      qr_code_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      is_used: 1,
      used_at: new Date('2024-06-20T20:15:00Z'),
      seat_number: null
    }
  ];

  for (const ticket of tickets) {
    await conn.execute(
      `INSERT INTO tickets (
        ticket_id, booking_id, user_id, event_id, ticket_type_id, ticket_number,
        attendee_name, attendee_email, attendee_phone, qr_code, qr_code_data,
        is_used, used_at, seat_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket.ticket_id, ticket.booking_id, ticket.user_id, ticket.event_id,
        ticket.ticket_type_id, ticket.ticket_number, ticket.attendee_name,
        ticket.attendee_email, ticket.attendee_phone, ticket.qr_code,
        ticket.qr_code_data, ticket.is_used, ticket.used_at, ticket.seat_number
      ]
    );
  }

  console.log('✅ Tickets seeded');
}

async function seedEventFavorites(conn: any) {
  console.log('❤️ Seeding event favorites...');
  
  const favorites = [
    { favorite_id: 'favorite-1', user_id: 'user-1', event_id: 'event-1' },
    { favorite_id: 'favorite-2', user_id: 'user-1', event_id: 'event-3' },
    { favorite_id: 'favorite-3', user_id: 'user-2', event_id: 'event-2' }
  ];

  for (const favorite of favorites) {
    await conn.execute(
      'INSERT INTO event_favorites (favorite_id, user_id, event_id) VALUES (?, ?, ?)',
      [favorite.favorite_id, favorite.user_id, favorite.event_id]
    );
  }

  console.log('✅ Event favorites seeded');
}

async function seedEventReviews(conn: any) {
  console.log('⭐ Seeding event reviews...');
  
  const reviews = [
    {
      review_id: 'review-1',
      user_id: 'user-2',
      event_id: 'event-2',
      rating: 5,
      review_text: 'Amazing watch party! Great atmosphere and excellent service.',
      is_verified: 1
    },
    {
      review_id: 'review-2',
      user_id: 'user-1',
      event_id: 'event-1',
      rating: 4,
      review_text: 'Great music festival, but could use better food options.',
      is_verified: 1
    }
  ];

  for (const review of reviews) {
    await conn.execute(
      'INSERT INTO event_reviews (review_id, user_id, event_id, rating, review_text, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [review.review_id, review.user_id, review.event_id, review.rating, review.review_text, review.is_verified]
    );
  }

  console.log('✅ Event reviews seeded');
}

// Run the seeder
seedDatabase()
  .then(() => {
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });

export { seedDatabase };
