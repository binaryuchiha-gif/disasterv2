/** Relative and absolute time formatting helpers. */

/**
 * SQLite `datetime('now')` returns "YYYY-MM-DD HH:MM:SS" in UTC without a
 * timezone marker. Normalise it so browsers do not read it as local time.
 */
export function parseTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
    const isoLike = value.includes('T') ? value : value.replace(' ', 'T');
    const normalized = hasTimezone ? isoLike : `${isoLike}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function relativeTime(value) {
  const date = parseTimestamp(value);
  if (!date) return 'unknown';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 45) return 'just now';
  if (seconds < 90) return '1 minute ago';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;

  return date.toLocaleDateString();
}

export function formatDateTime(value) {
  const date = parseTimestamp(value);
  if (!date) return 'unknown';
  return date.toLocaleString();
}

export function formatDistance(km) {
  if (typeof km !== 'number' || Number.isNaN(km)) return 'unknown';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) return 'unknown';
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
