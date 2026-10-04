import { Activity, Flame, Waves, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import { DISASTER_TYPES } from '../lib/constants.js';

const ICONS = {
  flood: Waves,
  cyclone: Wind,
  earthquake: Activity,
  fire: Flame,
  tsunami: Waves
};

/** Disaster filter row. Selecting a type filters hazard zones and rankings. */
export default function DisasterChips({ onSelect }) {
  const { t } = useTranslation();
  const selected = useStore((state) => state.selectedDisaster);
  const setSelectedDisaster = useStore((state) => state.setSelectedDisaster);

  return (
    <div
      className="scroll-area flex gap-2 overflow-x-auto border-b border-navy-100 bg-white px-3 py-2.5 dark:border-navy-700 dark:bg-navy-900"
      role="group"
      aria-label="Disaster type filter"
    >
      {DISASTER_TYPES.map((type) => {
        const Icon = ICONS[type];
        const isActive = selected === type;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              setSelectedDisaster(type);
              // Only open the guidance sheet when selecting, not when clearing.
              if (onSelect && selected !== type) onSelect(type);
            }}
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-navy-900 bg-navy-900 text-white dark:border-blue-500 dark:bg-blue-600'
                : 'border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100 dark:hover:bg-navy-700'
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {t(`disaster.${type}`)}
          </button>
        );
      })}
    </div>
  );
}
