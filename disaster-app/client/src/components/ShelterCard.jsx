import {
  Accessibility,
  BedDouble,
  Clock,
  Cross,
  Droplet,
  MapPin,
  Navigation,
  Phone,
  ShowerHead,
  Utensils,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { availability } from '../lib/ranking.js';
import { formatDistance, formatDuration, relativeTime } from '../lib/time.js';
import { TrafficDelayChip } from './TrafficLayer.jsx';

const FACILITY_ICONS = {
  water: Droplet,
  food: Utensils,
  medical: Cross,
  power: Zap,
  toilets: ShowerHead,
  bedding: BedDouble
};

const AVAILABILITY_STYLES = {
  available: { dot: 'bg-safe-500', bar: 'bg-safe-500', labelKey: 'shelters.available' },
  limited: { dot: 'bg-warn-500', bar: 'bg-warn-500', labelKey: 'shelters.limited' },
  full: { dot: 'bg-danger-600', bar: 'bg-danger-600', labelKey: 'shelters.full' },
  closed: { dot: 'bg-navy-400', bar: 'bg-navy-400', labelKey: 'shelters.closed' }
};

/** Score breakdown bars explaining why a shelter was recommended. */
function ScoreBreakdown({ breakdown, reasons }) {
  const { t } = useTranslation();
  if (!breakdown) return null;

  const entries = [
    { key: 'distance', label: 'Distance' },
    { key: 'capacity', label: 'Free capacity' },
    { key: 'eta', label: 'Travel time' },
    { key: 'facilities', label: 'Facilities' },
    { key: 'accessibility', label: 'Accessibility' }
  ];
  // Weights are normalised so the widest bar fills the row.
  const max = Math.max(...entries.map((entry) => breakdown[entry.key] ?? 0), 0.0001);

  return (
    <div className="mt-3 border-t border-navy-100 pt-3 dark:border-navy-700">
      <p className="mb-2 text-xs font-bold text-navy-500 dark:text-navy-300">{t('shelters.why')}</p>
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const value = breakdown[entry.key] ?? 0;
          return (
            <div key={entry.key} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[11px] text-navy-500 dark:text-navy-300">
                {entry.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.round((value / max) * 100)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] text-navy-400">
                {value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      {Array.isArray(reasons) && reasons.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="flex gap-1.5 text-[11px] leading-snug text-navy-600 dark:text-navy-300"
            >
              <span aria-hidden="true">-</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShelterCard({
  shelter,
  rank,
  showRecommended = false,
  showBreakdown = false,
  onNavigate,
  onSelect,
  index = 0
}) {
  const { t } = useTranslation();
  const state = availability(shelter);
  const style = AVAILABILITY_STYLES[state];

  const capacity = Number(shelter.capacity) || 0;
  const occupied = Number(shelter.occupied) || 0;
  const free = Math.max(0, capacity - occupied);
  const freePercent = capacity > 0 ? Math.round((free / capacity) * 100) : 0;
  const facilities = Array.isArray(shelter.facilities) ? shelter.facilities : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 5) * 0.05, ease: 'easeOut' }}
      className="card p-4 transition-shadow hover:shadow-float"
      aria-label={shelter.name}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(shelter)}
                  className="text-left hover:underline"
                >
                  {shelter.name}
                </button>
              ) : (
                shelter.name
              )}
            </h3>
            {showRecommended && rank === 1 && (
              <span className="badge shrink-0 bg-safe-600 text-white">
                {t('shelters.recommended')}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-navy-500 dark:text-navy-300">
            {typeof shelter.distanceKm === 'number' && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} aria-hidden="true" />
                {formatDistance(shelter.distanceKm)}
              </span>
            )}
            {typeof shelter.etaMinutes === 'number' && (
              <span
                className="inline-flex items-center gap-1"
                title={shelter.trafficAware ? t('traffic.aware') : undefined}
              >
                <Clock size={13} aria-hidden="true" />
                {formatDuration(shelter.etaMinutes)}
                {shelter.trafficAware && <span aria-hidden="true">*</span>}
              </span>
            )}
            <span className={state === 'full' || state === 'closed' ? 'font-semibold' : ''}>
              {t(style.labelKey)}
            </span>
            {shelter.accessibility && (
              <span className="inline-flex items-center gap-1" title={t('shelters.accessible')}>
                <Accessibility size={13} aria-hidden="true" />
              </span>
            )}
          </div>

          <div className="mt-1.5">
            <TrafficDelayChip
              delayMinutes={shelter.trafficDelayMinutes}
              trafficAware={shelter.trafficAware}
            />
          </div>

          <div className="mt-2.5">
            <div className="mb-1 flex justify-between text-[11px] text-navy-500 dark:text-navy-300">
              <span>
                {free} / {capacity} {t('shelters.free')}
              </span>
              <span>{freePercent}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700"
              role="progressbar"
              aria-valuenow={freePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('shelters.capacity')}
            >
              <div
                className={`h-full rounded-full ${style.bar}`}
                style={{ width: `${freePercent}%` }}
              />
            </div>
          </div>

          {facilities.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label={t('shelters.facilities')}>
              {facilities.map((facility) => {
                const Icon = FACILITY_ICONS[facility];
                if (!Icon) return null;
                return (
                  <span
                    key={facility}
                    title={facility}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-navy-600 dark:border-navy-600 dark:bg-navy-900 dark:text-navy-200"
                  >
                    <Icon size={14} aria-hidden="true" />
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-navy-400">
            <span>
              {t('shelters.updated')} {relativeTime(shelter.updated_at)}
            </span>
            {shelter.phone && (
              <a
                href={`tel:${shelter.phone}`}
                className="inline-flex items-center gap-1 font-semibold text-navy-600 hover:underline dark:text-navy-200"
              >
                <Phone size={12} aria-hidden="true" />
                {shelter.phone}
              </a>
            )}
          </div>

          {showBreakdown && (
            <ScoreBreakdown breakdown={shelter.breakdown} reasons={shelter.reasons} />
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(shelter)}
              className="btn-primary mt-3 w-full"
            >
              <Navigation size={16} aria-hidden="true" />
              {t('route.title')}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
