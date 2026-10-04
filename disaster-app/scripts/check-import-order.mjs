/*
  Confirms the module evaluation order that the database schema fix relies on.

  Route modules build prepared statements at import time. This script proves
  that an imported module's body runs to completion before the body of the
  module that imports it, which is why applying the schema inside db.js is
  correct and applying it in index.js would have been too late.

  Run with: node scripts/check-import-order.mjs
*/
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(path.join(tmpdir(), 'import-order-'));

try {
  // Stands in for db.js: performs setup in its module body.
  writeFileSync(
    path.join(dir, 'db.mjs'),
    `export const log = globalThis.__order;
     log.push('db:open');
     export function migrate() { log.push('db:migrate'); }
     migrate();
     export const ready = true;
    `
  );

  // Stands in for a route module: consumes db.js at import time.
  writeFileSync(
    path.join(dir, 'route.mjs'),
    `import { ready } from './db.mjs';
     globalThis.__order.push('route:prepare');
     export const prepared = ready;
    `
  );

  // Stands in for index.js.
  writeFileSync(
    path.join(dir, 'index.mjs'),
    `import { prepared } from './route.mjs';
     globalThis.__order.push('index:body');
     export const result = prepared;
    `
  );

  globalThis.__order = [];
  const module = await import(pathToFileURL(path.join(dir, 'index.mjs')).href);

  const order = globalThis.__order;
  console.log('evaluation order:', order.join(' -> '));

  assert.deepEqual(order, ['db:open', 'db:migrate', 'route:prepare', 'index:body']);
  assert.equal(module.result, true, 'the route must observe a fully initialised database module');

  console.log('ok    the schema is applied before any route prepares a statement');
  console.log('ok    calling migrate() from index.js would have run after the statements');
  console.log('\nImport order verified.');
} finally {
  rmSync(dir, { recursive: true, force: true });
  delete globalThis.__order;
}
