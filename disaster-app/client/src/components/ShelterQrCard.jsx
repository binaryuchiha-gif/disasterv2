/**
 * Printable arrival QR for a shelter.
 *
 * The code encodes an absolute URL to /checkin/:id on this deployment, so a
 * phone camera opens the check-in page directly and one scan records one
 * arrival.
 */
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function buildCheckInUrl(shelterId) {
  if (typeof window === 'undefined') return `/checkin/${shelterId}`;
  return `${window.location.origin}/checkin/${shelterId}`;
}

export default function ShelterQrCard({ shelter, size = 132, showPrint = false }) {
  const { t } = useTranslation();
  const url = buildCheckInUrl(shelter.id);
  const free = Math.max(0, (shelter.capacity ?? 0) - (shelter.occupied ?? 0));

  return (
    <article className="card qr-card flex gap-3 p-3">
      <div className="shrink-0 rounded-lg bg-white p-2">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          marginSize={0}
          title={`${t('qr.title')}: ${shelter.name}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold leading-snug">{shelter.name}</h3>
        <p className="mt-0.5 text-[11px] text-navy-500 dark:text-navy-300">
          {shelter.address || t('qr.noAddress')}
        </p>
        <p className="mt-1.5 text-[11px] text-navy-500 dark:text-navy-300">
          {t('qr.capacityLine', {
            free,
            capacity: shelter.capacity ?? 0
          })}
        </p>
        <p className="mt-1.5 break-all font-mono text-[10px] text-navy-400">{url}</p>
        <p className="mt-1.5 text-[11px] leading-snug text-navy-600 dark:text-navy-300">
          {t('qr.instruction')}
        </p>
        {showPrint && (
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary mt-2 min-h-[36px] px-3 text-xs print:hidden"
          >
            <Printer size={13} aria-hidden="true" />
            {t('report.print')}
          </button>
        )}
      </div>
    </article>
  );
}
