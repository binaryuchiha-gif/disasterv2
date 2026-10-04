/**
 * Arrival check-in reached by scanning a shelter QR code.
 *
 * The scan does not record anything on its own: the person confirms the party
 * size first, which avoids accidental increments from a camera preview and
 * lets a family check in together.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, MapPin, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import { ErrorState } from '../components/LiveDataCards.jsx';
import { SkeletonText } from '../components/Skeleton.jsx';
import { relativeTime } from '../lib/time.js';

export default function QrCheckInPage() {
  const { t } = useTranslation();
  const { shelterId } = useParams();

  const shelters = useStore((state) => state.shelters);
  const loadShelters = useStore((state) => state.loadShelters);
  const loading = useStore((state) => state.loading.shelters);
  const pushToast = useStore((state) => state.pushToast);

  const [people, setPeople] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const id = Number.parseInt(shelterId, 10);
  const shelter = useMemo(() => shelters.find((item) => item.id === id) ?? null, [shelters, id]);

  useEffect(() => {
    if (shelters.length === 0) loadShelters();
  }, [shelters.length, loadShelters]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.recordArrival(id, people);
      setResult(data);
      pushToast(t('qr.recorded'), 'success');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!Number.isFinite(id)) {
    return <ErrorState message={t('qr.badLink')} />;
  }

  if (loading && !shelter) {
    return (
      <div className="card p-5">
        <SkeletonText lines={4} />
      </div>
    );
  }

  const target = result?.shelter ?? shelter;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link
        to="/"
        className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-navy-600 hover:underline dark:text-navy-200"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {t('qr.backToMap')}
      </Link>

      <header>
        <h1 className="text-xl font-bold">{t('qr.pageTitle')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">{t('qr.pageSubtitle')}</p>
      </header>

      {!target ? (
        <ErrorState message={t('qr.notFound')} onRetry={loadShelters} />
      ) : (
        <>
          <section className="card p-4">
            <h2 className="text-base font-bold">{target.name}</h2>
            {target.address && (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-navy-500 dark:text-navy-300">
                <MapPin size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
                {target.address}
              </p>
            )}
            <p className="mt-2 text-xs text-navy-500 dark:text-navy-300">
              {t('qr.capacityLine', {
                free: Math.max(0, target.capacity - target.occupied),
                capacity: target.capacity
              })}
            </p>
            <p className="mt-1 text-[11px] text-navy-400">
              {t('shelters.updated')} {relativeTime(target.updated_at)}
            </p>
          </section>

          {result ? (
            <motion.section
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="card border-safe-200 bg-safe-50 p-5 text-center dark:border-safe-700/40 dark:bg-safe-700/10"
            >
              <CheckCircle2
                size={34}
                aria-hidden="true"
                className="mx-auto text-safe-600 dark:text-safe-400"
              />
              <h2 className="mt-2 text-base font-bold text-safe-700 dark:text-safe-400">
                {t('qr.recorded')}
              </h2>
              <p className="mt-1 text-sm text-navy-600 dark:text-navy-200">
                {t('qr.recordedDetail', { people: result.recorded, name: result.shelter.name })}
              </p>
              <Link to="/" className="btn-primary mt-4 w-full">
                {t('qr.backToMap')}
              </Link>
            </motion.section>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-3 p-4">
              <div>
                <label htmlFor="qr-people" className="label">
                  {t('qr.partySize')}
                </label>
                <input
                  id="qr-people"
                  type="number"
                  min={1}
                  max={50}
                  value={people}
                  onChange={(event) => setPeople(Number(event.target.value))}
                  className="input"
                  required
                />
              </div>

              {error && <ErrorState message={error} />}

              <button type="submit" disabled={submitting} className="btn-safe w-full">
                <Users size={16} aria-hidden="true" />
                {submitting ? t('common.saving') : t('qr.confirm')}
              </button>
              <p className="text-[11px] leading-snug text-navy-500 dark:text-navy-300">
                {t('qr.disclaimer')}
              </p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
