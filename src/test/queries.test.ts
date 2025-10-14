import { 
  searchEvents, 
  getEventById, 
  getEventWithDetails,
  getFeaturedEvents,
  getAllEventCategories,
  getEventsByOrganizer
} from '../repositories/event.repo.js';
import { 
  getUserTickets,
  getBookingWithDetails,
  markTicketAsUsed,
  getUserBookings,
  getTicketWithDetails,
  validateTicketForEntry,
  getBookingStats,
  getTicketStats
} from '../repositories/ticket.repo.js';
import { seedTestData, createTestBooking } from '../seeders/test-data.js';

async function runQueryTests() {
  console.log('🧪 Running database query tests...\n');

  try {
    // Seed test data first
    await seedTestData();

    // Test 1: Search Events
    console.log('1️⃣ Testing event search...');
    const searchResults = await searchEvents({ 
      city: 'Test City',
      status: 'published'
    }, { page: 1, limit: 10 });
    console.log(`   ✅ Found ${searchResults.total} events`);
    console.log(`   📄 Events: ${searchResults.events.map(e => e.title).join(', ')}`);

    // Test 2: Get Event by ID
    console.log('\n2️⃣ Testing get event by ID...');
    const event = await getEventById('test-event-1');
    console.log(`   ✅ Event found: ${event?.title}`);
    console.log(`   📍 Venue: ${event?.venue_name}`);

    // Test 3: Get Event with Details
    console.log('\n3️⃣ Testing get event with details...');
    const eventDetails = await getEventWithDetails('test-event-1');
    console.log(`   ✅ Event details retrieved`);
    console.log(`   🏷️ Category: ${eventDetails?.category_name}`);

    // Test 4: Get Featured Events
    console.log('\n4️⃣ Testing featured events...');
    const featured = await getFeaturedEvents(5);
    console.log(`   ✅ Found ${featured.length} featured events`);

    // Test 5: Get Categories
    console.log('\n5️⃣ Testing event categories...');
    const categories = await getAllEventCategories();
    console.log(`   ✅ Found ${categories.length} categories`);
    console.log(`   📂 Categories: ${categories.map(c => c.name).join(', ')}`);

    // Test 6: Get Organizer Events
    console.log('\n6️⃣ Testing organizer events...');
    const orgEvents = await getEventsByOrganizer('test-organizer');
    console.log(`   ✅ Found ${orgEvents.length} organizer events`);

    // Test 7: Create and Test Booking
    console.log('\n7️⃣ Testing booking creation...');
    const { bookingId, ticketId, ticketNumber } = await createTestBooking();
    console.log(`   ✅ Booking created: ${bookingId}`);
    console.log(`   🎟️ Ticket number: ${ticketNumber}`);

    // Test 8: Get User Bookings
    console.log('\n8️⃣ Testing user bookings...');
    const userBookings = await getUserBookings('test-user');
    console.log(`   ✅ Found ${userBookings.length} user bookings`);

    // Test 9: Get Booking Details
    console.log('\n9️⃣ Testing booking details...');
    const bookingDetails = await getBookingWithDetails(bookingId);
    console.log(`   ✅ Booking details retrieved`);
    console.log(`   💰 Total: ${bookingDetails?.booking.total_amount} ${bookingDetails?.booking.currency}`);

    // Test 10: Get Ticket Details
    console.log('\n🔟 Testing ticket details...');
    const ticketDetails = await getTicketWithDetails(ticketId);
    console.log(`   ✅ Ticket details retrieved`);
    console.log(`   👤 Attendee: ${ticketDetails?.attendee_name}`);

    // Test 11: Validate Ticket
    console.log('\n1️⃣1️⃣ Testing ticket validation...');
    const validation = await validateTicketForEntry(ticketNumber, 'test-event-1');
    console.log(`   ✅ Ticket validation: ${validation.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   📝 Message: ${validation.message}`);

    // Test 12: Mark Ticket as Used
    console.log('\n1️⃣2️⃣ Testing mark ticket as used...');
    const used = await markTicketAsUsed(ticketId);
    console.log(`   ✅ Ticket marked as used: ${used}`);

    // Test 13: Get Booking Statistics
    console.log('\n1️⃣3️⃣ Testing booking statistics...');
    const bookingStats = await getBookingStats('test-event-1');
    console.log(`   ✅ Booking stats retrieved`);
    console.log(`   📊 Total bookings: ${bookingStats.total_bookings}`);
    console.log(`   💵 Total revenue: ${bookingStats.total_revenue}`);

    // Test 14: Get Ticket Statistics
    console.log('\n1️⃣4️⃣ Testing ticket statistics...');
    const ticketStats = await getTicketStats('test-event-1');
    console.log(`   ✅ Ticket stats retrieved`);
    console.log(`   🎫 Total tickets: ${ticketStats.total_tickets}`);
    console.log(`   ✅ Used tickets: ${ticketStats.used_tickets}`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQueryTests()
    .then(() => {
      console.log('✅ All query tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Query tests failed:', error);
      process.exit(1);
    });
}

export { runQueryTests };
