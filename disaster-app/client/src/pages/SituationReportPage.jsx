/**
 * Printable situation report.
 *
 * Laid out for A4 with a dedicated print stylesheet in index.css, so the
 * browser print dialog produces a clean handout with no interface chrome.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import { ErrorState } from '../components/LiveDataCards.jsx';
import { SkeletonText } from '../components/Skeleton.jsx';
import { availability } from '../lib/ranking.js';
import { formatDateTime, relativeTime } from '../lib/time.js';

function Section({ title, children }) {
  return (
    <section className="report-section">
      <h2 className="mb-2 border-b border-navy-200 pb-1 text-sm font-bold uppercase tracking-wide dark:border-navy-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SituationReportPage() {
  const { t } = useTranslation();

  const shelters = useStore((state) => state.shelters);
  const hazards = useStore((state) => state.hazards);
  const reports = useStore((state) => state.reports);
  const alerts = useStore((state) => state.alerts);
  const sosEvents = useStore((state) => state.sosEvents);
  const loadSosEvents = useStore((state) => state.loadSosEvents);

  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getAnalytics());
      await loadSosEvents();
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [loadSosEvents]);

  useEffect(() => {
    load();
  }, [load]);

  const activeHazards = hazards.filter((hazard) => hazard.active);
  const openSos = sosEvents.filter((item) => item.status !== 'resolved');
  const pendingReports = reports.filter((item) => item.status !== 'rejected');
  const generatedAt = new Date();

  return (
    <div className="report-page mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          to="/admin"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-navy-600 hover:underline dark:text-navy-200"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {t('report.backToDashboard')}
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn-secondary px-4">
            <RefreshCw size={15} aria-hidden="true" />
            {t('common.retry')}
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary px-4">
            <Printer size={15} aria-hidden="true" />
            {t('report.print')}
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      <header className="report-header">
        <h1 className="text-2xl font-extrabold">{t('report.title')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
          {t('report.generated')}: {formatDateTime(generatedAt)}
        </p>
        <p className="text-xs text-navy-400">{t('report.scope')}</p>
      </header>

      {loading && !summary ? (
        <div className="card p-5">
          <SkeletonText lines={8} />
        </div>
      ) : (
        <>
          <Section title={t('report.overview')}>
            <table className="report-table">
              <tbody>
                <tr>
                  <th>{t('admin.sheltersOpen')}</th>
                  <td>
                    {summary?.totals?.sheltersOpen ?? 0} / {summary?.totals?.shelters ?? 0}
                  </td>
                  <th>{t('admin.occupancy')}</th>
                  <td>{summary?.totals?.occupancyPercent ?? 0}%</td>
                </tr>
                <tr>
                  <th>{t('report.totalCapacity')}</th>
                  <td>{summary?.totals?.totalCapacity ?? 0}</td>
                  <th>{t('report.placesFree')}</th>
                  <td>{summary?.totals?.totalFree ?? 0}</td>
                </tr>
                <tr>
                  <th>{t('admin.openSos')}</th>
                  <td>{summary?.sosByStatus?.open ?? 0}</td>
                  <th>{t('report.sosResolved')}</th>
                  <td>{summary?.sosByStatus?.resolved ?? 0}</td>
                </tr>
                <tr>
                  <th>{t('report.activeHazards')}</th>
                  <td>{activeHazards.length}</td>
                  <th>{t('admin.activeReports')}</th>
                  <td>{summary?.reportsByStatus?.unverified ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title={t('report.shelterStatus')}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('report.shelter')}</th>
                  <th>{t('shelters.capacity')}</th>
                  <th>{t('report.occupied')}</th>
                  <th>{t('report.free')}</th>
                  <th>{t('report.status')}</th>
                  <th>{t('shelters.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {shelters.map((shelter) => {
                  const state = availability(shelter);
                  return (
                    <tr key={shelter.id}>
                      <td>{shelter.name}</td>
                      <td>{shelter.capacity}</td>
                      <td>{shelter.occupied}</td>
                      <td>{Math.max(0, shelter.capacity - shelter.occupied)}</td>
                      <td>{t(`shelters.${state === 'available' ? 'available' : state}`)}</td>
                      <td>{relativeTime(shelter.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>

          <Section title={t('report.activeHazards')}>
            {activeHazards.length === 0 ? (
              <p className="text-xs text-navy-500">{t('report.none')}</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('report.zone')}</th>
                    <th>{t('reports.type')}</th>
                    <th>{t('report.severity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeHazards.map((hazard) => (
                    <tr key={hazard.id}>
                      <td>{hazard.name}</td>
                      <td>
                        {t(`disaster.${hazard.disaster_type}`, {
                          defaultValue: hazard.disaster_type
                        })}
                      </td>
                      <td>{hazard.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={t('report.outstandingSos')}>
            {openSos.length === 0 ? (
              <p className="text-xs text-navy-500">{t('report.none')}</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('sos.reference')}</th>
                    <th>{t('report.location')}</th>
                    <th>{t('report.status')}</th>
                    <th>{t('report.received')}</th>
                  </tr>
                </thead>
                <tbody>
                  {openSos.map((sos) => (
                    <tr key={sos.id}>
                      <td>{sos.reference ?? sos.id}</td>
                      <td>
                        {sos.lat.toFixed(4)}, {sos.lng.toFixed(4)}
                      </td>
                      <td>{sos.status}</td>
                      <td>{relativeTime(sos.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={t('report.communityReports')}>
            {pendingReports.length === 0 ? (
              <p className="text-xs text-navy-500">{t('report.none')}</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('reports.type')}</th>
                    <th>{t('report.location')}</th>
                    <th>{t('report.status')}</th>
                    <th>{t('report.votes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReports.slice(0, 40).map((report) => (
                    <tr key={report.id}>
                      <td>{t(`reports.${report.type}`, { defaultValue: report.type })}</td>
                      <td>
                        {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                      </td>
                      <td>{t(`reports.${report.status}`, { defaultValue: report.status })}</td>
                      <td>{report.upvotes - report.downvotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={t('alerts.history')}>
            {alerts.length === 0 ? (
              <p className="text-xs text-navy-500">{t('alerts.none')}</p>
            ) : (
              <ul className="space-y-1.5">
                {alerts.slice(0, 10).map((alert) => (
                  <li key={alert.id} className="text-xs">
                    <span className="font-semibold">[{alert.severity}]</span> {alert.title}
                    <span className="text-navy-400"> - {relativeTime(alert.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <footer className="report-footer text-[11px] text-navy-400">{t('report.footer')}</footer>
        </>
      )}
    </div>
  );
}
