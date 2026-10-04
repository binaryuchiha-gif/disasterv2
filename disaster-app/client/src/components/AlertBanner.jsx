import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import { relativeTime } from '../lib/time.js';

const SEVERITY_STYLES = {
  critical: 'bg-danger-700 text-white',
  warning: 'bg-warn-500 text-navy-900',
  info: 'bg-navy-700 text-white'
};

/**
 * Shows the most recent alert. Non-critical alerts rotate every eight seconds
 * so a single banner can surface the full advisory list.
 */
export default function AlertBanner() {
  const { t } = useTranslation();
  const alerts = useStore((state) => state.alerts);
  const [dismissedId, setDismissedId] = useState(null);
  const [index, setIndex] = useState(0);

  const critical = useMemo(
    () => alerts.find((alert) => alert.severity === 'critical') ?? null,
    [alerts]
  );

  const rotating = useMemo(() => alerts.filter((alert) => alert.severity !== 'critical'), [alerts]);

  useEffect(() => {
    if (critical || rotating.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % rotating.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [critical, rotating.length]);

  // A newly published critical alert must always reappear.
  useEffect(() => {
    if (critical && dismissedId !== critical.id) {
      setDismissedId(null);
    }
  }, [critical, dismissedId]);

  const active = critical ?? rotating[index % Math.max(1, rotating.length)] ?? null;

  if (!active || dismissedId === active.id) return null;

  const style = SEVERITY_STYLES[active.severity] ?? SEVERITY_STYLES.info;

  return (
    <div
      className={`flex animate-slide-down items-start gap-3 px-4 py-2.5 ${style}`}
      role={active.severity === 'critical' ? 'alert' : 'status'}
    >
      <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{active.title}</p>
        <p className="line-clamp-2 text-xs opacity-90">{active.body}</p>
      </div>
      <span className="hidden shrink-0 text-xs opacity-80 sm:block">
        {relativeTime(active.created_at)}
      </span>
      <button
        type="button"
        onClick={() => setDismissedId(active.id)}
        className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/10"
        aria-label={t('common.close')}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
