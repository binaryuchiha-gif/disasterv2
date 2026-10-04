/**
 * TomTom traffic integration.
 *
 * The API key is read from the environment and never leaves the server: flow
 * tiles are proxied through /api/traffic/tile so the browser never sees it.
 * Every response is cached in memory for 90 seconds.
 *
 * When no key is configured each function returns a payload carrying
 * `source: 'simulated'` or `fallback: true`, which lets the client switch to
 * OSRM routing and a clearly labelled simulated traffic layer.
 */

const CACHE_TTL_MS = 90 * 1000;
const REQUEST_TIMEOUT_MS = 9000;
const TILE_CACHE_TTL_MS = 90 * 1000;
const TILE_CACHE_MAX_ENTRIES = 400;

const INCIDENTS_URL = 'https://api.tomtom.com/traffic/services/5/incidentDetails';
const ROUTING_URL = 'https://api.tomtom.com/routing/1/calculateRoute';
const FLOW_TILE_URL = 'https://api.tomtom.com/traffic/map/4/tile/flow';

const VALID_FLOW_STYLES = ['relative', 'absolute', 'relative-delay', 'reduced-sensitivity'];

const cache = new Map();
const tileCache = new Map();

export function getApiKey() {
  const key = process.env.TOMTOM_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function hasApiKey() {
  return getApiKey() !== null;
}

export function getFlowStyle() {
  const style = (process.env.TOMTOM_FLOW_STYLE || 'relative').trim();
  return VALID_FLOW_STYLES.includes(style) ? style : 'relative';
}

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  return { ...entry, fresh: Date.now() - entry.storedAt < CACHE_TTL_MS };
}

function writeCache(key, data) {
  cache.set(key, { data, storedAt: Date.now() });
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });
    if (!response.ok) {
      const error = new Error(`TomTom responded with status ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* --------------------------------------------------------------- incidents */

/** Maps TomTom's magnitudeOfDelay scale onto labels used by the interface. */
export function severityFromMagnitude(magnitude) {
  switch (Number(magnitude)) {
    case 4:
      return 'blocked';
    case 3:
      return 'major';
    case 2:
      return 'moderate';
    case 1:
      return 'minor';
    default:
      return 'unknown';
  }
}

/**
 * TomTom iconCategory values that represent a closed road.
 * 8 is "road closed" in the documented category list.
 */
function isClosure(properties) {
  if (Number(properties?.iconCategory) === 8) return true;
  const events = Array.isArray(properties?.events) ? properties.events : [];
  return events.some((event) => /clos/i.test(event?.description ?? ''));
}

function pickPoint(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates;
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
  }
  if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
    // Use the midpoint of the affected stretch so the pin sits on the incident.
    const coords = geometry.coordinates.filter(
      (pair) => Array.isArray(pair) && typeof pair[0] === 'number'
    );
    if (coords.length === 0) return null;
    const [lng, lat] = coords[Math.floor(coords.length / 2)];
    return { lat, lng };
  }
  return null;
}

/** Exported for unit testing against recorded response shapes. */
export function normalizeIncidents(raw) {
  const incidents = Array.isArray(raw?.incidents) ? raw.incidents : [];
  return incidents
    .map((incident, index) => {
      const properties = incident?.properties ?? {};
      const point = pickPoint(incident?.geometry);
      if (!point) return null;

      const events = Array.isArray(properties.events) ? properties.events : [];
      const description =
        events
          .map((event) => event?.description)
          .filter(Boolean)
          .join('. ') || 'Traffic incident reported';

      return {
        id: properties.id ?? incident.id ?? `incident-${index}`,
        lat: point.lat,
        lng: point.lng,
        geometry: incident?.geometry ?? null,
        description,
        severity: severityFromMagnitude(properties.magnitudeOfDelay),
        closed: isClosure(properties),
        delaySeconds: Number(properties.delay) || 0,
        lengthMeters: Number(properties.length) || 0,
        from: properties.from ?? null,
        to: properties.to ?? null,
        roadNumbers: Array.isArray(properties.roadNumbers) ? properties.roadNumbers : [],
        startTime: properties.startTime ?? null,
        endTime: properties.endTime ?? null,
        iconCategory: properties.iconCategory ?? null
      };
    })
    .filter(Boolean);
}

/** Field selection keeps the payload small. Dropped automatically on reject. */
const INCIDENT_FIELDS =
  '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,' +
  'startTime,endTime,from,to,length,delay,roadNumbers,events{description,code,iconCategory}}}}';

/**
 * Fetches incidents inside a bounding box.
 * bbox is "minLon,minLat,maxLon,maxLat".
 */
export async function getIncidents(bbox) {
  const key = getApiKey();
  const cacheKey = `incidents:${bbox}`;
  const cached = readCache(cacheKey);

  if (!key) {
    return {
      incidents: [],
      source: 'simulated',
      fallback: true,
      reason: 'No TomTom API key is configured on the server.',
      fetchedAt: new Date().toISOString()
    };
  }

  if (cached?.fresh) {
    return {
      ...cached.data,
      source: 'tomtom',
      fallback: false,
      cached: true,
      fetchedAt: new Date(cached.storedAt).toISOString()
    };
  }

  const base = new URLSearchParams({
    key,
    bbox,
    language: 'en-GB',
    timeValidityFilter: 'present'
  });

  try {
    let raw;
    try {
      raw = await fetchJson(`${INCIDENTS_URL}?${base.toString()}&fields=${INCIDENT_FIELDS}`);
    } catch (error) {
      // Some key tiers reject the explicit field selection; retry with defaults.
      if (error.status === 400) {
        raw = await fetchJson(`${INCIDENTS_URL}?${base.toString()}`);
      } else {
        throw error;
      }
    }

    const payload = { incidents: normalizeIncidents(raw) };
    writeCache(cacheKey, payload);
    return {
      ...payload,
      source: 'tomtom',
      fallback: false,
      cached: false,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    if (cached) {
      return {
        ...cached.data,
        source: 'tomtom',
        fallback: true,
        stale: true,
        reason: 'Showing the last known incidents, the traffic service is unreachable.',
        fetchedAt: new Date(cached.storedAt).toISOString()
      };
    }
    return {
      incidents: [],
      source: 'simulated',
      fallback: true,
      reason: `Traffic incidents unavailable: ${error.message}`,
      fetchedAt: new Date().toISOString()
    };
  }
}

/* ----------------------------------------------------------------- routing */

/** Exported for unit testing against recorded response shapes. */
export function normalizeTomTomRoute(route) {
  const summary = route?.summary ?? {};
  const legs = Array.isArray(route?.legs) ? route.legs : [];

  // Points arrive as {latitude, longitude}; convert to GeoJSON order so the
  // rest of the pipeline can treat every route source identically.
  const coordinates = [];
  for (const leg of legs) {
    for (const point of leg?.points ?? []) {
      if (typeof point?.latitude === 'number' && typeof point?.longitude === 'number') {
        coordinates.push([point.longitude, point.latitude]);
      }
    }
  }

  const instructions = Array.isArray(route?.guidance?.instructions)
    ? route.guidance.instructions
    : [];

  const steps = instructions
    .map((instruction) => ({
      instruction:
        instruction?.message ?? instruction?.combinedMessage ?? instruction?.maneuver ?? 'Continue',
      distanceM: Number(instruction?.routeOffsetInMeters) || 0,
      street: instruction?.street ?? null
    }))
    .filter((step) => step.instruction);

  const travelTimeSeconds = Number(summary.travelTimeInSeconds) || 0;
  const noTrafficSeconds = Number(summary.noTrafficTravelTimeInSeconds) || travelTimeSeconds;
  const delaySeconds = Number(summary.trafficDelayInSeconds) || 0;

  return {
    coordinates,
    distanceKm: (Number(summary.lengthInMeters) || 0) / 1000,
    durationMin: travelTimeSeconds / 60,
    freeFlowDurationMin: noTrafficSeconds / 60,
    trafficDelayMin: delaySeconds / 60,
    steps
  };
}

/**
 * Traffic-aware routing with alternatives.
 * Hazard filtering is applied by the caller, which owns the hazard geometry.
 */
export async function getTrafficRoute(origin, destination, { maxAlternatives = 2 } = {}) {
  const key = getApiKey();
  if (!key) {
    return {
      routes: [],
      source: 'simulated',
      fallback: true,
      reason: 'No TomTom API key is configured, use OSRM on the client instead.'
    };
  }

  const locations = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
  const cacheKey = `route:${locations}:${maxAlternatives}`;
  const cached = readCache(cacheKey);
  if (cached?.fresh) {
    return { ...cached.data, source: 'tomtom', fallback: false, cached: true };
  }

  const params = new URLSearchParams({
    key,
    traffic: 'true',
    routeType: 'fastest',
    travelMode: 'car',
    maxAlternatives: String(maxAlternatives),
    computeTravelTimeFor: 'all',
    instructionsType: 'text',
    routeRepresentation: 'polyline',
    language: 'en-GB'
  });

  try {
    const raw = await fetchJson(
      `${ROUTING_URL}/${encodeURIComponent(locations)}/json?${params.toString()}`
    );
    const routes = (Array.isArray(raw?.routes) ? raw.routes : [])
      .map(normalizeTomTomRoute)
      .filter((route) => route.coordinates.length >= 2);

    if (routes.length === 0) {
      throw new Error('The routing service returned no usable route');
    }

    const payload = { routes };
    writeCache(cacheKey, payload);
    return { ...payload, source: 'tomtom', fallback: false, cached: false };
  } catch (error) {
    if (cached) {
      return {
        ...cached.data,
        source: 'tomtom',
        fallback: true,
        stale: true,
        reason: 'Showing the last known route, the traffic service is unreachable.'
      };
    }
    return {
      routes: [],
      source: 'simulated',
      fallback: true,
      reason: `Traffic routing unavailable: ${error.message}`
    };
  }
}

/**
 * Traffic-aware travel time between two points.
 * Used to enrich the shelter ranking without fetching full geometry.
 */
export async function getTravelTime(origin, destination) {
  const result = await getTrafficRoute(origin, destination, { maxAlternatives: 0 });
  if (result.fallback || result.routes.length === 0) {
    return { available: false, reason: result.reason ?? null };
  }
  const best = result.routes[0];
  return {
    available: true,
    durationMin: best.durationMin,
    freeFlowDurationMin: best.freeFlowDurationMin,
    trafficDelayMin: best.trafficDelayMin,
    distanceKm: best.distanceKm
  };
}

/* -------------------------------------------------------------- flow tiles */

function trimTileCache() {
  if (tileCache.size <= TILE_CACHE_MAX_ENTRIES) return;
  const excess = tileCache.size - TILE_CACHE_MAX_ENTRIES;
  let removed = 0;
  for (const cacheKey of tileCache.keys()) {
    tileCache.delete(cacheKey);
    removed += 1;
    if (removed >= excess) break;
  }
}

/**
 * Fetches a single raster flow tile and returns the raw bytes so the route
 * handler can stream it to the browser without revealing the key.
 */
export async function getFlowTile(z, x, y) {
  const key = getApiKey();
  if (!key) return { available: false, reason: 'No TomTom API key is configured.' };

  const cacheKey = `${z}/${x}/${y}`;
  const cached = tileCache.get(cacheKey);
  if (cached && Date.now() - cached.storedAt < TILE_CACHE_TTL_MS) {
    return { available: true, buffer: cached.buffer, contentType: cached.contentType };
  }

  const styles = [getFlowStyle()];
  if (!styles.includes('absolute')) styles.push('absolute');

  let lastError = null;
  for (const style of styles) {
    const url = `${FLOW_TILE_URL}/${style}/${z}/${x}/${y}.png?key=${encodeURIComponent(key)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        lastError = new Error(`Tile request failed with status ${response.status}`);
        // A rejected style is worth retrying with the documented fallback.
        if (response.status === 400 || response.status === 404) continue;
        break;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') ?? 'image/png';
      tileCache.set(cacheKey, { buffer, contentType, storedAt: Date.now() });
      trimTileCache();
      return { available: true, buffer, contentType };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { available: false, reason: lastError?.message ?? 'Tile unavailable' };
}

export function getTrafficStatus() {
  return {
    configured: hasApiKey(),
    source: hasApiKey() ? 'tomtom' : 'simulated',
    flowStyle: getFlowStyle(),
    tileUrlTemplate: '/api/traffic/tile/{z}/{x}/{y}.png',
    cacheSeconds: CACHE_TTL_MS / 1000
  };
}
