# Database Seeding System

This document explains how to use the database seeding system for testing and development.

## Overview

The seeding system provides comprehensive test data for all Event Ticketing System features, including:
- Users (regular users, organizers, admins)
- Event categories
- Events with various statuses
- Ticket types and pricing
- Event bookings and payments
- Digital tickets with QR codes
- Event favorites and reviews

## Available Scripts

### 1. Full Database Reset and Seed
```bash
npm run seed:dev
```
This command:
1. Runs database migrations (`npm run migrate`)
2. Seeds the database with comprehensive test data (`npm run seed`)

### 2. Seed Only (without migration)
```bash
npm run seed
```
Seeds the database with test data (assumes tables already exist).

### 3. Database Connection Test
```bash
npm run test:db
```
Tests basic database connectivity and shows table information.

### 4. Query Tests
```bash
npm run test:queries
```
Runs comprehensive tests on all database queries and operations.

## Seeded Data

### Users
- **Regular Users**: `user@example.com`, `jane@example.com` (password: `password123`)
- **Organizer**: `organizer@example.com` (password: `password123`)
- **Admin**: `admin@example.com` (password: `password123`)

### Events
1. **Summer Music Festival 2024** (Featured)
   - Date: July 15, 2024
   - Venue: Central Park, New York
   - Price: $75 (General), $150 (VIP)
   - Status: Published

2. **NBA Finals Watch Party**
   - Date: June 20, 2024
   - Venue: Sports Bar Downtown, Los Angeles
   - Price: $25
   - Status: Published

3. **Tech Conference 2024** (Featured)
   - Date: August 10-12, 2024
   - Venue: Convention Center, San Francisco
   - Price: $249 (Early Bird), $299 (Regular)
   - Status: Published

### Ticket Types
Each event has multiple ticket types with different pricing tiers:
- General Admission
- VIP Passes
- Early Bird Pricing
- Regular Pricing

### Sample Bookings
- Confirmed bookings with paid status
- Pending bookings
- Used and unused tickets
- QR codes for digital tickets

## Environment Setup

Ensure your `.env` file contains the correct database configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
```

## Testing API Endpoints

Once seeded, you can test the following endpoints:

### Public Endpoints
```bash
# Get event categories
GET http://localhost:4000/api/v1/events/categories

# Search events
GET http://localhost:4000/api/v1/events/search?city=New York

# Get featured events
GET http://localhost:4000/api/v1/events/featured

# Get specific event
GET http://localhost:4000/api/v1/events/event-1
```

### Authentication Required
First, login to get a JWT token:
```bash
POST http://localhost:4000/api/v1/auth/login
{
  "email": "organizer@example.com",
  "password": "password123"
}
```

Then use the token in subsequent requests:
```bash
# Create event (Organizer role)
POST http://localhost:4000/api/v1/events
Authorization: Bearer <your-jwt-token>
{
  "category_id": "cat-1",
  "title": "New Test Event",
  "venue_name": "Test Venue",
  "venue_address": "123 Test St",
  "city": "Test City",
  "country": "Test Country",
  "event_date": "2024-12-31T18:00:00Z"
}

# Purchase tickets
POST http://localhost:4000/api/v1/tickets/purchase
Authorization: Bearer <your-jwt-token>
{
  "event_id": "event-1",
  "ticket_type_id": "ticket-type-1",
  "quantity": 1,
  "attendee_details": [
    {
      "name": "Test User",
      "email": "test@example.com"
    }
  ]
}
```

## Custom Test Data

For specific testing scenarios, you can use the test data seeder:

```typescript
import { seedTestData, createTestBooking, clearTestData } from './src/seeders/test-data.js';

// Create minimal test data
await seedTestData();

// Create a test booking
const { bookingId, ticketId } = await createTestBooking();

// Clear test data when done
await clearTestData();
```

## Troubleshooting

### Database Connection Issues
1. Verify your `.env` file has correct database credentials
2. Ensure MySQL server is running
3. Check that the database exists
4. Run `npm run test:db` to test connectivity

### Migration Issues
1. Ensure you have proper database permissions
2. Check that no conflicting data exists
3. Run `npm run migrate` separately to see specific errors

### Seeding Issues
1. Make sure migrations ran successfully first
2. Check for foreign key constraint violations
3. Verify all required tables exist

## Development Workflow

1. **Start Development**: `npm run dev`
2. **Reset Database**: `npm run seed:dev`
3. **Test Queries**: `npm run test:queries`
4. **Test API**: Use the seeded data to test endpoints
5. **Iterate**: Modify seeders as needed for new features

## File Structure

```
src/
├── seeders/
│   ├── seed.ts          # Full database seeder
│   └── test-data.ts     # Minimal test data seeder
├── test/
│   ├── queries.test.ts  # Comprehensive query tests
│   └── simple.test.ts   # Basic database connectivity test
└── migrations/
    ├── 001_init.sql     # Initial database schema
    └── 002_event_ticketing.sql # Event ticketing schema
```

This seeding system provides a robust foundation for testing and development of the Event Ticketing System.
