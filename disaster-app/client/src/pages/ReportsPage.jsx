import { useMemo, useState } from 'react';
import { Flag, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import { EmptyState, ErrorState } from '../components/LiveDataCards.jsx';
import { SkeletonText } from '../components/Skeleton.jsx';
import { REPORT_TYPES, CHENNAI } from '../lib/constants.js';
import { relativeTime } from '../lib/time.js';

const STATUS_STYLES = {
  verified: 'bg-safe-600 text-white',
  unverified: 'bg-warn-500 text-navy-900',
  rejected: 'bg-navy-400 text-white'
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const reports = useStore((state) => state.reports);
  const loading = useStore((state) => state.loading.reports);
  const error = useStore((state) => state.errors.reports);
  const loadReports = useStore((state) => state.loadReports);
  const position = useStore((state) => state.position);
  const pushToast = useStore((state) => state.pushToast);

  const [type, setType] = useState(REPORT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const visible = useMemo(() => {
    if (statusFilter === 'all') return reports;
    return reports.filter((report) => report.status === statusFilter);
  }, [reports, statusFilter]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const coords = position ?? CHENNAI;
    setSubmitting(true);
    try {
      await api.createReport({
        type,
        lat: coords.lat,
        lng: coords.lng,
        description: description.trim()
      });
      setDescription('');
      pushToast('Report submitted', 'success');
      // The socket event adds the row, but refresh keeps a disconnected
      // client consistent as well.
      loadReports();
    } catch (submitError) {
      pushToast(submitError.message || t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (report, direction) => {
    setVoting(`${report.id}-${direction}`);
    try {
      await api.voteReport(report.id, direction);
    } catch (voteError) {
      pushToast(voteError.message || t('common.error'), 'error');
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{t('reports.title')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
          Reports confirmed by three or more people are promoted to verified automatically.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-3 p-4">
        <div>
          <label htmlFor="report-type" className="label">
            {t('reports.type')}
          </label>
          <select
            id="report-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="input"
          >
            {REPORT_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`reports.${item}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="report-description" className="label">
            {t('reports.description')}
          </label>
          <textarea
            id="report-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Describe what you can see, including a landmark if possible."
            className="input py-2"
          />
        </div>

        <p className="text-xs text-navy-500 dark:text-navy-300">
          {position
            ? `Using your current position, accurate to about ${Math.round(position.accuracy ?? 0)} m.`
            : 'No position available, the report will use the Chennai reference point.'}
        </p>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <Flag size={16} aria-hidden="true" />
          {submitting ? t('common.saving') : t('reports.submit')}
        </button>
      </form>

      <div className="scroll-area flex gap-2 overflow-x-auto pb-1" role="group">
        {['all', 'verified', 'unverified', 'rejected'].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={statusFilter === item}
            onClick={() => setStatusFilter(item)}
            className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${
              statusFilter === item
                ? 'border-navy-900 bg-navy-900 text-white dark:border-blue-500 dark:bg-blue-600'
                : 'border-navy-200 bg-white text-navy-700 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100'
            }`}
          >
            {item === 'all' ? 'All' : t(`reports.${item}`)}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={loadReports} />}

      {loading && reports.length === 0 ? (
        <div className="card p-4">
          <SkeletonText lines={5} />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Flag} title={t('reports.empty')} />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((report) => (
            <li key={report.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">{t(`reports.${report.type}`)}</h2>
                  {report.description && (
                    <p className="mt-1 text-xs leading-snug text-navy-600 dark:text-navy-300">
                      {report.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-navy-400">
                    {relativeTime(report.created_at)}, {report.lat.toFixed(4)},{' '}
                    {report.lng.toFixed(4)}
                  </p>
                </div>
                <span className={`badge shrink-0 ${STATUS_STYLES[report.status]}`}>
                  {t(`reports.${report.status}`)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVote(report, 'up')}
                  disabled={voting === `${report.id}-up`}
                  className="btn-secondary min-h-[40px] flex-1 px-3 text-xs"
                >
                  <ThumbsUp size={14} aria-hidden="true" />
                  {t('reports.helpful')} ({report.upvotes})
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(report, 'down')}
                  disabled={voting === `${report.id}-down`}
                  className="btn-secondary min-h-[40px] flex-1 px-3 text-xs"
                >
                  <ThumbsDown size={14} aria-hidden="true" />
                  {t('reports.notHelpful')} ({report.downvotes})
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
