/**
 * Map overlays built on react-leaflet.
 *
 * All markers use divIcon with inline SVG, which sidesteps the well known
 * Leaflet default-icon path problem in bundlers and keeps styling in one place.
 */
import { useEffect, useRef, useState } from 'react';
import { Circle, CircleMarker, Marker, Polygon, Polyline, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { availability } from '../lib/ranking.js';
import { hazardToPolygons } from '../lib/geo.js';
import { relativeTime } from '../lib/time.js';
import { SEVERITY_COLORS } from '../lib/constants.js';

const AVAILABILITY_COLORS = {
  available: '#10B981',
  limited: '#F59E0B',
  full: '#DC2626',
  closed: '#64748B'
};

function shelterIcon(color) {
  return L.divIcon({
    className: 'marker-reset',
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 24 14 24s14-14.2 14-24C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="14" cy="14" r="5.4" fill="#ffffff"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32]
  });
}

function userIcon(heading) {
  const arrow =
    typeof heading === 'number'
      ? `<div style="position:absolute;left:50%;top:-11px;transform:translateX(-50%) rotate(${heading}deg);transform-origin:50% 21px;">
           <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0 L11 11 L6 8.4 L1 11 Z" fill="#2563EB" stroke="#ffffff" stroke-width="0.8"/></svg>
         </div>`
      : '';
  return L.divIcon({
    className: 'marker-reset',
    html: `<div style="position:relative;width:20px;height:20px;">
        <div class="user-pulse"></div>
        <div class="user-dot" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);"></div>
        ${arrow}
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

function reportIcon(color) {
  return L.divIcon({
    className: 'marker-reset',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3"><path d="M12 8v5"/><circle cx="12" cy="17" r="1"/></svg>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export function ShelterMarkers({ shelters, onSelect }) {
  return shelters.map((shelter) => {
    const state = availability(shelter);
    const free = Math.max(0, (shelter.capacity ?? 0) - (shelter.occupied ?? 0));
    return (
      <Marker
        key={`shelter-${shelter.id}`}
        position={[shelter.lat, shelter.lng]}
        icon={shelterIcon(AVAILABILITY_COLORS[state])}
        eventHandlers={onSelect ? { click: () => onSelect(shelter) } : undefined}
      >
        <Popup>
          <strong className="block text-sm">{shelter.name}</strong>
          <span className="text-xs">
            {free} of {shelter.capacity} places free
          </span>
          <br />
          <span className="text-xs text-navy-500">Updated {relativeTime(shelter.updated_at)}</span>
        </Popup>
      </Marker>
    );
  });
}

export function UserLocationMarker({ position }) {
  if (!position) return null;
  return (
    <>
      {typeof position.accuracy === 'number' && position.accuracy > 0 && (
        <Circle
          center={[position.lat, position.lng]}
          radius={position.accuracy}
          pathOptions={{ color: '#2563EB', weight: 1, fillColor: '#2563EB', fillOpacity: 0.12 }}
        />
      )}
      <Marker
        position={[position.lat, position.lng]}
        icon={userIcon(position.heading)}
        zIndexOffset={1000}
      />
    </>
  );
}

export function HazardLayer({ hazards }) {
  return hazards.flatMap((hazard) => {
    const color = SEVERITY_COLORS[hazard.severity] ?? '#DC2626';
    // Higher severity pulses faster and more strongly, so the eye is drawn to
    // the most dangerous zones first. The animation lives in index.css.
    const pulseClass = `hazard-pulse hazard-pulse-${hazard.severity ?? 1}`;

    return hazardToPolygons(hazard).map((feature, index) => {
      // GeoJSON rings are [lng, lat]; Leaflet polygons need [lat, lng].
      const positions = feature.geometry.coordinates.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng])
      );
      return (
        <Polygon
          key={`hazard-${hazard.id}-${index}`}
          positions={positions}
          className={pulseClass}
          pathOptions={{
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.18 + hazard.severity * 0.04
          }}
        >
          <Tooltip sticky>
            <span className="text-xs font-semibold">{hazard.name}</span>
            <br />
            <span className="text-xs">
              {hazard.disaster_type}, severity {hazard.severity}
            </span>
          </Tooltip>
        </Polygon>
      );
    });
  });
}

export function ReportMarkers({ reports, labelFor }) {
  return reports.map((report) => (
    <Marker
      key={`report-${report.id}`}
      position={[report.lat, report.lng]}
      icon={reportIcon(report.status === 'verified' ? '#DC2626' : '#F59E0B')}
    >
      <Popup>
        <strong className="block text-sm">{labelFor ? labelFor(report.type) : report.type}</strong>
        {report.description && <span className="text-xs">{report.description}</span>}
        <br />
        <span className="text-xs text-navy-500">
          {report.status}, {relativeTime(report.created_at)}
        </span>
      </Popup>
    </Marker>
  ));
}

/** USGS earthquakes drawn as circles scaled by magnitude. */
export function EarthquakeMarkers({ events }) {
  return events.map((event) => {
    const magnitude = Number(event.magnitude) || 0;
    return (
      <CircleMarker
        key={`quake-${event.id}`}
        center={[event.lat, event.lng]}
        radius={Math.max(5, magnitude * 3)}
        pathOptions={{
          color: '#7C2D12',
          weight: 1.5,
          fillColor: magnitude >= 5 ? '#DC2626' : '#F59E0B',
          fillOpacity: 0.45
        }}
      >
        <Popup>
          <strong className="block text-sm">Magnitude {magnitude.toFixed(1)}</strong>
          <span className="text-xs">{event.place}</span>
          <br />
          <span className="text-xs text-navy-500">{relativeTime(event.time)}</span>
        </Popup>
      </CircleMarker>
    );
  });
}

/**
 * Route line with a draw-on animation.
 *
 * The polyline is revealed progressively by appending vertices on each frame,
 * which animates reliably across browsers and keeps Leaflet in charge of the
 * projection. A dashed estimate is drawn immediately since it is only two
 * points long.
 */
export function RouteLine({ route, animate = true }) {
  const [revealed, setRevealed] = useState([]);
  const frameRef = useRef(null);

  const latLngs = Array.isArray(route?.latLngs) ? route.latLngs : [];
  const signature = latLngs.length > 0 ? `${latLngs.length}-${latLngs[0]?.join(',')}` : '';

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    if (latLngs.length < 2) {
      setRevealed([]);
      return undefined;
    }
    if (!animate || route.estimated || latLngs.length <= 3) {
      setRevealed(latLngs);
      return undefined;
    }

    // Draw over roughly half a second regardless of how many vertices there are.
    const totalFrames = 30;
    const step = Math.max(1, Math.ceil(latLngs.length / totalFrames));
    let drawn = step;
    setRevealed(latLngs.slice(0, drawn));

    const tick = () => {
      drawn += step;
      if (drawn >= latLngs.length) {
        setRevealed(latLngs);
        frameRef.current = null;
        return;
      }
      setRevealed(latLngs.slice(0, drawn));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
    // signature changes whenever a different route is supplied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, animate, route?.estimated]);

  if (revealed.length < 2) return null;

  const color = route.estimated ? '#64748B' : route.crossesHazard ? '#DC2626' : '#2563EB';

  return (
    <>
      {/* A soft casing underneath makes the line readable over busy imagery. */}
      <Polyline positions={revealed} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.55 }} />
      <Polyline
        positions={revealed}
        pathOptions={{
          color,
          weight: 5,
          opacity: 0.95,
          dashArray: route.estimated ? '8 8' : undefined
        }}
      />
    </>
  );
}
