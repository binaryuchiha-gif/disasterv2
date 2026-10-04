import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getFlowTile,
  getIncidents,
  getTrafficRoute,
  getTrafficStatus
} from '../services/traffic.js';

const router = Router();

/** Accepts "minLon,minLat,maxLon,maxLat" and checks the ordering. */
const bboxSchema = z.object({
  bbox: z
    .string()
    .trim()
    .regex(
      /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
      'bbox must be minLon,minLat,maxLon,maxLat'
    )
    .refine((value) => {
      const [minLon, minLat, maxLon, maxLat] = value.split(',').map(Number);
      return (
        minLon >= -180 &&
        maxLon <= 180 &&
        minLat >= -90 &&
        maxLat <= 90 &&
        minLon < maxLon &&
        minLat < maxLat
      );
    }, 'bbox values are out of range or in the wrong order')
});

const pointSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

const routeSchema = z.object({
  origin: pointSchema,
  destination: pointSchema,
  maxAlternatives: z.coerce.number().int().min(0).max(5).optional().default(2)
});

const tileSchema = z.object({
  z: z.coerce.number().int().min(0).max(22),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0)
});

router.get('/status', (req, res) => {
  res.json(getTrafficStatus());
});

router.get('/incidents', validate(bboxSchema, 'query'), async (req, res, next) => {
  try {
    res.json(await getIncidents(req.validatedQuery.bbox));
  } catch (error) {
    next(error);
  }
});

router.post('/route', validate(routeSchema), async (req, res, next) => {
  try {
    const { origin, destination, maxAlternatives } = req.body;
    res.json(await getTrafficRoute(origin, destination, { maxAlternatives }));
  } catch (error) {
    next(error);
  }
});

/**
 * Flow tile proxy. The browser requests this path so the TomTom key stays on
 * the server. A missing key yields 204 so Leaflet simply draws nothing rather
 * than logging a stream of image errors.
 */
router.get('/tile/:z/:x/:y.png', validate(tileSchema, 'params'), async (req, res, next) => {
  try {
    const { z, x, y } = req.validatedParams;
    const tile = await getFlowTile(z, x, y);
    if (!tile.available) {
      res.status(204).end();
      return;
    }
    res.set('Content-Type', tile.contentType);
    res.set('Cache-Control', 'public, max-age=90');
    res.send(tile.buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
