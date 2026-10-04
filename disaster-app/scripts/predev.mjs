/**
 * Root predev: makes `npm run dev` work on a clean checkout.
 * 1. Creates server/.env from server/.env.example when missing.
 * 2. Seeds the SQLite database when the database file does not exist yet.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');
const envPath = path.join(serverDir, '.env');
const envExamplePath = path.join(serverDir, '.env.example');
const dataDir = path.join(serverDir, 'data');
const dbPath = path.join(dataDir, 'app.db');

if (!existsSync(envPath) && existsSync(envExamplePath)) {
  copyFileSync(envExamplePath, envPath);
  console.log('[predev] created server/.env from server/.env.example');
}

mkdirSync(dataDir, { recursive: true });

if (!existsSync(dbPath)) {
  console.log('[predev] database not found, running seed');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'seed', '--prefix', serverDir], {
    stdio: 'inherit',
    cwd: root,
    env: process.env
  });
  if (result.status !== 0) {
    console.error('[predev] seed failed, start the server after fixing the error above');
    process.exit(result.status === null ? 1 : result.status);
  }
} else {
  console.log('[predev] database already present, skipping seed');
}
