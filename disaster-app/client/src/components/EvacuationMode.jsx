/**
 * Evacuation Mode.
 *
 * A deliberately sparse full-screen view: one very large instruction, the
 * distance remaining, and voice guidance. If the user drifts off the route the
 * component requests a new one automatically.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, RefreshCw, Volume2, VolumeX, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { distanceToRouteMetres, haversineKm, nearestRouteIndex } from '../lib/geo.js';
import { formatDistance, formatDuration } from '../lib/time.js';
import {
  cancelSpeech,
  isSpeechEnabled,
  isSpeechSupported,
  resetSpokenHistory,
  setSpeechEnabled,
  speak
} from '../lib/speech.js';

/** Drifting beyond this distance from the line triggers a re-route. */
const OFF_ROUTE_THRESHOLD_M = 70;

/** The drift must persist for this many consecutive fixes before re-routing. */
const OFF_ROUTE_CONFIRMATIONS = 3;

/** Minimum gap between automatic re-routes, so a poor fix cannot spam them. */
const REROUTE_COOLDOWN_MS = 20000;

export default function EvacuationMode({ open, onClose, route, destination, position, onReroute }) {
  const { t } = useTranslation();

  const [voiceOn, setVoiceOn] = useState(() => isSpeechEnabled() && isSpeechSupported());
  const [offRoute, setOffRoute] = useState(false);
  const [rerouting, setRerouting] = useState(false);

  const driftCountRef = useRef(0);
  const lastRerouteRef = useRef(0);
  const arrivedRef = useRef(false);

  const latLngs = Array.isArray(route?.latLngs) ? route.latLngs : [];
  const steps = Array.isArray(route?.steps) ? route.steps : [];

  // Which instruction applies now, based on progress along the line.
  const progressIndex = position ? nearestRouteIndex(position, latLngs) : 0;
  const progressRatio = latLngs.length > 1 ? progressIndex / (latLngs.length - 1) : 0;
  const stepIndex =
    steps.length > 0 ? Math.min(steps.length - 1, Math.floor(progressRatio * steps.length)) : -1;
  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;

  const remainingKm =
    position && destination
      ? haversineKm(position.lat, position.lng, destination.lat, destination.lng)
      : null;

  const remainingMin =
    typeof route?.durationMin === 'number' && latLngs.length > 1
      ? route.durationMin * (1 - progressRatio)
      : null;

  const instruction = (() => {
    if (!position) return t('evacuation.waitingForLocation');
    if (remainingKm !== null && remainingKm < 0.05) return t('evacuation.arrived');
    if (offRoute) return t('evacuation.offRoute');
    if (currentStep?.instruction) return currentStep.instruction;
    return t('evacuation.continue');
  })();

  const triggerReroute = useCallback(async () => {
    if (!onReroute) return;
    const now = Date.now();
    if (now - lastRerouteRef.current < REROUTE_COOLDOWN_MS) return;

    lastRerouteRef.current = now;
    setRerouting(true);
    try {
      await onReroute();
      driftCountRef.current = 0;
      setOffRoute(false);
      resetSpokenHistory();
      speak(t('evacuation.rerouted'), { force: true });
    } finally {
      setRerouting(false);
    }
  }, [onReroute, t]);

  // Off-route detection. Several consecutive bad fixes are required so a single
  // inaccurate reading does not cause a pointless re-route.
  useEffect(() => {
    if (!open || !position || latLngs.length < 2) return;

    const distance = distanceToRouteMetres(position, latLngs);
    const accuracy = Number(position.accuracy) || 0;
    // Allow for GPS error before calling it a drift.
    const tolerance = OFF_ROUTE_THRESHOLD_M + Math.min(accuracy, 60);

    if (distance > tolerance) {
      driftCountRef.current += 1;
      if (driftCountRef.current >= OFF_ROUTE_CONFIRMATIONS) {
        setOffRoute(true);
        triggerReroute();
      }
    } else {
      driftCountRef.current = 0;
      if (offRoute) setOffRoute(false);
    }
  }, [open, position, latLngs, offRoute, triggerReroute]);

  // Voice guidance follows the visible instruction.
  useEffect(() => {
    if (!open || !voiceOn) return;
    if (instruction === t('evacuation.waitingForLocation')) return;
    speak(instruction);
  }, [open, voiceOn, instruction, t]);

  // Announce arrival once.
  useEffect(() => {
    if (!open || remainingKm === null) return;
    if (remainingKm < 0.05 && !arrivedRef.current) {
      arrivedRef.current = true;
      if (voiceOn) speak(t('evacuation.arrived'), { force: true });
    }
    if (remainingKm >= 0.1) arrivedRef.current = false;
  }, [open, remainingKm, voiceOn, t]);

  // Reset and stop speaking when the view closes.
  useEffect(() => {
    if (open) {
      resetSpokenHistory();
      return undefined;
    }
    cancelSpeech();
    driftCountRef.current = 0;
    setOffRoute(false);
    return undefined;
  }, [open]);

  useEffect(() => () => cancelSpeech(), []);

  if (!open) return null;

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setSpeechEnabled(next);
    if (!next) cancelSpeech();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[2000] flex flex-col bg-navy-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t('evacuation.title')}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-danger-600">
            <Navigation size={17} aria-hidden="true" />
          </span>
          <span className="text-sm font-bold uppercase tracking-wide">{t('evacuation.title')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSpeechSupported() && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? t('evacuation.voiceOff') : t('evacuation.voiceOn')}
              className="btn-icon text-white hover:bg-white/15"
            >
              {voiceOn ? (
                <Volume2 size={20} aria-hidden="true" />
              ) : (
                <VolumeX size={20} aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="btn-icon text-white hover:bg-white/15"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {offRoute && (
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 rounded-full bg-danger-600 px-4 py-2 text-sm font-bold"
          >
            {rerouting ? (
              <RefreshCw size={15} aria-hidden="true" className="animate-spin" />
            ) : (
              <RefreshCw size={15} aria-hidden="true" />
            )}
            {rerouting ? t('evacuation.rerouting') : t('evacuation.offRouteBadge')}
          </motion.span>
        )}

        <motion.p
          key={instruction}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl"
        >
          {instruction}
        </motion.p>

        {destination && (
          <p className="text-base text-white/70 sm:text-lg">
            {t('evacuation.heading')} {destination.name}
          </p>
        )}

        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          <div className="rounded-card bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">
              {t('evacuation.remaining')}
            </p>
            <p className="mt-1 text-3xl font-extrabold">
              {remainingKm !== null ? formatDistance(remainingKm) : '-'}
            </p>
          </div>
          <div className="rounded-card bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">{t('evacuation.eta')}</p>
            <p className="mt-1 text-3xl font-extrabold">
              {remainingMin !== null ? formatDuration(remainingMin) : '-'}
            </p>
          </div>
        </div>

        {route?.trafficAware && route.trafficDelayMin >= 0.5 && (
          <p className="text-sm text-warn-400">
            {t('traffic.delay', { minutes: Math.round(route.trafficDelayMin) })}
          </p>
        )}
      </div>

      <footer className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-safe-500"
            animate={{ width: `${Math.round(progressRatio * 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-white/60">
          <span>
            {stepIndex >= 0 && steps.length > 0
              ? `${t('evacuation.step')} ${stepIndex + 1} / ${steps.length}`
              : t('evacuation.noSteps')}
          </span>
          <button
            type="button"
            onClick={triggerReroute}
            disabled={rerouting}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2 font-semibold text-white hover:bg-white/10"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {t('evacuation.recalculate')}
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
