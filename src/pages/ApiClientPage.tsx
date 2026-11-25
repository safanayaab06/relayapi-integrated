import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Globe,
  HelpCircle,
  Loader2,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { JsonViewer } from '../components/common/JsonViewer';
import { KeyValueEditor } from '../components/common/KeyValueEditor';
import { SaveRequestModal } from '../components/features/SaveRequestModal';
import { SecurityGuardPanel } from '../components/features/SecurityGuardPanel';
import { ValidationPanel } from '../components/features/ValidationPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  checkApiSecurity,
  runClientRequestValidation,
  runClientSecurityInspection,
} from '../services/requestService';
import { AuthType, HttpMethod, SecurityCheckResult, ValidationIssue } from '../types/api';
import {
  buildResolvedUrl,
  createId,
  formatBytes,
  tryFormatJson,
} from '../utils/requestUtils';

type RequestTab = 'params' | 'headers' | 'auth' | 'body' | 'validator' | 'security';
type ResponseTab = 'pretty' | 'raw' | 'headers';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const ApiClientPage: React.FC = () => {
  const {
    activeRequest,
    setActiveRequest,
    resetActiveRequest,
    activeResponse,
    isSendingRequest,
    sendActiveRequest,
    activeEnvironment,
    settings,
    notify,
    setErrorExplainerTargetCode,
    setSecurityInspectorUrl,
  } = useWorkspace();

  const navigate = useNavigate();
  const [reqTab, setReqTab] = useState<RequestTab>('params');
  const [resTab, setResTab] = useState<ResponseTab>('pretty');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [backendSecurityResult, setBackendSecurityResult] = useState<SecurityCheckResult | null>(
    null
  );
  const [checkingBackendSecurity, setCheckingBackendSecurity] = useState(false);

  const resolvedUrl = useMemo(
    () =>
      buildResolvedUrl(
        activeRequest.url,
        activeRequest.params,
        activeRequest.auth,
        activeEnvironment
      ),
    [activeRequest.url, activeRequest.params, activeRequest.auth, activeEnvironment]
  );

  const liveValidation = useMemo(
    () => runClientRequestValidation(activeRequest, activeEnvironment),
    [activeRequest, activeEnvironment]
  );

  const liveSecurity = useMemo(
    () => runClientSecurityInspection(resolvedUrl),
    [resolvedUrl]
  );

  const effectiveSecurity =
    backendSecurityResult && backendSecurityResult.targetUrl === resolvedUrl
      ? backendSecurityResult
      : liveSecurity;

  const jsonBodyStatus = useMemo<{ formatted: string; valid: boolean; error?: string }>(() => {
    if (activeRequest.bodyType !== 'json') return { formatted: '', valid: true };
    return tryFormatJson(activeRequest.body, settings.jsonIndentSpaces);
  }, [activeRequest.body, activeRequest.bodyType, settings.jsonIndentSpaces]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (settings.autoValidateBeforeSend && liveValidation.status === 'invalid') {
      const firstErr = liveValidation.issues.find((i) => i.severity === 'error');
      notify({
        type: 'error',
        title: 'Request Validation Failed',
        message: firstErr?.message || 'Fix validation errors before sending.',
      });
      setReqTab('validator');
      return;
    }
    await sendActiveRequest();
  };

  const handleFormatJson = () => {
    const res = tryFormatJson(activeRequest.body, settings.jsonIndentSpaces);
    if (!res.valid) {
      notify({
        type: 'error',
        title: 'Invalid JSON Syntax',
        message: res.error || 'Cannot format malformed JSON.',
      });
      return;
    }
    setActiveRequest((prev) => ({ ...prev, body: res.formatted }));
    notify({ type: 'success', title: 'JSON Formatted' });
  };

  const handleApplyValidationFix = (fixType: NonNullable<ValidationIssue['autoFixType']>) => {
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
        const hasHeader = prev.headers.some(
          (h) => h.key.trim().toLowerCase() === 'content-type'
        );
        if (hasHeader) {
          return {
            ...prev,
            headers: prev.headers.map((h) =>
              h.key.trim().toLowerCase() === 'content-type'
                ? { ...h, value: 'application/json', enabled: true }
                : h
            ),
          };
        }
        return {
          ...prev,
          headers: [
            ...prev.headers,
            { id: createId('h'), key: 'Content-Type', value: 'application/json', enabled: true },
          ],
        };
      }
      return prev;
    });
    notify({ type: 'success', title: 'Validation Fix Applied' });
  };

  const handleVerifyBackendSecurity = async () => {
    setCheckingBackendSecurity(true);
    const res = await checkApiSecurity(resolvedUrl, activeEnvironment);
    setBackendSecurityResult(res);
    setCheckingBackendSecurity(false);
    notify({
      type: res.verdict === 'blocked' ? 'error' : res.verdict === 'warning' ? 'warning' : 'success',
      title: `Security Check: ${res.verdict.toUpperCase()}`,
      message: res.reason,
    });
  };

  const errorCount = liveValidation.issues.filter((i) => i.severity === 'error').length;
  const warningCount = liveValidation.issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Request URL Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827] sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {activeRequest.name || 'Untitled Request'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Environment: {activeEnvironment ? activeEnvironment.name : 'None'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setReqTab('validator')}
              className={`inline-flex items-center gap-1.5 font-medium ${
                liveValidation.status === 'invalid'
                  ? 'text-red-600 dark:text-red-400'
                  : liveValidation.status === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {liveValidation.status === 'invalid' ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : liveValidation.status === 'warning' ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>
                Validator: {errorCount} err, {warningCount} warn
              </span>
            </button>

            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>

            <button
              type="button"
              onClick={() => setReqTab('security')}
              className={`inline-flex items-center gap-1.5 font-medium ${
                effectiveSecurity.verdict === 'blocked'
                  ? 'text-red-600 dark:text-red-400'
                  : effectiveSecurity.verdict === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {effectiveSecurity.verdict === 'blocked' ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              <span>Security: {effectiveSecurity.verdict}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSend} className="flex flex-col gap-2.5 lg:flex-row">
          <div className="flex flex-1 overflow-hidden rounded-lg border border-slate-300 bg-slate-50 focus-within:border-indigo-500 dark:border-slate-700 dark:bg-slate-950">
            <select
              value={activeRequest.method}
              onChange={(e) =>
                setActiveRequest((prev) => ({ ...prev, method: e.target.value as HttpMethod }))
              }
              aria-label="HTTP Method"
              className="border-r border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={activeRequest.url}
              onChange={(e) => setActiveRequest((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://api.example.com/v1/users or {{baseUrl}}/posts"
              aria-label="Request URL"
              className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={isSendingRequest}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSendingRequest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isSendingRequest ? 'Sending...' : 'Send Request'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetActiveRequest();
                notify({ type: 'info', title: 'Request Reset', message: 'Cleared request fields.' });
              }}
              title="Reset Request"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </form>

        {/* Resolved URL Preview */}
        {activeRequest.url.trim() && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="shrink-0 font-medium">Resolved URL:</span>
            <code className="truncate font-mono text-slate-700 dark:text-slate-300">
              {resolvedUrl}
            </code>
          </div>
        )}
      </section>

      {/* Request Configuration Tabs */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-4 pt-2.5 dark:border-slate-800 dark:bg-slate-900/50">
          {(
            [
              {
                id: 'params',
                label: `Query Params (${activeRequest.params.filter((p) => p.enabled && p.key.trim()).length})`,
              },
              {
                id: 'headers',
                label: `Headers (${activeRequest.headers.filter((h) => h.enabled && h.key.trim()).length})`,
              },
              { id: 'auth', label: 'Authorization' },
              { id: 'body', label: 'Body' },
              { id: 'validator', label: 'Smart Validator' },
              { id: 'security', label: 'Security Guard' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReqTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-3.5 py-2 text-xs font-medium transition-colors ${
                reqTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {reqTab === 'params' && (
            <KeyValueEditor
              items={activeRequest.params}
              onChange={(params) => setActiveRequest((prev) => ({ ...prev, params }))}
              keyPlaceholder="Parameter"
              valuePlaceholder="Value"
              emptyLabel="No query parameters added."
            />
          )}

          {reqTab === 'headers' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure HTTP headers sent with this request. Supports <code className="font-mono">{'{{variable}}'}</code> syntax.
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyValidationFix('add-content-type')}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  + Content-Type: application/json
                </button>
              </div>
              <KeyValueEditor
                items={activeRequest.headers}
                onChange={(headers) => setActiveRequest((prev) => ({ ...prev, headers }))}
                keyPlaceholder="Header Name"
                valuePlaceholder="Header Value"
                emptyLabel="No headers configured."
              />
            </div>
          )}

          {reqTab === 'auth' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Authentication Type
                </label>
                <select
                  value={activeRequest.auth.type}
                  onChange={(e) =>
                    setActiveRequest((prev) => ({
                      ...prev,
                      auth: { ...prev.auth, type: e.target.value as AuthType },
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api-key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Credentials are injected automatically into request headers or query params when executed.
                </p>
              </div>

              <div className="md:col-span-2">
                {activeRequest.auth.type === 'none' && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    This request does not use automated authorization headers.
                  </div>
                )}

                {activeRequest.auth.type === 'bearer' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Bearer Token (supports <code className="font-mono">{'{{authToken}}'}</code>)
                    </label>
                    <input
                      type="text"
                      value={activeRequest.auth.bearerToken || ''}
                      onChange={(e) =>
                        setActiveRequest((prev) => ({
                          ...prev,
                          auth: { ...prev.auth, bearerToken: e.target.value },
                        }))
                      }
                      placeholder="Paste JWT or {{authToken}}"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                )}

                {activeRequest.auth.type === 'api-key' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Key Name
                      </label>
                      <input
                        type="text"
                        value={activeRequest.auth.apiKeyName || ''}
                        onChange={(e) =>
                          setActiveRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyName: e.target.value },
                          }))
                        }
                        placeholder="X-API-Key"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Key Value
                      </label>
                      <input
                        type="text"
                        value={activeRequest.auth.apiKeyValue || ''}
                        onChange={(e) =>
                          setActiveRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyValue: e.target.value },
                          }))
                        }
                        placeholder="Enter API Key"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Add To
                      </label>
                      <select
                        value={activeRequest.auth.apiKeyIn || 'header'}
                        onChange={(e) =>
                          setActiveRequest((prev) => ({
                            ...prev,
                            auth: {
                              ...prev.auth,
                              apiKeyIn: e.target.value as 'header' | 'query',
                            },
                          }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <option value="header">Header</option>
                        <option value="query">Query Params</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeRequest.auth.type === 'basic' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Username
                      </label>
                      <input
                        type="text"
                        value={activeRequest.auth.basicUsername || ''}
                        onChange={(e) =>
                          setActiveRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, basicUsername: e.target.value },
                          }))
                        }
                        placeholder="Username"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <input
                        type="password"
                        value={activeRequest.auth.basicPassword || ''}
                        onChange={(e) =>
                          setActiveRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, basicPassword: e.target.value },
                          }))
                        }
                        placeholder="Password"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {reqTab === 'body' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  {(['none', 'json', 'raw'] as const).map((type) => (
                    <label key={type} className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={activeRequest.bodyType === type}
                        onChange={() =>
                          setActiveRequest((prev) => ({ ...prev, bodyType: type }))
                        }
                        className="accent-indigo-600"
                      />
                      <span className="font-medium uppercase text-slate-700 dark:text-slate-300">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>

                {activeRequest.bodyType === 'json' && (
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium ${
                        jsonBodyStatus.valid
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {jsonBodyStatus.valid ? 'Valid JSON' : 'JSON Syntax Error'}
                    </span>
                    <button
                      type="button"
                      onClick={handleFormatJson}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Format JSON</span>
                    </button>
                  </div>
                )}
              </div>

              {activeRequest.bodyType === 'none' ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  This request does not have a body payload. Select JSON or Raw above to attach a payload.
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={activeRequest.body}
                    onChange={(e) => setActiveRequest((prev) => ({ ...prev, body: e.target.value }))}
                    rows={10}
                    spellCheck={false}
                    placeholder={
                      activeRequest.bodyType === 'json'
                        ? '{\n  "title": "New API Resource"\n}'
                        : 'Enter raw request payload'
                    }
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0D1117] dark:text-slate-100 dark:focus:bg-[#0D1117]"
                  />
                  {!jsonBodyStatus.valid && jsonBodyStatus.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Syntax error: {jsonBodyStatus.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {reqTab === 'validator' && (
            <ValidationPanel result={liveValidation} onApplyFix={handleApplyValidationFix} />
          )}

          {reqTab === 'security' && (
            <div className="space-y-3">
              <SecurityGuardPanel
                result={effectiveSecurity}
                onVerifyWithBackend={handleVerifyBackendSecurity}
                verifying={checkingBackendSecurity}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSecurityInspectorUrl(resolvedUrl || activeRequest.url);
                    navigate('/security-guard');
                  }}
                  className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Open Full Security Guard Inspector
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Response Viewer */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Response</h3>
            {activeResponse && (
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 font-mono font-semibold tabular-nums ${
                    activeResponse.status >= 200 && activeResponse.status < 300
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : activeResponse.status >= 400 && activeResponse.status < 500
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {activeResponse.status >= 200 && activeResponse.status < 300 ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {activeResponse.status || 'ERR'} {activeResponse.statusText}
                  </span>
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-mono text-slate-600 tabular-nums dark:text-slate-400">
                  {activeResponse.durationMs} ms
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-mono text-slate-600 tabular-nums dark:text-slate-400">
                  {formatBytes(activeResponse.sizeBytes)}
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {activeResponse.source === 'backend-proxy'
                    ? 'Express Proxy'
                    : activeResponse.source === 'direct-browser'
                    ? 'Direct Browser Fetch'
                    : 'Sample Demo Preview'}
                </span>
              </div>
            )}
          </div>

          {activeResponse && activeResponse.status >= 400 && (
            <button
              type="button"
              onClick={() => {
                setErrorExplainerTargetCode(activeResponse.status);
                navigate('/error-explainer');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Explain Error ({activeResponse.status})</span>
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {isSendingRequest ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                Executing {activeRequest.method} request...
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                {resolvedUrl}
              </p>
            </div>
          ) : !activeResponse ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-800">
              <Globe className="h-7 w-7 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                Enter a URL and click Send Request to inspect the response
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                Formatted JSON, response headers, timing metrics, and error explanations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Backend Unavailable Banner with Honest Actions */}
              {activeResponse.backendUnavailable && (
                <div className="rounded-lg border border-amber-500/35 bg-amber-500/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        Express Backend Server Not Reachable
                      </p>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {activeResponse.errorMessage}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sendActiveRequest('direct')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>Run Direct Browser Fetch (CORS)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sendActiveRequest('demo')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Load Sample Demo Response</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Blocked Banner */}
              {activeResponse.securityBlocked && (
                <div className="rounded-lg border border-red-500/35 bg-red-500/5 p-4 text-xs text-red-700 dark:text-red-300">
                  <p className="font-semibold">Request Blocked by API Security Guard</p>
                  <p className="mt-1">{activeResponse.securityReason}</p>
                </div>
              )}

              {/* Clear Demo Notice if viewing sample response */}
              {activeResponse.source === 'demo-preview' && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3.5 py-2 text-xs text-indigo-700 dark:text-indigo-300">
                  Offline Sample Demo Response — This preview is clearly simulated for UI inspection and does not represent live server output.
                </div>
              )}

              {/* Response Sub-tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'pretty', label: 'Pretty JSON' },
                      { id: 'raw', label: 'Raw Body' },
                      {
                        id: 'headers',
                        label: `Headers (${Object.keys(activeResponse.headers).length})`,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setResTab(tab.id)}
                      className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                        resTab === tab.id
                          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {resTab === 'pretty' && (
                <JsonViewer
                  data={activeResponse.body}
                  rawText={activeResponse.rawBody}
                  indent={settings.jsonIndentSpaces}
                  mode="pretty"
                />
              )}

              {resTab === 'raw' && (
                <JsonViewer
                  data={activeResponse.body}
                  rawText={activeResponse.rawBody}
                  mode="raw"
                />
              )}

              {resTab === 'headers' && (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                        <th className="px-4 py-2.5 font-medium">Header</th>
                        <th className="px-4 py-2.5 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {Object.keys(activeResponse.headers).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                            No response headers returned.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(activeResponse.headers).map(([key, val]) => (
                          <tr key={key}>
                            <td className="px-4 py-2.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                              {key}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600 break-all dark:text-slate-400">
                              {val}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <SaveRequestModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        request={activeRequest}
      />
    </div>
  );
};
