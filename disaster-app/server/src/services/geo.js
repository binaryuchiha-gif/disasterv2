/**
 * Geometry helpers that intentionally avoid external dependencies so the server
 * stays lightweight. The client mirrors this logic using turf for offline use.
 */

const EARTH_RADIUS_KM = 6371;

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ray casting point-in-ring test.
 * ring is an array of [lng, lat] pairs following the GeoJSON axis order.
 */
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const straddles = yi > lat !== yj > lat;
    if (straddles && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Point in a GeoJSON Polygon coordinate array, honouring holes. */
function pointInPolygonCoords(lng, lat, coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  if (!pointInRing(lng, lat, coordinates[0])) return false;
  for (let i = 1; i < coordinates.length; i += 1) {
    if (pointInRing(lng, lat, coordinates[i])) return false;
  }
  return true;
}

/**
 * Tests a point against a GeoJSON geometry, Feature or FeatureCollection.
 * Supports Polygon and MultiPolygon geometries.
 */
export function pointInGeoJson(lat, lng, geojson) {
  if (!geojson || typeof geojson !== 'object') return false;

  if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    return geojson.features.some((feature) => pointInGeoJson(lat, lng, feature));
  }
  if (geojson.type === 'Feature') {
    return pointInGeoJson(lat, lng, geojson.geometry);
  }
  if (geojson.type === 'Polygon') {
    return pointInPolygonCoords(lng, lat, geojson.coordinates);
  }
  if (geojson.type === 'MultiPolygon') {
    return (geojson.coordinates || []).some((polygon) => pointInPolygonCoords(lng, lat, polygon));
  }
  return false;
}

/** Safely parses a stored GeoJSON string, returning null when malformed. */
export function parseGeoJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns the first hazard zone that contains the given point, or null.
 * Each zone is expected to expose a parsed `geometry` property.
 */
export function findContainingZone(lat, lng, zones) {
  for (const zone of zones) {
    const geometry = zone.geometry ?? parseGeoJson(zone.geojson);
    if (geometry && pointInGeoJson(lat, lng, geometry)) {
      return zone;
    }
  }
  return null;
}
