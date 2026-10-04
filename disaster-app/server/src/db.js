/**
 * SQLite connection and schema management.
 * Uses WAL journaling for concurrent reads and enforces foreign keys.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(currentDir, '..', 'data');
export const DB_PATH = path.join(DATA_DIR, 'app.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'volunteer')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shelters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  occupied INTEGER NOT NULL DEFAULT 0 CHECK (occupied >= 0),
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
  phone TEXT,
  facilities TEXT NOT NULL DEFAULT '[]',
  accessibility INTEGER NOT NULL DEFAULT 0 CHECK (accessibility IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hazard_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disaster_type TEXT NOT NULL,
  name TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 3),
  geojson TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sos_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  description TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  disaster_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  number TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
);

CREATE INDEX IF NOT EXISTS idx_shelters_lat_lng ON shelters (lat, lng);
CREATE INDEX IF NOT EXISTS idx_shelters_is_open ON shelters (is_open);
CREATE INDEX IF NOT EXISTS idx_hazard_zones_type ON hazard_zones (disaster_type);
CREATE INDEX IF NOT EXISTS idx_hazard_zones_active ON hazard_zones (active);
CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_events (status);
CREATE INDEX IF NOT EXISTS idx_sos_lat_lng ON sos_events (lat, lng);
CREATE INDEX IF NOT EXISTS idx_sos_created_at ON sos_events (created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng ON reports (lat, lng);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports (type);
CREATE INDEX IF NOT EXISTS idx_checkins_name ON checkins (name);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at);
`;

export function migrate() {
  db.exec(SCHEMA);
}

/**
 * The schema is applied as soon as this module is loaded.
 *
 * Route modules create their prepared statements at import time, and ES module
 * imports are evaluated before the body of the importing module. Applying the
 * schema here guarantees the tables exist before any statement is prepared,
 * even when the database file is brand new.
 */
migrate();

export default db;
