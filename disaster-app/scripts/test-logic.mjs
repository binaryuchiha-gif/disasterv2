/**
 * Logic tests for the geospatial and ranking core.
 *
 * These run without installing anything, because the modules under test have
 * no external dependencies. The optional parity section additionally compares
 * the browser ranking against the server ranking once node_modules is present.
 *
 * Run with: npm run test:logic
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (relativePath) => import(pathToFileURL(path.join(root, relativePath)).href);

const { haversineKm, pointInGeoJson } = await load('server/src/services/geo.js');
const { rankShelters, scoreShelter } = await load('server/src/services/ranking.js');
const { SHELTERS, HAZARD_ZONES, CONTACTS, USERS } = await load('server/src/seedData.js');

const DISASTERS = ['flood', 'cyclone', 'earthquake', 'fire', 'tsunami'];
const CHENNAI = { lat: 13.0827, lng: 80.2707 };

let passed = 0;

/** Runs a check, awaiting it when the body is asynchronous. */
async function check(label, fn) {
  await fn();
  passed += 1;
  console.log(`ok    ${label}`);
}

/* ------------------------------------------------------------------- geo */

await check('haversine returns a plausible intra-city distance', () => {
  const distance = haversineKm(13.0827, 80.2707, 12.9815, 80.2176);
  assert.ok(distance > 10 && distance < 14, `expected 10-14 km, received ${distance}`);
});

await check('haversine is symmetric and zero for identical points', () => {
  assert.equal(haversineKm(13, 80, 13, 80), 0);
  const a = haversineKm(13, 80, 12, 81);
  const b = haversineKm(12, 81, 13, 80);
  assert.ok(Math.abs(a - b) < 1e-9);
});

const square = {
  type: 'Polygon',
  coordinates: [
    [
      [80.0, 13.0],
      [80.1, 13.0],
      [80.1, 13.1],
      [80.0, 13.1],
      [80.0, 13.0]
    ]
  ]
};

await check('point in polygon detects inside, outside and wrapper types', () => {
  assert.equal(pointInGeoJson(13.05, 80.05, square), true);
  assert.equal(pointInGeoJson(13.5, 80.05, square), false);
  assert.equal(pointInGeoJson(13.05, 80.05, { type: 'Feature', geometry: square }), true);
  assert.equal(
    pointInGeoJson(13.05, 80.05, {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: square }]
    }),
    true
  );
  assert.equal(pointInGeoJson(13.05, 80.05, null), false);
});

/* --------------------------------------------------------------- ranking */

const baseShelter = {
  id: 1,
  name: 'Test Shelter',
  lat: 13.08,
  lng: 80.27,
  capacity: 100,
  occupied: 10,
  is_open: 1,
  facilities: '["water","food"]',
  accessibility: 1
};

await check('closed, full and hazard-bound shelters are excluded', () => {
  assert.equal(scoreShelter({ ...baseShelter, is_open: 0 }, 13.08, 80.27, []), null);
  assert.equal(scoreShelter({ ...baseShelter, occupied: 100 }, 13.08, 80.27, []), null);
  assert.equal(scoreShelter({ ...baseShelter, capacity: 0 }, 13.08, 80.27, []), null);
  const inside = { ...baseShelter, lat: 13.05, lng: 80.05 };
  assert.equal(scoreShelter(inside, 13.08, 80.27, [{ geometry: square }]), null);
});

await check('score stays within range and the breakdown sums to the score', () => {
  const result = scoreShelter(baseShelter, 13.08, 80.27, []);
  assert.ok(result, 'expected a scored shelter');
  assert.ok(result.score > 0 && result.score <= 1, `score out of range: ${result.score}`);
  const sum = Object.values(result.breakdown).reduce((total, value) => total + value, 0);
  assert.ok(Math.abs(sum - result.score) < 0.0101, `breakdown ${sum} vs score ${result.score}`);
  assert.deepEqual(result.facilities, ['water', 'food']);
  assert.ok(result.reasons.length > 0);
});

await check('a nearer shelter outranks a distant one with equal capacity', () => {
  const near = { ...baseShelter, id: 1, lat: 13.085, lng: 80.272 };
  const far = { ...baseShelter, id: 2, lat: 13.3, lng: 80.5 };
  const ranked = rankShelters([far, near], 13.08, 80.27, [], 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, 1);
});

await check('ranking honours the limit and returns nothing when all are excluded', () => {
  const list = [1, 2, 3].map((id) => ({ ...baseShelter, id, lat: 13.08 + id * 0.01 }));
  assert.equal(rankShelters(list, 13.08, 80.27, [], 2).length, 2);
  const closed = list.map((item) => ({ ...item, is_open: 0 }));
  assert.equal(rankShelters(closed, 13.08, 80.27, [], 3).length, 0);
});

await check('malformed facilities JSON degrades to an empty list', () => {
  const result = scoreShelter({ ...baseShelter, facilities: 'not json' }, 13.08, 80.27, []);
  assert.deepEqual(result.facilities, []);
});

/* ------------------------------------------------------------- seed data */

await check('seed dataset has the expected shape', () => {
  assert.equal(SHELTERS.length, 20);
  assert.equal(HAZARD_ZONES.length, 12);
  assert.equal(CONTACTS.length, 8);
  assert.equal(USERS.length, 2);
  for (const [label, rows] of [
    ['shelters', SHELTERS],
    ['hazards', HAZARD_ZONES],
    ['contacts', CONTACTS]
  ]) {
    const ids = rows.map((row) => row.id);
    assert.equal(new Set(ids).size, ids.length, `${label} ids must be unique`);
  }
});

await check('every shelter has valid coordinates, capacity and contact details', () => {
  for (const shelter of SHELTERS) {
    assert.ok(shelter.lat > 12 && shelter.lat < 14, `${shelter.id} latitude`);
    assert.ok(shelter.lng > 79.5 && shelter.lng < 81, `${shelter.id} longitude`);
    assert.ok(shelter.capacity > 0, `${shelter.id} capacity`);
    assert.ok(
      shelter.occupied >= 0 && shelter.occupied <= shelter.capacity,
      `${shelter.id} occupancy`
    );
    assert.ok(shelter.facilities.length > 0, `${shelter.id} facilities`);
    assert.ok(/^\d{10,12}$/.test(shelter.phone), `${shelter.id} phone`);
  }
});

await check('hazard polygons are closed rings using the GeoJSON axis order', () => {
  for (const zone of HAZARD_ZONES) {
    assert.ok(DISASTERS.includes(zone.disaster_type), `zone ${zone.id} type`);
    assert.ok(zone.severity >= 1 && zone.severity <= 3, `zone ${zone.id} severity`);
    const ring = zone.geojson.coordinates[0];
    assert.ok(ring.length >= 4, `zone ${zone.id} needs 4 or more points`);
    assert.deepEqual(ring[0], ring.at(-1), `zone ${zone.id} ring must be closed`);
    for (const [lng, lat] of ring) {
      assert.ok(lng > 79.5 && lng < 81, `zone ${zone.id} longitude ${lng}`);
      assert.ok(lat > 12 && lat < 14, `zone ${zone.id} latitude ${lat}`);
    }
  }
});

await check('each disaster type has at least one hazard zone', () => {
  for (const disaster of DISASTERS) {
    const count = HAZARD_ZONES.filter((zone) => zone.disaster_type === disaster).length;
    assert.ok(count > 0, `${disaster} has no hazard zone`);
  }
});

await check('hazard polygons actually contain their named areas', () => {
  const probes = [
    { zone: 1, lat: 13.0055, lng: 80.2395, label: 'Adyar flood plain' },
    { zone: 3, lat: 12.9815, lng: 80.2176, label: 'Velachery basin' },
    { zone: 5, lat: 13.045, lng: 80.2812, label: 'Marina corridor' }
  ];
  for (const probe of probes) {
    const zone = HAZARD_ZONES.find((item) => item.id === probe.zone);
    assert.equal(
      pointInGeoJson(probe.lat, probe.lng, zone.geojson),
      true,
      `${probe.label} appears degenerate`
    );
  }
});

const dbShaped = SHELTERS.map((shelter) => ({
  ...shelter,
  is_open: 1,
  facilities: JSON.stringify(shelter.facilities)
}));

await check('ranking returns three usable shelters for every disaster type', () => {
  for (const disaster of DISASTERS) {
    const zones = HAZARD_ZONES.filter((zone) => zone.disaster_type === disaster && zone.active).map(
      (zone) => ({ ...zone, geometry: zone.geojson })
    );

    const ranked = rankShelters(dbShaped, CHENNAI.lat, CHENNAI.lng, zones, 3);
    assert.equal(ranked.length, 3, `${disaster} returned ${ranked.length}`);
    assert.ok(ranked[0].score > 0, `${disaster} top score`);

    for (const shelter of ranked) {
      for (const zone of zones) {
        assert.equal(
          pointInGeoJson(shelter.lat, shelter.lng, zone.geojson),
          false,
          `${disaster}: "${shelter.name}" lies inside "${zone.name}"`
        );
      }
    }
  }
});

await check('at-capacity shelters never appear in the ranking', () => {
  const full = SHELTERS.filter((shelter) => shelter.occupied >= shelter.capacity);
  assert.ok(full.length > 0, 'the dataset should include at least one full shelter');
  const ranked = rankShelters(dbShaped, CHENNAI.lat, CHENNAI.lng, [], SHELTERS.length);
  for (const shelter of full) {
    assert.ok(!ranked.some((item) => item.id === shelter.id), `${shelter.name} must be excluded`);
  }
});

/* --------------------------------- optional server and browser parity ---- */

let parityChecked = false;
try {
  const clientRanking = await load('client/src/lib/ranking.js');
  for (const disaster of DISASTERS) {
    const zones = HAZARD_ZONES.filter((zone) => zone.disaster_type === disaster && zone.active);
    const serverTop = rankShelters(
      dbShaped,
      CHENNAI.lat,
      CHENNAI.lng,
      zones.map((zone) => ({ ...zone, geometry: zone.geojson })),
      3
    );
    const clientTop = clientRanking.rankShelters(dbShaped, CHENNAI.lat, CHENNAI.lng, zones, 3);

    assert.deepEqual(
      clientTop.map((item) => item.id),
      serverTop.map((item) => item.id),
      `${disaster}: offline ranking order differs from the server`
    );
    for (let i = 0; i < serverTop.length; i += 1) {
      assert.ok(
        Math.abs(clientTop[i].score - serverTop[i].score) < 1e-6,
        `${disaster}: score mismatch on shelter ${serverTop[i].id}`
      );
    }
  }
  parityChecked = true;
  passed += 1;
  console.log('ok    offline ranking matches the server for all five disaster types');
} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('note  parity check skipped, run npm install to compare offline ranking');
  } else {
    throw error;
  }
}

/* ------------------------------------------------- traffic response parsing */

const traffic = await load('server/src/services/traffic.js');

await check('TomTom severity scale maps onto interface labels', () => {
  assert.equal(traffic.severityFromMagnitude(4), 'blocked');
  assert.equal(traffic.severityFromMagnitude(3), 'major');
  assert.equal(traffic.severityFromMagnitude(2), 'moderate');
  assert.equal(traffic.severityFromMagnitude(1), 'minor');
  assert.equal(traffic.severityFromMagnitude(0), 'unknown');
  assert.equal(traffic.severityFromMagnitude(undefined), 'unknown');
});

await check('incident parser reads a documented TomTom payload', () => {
  // Shape follows the Traffic Incident Details v5 response.
  const payload = {
    incidents: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [80.2707, 13.0827] },
        properties: {
          id: 'abc123',
          iconCategory: 8,
          magnitudeOfDelay: 4,
          startTime: '2026-10-04T10:00:00Z',
          endTime: null,
          from: 'Anna Salai',
          to: 'Mount Road',
          length: 1800,
          delay: 600,
          roadNumbers: ['NH45'],
          events: [{ description: 'Road closed due to flooding', code: 401, iconCategory: 8 }]
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [80.24, 13.01],
            [80.25, 13.02],
            [80.26, 13.03]
          ]
        },
        properties: {
          iconCategory: 6,
          magnitudeOfDelay: 2,
          events: [{ description: 'Slow traffic' }]
        }
      },
      // A malformed entry must be dropped, not crash the parser.
      { type: 'Feature', geometry: null, properties: {} }
    ]
  };

  const parsed = traffic.normalizeIncidents(payload);
  assert.equal(parsed.length, 2, 'the entry without geometry should be dropped');

  const [closure, slow] = parsed;
  assert.equal(closure.id, 'abc123');
  assert.equal(closure.lat, 13.0827);
  assert.equal(closure.lng, 80.2707);
  assert.equal(closure.closed, true, 'iconCategory 8 is a closure');
  assert.equal(closure.severity, 'blocked');
  assert.equal(closure.delaySeconds, 600);
  assert.equal(closure.description, 'Road closed due to flooding');
  assert.deepEqual(closure.roadNumbers, ['NH45']);

  // A LineString incident is pinned at its midpoint.
  assert.equal(slow.lat, 13.02);
  assert.equal(slow.lng, 80.25);
  assert.equal(slow.closed, false);
  assert.equal(slow.severity, 'moderate');
});

await check('incident parser detects closures from the event text', () => {
  const parsed = traffic.normalizeIncidents({
    incidents: [
      {
        geometry: { type: 'Point', coordinates: [80.1, 13.1] },
        properties: {
          iconCategory: 1,
          magnitudeOfDelay: 3,
          events: [{ description: 'Carriageway closed northbound' }]
        }
      }
    ]
  });
  assert.equal(parsed[0].closed, true);
});

await check('incident parser tolerates an empty or malformed response', () => {
  assert.deepEqual(traffic.normalizeIncidents(null), []);
  assert.deepEqual(traffic.normalizeIncidents({}), []);
  assert.deepEqual(traffic.normalizeIncidents({ incidents: 'nonsense' }), []);
});

await check('route parser reads a documented calculateRoute payload', () => {
  // Shape follows the Routing API v1 calculateRoute response.
  const payload = {
    summary: {
      lengthInMeters: 7400,
      travelTimeInSeconds: 1500,
      trafficDelayInSeconds: 300,
      noTrafficTravelTimeInSeconds: 1200
    },
    legs: [
      {
        points: [
          { latitude: 13.0827, longitude: 80.2707 },
          { latitude: 13.07, longitude: 80.26 },
          { latitude: 13.06, longitude: 80.25 }
        ]
      }
    ],
    guidance: {
      instructions: [
        { message: 'Turn left onto Anna Salai', routeOffsetInMeters: 0, street: 'Anna Salai' },
        { message: 'Arrive at your destination', routeOffsetInMeters: 7400 }
      ]
    }
  };

  const parsed = traffic.normalizeTomTomRoute(payload);
  assert.equal(parsed.distanceKm, 7.4);
  assert.equal(parsed.durationMin, 25);
  assert.equal(parsed.freeFlowDurationMin, 20);
  assert.equal(parsed.trafficDelayMin, 5, 'traffic delay should be 300 seconds');
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.steps[0].instruction, 'Turn left onto Anna Salai');

  // TomTom supplies {latitude, longitude}; the pipeline expects [lng, lat].
  assert.deepEqual(parsed.coordinates[0], [80.2707, 13.0827]);
  assert.equal(parsed.coordinates.length, 3);
});

await check('route parser falls back when traffic fields are absent', () => {
  const parsed = traffic.normalizeTomTomRoute({
    summary: { lengthInMeters: 1000, travelTimeInSeconds: 600 },
    legs: [
      {
        points: [
          { latitude: 13, longitude: 80 },
          { latitude: 13.1, longitude: 80.1 }
        ]
      }
    ]
  });
  assert.equal(parsed.trafficDelayMin, 0);
  // With no free-flow figure the travel time stands in for it.
  assert.equal(parsed.freeFlowDurationMin, 10);
  assert.deepEqual(parsed.steps, []);
});

await check('traffic status reports the simulated source with no key', () => {
  const previous = process.env.TOMTOM_API_KEY;
  delete process.env.TOMTOM_API_KEY;
  const status = traffic.getTrafficStatus();
  assert.equal(status.configured, false);
  assert.equal(status.source, 'simulated');
  assert.equal(status.tileUrlTemplate, '/api/traffic/tile/{z}/{x}/{y}.png');

  process.env.TOMTOM_API_KEY = 'test-key';
  const configured = traffic.getTrafficStatus();
  assert.equal(configured.configured, true);
  assert.equal(configured.source, 'tomtom');

  if (previous === undefined) delete process.env.TOMTOM_API_KEY;
  else process.env.TOMTOM_API_KEY = previous;
});

await check('the flow style falls back for an unrecognised value', () => {
  const previous = process.env.TOMTOM_FLOW_STYLE;
  process.env.TOMTOM_FLOW_STYLE = 'nonsense';
  assert.equal(traffic.getFlowStyle(), 'relative');
  process.env.TOMTOM_FLOW_STYLE = 'absolute';
  assert.equal(traffic.getFlowStyle(), 'absolute');
  if (previous === undefined) delete process.env.TOMTOM_FLOW_STYLE;
  else process.env.TOMTOM_FLOW_STYLE = previous;
});

await check('traffic calls degrade cleanly when no key is configured', async () => {
  const previous = process.env.TOMTOM_API_KEY;
  delete process.env.TOMTOM_API_KEY;

  const incidents = await traffic.getIncidents('80,13,81,14');
  assert.equal(incidents.fallback, true);
  assert.equal(incidents.source, 'simulated');
  assert.deepEqual(incidents.incidents, []);

  const route = await traffic.getTrafficRoute({ lat: 13, lng: 80 }, { lat: 13.1, lng: 80.1 });
  assert.equal(route.fallback, true);
  assert.deepEqual(route.routes, []);

  const tile = await traffic.getFlowTile(10, 1, 1);
  assert.equal(tile.available, false);

  const travel = await traffic.getTravelTime({ lat: 13, lng: 80 }, { lat: 13.1, lng: 80.1 });
  assert.equal(travel.available, false);

  if (previous === undefined) delete process.env.TOMTOM_API_KEY;
  else process.env.TOMTOM_API_KEY = previous;
});

/* ------------------------------------------- simulated traffic and helpers */

const clientTraffic = await load('client/src/lib/traffic.js');

await check('simulated traffic covers the corridors and uses valid levels', () => {
  const segments = clientTraffic.buildSimulatedTraffic();
  assert.ok(segments.length >= 20, `expected many segments, got ${segments.length}`);

  const allowed = new Set(['free', 'slow', 'heavy', 'blocked']);
  for (const segment of segments) {
    assert.ok(allowed.has(segment.level), `unexpected level ${segment.level}`);
    assert.equal(segment.positions.length, 2);
    assert.ok(segment.color.startsWith('#'));
    // Coordinates must sit in the demonstration region.
    for (const [lat, lng] of segment.positions) {
      assert.ok(lat > 12 && lat < 14, `latitude ${lat} out of region`);
      assert.ok(lng > 79.5 && lng < 81, `longitude ${lng} out of region`);
    }
  }
});

await check('simulated traffic is deterministic inside a time bucket', () => {
  const first = clientTraffic.buildSimulatedTraffic();
  const second = clientTraffic.buildSimulatedTraffic();
  assert.deepEqual(
    first.map((segment) => segment.level),
    second.map((segment) => segment.level),
    'the same time bucket must produce the same levels'
  );
});

await check('simulated traffic changes between time buckets', () => {
  // A one millisecond bucket forces a different seed on each call.
  const a = clientTraffic.buildSimulatedTraffic(1);
  const b = clientTraffic.buildSimulatedTraffic(100000000);
  assert.notDeepEqual(
    a.map((segment) => segment.level),
    b.map((segment) => segment.level)
  );
});

await check('simulated incidents are well formed and flagged as simulated', () => {
  const incidents = clientTraffic.buildSimulatedIncidents(1);
  for (const incident of incidents) {
    assert.equal(incident.simulated, true);
    assert.ok(incident.lat > 12 && incident.lat < 14);
    assert.ok(incident.description.length > 0);
    assert.ok(['minor', 'moderate', 'major', 'blocked'].includes(incident.severity));
    assert.equal(incident.closed, incident.severity === 'blocked');
  }
});

await check('traffic delay formatting hides negligible delays', () => {
  assert.equal(clientTraffic.formatTrafficDelay(0), null);
  assert.equal(clientTraffic.formatTrafficDelay(0.2), null);
  assert.equal(clientTraffic.formatTrafficDelay(7.4), '7 min');
  assert.equal(clientTraffic.formatTrafficDelay(undefined), null);
});

/* ------------------------------- off-route detection and risk (needs turf) */

let optionalChecked = 0;
try {
  const clientGeo = await load('client/src/lib/geo.js');
  const risk = await load('client/src/lib/risk.js');

  // A straight route north along a meridian.
  const line = [
    [13.0, 80.0],
    [13.01, 80.0],
    [13.02, 80.0]
  ];

  await check('a point on the route reports a near-zero deviation', () => {
    const distance = clientGeo.distanceToRouteMetres({ lat: 13.005, lng: 80.0 }, line);
    assert.ok(distance < 5, `expected under 5 m, got ${distance}`);
  });

  await check('a point beside the route reports a realistic deviation', () => {
    // 0.002 degrees of longitude at this latitude is roughly 217 m.
    const distance = clientGeo.distanceToRouteMetres({ lat: 13.01, lng: 80.002 }, line);
    assert.ok(distance > 180 && distance < 260, `expected about 217 m, got ${distance}`);
  });

  await check('deviation handles a degenerate route safely', () => {
    assert.equal(clientGeo.distanceToRouteMetres(null, line), Number.POSITIVE_INFINITY);
    assert.equal(
      clientGeo.distanceToRouteMetres({ lat: 13, lng: 80 }, [[13, 80]]),
      Number.POSITIVE_INFINITY
    );
  });

  await check('progress along a route is tracked by nearest vertex', () => {
    assert.equal(clientGeo.nearestRouteIndex({ lat: 13.0, lng: 80.0 }, line), 0);
    assert.equal(clientGeo.nearestRouteIndex({ lat: 13.0201, lng: 80.0 }, line), 2);
  });

  const squareHazard = {
    id: 1,
    name: 'Test zone',
    severity: 3,
    active: 1,
    disaster_type: 'flood',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [80.0, 13.0],
          [80.1, 13.0],
          [80.1, 13.1],
          [80.0, 13.1],
          [80.0, 13.0]
        ]
      ]
    }
  };

  await check('risk is low in calm conditions', () => {
    const result = risk.computeLocationRisk({
      position: { lat: 20.0, lng: 85.0 },
      weather: { floodRisk: { level: 'low' }, current: { windKph: 10 } },
      hazards: [],
      earthquakes: [],
      incidents: []
    });
    assert.equal(result.level, 'low');
    assert.ok(result.summary.length > 0);
  });

  await check('risk rises to high inside a severe hazard zone during heavy rain', () => {
    const result = risk.computeLocationRisk({
      position: { lat: 13.05, lng: 80.05 },
      weather: { floodRisk: { level: 'severe' }, current: { windKph: 70 } },
      hazards: [squareHazard],
      earthquakes: [],
      incidents: []
    });
    assert.equal(result.level, 'high');
    // The explanation must name the zone the user is standing in.
    assert.ok(
      result.factors.some((factor) => factor.label.includes('Test zone')),
      'the containing hazard zone should appear in the factors'
    );
  });

  await check('a strong nearby earthquake raises the rating', () => {
    const result = risk.computeLocationRisk({
      position: { lat: 13.05, lng: 80.05 },
      weather: { floodRisk: { level: 'low' } },
      hazards: [],
      earthquakes: [
        {
          magnitude: 6.2,
          lat: 13.5,
          lng: 80.5,
          place: 'Bay of Bengal',
          time: new Date().toISOString()
        }
      ],
      incidents: []
    });
    assert.ok(result.score >= 4, `expected a raised score, got ${result.score}`);
    assert.ok(result.factors.some((factor) => factor.signal === 'Seismic activity'));
  });

  await check('a stale earthquake is ignored', () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = risk.computeLocationRisk({
      position: { lat: 13.05, lng: 80.05 },
      weather: { floodRisk: { level: 'low' } },
      hazards: [],
      earthquakes: [{ magnitude: 7, lat: 13.1, lng: 80.1, place: 'Old event', time: old }],
      incidents: []
    });
    const seismic = result.factors.find((factor) => factor.signal === 'Seismic activity');
    assert.equal(seismic.points, 0, 'an event older than the window must not contribute');
  });

  await check('road closures contribute to the rating', () => {
    const result = risk.computeLocationRisk({
      position: { lat: 13.05, lng: 80.05 },
      weather: { floodRisk: { level: 'low' } },
      hazards: [],
      earthquakes: [],
      incidents: [{ closed: true }, { closed: true }]
    });
    assert.ok(result.factors.some((factor) => factor.signal === 'Road conditions'));
  });

  await check('risk degrades gracefully with no inputs at all', () => {
    const result = risk.computeLocationRisk({});
    assert.ok(['low', 'medium', 'high'].includes(result.level));
    assert.ok(result.summary.length > 0);
  });

  optionalChecked = 1;
} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('note  off-route and risk checks skipped, run npm install for turf');
  } else {
    throw error;
  }
}

console.log('');
const skipped = [];
if (!parityChecked) skipped.push('server and offline ranking parity');
if (optionalChecked === 0) skipped.push('off-route and risk');
console.log(
  `Logic tests passed: ${passed} checks` +
    (skipped.length > 0 ? ` (skipped: ${skipped.join(', ')}, run npm install)` : '')
);
