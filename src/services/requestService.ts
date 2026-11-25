import axios from 'axios';
import { API_ENDPOINTS } from '../config/apiConfig';
import {
  ApiRequestConfig,
  ApiResponseData,
  Environment,
  ErrorExplanation,
  SecurityCheckResult,
  SecurityRuleCheck,
  SecurityVerdict,
  ValidationIssue,
  ValidationResult,
} from '../types/api';
import {
  buildResolvedHeaders,
  buildResolvedUrl,
  createId,
  findUnresolvedVariables,
  interpolateVariables,
  tryFormatJson,
} from '../utils/requestUtils';
import { backendClient, BackendUnavailableError } from './apiClient';
import { getLocalErrorExplanation } from './errorKnowledgeBase';

interface ExecuteOptions {
  timeoutMs?: number;
  executionPreference?: 'backend-first' | 'direct-only';
  enforceSecurityGuard?: boolean;
}

function normalizeBody(data: unknown): { body: unknown; rawBody: string; sizeBytes: number } {
  if (typeof data === 'string') {
    return {
      body: (() => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      })(),
      rawBody: data,
      sizeBytes: new Blob([data]).size,
    };
  }
  const rawBody = data === undefined || data === null ? '' : JSON.stringify(data, null, 2);
  return {
    body: data,
    rawBody,
    sizeBytes: new Blob([rawBody]).size,
  };
}

export async function executeDirectBrowserRequest(
  request: ApiRequestConfig,
  env?: Environment | null,
  timeoutMs = 15000
): Promise<ApiResponseData> {
  const resolvedUrl = buildResolvedUrl(request.url, request.params, request.auth, env);
  const resolvedHeaders = buildResolvedHeaders(request, env);
  const resolvedBody =
    ['POST', 'PUT', 'PATCH'].includes(request.method) && request.bodyType !== 'none'
      ? interpolateVariables(request.body, env)
      : undefined;

  let dataToSend: unknown = resolvedBody;
  if (request.bodyType === 'json' && typeof resolvedBody === 'string' && resolvedBody.trim()) {
    try {
      dataToSend = JSON.parse(resolvedBody);
    } catch {
      dataToSend = resolvedBody;
    }
  }

  const start = performance.now();
  try {
    const res = await axios.request({
      url: resolvedUrl,
      method: request.method,
      headers: resolvedHeaders,
      data: dataToSend,
      timeout: timeoutMs,
      validateStatus: () => true,
    });

    const durationMs = Math.round(performance.now() - start);
    const normalized = normalizeBody(res.data);
    const responseHeaders: Record<string, string> = {};
    Object.entries(res.headers || {}).forEach(([k, v]) => {
      responseHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
    });

    return {
      status: res.status,
      statusText: res.statusText || (res.status >= 400 ? 'Error' : 'OK'),
      durationMs,
      sizeBytes: normalized.sizeBytes,
      headers: responseHeaders,
      body: normalized.body,
      rawBody: normalized.rawBody,
      timestamp: new Date().toISOString(),
      source: 'direct-browser',
      url: resolvedUrl,
      method: request.method,
      isError: res.status >= 400,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const message = axios.isAxiosError(err)
      ? err.message || 'Network or CORS error during direct browser request.'
      : 'Unexpected error executing direct browser request.';

    return {
      status: 0,
      statusText: 'Network / CORS Error',
      durationMs,
      sizeBytes: 0,
      headers: {},
      body: { error: message },
      rawBody: JSON.stringify({ error: message }, null, 2),
      timestamp: new Date().toISOString(),
      source: 'direct-browser',
      url: resolvedUrl,
      method: request.method,
      isError: true,
      errorMessage:
        `${message}. Browser requests to third-party APIs require CORS headers on the target server; route through the Express backend proxy to avoid CORS blocks.`,
    };
  }
}

export async function executeApiRequest(
  request: ApiRequestConfig,
  env?: Environment | null,
  options: ExecuteOptions = {}
): Promise<ApiResponseData> {
  const {
    timeoutMs = 15000,
    executionPreference = 'backend-first',
    enforceSecurityGuard = true,
  } = options;

  const resolvedUrl = buildResolvedUrl(request.url, request.params, request.auth, env);
  const resolvedHeaders = buildResolvedHeaders(request, env);

  if (enforceSecurityGuard) {
    const securityResult = runClientSecurityInspection(resolvedUrl);
    if (!securityResult.allowed) {
      return {
        status: 403,
        statusText: 'Blocked by Security Guard',
        durationMs: 0,
        sizeBytes: 0,
        headers: {},
        body: {
          blocked: true,
          reason: securityResult.reason,
          ssrfRiskLevel: securityResult.ssrfRiskLevel,
        },
        rawBody: JSON.stringify(
          {
            blocked: true,
            reason: securityResult.reason,
            ssrfRiskLevel: securityResult.ssrfRiskLevel,
          },
          null,
          2
        ),
        timestamp: new Date().toISOString(),
        source: 'backend-proxy',
        url: resolvedUrl,
        method: request.method,
        isError: true,
        securityBlocked: true,
        securityReason: securityResult.reason,
        errorMessage: securityResult.reason,
      };
    }
  }

  if (executionPreference === 'direct-only') {
    return executeDirectBrowserRequest(request, env, timeoutMs);
  }

  const resolvedBody =
    ['POST', 'PUT', 'PATCH'].includes(request.method) && request.bodyType !== 'none'
      ? interpolateVariables(request.body, env)
      : undefined;

  const payload = {
    method: request.method,
    url: resolvedUrl,
    headers: resolvedHeaders,
    bodyType: request.bodyType,
    body: resolvedBody,
    timeoutMs,
  };

  const start = performance.now();
  try {
    const res = await backendClient.post(API_ENDPOINTS.executeRequest, payload, {
      timeout: timeoutMs + 2000,
    });
    const durationMs = res.data?.durationMs ?? Math.round(performance.now() - start);
    const status = res.data?.status ?? res.status;
    const statusText = res.data?.statusText ?? 'OK';
    const normalized = normalizeBody(res.data?.data ?? res.data?.body ?? res.data);

    return {
      status,
      statusText,
      durationMs,
      sizeBytes: res.data?.sizeBytes ?? normalized.sizeBytes,
      headers: res.data?.headers ?? {},
      body: normalized.body,
      rawBody: normalized.rawBody,
      timestamp: new Date().toISOString(),
      source: 'backend-proxy',
      url: resolvedUrl,
      method: request.method,
      isError: status >= 400,
      securityBlocked: Boolean(res.data?.securityBlocked),
      securityReason: res.data?.securityReason,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    if (err instanceof BackendUnavailableError) {
      return {
        status: 0,
        statusText: 'Backend Unavailable',
        durationMs,
        sizeBytes: 0,
        headers: {},
        body: {
          error: 'Express Backend Unavailable',
          attemptedEndpoint: err.attemptedUrl,
          targetUrl: resolvedUrl,
        },
        rawBody: JSON.stringify(
          {
            error: 'Express Backend Unavailable',
            attemptedEndpoint: err.attemptedUrl,
            targetUrl: resolvedUrl,
          },
          null,
          2
        ),
        timestamp: new Date().toISOString(),
        source: 'backend-proxy',
        url: resolvedUrl,
        method: request.method,
        isError: true,
        backendUnavailable: true,
        errorMessage: err.message,
      };
    }

    return {
      status: (err as { statusCode?: number }).statusCode || 500,
      statusText: 'Execution Error',
      durationMs,
      sizeBytes: 0,
      headers: {},
      body: {
        error: err instanceof Error ? err.message : 'Request execution failed',
      },
      rawBody: JSON.stringify(
        { error: err instanceof Error ? err.message : 'Request execution failed' },
        null,
        2
      ),
      timestamp: new Date().toISOString(),
      source: 'backend-proxy',
      url: resolvedUrl,
      method: request.method,
      isError: true,
      errorMessage: err instanceof Error ? err.message : 'Request execution failed',
    };
  }
}

export function buildSampleDemoResponse(
  request: ApiRequestConfig,
  env?: Environment | null
): ApiResponseData {
  const resolvedUrl = buildResolvedUrl(request.url, request.params, request.auth, env);
  const samplePayload = {
    notice: 'SAMPLE DEMO RESPONSE (Offline Preview)',
    note: 'Connect your Node.js / Express.js backend to execute live proxied requests.',
    echoedRequest: {
      method: request.method,
      url: resolvedUrl || 'https://api.example.com/v1/resource',
      headers: buildResolvedHeaders(request, env),
    },
    sampleData: {
      id: 101,
      status: 'active',
      timestamp: new Date().toISOString(),
    },
  };
  const rawBody = JSON.stringify(samplePayload, null, 2);

  return {
    status: 200,
    statusText: 'OK (Demo Preview)',
    durationMs: 42,
    sizeBytes: new Blob([rawBody]).size,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-response-mode': 'demo-preview',
    },
    body: samplePayload,
    rawBody,
    timestamp: new Date().toISOString(),
    source: 'demo-preview',
    url: resolvedUrl,
    method: request.method,
    isError: false,
  };
}

export function runClientRequestValidation(
  request: ApiRequestConfig,
  env?: Environment | null
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rawUrl = request.url.trim();
  const resolvedUrl = interpolateVariables(rawUrl, env);

  // 1. Check URL presence and format
  if (!rawUrl) {
    issues.push({
      id: createId('val'),
      field: 'url',
      severity: 'error',
      title: 'Missing Request URL',
      message: 'The endpoint URL cannot be empty.',
      suggestion: 'Enter a valid HTTP or HTTPS URL (e.g., https://jsonplaceholder.typicode.com/posts).',
    });
  } else {
    if (/\s/.test(rawUrl)) {
      issues.push({
        id: createId('val'),
        field: 'url',
        severity: 'warning',
        title: 'Whitespace Detected in URL',
        message: 'The URL contains leading, trailing, or embedded whitespace characters.',
        suggestion: 'Trim or encode spaces in the URL before sending.',
        autoFixType: 'trim-url',
      });
    }

    const unresolvedUrlVars = findUnresolvedVariables(rawUrl, env);
    if (unresolvedUrlVars.length > 0) {
      issues.push({
        id: createId('val'),
        field: 'environment',
        severity: 'error',
        title: 'Unresolved Environment Variables in URL',
        message: `Variable(s) ${unresolvedUrlVars.map((v) => `{{${v}}}`).join(', ')} are not defined in the active environment.`,
        suggestion: 'Define these variables in Environment Manager or switch environments.',
      });
    } else {
      if (!/^https?:\/\//i.test(resolvedUrl)) {
        issues.push({
          id: createId('val'),
          field: 'url',
          severity: 'error',
          title: 'Missing or Unsupported URL Scheme',
          message: 'URL must start with http:// or https://.',
          suggestion: 'Prepend https:// to the URL.',
          autoFixType: 'add-https',
        });
      } else {
        try {
          new URL(resolvedUrl);
          issues.push({
            id: createId('val'),
            field: 'url',
            severity: 'pass',
            title: 'Valid URL Structure',
            message: `Target URL "${resolvedUrl}" parsed cleanly.`,
          });
        } catch {
          issues.push({
            id: createId('val'),
            field: 'url',
            severity: 'error',
            title: 'Malformed URL Syntax',
            message: `"${resolvedUrl}" is not a valid URL.`,
            suggestion: 'Verify hostname, port, and path formatting.',
          });
        }
      }
    }
  }

  // 2. Method & Body consistency
  const hasBody = request.bodyType !== 'none' && request.body.trim().length > 0;
  if (['GET', 'DELETE'].includes(request.method) && hasBody) {
    issues.push({
      id: createId('val'),
      field: 'method',
      severity: 'warning',
      title: `${request.method} Request Includes a Body`,
      message: `Sending a request body with ${request.method} is discouraged by HTTP semantics and ignored by many servers/proxies.`,
      suggestion: 'Move parameters to Query Params or switch body type to None.',
      autoFixType: 'clear-get-body',
    });
  } else {
    issues.push({
      id: createId('val'),
      field: 'method',
      severity: 'pass',
      title: `Valid HTTP Method (${request.method})`,
      message: `${request.method} method aligns with the current body configuration.`,
    });
  }

  // 3. Headers checks
  const enabledHeaders = request.headers.filter((h) => h.enabled && h.key.trim() !== '');
  const headerNames = enabledHeaders.map((h) => h.key.trim().toLowerCase());
  const duplicateHeaders = headerNames.filter((name, i) => headerNames.indexOf(name) !== i);
  if (duplicateHeaders.length > 0) {
    issues.push({
      id: createId('val'),
      field: 'headers',
      severity: 'warning',
      title: 'Duplicate Header Keys',
      message: `Duplicate header(s) found: ${Array.from(new Set(duplicateHeaders)).join(', ')}.`,
      suggestion: 'Disable or remove duplicate header entries to avoid unpredictable overrides.',
    });
  }

  const hasContentType = headerNames.includes('content-type');
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.bodyType === 'json' && !hasContentType) {
    issues.push({
      id: createId('val'),
      field: 'headers',
      severity: 'warning',
      title: 'Missing Content-Type Header',
      message: 'JSON body is enabled without an explicit Content-Type: application/json header.',
      suggestion: 'Add Content-Type: application/json so the Express server parses req.body properly.',
      autoFixType: 'add-content-type',
    });
  } else {
    issues.push({
      id: createId('val'),
      field: 'headers',
      severity: 'pass',
      title: 'Headers Verified',
      message: `${enabledHeaders.length} active header(s) configured with no conflicts.`,
    });
  }

  // 4. JSON Body validation
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.bodyType === 'json') {
    const resolvedBody = interpolateVariables(request.body, env);
    if (!resolvedBody.trim()) {
      issues.push({
        id: createId('val'),
        field: 'body',
        severity: 'warning',
        title: 'Empty JSON Body',
        message: 'JSON body mode is active, but the payload editor is empty.',
        suggestion: 'Provide a valid JSON object (e.g., {}) or switch Body Type to None.',
      });
    } else {
      const jsonCheck = tryFormatJson(resolvedBody);
      if (!jsonCheck.valid) {
        issues.push({
          id: createId('val'),
          field: 'body',
          severity: 'error',
          title: 'Invalid JSON Request Body',
          message: jsonCheck.error || 'Request body contains invalid JSON syntax.',
          suggestion: 'Fix syntax errors such as missing quotes, unescaped characters, or trailing commas.',
        });
      } else {
        issues.push({
          id: createId('val'),
          field: 'body',
          severity: 'pass',
          title: 'Valid JSON Payload',
          message: 'Request body parses cleanly as valid JSON.',
        });
      }
    }
  }

  // 5. Auth checks
  if (request.auth.type === 'bearer' && !request.auth.bearerToken?.trim()) {
    issues.push({
      id: createId('val'),
      field: 'auth',
      severity: 'error',
      title: 'Empty Bearer Token',
      message: 'Bearer Token authentication is selected, but no token is entered.',
      suggestion: 'Provide a valid token or switch Auth type to None.',
    });
  } else if (
    request.auth.type === 'api-key' &&
    (!request.auth.apiKeyName?.trim() || !request.auth.apiKeyValue?.trim())
  ) {
    issues.push({
      id: createId('val'),
      field: 'auth',
      severity: 'error',
      title: 'Incomplete API Key Configuration',
      message: 'API Key authentication requires both a key name and key value.',
      suggestion: 'Fill in both Key Name and Key Value in the Authorization tab.',
    });
  } else if (
    request.auth.type === 'basic' &&
    (!request.auth.basicUsername?.trim() || !request.auth.basicPassword?.trim())
  ) {
    issues.push({
      id: createId('val'),
      field: 'auth',
      severity: 'warning',
      title: 'Incomplete Basic Auth Credentials',
      message: 'Basic Auth is selected with missing username or password.',
      suggestion: 'Enter both username and password.',
    });
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const status = hasError ? 'invalid' : hasWarning ? 'warning' : 'valid';

  return {
    status,
    scoreLabel: hasError ? 'Errors Detected' : hasWarning ? 'Valid with Warnings' : 'Ready to Send',
    issues,
    checkedAt: new Date().toISOString(),
    evaluatedBy: 'client-preview',
  };
}

export async function validateApiRequest(
  request: ApiRequestConfig,
  env?: Environment | null
): Promise<ValidationResult> {
  try {
    const res = await backendClient.post<ValidationResult>(API_ENDPOINTS.validateRequest, {
      request,
      resolvedUrl: buildResolvedUrl(request.url, request.params, request.auth, env),
    });
    if (res.data && Array.isArray(res.data.issues)) {
      return { ...res.data, evaluatedBy: 'backend' };
    }
  } catch {
    // Fallback to local pre-flight validation when Express backend is unavailable
  }
  return runClientRequestValidation(request, env);
}

function isPrivateOrReservedIpv4(hostname: string): { isPrivate: boolean; label?: string } {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (!match) return { isPrivate: false };
  const octets = match.slice(1).map(Number);
  if (octets.some((o) => o < 0 || o > 255)) return { isPrivate: false };

  const [a, b] = octets;
  if (a === 127) return { isPrivate: true, label: 'Loopback range (127.0.0.0/8)' };
  if (a === 10) return { isPrivate: true, label: 'Private RFC1918 range (10.0.0.0/8)' };
  if (a === 172 && b >= 16 && b <= 31)
    return { isPrivate: true, label: 'Private RFC1918 range (172.16.0.0/12)' };
  if (a === 192 && b === 168)
    return { isPrivate: true, label: 'Private RFC1918 range (192.168.0.0/16)' };
  if (a === 169 && b === 254)
    return { isPrivate: true, label: 'Cloud Metadata / Link-Local range (169.254.0.0/16)' };
  if (a === 0) return { isPrivate: true, label: 'Unspecified address (0.0.0.0/8)' };
  return { isPrivate: false };
}

export function runClientSecurityInspection(rawUrl: string): SecurityCheckResult {
  const trimmed = rawUrl.trim();
  const checks: SecurityRuleCheck[] = [];

  if (!trimmed) {
    return {
      verdict: 'warning',
      allowed: false,
      targetUrl: '',
      reason: 'No URL provided for security inspection.',
      ssrfRiskLevel: 'low',
      checks: [
        {
          id: 'empty-url',
          rule: 'Target URL Presence',
          status: 'warning',
          detail: 'Enter a URL to run SSRF and protocol safety checks.',
        },
      ],
      evaluatedBy: 'client-preview',
      checkedAt: new Date().toISOString(),
    };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      verdict: 'blocked',
      allowed: false,
      targetUrl: trimmed,
      reason: 'Malformed URL cannot pass security inspection.',
      ssrfRiskLevel: 'medium',
      checks: [
        {
          id: 'url-parse',
          rule: 'URL Parsing & Normalization',
          status: 'blocked',
          detail: 'URL failed RFC-3986 parsing. Include a valid protocol such as https://.',
        },
      ],
      evaluatedBy: 'client-preview',
      checkedAt: new Date().toISOString(),
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // 1. Protocol Check
  if (!['http:', 'https:'].includes(protocol)) {
    checks.push({
      id: 'protocol',
      rule: 'Allowed Transport Protocol',
      status: 'blocked',
      detail: `Unsupported protocol "${protocol}". Only http: and https: are permitted; file://, ftp://, and gopher:// are blocked.`,
    });
  } else if (protocol === 'http:') {
    checks.push({
      id: 'protocol',
      rule: 'Transport Encryption (HTTPS)',
      status: 'warning',
      detail: 'Unencrypted http:// transport detected. Prefer https:// for sensitive headers and tokens.',
    });
  } else {
    checks.push({
      id: 'protocol',
      rule: 'Transport Protocol',
      status: 'safe',
      detail: 'Encrypted https:// protocol verified.',
    });
  }

  // 2. Embedded credentials
  if (parsed.username || parsed.password) {
    checks.push({
      id: 'credentials',
      rule: 'Embedded URL Credentials',
      status: 'blocked',
      detail: 'URL contains embedded user:password credentials, which poses credential leakage and parser-confusion risks.',
    });
  } else {
    checks.push({
      id: 'credentials',
      rule: 'Embedded URL Credentials',
      status: 'safe',
      detail: 'No inline credentials found in URL authority.',
    });
  }

  // 3. Localhost & Loopback Detection
  const isLocalhost =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    hostname === '0:0:0:0:0:0:0:1' ||
    hostname === '0.0.0.0';

  if (isLocalhost) {
    checks.push({
      id: 'localhost',
      rule: 'Localhost / Loopback SSRF Guard',
      status: 'blocked',
      detail: `Blocked loopback hostname "${hostname}" to prevent Server-Side Request Forgery against host services.`,
    });
  } else {
    checks.push({
      id: 'localhost',
      rule: 'Localhost / Loopback SSRF Guard',
      status: 'safe',
      detail: 'Target hostname is not a loopback alias.',
    });
  }

  // 4. Private IP & Cloud Metadata Detection
  const ipv4Check = isPrivateOrReservedIpv4(hostname);
  const isIpv6Private =
    hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80');
  const isMetadataHost = hostname === 'metadata.google.internal' || hostname === '169.254.169.254';

  if (isMetadataHost) {
    checks.push({
      id: 'metadata',
      rule: 'Cloud Metadata Endpoint Protection',
      status: 'blocked',
      detail: `Critical SSRF risk: "${hostname}" targets cloud instance metadata services.`,
    });
  } else if (ipv4Check.isPrivate || isIpv6Private) {
    checks.push({
      id: 'private-ip',
      rule: 'Private / Internal Network IP Check',
      status: 'blocked',
      detail: `Blocked internal IP "${hostname}" (${ipv4Check.label || 'Private IPv6 range'}).`,
    });
  } else {
    checks.push({
      id: 'private-ip',
      rule: 'Private / Internal Network IP Check',
      status: 'safe',
      detail: 'Destination is not within restricted RFC1918, loopback, or link-local IP ranges.',
    });
  }

  // 5. Restricted Port Check
  const dangerousPorts = ['22', '23', '25', '110', '143', '445', '3306', '5432', '6379', '27017'];
  if (parsed.port && dangerousPorts.includes(parsed.port)) {
    checks.push({
      id: 'port',
      rule: 'Restricted Service Port Inspection',
      status: 'blocked',
      detail: `Port :${parsed.port} corresponds to a restricted infrastructure/database service.`,
    });
  } else {
    checks.push({
      id: 'port',
      rule: 'Service Port Inspection',
      status: 'safe',
      detail: parsed.port ? `Port :${parsed.port} permitted.` : 'Standard default port.',
    });
  }

  const hasBlocked = checks.some((c) => c.status === 'blocked');
  const hasWarning = checks.some((c) => c.status === 'warning');
  const verdict: SecurityVerdict = hasBlocked ? 'blocked' : hasWarning ? 'warning' : 'safe';
  const blockingCheck = checks.find((c) => c.status === 'blocked');
  const warningCheck = checks.find((c) => c.status === 'warning');

  return {
    verdict,
    allowed: !hasBlocked,
    targetUrl: trimmed,
    resolvedHostname: hostname,
    reason: blockingCheck
      ? blockingCheck.detail
      : warningCheck
      ? warningCheck.detail
      : 'URL passed all protocol, private-IP, and SSRF protection checks.',
    ssrfRiskLevel: isMetadataHost
      ? 'critical'
      : hasBlocked
      ? 'high'
      : hasWarning
      ? 'low'
      : 'none',
    checks,
    evaluatedBy: 'client-preview',
    checkedAt: new Date().toISOString(),
  };
}

export async function checkApiSecurity(
  url: string,
  env?: Environment | null
): Promise<SecurityCheckResult> {
  const resolvedUrl = interpolateVariables(url, env);
  try {
    const res = await backendClient.post<SecurityCheckResult>(API_ENDPOINTS.securityCheck, {
      url: resolvedUrl,
    });
    if (res.data && res.data.verdict) {
      return { ...res.data, evaluatedBy: 'backend' };
    }
  } catch {
    // Fallback to client preview when Express backend is unavailable
  }
  return runClientSecurityInspection(resolvedUrl);
}

export async function explainApiError(
  statusCode: number,
  responseBody?: string
): Promise<{ explanation: ErrorExplanation; source: 'backend' | 'local-reference' }> {
  try {
    const res = await backendClient.post<ErrorExplanation>(API_ENDPOINTS.explainError, {
      statusCode,
      responseBody,
    });
    if (res.data && res.data.title) {
      return { explanation: res.data, source: 'backend' };
    }
  } catch {
    // Fallback to built-in error knowledge base
  }
  return {
    explanation: getLocalErrorExplanation(statusCode),
    source: 'local-reference',
  };
}
