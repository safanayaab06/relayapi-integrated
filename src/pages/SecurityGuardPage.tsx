import React, { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { SecurityGuardPanel } from '../components/features/SecurityGuardPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import { checkApiSecurity } from '../services/requestService';
import { SecurityCheckResult } from '../types/api';

const SECURITY_TEST_CASES = [
  { label: 'Public HTTPS API (Safe)', url: 'https://jsonplaceholder.typicode.com/posts' },
  { label: 'Unencrypted HTTP (Warning)', url: 'http://api.example.com/v1/status' },
  { label: 'Localhost SSRF (Blocked)', url: 'http://localhost:5000/api/admin' },
  { label: 'Private IP 192.168.x (Blocked)', url: 'http://192.168.1.10/internal' },
  { label: 'Cloud Metadata 169.254.x (Blocked)', url: 'http://169.254.169.254/latest/meta-data/' },
  { label: 'File Protocol (Blocked)', url: 'file:///etc/passwd' },
];

export const SecurityGuardPage: React.FC = () => {
  const { securityInspectorUrl, setSecurityInspectorUrl, activeEnvironment, notify } =
    useWorkspace();

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SecurityCheckResult | null>(null);

  const runInspection = async (targetUrl: string) => {
    setChecking(true);
    const res = await checkApiSecurity(targetUrl, activeEnvironment);
    setResult(res);
    setChecking(false);
    notify({
      type: res.verdict === 'blocked' ? 'error' : res.verdict === 'warning' ? 'warning' : 'success',
      title: `Security Verdict: ${res.verdict.toUpperCase()}`,
      message: res.reason,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runInspection(securityInspectorUrl);
  };

  return (
    <div className="space-y-6">
      {/* Header & URL Inspector */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            API Security Guard &amp; SSRF Protection
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify target URLs against Server-Side Request Forgery (SSRF) rules, private IP ranges, localhost aliases, cloud metadata endpoints, and restricted protocols.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            value={securityInspectorUrl}
            onChange={(e) => setSecurityInspectorUrl(e.target.value)}
            placeholder="Enter URL to inspect (e.g. https://api.example.com/v1/users)"
            aria-label="Target URL for security inspection"
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            <span>{checking ? 'Inspecting...' : 'Inspect URL'}</span>
          </button>
        </form>

        {/* Quick Test Presets */}
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Quick SSRF &amp; Protocol Test Cases:
          </p>
          <div className="flex flex-wrap gap-2">
            {SECURITY_TEST_CASES.map((tc) => (
              <button
                key={tc.url}
                type="button"
                onClick={() => {
                  setSecurityInspectorUrl(tc.url);
                  void runInspection(tc.url);
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          Inspection Results
        </h3>
        {result ? (
          <SecurityGuardPanel
            result={result}
            onVerifyWithBackend={() => void runInspection(securityInspectorUrl)}
            verifying={checking}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-800">
            <ShieldAlert className="h-7 w-7 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              Enter a URL or choose a test case above to inspect security posture
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Queries the Express <code className="font-mono">POST /api/security/check</code> endpoint when connected, or runs a pre-flight client safety check.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
