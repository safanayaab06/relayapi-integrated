import React from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Server } from 'lucide-react';
import { SecurityCheckResult } from '../../types/api';

interface SecurityGuardPanelProps {
  result: SecurityCheckResult;
  onVerifyWithBackend?: () => void;
  verifying?: boolean;
}

export const SecurityGuardPanel: React.FC<SecurityGuardPanelProps> = ({
  result,
  onVerifyWithBackend,
  verifying = false,
}) => {
  const bannerStyle =
    result.verdict === 'blocked'
      ? 'border-red-500/35 bg-red-500/5 text-red-700 dark:text-red-300'
      : result.verdict === 'warning'
      ? 'border-amber-500/35 bg-amber-500/5 text-amber-700 dark:text-amber-300'
      : 'border-emerald-500/35 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300';

  const BannerIcon =
    result.verdict === 'blocked'
      ? ShieldAlert
      : result.verdict === 'warning'
      ? AlertTriangle
      : ShieldCheck;

  const verdictLabel =
    result.verdict === 'blocked'
      ? 'Blocked — Unsafe Destination'
      : result.verdict === 'warning'
      ? 'Warning — Review Recommended'
      : 'Safe — Passed SSRF Inspection';

  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4 ${bannerStyle}`}>
        <div className="flex items-start gap-3">
          <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{verdictLabel}</span>
              <span aria-hidden="true" className="opacity-60">·</span>
              <span className="font-mono text-xs">SSRF Risk: {result.ssrfRiskLevel}</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{result.reason}</p>
            {result.targetUrl && (
              <p className="font-mono text-xs opacity-75 break-all">
                Target: {result.targetUrl}
              </p>
            )}
          </div>
        </div>

        {onVerifyWithBackend && (
          <button
            type="button"
            onClick={onVerifyWithBackend}
            disabled={verifying}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-current/25 bg-white/60 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900 disabled:opacity-60"
          >
            <Server className="h-3.5 w-3.5" />
            <span>{verifying ? 'Checking Backend...' : 'Run Backend Security Check'}</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
              <th className="px-4 py-2.5 font-medium">Security Rule</th>
              <th className="w-28 px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Inspection Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {result.checks.map((check) => {
              const statusClass =
                check.status === 'blocked'
                  ? 'text-red-600 dark:text-red-400'
                  : check.status === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400';

              const statusText =
                check.status === 'blocked'
                  ? 'Blocked'
                  : check.status === 'warning'
                  ? 'Warning'
                  : 'Safe';

              return (
                <tr key={check.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {check.rule}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${statusClass}`}>{statusText}</td>
                  <td className="px-4 py-3 leading-relaxed text-slate-600 dark:text-slate-300">
                    {check.detail}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        Security Architecture Note: Evaluation source is{' '}
        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
          {result.evaluatedBy === 'backend' ? 'Express Backend Security Policy' : 'Frontend Pre-flight Preview'}
        </span>
        . Client-side checks improve developer feedback, while authoritative SSRF, DNS-rebinding, and IP allowlist enforcement must always execute on the Node.js/Express backend.
      </div>
    </div>
  );
};
