import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { verifyAccessToken } from '../services/jwt.service';

/**
 * @openapi
 * /api/v1/events/search:
 *   get:
 *     summary: Search events with filters
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for event title, description, or venue
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Event category ID
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City name
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State name
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country name
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for events
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for events
 *       - in: query
 *         name: price_min
 *         schema:
 *           type: number
 *         description: Minimum ticket price
 *       - in: query
 *         name: price_max
 *         schema:
 *           type: number
 *         description: Maximum ticket price
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in kilometers
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of events per page
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [event_date, created_at, title, price, popularity]
 *           default: event_date
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       500:
 *         description: Internal server error
 */

export async function searchEvents(req: Request, res: Response) {
  try {
    const searchParams = {
      query: req.query.query as string,
      category_id: req.query.category_id as string,
      city: req.query.city as string,
      state: req.query.state as string,
      country: req.query.country as string,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      price_min: req.query.price_min ? parseFloat(req.query.price_min as string) : undefined,
      price_max: req.query.price_max ? parseFloat(req.query.price_max as string) : undefined,
      latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
      longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
      radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as any,
      sort_order: req.query.sort_order as any
    };

    const result = await eventService.searchEvents(searchParams);
    res.json(result);
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({ message: 'Failed to search events' });
  }
}

/**
 * @openapi
 * /api/v1/events/featured:
 *   get:
 *     summary: Get featured events
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of featured events to return
 *     responses:
 *       200:
 *         description: Featured events retrieved successfully
 *       500:
 *         description: Internal server error
 */

export async function getFeaturedEvents(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const events = await eventService.getFeaturedEvents(limit);
    res.json(events);
  } catch (error) {
    console.error('Error getting featured events:', error);
    res.status(500).json({ message: 'Failed to get featured events' });
  }
}

/**
 * @openapi
 * /api/v1/events/categories:
 *   get:
 *     summary: Get all event categories
 *     tags:
 *       - Events
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       500:
 *         description: Internal server error
 */

export async function getEventCategories(req: Request, res: Response) {
  try {
    const categories = await eventService.getEventCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
}

/**
 * @openapi
 * /api/v1/events/{event_id}:
 *   get:
 *     summary: Get event details by ID
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */

export async function getEventById(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const event = await eventService.getEventById(event_id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ message: 'Failed to get event' });
  }
}

/**
 * @openapi
 * /api/v1/events:
 *   post:
 *     summary: Create a new event
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - title
 *               - venue_name
 *               - venue_address
 *               - city
 *               - country
 *               - event_date
 *             properties:
 *               category_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               title:
 *                 type: string
 *                 example: "Summer Music Festival 2024"
 *               description:
 *                 type: string
 *                 example: "A amazing summer music festival with top artists"
 *               venue_name:
 *                 type: string
 *                 example: "Central Park"
 *               venue_address:
 *                 type: string
 *                 example: "123 Main St, New York, NY"
 *               city:
 *                 type: string
 *                 example: "New York"
 *               state:
 *                 type: string
 *                 example: "NY"
 *               country:
 *                 type: string
 *                 example: "USA"
 *               latitude:
 *                 type: number
 *                 example: 40.7589
 *               longitude:
 *                 type: number
 *                 example: -73.9851
 *               event_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-15T18:00:00Z"
 *               event_end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-15T23:00:00Z"
 *               registration_start_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-01T00:00:00Z"
 *               registration_end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-14T23:59:59Z"
 *               max_attendees:
 *                 type: integer
 *                 example: 1000
 *               ticket_price:
 *                 type: number
 *                 example: 75.00
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               event_image_url:
 *                 type: string
 *                 example: "https://example.com/event-image.jpg"
 *               event_banner_url:
 *                 type: string
 *                 example: "https://example.com/event-banner.jpg"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["music", "festival", "summer"]
 *               is_featured:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function createEvent(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    // Destructure frontend fields
    const { 
      title, 
      description, 
      category,     
      startDate,    
      endDate,      
      address,      
      city,
      state,
      country,
      price,        
      capacity,     
      isFree,
      venueName,
      imageUrl,
      tags 
    } = req.body;

    // Validate Category (Must not be undefined)
    // If 'category' is just the name "Music", ensure your Repo handles it or Frontend sends ID.
    // For now, we assume it's passed safely.
    
    const eventData = {
      organizer_id: payload.sub,
      
      // REQUIRED FIELDS (Should throw error if missing, but let's map them first)
      title,
      venue_name: venueName || address || "Venue TBA", // Fallback if venueName is missing
      venue_address: address,
      city,
      country,
      category_id: category, 
      description: description || null,
      state: state || null,
      
      // DATES
      event_date: new Date(startDate), 
      event_end_date: endDate ? new Date(endDate) : null, 
      registration_start_date: null,
      registration_end_date: null,  
      
      // NUMBERS
      max_attendees: capacity ? parseInt(capacity) : null,
      ticket_price: isFree ? 0 : (parseFloat(price) || 0),
      currency: "GHS",
      
      // IMAGES
      event_image_url: imageUrl || null,
      event_banner_url: imageUrl || null,
      
      // ARRAYS/OTHERS
      // Note: If your Repo expects a JSON string for tags, use JSON.stringify
      tags: tags || [category] || null, 
      is_featured: false, // Default boolean
      
      // GEO (If your schema expects them, set to null)
      latitude: null,
      longitude: null
    };

    const event = await eventService.createEvent(eventData);
    res.status(201).json(event);

  } catch (error) {
    console.error('Error creating event:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to create event' });
    }
  }
}

/**
 * @openapi
 * /api/v1/events/{event_id}:
 *   put:
 *     summary: Update an event
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Summer Music Festival 2024 - Updated"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               venue_name:
 *                 type: string
 *                 example: "Central Park"
 *               venue_address:
 *                 type: string
 *                 example: "123 Main St, New York, NY"
 *               city:
 *                 type: string
 *                 example: "New York"
 *               state:
 *                 type: string
 *                 example: "NY"
 *               country:
 *                 type: string
 *                 example: "USA"
 *               latitude:
 *                 type: number
 *                 example: 40.7589
 *               longitude:
 *                 type: number
 *                 example: -73.9851
 *               event_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-15T18:00:00Z"
 *               event_end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-15T23:00:00Z"
 *               max_attendees:
 *                 type: integer
 *                 example: 1200
 *               ticket_price:
 *                 type: number
 *                 example: 85.00
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               event_image_url:
 *                 type: string
 *                 example: "https://example.com/new-event-image.jpg"
 *               status:
 *                 type: string
 *                 enum: [draft, published, cancelled, completed]
 *                 example: "published"
 *               is_featured:
 *                 type: boolean
 *                 example: true
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["music", "festival", "summer", "featured"]
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */

export async function updateEvent(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const updates = req.body;

    const event = await eventService.updateEvent(event_id, updates);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    if (error instanceof Error) {
      if (error.message === 'Event not found') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    } else {
      res.status(500).json({ message: 'Failed to update event' });
    }
  }
}

/**
 * @openapi
 * /api/v1/events/{event_id}:
 *   delete:
 *     summary: Delete an event
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */

export async function deleteEvent(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const deleted = await eventService.deleteEvent(event_id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to delete event' });
    }
  }
}

/**
 * @openapi
 * /events/{event_id}/ticket-types:
 *   get:
 *     summary: Get ticket types for an event
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Ticket types retrieved successfully
 *       500:
 *         description: Internal server error
 */

export async function getEventTicketTypes(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const ticketTypes = await eventService.getEventTicketTypes(event_id);
    res.json(ticketTypes);
  } catch (error) {
    console.error('Error getting ticket types:', error);
    res.status(500).json({ message: 'Failed to get ticket types' });
  }
}

/**
 * @openapi
 * /events/{event_id}/ticket-types:
 *   post:
 *     summary: Create a ticket type for an event
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - available_quantity
 *             properties:
 *               name:
 *                 type: string
 *                 example: "General Admission"
 *               description:
 *                 type: string
 *                 example: "Standard entry ticket"
 *               price:
 *                 type: number
 *                 example: 75.00
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               available_quantity:
 *                 type: integer
 *                 example: 500
 *               sales_start_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-01T00:00:00Z"
 *               sales_end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-14T23:59:59Z"
 *               max_per_user:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       201:
 *         description: Ticket type created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function createTicketType(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const ticketTypeData = {
      ...req.body,
      event_id
    };

    const ticketType = await eventService.createTicketType(ticketTypeData);
    res.status(201).json(ticketType);
  } catch (error) {
    console.error('Error creating ticket type:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to create ticket type' });
    }
  }
}

/**
 * @openapi
 * /events/{event_id}/favorites:
 *   post:
 *     summary: Add event to user favorites
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event added to favorites successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function addToFavorites(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const { event_id } = req.params;
    await eventService.addToFavorites(payload.sub, event_id);
    
    res.json({ message: 'Event added to favorites' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to add to favorites' });
    }
  }
}

/**
 * @openapi
 * /events/{event_id}/favorites:
 *   delete:
 *     summary: Remove event from user favorites
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event removed from favorites successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function removeFromFavorites(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const { event_id } = req.params;
    await eventService.removeFromFavorites(payload.sub, event_id);
    
    res.json({ message: 'Event removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Failed to remove from favorites' });
  }
}

/**
 * @openapi
 * /events/favorites:
 *   get:
 *     summary: Get user's favorite events
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorite events retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getUserFavorites(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const favorites = await eventService.getUserFavorites(payload.sub);
    res.json(favorites);
  } catch (error) {
    console.error('Error getting user favorites:', error);
    res.status(500).json({ message: 'Failed to get favorites' });
  }
}

/**
 * @openapi
 * /events/organizer:
 *   get:
 *     summary: Get events created by the authenticated organizer
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, cancelled, completed]
 *         description: Filter by event status
 *     responses:
 *       200:
 *         description: Organizer events retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function getOrganizerEvents(req: Request, res: Response) {
  try {
    const organizerId = (req as any).userId; 
    
    const status = req.query.status as string;
    const events = await eventService.getOrganizerEvents(organizerId, status);
    res.json(events);
  } catch (error) {
    console.error('Error getting organizer events:', error);
    res.status(500).json({ message: 'Failed to get organizer events' });
  }
}

/**
 * @openapi
 * /api/v1/events/{event_id}/analytics:
 *   get:
 *     summary: Get event analytics
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */

export async function getEventAnalytics(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const analytics = await eventService.getEventAnalytics(event_id);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting event analytics:', error);
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to get event analytics' });
    }
  }
}
