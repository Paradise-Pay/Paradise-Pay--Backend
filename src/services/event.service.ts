import {
  createEvent,
  getEventById,
  getEventWithDetails,
  searchEvents,
  getFeaturedEvents,
  getEventsByOrganizer,
  updateEvent,
  deleteEvent,
  incrementEventAttendees,
  getAllEventCategories,
  getEventCategoryById,
  createTicketType,
  getTicketTypesByEvent,
  addEventToFavorites,
  removeEventFromFavorites,
  getUserFavoriteEvents,
  isEventFavorited,
  EventSearchFilters,
  EventListOptions
} from '../repositories/event.repo';
import { integrationService } from './integration.service';
import { sendEmail } from './email.service';

export interface CreateEventRequest {
  organizer_id: string;
  category_id: string;
  title: string;
  description?: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  state?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  event_date: Date;
  event_end_date?: Date | null;
  registration_start_date?: Date | null;
  registration_end_date?: Date | null;
  max_attendees?: number | null;
  ticket_price?: number | null;
  currency?: string | null;
  event_image_url?: string | null;
  event_banner_url?: string | null;
  tags?: string[] | null;
  is_featured?: boolean | null;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  venue_name?: string;
  venue_address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  event_date?: Date;
  event_end_date?: Date;
  registration_start_date?: Date;
  registration_end_date?: Date;
  max_attendees?: number;
  ticket_price?: number;
  currency?: string;
  event_image_url?: string;
  event_banner_url?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
  is_featured?: boolean;
}

export interface CreateTicketTypeRequest {
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  available_quantity: number;
  sales_start_date?: Date;
  sales_end_date?: Date;
  max_per_user?: number;
}

export interface EventSearchRequest extends EventSearchFilters {
  page?: number;
  limit?: number;
  sort_by?: 'event_date' | 'created_at' | 'title' | 'price' | 'popularity';
  sort_order?: 'ASC' | 'DESC';
}

class EventService {
  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventRequest): Promise<any> {
    try {
      // Validate required fields
      if (!eventData.organizer_id || !eventData.category_id || !eventData.title || !eventData.venue_name || !eventData.event_date) {
        throw new Error('Missing required fields');
      }

      // Validate event date is in the future
      const eventDate = new Date(eventData.event_date);
      if (eventDate < new Date()) {
        throw new Error('Event date must be in the future');
      }

      // Validate category exists
      const category = await getEventCategoryById(eventData.category_id);
      if (!category) {
        throw new Error('Invalid category');
      }

      const event = await createEvent(eventData);
      
      // Send notification to organizer
      await this.sendEventCreatedNotification(event);
      
      return event;

    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Get event by ID with full details
   */
  async getEventById(event_id: string): Promise<any> {
    try {
      const event = await getEventWithDetails(event_id);
      if (!event) {
        throw new Error('Event not found');
      }

      return event;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Search events with advanced filters
   */
  async searchEvents(searchParams: EventSearchRequest): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
    filters: EventSearchFilters;
  }> {
    try {
      const { page, limit, sort_by, sort_order, ...filters } = searchParams;
      
      const options: EventListOptions = {
        page: page || 1,
        limit: limit || 20,
        sort_by: sort_by || 'event_date',
        sort_order: sort_order || 'ASC'
      };

      const result = await searchEvents(filters, options);
      
      return {
        ...result,
        filters
      };

    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  /**
   * Get featured events
   */
  async getFeaturedEvents(limit: number = 10): Promise<any[]> {
    try {
      return await getFeaturedEvents(limit);
    } catch (error) {
      console.error('Error getting featured events:', error);
      throw error;
    }
  }

  /**
   * Get events by organizer
   */
  async getOrganizerEvents(organizer_id: string, status?: string): Promise<any[]> {
    try {
      return await getEventsByOrganizer(organizer_id, status);
    } catch (error) {
      console.error('Error getting organizer events:', error);
      throw error;
    }
  }

  /**
   * Update event
   */
  async updateEvent(event_id: string, updates: UpdateEventRequest): Promise<any> {
    try {
      const existingEvent = await getEventById(event_id);
      if (!existingEvent) {
        throw new Error('Event not found');
      }

      // Validate event date if being updated
      if (updates.event_date) {
        const eventDate = new Date(updates.event_date);
        if (eventDate < new Date()) {
          throw new Error('Event date must be in the future');
        }
      }

      // Convert boolean to number for database compatibility
      const dbUpdates: any = { ...updates };
      if (typeof dbUpdates.is_featured === 'boolean') {
        dbUpdates.is_featured = dbUpdates.is_featured ? 1 : 0;
      }
      
      const updatedEvent = await updateEvent(event_id, dbUpdates);
      
      // Send notification if event was published
      if (updates.status === 'published' && existingEvent.status !== 'published') {
        await this.sendEventPublishedNotification(updatedEvent);
      }

      return updatedEvent;

    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(event_id: string): Promise<boolean> {
    try {
      const event = await getEventById(event_id);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if event has bookings
      // TODO: Add booking count check

      const deleted = await deleteEvent(event_id);
      
      if (deleted) {
        await this.sendEventDeletedNotification(event);
      }

      return deleted;

    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Create ticket type for event
   */
  async createTicketType(ticketTypeData: CreateTicketTypeRequest): Promise<any> {
    try {
      // Validate event exists
      const event = await getEventById(ticketTypeData.event_id);
      if (!event) {
        throw new Error('Event not found');
      }

      // Validate sales dates
      if (ticketTypeData.sales_start_date && ticketTypeData.sales_end_date) {
        const startDate = new Date(ticketTypeData.sales_start_date);
        const endDate = new Date(ticketTypeData.sales_end_date);
        if (startDate >= endDate) {
          throw new Error('Sales start date must be before end date');
        }
      }

      const ticketType = await createTicketType(ticketTypeData);
      return ticketType;

    } catch (error) {
      console.error('Error creating ticket type:', error);
      throw error;
    }
  }

  /**
   * Get ticket types for event
   */
  async getEventTicketTypes(event_id: string): Promise<any[]> {
    try {
      return await getTicketTypesByEvent(event_id);
    } catch (error) {
      console.error('Error getting ticket types:', error);
      throw error;
    }
  }

  /**
   * Get all event categories
   */
  async getEventCategories(): Promise<any[]> {
    try {
      return await getAllEventCategories();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Add event to user favorites
   */
  async addToFavorites(user_id: string, event_id: string): Promise<void> {
    try {
      // Check if event exists
      const event = await getEventById(event_id);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if already favorited
      const isFavorited = await isEventFavorited(user_id, event_id);
      if (isFavorited) {
        throw new Error('Event already in favorites');
      }

      await addEventToFavorites(user_id, event_id);

    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove event from user favorites
   */
  async removeFromFavorites(user_id: string, event_id: string): Promise<void> {
    try {
      await removeEventFromFavorites(user_id, event_id);
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }

  /**
   * Get user's favorite events
   */
  async getUserFavorites(user_id: string): Promise<any[]> {
    try {
      return await getUserFavoriteEvents(user_id);
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw error;
    }
  }

  /**
   * Search events from third-party platforms
   */
  async searchThirdPartyEvents(searchParams: {
    query?: string;
    city?: string;
    state?: string;
    country?: string;
    date_from?: string;
    date_to?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    size?: number;
    page?: number;
    platforms?: string[];
  }): Promise<{
    ticketmaster: any[];
    eventbrite: any[];
    combined: any[];
  }> {
    try {
      const { platforms = ['ticketmaster', 'eventbrite'], ...params } = searchParams;
      
      let ticketmasterEvents: any[] = [];
      let eventbriteEvents: any[] = [];

      if (platforms.includes('ticketmaster')) {
        try {
          ticketmasterEvents = await integrationService.searchTicketmasterEvents(params);
        } catch (error) {
          console.error('Ticketmaster search failed:', error);
        }
      }

      if (platforms.includes('eventbrite')) {
        try {
          eventbriteEvents = await integrationService.searchEventbriteEvents(params);
        } catch (error) {
          console.error('Eventbrite search failed:', error);
        }
      }

      // Combine results
      const combined = [
        ...ticketmasterEvents.map(event => ({ ...event, source: 'ticketmaster' })),
        ...eventbriteEvents.map(event => ({ ...event, source: 'eventbrite' }))
      ];

      return {
        ticketmaster: ticketmasterEvents,
        eventbrite: eventbriteEvents,
        combined
      };

    } catch (error) {
      console.error('Error searching third-party events:', error);
      throw error;
    }
  }

  /**
   * Import event from third-party platform
   */
  async importThirdPartyEvent(
    event_id: string,
    platform: 'ticketmaster' | 'eventbrite',
    organizer_id: string,
    category_id: string
  ): Promise<any> {
    try {
      let importedEvent;

      if (platform === 'ticketmaster') {
        importedEvent = await integrationService.importTicketmasterEvent(event_id, organizer_id, category_id);
      } else if (platform === 'eventbrite') {
        importedEvent = await integrationService.importEventbriteEvent(event_id, organizer_id, category_id);
      } else {
        throw new Error('Invalid platform');
      }

      // Send notification about imported event
      await this.sendEventImportedNotification(importedEvent, platform);

      return importedEvent;

    } catch (error) {
      console.error('Error importing third-party event:', error);
      throw error;
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(event_id: string): Promise<any> {
    try {
      const event = await getEventById(event_id);
      if (!event) {
        throw new Error('Event not found');
      }

      // Get ticket types
      const ticketTypes = await getTicketTypesByEvent(event_id);

      // Calculate analytics
      const totalCapacity = ticketTypes.reduce((sum, tt) => sum + tt.available_quantity, 0);
      const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.sold_quantity, 0);
      const totalRevenue = ticketTypes.reduce((sum, tt) => sum + (tt.price * tt.sold_quantity), 0);
      const occupancyRate = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;

      return {
        event_id,
        event_title: event.title,
        total_capacity: totalCapacity,
        total_sold: totalSold,
        total_revenue: totalRevenue,
        occupancy_rate: Math.round(occupancyRate * 100) / 100,
        ticket_types: ticketTypes.map(tt => ({
          name: tt.name,
          price: tt.price,
          available: tt.available_quantity,
          sold: tt.sold_quantity,
          revenue: tt.price * tt.sold_quantity
        }))
      };

    } catch (error) {
      console.error('Error getting event analytics:', error);
      throw error;
    }
  }

  /**
   * Send event created notification
   */
  private async sendEventCreatedNotification(event: any): Promise<void> {
    try {
      // This would typically get the organizer's email from the user table
      const emailSubject = `Event Created: ${event.title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Event Created Successfully!</h2>
          <p>Your event "${event.title}" has been created successfully.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details</h3>
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue_name}</p>
            <p><strong>Status:</strong> ${event.status}</p>
          </div>
          
          <p>You can manage your event and view analytics through the Paradise Pay dashboard.</p>
          
          <p>Thank you for using Paradise Pay!</p>
        </div>
      `;

      // TODO: Get organizer email from user table
      // await sendEmail(organizerEmail, emailSubject, emailHtml);

    } catch (error) {
      console.error('Error sending event created notification:', error);
    }
  }

  /**
   * Send event published notification
   */
  private async sendEventPublishedNotification(event: any): Promise<void> {
    try {
      const emailSubject = `Event Published: ${event.title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Event Published!</h2>
          <p>Your event "${event.title}" is now live and available for ticket purchases.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details</h3>
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue_name}</p>
          </div>
          
          <p>Start promoting your event and watch your ticket sales grow!</p>
          
          <p>Thank you for using Paradise Pay!</p>
        </div>
      `;

      // TODO: Get organizer email from user table
      // await sendEmail(organizerEmail, emailSubject, emailHtml);

    } catch (error) {
      console.error('Error sending event published notification:', error);
    }
  }

  /**
   * Send event deleted notification
   */
  private async sendEventDeletedNotification(event: any): Promise<void> {
    try {
      const emailSubject = `Event Deleted: ${event.title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Event Deleted</h2>
          <p>Your event "${event.title}" has been deleted.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details</h3>
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue_name}</p>
          </div>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Thank you for using Paradise Pay!</p>
        </div>
      `;

      // TODO: Get organizer email from user table
      // await sendEmail(organizerEmail, emailSubject, emailHtml);

    } catch (error) {
      console.error('Error sending event deleted notification:', error);
    }
  }

  /**
   * Send event imported notification
   */
  private async sendEventImportedNotification(event: any, platform: string): Promise<void> {
    try {
      const emailSubject = `Event Imported from ${platform}: ${event.title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Event Imported Successfully!</h2>
          <p>Your event has been imported from ${platform} and is now available in Paradise Pay.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details</h3>
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue_name}</p>
            <p><strong>Source:</strong> ${platform}</p>
          </div>
          
          <p>You can now manage this event and create ticket types through the Paradise Pay dashboard.</p>
          
          <p>Thank you for using Paradise Pay!</p>
        </div>
      `;

      // TODO: Get organizer email from user table
      // await sendEmail(organizerEmail, emailSubject, emailHtml);

    } catch (error) {
      console.error('Error sending event imported notification:', error);
    }
  }
}

// Export singleton instance
export const eventService = new EventService();
export default eventService;
