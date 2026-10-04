import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './BottomSheet.jsx';
import { getSafetyTips } from '../lib/safetyTips.js';

/** Do and do-not guidance for the selected disaster type. */
export default function SafetyTipsSheet({ disasterType, open, onClose }) {
  const { t } = useTranslation();
  const tips = getSafetyTips(disasterType);

  if (!tips) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t(`disaster.${disasterType}`)}: ${t('common.safetyTips')}`}
    >
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-safe-700 dark:text-safe-400">
            <Check size={16} aria-hidden="true" />
            {t('common.dos')}
          </h3>
          <ul className="space-y-1.5">
            {tips.dos.map((item) => (
              <li
                key={item}
                className="rounded-xl bg-safe-50 p-2.5 text-xs leading-snug text-navy-700 dark:bg-safe-500/10 dark:text-navy-100"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-danger-700 dark:text-danger-400">
            <X size={16} aria-hidden="true" />
            {t('common.donts')}
          </h3>
          <ul className="space-y-1.5">
            {tips.donts.map((item) => (
              <li
                key={item}
                className="rounded-xl bg-danger-50 p-2.5 text-xs leading-snug text-navy-700 dark:bg-danger-500/10 dark:text-navy-100"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
