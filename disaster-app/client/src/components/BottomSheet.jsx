import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Tracks whether the large-screen side panel layout is active. */
function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (event) => setIsDesktop(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

/**
 * Draggable bottom sheet on small screens that becomes a static side panel on
 * large screens. Dragging the handle resizes it; a decisive downward flick
 * closes it. Enter and exit are animated with Framer Motion.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  asSidePanel = true,
  initialHeight = 0.5
}) {
  const { t } = useTranslation();
  const [heightRatio, setHeightRatio] = useState(initialHeight);
  const dragState = useRef(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (open) setHeightRatio(initialHeight);
  }, [open, initialHeight]);

  // Escape closes the sheet, matching dialog conventions.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handlePointerDown = (event) => {
    if (isDesktop) return;
    dragState.current = { startY: event.clientY, startRatio: heightRatio };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragState.current) return;
    const delta = dragState.current.startY - event.clientY;
    const next = dragState.current.startRatio + delta / window.innerHeight;
    setHeightRatio(Math.min(0.92, Math.max(0.18, next)));
  };

  const handlePointerUp = (event) => {
    if (!dragState.current) return;
    const delta = dragState.current.startY - event.clientY;
    dragState.current = null;
    // A decisive downward drag dismisses the sheet.
    if (delta < -90) onClose?.();
  };

  const sidePanelClasses = asSidePanel
    ? 'lg:static lg:h-full lg:w-[380px] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none'
    : '';

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          initial={isDesktop ? { opacity: 0, x: 24 } : { y: '100%' }}
          animate={isDesktop ? { opacity: 1, x: 0 } : { y: 0 }}
          exit={isDesktop ? { opacity: 0, x: 24 } : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className={`absolute inset-x-0 bottom-0 z-[900] flex flex-col rounded-t-sheet border-t border-navy-100 bg-white shadow-sheet dark:border-navy-700 dark:bg-navy-800 ${sidePanelClasses}`}
          // The drag height applies to the mobile sheet only; on large screens
          // the panel fills the column height through its classes instead.
          style={
            isDesktop && asSidePanel ? undefined : { height: `${Math.round(heightRatio * 100)}%` }
          }
          aria-label={title}
        >
          <div
            className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing lg:hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="separator"
            aria-label="Resize panel"
          >
            <span className="h-1.5 w-11 rounded-full bg-navy-200 dark:bg-navy-600" />
          </div>

          <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-1 lg:pt-4">
            <h2 className="text-base font-bold">{title}</h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-icon text-navy-500 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-700"
                aria-label={t('common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </header>

          <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** Centred modal used for safety guidance and confirmations. */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className={`flex max-h-[88vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-sheet bg-white shadow-float dark:bg-navy-800 sm:rounded-sheet`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-navy-100 px-4 py-3 dark:border-navy-700">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon text-navy-500 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-700"
                aria-label={t('common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
