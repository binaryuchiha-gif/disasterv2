export const CHENNAI = { lat: 13.0827, lng: 80.2707 };

export const DISASTER_TYPES = ['flood', 'cyclone', 'earthquake', 'fire', 'tsunami'];

export const REPORT_TYPES = [
  'road_blocked',
  'flooded_area',
  'medical_help',
  'food_water',
  'person_missing',
  'power_outage'
];

/** Distance in metres the user must move before shelters are re-ranked. */
export const RERANK_DISTANCE_M = 100;

export const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 15000
};

/**
 * Base map layers.
 *
 * Both sources are keyless. The street tiles come from the OpenStreetMap
 * standard layer; dark mode reuses the same tiles with a CSS filter rather than
 * loading a second service, which keeps the full zoom range and avoids another
 * provider dependency.
 *
 * The OpenStreetMap tile policy recommends not hardcoding the tile URL so the
 * provider can be swapped without a code change, so the street URL can be
 * overridden with VITE_STREET_TILE_URL in a .env file next to vite.config.js.
 */
const STREET_TILE_URL =
  import.meta.env?.VITE_STREET_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const SATELLITE_TILE_URL =
  import.meta.env?.VITE_SATELLITE_TILE_URL ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const BASE_LAYERS = {
  street: {
    id: 'street',
    label: 'Street',
    url: STREET_TILE_URL,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    // Dark mode is produced by filtering these tiles, see index.css.
    supportsDarkFilter: true
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: SATELLITE_TILE_URL,
    attribution:
      'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19,
    // Imagery must never be inverted.
    supportsDarkFilter: false
  }
};

export const SEVERITY_COLORS = {
  1: '#F59E0B',
  2: '#F97316',
  3: '#DC2626'
};

export const STORAGE_KEYS = {
  theme: 'da_theme',
  language: 'da_language',
  token: 'da_token',
  sosQueue: 'da_sos_queue',
  lastRoute: 'da_last_route',
  personalContacts: 'da_personal_contacts',
  checkInName: 'da_checkin_name'
};
