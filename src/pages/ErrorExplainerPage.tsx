import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Search,
  Wrench,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { explainApiError } from '../services/requestService';
import { ErrorExplanation } from '../types/api';

const COMMON_CODES = [400, 401, 403, 404, 405, 408, 429, 500, 502, 503];

export const ErrorExplainerPage: React.FC = () => {
  const { errorExplainerTargetCode, setErrorExplainerTargetCode } = useWorkspace();
  const [customCodeInput, setCustomCodeInput] = useState(String(errorExplainerTargetCode || 404));
  const [rawErrorBody, setRawErrorBody] = useState('');
  const [explanation, setExplanation] = useState<ErrorExplanation | null>(null);
  const [source, setSource] = useState<'backend' | 'local-reference'>('local-reference');
  const [loading, setLoading] = useState(false);

  const loadExplanation = async (code: number, body?: string) => {
    setLoading(true);
    const res = await explainApiError(code, body);
    setExplanation(res.explanation);
    setSource(res.source);
    setLoading(false);
  };

  useEffect(() => {
    const code = errorExplainerTargetCode || 404;
    setCustomCodeInput(String(code));
    void loadExplanation(code);
  }, [errorExplainerTargetCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customCodeInput.trim(), 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 599) return;
    setErrorExplainerTargetCode(parsed);
    void loadExplanation(parsed, rawErrorBody);
  };

  return (
    <div className="space-y-6">
      {/* Top Lookup Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              API Error Explainer
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Understand HTTP 4xx and 5xx status codes in plain language with root causes and practical troubleshooting steps.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min={0}
                max={599}
                value={customCodeInput}
                onChange={(e) => setCustomCodeInput(e.target.value)}
                placeholder="Status code (e.g. 429)"
                aria-label="HTTP status code"
                className="w-48 rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-8 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Explain Code
            </button>
          </form>
        </div>

        {/* Common Status Code Selector */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-4 dark:border-slate-800">
          {COMMON_CODES.map((code) => {
            const active = explanation?.statusCode === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setErrorExplainerTargetCode(code);
                  setCustomCodeInput(String(code));
                  void loadExplanation(code, rawErrorBody);
                }}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors tabular-nums ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {code}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setErrorExplainerTargetCode(0);
              setCustomCodeInput('0');
              void loadExplanation(0, rawErrorBody);
            }}
            className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
              explanation?.statusCode === 0
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Network / CORS
          </button>
        </div>
      </section>

      {/* Optional Error Payload Context */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Optional Server Error Payload (sent to Express <code className="font-mono">/api/errors/explain</code> if connected)
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={rawErrorBody}
            onChange={(e) => setRawErrorBody(e.target.value)}
            placeholder='e.g. {"error": "jwt expired", "message": "Invalid authorization header"}'
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => void loadExplanation(Number(customCodeInput) || 404, rawErrorBody)}
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Analyze Payload
          </button>
        </div>
      </section>

      {/* Error Explanation Detail */}
      {explanation && (
        <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {explanation.category}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {source === 'backend' ? 'Express Backend Explainer' : 'Built-in Developer Reference'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                <span className="font-mono tabular-nums">{explanation.statusCode || 'ERR'}</span> —{' '}
                {explanation.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{explanation.summary}</p>
            </div>
          </div>

          {/* Beginner-friendly explanation */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <HelpCircle className="h-4 w-4" />
              <span>Plain-Language Explanation</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {explanation.beginnerExplanation}
            </p>
          </div>

          {/* Causes & Solutions Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Possible Causes</span>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {explanation.possibleCauses.map((cause, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 font-mono text-slate-400 tabular-nums">{idx + 1}.</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Wrench className="h-4 w-4 text-emerald-500" />
                <span>Practical Solutions</span>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {explanation.practicalSolutions.map((sol, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{sol}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Troubleshooting Steps */}
          <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ListChecks className="h-4 w-4 text-indigo-500" />
              <span>Troubleshooting Checklist</span>
            </div>
            <ol className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {explanation.troubleshootingSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
                >
                  <span className="mr-2 font-mono font-semibold text-indigo-600 tabular-nums dark:text-indigo-400">
                    Step {idx + 1}:
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {explanation.exampleFix && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0D1117]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Example Fix</p>
              <pre className="mt-2 overflow-x-auto font-mono text-xs text-slate-800 dark:text-slate-200">
                {explanation.exampleFix}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
