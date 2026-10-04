import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import useStore from '../store.js';

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'bg-safe-600 text-white' },
  error: { icon: AlertCircle, className: 'bg-danger-600 text-white' },
  info: { icon: Info, className: 'bg-navy-900 text-white dark:bg-navy-700' }
};

/** Stacked notifications rendered above the bottom navigation. */
export default function ToastHost() {
  const toasts = useStore((state) => state.toasts);
  const dismissToast = useStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[1200] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const variant = VARIANTS[toast.variant] ?? VARIANTS.info;
        const Icon = variant.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-card px-4 py-3 shadow-float ${variant.className}`}
          >
            <Icon size={18} aria-hidden="true" className="shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/20"
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
