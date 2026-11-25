import { ApiRequestConfig, Environment, KeyValuePair } from '../types/api';

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function interpolateVariables(input: string, env?: Environment | null): string {
  if (!input || !env) return input;
  return input.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, varName: string) => {
    const found = env.variables.find(
      (v) => v.enabled && v.key.trim() === varName.trim()
    );
    return found ? found.value : match;
  });
}

export function findUnresolvedVariables(input: string, env?: Environment | null): string[] {
  if (!input) return [];
  const matches = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const varName = match[1].trim();
    const resolved = env?.variables.find((v) => v.enabled && v.key.trim() === varName);
    if (!resolved) {
      matches.add(varName);
    }
  }
  return Array.from(matches);
}

export function buildResolvedUrl(
  rawUrl: string,
  params: KeyValuePair[],
  auth: ApiRequestConfig['auth'],
  env?: Environment | null
): string {
  const interpolatedBase = interpolateVariables(rawUrl.trim(), env);
  if (!interpolatedBase) return '';

  const enabledParams = params.filter((p) => p.enabled && p.key.trim() !== '');
  const extraQueryParams: Array<{ key: string; value: string }> = enabledParams.map((p) => ({
    key: interpolateVariables(p.key.trim(), env),
    value: interpolateVariables(p.value, env),
  }));

  if (
    auth.type === 'api-key' &&
    auth.apiKeyIn === 'query' &&
    auth.apiKeyName?.trim() &&
    auth.apiKeyValue !== undefined
  ) {
    extraQueryParams.push({
      key: interpolateVariables(auth.apiKeyName.trim(), env),
      value: interpolateVariables(auth.apiKeyValue, env),
    });
  }

  if (extraQueryParams.length === 0) {
    return interpolatedBase;
  }

  try {
    const urlObj = new URL(interpolatedBase);
    extraQueryParams.forEach(({ key, value }) => {
      urlObj.searchParams.append(key, value);
    });
    return urlObj.toString();
  } catch {
    const queryStr = extraQueryParams
      .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    const separator = interpolatedBase.includes('?') ? '&' : '?';
    return `${interpolatedBase}${separator}${queryStr}`;
  }
}

export function buildResolvedHeaders(
  request: ApiRequestConfig,
  env?: Environment | null
): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const h of request.headers) {
    if (h.enabled && h.key.trim()) {
      headers[interpolateVariables(h.key.trim(), env)] = interpolateVariables(h.value, env);
    }
  }

  if (request.auth.type === 'bearer' && request.auth.bearerToken?.trim()) {
    headers['Authorization'] = `Bearer ${interpolateVariables(request.auth.bearerToken.trim(), env)}`;
  } else if (request.auth.type === 'basic' && (request.auth.basicUsername || request.auth.basicPassword)) {
    const user = interpolateVariables(request.auth.basicUsername || '', env);
    const pass = interpolateVariables(request.auth.basicPassword || '', env);
    headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
  } else if (
    request.auth.type === 'api-key' &&
    request.auth.apiKeyIn !== 'query' &&
    request.auth.apiKeyName?.trim()
  ) {
    headers[interpolateVariables(request.auth.apiKeyName.trim(), env)] = interpolateVariables(
      request.auth.apiKeyValue || '',
      env
    );
  }

  if (
    ['POST', 'PUT', 'PATCH'].includes(request.method) &&
    request.bodyType === 'json' &&
    !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')
  ) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function tryFormatJson(raw: string, spaces = 2): { formatted: string; valid: boolean; error?: string } {
  if (!raw.trim()) {
    return { formatted: '', valid: true };
  }
  try {
    const parsed = JSON.parse(raw);
    return { formatted: JSON.stringify(parsed, null, spaces), valid: true };
  } catch (err) {
    return {
      formatted: raw,
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid JSON syntax',
    };
  }
}

export function createEmptyRequest(): ApiRequestConfig {
  return {
    id: createId('req'),
    name: 'Untitled Request',
    method: 'GET',
    url: '',
    params: [{ id: createId('p'), key: '', value: '', enabled: true }],
    headers: [{ id: createId('h'), key: 'Accept', value: 'application/json', enabled: true }],
    auth: {
      type: 'none',
      apiKeyIn: 'header',
      apiKeyName: 'X-API-Key',
      apiKeyValue: '',
      bearerToken: '',
      basicUsername: '',
      basicPassword: '',
    },
    bodyType: 'none',
    body: '{\n  \n}',
  };
}
