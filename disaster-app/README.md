# Disaster Management and Shelter Navigation Platform

A full-stack disaster response platform: live shelter ranking, hazard-aware
routing, realtime authority dashboard, crowd reporting and offline support.
Everything runs locally with no cloud accounts, no paid services and no API
keys.

- Backend: Express, SQLite (better-sqlite3), Socket.IO, JWT authentication
- Frontend: React, Vite, Tailwind CSS, Leaflet, Recharts, Zustand, i18next
- External data: USGS earthquake feed and Open-Meteo forecast, both keyless

## Prerequisites

- Node.js 20.18 LTS or newer (tested on Node 20.20.2)
- npm 10 or newer, which ships with Node 20

Check your version:

```bash
node --version
```

`better-sqlite3` is a native module. Installing it downloads a prebuilt binary
for Node 20; no compiler is needed in the normal case.

## Run it

Two commands, from this directory:

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

`npm install` runs a `postinstall` hook that installs the `server` and `client`
dependencies as well. `npm run dev` runs a `predev` hook that copies
`server/.env.example` to `server/.env` and seeds the database on first run, then
starts the API on port 4000 and the Vite dev server on port 5173 together.

Useful extras:

```bash
npm run seed            # re-seed the database (idempotent, safe to repeat)
npm run build           # production build of the client into client/dist
npm run verify          # static checks: parsing, imports, unused imports,
                        # emoji, pinned versions, required files
npm run test:logic      # unit tests for the geospatial and ranking core
npm run check:imports   # proves the module order the schema setup relies on
npm run check:sql       # runs the schema and every prepared statement against
                        # a real SQLite engine (needs python3)
```

`verify`, `test:logic` and `check:imports` need nothing installed. `check:sql`
uses the `sqlite3` module from the Python standard library to exercise the SQL
without the native `better-sqlite3` binding.

To start over with a clean database, delete `server/data/app.db` and run
`npm run seed`.

## Demo credentials

| Role          | Email              | Password      | Access                     |
| ------------- | ------------------ | ------------- | -------------------------- |
| Administrator | admin@demo.com     | Admin@123     | Full authority dashboard   |
| Volunteer     | volunteer@demo.com | Volunteer@123 | Public views, no dashboard |

The dashboard at `/admin` requires the administrator account.

## Features

**Map and location**

- Leaflet map with CartoDB Voyager (light), Dark Matter (dark mode) and Esri
  World Imagery (satellite), switchable from a custom control, with correct
  attribution. All markers are inline SVG `divIcon`s, which avoids the Leaflet
  default marker path problem in bundlers.
- Live tracking via `watchPosition` with high accuracy: blue dot with a pulsing
  ring, an accuracy circle and a heading arrow when the device reports one.
- Locate button, follow mode that disengages as soon as you pan the map, and a
  GPS status chip showing active accuracy, searching, denied or demo mode.
- A permission explainer is shown before the browser prompt. All three
  geolocation error codes are handled, with a fallback to Chennai
  (13.0827, 80.2707) and a "use demo location" option.
- Shelters are re-ranked automatically once you move more than 100 m. Tracking
  pauses when the tab is hidden and resumes when it becomes visible again.

**Shelter ranking**

- Each open shelter is scored on normalised distance, estimated travel time,
  free capacity ratio, facility count and an accessibility bonus.
- Shelters are hard-excluded when closed, at capacity, or located inside an
  active hazard zone for the selected disaster.
- The score breakdown and plain-language reasons are returned so the interface
  can explain why a shelter was recommended.
- The algorithm exists twice, in `server/src/services/ranking.js` and
  `client/src/lib/ranking.js`, with identical weights so ranking still works
  from cached data when offline. `npm run test:logic` asserts the two
  implementations agree on the seeded dataset.

**Routing**

- Routes come from the public OSRM demo server with alternatives requested.
- Each alternative is tested against the active hazard polygons using turf, and
  the one crossing the fewest is selected, labelled either "Hazard-avoiding
  route" or "Route crosses a hazard zone".
- Turn-by-turn directions, distance, estimated time and a Google Maps deep
  link are shown. If OSRM is unreachable the map falls back to a dashed
  straight line with Haversine distance and an "Estimated" badge.
- The last route is cached in `localStorage`.

**Emergency workflow**

- SOS button requires a two second press and hold, drawn as a circular
  progress ring, so it cannot fire by accident. The response includes a
  reference identifier, a Google Maps link, and WhatsApp, SMS, copy and Web
  Share actions.
- When the device is offline the SOS is queued in `localStorage` and sent
  automatically once the connection returns.
- Crowd reports support six situation types with confirm and dispute voting.
  A report reaching three net confirmations is promoted to verified
  automatically; administrators can also verify or reject manually.
- Family check-in records that a person is safe, with an optional note and
  location, and can be looked up by name.
- Emergency contacts for India are served from the database with tap-to-call,
  alongside personal contacts stored on the device.

**Realtime and authority dashboard**

- Socket.IO broadcasts `shelter:updated`, `shelter:created`, `shelter:deleted`,
  `alert:new`, `sos:new`, `sos:updated`, `report:new`, `report:updated`,
  `hazard:updated` and `disaster:simulate`. Maps, lists and banners update
  without a refresh.
- The dashboard shows KPI cards, a 24 hour SOS line chart, reports by type, and
  occupancy per shelter, plus a live SOS table with acknowledge and resolve,
  inline shelter occupancy editing, open and closed toggles,
  click-the-map-to-add-a-shelter, hazard zone toggles, an alert composer and
  report moderation. A connection indicator reports the realtime status and
  connected client count.
- "Simulate disaster" publishes a critical alert, activates the matching hazard
  zones and raises the alarm tone and vibration on every connected client.

**Platform**

- Progressive web app via `vite-plugin-pwa`: installable manifest, generated
  PNG icons, cache-first map tiles with an entry ceiling and expiry, and
  stale-while-revalidate caching of `/api/shelters`, `/api/hazards` and
  `/api/contacts` so ranking works offline.
- Online and offline chip, dark mode that follows the system preference and
  persists, and English, Tamil and Hindi translations for the interface.
- Alarm tones are synthesised with the Web Audio API, so there are no audio
  files to ship.

## API reference

Base URL `http://localhost:4000`. Errors use `{ "error": string, "details": any }`.
Routes marked "admin" need an `Authorization: Bearer <token>` header from a
successful login with the administrator account.

| Method | Path                     | Access | Purpose                                                   |
| ------ | ------------------------ | ------ | --------------------------------------------------------- |
| GET    | `/api/health`            | public | Uptime and connected client count                         |
| POST   | `/api/auth/login`        | public | Exchange email and password for a 12 hour JWT             |
| GET    | `/api/auth/me`           | token  | Current user profile                                      |
| GET    | `/api/shelters`          | public | All shelters                                              |
| GET    | `/api/shelters/nearest`  | public | Ranked shelters, `lat`, `lng`, `disaster`, `limit`        |
| POST   | `/api/shelters`          | admin  | Create a shelter                                          |
| PATCH  | `/api/shelters/:id`      | admin  | Update `occupied`, `is_open` or `capacity`                |
| DELETE | `/api/shelters/:id`      | admin  | Remove a shelter                                          |
| GET    | `/api/hazards`           | public | Hazard zones, optional `type` filter                      |
| POST   | `/api/hazards`           | admin  | Create a hazard zone                                      |
| PATCH  | `/api/hazards/:id`       | admin  | Rename, re-shape, change severity or toggle active        |
| DELETE | `/api/hazards/:id`       | admin  | Remove a hazard zone                                      |
| POST   | `/api/sos`               | public | Raise an SOS, rate limited to 10 per minute               |
| GET    | `/api/sos`               | admin  | List SOS events, optional `status` filter                 |
| PATCH  | `/api/sos/:id`           | admin  | Set status to acknowledged or resolved                    |
| GET    | `/api/reports`           | public | Community reports, optional `status` filter               |
| POST   | `/api/reports`           | public | Submit a report, rate limited to 20 per minute            |
| POST   | `/api/reports/:id/vote`  | public | Vote `up` or `down`, auto-verifies at 3 net confirmations |
| PATCH  | `/api/reports/:id`       | admin  | Verify or reject a report                                 |
| GET    | `/api/checkins`          | public | Recent check-ins, optional `name` search                  |
| POST   | `/api/checkins`          | public | Record an "I am safe" check-in                            |
| GET    | `/api/alerts`            | public | Alert history, newest first                               |
| POST   | `/api/alerts`            | admin  | Publish an alert and broadcast it                         |
| POST   | `/api/alerts/simulate`   | admin  | Run the demonstration disaster scenario                   |
| GET    | `/api/contacts`          | public | Official emergency numbers                                |
| GET    | `/api/live/earthquakes`  | public | USGS feed, filtered to the region, cached 5 minutes       |
| GET    | `/api/live/weather`      | public | Open-Meteo forecast plus derived flood risk, `lat`, `lng` |
| GET    | `/api/analytics/summary` | admin  | Totals, occupancy, SOS and report aggregates              |

Both live endpoints cache for five minutes and fall back to the last known good
response, flagged with `stale: true`, if the upstream service is unreachable.

## Architecture

```
                      Browser (http://localhost:5173)
    +-----------------------------------------------------------+
    |  React 18 + Vite + Tailwind                               |
    |                                                           |
    |  pages/        MapPage SheltersPage ReportsPage            |
    |                ContactsPage CheckInPage LoginPage          |
    |                AdminDashboard                              |
    |  components/   MapView BottomSheet ShelterCard SosButton   |
    |                AlertBanner RoutePanel StatusChips Toast    |
    |  lib/          ranking geo routing alarm storage time      |
    |  store.js      Zustand state, GPS lifecycle, SOS queue     |
    |  api.js        REST client     socket.js  Socket.IO client |
    +--------------------+--------------------+-----------------+
                         |                    |
             /api (HTTP) |                    | /socket.io (WebSocket)
                         |                    |
    +--------------------v--------------------v-----------------+
    |  Express 4 on port 4000                                   |
    |                                                           |
    |  middleware/   auth (JWT)  validate (zod)  errorHandler    |
    |                helmet, cors, compression, morgan,          |
    |                express-rate-limit on public writes         |
    |                                                           |
    |  routes/       auth shelters hazards sos reports           |
    |                checkins alerts contacts live analytics     |
    |                                                           |
    |  services/     ranking  geo  liveFeeds (5 min cache)       |
    |  socket.js     broadcast gateway                           |
    +---------+-------------------------------+-----------------+
              |                               |
              v                               v
     +------------------+        +---------------------------+
     |  SQLite (WAL)    |        |  External public APIs     |
     |  server/data/    |        |  USGS earthquake feed     |
     |  app.db          |        |  Open-Meteo forecast      |
     +------------------+        +---------------------------+
```

Ranking is deliberately duplicated: the server is authoritative, and the client
holds a byte-for-byte equivalent so the recommendation survives losing the
network. Vite proxies `/api` and `/socket.io` to port 4000 in development, so
the browser only ever talks to one origin.

## Database schema

SQLite at `server/data/app.db`, WAL journaling, foreign keys enabled, every
query parameterised through prepared statements.

| Table          | Columns                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `users`        | id, name, email (unique), password_hash, role (admin or volunteer), created_at                                           |
| `shelters`     | id, name, type, lat, lng, address, capacity, occupied, is_open, phone, facilities (JSON text), accessibility, updated_at |
| `hazard_zones` | id, disaster_type, name, severity (1 to 3), geojson (text), active, updated_at                                           |
| `sos_events`   | id, name, phone, lat, lng, message, status (open, acknowledged, resolved), created_at, resolved_at                       |
| `reports`      | id, type, lat, lng, description, upvotes, downvotes, status (unverified, verified, rejected), created_at                 |
| `checkins`     | id, name, lat, lng, message, created_at                                                                                  |
| `alerts`       | id, title, body, severity (info, warning, critical), disaster_type, created_at, created_by (to users.id)                 |
| `contacts`     | id, label, number, category                                                                                              |

Indexes cover shelter coordinates and open state, hazard type and active flag,
SOS status, coordinates and creation time, report status, type and coordinates,
check-in name, and alert creation time.

Seed contents: 20 shelters across Chennai, Chengalpattu and Tiruvallur, 12
hazard polygons spanning the Adyar and Cooum rivers, Velachery and Pallikaranai,
Marina, Besant Nagar, Ennore, Manali and the East Coast Road, the two demo
users, eight Indian emergency numbers, three alerts, four reports and one
resolved SOS so the dashboard is never empty. The seed is idempotent: it uses
explicit primary keys with `INSERT OR IGNORE`, so re-running it never
duplicates rows nor overwrites later administrator edits.

## Three minute demo script

1. **Open the app** (0:00). Point out the glass header: online chip, realtime
   chip, GPS chip, language selector and dark mode toggle.
2. **Grant location** (0:15). The explainer appears first; choose "Enable
   location", or "Use demo location" if you are indoors. The blue dot, accuracy
   circle and the GPS chip switch to active with a metre reading.
3. **Select Flood** (0:30). Hazard polygons appear over the Adyar and Cooum
   rivers and Velachery, and the safety guidance sheet opens with do and do-not
   lists. Open "Show live data" to display the Open-Meteo flood risk card and
   the USGS earthquake list.
4. **Find safest shelter** (1:00). Three ranked results appear in the bottom
   sheet, each with a capacity bar, facility icons, relative last-updated time
   and a score breakdown explaining the recommendation. Note that shelters
   inside the flood polygons have been excluded.
5. **Plan a route** (1:20). Tap "Route" on the top result. The route is drawn,
   labelled "Hazard-avoiding route" where applicable, with turn-by-turn steps
   and a Google Maps deep link. Mention the dashed "Estimated" fallback if OSRM
   is unavailable.
6. **Raise an SOS** (1:45). Press and hold the red button for two seconds and
   show the circular progress ring, then the reference identifier and the
   WhatsApp, SMS, copy and share actions.
7. **Sign in as the administrator** (2:05). Use `admin@demo.com` / `Admin@123`
   and open the dashboard. Walk through the KPI cards, the 24 hour SOS chart and
   the occupancy chart. Acknowledge then resolve the SOS raised a moment ago and
   point out that the KPI updates immediately.
8. **Edit a shelter** (2:30). Change an occupancy value or close a shelter in
   the management table. Keep a second browser window on the map to show the
   marker colour and the ranking changing live over the socket, with no refresh.
9. **Simulate a disaster** (2:45). Press "Simulate disaster". A critical alert
   banner appears on every client, the alarm tone sounds, the hazard zones
   activate and the recommendations update.
10. **Close on resilience** (2:55). Switch the browser to offline and show the
    offline chip, that the shelter list still ranks from cached data, and that
    an SOS raised while offline is queued and sent when the connection returns.

For the fullest demonstration, keep two windows open side by side: a normal
window as the resident and a second window signed in as the administrator.

## Future scope

- **SMS gateway integration.** Deliver SOS and check-in messages through a
  telecom or aggregator gateway so they work on feature phones and when data
  coverage is gone, with the existing `sms:` links as the fallback.
- **IMD and NDMA feeds.** Replace the seeded hazard polygons and the demo
  alerts with authoritative India Meteorological Department warnings and
  National Disaster Management Authority bulletins, including live cyclone
  tracks and official inundation mapping.
- **Bluetooth mesh relay.** When both cellular and data networks fail, relay
  SOS payloads device to device over a Bluetooth mesh until one node regains
  connectivity and can forward the queue upstream.
- **Machine learning flood prediction.** Train on historical rainfall, tide
  gauge, drainage and terrain data to produce predicted inundation polygons.
  These would feed the existing `hazard_zones` structure, so the ranking and
  routing pipeline consumes forecasts with no further change.
- **Multi-district deployment.** Introduce a districts table with row level
  scoping, per-district administrator roles and a tenant aware dashboard, then
  move from SQLite to PostgreSQL with PostGIS so the point-in-polygon and
  nearest-neighbour queries run in the database.

## Project layout

```
disaster-app/
  package.json            root scripts, concurrently, install and seed hooks
  README.md
  scripts/
    postinstall.mjs       installs the server and client workspaces
    predev.mjs            creates .env and seeds on first run
    verify.mjs            static checks across the repository
    test-logic.mjs        geospatial and ranking unit tests
  server/
    .env.example          PORT, JWT_SECRET, CLIENT_ORIGIN
    src/
      index.js            Express app, middleware, route mounting
      db.js               SQLite connection, schema, indexes
      seed.js             idempotent seeding
      seedData.js         the dataset itself, dependency free
      socket.js           Socket.IO gateway and event names
      middleware/         auth.js validate.js errorHandler.js
      routes/             auth shelters hazards sos reports
                          checkins alerts contacts live analytics
      services/           ranking.js geo.js liveFeeds.js
  client/
    vite.config.js        dev proxy and PWA configuration
    tailwind.config.js    navy, danger, safe and warn colour system
    public/               generated PWA icons and favicon
    src/
      main.jsx App.jsx api.js socket.js store.js i18n.js index.css
      pages/              MapPage SheltersPage ReportsPage ContactsPage
                          CheckInPage LoginPage AdminDashboard
      components/         Layout MapView MapMarkers BottomSheet ShelterCard
                          SosButton AlertBanner RoutePanel StatusChips
                          DisasterChips SafetyTipsSheet LiveDataCards
                          LocationGate ProtectedRoute Toast Skeleton
      lib/                ranking geo routing alarm storage time
                          safetyTips constants
```

## Configuration

`server/.env` is created from `server/.env.example` on first `npm run dev`:

```
PORT=4000
JWT_SECRET=change-me-in-production-disaster-app-dev-secret
CLIENT_ORIGIN=http://localhost:5173
```

The JWT secret falls back to a development default if the variable is absent, so
the project runs with no manual configuration. Set a real secret before putting
this anywhere public.

## Verification status

The following were executed and pass:

- `npm run verify`: 69 source files parse, 167 relative imports resolve and
  match their target exports, no unused imports, no emoji in 77 text files,
  every dependency pinned to the exact required version, all 60 required files
  present.
- `npm run test:logic`: 15 checks covering Haversine distance, point in polygon
  across geometry wrapper types, the exclusion rules for closed, full and
  hazard-bound shelters, score bounds and breakdown arithmetic, ranking order
  and limits, malformed input handling, and the integrity of all 20 shelters
  and 12 hazard polygons.
- `npm run check:sql`: 19 checks against SQLite 3.40.0. The schema DDL executes,
  8 tables and 12 indexes are created, the full seed inserts cleanly, all five
  CHECK constraints reject invalid data, the unique email constraint holds, the
  seed is idempotent across repeated runs, all 51 prepared statements compile,
  and the analytics aggregates return correct figures.
- `npm run check:imports`: confirms the module evaluation order that makes
  applying the schema inside `db.js` correct.

Not yet executed: `npm install`, `npm run dev`, `npm run build` and live
endpoint calls. These need the npm registry, so run them locally to confirm the
dependency install and the production build on your machine.

## Notes and known limits

- The OSRM demo server is rate limited and occasionally slow. The estimated
  straight-line fallback exists for exactly that case and is part of the
  intended behaviour.
- Geolocation requires a secure context. `localhost` counts as secure, so local
  development works; any other host needs HTTPS.
- Report voting is intentionally unauthenticated for the demonstration, so a
  single person can vote repeatedly. Production use needs per-device or
  per-account vote tracking.
- SQLite with WAL suits a single-node demonstration. The multi-district item in
  the future scope section covers moving to PostgreSQL with PostGIS.
