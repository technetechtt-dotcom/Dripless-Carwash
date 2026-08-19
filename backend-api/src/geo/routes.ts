import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { autocompleteAddress, assertValidCoordinates } from './geocode.js';
import { assertInServiceArea, reverseGeocode, roadRoute } from './zones.js';

export const geoRouter = Router();

geoRouter.get('/autocomplete', authRequired, async (req, res, next) => {
  try {
    const query = String(req.query.q || '');
    const results = await autocompleteAddress(query);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

geoRouter.post(
  '/reverse',
  authRequired,
  validate(z.object({ lat: z.number(), lng: z.number() }).strict()),
  async (req, res, next) => {
    try {
      assertValidCoordinates(req.body.lat, req.body.lng);
      res.json({ address: await reverseGeocode(req.body.lat, req.body.lng) });
    } catch (error) {
      next(error);
    }
  }
);

geoRouter.post(
  '/route',
  authRequired,
  validate(
    z
      .object({
        from: z.object({ lat: z.number(), lng: z.number() }),
        to: z.object({ lat: z.number(), lng: z.number() })
      })
      .strict()
  ),
  async (req, res, next) => {
    try {
      assertValidCoordinates(req.body.from.lat, req.body.from.lng);
      assertValidCoordinates(req.body.to.lat, req.body.to.lng);
      res.json(await roadRoute(req.body.from, req.body.to));
    } catch (error) {
      next(error);
    }
  }
);

geoRouter.post(
  '/availability',
  authRequired,
  validate(
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        scheduledAt: z.string().datetime().optional()
      })
      .strict()
  ),
  async (req, res, next) => {
    try {
      assertValidCoordinates(req.body.lat, req.body.lng);
      const area = await assertInServiceArea(
        { lat: req.body.lat, lng: req.body.lng },
        undefined,
        req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date()
      );
      res.json({ available: true, area });
    } catch (error) {
      next(error);
    }
  }
);
