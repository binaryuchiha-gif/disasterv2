/**
 * Location risk indicator.
 *
 * Combines three independent signals into a Low, Medium or High rating and
 * returns the contributing factors so the interface can explain the result
 * rather than presenting an unexplained number.
 */
import { haversineKm, isPointInHazards } from './geo.js';

/** Weighted points per signal. The thresholds below turn points into a band. */
const THRESHOLDS = { medium: 3, high: 6 };

/** Earthquakes further away than this are ignored. */
const QUAKE_RADIUS_KM = 500;

/** Only earthquakes from the last two days count towards current risk. */
const QUAKE_WINDOW_MS = 48 * 60 * 60 * 1000;

function floodPoints(weather) {
  const level = weather?.floodRisk?.level;
  switch (level) {
    case 'severe':
      return { points: 4, label: 'Severe rainfall and flood risk forecast' };
    case 'high':
      return { points: 3, label: 'Heavy rainfall expected in the next 24 hours' };
    case 'moderate':
      return { points: 2, label: 'Moderate rainfall expected' };
    case 'low':
      return { points: 0, label: 'No significant rainfall forecast' };
    default:
      return { points: 1, label: 'Weather data unavailable, treated as uncertain' };
  }
}

function windPoints(weather) {
  const wind = Number(weather?.current?.windKph);
  if (!Number.isFinite(wind)) return null;
  if (wind >= 88) return { points: 3, label: `Damaging winds of ${Math.round(wind)} kph` };
  if (wind >= 62) return { points: 2, label: `Gale force winds of ${Math.round(wind)} kph` };
  if (wind >= 40) return { points: 1, label: `Strong breeze of ${Math.round(wind)} kph` };
  return null;
}

function hazardPoints(position, hazards) {
  if (!position || !Array.isArray(hazards) || hazards.length === 0) return null;

  const containing = isPointInHazards(position.lat, position.lng, hazards);
  if (containing) {
    const severity = Number(containing.severity) || 1;
    return {
      points: 2 + severity,
      label: `Inside the hazard zone "${containing.name}"`
    };
  }

  // Not inside a zone, but a nearby active zone still raises the rating.
  let nearest = null;
  for (const hazard of hazards) {
    const geometry =
      typeof hazard.geojson === 'string' ? safeParse(hazard.geojson) : hazard.geojson;
    const ring = firstRing(geometry);
    if (!ring) continue;
    for (const [lng, lat] of ring) {
      const distance = haversineKm(position.lat, position.lng, lat, lng);
      if (nearest === null || distance < nearest.distance) {
        nearest = { distance, hazard };
      }
    }
  }

  if (nearest && nearest.distance <= 2) {
    return {
      points: 2,
      label: `Within ${nearest.distance.toFixed(1)} km of "${nearest.hazard.name}"`
    };
  }
  if (nearest && nearest.distance <= 6) {
    return {
      points: 1,
      label: `A hazard zone is ${nearest.distance.toFixed(1)} km away`
    };
  }
  return { points: 0, label: 'Outside every active hazard zone' };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function firstRing(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Feature') return firstRing(geometry.geometry);
  if (geometry.type === 'FeatureCollection') return firstRing(geometry.features?.[0]);
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0] ?? null;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.[0]?.[0] ?? null;
  return null;
}

function earthquakePoints(position, events) {
  if (!position || !Array.isArray(events) || events.length === 0) return null;

  const cutoff = Date.now() - QUAKE_WINDOW_MS;
  let strongest = null;

  for (const event of events) {
    const magnitude = Number(event.magnitude);
    if (!Number.isFinite(magnitude)) continue;

    const time = event.time ? new Date(event.time).getTime() : null;
    if (time !== null && time < cutoff) continue;

    const distance = haversineKm(position.lat, position.lng, event.lat, event.lng);
    if (distance > QUAKE_RADIUS_KM) continue;

    if (!strongest || magnitude > strongest.magnitude) {
      strongest = { magnitude, distance, place: event.place };
    }
  }

  if (!strongest) return { points: 0, label: 'No recent earthquakes nearby' };

  const { magnitude, distance, place } = strongest;
  const label = `Magnitude ${magnitude.toFixed(1)} earthquake ${Math.round(distance)} km away near ${place}`;

  if (magnitude >= 6 && distance <= 300) return { points: 4, label };
  if (magnitude >= 5 && distance <= 400) return { points: 3, label };
  if (magnitude >= 4) return { points: 2, label };
  return { points: 1, label };
}

function trafficPoints(incidents) {
  if (!Array.isArray(incidents) || incidents.length === 0) return null;
  const closures = incidents.filter((incident) => incident.closed).length;
  if (closures >= 2) {
    return { points: 2, label: `${closures} road closures reported nearby` };
  }
  if (closures === 1) {
    return { points: 1, label: 'A road closure is reported nearby' };
  }
  if (incidents.length >= 4) {
    return { points: 1, label: `${incidents.length} traffic incidents reported nearby` };
  }
  return null;
}

/**
 * Computes the risk rating.
 * Every input is optional so the indicator degrades instead of disappearing.
 */
export function computeLocationRisk({ position, weather, hazards, earthquakes, incidents }) {
  const factors = [];
  let total = 0;

  const add = (result, signal) => {
    if (!result) return;
    total += result.points;
    factors.push({ signal, points: result.points, label: result.label });
  };

  add(floodPoints(weather), 'Rainfall');
  add(windPoints(weather), 'Wind');
  add(hazardPoints(position, hazards), 'Hazard zones');
  add(earthquakePoints(position, earthquakes), 'Seismic activity');
  add(trafficPoints(incidents), 'Road conditions');

  const level = total >= THRESHOLDS.high ? 'high' : total >= THRESHOLDS.medium ? 'medium' : 'low';

  const summary = {
    low: 'Conditions at your location look stable. Stay aware of official updates.',
    medium: 'Conditions need attention. Prepare to move if the situation develops.',
    high: 'Conditions are dangerous. Move to a recommended shelter without delay.'
  }[level];

  return {
    level,
    score: total,
    summary,
    // Strongest contributors first so the explanation leads with what matters.
    factors: factors.slice().sort((a, b) => b.points - a.points),
    hasData: factors.length > 0
  };
}
