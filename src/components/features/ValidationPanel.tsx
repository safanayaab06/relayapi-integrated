import React from 'react';
import { AlertTriangle, CheckCircle2, Wrench, XCircle } from 'lucide-react';
import { ValidationIssue, ValidationResult } from '../../types/api';

interface ValidationPanelProps {
  result: ValidationResult;
  onApplyFix?: (fixType: NonNullable<ValidationIssue['autoFixType']>) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ result, onApplyFix }) => {
  const errorCount = result.issues.filter((i) => i.severity === 'error').length;
  const warningCount = result.issues.filter((i) => i.severity === 'warning').length;
  const passCount = result.issues.filter((i) => i.severity === 'pass').length;

  const summaryStyle =
    result.status === 'invalid'
      ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300'
      : result.status === 'warning'
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
      : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300';

  const SummaryIcon =
    result.status === 'invalid'
      ? XCircle
      : result.status === 'warning'
      ? AlertTriangle
      : CheckCircle2;

  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5 ${summaryStyle}`}>
        <div className="flex items-center gap-2.5">
          <SummaryIcon className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{result.scoreLabel}</p>
            <p className="text-xs opacity-85">
              {errorCount} {errorCount === 1 ? 'error' : 'errors'} · {warningCount}{' '}
              {warningCount === 1 ? 'warning' : 'warnings'} · {passCount} passed
            </p>
          </div>
        </div>
        <span className="font-mono text-xs opacity-80">
          {result.evaluatedBy === 'backend' ? 'Express Backend Validator' : 'Client Pre-flight Check'}
        </span>
      </div>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#111827]">
        {result.issues.map((issue) => {
          const Icon =
            issue.severity === 'error'
              ? XCircle
              : issue.severity === 'warning'
              ? AlertTriangle
              : CheckCircle2;

          const iconColor =
            issue.severity === 'error'
              ? 'text-red-600 dark:text-red-400'
              : issue.severity === 'warning'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400';

          const labelText =
            issue.severity === 'error'
              ? 'Error'
              : issue.severity === 'warning'
              ? 'Warning'
              : 'Valid';

          return (
            <div key={issue.id} className="flex items-start justify-between gap-4 p-3.5">
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-semibold ${iconColor}`}>{labelText}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{issue.field}</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{issue.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {issue.message}
                  </p>
                  {issue.suggestion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>

              {issue.autoFixType && onApplyFix && (
                <button
                  type="button"
                  onClick={() => onApplyFix(issue.autoFixType!)}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Wrench className="h-3 w-3" />
                  <span>Apply Fix</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
