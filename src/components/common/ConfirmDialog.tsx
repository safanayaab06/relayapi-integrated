import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ConfirmDialog: React.FC = () => {
  const { confirmDialog } = useWorkspace();
  if (!confirmDialog.open) return null;

  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = true } =
    confirmDialog.options;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                destructive
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={confirmDialog.close}
            aria-label="Close confirmation dialog"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={confirmDialog.close}
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirmDialog.onConfirm}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
