export const DEFAULT_BACKEND_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:5000/api';

export const API_ENDPOINTS = {
  health: '/health',
  executeRequest: '/requests/execute',
  validateRequest: '/requests/validate',
  securityCheck: '/security/check',
  explainError: '/errors/explain',
  collections: '/collections',
  runCollection: (collectionId: string) => `/collections/${collectionId}/run`,
  history: '/history',
  environments: '/environments',
} as const;

export const STORAGE_KEYS = {
  settings: 'relayapi_settings_v1',
  collections: 'relayapi_collections_v1',
  history: 'relayapi_history_v1',
  environments: 'relayapi_environments_v1',
  activeEnvId: 'relayapi_active_env_v1',
  draftRequest: 'relayapi_draft_request_v1',
} as const;

export function getEffectiveBackendUrl(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (raw) {
      const parsed = JSON.parse(raw) as { backendBaseUrl?: string };
      if (parsed.backendBaseUrl && parsed.backendBaseUrl.trim()) {
        return parsed.backendBaseUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {
    // Fallback to env default
  }
  return DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, '');
}
