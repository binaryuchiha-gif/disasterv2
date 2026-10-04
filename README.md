# Disaster Management Web App

A static, offline-capable disaster preparedness and response demo built with
plain HTML, CSS, and vanilla JavaScript. No build step, no backend, no
database, and no API keys are required.

## Files

- `index.html` - app shell and markup
- `style.css` - design system and layout
- `app.js` - application logic (state, map, GPS, ranking, routing, SOS, storage, i18n, UI)
- `shelters.js` - shelter and hazard zone data for Chennai
- `sw.js` - service worker for offline caching
- `manifest.json` - PWA manifest
- `README.md` - this file

## How to run locally

### Option A: VS Code Live Server

1. Open this folder in VS Code.
2. Install the "Live Server" extension if you do not already have it.
3. Right-click `index.html` and choose "Open with Live Server".
4. The app opens at a `localhost` address. GPS and the service worker both
   require either `localhost` or HTTPS, so this works correctly.

### Option B: npx serve

1. Open a terminal in this folder.
2. Run:
   ```
   npx serve
   ```
3. Open the printed `localhost` URL in a browser.

Both options serve the folder exactly as-is, with no build or install step
for the app itself.

## How to deploy for a phone demo

### Netlify Drop

1. Go to https://app.netlify.com/drop in a browser.
2. Drag the entire project folder (containing `index.html`, `style.css`,
   `app.js`, `shelters.js`, `sw.js`, and `manifest.json`) onto the page.
3. Netlify gives you a live HTTPS URL in a few seconds.
4. Open that URL on your phone. HTTPS is required for GPS and for the
   service worker to register, and Netlify Drop provides this automatically.

### GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository settings, enable GitHub Pages for the branch containing
   these files (root folder).
3. Open the generated `github.io` URL on your phone.

## Feature list

- Live map with CartoDB Voyager (light) and Dark Matter (dark mode) tiles,
  plus an Esri World Imagery satellite toggle, all with attribution.
- Custom SVG shelter markers colored by availability (green, amber, red).
- Live GPS tracking with a pulsing blue dot, accuracy circle, heading
  arrow, "Locate me" button, and "Follow mode" toggle.
- GPS status chip (Active with accuracy, Searching, or Denied) and a
  pre-permission explanation screen with a demo location fallback.
- Disaster type chips (Flood, Cyclone, Earthquake, Fire, Tsunami) that
  toggle hazard zones on the map and open a Do / Do not safety tips sheet.
- "Find safest shelter" scoring by distance, ETA, available capacity, and
  facilities, excluding full or closed shelters and shelters inside hazard
  zones. Top 3 results appear in a draggable bottom sheet (desktop: a side
  panel) with a "Recommended" badge on the top result.
- Routing with OSRM, picking the alternative with the fewest hazard
  intersections, with turn-by-turn steps and an "Open in Google Maps" link.
  Falls back to a dashed straight-line estimate with an "Estimated" badge
  if OSRM is unreachable.
- SOS button: press and hold for 2 seconds with a circular progress ring,
  then share coordinates by WhatsApp, SMS, copy, or the Web Share API.
  History is stored in `localStorage`.
- Rotating mock alert banner, plus a "Simulate disaster" action in the menu
  that triggers an alert, vibration, a short Web Audio alarm tone, hazard
  zones, and an auto-suggested shelter with route.
- Emergency contacts for India (112, 100, 101, 102, 108, 1070, 1077, NDRF)
  with tap-to-call, plus user-added contacts saved in `localStorage`.
- Family check-in: an "I am safe" button that builds a timestamped,
  location-tagged shareable message.
- Crowd reports (road blocked, flooded area, medical help needed, food or
  water needed, person missing), saved locally and shown as map pins.
- Offline-ready PWA: a manifest and service worker cache the app shell,
  the shelter data file, CDN libraries, and previously viewed map tiles.
  An Online/Offline status chip is shown in the header. Shelter ranking
  works offline using straight-line (Haversine) distance.
- Admin tab (no login, demo mode): edit occupied capacity, open or close a
  shelter, and add a new shelter by tapping the map. Changes reflect
  immediately in the user-facing views with an updated "last updated" time.
- Language toggle for English, Tamil, and Hindi across the main UI labels.

## 2-minute demo script

1. **Open the app.** Point out the header status chips (Online, GPS), the
   rotating alert banner, and the disaster type chips.
2. **Enable location.** Tap "Enable location" on the opening screen. If
   indoors or GPS is slow, tap "Use demo location (Chennai)" instead, and
   mention this is intentional for reliable demos.
3. **Show the map.** Point out your location as a pulsing blue dot with an
   accuracy circle, the shelter markers color-coded by availability, and the
   satellite toggle button.
4. **Tap a disaster chip**, for example Flood. Show the hazard zones
   appearing on the map and the safety tips sheet opening with Do and Do not
   lists.
5. **Tap "Find safest shelter".** Show the top 3 ranked shelters in the
   bottom sheet, with distance, ETA, capacity bar, facility icons, and the
   "Recommended" badge on the first card.
6. **Tap the top shelter card.** Show the route drawn on the map and the
   turn-by-turn steps, then tap "Open in Google Maps" to show the deep link.
7. **Press and hold the SOS button** for 2 seconds. Show the coordinates,
   the Google Maps link, and the WhatsApp / SMS / Copy / Share options.
8. **Open the menu and tap "Simulate disaster".** Show the alert banner
   turning critical, the short alarm tone, and the auto-suggested shelter
   and route.
9. **Switch to the Admin tab.** Reduce a shelter's available capacity or
   close it, then switch back to the Map or Shelters tab to show the change
   reflected immediately with a new "last updated" time.
10. **Switch to the Report tab**, submit a "Flooded area" report, and show
    it appear in the recent reports list and as a pin on the map.
11. **Turn off Wi-Fi or mobile data** (optional, if time allows) to show the
    Offline chip and that the shelter list still works using straight-line
    distance.

## Architecture and future scope

This build intentionally has no backend so it can run entirely from static
files with zero setup. The notes below describe how a production version
could evolve.

- **Firebase real-time backend.** Replace `localStorage` reads and writes
  for shelter occupancy, crowd reports, and SOS history with Firestore (or
  Realtime Database) listeners, so changes made in the Admin view sync to
  every connected user instantly instead of only on the same device.
- **IMD and NDMA API integration.** Replace the rotating mock alert banner
  with live feeds from the India Meteorological Department (IMD) and the
  National Disaster Management Authority (NDMA), including real cyclone
  tracks, rainfall warnings, and official hazard zone boundaries in place of
  the hand-drawn demo polygons in `shelters.js`.
- **SMS fallback.** For users with no data connectivity, integrate an SMS
  gateway (for example through a telecom partner or a service such as
  Twilio) so SOS and check-in messages can be sent as plain SMS without
  requiring a data connection, as a complement to the current `sms:` link
  which still needs the user's own SMS app and signal.
- **Bluetooth mesh.** In areas where both mobile data and cellular signal
  are down, a Bluetooth mesh (using the Web Bluetooth API on supporting
  devices, or a native companion app) could relay SOS signals and check-in
  messages device-to-device until one device regains connectivity.
- **ML flood prediction.** Combine historical rainfall, tidal, and terrain
  data with a trained model to predict flood-prone areas ahead of time,
  feeding predicted hazard zones into the same hazard zone data structure
  already used by the hazard rendering and routing logic, so no other part
  of the app needs to change to consume predictive data instead of
  static data.

## Notes on correctness

- All asynchronous and storage calls are wrapped in `try/catch`.
- The GPS permission-denied path falls back to the demo Chennai location
  and shows an explanatory toast.
- The OSRM routing failure path falls back to a dashed straight-line
  estimate using Haversine distance, with an "Estimated" badge.
- The "no shelters match" path shows a plain message instead of an empty
  list or an error.
- No emoji characters are used anywhere in the UI, code comments, or this
  document.
