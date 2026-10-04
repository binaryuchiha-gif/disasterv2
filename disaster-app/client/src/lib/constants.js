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

export const BASE_LAYERS = {
  street: {
    id: 'street',
    label: 'Street',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19
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
