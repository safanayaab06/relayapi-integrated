import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useWorkspace();
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2.5"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : toast.type === 'error' ? (
            <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          );

        const borderClass =
          toast.type === 'success'
            ? 'border-emerald-500/30'
            : toast.type === 'error'
            ? 'border-red-500/30'
            : toast.type === 'warning'
            ? 'border-amber-500/30'
            : 'border-indigo-500/30';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border ${borderClass} bg-white p-3.5 shadow-lg dark:bg-[#111827]`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
