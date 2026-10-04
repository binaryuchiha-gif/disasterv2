/*
  Exports the seed dataset and the SQL statements embedded in the server source
  so they can be executed against a real SQLite engine for validation.

  Writes a single JSON document to stdout.
  Used by scripts/check-sql.py.
*/
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

/** Pulls the SCHEMA template literal out of db.js. */
function extractSchema() {
  const source = read('server/src/db.js');
  const match = source.match(/const SCHEMA = `([\s\S]*?)`;/);
  if (!match) throw new Error('could not locate the SCHEMA literal in server/src/db.js');
  return match[1];
}

/** Collects every db.prepare(...) SQL string from a source file. */
function extractPrepared(relativePath) {
  const source = read(relativePath);
  const statements = [];

  // Template literal form: db.prepare(`...`)
  for (const match of source.matchAll(/db\s*\.prepare\(\s*`([\s\S]*?)`\s*\)/g)) {
    statements.push(match[1].trim());
  }
  // Single quoted form: db.prepare('...')
  for (const match of source.matchAll(/db\s*\.prepare\(\s*'([^']*?)'\s*\)/g)) {
    statements.push(match[1].trim());
  }
  // Double quoted form: db.prepare("...")
  for (const match of source.matchAll(/db\s*\.prepare\(\s*"([^"]*?)"\s*\)/g)) {
    statements.push(match[1].trim());
  }
  return statements;
}

const seedModule = await import(pathToFileURL(path.join(root, 'server/src/seedData.js')).href);

const SOURCES = [
  'server/src/seed.js',
  'server/src/routes/shelters.js',
  'server/src/routes/hazards.js',
  'server/src/routes/sos.js',
  'server/src/routes/reports.js',
  'server/src/routes/checkins.js',
  'server/src/routes/alerts.js',
  'server/src/routes/contacts.js',
  'server/src/routes/auth.js',
  'server/src/routes/analytics.js'
];

const prepared = {};
for (const file of SOURCES) {
  prepared[file] = extractPrepared(file);
}

process.stdout.write(
  JSON.stringify(
    {
      schema: extractSchema(),
      prepared,
      seed: {
        users: seedModule.USERS,
        shelters: seedModule.SHELTERS,
        hazards: seedModule.HAZARD_ZONES,
        contacts: seedModule.CONTACTS,
        alerts: seedModule.ALERTS,
        reports: seedModule.REPORTS,
        sos: seedModule.SOS_EVENTS
      }
    },
    null,
    2
  )
);
