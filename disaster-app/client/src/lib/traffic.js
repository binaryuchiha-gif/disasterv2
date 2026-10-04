/**
 * Traffic helpers.
 *
 * Flow tiles are requested from our own server so the TomTom key is never
 * exposed. When no key is configured the server reports source "simulated" and
 * this module synthesises a plausible congestion layer over a set of known
 * Chennai corridors, which the interface labels clearly as simulated.
 */

export const TRAFFIC_TILE_URL = '/api/traffic/tile/{z}/{x}/{y}.png';

/** Congestion bands shared by the real and simulated layers. */
export const TRAFFIC_LEVELS = [
  { id: 'free', label: 'Free flow', color: '#10B981' },
  { id: 'slow', label: 'Slow', color: '#F59E0B' },
  { id: 'heavy', label: 'Heavy', color: '#EF4444' },
  { id: 'blocked', label: 'Blocked', color: '#7F1D1D' }
];

export const TRAFFIC_LEVEL_COLORS = TRAFFIC_LEVELS.reduce((map, level) => {
  map[level.id] = level.color;
  return map;
}, {});

/** Incident severity reported by the server mapped onto the same palette. */
export const INCIDENT_SEVERITY_COLORS = {
  blocked: '#7F1D1D',
  major: '#EF4444',
  moderate: '#F59E0B',
  minor: '#FBBF24',
  unknown: '#64748B'
};

/**
 * Major corridors used by the simulated layer, as [lat, lng] pairs.
 * These follow real arterial roads so the simulation looks credible on the map.
 */
const CORRIDORS = [
  {
    id: 'anna-salai',
    name: 'Anna Salai',
    points: [
      [13.0827, 80.2707],
      [13.0674, 80.2585],
      [13.0523, 80.2503],
      [13.0399, 80.2412],
      [13.0272, 80.2345]
    ]
  },
  {
    id: 'ecr',
    name: 'East Coast Road',
    points: [
      [13.0002, 80.2669],
      [12.983, 80.2594],
      [12.9405, 80.2435],
      [12.8921, 80.2402],
      [12.8312, 80.2335]
    ]
  },
  {
    id: 'gst',
    name: 'Grand Southern Trunk Road',
    points: [
      [13.0732, 80.2609],
      [13.0421, 80.2203],
      [13.0098, 80.1805],
      [12.9732, 80.1402],
      [12.9249, 80.1]
    ]
  },
  {
    id: 'inner-ring',
    name: 'Inner Ring Road',
    points: [
      [13.1143, 80.2329],
      [13.0876, 80.2101],
      [13.0524, 80.2225],
      [13.0219, 80.2178],
      [12.9815, 80.2176]
    ]
  },
  {
    id: 'poonamallee',
    name: 'Poonamallee High Road',
    points: [
      [13.0732, 80.2609],
      [13.0756, 80.2301],
      [13.0801, 80.1902],
      [13.0912, 80.1501],
      [13.1147, 80.1098]
    ]
  },
  {
    id: 'ennore-road',
    name: 'Ennore High Road',
    points: [
      [13.1167, 80.2833],
      [13.1489, 80.2967],
      [13.1802, 80.3105],
      [13.2146, 80.3234]
    ]
  },
  {
    id: 'omr',
    name: 'Old Mahabalipuram Road',
    points: [
      [12.983, 80.2594],
      [12.9552, 80.2402],
      [12.9078, 80.2278],
      [12.8402, 80.2241],
      [12.7925, 80.2208]
    ]
  }
];

/**
 * Deterministic pseudo-random value in [0, 1) from a string seed.
 * Keeping it deterministic means the simulated layer is stable between renders
 * and only changes when the time bucket advances.
 */
function seededRandom(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Convert to an unsigned 32 bit value, then normalise.
  return ((hash >>> 0) % 100000) / 100000;
}

function levelFromValue(value) {
  if (value > 0.92) return 'blocked';
  if (value > 0.68) return 'heavy';
  if (value > 0.38) return 'slow';
  return 'free';
}

/**
 * Builds the simulated congestion layer.
 * Each corridor is split into segments whose level shifts every two minutes,
 * so the demonstration shows movement without needing a network call.
 */
export function buildSimulatedTraffic(bucketMs = 120000) {
  const bucket = Math.floor(Date.now() / bucketMs);
  const segments = [];

  for (const corridor of CORRIDORS) {
    for (let i = 0; i < corridor.points.length - 1; i += 1) {
      const seed = `${corridor.id}:${i}:${bucket}`;
      const value = seededRandom(seed);
      const level = levelFromValue(value);
      segments.push({
        id: `${corridor.id}-${i}`,
        name: corridor.name,
        level,
        color: TRAFFIC_LEVEL_COLORS[level],
        positions: [corridor.points[i], corridor.points[i + 1]],
        // A rough delay figure so the popup has something concrete to show.
        delayMinutes: Math.round(value * 14)
      });
    }
  }
  return segments;
}

/**
 * Builds a handful of simulated incidents so the incident layer and its popups
 * can still be demonstrated without a key.
 */
export function buildSimulatedIncidents(bucketMs = 120000) {
  const bucket = Math.floor(Date.now() / bucketMs);
  const candidates = [
    { id: 'sim-1', lat: 13.0674, lng: 80.2585, from: 'Anna Salai', to: 'Teynampet' },
    { id: 'sim-2', lat: 13.0098, lng: 80.1805, from: 'GST Road', to: 'Chromepet' },
    { id: 'sim-3', lat: 13.1489, lng: 80.2967, from: 'Ennore High Road', to: 'Tiruvottiyur' },
    { id: 'sim-4', lat: 12.9552, lng: 80.2402, from: 'Old Mahabalipuram Road', to: 'Perungudi' },
    { id: 'sim-5', lat: 13.0876, lng: 80.2101, from: 'Inner Ring Road', to: 'Anna Nagar' }
  ];

  const severities = ['minor', 'moderate', 'major', 'blocked'];

  return candidates
    .map((candidate, index) => {
      const value = seededRandom(`${candidate.id}:${bucket}`);
      // Only show roughly half of them at any moment.
      if (value < 0.35) return null;
      const severity = severities[Math.floor(seededRandom(`${candidate.id}:s:${bucket}`) * 4)];
      const closed = severity === 'blocked';
      return {
        id: candidate.id,
        lat: candidate.lat,
        lng: candidate.lng,
        description: closed
          ? 'Road closed to traffic, use an alternative route'
          : 'Slow moving traffic reported on this stretch',
        severity,
        closed,
        delaySeconds: Math.round(value * 900),
        lengthMeters: Math.round(400 + value * 2600),
        from: candidate.from,
        to: candidate.to,
        roadNumbers: [],
        simulated: true,
        order: index
      };
    })
    .filter(Boolean);
}

/** Formats a traffic delay for display, returning null when it is negligible. */
export function formatTrafficDelay(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes < 0.5) return null;
  return `${Math.round(minutes)} min`;
}
