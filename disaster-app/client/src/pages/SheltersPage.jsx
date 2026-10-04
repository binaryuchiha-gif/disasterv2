import { useMemo, useState } from 'react';
import { Search, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import ShelterCard from '../components/ShelterCard.jsx';
import { ShelterCardSkeleton } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/LiveDataCards.jsx';
import { rankShelters, availability } from '../lib/ranking.js';
import { filterActiveHazards } from '../lib/hazards.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Space available' },
  { id: 'limited', label: 'Limited' },
  { id: 'full', label: 'Full or closed' }
];

export default function SheltersPage() {
  const { t } = useTranslation();
  const shelters = useStore((state) => state.shelters);
  const position = useStore((state) => state.position);
  const loading = useStore((state) => state.loading.shelters);
  const error = useStore((state) => state.errors.shelters);
  const loadShelters = useStore((state) => state.loadShelters);
  const allHazards = useStore((state) => state.hazards);
  const selectedDisaster = useStore((state) => state.selectedDisaster);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const hazards = useMemo(
    () => filterActiveHazards(allHazards, selectedDisaster),
    [allHazards, selectedDisaster]
  );

  /**
   * When a position is known the list is ordered by score so it matches the
   * recommendation on the map; otherwise it falls back to alphabetical order.
   */
  const ordered = useMemo(() => {
    if (!position) {
      return [...shelters].sort((a, b) => a.name.localeCompare(b.name));
    }
    const scored = rankShelters(shelters, position.lat, position.lng, hazards, shelters.length);
    const scoredIds = new Set(scored.map((item) => item.id));
    const rest = shelters
      .filter((item) => !scoredIds.has(item.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...scored, ...rest];
  }, [shelters, position, hazards]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ordered.filter((shelter) => {
      if (term && !`${shelter.name} ${shelter.address ?? ''}`.toLowerCase().includes(term)) {
        return false;
      }
      if (filter === 'all') return true;
      const state = availability(shelter);
      if (filter === 'full') return state === 'full' || state === 'closed';
      return state === filter;
    });
  }, [ordered, query, filter]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{t('nav.shelters')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
          {position
            ? 'Ordered by the recommendation score for your current position.'
            : 'Enable location on the map page to rank these shelters by distance.'}
        </p>
      </header>

      <div className="space-y-2">
        <label className="relative block">
          <span className="sr-only">Search shelters</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or address"
            className="input pl-9"
          />
        </label>

        <div className="scroll-area flex gap-2 overflow-x-auto pb-1" role="group">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                filter === item.id
                  ? 'border-navy-900 bg-navy-900 text-white dark:border-blue-500 dark:bg-blue-600'
                  : 'border-navy-200 bg-white text-navy-700 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadShelters} />}

      {loading && shelters.length === 0 ? (
        <div className="space-y-2.5">
          <ShelterCardSkeleton />
          <ShelterCardSkeleton />
          <ShelterCardSkeleton />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={t('shelters.empty')}
          body="Adjust the search term or filter to see more results."
        />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {visible.map((shelter, index) => (
            <ShelterCard
              key={shelter.id}
              shelter={shelter}
              rank={index + 1}
              showRecommended={Boolean(position) && filter === 'all' && query === ''}
              showBreakdown={Boolean(shelter.breakdown)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
