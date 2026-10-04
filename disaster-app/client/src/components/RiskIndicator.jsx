import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LEVEL_STYLES = {
  low: {
    chip: 'bg-safe-100 text-safe-700 dark:bg-safe-700/20 dark:text-safe-400',
    bar: 'bg-safe-500',
    Icon: ShieldCheck,
    width: '33%'
  },
  medium: {
    chip: 'bg-warn-100 text-warn-700 dark:bg-warn-700/20 dark:text-warn-400',
    bar: 'bg-warn-500',
    Icon: ShieldAlert,
    width: '66%'
  },
  high: {
    chip: 'bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400',
    bar: 'bg-danger-600',
    Icon: ShieldAlert,
    width: '100%'
  }
};

/**
 * Location risk rating with an expandable breakdown of the contributing
 * factors, so the rating is explainable rather than opaque.
 */
export default function RiskIndicator({ risk, compact = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!risk) return null;

  const style = LEVEL_STYLES[risk.level] ?? LEVEL_STYLES.low;
  const Icon = risk.hasData ? style.Icon : ShieldQuestion;

  return (
    <section className="card p-3" aria-label={t('risk.title')}>
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-bold">{t('risk.title')}</h3>
        <span className={`badge ${style.chip}`}>
          <Icon size={12} aria-hidden="true" />
          {t(`risk.${risk.level}`)}
        </span>
      </header>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700"
        role="meter"
        aria-valuenow={risk.score}
        aria-valuemin={0}
        aria-valuemax={12}
        aria-label={t('risk.title')}
      >
        <motion.div
          className={`h-full rounded-full ${style.bar}`}
          initial={{ width: 0 }}
          animate={{ width: style.width }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {!compact && (
        <p className="mt-2 text-[11px] leading-snug text-navy-600 dark:text-navy-300">
          {risk.summary}
        </p>
      )}

      {risk.factors.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-[11px] font-semibold text-navy-600 hover:underline dark:text-navy-200"
          >
            {open ? t('risk.hideFactors') : t('risk.showFactors')}
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={13} aria-hidden="true" />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                {risk.factors.map((factor) => (
                  <li
                    key={`${factor.signal}-${factor.label}`}
                    className="mt-1.5 rounded-lg bg-navy-50 p-2 text-[11px] leading-snug dark:bg-navy-900"
                  >
                    <span className="font-semibold">{factor.signal}</span>
                    <span className="text-navy-500 dark:text-navy-300">
                      {' '}
                      ({factor.points > 0 ? `+${factor.points}` : factor.points})
                    </span>
                    <br />
                    <span className="text-navy-600 dark:text-navy-300">{factor.label}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}
    </section>
  );
}
