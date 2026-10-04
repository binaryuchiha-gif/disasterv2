/**
 * Shelter ranking.
 *
 * Shelters are hard-excluded when they are closed, full, or located inside an
 * active hazard zone for the selected disaster. Remaining shelters receive a
 * weighted score between 0 and 1 (higher is better) along with a breakdown so
 * the interface can explain each recommendation.
 */
import { findContainingZone, haversineKm, parseGeoJson } from './geo.js';

/** Average driving speed assumption for city evacuation traffic, km/h. */
const ASSUMED_SPEED_KMH = 24;

/** Distance beyond which the distance component contributes nothing. */
const MAX_USEFUL_DISTANCE_KM = 25;

/** Facility count that saturates the facilities component. */
const FACILITY_TARGET = 6;

export const WEIGHTS = {
  distance: 0.4,
  capacity: 0.3,
  eta: 0.15,
  facilities: 0.1,
  accessibility: 0.05
};

export function estimateEtaMinutes(distanceKm) {
  return (distanceKm / ASSUMED_SPEED_KMH) * 60;
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function parseFacilities(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Scores a single shelter against a user position.
 * Returns null when the shelter must be excluded.
 */
export function scoreShelter(shelter, userLat, userLng, hazardZones) {
  const capacity = Number(shelter.capacity) || 0;
  const occupied = Number(shelter.occupied) || 0;
  const free = capacity - occupied;

  if (!shelter.is_open) {
    return null;
  }
  if (capacity <= 0 || free <= 0) {
    return null;
  }

  const blockingZone = findContainingZone(shelter.lat, shelter.lng, hazardZones);
  if (blockingZone) {
    return null;
  }

  const distanceKm = haversineKm(userLat, userLng, shelter.lat, shelter.lng);
  const etaMinutes = estimateEtaMinutes(distanceKm);
  const facilities = parseFacilities(shelter.facilities);
  const freeRatio = clamp01(free / capacity);

  const components = {
    distance: clamp01(1 - distanceKm / MAX_USEFUL_DISTANCE_KM),
    capacity: freeRatio,
    eta: clamp01(1 - etaMinutes / estimateEtaMinutes(MAX_USEFUL_DISTANCE_KM)),
    facilities: clamp01(facilities.length / FACILITY_TARGET),
    accessibility: shelter.accessibility ? 1 : 0
  };

  const score =
    components.distance * WEIGHTS.distance +
    components.capacity * WEIGHTS.capacity +
    components.eta * WEIGHTS.eta +
    components.facilities * WEIGHTS.facilities +
    components.accessibility * WEIGHTS.accessibility;

  return {
    ...shelter,
    facilities,
    is_open: Boolean(shelter.is_open),
    accessibility: Boolean(shelter.accessibility),
    free,
    freeRatio,
    distanceKm: Number(distanceKm.toFixed(3)),
    etaMinutes: Number(etaMinutes.toFixed(1)),
    score: Number(score.toFixed(4)),
    breakdown: {
      distance: Number((components.distance * WEIGHTS.distance).toFixed(4)),
      capacity: Number((components.capacity * WEIGHTS.capacity).toFixed(4)),
      eta: Number((components.eta * WEIGHTS.eta).toFixed(4)),
      facilities: Number((components.facilities * WEIGHTS.facilities).toFixed(4)),
      accessibility: Number((components.accessibility * WEIGHTS.accessibility).toFixed(4))
    },
    reasons: buildReasons(distanceKm, freeRatio, facilities, shelter.accessibility)
  };
}

function buildReasons(distanceKm, freeRatio, facilities, accessibility) {
  const reasons = [];
  if (distanceKm <= 3) reasons.push('Within a short distance of your location');
  else if (distanceKm <= 8) reasons.push('Reachable within a moderate drive');
  if (freeRatio >= 0.5) reasons.push('More than half of the capacity is free');
  else if (freeRatio >= 0.25) reasons.push('Space is available but filling up');
  if (facilities.length >= 4) reasons.push('Well equipped with essential facilities');
  if (accessibility) reasons.push('Step-free access available');
  if (reasons.length === 0) reasons.push('Open and outside the active hazard zones');
  return reasons;
}

/**
 * Ranks shelters for a position.
 * hazardZones should already be filtered to the active zones that apply.
 */
export function rankShelters(shelters, userLat, userLng, hazardZones = [], limit = 3) {
  const zones = hazardZones.map((zone) => ({
    ...zone,
    geometry: zone.geometry ?? parseGeoJson(zone.geojson)
  }));

  const scored = [];
  for (const shelter of shelters) {
    const result = scoreShelter(shelter, userLat, userLng, zones);
    if (result) scored.push(result);
  }

  scored.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
  return scored.slice(0, Math.max(1, limit));
}
