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
function check(label, fn) {
  fn();
  passed += 1;
  console.log(`ok    ${label}`);
}

/* ------------------------------------------------------------------- geo */

check('haversine returns a plausible intra-city distance', () => {
  const distance = haversineKm(13.0827, 80.2707, 12.9815, 80.2176);
  assert.ok(distance > 10 && distance < 14, `expected 10-14 km, received ${distance}`);
});

check('haversine is symmetric and zero for identical points', () => {
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

check('point in polygon detects inside, outside and wrapper types', () => {
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

check('closed, full and hazard-bound shelters are excluded', () => {
  assert.equal(scoreShelter({ ...baseShelter, is_open: 0 }, 13.08, 80.27, []), null);
  assert.equal(scoreShelter({ ...baseShelter, occupied: 100 }, 13.08, 80.27, []), null);
  assert.equal(scoreShelter({ ...baseShelter, capacity: 0 }, 13.08, 80.27, []), null);
  const inside = { ...baseShelter, lat: 13.05, lng: 80.05 };
  assert.equal(scoreShelter(inside, 13.08, 80.27, [{ geometry: square }]), null);
});

check('score stays within range and the breakdown sums to the score', () => {
  const result = scoreShelter(baseShelter, 13.08, 80.27, []);
  assert.ok(result, 'expected a scored shelter');
  assert.ok(result.score > 0 && result.score <= 1, `score out of range: ${result.score}`);
  const sum = Object.values(result.breakdown).reduce((total, value) => total + value, 0);
  assert.ok(Math.abs(sum - result.score) < 0.0101, `breakdown ${sum} vs score ${result.score}`);
  assert.deepEqual(result.facilities, ['water', 'food']);
  assert.ok(result.reasons.length > 0);
});

check('a nearer shelter outranks a distant one with equal capacity', () => {
  const near = { ...baseShelter, id: 1, lat: 13.085, lng: 80.272 };
  const far = { ...baseShelter, id: 2, lat: 13.3, lng: 80.5 };
  const ranked = rankShelters([far, near], 13.08, 80.27, [], 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, 1);
});

check('ranking honours the limit and returns nothing when all are excluded', () => {
  const list = [1, 2, 3].map((id) => ({ ...baseShelter, id, lat: 13.08 + id * 0.01 }));
  assert.equal(rankShelters(list, 13.08, 80.27, [], 2).length, 2);
  const closed = list.map((item) => ({ ...item, is_open: 0 }));
  assert.equal(rankShelters(closed, 13.08, 80.27, [], 3).length, 0);
});

check('malformed facilities JSON degrades to an empty list', () => {
  const result = scoreShelter({ ...baseShelter, facilities: 'not json' }, 13.08, 80.27, []);
  assert.deepEqual(result.facilities, []);
});

/* ------------------------------------------------------------- seed data */

check('seed dataset has the expected shape', () => {
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

check('every shelter has valid coordinates, capacity and contact details', () => {
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

check('hazard polygons are closed rings using the GeoJSON axis order', () => {
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

check('each disaster type has at least one hazard zone', () => {
  for (const disaster of DISASTERS) {
    const count = HAZARD_ZONES.filter((zone) => zone.disaster_type === disaster).length;
    assert.ok(count > 0, `${disaster} has no hazard zone`);
  }
});

check('hazard polygons actually contain their named areas', () => {
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

check('ranking returns three usable shelters for every disaster type', () => {
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

check('at-capacity shelters never appear in the ranking', () => {
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

console.log('');
console.log(`Logic tests passed: ${passed} checks${parityChecked ? '' : ' (parity skipped)'}.`);
