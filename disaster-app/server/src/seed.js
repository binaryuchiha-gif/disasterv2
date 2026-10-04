/**
 * Idempotent database seed.
 *
 * Every row uses an explicit primary key with INSERT OR IGNORE, so running the
 * seed repeatedly neither duplicates rows nor overwrites later administrator
 * edits. Delete server/data/app.db to start from a clean state.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, migrate, DB_PATH } from './db.js';
import {
  ALERTS,
  CONTACTS,
  HAZARD_ZONES,
  REPORTS,
  SHELTERS,
  SOS_EVENTS,
  USERS
} from './seedData.js';

migrate();

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
  VALUES (@id, @name, @email, @password_hash, @role)
`);

const insertShelter = db.prepare(`
  INSERT OR IGNORE INTO shelters
    (id, name, type, lat, lng, address, capacity, occupied, is_open, phone, facilities, accessibility, updated_at)
  VALUES
    (@id, @name, @type, @lat, @lng, @address, @capacity, @occupied, 1, @phone, @facilities, @accessibility, datetime('now'))
`);

const insertHazard = db.prepare(`
  INSERT OR IGNORE INTO hazard_zones (id, disaster_type, name, severity, geojson, active, updated_at)
  VALUES (@id, @disaster_type, @name, @severity, @geojson, @active, datetime('now'))
`);

const insertContact = db.prepare(`
  INSERT OR IGNORE INTO contacts (id, label, number, category)
  VALUES (@id, @label, @number, @category)
`);

const insertAlert = db.prepare(`
  INSERT OR IGNORE INTO alerts (id, title, body, severity, disaster_type, created_at, created_by)
  VALUES (@id, @title, @body, @severity, @disaster_type, datetime('now'), @created_by)
`);

const insertReport = db.prepare(`
  INSERT OR IGNORE INTO reports (id, type, lat, lng, description, upvotes, downvotes, status, created_at)
  VALUES (@id, @type, @lat, @lng, @description, @upvotes, @downvotes, @status, datetime('now'))
`);

const insertSos = db.prepare(`
  INSERT OR IGNORE INTO sos_events (id, name, phone, lat, lng, message, status, created_at, resolved_at)
  VALUES (@id, @name, @phone, @lat, @lng, @message, @status, datetime('now', '-3 hours'), datetime('now', '-2 hours'))
`);

const run = db.transaction(() => {
  for (const user of USERS) {
    insertUser.run({
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: bcrypt.hashSync(user.password, 10),
      role: user.role
    });
  }

  for (const shelter of SHELTERS) {
    insertShelter.run({ ...shelter, facilities: JSON.stringify(shelter.facilities) });
  }

  for (const zone of HAZARD_ZONES) {
    insertHazard.run({ ...zone, geojson: JSON.stringify(zone.geojson) });
  }

  for (const contact of CONTACTS) {
    insertContact.run(contact);
  }

  for (const alert of ALERTS) {
    insertAlert.run(alert);
  }

  for (const report of REPORTS) {
    insertReport.run(report);
  }

  for (const sos of SOS_EVENTS) {
    insertSos.run(sos);
  }
});

run();

const counts = db
  .prepare(
    `SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM shelters) AS shelters,
      (SELECT COUNT(*) FROM hazard_zones) AS hazards,
      (SELECT COUNT(*) FROM contacts) AS contacts,
      (SELECT COUNT(*) FROM alerts) AS alerts,
      (SELECT COUNT(*) FROM reports) AS reports,
      (SELECT COUNT(*) FROM sos_events) AS sos`
  )
  .get();

console.log('[seed] database ready at', DB_PATH);
console.log('[seed] row counts', counts);
console.log('[seed] admin login admin@demo.com / Admin@123');
console.log('[seed] volunteer login volunteer@demo.com / Volunteer@123');

db.close();
