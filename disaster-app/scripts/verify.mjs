/**
 * Static verification for the whole repository.
 *
 * Checks performed:
 *  1. Every JavaScript and JSX file parses.
 *  2. Every relative import resolves to a file that exists.
 *  3. Every named import matches an export in the target local module.
 *  4. No emoji characters anywhere in the tracked sources.
 *  5. Dependency versions are pinned exactly (no ranges).
 *  6. Required project files are present.
 *
 * Run with: npm run verify
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'data', '.vite']);
const CODE_EXT = new Set(['.js', '.jsx', '.mjs']);

let failures = 0;
let checks = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL  ${message}`);
}

function pass(message) {
  checks += 1;
  console.log(`ok    ${message}`);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const allFiles = walk(root);
const codeFiles = allFiles.filter((file) => CODE_EXT.has(path.extname(file)));
const relative = (file) => path.relative(root, file);

/** Removes comments and string bodies so scans do not match inside them. */
function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

/* ------------------------------------------------ 1. parse every code file */

function nodeCheck(file) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  return { ok: result.status === 0, message: (result.stderr || '').split('\n')[0] };
}

function prettierAvailable() {
  const probe = spawnSync('prettier', ['--version'], { encoding: 'utf8' });
  return probe.status === 0;
}

function prettierCheck(file) {
  // --check reports formatting drift as a warning and bad syntax as an error.
  const result = spawnSync('prettier', ['--check', file], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (/SyntaxError/.test(output)) {
    const line = output.split('\n').find((item) => item.includes('SyntaxError')) ?? 'SyntaxError';
    return { ok: false, message: line.replace(/^\[error\]\s*/, '').trim() };
  }
  return { ok: true, message: '' };
}

const hasPrettier = prettierAvailable();
let parseProblems = 0;
let jsxSkipped = 0;

for (const file of codeFiles) {
  const isJsx = path.extname(file) === '.jsx';
  let result;
  if (isJsx) {
    if (!hasPrettier) {
      jsxSkipped += 1;
      continue;
    }
    result = prettierCheck(file);
  } else {
    result = nodeCheck(file);
  }
  if (!result.ok) {
    fail(`${relative(file)} does not parse: ${result.message}`);
    parseProblems += 1;
  }
}

if (parseProblems === 0) {
  pass(
    `${codeFiles.length - jsxSkipped} of ${codeFiles.length} source files parse` +
      (jsxSkipped > 0 ? ` (${jsxSkipped} JSX skipped, Prettier unavailable)` : '')
  );
}

/* ------------------------------------- 2 and 3. imports resolve and match */

const IMPORT_RE = /import\s+(?:([\w*\s{},$]+?)\s+from\s+)?['"]([^'"]+)['"]/g;
const EXPORT_NAMED_RE =
  /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g;
const EXPORT_BLOCK_RE = /export\s*\{([^}]+)\}/g;
const HAS_DEFAULT_RE = /export\s+default/;

function resolveImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx')
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function collectExports(file) {
  const source = stripCommentsAndStrings(readFileSync(file, 'utf8'));
  const named = new Set();

  for (const match of source.matchAll(EXPORT_NAMED_RE)) named.add(match[1]);
  for (const match of source.matchAll(EXPORT_BLOCK_RE)) {
    for (const part of match[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) named.add(name);
    }
  }
  return { named, hasDefault: HAS_DEFAULT_RE.test(source) };
}

const exportCache = new Map();
function exportsOf(file) {
  if (!exportCache.has(file)) exportCache.set(file, collectExports(file));
  return exportCache.get(file);
}

let importProblems = 0;
let importCount = 0;

for (const file of codeFiles) {
  const source = stripCommentsAndStrings(readFileSync(file, 'utf8'));
  for (const match of source.matchAll(IMPORT_RE)) {
    const clause = match[1]?.trim();
    const specifier = match[2];
    if (!specifier.startsWith('.')) continue; // package imports are resolved by npm

    importCount += 1;
    const target = resolveImport(file, specifier);
    if (!target) {
      fail(`${relative(file)} imports "${specifier}" which does not resolve to a file`);
      importProblems += 1;
      continue;
    }
    if (!clause) continue;

    const { named, hasDefault } = exportsOf(target);

    const defaultMatch = clause.match(/^([A-Za-z0-9_$]+)\s*(?:,|$)/);
    if (defaultMatch && !clause.startsWith('{') && !hasDefault) {
      fail(
        `${relative(file)} default-imports "${defaultMatch[1]}" but ${relative(
          target
        )} has no default export`
      );
      importProblems += 1;
    }

    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)[0]
          ?.trim();
        if (!name) continue;
        if (!named.has(name)) {
          fail(
            `${relative(file)} imports { ${name} } from ${relative(target)} which does not export it`
          );
          importProblems += 1;
        }
      }
    }
  }
}

if (importProblems === 0) {
  pass(`${importCount} relative imports resolve and match their target exports`);
}

/* ------------------------------------------- 3b. unused imports and vars */

/**
 * Flags imported bindings that are never referenced again. Unused imports are
 * the most common source of build-time lint noise, and in the case of icon
 * libraries they also inflate the bundle.
 */
let unusedProblems = 0;

for (const file of codeFiles) {
  // The raw text is used for the usage test so that identifiers referenced
  // only inside template literals are still counted. Being conservative here
  // avoids false alarms at the cost of possibly missing an unused import.
  const raw = readFileSync(file, 'utf8');
  const source = raw;

  const names = [];
  for (const match of source.matchAll(IMPORT_RE)) {
    const clause = match[1]?.trim();
    if (!clause) continue;

    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim();
        if (name) names.push(name);
      }
    }

    const beforeBrace = clause.split('{')[0].replace(/,\s*$/, '').trim();
    if (beforeBrace && !beforeBrace.startsWith('*')) names.push(beforeBrace);

    const namespace = clause.match(/\*\s+as\s+([A-Za-z0-9_$]+)/);
    if (namespace) names.push(namespace[1]);
  }

  // Strip the import block itself before counting usages.
  const body = source.replace(IMPORT_RE, '');
  for (const name of new Set(names)) {
    const used = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(body);
    if (!used) {
      fail(`${relative(file)} imports "${name}" but never uses it`);
      unusedProblems += 1;
    }
  }
}

if (unusedProblems === 0) pass('no unused imports');

/* ------------------------------------------------------ 4. emoji scanning */

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;

const TEXT_EXT = new Set(['.js', '.jsx', '.mjs', '.json', '.css', '.html', '.md', '.example']);
const textFiles = allFiles.filter(
  (file) => TEXT_EXT.has(path.extname(file)) || path.basename(file) === '.env.example'
);

let emojiFound = 0;
for (const file of textFiles) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (EMOJI_RE.test(line)) {
      fail(`${relative(file)}:${index + 1} contains an emoji: ${line.trim().slice(0, 70)}`);
      emojiFound += 1;
    }
  });
}
if (emojiFound === 0) pass(`no emoji characters in ${textFiles.length} text files`);

/* ------------------------------------------- 5. dependency pinning check */

const EXPECTED = {
  server: {
    dependencies: {
      bcryptjs: '2.4.3',
      'better-sqlite3': '11.5.0',
      compression: '1.7.5',
      cors: '2.8.5',
      dotenv: '16.4.5',
      express: '4.21.1',
      'express-rate-limit': '7.4.1',
      helmet: '8.0.0',
      jsonwebtoken: '9.0.2',
      morgan: '1.10.0',
      'socket.io': '4.8.1',
      zod: '3.23.8'
    },
    devDependencies: { nodemon: '3.1.7' }
  },
  client: {
    dependencies: {
      '@turf/turf': '7.1.0',
      i18next: '23.16.8',
      leaflet: '1.9.4',
      'lucide-react': '0.460.0',
      react: '18.3.1',
      'react-dom': '18.3.1',
      'react-i18next': '15.1.2',
      'react-leaflet': '4.2.1',
      'react-router-dom': '6.28.0',
      recharts: '2.13.3',
      'socket.io-client': '4.8.1',
      zustand: '5.0.1'
    },
    devDependencies: {
      '@vitejs/plugin-react': '4.3.4',
      autoprefixer: '10.4.20',
      postcss: '8.4.49',
      tailwindcss: '3.4.15',
      vite: '5.4.11',
      'vite-plugin-pwa': '0.20.5'
    }
  }
};

let depProblems = 0;
for (const [workspace, groups] of Object.entries(EXPECTED)) {
  const pkgPath = path.join(root, workspace, 'package.json');
  if (!existsSync(pkgPath)) {
    fail(`${workspace}/package.json is missing`);
    depProblems += 1;
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const [group, deps] of Object.entries(groups)) {
    for (const [name, version] of Object.entries(deps)) {
      const actual = pkg[group]?.[name];
      if (actual !== version) {
        fail(`${workspace}: ${name} should be ${version}, found ${actual ?? 'nothing'}`);
        depProblems += 1;
      }
    }
  }
}

for (const workspace of ['', 'server', 'client']) {
  const pkgPath = path.join(root, workspace, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(pkg[group] ?? {})) {
      if (/[\^~><=|]/.test(version)) {
        fail(`${workspace || 'root'}: ${name} uses a version range "${version}"`);
        depProblems += 1;
      }
    }
  }
}

const rootPkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
if (rootPkg.devDependencies?.concurrently !== '9.1.0') {
  fail(`root: concurrently should be 9.1.0, found ${rootPkg.devDependencies?.concurrently}`);
  depProblems += 1;
}

if (depProblems === 0) pass('all dependencies are pinned to the exact required versions');

/* -------------------------------------------- 6. required files present */

const REQUIRED = [
  'package.json',
  'README.md',
  'scripts/postinstall.mjs',
  'scripts/predev.mjs',
  'server/package.json',
  'server/.env.example',
  'server/src/index.js',
  'server/src/db.js',
  'server/src/seed.js',
  'server/src/socket.js',
  'server/src/routes/auth.js',
  'server/src/routes/shelters.js',
  'server/src/routes/hazards.js',
  'server/src/routes/sos.js',
  'server/src/routes/reports.js',
  'server/src/routes/checkins.js',
  'server/src/routes/alerts.js',
  'server/src/routes/live.js',
  'server/src/routes/analytics.js',
  'server/src/routes/contacts.js',
  'server/src/middleware/auth.js',
  'server/src/middleware/validate.js',
  'server/src/middleware/errorHandler.js',
  'server/src/services/ranking.js',
  'server/src/services/geo.js',
  'server/src/services/liveFeeds.js',
  'client/package.json',
  'client/vite.config.js',
  'client/tailwind.config.js',
  'client/postcss.config.js',
  'client/index.html',
  'client/public/pwa-192x192.png',
  'client/public/pwa-512x512.png',
  'client/public/favicon.svg',
  'client/src/main.jsx',
  'client/src/App.jsx',
  'client/src/api.js',
  'client/src/socket.js',
  'client/src/store.js',
  'client/src/i18n.js',
  'client/src/index.css',
  'client/src/pages/MapPage.jsx',
  'client/src/pages/SheltersPage.jsx',
  'client/src/pages/ReportsPage.jsx',
  'client/src/pages/ContactsPage.jsx',
  'client/src/pages/CheckInPage.jsx',
  'client/src/pages/LoginPage.jsx',
  'client/src/pages/AdminDashboard.jsx',
  'client/src/components/MapView.jsx',
  'client/src/components/ShelterCard.jsx',
  'client/src/components/BottomSheet.jsx',
  'client/src/components/SosButton.jsx',
  'client/src/components/AlertBanner.jsx',
  'client/src/components/RoutePanel.jsx',
  'client/src/components/StatusChips.jsx',
  'client/src/components/Toast.jsx',
  'client/src/components/Skeleton.jsx',
  'client/src/lib/geo.js',
  'client/src/lib/ranking.js',
  'client/src/lib/alarm.js'
];

let missing = 0;
for (const file of REQUIRED) {
  if (!existsSync(path.join(root, file))) {
    fail(`required file missing: ${file}`);
    missing += 1;
  }
}
if (missing === 0) pass(`all ${REQUIRED.length} required project files are present`);

/* ------------------------------------------------------------- summary */

console.log('');
if (failures === 0) {
  console.log(`Verification passed: ${checks} checks, 0 failures.`);
  process.exit(0);
}
console.error(`Verification failed: ${failures} problem(s) found.`);
process.exit(1);
