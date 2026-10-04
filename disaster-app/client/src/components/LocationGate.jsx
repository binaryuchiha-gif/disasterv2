import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';

/**
 * Explains why location is needed before the browser permission prompt is
 * triggered, which is both clearer for the user and avoids an instant denial.
 */
export default function LocationGate() {
  const { t } = useTranslation();
  const locationPrompted = useStore((state) => state.locationPrompted);
  const position = useStore((state) => state.position);
  const startWatching = useStore((state) => state.startWatching);
  const useDemoLocation = useStore((state) => state.useDemoLocation);

  if (locationPrompted || position) return null;

  return (
    <div
      className="absolute inset-0 z-[1000] flex items-center justify-center bg-navy-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-gate-title"
    >
      <div className="w-full max-w-sm rounded-sheet bg-white p-6 text-center shadow-float dark:bg-navy-800">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-blue-600 dark:bg-navy-900">
          <MapPin size={26} aria-hidden="true" />
        </span>
        <h2 id="location-gate-title" className="text-base font-bold">
          {t('location.title')}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-navy-500 dark:text-navy-300">
          {t('location.body')}
        </p>
        <button type="button" onClick={startWatching} className="btn-primary mt-5 w-full">
          {t('location.enable')}
        </button>
        <button type="button" onClick={useDemoLocation} className="btn-secondary mt-2 w-full">
          {t('location.demo')}
        </button>
      </div>
    </div>
  );
}
