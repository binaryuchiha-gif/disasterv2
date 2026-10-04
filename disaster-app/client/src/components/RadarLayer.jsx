/**
 * RainViewer precipitation radar overlay.
 *
 * The frame index is fetched through our server so it can be cached; the tiles
 * themselves come straight from RainViewer and need no key.
 */
import { TileLayer } from 'react-leaflet';
import { CloudRain } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function RadarTileLayer({ enabled, radar }) {
  if (!enabled || !radar?.available || !radar.tileTemplate) return null;

  return (
    <TileLayer
      key={radar.latest?.path ?? 'radar'}
      url={radar.tileTemplate}
      opacity={0.6}
      zIndex={350}
      attribution='Radar &copy; <a href="https://www.rainviewer.com" target="_blank" rel="noopener">RainViewer</a>'
    />
  );
}

/** Small status strip shown with the other live data panels. */
export function RadarStatus({ radar, enabled }) {
  const { t } = useTranslation();
  if (!enabled) return null;

  if (!radar?.available) {
    return (
      <p className="card p-2.5 text-[11px] text-navy-500 dark:text-navy-300">
        {radar?.warning ?? t('radar.unavailable')}
      </p>
    );
  }

  const frameTime = radar.latest?.time ? new Date(radar.latest.time * 1000) : null;

  return (
    <p className="card flex items-center gap-2 p-2.5 text-[11px] text-navy-500 dark:text-navy-300">
      <CloudRain size={13} aria-hidden="true" className="shrink-0" />
      <span>
        {t('radar.frame')}
        {frameTime ? `: ${frameTime.toLocaleTimeString()}` : ''}
        {radar.latest?.forecast ? ` (${t('radar.forecast')})` : ''}
      </span>
    </p>
  );
}
