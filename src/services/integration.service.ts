import axios from 'axios';
import { createEvent } from '../repositories/event.repo';

export interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  url?: string;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    end?: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      type: string;
      url?: string;
      locale?: string;
      images?: Array<{
        url: string;
        width: number;
        height: number;
      }>;
      distance?: number;
      units?: string;
      address?: {
        line1?: string;
        line2?: string;
      };
      city: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      postalCode?: string;
      location?: {
        longitude: string;
        latitude: string;
      };
      timezone?: string;
      boxOfficeInfo?: {
        phoneNumberDetail?: string;
        openHoursDetail?: string;
        acceptedPaymentDetail?: string;
        willCallDetail?: string;
      };
      parkingDetail?: string;
      accessibleSeatingDetail?: string;
      generalInfo?: {
        generalRule?: string;
        childRule?: string;
      };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      type: string;
      url?: string;
      locale?: string;
      images?: Array<{
        url: string;
        width: number;
        height: number;
      }>;
      classifications?: Array<{
        primary: boolean;
        segment: {
          id: string;
          name: string;
        };
        genre: {
          id: string;
          name: string;
        };
        subGenre: {
          id: string;
          name: string;
        };
      }>;
    }>;
  };
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  classifications?: Array<{
    primary: boolean;
    segment: {
      id: string;
      name: string;
    };
    genre: {
      id: string;
      name: string;
    };
    subGenre: {
      id: string;
      name: string;
    };
  }>;
}

export interface EventbriteEvent {
  id: string;
  name: {
    text: string;
    html: string;
  };
  description?: {
    text: string;
    html: string;
  };
  url: string;
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end?: {
    timezone: string;
    local: string;
    utc: string;
  };
  created: string;
  changed: string;
  published: string;
  status: string;
  currency: string;
  online_event: boolean;
  is_free: boolean;
  logo?: {
    id: string;
    url: string;
    aspect_ratio: string;
    edge_color: string;
    edge_color_set: boolean;
  };
  organizer: {
    id: string;
    name: string;
    description?: {
      text: string;
      html: string;
    };
    url?: string;
  };
  venue?: {
    id: string;
    name: string;
    address?: {
      address_1?: string;
      address_2?: string;
      city?: string;
      region?: string;
      postal_code?: string;
      country?: string;
      localized_area_display?: string;
    };
    latitude?: string;
    longitude?: string;
    localized_multi_line_address_display?: string[];
  };
  category_id?: string;
  subcategory_id?: string;
  format_id?: string;
  ticket_availability: {
    has_available_tickets: boolean;
    minimum_ticket_price?: {
      currency: string;
      value: number;
      major_value: string;
      display: string;
    };
    maximum_ticket_price?: {
      currency: string;
      value: number;
      major_value: string;
      display: string;
    };
    is_sold_out: boolean;
    start_sales_date?: string;
    end_sales_date?: string;
  };
  listed: boolean;
  shareable: boolean;
  invite_only: boolean;
  show_remaining: boolean;
  capacity?: number;
  capacity_is_custom: boolean;
}

export interface ThirdPartyEventSearchParams {
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
}

class IntegrationService {
  private ticketmasterClient: ReturnType<typeof axios.create>;
  private eventbriteClient: ReturnType<typeof axios.create>;

  constructor() {
    // Initialize Ticketmaster client
    this.ticketmasterClient = axios.create({
      baseURL: 'https://app.ticketmaster.com/discovery/v2',
      params: {
        apikey: process.env.TICKETMASTER_API_KEY || ''
      },
      timeout: 10000
    });

    // Initialize Eventbrite client
    this.eventbriteClient = axios.create({
      baseURL: 'https://www.eventbriteapi.com/v3',
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Search events from Ticketmaster
   */
  async searchTicketmasterEvents(params: ThirdPartyEventSearchParams): Promise<TicketmasterEvent[]> {
    try {
      const searchParams: any = {
        size: params.size || 20,
        page: params.page || 0
      };

      if (params.query) searchParams.keyword = params.query;
      if (params.city) searchParams.city = params.city;
      if (params.state) searchParams.stateCode = params.state;
      if (params.country) searchParams.countryCode = params.country;
      if (params.date_from) searchParams.startDateTime = `${params.date_from}T00:00:00Z`;
      if (params.date_to) searchParams.endDateTime = `${params.date_to}T23:59:59Z`;
      if (params.latitude && params.longitude) {
        searchParams.latlong = `${params.latitude},${params.longitude}`;
        if (params.radius) searchParams.radius = params.radius;
      }
      if (params.category) {
        // Map category to Ticketmaster classification
        const categoryMapping: { [key: string]: string } = {
          'music': 'KZFzniwnSyZfZ7v7nJ',
          'sports': 'KZFzniwnSyZfZ7v7nE',
          'arts': 'KZFzniwnSyZfZ7v7na',
          'family': 'KZFzniwnSyZfZ7v7n1',
          'film': 'KZFzniwnSyZfZ7v7nn',
          'misc': 'KZFzniwnSyZfZ7v7n1'
        };
        searchParams.classificationId = categoryMapping[params.category.toLowerCase()] || '';
      }

      const response = await this.ticketmasterClient.get('/events.json', {
        params: searchParams
      });

      const events = (response.data as any)._embedded?.events || [];
      return events.map(this.normalizeTicketmasterEvent);

    } catch (error) {
      console.error('Error searching Ticketmaster events:', error);
      throw new Error('Failed to search Ticketmaster events');
    }
  }

  /**
   * Search events from Eventbrite
   */
  async searchEventbriteEvents(params: ThirdPartyEventSearchParams): Promise<EventbriteEvent[]> {
    try {
      const searchParams: any = {
        expand: 'venue,organizer,logo',
        page_size: params.size || 20,
        page: params.page || 1
      };

      if (params.query) searchParams.q = params.query;
      if (params.city) searchParams.location.address = params.city;
      if (params.state) searchParams.location.within = `${params.radius || 25}mi`;
      if (params.date_from) searchParams.start_date.range_start = params.date_from;
      if (params.date_to) searchParams.start_date.range_end = params.date_to;
      if (params.category) searchParams.categories = params.category;

      const response = await this.eventbriteClient.get('/events/search/', {
        params: searchParams
      });

      const events = (response.data as any).events || [];
      return events.map(this.normalizeEventbriteEvent);

    } catch (error) {
      console.error('Error searching Eventbrite events:', error);
      throw new Error('Failed to search Eventbrite events');
    }
  }

  /**
   * Get event details from Ticketmaster
   */
  async getTicketmasterEventDetails(eventId: string): Promise<TicketmasterEvent | null> {
    try {
      const response = await this.ticketmasterClient.get(`/events/${eventId}.json`, {
        params: {
          apikey: process.env.TICKETMASTER_API_KEY
        }
      });

      return this.normalizeTicketmasterEvent(response.data as any);

    } catch (error) {
      console.error('Error getting Ticketmaster event details:', error);
      return null;
    }
  }

  /**
   * Get event details from Eventbrite
   */
  async getEventbriteEventDetails(eventId: string): Promise<EventbriteEvent | null> {
    try {
      const response = await this.eventbriteClient.get(`/events/${eventId}/`, {
        params: {
          expand: 'venue,organizer,logo'
        }
      });

      return this.normalizeEventbriteEvent(response.data as any);

    } catch (error) {
      console.error('Error getting Eventbrite event details:', error);
      return null;
    }
  }

  /**
   * Import event from Ticketmaster to our database
   */
  async importTicketmasterEvent(
    ticketmasterEventId: string,
    organizer_id: string,
    category_id: string
  ): Promise<any> {
    try {
      const eventDetails = await this.getTicketmasterEventDetails(ticketmasterEventId);
      if (!eventDetails) {
        throw new Error('Event not found in Ticketmaster');
      }

      const venue = eventDetails._embedded?.venues?.[0];
      if (!venue) {
        throw new Error('Venue information not available');
      }

      // Map Ticketmaster event to our event format
      const eventData = {
        organizer_id,
        category_id,
        title: eventDetails.name,
        description: eventDetails.description,
        venue_name: venue.name,
        venue_address: venue.address?.line1 || venue.name,
        city: venue.city.name,
        state: venue.state?.name,
        country: venue.country.name,
        latitude: venue.location ? parseFloat(venue.location.latitude) : undefined,
        longitude: venue.location ? parseFloat(venue.location.longitude) : undefined,
        event_date: new Date(eventDetails.dates.start.dateTime || eventDetails.dates.start.localDate),
        event_end_date: eventDetails.dates.end ? 
          new Date(eventDetails.dates.end.dateTime || eventDetails.dates.end.localDate) : undefined,
        ticket_price: eventDetails.priceRanges?.[0]?.min || 0,
        currency: eventDetails.priceRanges?.[0]?.currency || 'USD',
        event_image_url: eventDetails.images?.[0]?.url,
        tags: eventDetails.classifications?.map(c => c.genre.name),
        external_event_id: eventDetails.id,
        external_platform: 'ticketmaster' as const
      };

      const event = await createEvent(eventData);
      return event;

    } catch (error) {
      console.error('Error importing Ticketmaster event:', error);
      throw new Error('Failed to import Ticketmaster event');
    }
  }

  /**
   * Import event from Eventbrite to our database
   */
  async importEventbriteEvent(
    eventbriteEventId: string,
    organizer_id: string,
    category_id: string
  ): Promise<any> {
    try {
      const eventDetails = await this.getEventbriteEventDetails(eventbriteEventId);
      if (!eventDetails) {
        throw new Error('Event not found in Eventbrite');
      }

      // Map Eventbrite event to our event format
      const eventData = {
        organizer_id,
        category_id,
        title: eventDetails.name.text,
        description: eventDetails.description?.text,
        venue_name: eventDetails.venue?.name || 'Online Event',
        venue_address: eventDetails.venue?.localized_multi_line_address_display?.join(', ') || 'Online',
        city: eventDetails.venue?.address?.city || 'Online',
        state: eventDetails.venue?.address?.region,
        country: eventDetails.venue?.address?.country || 'Online',
        latitude: eventDetails.venue?.latitude ? parseFloat(eventDetails.venue.latitude) : undefined,
        longitude: eventDetails.venue?.longitude ? parseFloat(eventDetails.venue.longitude) : undefined,
        event_date: new Date(eventDetails.start.utc),
        event_end_date: eventDetails.end ? new Date(eventDetails.end.utc) : undefined,
        max_attendees: eventDetails.capacity,
        ticket_price: eventDetails.ticket_availability.minimum_ticket_price?.value || 0,
        currency: eventDetails.currency || 'USD',
        event_image_url: eventDetails.logo?.url,
        tags: [eventDetails.organizer.name],
        external_event_id: eventDetails.id,
        external_platform: 'eventbrite' as const
      };

      const event = await createEvent(eventData);
      return event;

    } catch (error) {
      console.error('Error importing Eventbrite event:', error);
      throw new Error('Failed to import Eventbrite event');
    }
  }

  /**
   * Search events across all platforms
   */
  async searchAllEvents(params: ThirdPartyEventSearchParams): Promise<{
    ticketmaster: TicketmasterEvent[];
    eventbrite: EventbriteEvent[];
    combined: any[];
  }> {
    try {
      const [ticketmasterEvents, eventbriteEvents] = await Promise.allSettled([
        this.searchTicketmasterEvents(params),
        this.searchEventbriteEvents(params)
      ]);

      const tmEvents = ticketmasterEvents.status === 'fulfilled' ? ticketmasterEvents.value : [];
      const ebEvents = eventbriteEvents.status === 'fulfilled' ? eventbriteEvents.value : [];

      // Combine and normalize events
      const combined = [
        ...tmEvents.map(event => ({ ...event, source: 'ticketmaster' })),
        ...ebEvents.map(event => ({ ...event, source: 'eventbrite' }))
      ];

      return {
        ticketmaster: tmEvents,
        eventbrite: ebEvents,
        combined
      };

    } catch (error) {
      console.error('Error searching all events:', error);
      throw new Error('Failed to search events');
    }
  }

  /**
   * Normalize Ticketmaster event data
   */
  private normalizeTicketmasterEvent(event: any): TicketmasterEvent {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      url: event.url,
      images: event.images,
      dates: event.dates,
      _embedded: event._embedded,
      priceRanges: event.priceRanges,
      classifications: event.classifications
    };
  }

  /**
   * Normalize Eventbrite event data
   */
  private normalizeEventbriteEvent(event: any): EventbriteEvent {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      url: event.url,
      start: event.start,
      end: event.end,
      created: event.created,
      changed: event.changed,
      published: event.published,
      status: event.status,
      currency: event.currency,
      online_event: event.online_event,
      is_free: event.is_free,
      logo: event.logo,
      organizer: event.organizer,
      venue: event.venue,
      category_id: event.category_id,
      subcategory_id: event.subcategory_id,
      format_id: event.format_id,
      ticket_availability: event.ticket_availability,
      listed: event.listed,
      shareable: event.shareable,
      invite_only: event.invite_only,
      show_remaining: event.show_remaining,
      capacity: event.capacity,
      capacity_is_custom: event.capacity_is_custom
    };
  }

  /**
   * Get available categories from Ticketmaster
   */
  async getTicketmasterCategories(): Promise<any[]> {
    try {
      const response = await this.ticketmasterClient.get('/classifications.json');
      return (response.data as any)._embedded?.classifications || [];
    } catch (error) {
      console.error('Error getting Ticketmaster categories:', error);
      return [];
    }
  }

  /**
   * Get available categories from Eventbrite
   */
  async getEventbriteCategories(): Promise<any[]> {
    try {
      const response = await this.eventbriteClient.get('/categories/');
      return (response.data as any).categories || [];
    } catch (error) {
      console.error('Error getting Eventbrite categories:', error);
      return [];
    }
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();
export default integrationService;
