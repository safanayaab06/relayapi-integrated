import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckSquare,
  FolderKanban,
  Layers,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { MethodBadge } from '../components/common/MethodBadge';
import { useWorkspace } from '../context/WorkspaceContext';
import { HttpMethod } from '../types/api';

export const DashboardPage: React.FC = () => {
  const {
    history,
    collections,
    environments,
    activeEnvironment,
    backendStatus,
    refreshBackendStatus,
    resetActiveRequest,
    loadRequestIntoBuilder,
  } = useWorkspace();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = history.length;
    const successful = history.filter((h) => h.success).length;
    const failed = history.filter((h) => !h.success).length;
    const savedRequests = collections.reduce(
      (sum, c) =>
        sum + c.requests.length + c.folders.reduce((fSum, f) => fSum + f.requests.length, 0),
      0
    );
    const avgLatency =
      total > 0 ? Math.round(history.reduce((acc, h) => acc + h.durationMs, 0) / total) : 0;

    return { total, successful, failed, collectionsCount: collections.length, savedRequests, avgLatency };
  }, [history, collections]);

  const methodBreakdown = useMemo(() => {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    return methods.map((m) => ({
      method: m,
      count: history.filter((h) => h.request.method === m).length,
    }));
  }, [history]);

  const recentActivity = history.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Actions */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827] lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            REST API Client &amp; Collection Runner
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to RelayAPI Workspace
          </h2>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Build, validate, and test REST endpoints, inspect SSRF security rules, run collections
            sequentially, and diagnose HTTP error codes in one unified developer workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              resetActiveRequest();
              navigate('/client');
            }}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Request</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/runner')}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Open Runner</span>
          </button>
        </div>
      </section>

      {/* KPI Metrics Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total API Requests</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
            {stats.total}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Avg latency <span className="font-mono tabular-nums">{stats.avgLatency} ms</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Successful Requests</p>
          <p className="mt-2 font-mono text-3xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {stats.successful}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            HTTP 2xx / 3xx responses
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Failed Requests</p>
          <p className="mt-2 font-mono text-3xl font-bold text-red-600 tabular-nums dark:text-red-400">
            {stats.failed}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            4xx, 5xx, blocked, or offline
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved Collections</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
            {stats.collectionsCount}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">{stats.savedRequests}</span> saved endpoints
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent API Activity */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Recent API Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest requests executed from the API Client or Collection Runner
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No API requests executed yet"
              description="Send your first request in the API Client or run a saved collection to track latency, status codes, and activity here."
              actionLabel="Open API Client"
              onAction={() => navigate('/client')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-3 font-medium">Method</th>
                    <th className="py-2.5 px-3 font-medium">Endpoint URL</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 text-right font-medium">Time</th>
                    <th className="py-2.5 pl-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {recentActivity.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="py-3 pr-3">
                        <MethodBadge method={item.request.method} />
                      </td>
                      <td className="max-w-[260px] truncate py-3 px-3 font-mono text-slate-800 dark:text-slate-200">
                        {item.resolvedUrl}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            item.success
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {item.status || 'ERR'} {item.statusText}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums dark:text-slate-400">
                        {item.durationMs} ms
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            loadRequestIntoBuilder(item.request);
                            navigate('/client');
                          }}
                          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Overview & Workspace Shortcuts */}
        <section className="space-y-4">
          {/* Method Distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Testing Overview
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Executed requests by HTTP method
            </p>
            <div className="mt-4 space-y-2.5">
              {methodBreakdown.map(({ method, count }) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <MethodBadge method={method} />
                      <span className="font-mono text-slate-600 tabular-nums dark:text-slate-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Environment & Backend Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Workspace Configuration
              </h3>
              <button
                type="button"
                onClick={refreshBackendStatus}
                disabled={backendStatus.checking}
                aria-label="Check Express backend status"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                <RefreshCw className={`h-3 w-3 ${backendStatus.checking ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <dl className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Active Environment</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">
                  {activeEnvironment ? activeEnvironment.name : 'None'} ({environments.length} total)
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Express Backend</dt>
                <dd
                  className={`font-medium ${
                    backendStatus.available
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {backendStatus.available ? 'Connected' : 'Offline (Preview Ready)'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/validator')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/70"
              >
                <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                <span>Validator</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/security-guard')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/70"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                <span>Security Guard</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/collections')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/70"
              >
                <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
                <span>Collections</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/environments')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/70"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Environments</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
