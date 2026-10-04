/**
 * Client geometry helpers.
 *
 * Turf provides the polygon maths so that hazard intersection tests behave
 * identically to the rest of the geospatial pipeline.
 */
import { booleanPointInPolygon, lineIntersect, lineString, point as turfPoint } from '@turf/turf';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function metresBetween(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000;
}

/** Normalises a stored hazard zone into turf-ready polygon features. */
export function hazardToPolygons(hazard) {
  const geo = typeof hazard?.geojson === 'string' ? safeParse(hazard.geojson) : hazard?.geojson;
  if (!geo) return [];

  if (geo.type === 'FeatureCollection') {
    return (geo.features ?? []).flatMap((feature) => hazardToPolygons({ geojson: feature }));
  }
  if (geo.type === 'Feature') {
    return hazardToPolygons({ geojson: geo.geometry });
  }
  if (geo.type === 'Polygon') {
    return [{ type: 'Feature', properties: {}, geometry: geo }];
  }
  if (geo.type === 'MultiPolygon') {
    return (geo.coordinates ?? []).map((coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates }
    }));
  }
  return [];
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** True when the coordinate falls inside any of the supplied hazard zones. */
export function isPointInHazards(lat, lng, hazards) {
  const pt = turfPoint([lng, lat]);
  for (const hazard of hazards) {
    for (const polygonFeature of hazardToPolygons(hazard)) {
      try {
        if (booleanPointInPolygon(pt, polygonFeature)) return hazard;
      } catch {
        // A malformed polygon should never break the ranking pipeline.
      }
    }
  }
  return null;
}

/**
 * Counts how many times a route line crosses the supplied hazard zones.
 * `coordinates` is an array of [lng, lat] pairs as returned by OSRM.
 */
export function countHazardIntersections(coordinates, hazards) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;

  let line;
  try {
    line = lineString(coordinates);
  } catch {
    return 0;
  }

  let crossings = 0;
  for (const hazard of hazards) {
    for (const polygonFeature of hazardToPolygons(hazard)) {
      try {
        const result = lineIntersect(line, polygonFeature);
        crossings += result.features?.length ?? 0;
      } catch {
        // Ignore unusable geometry rather than failing the route choice.
      }
    }
  }
  return crossings;
}

/** Returns true when any vertex of the route sits inside a hazard zone. */
export function routeEntersHazard(coordinates, hazards) {
  if (!Array.isArray(coordinates)) return false;
  const step = Math.max(1, Math.floor(coordinates.length / 40));
  for (let i = 0; i < coordinates.length; i += step) {
    const [lng, lat] = coordinates[i];
    if (isPointInHazards(lat, lng, hazards)) return true;
  }
  return false;
}

/** Shortest distance in metres from a point to a line segment. */
function pointToSegmentMetres(lat, lng, aLat, aLng, bLat, bLng) {
  // Project to a local planar frame; accurate enough over street distances.
  const latToM = 111320;
  const lngToM = 111320 * Math.cos((lat * Math.PI) / 180);

  const px = (lng - aLng) * lngToM;
  const py = (lat - aLat) * latToM;
  const sx = (bLng - aLng) * lngToM;
  const sy = (bLat - aLat) * latToM;

  const lengthSquared = sx * sx + sy * sy;
  if (lengthSquared === 0) return Math.hypot(px, py);

  // Clamp the projection onto the segment.
  const t = Math.max(0, Math.min(1, (px * sx + py * sy) / lengthSquared));
  return Math.hypot(px - t * sx, py - t * sy);
}

/**
 * Shortest distance in metres from a position to a route polyline.
 * `latLngs` is an array of [lat, lng] pairs. Returns Infinity for a bad route.
 */
export function distanceToRouteMetres(position, latLngs) {
  if (!position || !Array.isArray(latLngs) || latLngs.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let shortest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < latLngs.length - 1; i += 1) {
    const [aLat, aLng] = latLngs[i];
    const [bLat, bLng] = latLngs[i + 1];
    const distance = pointToSegmentMetres(position.lat, position.lng, aLat, aLng, bLat, bLng);
    if (distance < shortest) shortest = distance;
  }
  return shortest;
}

/**
 * Finds the index of the route vertex nearest to the position, used to work
 * out which turn instruction applies now.
 */
export function nearestRouteIndex(position, latLngs) {
  if (!position || !Array.isArray(latLngs) || latLngs.length === 0) return 0;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < latLngs.length; i += 1) {
    const [lat, lng] = latLngs[i];
    const distance = haversineKm(position.lat, position.lng, lat, lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}
