import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  FolderKanban,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
  Square,
  XCircle,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { MethodBadge } from '../components/common/MethodBadge';
import { useWorkspace } from '../context/WorkspaceContext';
import { executeApiRequest } from '../services/requestService';
import { RunnerExecutionItem, SavedRequest } from '../types/api';
import { buildResolvedUrl, createId } from '../utils/requestUtils';

export const CollectionRunnerPage: React.FC = () => {
  const {
    collections,
    environments,
    activeEnvironmentId,
    settings,
    addHistoryEntry,
    notify,
  } = useWorkspace();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialColId = searchParams.get('collection') || collections[0]?.id || '';
  const [selectedCollectionId, setSelectedCollectionId] = useState(initialColId);
  const [selectedEnvId, setSelectedEnvId] = useState(activeEnvironmentId);
  const [executionMode, setExecutionMode] = useState<'backend-first' | 'direct-only'>(
    settings.executionPreference
  );

  const [isRunning, setIsRunning] = useState(false);
  const [items, setItems] = useState<RunnerExecutionItem[]>([]);
  const [totalDurationMs, setTotalDurationMs] = useState<number>(0);
  const stopFlagRef = useRef(false);

  const selectedCollection = useMemo(
    () => collections.find((c) => c.id === selectedCollectionId) || null,
    [collections, selectedCollectionId]
  );

  const selectedEnv = useMemo(
    () => environments.find((e) => e.id === selectedEnvId) || null,
    [environments, selectedEnvId]
  );

  const flattenedRequests = useMemo(() => {
    if (!selectedCollection) return [];
    const list: Array<{ req: SavedRequest; folderName?: string }> = [];
    selectedCollection.folders.forEach((folder) => {
      folder.requests.forEach((req) => list.push({ req, folderName: folder.name }));
    });
    selectedCollection.requests.forEach((req) => list.push({ req }));
    return list;
  }, [selectedCollection]);

  const initializeQueue = () => {
    setItems(
      flattenedRequests.map(({ req, folderName }) => ({
        requestId: req.id,
        requestName: req.name,
        folderName,
        method: req.method,
        url: buildResolvedUrl(req.url, req.params, req.auth, selectedEnv),
        status: 'pending',
      }))
    );
    setTotalDurationMs(0);
  };

  useEffect(() => {
    if (!isRunning) {
      initializeQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollectionId, selectedEnvId, collections]);

  const handleStart = async () => {
    if (!selectedCollection || flattenedRequests.length === 0) return;

    stopFlagRef.current = false;
    setIsRunning(true);
    const runStart = performance.now();

    const initialList: RunnerExecutionItem[] = flattenedRequests.map(({ req, folderName }) => ({
      requestId: req.id,
      requestName: req.name,
      folderName,
      method: req.method,
      url: buildResolvedUrl(req.url, req.params, req.auth, selectedEnv),
      status: 'pending',
    }));
    setItems(initialList);

    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < flattenedRequests.length; i++) {
      if (stopFlagRef.current) {
        setItems((prev) =>
          prev.map((item, idx) => (idx >= i ? { ...item, status: 'skipped' } : item))
        );
        break;
      }

      const { req } = flattenedRequests[i];
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'running' } : item))
      );

      const response = await executeApiRequest(req, selectedEnv, {
        timeoutMs: settings.requestTimeoutMs,
        executionPreference: executionMode,
        enforceSecurityGuard: settings.enforceSecurityGuard,
      });

      const isPass = !response.isError && response.status >= 200 && response.status < 400;
      if (isPass) passedCount++;
      else failedCount++;

      addHistoryEntry({
        id: createId('hist'),
        request: JSON.parse(JSON.stringify(req)),
        resolvedUrl: response.url || req.url,
        status: response.status,
        statusText: response.statusText,
        durationMs: response.durationMs,
        sizeBytes: response.sizeBytes,
        success: isPass,
        source: response.source,
        executedAt: response.timestamp,
        errorMessage: response.errorMessage,
      });

      setItems((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? {
                ...item,
                status: response.securityBlocked ? 'blocked' : isPass ? 'passed' : 'failed',
                httpStatus: response.status,
                statusText: response.statusText,
                durationMs: response.durationMs,
                errorMessage: response.errorMessage,
                source: response.source,
              }
            : item
        )
      );
    }

    const totalElapsed = Math.round(performance.now() - runStart);
    setTotalDurationMs(totalElapsed);
    setIsRunning(false);

    if (stopFlagRef.current) {
      notify({ type: 'warning', title: 'Collection Run Stopped', message: 'Remaining requests were skipped.' });
    } else {
      notify({
        type: failedCount > 0 ? 'warning' : 'success',
        title: 'Collection Run Completed',
        message: `${passedCount} passed, ${failedCount} failed in ${totalElapsed} ms`,
      });
    }
  };

  const handleStop = () => {
    stopFlagRef.current = true;
  };

  const handleReset = () => {
    if (isRunning) return;
    initializeQueue();
  };

  const summary = useMemo(() => {
    const total = items.length;
    const executed = items.filter((i) =>
      ['passed', 'failed', 'blocked'].includes(i.status)
    ).length;
    const passed = items.filter((i) => i.status === 'passed').length;
    const failed = items.filter((i) => i.status === 'failed' || i.status === 'blocked').length;
    return { total, executed, passed, failed };
  }, [items]);

  if (collections.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No collections available to run"
        description="Create a collection and add at least one API request before using the Collection Runner."
        actionLabel="Go to Collections"
        onAction={() => navigate('/collections')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Runner Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Collection
              </label>
              <select
                value={selectedCollectionId}
                disabled={isRunning}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Environment
              </label>
              <select
                value={selectedEnvId}
                disabled={isRunning}
                onChange={(e) => setSelectedEnvId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="none">No Environment</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Execution Transport
              </label>
              <select
                value={executionMode}
                disabled={isRunning}
                onChange={(e) =>
                  setExecutionMode(e.target.value as 'backend-first' | 'direct-only')
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="backend-first">Express Backend Proxy</option>
                <option value="direct-only">Direct Browser Fetch (CORS)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStart}
              disabled={isRunning || flattenedRequests.length === 0}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span>{isRunning ? 'Running...' : 'Start Run'}</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              disabled={!isRunning}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Stop</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </section>

      {/* Summary Metrics */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Executed / Total</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            {summary.executed} / {summary.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Passed</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {summary.passed}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Failed / Blocked</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums dark:text-red-400">
            {summary.failed}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Run Time</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            {totalDurationMs} ms
          </p>
        </div>
      </section>

      {/* Execution Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
        <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Sequential Request Execution ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            This collection contains no requests. Add requests in the Collections page to run them here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                  <th className="w-10 px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="w-24 px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Resolved URL</th>
                  <th className="w-36 px-4 py-3 font-medium">Run Status</th>
                  <th className="w-32 px-4 py-3 font-medium">HTTP Status</th>
                  <th className="w-24 px-4 py-3 text-right font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={`${item.requestId}_${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.requestName}
                      </p>
                      {item.folderName && (
                        <p className="text-slate-500 dark:text-slate-400">{item.folderName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <MethodBadge method={item.method} />
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {item.url}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                      {item.status === 'running' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Running</span>
                        </span>
                      )}
                      {item.status === 'passed' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Passed</span>
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                      {item.status === 'blocked' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Blocked</span>
                        </span>
                      )}
                      {item.status === 'skipped' && (
                        <span className="text-slate-400">Skipped</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {item.httpStatus !== undefined
                        ? `${item.httpStatus || 'ERR'} ${item.statusText || ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {item.durationMs !== undefined ? `${item.durationMs} ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
