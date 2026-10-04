import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getEarthquakes, getWeather } from '../services/liveFeeds.js';

const router = Router();

const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional().default(13.0827),
  lng: z.coerce.number().min(-180).max(180).optional().default(80.2707)
});

router.get('/earthquakes', async (req, res, next) => {
  try {
    res.json(await getEarthquakes());
  } catch (error) {
    next(error);
  }
});

router.get('/weather', validate(weatherQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { lat, lng } = req.validatedQuery;
    res.json(await getWeather(lat, lng));
  } catch (error) {
    next(error);
  }
});

export default router;
