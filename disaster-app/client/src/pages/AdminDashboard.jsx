/**
 * Authority dashboard: live operational metrics, SOS triage, shelter and hazard
 * management, alert publishing and report moderation.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  FileText,
  Megaphone,
  QrCode,
  Radio,
  Siren,
  Users,
  Warehouse
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import MapView from '../components/MapView.jsx';
import ShelterQrCard from '../components/ShelterQrCard.jsx';
import { ChartSkeleton, KpiSkeleton, SkeletonText } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/LiveDataCards.jsx';
import { DISASTER_TYPES } from '../lib/constants.js';
import { relativeTime } from '../lib/time.js';

const SOS_STATUS_STYLES = {
  open: 'bg-danger-600 text-white',
  acknowledged: 'bg-warn-500 text-navy-900',
  resolved: 'bg-safe-600 text-white'
};

function KpiCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'bg-navy-100 text-navy-700 dark:bg-navy-700 dark:text-navy-100',
    danger: 'bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400',
    safe: 'bg-safe-100 text-safe-700 dark:bg-safe-700/20 dark:text-safe-400',
    warn: 'bg-warn-100 text-warn-700 dark:bg-warn-700/20 dark:text-warn-400'
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-300">
          {label}
        </p>
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-navy-400">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();

  const shelters = useStore((state) => state.shelters);
  const hazards = useStore((state) => state.hazards);
  const reports = useStore((state) => state.reports);
  const sosEvents = useStore((state) => state.sosEvents);
  const loadSosEvents = useStore((state) => state.loadSosEvents);
  const loadShelters = useStore((state) => state.loadShelters);
  const loadHazards = useStore((state) => state.loadHazards);
  const loadReports = useStore((state) => state.loadReports);
  const socketConnected = useStore((state) => state.socketConnected);
  const pushToast = useStore((state) => state.pushToast);

  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const [alertForm, setAlertForm] = useState({
    title: '',
    body: '',
    severity: 'warning',
    disaster_type: ''
  });
  const [simulateType, setSimulateType] = useState('flood');
  const [addMode, setAddMode] = useState(false);
  const [showQrCodes, setShowQrCodes] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await api.getAnalytics());
    } catch (error) {
      setSummaryError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadSosEvents();
  }, [loadSummary, loadSosEvents]);

  // Realtime events change the underlying counts, so refresh the aggregates.
  useEffect(() => {
    loadSummary();
  }, [sosEvents.length, reports.length, loadSummary]);

  const openSosCount = useMemo(
    () => sosEvents.filter((item) => item.status === 'open').length,
    [sosEvents]
  );

  const reportsByType = useMemo(
    () =>
      (summary?.reportsByType ?? []).map((row) => ({
        ...row,
        label: t(`reports.${row.type}`, { defaultValue: row.type })
      })),
    [summary, t]
  );

  const handleSosStatus = async (sos, status) => {
    setBusy(`sos-${sos.id}`);
    try {
      await api.updateSos(sos.id, status);
      loadSosEvents();
      loadSummary();
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleShelterUpdate = async (shelter, patch) => {
    setBusy(`shelter-${shelter.id}`);
    try {
      await api.updateShelter(shelter.id, patch);
      loadSummary();
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
      // Reload so the inline input reverts to the stored value.
      loadShelters();
    } finally {
      setBusy(null);
    }
  };

  const handleHazardToggle = async (hazard) => {
    setBusy(`hazard-${hazard.id}`);
    try {
      await api.updateHazard(hazard.id, { active: !hazard.active });
      loadHazards();
      loadSummary();
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleModerate = async (report, status) => {
    setBusy(`report-${report.id}`);
    try {
      await api.moderateReport(report.id, status);
      loadSummary();
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
      loadReports();
    } finally {
      setBusy(null);
    }
  };

  const handlePublishAlert = async (event) => {
    event.preventDefault();
    setBusy('alert');
    try {
      await api.createAlert({
        title: alertForm.title.trim(),
        body: alertForm.body.trim(),
        severity: alertForm.severity,
        disaster_type: alertForm.disaster_type || null
      });
      setAlertForm({
        title: '',
        body: '',
        severity: 'warning',
        disaster_type: ''
      });
      pushToast('Alert published to every connected client', 'success');
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleSimulate = async () => {
    setBusy('simulate');
    try {
      await api.simulateDisaster(simulateType);
      pushToast(`${t(`disaster.${simulateType}`)} scenario broadcast`, 'success');
      loadHazards();
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleMapClick = async (latlng) => {
    if (!addMode) return;
    const name = window.prompt('Shelter name');
    if (!name) return;
    const capacityRaw = window.prompt('Capacity', '200');
    const capacity = Number.parseInt(capacityRaw, 10);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      pushToast('A positive capacity is required', 'error');
      return;
    }

    setBusy('create-shelter');
    try {
      await api.createShelter({
        name: name.trim(),
        type: 'community_hall',
        lat: latlng.lat,
        lng: latlng.lng,
        address: '',
        capacity,
        occupied: 0,
        is_open: true,
        phone: '',
        facilities: ['water', 'toilets'],
        accessibility: false
      });
      pushToast('Shelter added and broadcast to all clients', 'success');
      setAddMode(false);
      loadSummary();
    } catch (error) {
      pushToast(error.message || t('common.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const pendingReports = reports.filter((report) => report.status === 'unverified');

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('admin.title')}</h1>
          <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
            Operational overview with live updates pushed over the realtime channel.
          </p>
          <Link to="/admin/report" className="btn-secondary mt-2 px-4">
            <FileText size={15} aria-hidden="true" />
            {t('admin.exportReport')}
          </Link>
        </div>
        <span
          className={`chip ${
            socketConnected
              ? 'bg-safe-100 text-safe-700 dark:bg-safe-700/20 dark:text-safe-400'
              : 'bg-danger-100 text-danger-700 dark:bg-danger-700/20 dark:text-danger-400'
          }`}
        >
          <Radio size={13} aria-hidden="true" />
          {socketConnected ? t('admin.connected') : t('status.disconnected')}
          {summary?.realtime?.connectedClients !== undefined &&
            `, ${summary.realtime.connectedClients} ${t('admin.clients')}`}
        </span>
      </header>

      {summaryError && <ErrorState message={summaryError} onRetry={loadSummary} />}

      {/* KPI grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryLoading && !summary ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              icon={Siren}
              label={t('admin.openSos')}
              value={summary?.sosByStatus?.open ?? openSosCount}
              hint={`${summary?.sosByStatus?.acknowledged ?? 0} acknowledged, ${
                summary?.sosByStatus?.resolved ?? 0
              } resolved`}
              tone="danger"
            />
            <KpiCard
              icon={Warehouse}
              label={t('admin.sheltersOpen')}
              value={`${summary?.totals?.sheltersOpen ?? 0} / ${summary?.totals?.shelters ?? 0}`}
              hint={`${summary?.totals?.totalFree ?? 0} places free`}
              tone="safe"
            />
            <KpiCard
              icon={Users}
              label={t('admin.occupancy')}
              value={`${summary?.totals?.occupancyPercent ?? 0}%`}
              hint={`${summary?.totals?.totalOccupied ?? 0} of ${
                summary?.totals?.totalCapacity ?? 0
              } places used`}
              tone="warn"
            />
            <KpiCard
              icon={AlertTriangle}
              label={t('admin.activeReports')}
              value={summary?.reportsByStatus?.unverified ?? pendingReports.length}
              hint={`${summary?.totals?.activeHazards ?? 0} hazard zones active`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-3 xl:grid-cols-2">
        {summaryLoading && !summary ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold">{t('admin.sosOverTime')}</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary?.sosPerHour ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,166,202,0.25)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                    <ChartTooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={false}
                      name="SOS"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold">{t('admin.reportsByType')}</h2>
              <div className="h-56">
                {reportsByType.length === 0 ? (
                  <p className="pt-8 text-center text-xs text-navy-500 dark:text-navy-300">
                    {t('reports.empty')}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportsByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,166,202,0.25)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-18}
                        dy={8}
                        height={48}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                      <ChartTooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Reports" fill="#2563EB" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('admin.occupancyPerShelter')}</h2>
        <div className="h-64">
          {summary?.occupancyPerShelter?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.occupancyPerShelter} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,166,202,0.25)" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 9 }}
                  tickFormatter={(value) =>
                    value.length > 22 ? `${value.slice(0, 22)}...` : value
                  }
                />
                <ChartTooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="occupancyPercent" radius={[0, 4, 4, 0]} name="Occupancy">
                  {summary.occupancyPerShelter.map((row) => (
                    <Cell
                      key={row.id}
                      fill={
                        row.occupancyPercent >= 90
                          ? '#DC2626'
                          : row.occupancyPercent >= 70
                            ? '#F59E0B'
                            : '#10B981'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SkeletonText lines={6} />
          )}
        </div>
      </section>

      {/* Live SOS table */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-navy-100 p-4 dark:border-navy-700">
          <h2 className="text-sm font-bold">{t('admin.liveSos')}</h2>
          <span className="badge bg-danger-600 text-white">{openSosCount} open</span>
        </header>
        {sosEvents.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Siren} title="No SOS requests have been received." />
          </div>
        ) : (
          <div className="scroll-area max-h-80 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-navy-50 text-[11px] uppercase tracking-wide text-navy-500 dark:bg-navy-900 dark:text-navy-300">
                <tr>
                  <th className="p-2.5 font-semibold">Reference</th>
                  <th className="p-2.5 font-semibold">Location</th>
                  <th className="p-2.5 font-semibold">Received</th>
                  <th className="p-2.5 font-semibold">Status</th>
                  <th className="p-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sosEvents.map((sos) => (
                  <tr key={sos.id} className="border-t border-navy-100 dark:border-navy-700">
                    <td className="p-2.5 font-mono">{sos.reference ?? sos.id}</td>
                    <td className="p-2.5">
                      <a
                        href={`https://www.google.com/maps?q=${sos.lat},${sos.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono underline"
                      >
                        {sos.lat.toFixed(4)}, {sos.lng.toFixed(4)}
                      </a>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">{relativeTime(sos.created_at)}</td>
                    <td className="p-2.5">
                      <span className={`badge ${SOS_STATUS_STYLES[sos.status]}`}>{sos.status}</span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex gap-1.5">
                        {sos.status === 'open' && (
                          <button
                            type="button"
                            disabled={busy === `sos-${sos.id}`}
                            onClick={() => handleSosStatus(sos, 'acknowledged')}
                            className="btn-secondary min-h-[36px] px-2.5 text-[11px]"
                          >
                            <BellRing size={12} aria-hidden="true" />
                            {t('admin.acknowledge')}
                          </button>
                        )}
                        {sos.status !== 'resolved' && (
                          <button
                            type="button"
                            disabled={busy === `sos-${sos.id}`}
                            onClick={() => handleSosStatus(sos, 'resolved')}
                            className="btn-safe min-h-[36px] px-2.5 text-[11px]"
                          >
                            <CheckCheck size={12} aria-hidden="true" />
                            {t('admin.resolve')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Shelter management */}
      <section className="card overflow-hidden">
        <header className="border-b border-navy-100 p-4 dark:border-navy-700">
          <h2 className="text-sm font-bold">{t('admin.shelterManagement')}</h2>
          <p className="mt-0.5 text-[11px] text-navy-400">
            Changes are broadcast immediately to every connected client.
          </p>
        </header>
        <div className="scroll-area max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-navy-50 text-[11px] uppercase tracking-wide text-navy-500 dark:bg-navy-900 dark:text-navy-300">
              <tr>
                <th className="p-2.5 font-semibold">Shelter</th>
                <th className="p-2.5 font-semibold">Occupied</th>
                <th className="p-2.5 font-semibold">Capacity</th>
                <th className="p-2.5 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((shelter) => (
                <tr key={shelter.id} className="border-t border-navy-100 dark:border-navy-700">
                  <td className="max-w-[220px] p-2.5">
                    <span className="block truncate font-semibold">{shelter.name}</span>
                    <span className="text-[11px] text-navy-400">
                      {t('shelters.updated')} {relativeTime(shelter.updated_at)}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <label className="sr-only" htmlFor={`occupied-${shelter.id}`}>
                      Occupied places at {shelter.name}
                    </label>
                    <input
                      id={`occupied-${shelter.id}`}
                      type="number"
                      min={0}
                      max={shelter.capacity}
                      defaultValue={shelter.occupied}
                      disabled={busy === `shelter-${shelter.id}`}
                      onBlur={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        if (!Number.isFinite(value) || value === shelter.occupied) return;
                        handleShelterUpdate(shelter, {
                          occupied: Math.min(Math.max(0, value), shelter.capacity)
                        });
                      }}
                      className="min-h-[40px] w-20 rounded-lg border border-navy-200 bg-white px-2 dark:border-navy-600 dark:bg-navy-900"
                    />
                  </td>
                  <td className="p-2.5 font-mono">{shelter.capacity}</td>
                  <td className="p-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={shelter.is_open}
                      disabled={busy === `shelter-${shelter.id}`}
                      onClick={() =>
                        handleShelterUpdate(shelter, {
                          is_open: !shelter.is_open
                        })
                      }
                      aria-label={`Toggle ${shelter.name}`}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                        shelter.is_open ? 'bg-safe-500' : 'bg-navy-300 dark:bg-navy-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                          shelter.is_open ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Click-map-to-add shelter */}
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 p-4 dark:border-navy-700">
          <h2 className="text-sm font-bold">{t('admin.addByMap')}</h2>
          <button
            type="button"
            onClick={() => setAddMode((value) => !value)}
            aria-pressed={addMode}
            className={addMode ? 'btn-danger px-4' : 'btn-secondary px-4'}
          >
            {addMode ? 'Cancel placement' : 'Start placement'}
          </button>
        </header>
        <div className="h-72">
          <MapView
            shelters={shelters}
            hazards={hazards.filter((hazard) => hazard.active)}
            onMapClick={handleMapClick}
            resizeKey={addMode ? 'add' : 'idle'}
          />
        </div>
        {addMode && (
          <p className="border-t border-navy-100 p-3 text-xs text-navy-500 dark:border-navy-700 dark:text-navy-300">
            Click any point on the map to place a new shelter.
          </p>
        )}
      </section>

      {/* Arrival QR codes */}
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 p-4 dark:border-navy-700">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <QrCode size={15} aria-hidden="true" />
              {t('qr.adminTitle')}
            </h2>
            <p className="mt-0.5 text-[11px] text-navy-400">{t('qr.adminHint')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowQrCodes((value) => !value)}
            aria-pressed={showQrCodes}
            className="btn-secondary px-4"
          >
            {showQrCodes ? t('qr.hideCodes') : t('qr.showCodes')}
          </button>
        </header>
        {showQrCodes && (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {shelters.map((shelter) => (
              <ShelterQrCard key={shelter.id} shelter={shelter} />
            ))}
          </div>
        )}
      </section>

      {/* Hazard zones and alert composer */}
      <div className="grid gap-3 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="border-b border-navy-100 p-4 dark:border-navy-700">
            <h2 className="text-sm font-bold">{t('admin.hazardZones')}</h2>
          </header>
          <ul className="scroll-area max-h-72 divide-y divide-navy-100 overflow-auto dark:divide-navy-700">
            {hazards.map((hazard) => (
              <li key={hazard.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{hazard.name}</p>
                  <p className="text-[11px] text-navy-400">
                    {t(`disaster.${hazard.disaster_type}`, {
                      defaultValue: hazard.disaster_type
                    })}
                    , severity {hazard.severity}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hazard.active}
                  disabled={busy === `hazard-${hazard.id}`}
                  onClick={() => handleHazardToggle(hazard)}
                  aria-label={`Toggle ${hazard.name}`}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    hazard.active ? 'bg-danger-600' : 'bg-navy-300 dark:bg-navy-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      hazard.active ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-bold">{t('admin.composeAlert')}</h2>
          <form onSubmit={handlePublishAlert} className="mt-3 space-y-3">
            <div>
              <label htmlFor="alert-title" className="label">
                Title
              </label>
              <input
                id="alert-title"
                value={alertForm.title}
                onChange={(event) => setAlertForm({ ...alertForm, title: event.target.value })}
                className="input"
                minLength={3}
                maxLength={140}
                required
              />
            </div>
            <div>
              <label htmlFor="alert-body" className="label">
                Message
              </label>
              <textarea
                id="alert-body"
                value={alertForm.body}
                onChange={(event) => setAlertForm({ ...alertForm, body: event.target.value })}
                rows={3}
                className="input py-2"
                minLength={3}
                maxLength={1000}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="alert-severity" className="label">
                  Severity
                </label>
                <select
                  id="alert-severity"
                  value={alertForm.severity}
                  onChange={(event) => setAlertForm({ ...alertForm, severity: event.target.value })}
                  className="input"
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label htmlFor="alert-disaster" className="label">
                  Disaster
                </label>
                <select
                  id="alert-disaster"
                  value={alertForm.disaster_type}
                  onChange={(event) =>
                    setAlertForm({
                      ...alertForm,
                      disaster_type: event.target.value
                    })
                  }
                  className="input"
                >
                  <option value="">{t('common.none')}</option>
                  {DISASTER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`disaster.${type}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={busy === 'alert'} className="btn-primary w-full">
              <Megaphone size={16} aria-hidden="true" />
              {busy === 'alert' ? t('common.saving') : t('admin.composeAlert')}
            </button>
          </form>

          <div className="mt-4 border-t border-navy-100 pt-4 dark:border-navy-700">
            <h3 className="text-sm font-bold">{t('admin.simulate')}</h3>
            <p className="mt-1 text-[11px] text-navy-400">
              Publishes a critical alert, activates the matching hazard zones and raises the alarm
              on every connected client.
            </p>
            <div className="mt-2 flex gap-2">
              <select
                value={simulateType}
                onChange={(event) => setSimulateType(event.target.value)}
                className="input"
                aria-label="Disaster to simulate"
              >
                {DISASTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`disaster.${type}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSimulate}
                disabled={busy === 'simulate'}
                className="btn-danger shrink-0 px-4"
              >
                <Siren size={16} aria-hidden="true" />
                {t('admin.simulate')}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Report moderation */}
      <section className="card overflow-hidden">
        <header className="border-b border-navy-100 p-4 dark:border-navy-700">
          <h2 className="text-sm font-bold">{t('admin.moderation')}</h2>
          <p className="mt-0.5 text-[11px] text-navy-400">
            {pendingReports.length} reports awaiting review.
          </p>
        </header>
        {pendingReports.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={CheckCheck} title="Every report has been reviewed." />
          </div>
        ) : (
          <ul className="divide-y divide-navy-100 dark:divide-navy-700">
            {pendingReports.map((report) => (
              <li key={report.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[180px] flex-1">
                  <p className="text-xs font-semibold">{t(`reports.${report.type}`)}</p>
                  {report.description && (
                    <p className="mt-0.5 text-[11px] text-navy-500 dark:text-navy-300">
                      {report.description}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-navy-400">
                    {relativeTime(report.created_at)}, net votes {report.upvotes - report.downvotes}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === `report-${report.id}`}
                    onClick={() => handleModerate(report, 'verified')}
                    className="btn-safe min-h-[40px] px-3 text-xs"
                  >
                    {t('reports.verified')}
                  </button>
                  <button
                    type="button"
                    disabled={busy === `report-${report.id}`}
                    onClick={() => handleModerate(report, 'rejected')}
                    className="btn-secondary min-h-[40px] px-3 text-xs"
                  >
                    {t('reports.rejected')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
