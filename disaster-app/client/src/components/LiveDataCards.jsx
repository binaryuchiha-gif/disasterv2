import { Activity, CloudRain, Droplets, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { relativeTime } from '../lib/time.js';
import { SkeletonText } from './Skeleton.jsx';

const RISK_STYLES = {
  low: 'bg-safe-100 text-safe-700 dark:bg-safe-500/15 dark:text-safe-400',
  moderate: 'bg-warn-100 text-warn-700 dark:bg-warn-500/15 dark:text-warn-400',
  high: 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-400',
  severe: 'bg-danger-600 text-white',
  unknown: 'bg-navy-100 text-navy-600 dark:bg-navy-700 dark:text-navy-200'
};

const RISK_LABEL_KEYS = {
  low: 'weather.riskLow',
  moderate: 'weather.riskModerate',
  high: 'weather.riskHigh',
  severe: 'weather.riskSevere',
  unknown: 'weather.riskUnknown'
};

/** Current conditions from Open-Meteo plus the derived flood risk level. */
export function WeatherCard({ weather, loading, error, onRetry }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <section className="card p-4">
        <h3 className="mb-3 text-sm font-bold">{t('weather.title')}</h3>
        <SkeletonText lines={3} />
      </section>
    );
  }

  if (error || !weather) {
    return (
      <section className="card p-4">
        <h3 className="mb-2 text-sm font-bold">{t('weather.title')}</h3>
        <p className="text-xs text-navy-500 dark:text-navy-300">{t('weather.unavailable')}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary mt-3 w-full">
            <RefreshCw size={15} aria-hidden="true" />
            {t('common.retry')}
          </button>
        )}
      </section>
    );
  }

  const risk = weather.floodRisk ?? { level: 'unknown', summary: '' };
  const current = weather.current ?? {};

  return (
    <section className="card p-4" aria-label={t('weather.title')}>
      <header className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <CloudRain size={15} aria-hidden="true" />
          {t('weather.title')}
        </h3>
        <span className={`badge ${RISK_STYLES[risk.level] ?? RISK_STYLES.unknown}`}>
          {t(RISK_LABEL_KEYS[risk.level] ?? RISK_LABEL_KEYS.unknown)}
        </span>
      </header>

      {risk.summary && (
        <p className="mt-2 text-xs leading-snug text-navy-600 dark:text-navy-300">{risk.summary}</p>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="card-muted p-2">
          <dt className="text-[10px] font-semibold uppercase text-navy-500 dark:text-navy-300">
            {t('weather.rainNow')}
          </dt>
          <dd className="mt-0.5 text-sm font-bold">
            {current.rainMm !== null && current.rainMm !== undefined ? `${current.rainMm} mm` : '-'}
          </dd>
        </div>
        <div className="card-muted p-2">
          <dt className="text-[10px] font-semibold uppercase text-navy-500 dark:text-navy-300">
            {t('weather.rain24h')}
          </dt>
          <dd className="mt-0.5 text-sm font-bold">
            {weather.precipitation24hMm !== null && weather.precipitation24hMm !== undefined
              ? `${weather.precipitation24hMm} mm`
              : '-'}
          </dd>
        </div>
        <div className="card-muted p-2">
          <dt className="text-[10px] font-semibold uppercase text-navy-500 dark:text-navy-300">
            {t('weather.wind')}
          </dt>
          <dd className="mt-0.5 text-sm font-bold">
            {current.windKph !== null && current.windKph !== undefined
              ? `${Math.round(current.windKph)} kph`
              : '-'}
          </dd>
        </div>
      </dl>

      {weather.stale && weather.warning && (
        <p className="mt-2 text-[11px] text-warn-600 dark:text-warn-400">{weather.warning}</p>
      )}
    </section>
  );
}

/** Recent regional seismic activity from the USGS feed. */
export function EarthquakeList({ feed, loading, error, onRetry, limit = 6 }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <section className="card p-4">
        <h3 className="mb-3 text-sm font-bold">{t('earthquakes.title')}</h3>
        <SkeletonText lines={4} />
      </section>
    );
  }

  const events = feed?.events ?? [];

  return (
    <section className="card p-4" aria-label={t('earthquakes.title')}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Activity size={15} aria-hidden="true" />
          {t('earthquakes.title')}
        </h3>
        {feed?.fetchedAt && (
          <span className="text-[11px] text-navy-400">{relativeTime(feed.fetchedAt)}</span>
        )}
      </header>

      {error ? (
        <>
          <p className="mt-2 text-xs text-navy-500 dark:text-navy-300">
            The earthquake feed could not be loaded.
          </p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary mt-3 w-full">
              <RefreshCw size={15} aria-hidden="true" />
              {t('common.retry')}
            </button>
          )}
        </>
      ) : events.length === 0 ? (
        <p className="mt-2 text-xs text-navy-500 dark:text-navy-300">{t('earthquakes.empty')}</p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {events.slice(0, limit).map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-2.5 rounded-xl bg-navy-50 p-2.5 dark:bg-navy-900"
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  (event.magnitude ?? 0) >= 5
                    ? 'bg-danger-600 text-white'
                    : 'bg-warn-500 text-navy-900'
                }`}
              >
                {(event.magnitude ?? 0).toFixed(1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{event.place}</p>
                <p className="text-[11px] text-navy-500 dark:text-navy-300">
                  {t('earthquakes.depth')}{' '}
                  {event.depthKm !== null ? `${Math.round(event.depthKm)} km` : '-'},{' '}
                  {relativeTime(event.time)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {feed?.stale && feed?.warning && (
        <p className="mt-2 text-[11px] text-warn-600 dark:text-warn-400">{feed.warning}</p>
      )}
    </section>
  );
}

/** Small reusable empty-state block. */
export function EmptyState({ icon: Icon = Droplets, title, body }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-6 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 text-navy-500 dark:bg-navy-700 dark:text-navy-200">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {body && <p className="text-xs text-navy-500 dark:text-navy-300">{body}</p>}
    </div>
  );
}

/** Inline error block with an optional retry action. */
export function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="card border-danger-200 bg-danger-50 p-4 dark:border-danger-700/40 dark:bg-danger-700/10">
      <p className="text-sm font-semibold text-danger-700 dark:text-danger-400">
        {t('common.error')}
      </p>
      <p className="mt-1 text-xs text-danger-700/90 dark:text-danger-400/90">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3">
          <RefreshCw size={15} aria-hidden="true" />
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
