import { Request, Response } from 'express';
import { integrationService } from '../services/integration.service.js';
import { eventService } from '../services/event.service.js';
import { verifyAccessToken } from '../services/jwt.service.js';

/**
 * @openapi
 * /api/v1/integrations/search:
 *   get:
 *     summary: Search events from third-party platforms
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for events
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Event category
 *       - in: query
 *         name: platforms
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [ticketmaster, eventbrite]
 *         description: Platforms to search
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of events per platform
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Events from third-party platforms retrieved successfully
 *       500:
 *         description: Internal server error
 */

export async function searchThirdPartyEvents(req: Request, res: Response) {
  try {
    const searchParams = {
      query: req.query.query as string,
      city: req.query.city as string,
      state: req.query.state as string,
      country: req.query.country as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      category: req.query.category as string,
      latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
      longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
      radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
      size: req.query.size ? parseInt(req.query.size as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      platforms: req.query.platforms ? (req.query.platforms as string).split(',') : ['ticketmaster', 'eventbrite']
    };

    const result = await eventService.searchThirdPartyEvents(searchParams);
    res.json(result);
  } catch (error) {
    console.error('Error searching third-party events:', error);
    res.status(500).json({ message: 'Failed to search third-party events' });
  }
}

/**
 * @openapi
 * /api/v1/integrations/import:
 *   post:
 *     summary: Import event from third-party platform
 *     tags:
 *       - Integrations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_id
 *               - platform
 *               - category_id
 *             properties:
 *               event_id:
 *                 type: string
 *                 example: "1234567890"
 *                 description: Event ID from the third-party platform
 *               platform:
 *                 type: string
 *                 enum: [ticketmaster, eventbrite]
 *                 example: "ticketmaster"
 *               category_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *                 description: Category ID to assign to the imported event
 *     responses:
 *       201:
 *         description: Event imported successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function importThirdPartyEvent(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token) as any;
    
    const { event_id, platform, category_id } = req.body;

    if (!event_id || !platform || !category_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['ticketmaster', 'eventbrite'].includes(platform)) {
      return res.status(400).json({ message: 'Invalid platform' });
    }

    const importedEvent = await eventService.importThirdPartyEvent(
      event_id,
      platform as 'ticketmaster' | 'eventbrite',
      payload.sub,
      category_id
    );

    res.status(201).json(importedEvent);
  } catch (error) {
    console.error('Error importing third-party event:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to import event' });
    }
  }
}

/**
 * @openapi
 * /api/v1/integrations/categories:
 *   get:
 *     summary: Get categories from third-party platforms
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [ticketmaster, eventbrite]
 *         description: Platform to get categories from
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       500:
 *         description: Internal server error
 */

export async function getThirdPartyCategories(req: Request, res: Response) {
  try {
    const { platform } = req.query;

    let categories: any[] = [];
    
    if (!platform || platform === 'ticketmaster') {
      const ticketmasterCategories = await integrationService.getTicketmasterCategories();
      categories = [...categories, ...ticketmasterCategories.map(cat => ({ ...cat, platform: 'ticketmaster' }))];
    }
    
    if (!platform || platform === 'eventbrite') {
      const eventbriteCategories = await integrationService.getEventbriteCategories();
      categories = [...categories, ...eventbriteCategories.map(cat => ({ ...cat, platform: 'eventbrite' }))];
    }

    res.json(categories);
  } catch (error) {
    console.error('Error getting third-party categories:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
}

/**
 * @openapi
 * /api/v1/integrations/ticketmaster/events/{event_id}:
 *   get:
 *     summary: Get Ticketmaster event details
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticketmaster event ID
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */

export async function getTicketmasterEventDetails(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const eventDetails = await integrationService.getTicketmasterEventDetails(event_id);
    
    if (!eventDetails) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(eventDetails);
  } catch (error) {
    console.error('Error getting Ticketmaster event details:', error);
    res.status(500).json({ message: 'Failed to get event details' });
  }
}

/**
 * @openapi
 * /api/v1/integrations/eventbrite/events/{event_id}:
 *   get:
 *     summary: Get Eventbrite event details
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Eventbrite event ID
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */

export async function getEventbriteEventDetails(req: Request, res: Response) {
  try {
    const { event_id } = req.params;
    const eventDetails = await integrationService.getEventbriteEventDetails(event_id);
    
    if (!eventDetails) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(eventDetails);
  } catch (error) {
    console.error('Error getting Eventbrite event details:', error);
    res.status(500).json({ message: 'Failed to get event details' });
  }
}
