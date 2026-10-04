/**
 * Root postinstall: installs the server and client workspaces so that a single
 * `npm install` at the repository root prepares the whole project.
 * The nested guard prevents repeated work if npm re-enters this script.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.DISASTER_APP_NESTED_INSTALL === '1') {
  process.exit(0);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function install(workspace) {
  const dir = path.join(root, workspace);
  if (!existsSync(path.join(dir, 'package.json'))) {
    console.error(`[postinstall] skipping ${workspace}: no package.json found`);
    return 0;
  }
  console.log(`[postinstall] installing ${workspace} dependencies`);
  const result = spawnSync(npmCommand, ['install', '--prefix', dir], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, DISASTER_APP_NESTED_INSTALL: '1' }
  });
  return result.status === null ? 1 : result.status;
}

for (const workspace of ['server', 'client']) {
  const code = install(workspace);
  if (code !== 0) {
    console.error(`[postinstall] ${workspace} install failed with exit code ${code}`);
    process.exit(code);
  }
}

console.log('[postinstall] server and client dependencies are installed');
