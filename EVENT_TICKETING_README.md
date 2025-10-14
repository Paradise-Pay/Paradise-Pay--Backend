# Paradise Pay - Event Ticketing System

## Overview

The Event Ticketing System is a comprehensive feature that allows users to browse, search, and purchase event tickets through the Paradise Pay platform. It includes integration with third-party ticketing platforms like Ticketmaster and Eventbrite, and provides digital ticket management with QR codes.

## Features

### 1. Event Listing and Search
- **Advanced Search**: Search events by category, location, date, keywords, and price range
- **Location-based Search**: Find events near a specific location with radius search
- **Category Filtering**: Browse events by predefined categories (Music, Sports, Technology, etc.)
- **Featured Events**: Highlighted events for better visibility
- **Sorting Options**: Sort by date, popularity, price, or creation date

### 2. Ticket Purchase
- **Secure Purchase Flow**: Complete ticket purchasing with payment integration
- **Multiple Ticket Types**: Support for different pricing tiers and ticket types
- **Attendee Management**: Collect attendee details for each ticket
- **Booking Management**: Track booking status and payment status
- **Email Notifications**: Automatic confirmation and ticket delivery emails

### 3. Digital Tickets with QR Codes
- **QR Code Generation**: Unique QR codes for each ticket with embedded data
- **Digital Signature**: Secure QR codes with cryptographic signatures
- **Ticket Validation**: Real-time ticket validation for event entry
- **Usage Tracking**: Track ticket usage and prevent double-entry
- **Mobile-friendly**: QR codes optimized for mobile devices

### 4. Third-party Platform Integration
- **Ticketmaster Integration**: Import and search events from Ticketmaster
- **Eventbrite Integration**: Import and search events from Eventbrite
- **Unified Search**: Search across multiple platforms simultaneously
- **Event Import**: Import external events into the platform

## Database Schema

### Core Tables

#### Events
```sql
- event_id (Primary Key)
- organizer_id (Foreign Key to users)
- category_id (Foreign Key to event_categories)
- title, description, venue information
- event_date, event_end_date
- pricing and capacity information
- status (draft, published, cancelled, completed)
- external platform integration fields
```

#### Ticket Types
```sql
- ticket_type_id (Primary Key)
- event_id (Foreign Key to events)
- name, description, price
- available_quantity, sold_quantity
- sales date restrictions
- max_per_user limits
```

#### Event Bookings
```sql
- booking_id (Primary Key)
- user_id, event_id, ticket_type_id
- quantity, total_amount, currency
- booking_status, payment_status
- booking_reference (unique identifier)
```

#### Tickets
```sql
- ticket_id (Primary Key)
- booking_id (Foreign Key to event_bookings)
- ticket_number (unique identifier)
- attendee details (name, email, phone)
- QR code data and metadata
- usage tracking (is_used, used_at)
```

## API Endpoints

### Event Management

#### Public Endpoints
- `GET /api/v1/events/search` - Search events with filters
- `GET /api/v1/events/featured` - Get featured events
- `GET /api/v1/events/categories` - Get event categories
- `GET /api/v1/events/:event_id` - Get event details
- `GET /api/v1/events/:event_id/ticket-types` - Get ticket types for event

#### Protected Endpoints (Authentication Required)
- `POST /api/v1/events` - Create new event (Organizer role)
- `PUT /api/v1/events/:event_id` - Update event (Organizer role)
- `DELETE /api/v1/events/:event_id` - Delete event (Organizer role)
- `POST /api/v1/events/:event_id/ticket-types` - Create ticket type (Organizer role)
- `POST /api/v1/events/:event_id/favorites` - Add to favorites
- `DELETE /api/v1/events/:event_id/favorites` - Remove from favorites
- `GET /api/v1/events/favorites/list` - Get user favorites
- `GET /api/v1/events/organizer/events` - Get organizer's events
- `GET /api/v1/events/:event_id/analytics` - Get event analytics

### Ticket Management

#### Public Endpoints
- `POST /api/v1/tickets/validate` - Validate ticket for entry

#### Protected Endpoints (Authentication Required)
- `POST /api/v1/tickets/purchase` - Purchase tickets
- `POST /api/v1/tickets/bookings/:booking_id/confirm` - Confirm payment
- `POST /api/v1/tickets/bookings/:booking_id/cancel` - Cancel booking
- `GET /api/v1/tickets/user/tickets` - Get user's tickets
- `GET /api/v1/tickets/bookings/user` - Get user's bookings
- `GET /api/v1/tickets/bookings/:booking_id` - Get booking details
- `GET /api/v1/tickets/:ticket_id` - Get ticket details
- `GET /api/v1/tickets/qr/:ticket_number` - Get ticket QR code
- `POST /api/v1/tickets/:ticket_id/use` - Mark ticket as used (Organizer role)
- `GET /api/v1/tickets/statistics/overview` - Get booking statistics (Organizer role)

### Third-party Integration

#### Public Endpoints
- `GET /api/v1/integrations/search` - Search third-party events
- `GET /api/v1/integrations/categories` - Get third-party categories
- `GET /api/v1/integrations/ticketmaster/events/:event_id` - Get Ticketmaster event
- `GET /api/v1/integrations/eventbrite/events/:event_id` - Get Eventbrite event

#### Protected Endpoints (Authentication Required)
- `POST /api/v1/integrations/import` - Import third-party event

## Services Architecture

### Event Service (`event.service.ts`)
- Event CRUD operations
- Advanced search and filtering
- Analytics and reporting
- Email notifications
- Third-party integration coordination

### Ticket Service (`ticket.service.ts`)
- Ticket purchase flow
- Payment confirmation
- Booking management
- Email notifications for tickets
- Ticket validation

### QR Service (`qr.service.ts`)
- QR code generation
- Digital signature creation
- QR code validation
- Batch QR code generation
- Multiple QR code types (tickets, cards, sharing)

### Integration Service (`integration.service.ts`)
- Ticketmaster API integration
- Eventbrite API integration
- Event import functionality
- Category mapping
- Unified search across platforms

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (User, Organizer, Admin)
- Protected endpoints with middleware
- Token validation and refresh

### Data Security
- Encrypted QR codes with digital signatures
- Secure ticket validation
- Payment status tracking
- Audit logging for sensitive operations

### Input Validation
- Comprehensive request validation
- SQL injection prevention
- XSS protection
- Rate limiting ready

## Environment Variables

Add these to your `.env` file:

```env
# QR Code Security
QR_SECRET_KEY=your-secure-qr-secret-key

# Third-party API Keys
TICKETMASTER_API_KEY=your-ticketmaster-api-key
EVENTBRITE_API_KEY=your-eventbrite-api-key

# Application URLs
BASE_URL=https://your-domain.com
```

## Usage Examples

### Creating an Event
```javascript
POST /api/v1/events
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "category_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Music Festival 2024",
  "description": "Amazing summer music festival",
  "venue_name": "Central Park",
  "venue_address": "123 Main St, New York, NY",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "event_date": "2024-07-15T18:00:00Z",
  "ticket_price": 75.00,
  "currency": "USD"
}
```

### Purchasing Tickets
```javascript
POST /api/v1/tickets/purchase
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "ticket_type_id": "550e8400-e29b-41d4-a716-446655440001",
  "quantity": 2,
  "attendee_details": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  ]
}
```

### Searching Events
```javascript
GET /api/v1/events/search?city=New York&category_id=music&date_from=2024-07-01&price_max=100
```

### Validating a Ticket
```javascript
POST /api/v1/tickets/validate
Content-Type: application/json

{
  "ticket_number": "T1703123456789",
  "event_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Testing

### Running Tests
```bash
npm test
```

### API Documentation
Access the interactive API documentation at:
```
http://localhost:4000/api-docs
```

## Deployment

### Database Migration
```bash
npm run migrate
```

### Production Build
```bash
npm run build
npm start
```

## Future Enhancements

1. **Payment Gateway Integration**: Stripe, PayPal integration
2. **Advanced Analytics**: Revenue tracking, attendee analytics
3. **Mobile App Integration**: React Native or Flutter app
4. **Real-time Notifications**: WebSocket support for live updates
5. **Multi-language Support**: Internationalization
6. **Advanced Search**: Elasticsearch integration
7. **Event Recommendations**: AI-powered event suggestions
8. **Social Features**: Event sharing, reviews, and ratings

## Support

For technical support or questions about the Event Ticketing System, please contact the development team or refer to the API documentation at `/api-docs`.
