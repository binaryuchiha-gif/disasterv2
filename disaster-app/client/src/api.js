/**
 * Thin REST client.
 *
 * Requests go to the same origin and the Vite dev server proxies /api to the
 * backend. Errors are normalised into an ApiError carrying the server's
 * {error, details} payload so components can render precise messages.
 */
import { STORAGE_KEYS } from './lib/constants.js';
import { readString, remove, writeString } from './lib/storage.js';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Kept in memory so the token survives re-renders without touching storage.
let authToken = readString(STORAGE_KEYS.token, '') || null;

export function setToken(token) {
  authToken = token || null;
  if (token) {
    writeString(STORAGE_KEYS.token, token);
  } else {
    remove(STORAGE_KEYS.token);
  }
}

export function getToken() {
  return authToken;
}

async function request(path, { method = 'GET', body, signal, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0, null);
  }

  if (response.status === 204) return null;

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.error ?? `Request failed with status ${response.status}`;
    if (response.status === 401 && auth) {
      setToken(null);
    }
    throw new ApiError(message, response.status, payload?.details ?? null);
  }

  return payload;
}

export const api = {
  health: () => request('/health'),

  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me', { auth: true }),

  getShelters: (signal) => request('/shelters', { signal }),
  getNearestShelters: ({ lat, lng, disaster, limit = 3, traffic = true }, signal) => {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      limit: String(limit),
      traffic: traffic ? 'true' : 'false'
    });
    if (disaster) params.set('disaster', disaster);
    return request(`/shelters/nearest?${params.toString()}`, { signal });
  },
  recordArrival: (id, people = 1) =>
    request(`/shelters/${id}/arrive`, { method: 'POST', body: { people } }),
  createShelter: (payload) => request('/shelters', { method: 'POST', body: payload, auth: true }),
  updateShelter: (id, payload) =>
    request(`/shelters/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteShelter: (id) => request(`/shelters/${id}`, { method: 'DELETE', auth: true }),

  getHazards: (type, signal) =>
    request(type ? `/hazards?type=${encodeURIComponent(type)}` : '/hazards', { signal }),
  updateHazard: (id, payload) =>
    request(`/hazards/${id}`, { method: 'PATCH', body: payload, auth: true }),

  createSos: (payload) => request('/sos', { method: 'POST', body: payload }),
  getSos: (status, signal) =>
    request(status ? `/sos?status=${encodeURIComponent(status)}` : '/sos', {
      auth: true,
      signal
    }),
  updateSos: (id, status) =>
    request(`/sos/${id}`, { method: 'PATCH', body: { status }, auth: true }),

  getReports: (status, signal) =>
    request(status ? `/reports?status=${encodeURIComponent(status)}` : '/reports', { signal }),
  createReport: (payload) => request('/reports', { method: 'POST', body: payload }),
  voteReport: (id, direction) =>
    request(`/reports/${id}/vote`, { method: 'POST', body: { direction } }),
  moderateReport: (id, status) =>
    request(`/reports/${id}`, { method: 'PATCH', body: { status }, auth: true }),

  createCheckin: (payload) => request('/checkins', { method: 'POST', body: payload }),
  getCheckins: (name, signal) =>
    request(name ? `/checkins?name=${encodeURIComponent(name)}` : '/checkins', { signal }),

  getAlerts: (signal) => request('/alerts', { signal }),
  createAlert: (payload) => request('/alerts', { method: 'POST', body: payload, auth: true }),
  simulateDisaster: (disasterType) =>
    request('/alerts/simulate', {
      method: 'POST',
      body: { disaster_type: disasterType },
      auth: true
    }),

  getContacts: (signal) => request('/contacts', { signal }),

  getEarthquakes: (signal) => request('/live/earthquakes', { signal }),
  getWeather: ({ lat, lng }, signal) => request(`/live/weather?lat=${lat}&lng=${lng}`, { signal }),
  getRainRadar: (signal) => request('/live/radar', { signal }),

  getTrafficStatus: (signal) => request('/traffic/status', { signal }),
  getTrafficIncidents: (bbox, signal) =>
    request(`/traffic/incidents?bbox=${encodeURIComponent(bbox)}`, { signal }),

  getAnalytics: (signal) => request('/analytics/summary', { auth: true, signal })
};

export default api;
