import { useEffect, useState } from 'react';
import { Copy, HeartHandshake, Search, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import { EmptyState, ErrorState } from '../components/LiveDataCards.jsx';
import { SkeletonText } from '../components/Skeleton.jsx';
import { STORAGE_KEYS } from '../lib/constants.js';
import { readString, writeString } from '../lib/storage.js';
import { formatDateTime, relativeTime } from '../lib/time.js';

/** Lets people mark themselves safe and look up a relative by name. */
export default function CheckInPage() {
  const { t } = useTranslation();
  const position = useStore((state) => state.position);
  const pushToast = useStore((state) => state.pushToast);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastCheckin, setLastCheckin] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setName(readString(STORAGE_KEYS.checkInName, ''));
  }, []);

  const shareText = lastCheckin
    ? `${lastCheckin.name} is safe as of ${formatDateTime(lastCheckin.created_at)}.${
        lastCheckin.message ? ` Message: ${lastCheckin.message}` : ''
      }${
        lastCheckin.lat && lastCheckin.lng
          ? ` Location: https://www.google.com/maps?q=${lastCheckin.lat},${lastCheckin.lng}`
          : ''
      }`
    : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const payload = {
        name: trimmed,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        message: message.trim()
      };
      const data = await api.createCheckin(payload);
      setLastCheckin(data.checkin);
      writeString(STORAGE_KEYS.checkInName, trimmed);
      setMessage('');
      pushToast('Check-in recorded', 'success');
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const data = await api.getCheckins(term);
      setResults(data.checkins ?? []);
    } catch (error) {
      setSearchError(error.message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      pushToast('Copied to the clipboard', 'success');
    } catch {
      pushToast('Copying is not available in this browser', 'error');
    }
  };

  const shareNatively = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Family check-in', text: shareText });
      } else {
        await copyShareText();
      }
    } catch {
      // A cancelled share sheet needs no feedback.
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">{t('checkin.title')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
          Record that you are safe so family members can confirm your status.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-3 p-4">
        <div>
          <label htmlFor="checkin-name" className="label">
            {t('checkin.yourName')}
          </label>
          <input
            id="checkin-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input"
            maxLength={120}
            required
          />
        </div>
        <div>
          <label htmlFor="checkin-message" className="label">
            {t('checkin.message')}
          </label>
          <textarea
            id="checkin-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Optional note, for example where you are sheltering."
            className="input py-2"
          />
        </div>
        <p className="text-xs text-navy-500 dark:text-navy-300">
          {position
            ? 'Your current position will be attached to the check-in.'
            : 'No position available, the check-in will be recorded without coordinates.'}
        </p>
        <button type="submit" disabled={submitting} className="btn-safe w-full">
          <HeartHandshake size={16} aria-hidden="true" />
          {submitting ? t('common.saving') : t('checkin.safe')}
        </button>
      </form>

      {lastCheckin && (
        <section className="card p-4" aria-label={t('checkin.shareText')}>
          <h2 className="text-sm font-bold">{t('checkin.shareText')}</h2>
          <p className="mt-2 rounded-xl bg-navy-50 p-3 text-xs leading-relaxed dark:bg-navy-900">
            {shareText}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={copyShareText} className="btn-secondary">
              <Copy size={15} aria-hidden="true" />
              {t('sos.copy')}
            </button>
            <button type="button" onClick={shareNatively} className="btn-secondary">
              <Share2 size={15} aria-hidden="true" />
              {t('sos.share')}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold">{t('checkin.lookup')}</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t('checkin.lookup')}</span>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input pl-9"
              placeholder="Enter a name"
            />
          </label>
          <button type="submit" disabled={searching} className="btn-primary shrink-0 px-5">
            {t('checkin.search')}
          </button>
        </form>

        {searchError && <ErrorState message={searchError} />}

        {searching ? (
          <div className="card p-4">
            <SkeletonText lines={3} />
          </div>
        ) : hasSearched && results.length === 0 && !searchError ? (
          <EmptyState icon={Search} title={t('checkin.empty')} />
        ) : results.length > 0 ? (
          <ul className="space-y-2">
            {results.map((item) => (
              <li key={item.id} className="card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    {item.message && (
                      <p className="mt-0.5 text-xs text-navy-600 dark:text-navy-300">
                        {item.message}
                      </p>
                    )}
                  </div>
                  <span className="badge shrink-0 bg-safe-600 text-white">Safe</span>
                </div>
                <p className="mt-1.5 text-[11px] text-navy-400">
                  {relativeTime(item.created_at)}
                  {item.lat && item.lng ? `, ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
