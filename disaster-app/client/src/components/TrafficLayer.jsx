/**
 * Traffic overlays.
 *
 * With a server-side TomTom key the flow layer is a raster tile layer proxied
 * through /api/traffic/tile, so the key never reaches the browser. Without a
 * key a deterministic simulated layer is drawn instead and labelled as such.
 */
import { Marker, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Ban, Clock, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INCIDENT_SEVERITY_COLORS, TRAFFIC_LEVELS, TRAFFIC_TILE_URL } from '../lib/traffic.js';

function incidentIcon(severity, closed) {
  const color = INCIDENT_SEVERITY_COLORS[severity] ?? INCIDENT_SEVERITY_COLORS.unknown;
  const glyph = closed
    ? '<path d="M5 5 L19 19 M19 5 L5 19" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>'
    : '<path d="M12 7v6" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="17" r="1.6" fill="#ffffff"/>';

  return L.divIcon({
    className: 'marker-reset',
    html: `<div style="width:24px;height:24px;border-radius:7px;background:${color};border:2px solid #ffffff;box-shadow:0 1px 5px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">${glyph}</svg>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });
}

/** Raster flow tiles, or the simulated corridor overlay when there is no key. */
export function TrafficFlowLayer({ enabled, simulated, segments }) {
  if (!enabled) return null;

  if (simulated) {
    return segments.map((segment) => (
      <Polyline
        key={`traffic-${segment.id}`}
        positions={segment.positions}
        pathOptions={{ color: segment.color, weight: 6, opacity: 0.75, lineCap: 'round' }}
      >
        <Tooltip sticky>
          <span className="text-xs font-semibold">{segment.name}</span>
          <br />
          <span className="text-xs">
            {segment.level === 'free' ? 'Free flowing' : `Delay about ${segment.delayMinutes} min`}
          </span>
        </Tooltip>
      </Polyline>
    ));
  }

  return (
    <TileLayer
      url={TRAFFIC_TILE_URL}
      opacity={0.75}
      zIndex={400}
      attribution="Traffic &copy; TomTom"
    />
  );
}

/** Incident and closure pins with a detail popup. */
export function TrafficIncidentLayer({ enabled, incidents }) {
  if (!enabled || !Array.isArray(incidents) || incidents.length === 0) return null;

  return incidents.map((incident) => (
    <Marker
      key={`traffic-incident-${incident.id}`}
      position={[incident.lat, incident.lng]}
      icon={incidentIcon(incident.severity, incident.closed)}
      zIndexOffset={600}
    >
      <Popup>
        <strong className="block text-sm">
          {incident.closed ? 'Road closed' : 'Traffic incident'}
          {incident.simulated ? ' (simulated)' : ''}
        </strong>
        <span className="text-xs">{incident.description}</span>
        {(incident.from || incident.to) && (
          <>
            <br />
            <span className="text-xs text-navy-500">
              {incident.from ?? 'Unknown'} to {incident.to ?? 'unknown'}
            </span>
          </>
        )}
        <br />
        <span className="text-xs text-navy-500">
          Severity {incident.severity}
          {incident.delaySeconds > 0 && `, delay ${Math.round(incident.delaySeconds / 60)} min`}
          {incident.lengthMeters > 0 && `, affects ${(incident.lengthMeters / 1000).toFixed(1)} km`}
        </span>
        {incident.roadNumbers?.length > 0 && (
          <>
            <br />
            <span className="text-xs text-navy-500">Roads: {incident.roadNumbers.join(', ')}</span>
          </>
        )}
      </Popup>
    </Marker>
  ));
}

/** Colour key for the flow layer, plus the simulated-data notice. */
export function TrafficLegend({ simulated, incidentCount, closureCount }) {
  const { t } = useTranslation();

  return (
    <div className="card p-3" aria-label={t('traffic.legend')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-bold">{t('traffic.legend')}</h3>
        {simulated && (
          <span className="badge bg-warn-500 text-navy-900">{t('traffic.simulated')}</span>
        )}
      </div>

      <ul className="mt-2 space-y-1">
        {TRAFFIC_LEVELS.map((level) => (
          <li key={level.id} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2 w-6 shrink-0 rounded-full"
              style={{ backgroundColor: level.color }}
              aria-hidden="true"
            />
            <span>{t(`traffic.level.${level.id}`)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-navy-100 pt-2 text-[11px] text-navy-500 dark:border-navy-700 dark:text-navy-300">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={11} aria-hidden="true" />
          {incidentCount} {t('traffic.incidents')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Ban size={11} aria-hidden="true" />
          {closureCount} {t('traffic.closures')}
        </span>
      </div>

      {simulated && (
        <p className="mt-2 flex gap-1.5 text-[11px] leading-snug text-warn-700 dark:text-warn-400">
          <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          {t('traffic.simulatedHint')}
        </p>
      )}
    </div>
  );
}

/** Compact traffic delay chip used on cards and in the route panel. */
export function TrafficDelayChip({ delayMinutes, trafficAware }) {
  const { t } = useTranslation();
  if (!trafficAware || typeof delayMinutes !== 'number' || delayMinutes < 0.5) return null;

  const severe = delayMinutes >= 10;
  return (
    <span
      className={`chip ${
        severe
          ? 'bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400'
          : 'bg-warn-100 text-warn-700 dark:bg-warn-700/20 dark:text-warn-400'
      }`}
    >
      <Clock size={12} aria-hidden="true" />
      {t('traffic.delay', { minutes: Math.round(delayMinutes) })}
    </span>
  );
}
