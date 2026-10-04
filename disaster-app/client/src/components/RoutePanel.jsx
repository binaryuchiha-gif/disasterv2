import { AlertTriangle, ExternalLink, Navigation, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistance, formatDuration } from '../lib/time.js';
import { SkeletonText } from './Skeleton.jsx';

/** Route summary, hazard labelling and turn-by-turn list. */
export default function RoutePanel({ route, destination, loading }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="card mt-3 p-4">
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (!route) return null;

  const badge = route.estimated
    ? { label: t('route.estimated'), className: 'bg-warn-500 text-navy-900', Icon: AlertTriangle }
    : route.crossesHazard
      ? {
          label: t('route.crossesHazard'),
          className: 'bg-danger-600 text-white',
          Icon: AlertTriangle
        }
      : {
          label: t('route.hazardAvoiding'),
          className: 'bg-safe-600 text-white',
          Icon: ShieldCheck
        };

  const BadgeIcon = badge.Icon;

  return (
    <section className="card mt-3 p-4" aria-label={t('route.title')}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Navigation size={15} aria-hidden="true" />
            {t('route.title')}
          </h3>
          {destination && (
            <p className="mt-0.5 truncate text-xs text-navy-500 dark:text-navy-300">
              {destination.name}
            </p>
          )}
        </div>
        <span className={`badge shrink-0 ${badge.className}`}>
          <BadgeIcon size={11} aria-hidden="true" />
          {badge.label}
        </span>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="card-muted p-2.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-300">
            {t('route.distance')}
          </dt>
          <dd className="mt-0.5 font-bold">{formatDistance(route.distanceKm)}</dd>
        </div>
        <div className="card-muted p-2.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-300">
            {t('route.eta')}
          </dt>
          <dd className="mt-0.5 font-bold">{formatDuration(route.durationMin)}</dd>
        </div>
      </dl>

      {route.warning && (
        <p className="mt-2 rounded-xl bg-warn-50 p-2.5 text-xs text-warn-700 dark:bg-warn-500/10 dark:text-warn-400">
          {route.warning}
        </p>
      )}

      {!route.estimated && route.alternativesConsidered > 1 && (
        <p className="mt-2 text-xs text-navy-500 dark:text-navy-300">
          {route.alternativesConsidered} alternatives compared, the one crossing the fewest hazard
          zones was selected.
        </p>
      )}

      <a
        href={route.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary mt-3 w-full"
      >
        <ExternalLink size={16} aria-hidden="true" />
        {t('route.openInMaps')}
      </a>

      {route.steps.length > 0 ? (
        <div className="mt-3">
          <h4 className="mb-2 text-xs font-bold text-navy-500 dark:text-navy-300">
            {t('route.steps')}
          </h4>
          <ol className="scroll-area max-h-56 space-y-1.5 overflow-y-auto">
            {route.steps.map((step, index) => (
              <li
                key={`${index}-${step.instruction}`}
                className="flex gap-2 rounded-xl bg-navy-50 p-2.5 text-xs dark:bg-navy-900"
              >
                <span className="shrink-0 font-mono text-navy-400">{index + 1}</span>
                <span className="flex-1">{step.instruction}</span>
                {step.distanceM > 0 && (
                  <span className="shrink-0 text-navy-400">
                    {formatDistance(step.distanceM / 1000)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-3 text-xs text-navy-500 dark:text-navy-300">{t('route.noSteps')}</p>
      )}
    </section>
  );
}
