/**
 * Leaflet map container plus the controls that live on top of it.
 * Map side effects are isolated in small helper components that use useMap.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents
} from 'react-leaflet';
import { Crosshair, Layers, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import { BASE_LAYERS, CHENNAI } from '../lib/constants.js';
import {
  EarthquakeMarkers,
  HazardLayer,
  ReportMarkers,
  RouteLine,
  ShelterMarkers,
  UserLocationMarker
} from './MapMarkers.jsx';
import { TrafficFlowLayer, TrafficIncidentLayer } from './TrafficLayer.jsx';
import { RadarTileLayer } from './RadarLayer.jsx';

/**
 * Keeps the map centred on the user while follow mode is active.
 * The first lock uses an animated fly, subsequent position updates pan
 * smoothly so that a stream of GPS fixes does not restart the animation.
 */
function FollowController({ position, followMode }) {
  const map = useMap();
  const engagedRef = useRef(false);

  useEffect(() => {
    if (!followMode) {
      engagedRef.current = false;
      return;
    }
    if (!position) return;

    const target = [position.lat, position.lng];
    if (!engagedRef.current) {
      engagedRef.current = true;
      map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.7 });
    } else {
      map.panTo(target, { animate: true, duration: 0.4 });
    }
  }, [followMode, position, map]);

  return null;
}

/** Turns follow mode off as soon as the user pans the map by hand. */
function InteractionWatcher({ onUserPan, onMapClick }) {
  useMapEvents({
    dragstart: () => onUserPan?.(),
    click: (event) => onMapClick?.(event.latlng)
  });
  return null;
}

/** Imperatively flies to a target when the parent requests it. */
function FlyToController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    if (target.bounds) {
      map.flyToBounds(target.bounds, { padding: [48, 48], duration: 0.8 });
    } else if (typeof target.lat === 'number') {
      map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 15), {
        duration: 0.8
      });
    }
  }, [target, map]);
  return null;
}

/** Ensures Leaflet recalculates size when the surrounding layout changes. */
function ResizeHandler({ dependency }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [dependency, map]);
  return null;
}

export default function MapView({
  shelters = [],
  hazards = [],
  reports = [],
  earthquakes = [],
  route = null,
  flyTarget = null,
  onMapClick,
  onShelterSelect,
  resizeKey,
  trafficEnabled = false,
  trafficSimulated = false,
  trafficSegments = [],
  trafficIncidents = [],
  radarEnabled = false,
  radar = null,
  children
}) {
  const { t } = useTranslation();
  const theme = useStore((state) => state.theme);
  const baseLayer = useStore((state) => state.baseLayer);
  const setBaseLayer = useStore((state) => state.setBaseLayer);
  const position = useStore((state) => state.position);
  const followMode = useStore((state) => state.followMode);
  const setFollowMode = useStore((state) => state.setFollowMode);
  const gpsStatus = useStore((state) => state.gpsStatus);
  const startWatching = useStore((state) => state.startWatching);
  const pushToast = useStore((state) => state.pushToast);

  // Dark mode automatically swaps the street basemap for the dark variant.
  const activeLayer = useMemo(() => {
    if (baseLayer === 'satellite') return BASE_LAYERS.satellite;
    return theme === 'dark' ? BASE_LAYERS.dark : BASE_LAYERS.street;
  }, [baseLayer, theme]);

  const handleLocateMe = () => {
    if (position) {
      setFollowMode(true);
      return;
    }
    if (gpsStatus === 'denied') {
      pushToast('Location permission is blocked for this site', 'error');
      return;
    }
    startWatching();
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={position ? [position.lat, position.lng] : [CHENNAI.lat, CHENNAI.lng]}
        zoom={12}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          key={activeLayer.id}
          url={activeLayer.url}
          attribution={activeLayer.attribution}
          maxZoom={activeLayer.maxZoom}
        />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" metric imperial={false} />

        {/* Radar sits above the basemap but below every interactive layer. */}
        <RadarTileLayer enabled={radarEnabled} radar={radar} />
        <TrafficFlowLayer
          enabled={trafficEnabled}
          simulated={trafficSimulated}
          segments={trafficSegments}
        />

        <HazardLayer hazards={hazards} />
        <ShelterMarkers shelters={shelters} onSelect={onShelterSelect} />
        <ReportMarkers reports={reports} labelFor={(type) => t(`reports.${type}`)} />
        <EarthquakeMarkers events={earthquakes} />
        <TrafficIncidentLayer enabled={trafficEnabled} incidents={trafficIncidents} />
        <RouteLine route={route} />
        <UserLocationMarker position={position} />

        <FollowController position={position} followMode={followMode} />
        <InteractionWatcher
          onUserPan={() => {
            if (followMode) setFollowMode(false);
          }}
          onMapClick={onMapClick}
        />
        <FlyToController target={flyTarget} />
        <ResizeHandler dependency={resizeKey} />
      </MapContainer>

      {/* Layer switch */}
      <div className="absolute left-3 top-3 z-[500] flex overflow-hidden rounded-xl border border-navy-200 bg-white shadow-float dark:border-navy-600 dark:bg-navy-800">
        {['street', 'satellite'].map((layerId) => (
          <button
            key={layerId}
            type="button"
            onClick={() => setBaseLayer(layerId)}
            aria-pressed={baseLayer === layerId}
            className={`inline-flex min-h-[40px] items-center gap-1.5 px-3 text-xs font-bold transition-colors ${
              baseLayer === layerId
                ? 'bg-navy-900 text-white dark:bg-blue-600'
                : 'text-navy-700 hover:bg-navy-50 dark:text-navy-100 dark:hover:bg-navy-700'
            }`}
          >
            {layerId === 'street' ? <Layers size={14} aria-hidden="true" /> : null}
            {BASE_LAYERS[layerId].label}
          </button>
        ))}
      </div>

      {/* Follow and locate controls */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setFollowMode(!followMode)}
          aria-pressed={followMode}
          aria-label={followMode ? t('location.followOn') : t('location.followOff')}
          title={followMode ? t('location.followOn') : t('location.followOff')}
          className={`btn-icon border shadow-float ${
            followMode
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-navy-200 bg-white text-navy-700 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100'
          }`}
        >
          <Navigation size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleLocateMe}
          aria-label={t('location.locateMe')}
          title={t('location.locateMe')}
          className="btn-icon border border-navy-200 bg-white text-navy-700 shadow-float dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100"
        >
          <Crosshair size={18} aria-hidden="true" />
        </button>
      </div>

      {children}
    </div>
  );
}
