import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckSquare, Loader2, RefreshCw } from 'lucide-react';
import { ValidationPanel } from '../components/features/ValidationPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import { validateApiRequest } from '../services/requestService';
import { HttpMethod, ValidationIssue, ValidationResult } from '../types/api';
import { createId } from '../utils/requestUtils';

export const ValidatorPage: React.FC = () => {
  const { activeRequest, setActiveRequest, activeEnvironment, notify } = useWorkspace();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleRunValidation = async () => {
    setChecking(true);
    const res = await validateApiRequest(activeRequest, activeEnvironment);
    setResult(res);
    setChecking(false);
    notify({
      type: res.status === 'invalid' ? 'error' : res.status === 'warning' ? 'warning' : 'success',
      title: res.scoreLabel,
      message: `Evaluated via ${res.evaluatedBy === 'backend' ? 'Express Backend' : 'Client Pre-flight Check'}.`,
    });
  };

  const handleApplyFix = (fixType: NonNullable<ValidationIssue['autoFixType']>) => {
    setActiveRequest((prev) => {
      if (fixType === 'trim-url') {
        return { ...prev, url: prev.url.trim().replace(/\s+/g, '') };
      }
      if (fixType === 'add-https') {
        return { ...prev, url: `https://${prev.url.trim()}` };
      }
      if (fixType === 'clear-get-body') {
        return { ...prev, bodyType: 'none', body: '' };
      }
      if (fixType === 'add-content-type') {
        const hasHeader = prev.headers.some((h) => h.key.trim().toLowerCase() === 'content-type');
        return hasHeader
          ? {
              ...prev,
              headers: prev.headers.map((h) =>
                h.key.trim().toLowerCase() === 'content-type'
                  ? { ...h, value: 'application/json', enabled: true }
                  : h
              ),
            }
          : {
              ...prev,
              headers: [
                ...prev.headers,
                { id: createId('h'), key: 'Content-Type', value: 'application/json', enabled: true },
              ],
            };
      }
      return prev;
    });
    notify({ type: 'success', title: 'Fix Applied', message: 'Re-run validation to verify.' });
  };

  const loadSampleBrokenRequest = () => {
    setActiveRequest((prev) => ({
      ...prev,
      method: 'POST',
      url: 'api.example.com/v1/users ',
      headers: [],
      bodyType: 'json',
      body: '{\n  "name": "Dev",\n  "role": "admin",\n}',
    }));
    setResult(null);
    notify({
      type: 'info',
      title: 'Sample Invalid Request Loaded',
      message: 'Click Run Validation to inspect detected errors and warnings.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Smart Request Validator
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Inspect URL syntax, HTTP method semantics, required headers, JSON payloads, and unresolved environment variables before sending.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadSampleBrokenRequest}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Load Sample Faulty Request
          </button>
          <button
            type="button"
            onClick={handleRunValidation}
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckSquare className="h-3.5 w-3.5" />
            )}
            <span>{checking ? 'Validating...' : 'Run Validation'}</span>
          </button>
        </div>
      </section>

      {/* Editable Request Quick Inspector */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Active Request Input
            </h3>
            <button
              type="button"
              onClick={() => navigate('/client')}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <span>Open in API Client</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Method
                </label>
                <select
                  value={activeRequest.method}
                  onChange={(e) =>
                    setActiveRequest((prev) => ({ ...prev, method: e.target.value as HttpMethod }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  URL
                </label>
                <input
                  type="text"
                  value={activeRequest.url}
                  onChange={(e) => setActiveRequest((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://api.example.com/v1/resource"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Body Type
              </label>
              <select
                value={activeRequest.bodyType}
                onChange={(e) =>
                  setActiveRequest((prev) => ({
                    ...prev,
                    bodyType: e.target.value as 'none' | 'json' | 'raw',
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="none">None</option>
                <option value="json">JSON</option>
                <option value="raw">Raw</option>
              </select>
            </div>

            {activeRequest.bodyType !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Request Body
                </label>
                <textarea
                  value={activeRequest.body}
                  onChange={(e) => setActiveRequest((prev) => ({ ...prev, body: e.target.value }))}
                  rows={8}
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-[#0D1117] dark:text-slate-100"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleRunValidation}
              disabled={checking}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>Re-validate Active Request</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Validation Report
          </h3>
          {result ? (
            <ValidationPanel result={result} onApplyFix={handleApplyFix} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-800">
              <CheckSquare className="h-7 w-7 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                Click Run Validation to inspect this request
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Checks URL structure, HTTP method rules, Content-Type headers, JSON body syntax, and environment variables.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
