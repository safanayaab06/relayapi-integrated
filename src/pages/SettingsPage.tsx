import React, { useState } from 'react';
import {
  CheckCircle2,
  Moon,
  RefreshCw,
  RotateCcw,
  Server,
  Sun,
  Trash2,
  XCircle,
} from 'lucide-react';
import { DEFAULT_BACKEND_BASE_URL } from '../config/apiConfig';
import { useWorkspace } from '../context/WorkspaceContext';
import { ExecutionPreference } from '../types/api';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    backendStatus,
    refreshBackendStatus,
    history,
    clearAllHistory,
    resetDemoWorkspace,
    requestConfirm,
    notify,
  } = useWorkspace();

  const [backendUrlInput, setBackendUrlInput] = useState(settings.backendBaseUrl);

  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = backendUrlInput.trim().replace(/\/+$/, '') || DEFAULT_BACKEND_BASE_URL;
    updateSettings({ backendBaseUrl: cleaned });
    setBackendUrlInput(cleaned);
    notify({
      type: 'success',
      title: 'Backend URL Updated',
      message: `API requests will target ${cleaned}`,
    });
    setTimeout(() => {
      void refreshBackendStatus();
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Interface &amp; Theme Preferences
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Customize theme polarity and layout density for your developer workspace.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Color Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dark theme is enabled by default
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  settings.theme === 'dark'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light' })}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  settings.theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                JSON Viewer Indentation
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spaces used when pretty-printing JSON
              </p>
            </div>
            <select
              value={settings.jsonIndentSpaces}
              onChange={(e) =>
                updateSettings({ jsonIndentSpaces: Number(e.target.value) as 2 | 4 })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </div>
        </div>
      </section>

      {/* Express Backend Integration */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Express.js Backend Integration
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Configured via <code className="font-mono">VITE_API_BASE_URL</code> (default:{' '}
              <code className="font-mono">{DEFAULT_BACKEND_BASE_URL}</code>).
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshBackendStatus()}
            disabled={backendStatus.checking}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${backendStatus.checking ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/50">
          {backendStatus.available ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <span className="text-slate-700 dark:text-slate-300">{backendStatus.message}</span>
        </div>

        <form onSubmit={handleSaveBackendUrl} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Backend API Base URL
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Server className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={backendUrlInput}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  placeholder="http://localhost:5000/api"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-8 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Apply URL
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Execution Mode
            </label>
            <select
              value={settings.executionPreference}
              onChange={(e) =>
                updateSettings({ executionPreference: e.target.value as ExecutionPreference })
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="backend-first">Express Backend Proxy First</option>
              <option value="direct-only">Direct Browser Fetch (CORS)</option>
            </select>
          </div>
        </form>
      </section>

      {/* Request Preferences */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Request &amp; Safety Preferences
        </h2>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Request Timeout (ms)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Abort pending HTTP requests after this duration
              </p>
            </div>
            <input
              type="number"
              min={1000}
              max={120000}
              step={1000}
              value={settings.requestTimeoutMs}
              onChange={(e) =>
                updateSettings({
                  requestTimeoutMs: Math.max(1000, Number(e.target.value) || 15000),
                })
              }
              className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Auto-Validate Before Sending
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prevent sending requests when Smart Request Validator detects errors
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoValidateBeforeSend}
              onChange={(e) => updateSettings({ autoValidateBeforeSend: e.target.checked })}
              className="h-4 w-4 accent-indigo-600"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Enforce Pre-flight API Security Guard
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Block localhost, private IP ranges, and unsafe protocols before execution
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.enforceSecurityGuard}
              onChange={(e) => updateSettings({ enforceSecurityGuard: e.target.checked })}
              className="h-4 w-4 accent-indigo-600"
            />
          </label>
        </div>
      </section>

      {/* Data Management */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Workspace Data Management
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Manage locally cached request history, collections, and environments.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              requestConfirm(
                {
                  title: 'Clear Request History',
                  message: `Delete all ${history.length} recorded requests from history?`,
                  confirmLabel: 'Clear History',
                },
                () => {
                  clearAllHistory();
                  notify({ type: 'info', title: 'Request History Cleared' });
                }
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Request History ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              requestConfirm(
                {
                  title: 'Reset Workspace to Default Demo Data',
                  message:
                    'Restore sample collections and Local/Staging environments? Custom collections and history will be replaced.',
                  confirmLabel: 'Reset Workspace',
                },
                resetDemoWorkspace
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore Seed Collections &amp; Environments</span>
          </button>
        </div>
      </section>
    </div>
  );
};
