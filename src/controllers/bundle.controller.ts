import { Request, Response } from 'express';
import {
  createBundle,
  getBundleById,
  getBundlesByOrganizer,
  getAllBundles,
  updateBundle,
  deleteBundle,
  addEventToBundle,
  removeEventFromBundle,
  getBundleWithEvents
} from '../repositories/bundle.repo';
import { getEventById } from '../repositories/event.repo';

export async function createBundleHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { name, description, price, currency, event_ids } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required',
      });
    }

    const bundle = await createBundle({
      organizer_id: userId,
      name,
      description,
      price: parseFloat(price),
      currency: currency || 'USD'
    });

    // Add events to bundle if provided
    if (event_ids && Array.isArray(event_ids)) {
      for (const event_id of event_ids) {
        const event = await getEventById(event_id);
        if (event && event.organizer_id === userId) {
          await addEventToBundle(bundle.bundle_id, event_id);
        }
      }
    }

    const bundleWithEvents = await getBundleWithEvents(bundle.bundle_id);

    return res.status(201).json({
      success: true,
      data: bundleWithEvents,
      message: 'Bundle created successfully'
    });
  } catch (error) {
    console.error('Create bundle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getBundlesHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;

    let bundles;
    if (userRole === 'Admin') {
      bundles = await getAllBundles();
    } else {
      bundles = await getBundlesByOrganizer(userId);
    }

    // Get events for each bundle
    const bundlesWithEvents = await Promise.all(
      bundles.map(async (bundle) => await getBundleWithEvents(bundle.bundle_id))
    );

    return res.json({
      success: true,
      data: bundlesWithEvents
    });
  } catch (error) {
    console.error('Get bundles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getBundleHandler(req: Request, res: Response) {
  try {
    const { bundle_id } = req.params;
    const bundle = await getBundleWithEvents(bundle_id);

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found',
      });
    }

    return res.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    console.error('Get bundle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function updateBundleHandler(req: Request, res: Response) {
  try {
    const { bundle_id } = req.params;
    const userId = (req as any).userId;
    const updates = req.body;

    const bundle = await getBundleById(bundle_id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found',
      });
    }

    if (bundle.organizer_id !== userId && (req as any).user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    const updated = await updateBundle(bundle_id, updates);
    const bundleWithEvents = await getBundleWithEvents(bundle_id);

    return res.json({
      success: true,
      data: bundleWithEvents,
      message: 'Bundle updated successfully'
    });
  } catch (error) {
    console.error('Update bundle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function deleteBundleHandler(req: Request, res: Response) {
  try {
    const { bundle_id } = req.params;
    const userId = (req as any).userId;

    const bundle = await getBundleById(bundle_id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found',
      });
    }

    if (bundle.organizer_id !== userId && (req as any).user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    await deleteBundle(bundle_id);

    return res.json({
      success: true,
      message: 'Bundle deleted successfully'
    });
  } catch (error) {
    console.error('Delete bundle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function addEventToBundleHandler(req: Request, res: Response) {
  try {
    const { bundle_id } = req.params;
    const { event_id } = req.body;
    const userId = (req as any).userId;

    const bundle = await getBundleById(bundle_id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found',
      });
    }

    if (bundle.organizer_id !== userId && (req as any).user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    const event = await getEventById(event_id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await addEventToBundle(bundle_id, event_id);
    const bundleWithEvents = await getBundleWithEvents(bundle_id);

    return res.json({
      success: true,
      data: bundleWithEvents,
      message: 'Event added to bundle successfully'
    });
  } catch (error) {
    console.error('Add event to bundle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function removeEventFromBundleHandler(req: Request, res: Response) {
  try {
    const { bundle_id, event_id } = req.params;
    const userId = (req as any).userId;

    const bundle = await getBundleById(bundle_id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found',
      });
    }

    if (bundle.organizer_id !== userId && (req as any).user?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    await removeEventFromBundle(bundle_id, event_id);
    const bundleWithEvents = await getBundleWithEvents(bundle_id);

    return res.json({
      success: true,
      data: bundleWithEvents,
      message: 'Event removed from bundle successfully'
    });
  } catch (error) {
    console.error('Remove event from bundle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

