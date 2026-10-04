/**
 * Offline mirror of the server ranking service.
 *
 * The weights and exclusion rules match server/src/services/ranking.js so the
 * recommendations stay consistent when the device loses connectivity and the
 * app falls back to cached shelter and hazard data.
 */
import { haversineKm, isPointInHazards } from './geo.js';

const ASSUMED_SPEED_KMH = 24;
const MAX_USEFUL_DISTANCE_KM = 25;
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

function toFacilityArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

export function scoreShelter(shelter, userLat, userLng, hazards = []) {
  const capacity = Number(shelter.capacity) || 0;
  const occupied = Number(shelter.occupied) || 0;
  const free = capacity - occupied;
  const isOpen = shelter.is_open === true || shelter.is_open === 1;

  if (!isOpen || capacity <= 0 || free <= 0) return null;
  if (hazards.length > 0 && isPointInHazards(shelter.lat, shelter.lng, hazards)) return null;

  const distanceKm = haversineKm(userLat, userLng, shelter.lat, shelter.lng);
  const etaMinutes = estimateEtaMinutes(distanceKm);
  const facilities = toFacilityArray(shelter.facilities);
  const freeRatio = clamp01(free / capacity);
  const accessibility = shelter.accessibility === true || shelter.accessibility === 1;

  const parts = {
    distance: clamp01(1 - distanceKm / MAX_USEFUL_DISTANCE_KM) * WEIGHTS.distance,
    capacity: freeRatio * WEIGHTS.capacity,
    eta: clamp01(1 - etaMinutes / estimateEtaMinutes(MAX_USEFUL_DISTANCE_KM)) * WEIGHTS.eta,
    facilities: clamp01(facilities.length / FACILITY_TARGET) * WEIGHTS.facilities,
    accessibility: (accessibility ? 1 : 0) * WEIGHTS.accessibility
  };

  const score = Object.values(parts).reduce((total, value) => total + value, 0);

  return {
    ...shelter,
    facilities,
    is_open: isOpen,
    accessibility,
    free,
    freeRatio,
    distanceKm: Number(distanceKm.toFixed(3)),
    etaMinutes: Number(etaMinutes.toFixed(1)),
    score: Number(score.toFixed(4)),
    breakdown: {
      distance: Number(parts.distance.toFixed(4)),
      capacity: Number(parts.capacity.toFixed(4)),
      eta: Number(parts.eta.toFixed(4)),
      facilities: Number(parts.facilities.toFixed(4)),
      accessibility: Number(parts.accessibility.toFixed(4))
    },
    reasons: buildReasons(distanceKm, freeRatio, facilities, accessibility)
  };
}

export function rankShelters(shelters, userLat, userLng, hazards = [], limit = 3) {
  const scored = [];
  for (const shelter of shelters ?? []) {
    const result = scoreShelter(shelter, userLat, userLng, hazards);
    if (result) scored.push(result);
  }
  scored.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
  return scored.slice(0, Math.max(1, limit));
}

/** Availability bucket used for marker and badge colours. */
export function availability(shelter) {
  const capacity = Number(shelter.capacity) || 0;
  const occupied = Number(shelter.occupied) || 0;
  const isOpen = shelter.is_open === true || shelter.is_open === 1;
  if (!isOpen) return 'closed';
  const free = capacity - occupied;
  if (free <= 0) return 'full';
  if (capacity > 0 && free / capacity < 0.25) return 'limited';
  return 'available';
}
