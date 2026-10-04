/**
 * External disaster data feeds.
 *
 * Both feeds are keyless and public. Responses are cached in memory for five
 * minutes. If an upstream request fails, the last known good value is returned
 * with `stale: true` so the interface can still render something useful.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const RADAR_CACHE_TTL_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';

/** Bounding box covering India and the surrounding region. */
const REGION = { minLat: 5, maxLat: 38, minLng: 66, maxLng: 98 };

const cache = new Map();

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const fresh = Date.now() - entry.storedAt < CACHE_TTL_MS;
  return { ...entry, fresh };
}

function writeCache(key, data) {
  cache.set(key, { data, storedAt: Date.now() });
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Upstream responded with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function inRegion(lat, lng) {
  return (
    lat >= REGION.minLat && lat <= REGION.maxLat && lng >= REGION.minLng && lng <= REGION.maxLng
  );
}

function normalizeEarthquakes(raw) {
  const features = Array.isArray(raw?.features) ? raw.features : [];
  return features
    .map((feature) => {
      const coords = feature?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const [lng, lat, depth] = coords;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      return {
        id: feature.id,
        magnitude: feature.properties?.mag ?? null,
        place: feature.properties?.place ?? 'Unknown location',
        time: feature.properties?.time ? new Date(feature.properties.time).toISOString() : null,
        lat,
        lng,
        depthKm: typeof depth === 'number' ? depth : null,
        url: feature.properties?.url ?? null
      };
    })
    .filter((item) => item && inRegion(item.lat, item.lng))
    .sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''));
}

export async function getEarthquakes() {
  const key = 'earthquakes';
  const cached = readCache(key);
  if (cached?.fresh) {
    return {
      events: cached.data,
      stale: false,
      fetchedAt: new Date(cached.storedAt).toISOString()
    };
  }

  try {
    const raw = await fetchJson(USGS_URL);
    const events = normalizeEarthquakes(raw);
    writeCache(key, events);
    return { events, stale: false, fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (cached) {
      return {
        events: cached.data,
        stale: true,
        fetchedAt: new Date(cached.storedAt).toISOString(),
        warning: 'Showing the last known data because the earthquake feed is unreachable.'
      };
    }
    return {
      events: [],
      stale: true,
      fetchedAt: null,
      warning: `Earthquake feed unavailable: ${error.message}`
    };
  }
}

/**
 * Derives a coarse flood risk level from recent and forecast rainfall.
 * Thresholds follow commonly used heavy-rainfall advisory bands in millimetres.
 */
export function computeFloodRisk({ rainNowMm, precipitation24hMm, windKph }) {
  const rain = Number(precipitation24hMm) || 0;
  const now = Number(rainNowMm) || 0;
  const wind = Number(windKph) || 0;

  let level = 'low';
  let summary = 'No significant rainfall expected in the next 24 hours.';

  if (rain >= 115 || (rain >= 80 && now >= 7)) {
    level = 'severe';
    summary = 'Very heavy rainfall expected. Low-lying areas are likely to flood.';
  } else if (rain >= 65) {
    level = 'high';
    summary = 'Heavy rainfall expected. Waterlogging is likely on local roads.';
  } else if (rain >= 25) {
    level = 'moderate';
    summary = 'Moderate rainfall expected. Minor waterlogging is possible.';
  }

  if (wind >= 62 && level === 'low') {
    level = 'moderate';
    summary = 'Strong winds expected. Secure loose objects and avoid the coast.';
  }

  return { level, summary };
}

export async function getWeather(lat, lng) {
  const roundedLat = Number(lat).toFixed(2);
  const roundedLng = Number(lng).toFixed(2);
  const key = `weather:${roundedLat}:${roundedLng}`;
  const cached = readCache(key);
  if (cached?.fresh) {
    return { ...cached.data, stale: false, fetchedAt: new Date(cached.storedAt).toISOString() };
  }

  const params = new URLSearchParams({
    latitude: roundedLat,
    longitude: roundedLng,
    current: 'temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code',
    hourly: 'precipitation',
    forecast_days: '2',
    timezone: 'auto',
    wind_speed_unit: 'kmh'
  });

  try {
    const raw = await fetchJson(`${OPEN_METEO_URL}?${params.toString()}`);
    const hourly = Array.isArray(raw?.hourly?.precipitation) ? raw.hourly.precipitation : [];
    const precipitation24hMm = hourly
      .slice(0, 24)
      .reduce((total, value) => total + (Number(value) || 0), 0);

    const payload = {
      location: { lat: Number(roundedLat), lng: Number(roundedLng) },
      current: {
        temperatureC: raw?.current?.temperature_2m ?? null,
        humidityPercent: raw?.current?.relative_humidity_2m ?? null,
        precipitationMm: raw?.current?.precipitation ?? null,
        rainMm: raw?.current?.rain ?? null,
        windKph: raw?.current?.wind_speed_10m ?? null,
        weatherCode: raw?.current?.weather_code ?? null
      },
      precipitation24hMm: Number(precipitation24hMm.toFixed(2)),
      floodRisk: computeFloodRisk({
        rainNowMm: raw?.current?.rain ?? 0,
        precipitation24hMm,
        windKph: raw?.current?.wind_speed_10m ?? 0
      })
    };

    writeCache(key, payload);
    return { ...payload, stale: false, fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (cached) {
      return {
        ...cached.data,
        stale: true,
        fetchedAt: new Date(cached.storedAt).toISOString(),
        warning: 'Showing the last known weather because the forecast service is unreachable.'
      };
    }
    return {
      location: { lat: Number(roundedLat), lng: Number(roundedLng) },
      current: null,
      precipitation24hMm: null,
      floodRisk: { level: 'unknown', summary: 'Weather data is currently unavailable.' },
      stale: true,
      fetchedAt: null,
      warning: `Weather feed unavailable: ${error.message}`
    };
  }
}

/* ----------------------------------------------------------- rain radar */

/**
 * RainViewer frame index.
 *
 * The index is fetched server-side so it can be cached and so a change in the
 * upstream shape is handled in one place. Tiles themselves are loaded directly
 * by the browser from the returned host, which needs no key.
 *
 * Tile URL shape: {host}{path}/{size}/{z}/{x}/{y}/{colour}/{smooth}_{snow}.png
 */
export async function getRainRadar() {
  const key = 'radar';
  const entry = cache.get(key);
  if (entry && Date.now() - entry.storedAt < RADAR_CACHE_TTL_MS) {
    return { ...entry.data, stale: false, fetchedAt: new Date(entry.storedAt).toISOString() };
  }

  try {
    const raw = await fetchJson(RAINVIEWER_URL);
    const host = raw?.host ?? 'https://tilecache.rainviewer.com';
    const past = Array.isArray(raw?.radar?.past) ? raw.radar.past : [];
    const nowcast = Array.isArray(raw?.radar?.nowcast) ? raw.radar.nowcast : [];

    const frames = [...past, ...nowcast]
      .filter((frame) => frame && typeof frame.path === 'string')
      .map((frame) => ({
        time: Number(frame.time) || null,
        path: frame.path,
        forecast: nowcast.includes(frame)
      }));

    if (frames.length === 0) {
      throw new Error('The radar index contained no frames');
    }

    const latest = frames[past.length > 0 ? past.length - 1 : 0];
    const payload = {
      available: true,
      host,
      frames,
      latest,
      // Colour scheme 2 with smoothing reads well over a dark or light basemap.
      tileTemplate: `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`,
      generated: raw?.generated ?? null
    };

    cache.set(key, { data: payload, storedAt: Date.now() });
    return { ...payload, stale: false, fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (entry) {
      return {
        ...entry.data,
        stale: true,
        fetchedAt: new Date(entry.storedAt).toISOString(),
        warning: 'Showing the last known radar frame, the radar service is unreachable.'
      };
    }
    return {
      available: false,
      host: null,
      frames: [],
      latest: null,
      tileTemplate: null,
      stale: true,
      fetchedAt: null,
      warning: `Rain radar unavailable: ${error.message}`
    };
  }
}
