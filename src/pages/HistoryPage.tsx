import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, History, RotateCw, Search, Trash2, XCircle } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { MethodBadge } from '../components/common/MethodBadge';
import { useWorkspace } from '../context/WorkspaceContext';
import { HttpMethod } from '../types/api';

export const HistoryPage: React.FC = () => {
  const { history, clearAllHistory, loadRequestIntoBuilder, requestConfirm, notify } =
    useWorkspace();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | HttpMethod>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => {
      if (methodFilter !== 'ALL' && item.request.method !== methodFilter) return false;
      if (statusFilter === 'success' && !item.success) return false;
      if (statusFilter === 'failed' && item.success) return false;
      if (q && !item.resolvedUrl.toLowerCase().includes(q) && !item.request.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [history, search, methodFilter, statusFilter]);

  const handleClear = () => {
    requestConfirm(
      {
        title: 'Clear Request History',
        message: `Remove all ${history.length} recorded entries from Request History? This action cannot be undone.`,
        confirmLabel: 'Clear History',
      },
      () => {
        clearAllHistory();
        notify({ type: 'info', title: 'History Cleared' });
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Request History</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Audit previously executed API requests, response times, and status codes, or reload any call to rerun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by URL..."
              aria-label="Search history by URL"
              className="w-48 rounded-lg border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'ALL' | HttpMethod)}
            aria-label="Filter by HTTP method"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">All Methods</option>
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
            aria-label="Filter by outcome"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-500/30 bg-red-500/5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </section>

      {/* History Table */}
      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title="No request history recorded yet"
          description="Executed requests from the API Client or Collection Runner will appear here automatically."
          actionLabel="Go to API Client"
          onAction={() => navigate('/client')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching history entries"
          description="Adjust your search term or method/status filters to view recorded requests."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setMethodFilter('ALL');
            setStatusFilter('all');
          }}
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                  <th className="w-24 px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Request URL</th>
                  <th className="w-36 px-4 py-3 font-medium">Status</th>
                  <th className="w-28 px-4 py-3 font-medium">Outcome</th>
                  <th className="w-24 px-4 py-3 text-right font-medium">Latency</th>
                  <th className="w-44 px-4 py-3 font-medium">Executed At</th>
                  <th className="w-28 px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <MethodBadge method={item.request.method} />
                    </td>
                    <td className="max-w-[320px] truncate px-4 py-3 font-mono text-slate-800 dark:text-slate-200">
                      {item.resolvedUrl}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {item.status || 'ERR'} {item.statusText}
                    </td>
                    <td className="px-4 py-3">
                      {item.success ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {item.durationMs} ms
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(item.executedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          loadRequestIntoBuilder(item.request);
                          navigate('/client');
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>Rerun</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
