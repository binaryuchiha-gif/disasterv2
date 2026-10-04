/**
 * Press-and-hold SOS control.
 *
 * A two second hold avoids accidental activation. The ring is an SVG circle
 * whose stroke offset is driven by requestAnimationFrame. When the device is
 * offline the request is queued in localStorage and flushed on reconnect.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, MessageCircle, MessageSquare, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import { Modal } from './BottomSheet.jsx';
import { CHENNAI } from '../lib/constants.js';
import { vibrate } from '../lib/alarm.js';

const HOLD_DURATION_MS = 2000;
const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SosButton() {
  const { t } = useTranslation();
  const position = useStore((state) => state.position);
  const online = useStore((state) => state.online);
  const queueSos = useStore((state) => state.queueSos);
  const pushToast = useStore((state) => state.pushToast);

  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const frameRef = useRef(null);
  const startRef = useRef(null);
  const firedRef = useRef(false);

  const cancelHold = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    startRef.current = null;
    setProgress(0);
  }, []);

  // Release any pending animation frame if the component unmounts mid-hold.
  useEffect(() => cancelHold, [cancelHold]);

  const submit = useCallback(async () => {
    const coords = position ?? { lat: CHENNAI.lat, lng: CHENNAI.lng };
    const payload = {
      name: '',
      phone: '',
      lat: coords.lat,
      lng: coords.lng,
      message: 'Emergency assistance requested from the mobile application.'
    };

    const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    vibrate([200, 100, 200]);

    if (!online) {
      queueSos(payload);
      setResult({ queued: true, coords, mapsUrl, reference: null });
      pushToast(t('sos.queued'), 'info', 6000);
      return;
    }

    setSending(true);
    try {
      const data = await api.createSos(payload);
      setResult({
        queued: false,
        coords,
        mapsUrl,
        reference: data?.sos?.reference ?? null
      });
      pushToast(t('sos.sent'), 'success');
    } catch (error) {
      // Preserve the request locally so it is not lost on a transient failure.
      queueSos(payload);
      setResult({ queued: true, coords, mapsUrl, reference: null });
      pushToast(error.message || t('common.error'), 'error', 6000);
    } finally {
      setSending(false);
    }
  }, [online, position, pushToast, queueSos, t]);

  const beginHold = useCallback(
    (event) => {
      event.preventDefault();
      if (sending) return;
      firedRef.current = false;
      startRef.current = performance.now();

      const tick = (now) => {
        if (startRef.current === null) return;
        const elapsed = now - startRef.current;
        const ratio = Math.min(1, elapsed / HOLD_DURATION_MS);
        setProgress(ratio);

        if (ratio >= 1) {
          if (!firedRef.current) {
            firedRef.current = true;
            cancelHold();
            submit();
          }
          return;
        }
        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [cancelHold, sending, submit]
  );

  const shareText = result
    ? `Emergency assistance needed. My location: ${result.mapsUrl}${
        result.reference ? ` (reference ${result.reference})` : ''
      }`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      pushToast('Copied to the clipboard', 'success');
    } catch {
      pushToast('Copying is not available in this browser', 'error');
    }
  };

  const webShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Emergency', text: shareText });
      } else {
        await copyToClipboard();
      }
    } catch {
      // A cancelled share dialog is not an error worth reporting.
    }
  };

  return (
    <>
      <button
        type="button"
        onPointerDown={beginHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
        disabled={sending}
        aria-label={`${t('sos.button')}, ${t('sos.hold')}`}
        title={t('sos.hold')}
        className="relative flex h-[76px] w-[76px] touch-none select-none items-center justify-center rounded-full bg-danger-600 text-white shadow-[0_6px_22px_rgba(220,38,38,0.5)] transition-transform active:scale-95 disabled:opacity-70"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="5"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-base font-extrabold tracking-wide">
          {sending ? t('sos.sending') : t('sos.button')}
        </span>
      </button>

      <Modal
        open={Boolean(result)}
        onClose={() => setResult(null)}
        title={result?.queued ? t('sos.button') : t('sos.sent')}
      >
        {result && (
          <div className="space-y-4">
            {result.queued && (
              <p className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700 dark:bg-warn-500/10 dark:text-warn-400">
                {t('sos.queued')}
              </p>
            )}

            {result.reference && (
              <div>
                <p className="label">{t('sos.reference')}</p>
                <p className="font-mono text-lg font-bold">{result.reference}</p>
              </div>
            )}

            <div>
              <p className="label">Coordinates</p>
              <p className="font-mono text-sm">
                {result.coords.lat.toFixed(5)}, {result.coords.lng.toFixed(5)}
              </p>
            </div>

            <a
              href={result.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full"
            >
              <ExternalLink size={16} aria-hidden="true" />
              {t('sos.viewOnMap')}
            </a>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <MessageCircle size={16} aria-hidden="true" />
                {t('sos.whatsapp')}
              </a>
              <a href={`sms:?body=${encodeURIComponent(shareText)}`} className="btn-secondary">
                <MessageSquare size={16} aria-hidden="true" />
                {t('sos.sms')}
              </a>
              <button type="button" onClick={copyToClipboard} className="btn-secondary">
                <Copy size={16} aria-hidden="true" />
                {t('sos.copy')}
              </button>
              <button type="button" onClick={webShare} className="btn-secondary">
                <Share2 size={16} aria-hidden="true" />
                {t('sos.share')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
