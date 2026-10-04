import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { getConnectionCount } from '../socket.js';

const router = Router();

const totals = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM shelters) AS shelters,
    (SELECT COUNT(*) FROM shelters WHERE is_open = 1) AS sheltersOpen,
    (SELECT COALESCE(SUM(capacity), 0) FROM shelters) AS totalCapacity,
    (SELECT COALESCE(SUM(occupied), 0) FROM shelters) AS totalOccupied,
    (SELECT COUNT(*) FROM hazard_zones WHERE active = 1) AS activeHazards,
    (SELECT COUNT(*) FROM reports) AS reports,
    (SELECT COUNT(*) FROM checkins) AS checkins,
    (SELECT COUNT(*) FROM alerts) AS alerts
`);

const sosByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM sos_events GROUP BY status');

const reportsByType = db.prepare('SELECT type, COUNT(*) AS count FROM reports GROUP BY type');

const reportsByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM reports GROUP BY status');

const occupancyPerShelter = db.prepare(`
  SELECT id, name, capacity, occupied
  FROM shelters
  WHERE is_open = 1
  ORDER BY (CAST(occupied AS REAL) / NULLIF(capacity, 0)) DESC
  LIMIT 12
`);

/** SOS counts bucketed by hour for the last 24 hours, including empty hours. */
const sosPerHourRaw = db.prepare(`
  SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at) AS hour, COUNT(*) AS count
  FROM sos_events
  WHERE created_at >= datetime('now', '-24 hours')
  GROUP BY hour
`);

function buildSosPerHour() {
  const rows = sosPerHourRaw.all();
  const counts = new Map(rows.map((row) => [row.hour, row.count]));

  const series = [];
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  for (let offset = 23; offset >= 0; offset -= 1) {
    const slot = new Date(now.getTime() - offset * 60 * 60 * 1000);
    const key = `${slot.toISOString().slice(0, 13)}:00:00Z`;
    series.push({
      hour: key,
      label: `${String(slot.getUTCHours()).padStart(2, '0')}:00`,
      count: counts.get(key) ?? 0
    });
  }
  return series;
}

router.get('/summary', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const base = totals.get();
    const occupancyPercent =
      base.totalCapacity > 0
        ? Number(((base.totalOccupied / base.totalCapacity) * 100).toFixed(1))
        : 0;

    const sosCounts = { open: 0, acknowledged: 0, resolved: 0 };
    for (const row of sosByStatus.all()) {
      sosCounts[row.status] = row.count;
    }

    const reportStatusCounts = { unverified: 0, verified: 0, rejected: 0 };
    for (const row of reportsByStatus.all()) {
      reportStatusCounts[row.status] = row.count;
    }

    res.json({
      totals: {
        ...base,
        totalFree: Math.max(0, base.totalCapacity - base.totalOccupied),
        occupancyPercent
      },
      sosByStatus: sosCounts,
      reportsByStatus: reportStatusCounts,
      reportsByType: reportsByType.all(),
      occupancyPerShelter: occupancyPerShelter.all().map((row) => ({
        ...row,
        occupancyPercent:
          row.capacity > 0 ? Number(((row.occupied / row.capacity) * 100).toFixed(1)) : 0
      })),
      sosPerHour: buildSosPerHour(),
      realtime: { connectedClients: getConnectionCount() },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
