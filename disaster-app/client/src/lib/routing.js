/**
 * Route planning against the public OSRM demo server.
 *
 * Of the returned alternatives the route crossing the fewest active hazard
 * polygons is preferred. When OSRM cannot be reached the caller receives a
 * straight-line estimate so navigation guidance degrades rather than vanishing.
 */
import { countHazardIntersections, haversineKm, routeEntersHazard } from './geo.js';
import { STORAGE_KEYS } from './constants.js';
import { readJson, writeJson } from './storage.js';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 9000;

/** Converts an OSRM step into a readable instruction. */
export function describeStep(step) {
  const maneuver = step?.maneuver ?? {};
  const type = maneuver.type ?? 'continue';
  const modifier = maneuver.modifier ?? '';
  const road = step?.name ?? '';

  const base = (() => {
    switch (type) {
      case 'depart':
        return 'Start';
      case 'arrive':
        return 'Arrive at the shelter';
      case 'turn':
        return modifier ? `Turn ${modifier}` : 'Turn';
      case 'new name':
        return 'Continue';
      case 'roundabout':
      case 'rotary':
        return 'Take the roundabout';
      case 'merge':
        return modifier ? `Merge ${modifier}` : 'Merge';
      case 'fork':
        return modifier ? `Keep ${modifier}` : 'Keep ahead';
      case 'end of road':
        return modifier ? `At the end of the road turn ${modifier}` : 'At the end of the road';
      default:
        return modifier ? `Continue ${modifier}` : 'Continue';
    }
  })();

  if (type === 'arrive') return base;
  return road ? `${base} onto ${road}` : base;
}

function normalizeRoute(route, hazards) {
  const coordinates = route?.geometry?.coordinates ?? [];
  const steps = (route?.legs?.[0]?.steps ?? []).map((step) => ({
    instruction: describeStep(step),
    distanceM: step?.distance ?? 0,
    durationS: step?.duration ?? 0
  }));

  return {
    coordinates,
    // Leaflet expects [lat, lng] while GeoJSON supplies [lng, lat].
    latLngs: coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: (route?.distance ?? 0) / 1000,
    durationMin: (route?.duration ?? 0) / 60,
    freeFlowDurationMin: (route?.duration ?? 0) / 60,
    trafficDelayMin: 0,
    trafficAware: false,
    steps,
    hazardIntersections: countHazardIntersections(coordinates, hazards),
    crossesHazard: routeEntersHazard(coordinates, hazards),
    estimated: false
  };
}

/** Adds hazard metrics to a route returned by the traffic service. */
function normalizeTrafficRoute(route, hazards) {
  const coordinates = Array.isArray(route?.coordinates) ? route.coordinates : [];
  return {
    coordinates,
    latLngs: coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: Number(route?.distanceKm) || 0,
    durationMin: Number(route?.durationMin) || 0,
    freeFlowDurationMin: Number(route?.freeFlowDurationMin) || Number(route?.durationMin) || 0,
    trafficDelayMin: Number(route?.trafficDelayMin) || 0,
    trafficAware: true,
    steps: Array.isArray(route?.steps)
      ? route.steps.map((step) => ({
          instruction: step.instruction,
          distanceM: Number(step.distanceM) || 0,
          durationS: 0
        }))
      : [],
    hazardIntersections: countHazardIntersections(coordinates, hazards),
    crossesHazard: routeEntersHazard(coordinates, hazards),
    estimated: false
  };
}

export function buildGoogleMapsLink(origin, destination) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

/** Straight-line fallback used when the routing service is unavailable. */
export function buildEstimatedRoute(origin, destination, hazards = []) {
  const coordinates = [
    [origin.lng, origin.lat],
    [destination.lng, destination.lat]
  ];
  const distanceKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  return {
    coordinates,
    latLngs: coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm,
    durationMin: (distanceKm / 24) * 60,
    freeFlowDurationMin: (distanceKm / 24) * 60,
    trafficDelayMin: 0,
    trafficAware: false,
    steps: [],
    hazardIntersections: countHazardIntersections(coordinates, hazards),
    crossesHazard: routeEntersHazard(coordinates, hazards),
    estimated: true
  };
}

export function cacheRoute(payload) {
  writeJson(STORAGE_KEYS.lastRoute, { ...payload, cachedAt: new Date().toISOString() });
}

export function readCachedRoute() {
  return readJson(STORAGE_KEYS.lastRoute, null);
}

/**
 * Selection rule shared by both route sources: fewest hazard crossings first,
 * then the shortest traffic-adjusted travel time.
 */
function selectSafestRoute(candidates) {
  return candidates
    .slice()
    .sort((a, b) => a.hazardIntersections - b.hazardIntersections || a.durationMin - b.durationMin);
}

/**
 * Traffic-aware routing through our own server, which holds the TomTom key.
 * Returns null when traffic routing is not available so the caller can fall
 * back to OSRM.
 */
async function planTrafficRoute(origin, destination, hazards) {
  try {
    const response = await fetch('/api/traffic/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, maxAlternatives: 2 })
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (data?.fallback || !Array.isArray(data.routes) || data.routes.length === 0) {
      return null;
    }

    const candidates = data.routes
      .map((route) => normalizeTrafficRoute(route, hazards))
      .filter((route) => route.latLngs.length >= 2);
    if (candidates.length === 0) return null;

    const ordered = selectSafestRoute(candidates);
    const chosen = ordered[0];

    return {
      ...chosen,
      alternativesConsidered: candidates.length,
      hazardAvoiding: candidates.length > 1 && chosen.hazardIntersections === 0,
      source: 'tomtom',
      googleMapsUrl: buildGoogleMapsLink(origin, destination)
    };
  } catch {
    return null;
  }
}

/**
 * Fetches a route and selects the safest alternative.
 *
 * Traffic-aware routing is attempted first so the travel time reflects live
 * conditions. If it is unavailable the public OSRM service is used, and if that
 * also fails a straight-line estimate is returned. This function always
 * resolves.
 */
export async function planRoute(origin, destination, hazards = [], { useTraffic = true } = {}) {
  if (useTraffic) {
    const trafficRoute = await planTrafficRoute(origin, destination, hazards);
    if (trafficRoute) {
      cacheRoute({ origin, destination, route: trafficRoute });
      return trafficRoute;
    }
  }

  const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Routing service responded with status ${response.status}`);
    }
    const data = await response.json();
    if (data?.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error('Routing service returned no usable route');
    }

    const candidates = data.routes.map((route) => normalizeRoute(route, hazards));
    const chosen = selectSafestRoute(candidates)[0];
    const result = {
      ...chosen,
      alternativesConsidered: candidates.length,
      hazardAvoiding: candidates.length > 1 && chosen.hazardIntersections === 0,
      source: 'osrm',
      googleMapsUrl: buildGoogleMapsLink(origin, destination)
    };
    cacheRoute({ origin, destination, route: result });
    return result;
  } catch (error) {
    const fallback = buildEstimatedRoute(origin, destination, hazards);
    return {
      ...fallback,
      alternativesConsidered: 0,
      hazardAvoiding: false,
      source: 'estimated',
      googleMapsUrl: buildGoogleMapsLink(origin, destination),
      warning:
        error.name === 'AbortError'
          ? 'The routing service did not respond in time. Showing a straight-line estimate.'
          : 'The routing service is unavailable. Showing a straight-line estimate.'
    };
  } finally {
    clearTimeout(timeout);
  }
}
