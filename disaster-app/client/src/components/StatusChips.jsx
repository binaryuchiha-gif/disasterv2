import { useTranslation } from 'react-i18next';
import { Radio, Satellite, Wifi, WifiOff } from 'lucide-react';
import useStore from '../store.js';

/** Connection, realtime and GPS status indicators shown in the header. */
export default function StatusChips({ compact = false }) {
  const { t } = useTranslation();
  const online = useStore((state) => state.online);
  const socketConnected = useStore((state) => state.socketConnected);
  const gpsStatus = useStore((state) => state.gpsStatus);
  const position = useStore((state) => state.position);

  const gps = (() => {
    if (gpsStatus === 'active') {
      const accuracy = position?.accuracy ? Math.round(position.accuracy) : null;
      return {
        label: accuracy ? `${t('status.gpsActive')} (${accuracy} m)` : t('status.gpsActive'),
        className: 'bg-safe-500/20 text-safe-700 dark:text-safe-400'
      };
    }
    if (gpsStatus === 'denied') {
      return {
        label: t('status.gpsDenied'),
        className: 'bg-danger-500/20 text-danger-700 dark:text-danger-400'
      };
    }
    if (gpsStatus === 'demo') {
      return {
        label: t('status.gpsDemo'),
        className: 'bg-warn-500/20 text-warn-700 dark:text-warn-400'
      };
    }
    if (gpsStatus === 'searching') {
      return { label: t('status.gpsSearching'), className: 'bg-white/10 text-white/80' };
    }
    return null;
  })();

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`chip ${
          online
            ? 'bg-safe-500/20 text-safe-700 dark:text-safe-400'
            : 'bg-danger-500/20 text-danger-700 dark:text-danger-400'
        }`}
        title={online ? t('status.online') : t('status.offline')}
      >
        {online ? <Wifi size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
        {!compact && <span>{online ? t('status.online') : t('status.offline')}</span>}
      </span>

      <span
        className={`chip ${
          socketConnected
            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
            : 'bg-white/10 text-white/70'
        }`}
        title={socketConnected ? t('status.live') : t('status.disconnected')}
      >
        <Radio size={13} aria-hidden="true" />
        {!compact && <span>{socketConnected ? t('status.live') : t('status.disconnected')}</span>}
      </span>

      {gps && (
        <span className={`chip ${gps.className}`} title={gps.label}>
          <Satellite size={13} aria-hidden="true" />
          {!compact && <span>{gps.label}</span>}
        </span>
      )}
    </div>
  );
}
