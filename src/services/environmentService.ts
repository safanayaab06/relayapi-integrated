import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import { SEED_ENVIRONMENTS } from '../data/seedData';
import { Environment } from '../types/api';
import { backendClient } from './apiClient';

export function loadLocalEnvironments(): Environment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.environments);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEYS.environments, JSON.stringify(SEED_ENVIRONMENTS));
  return SEED_ENVIRONMENTS;
}

export function saveLocalEnvironments(environments: Environment[]): void {
  localStorage.setItem(STORAGE_KEYS.environments, JSON.stringify(environments));
}

export function loadActiveEnvironmentId(environments: Environment[]): string {
  const saved = localStorage.getItem(STORAGE_KEYS.activeEnvId);
  if (saved && (saved === 'none' || environments.some((e) => e.id === saved))) {
    return saved;
  }
  const defaultEnv = environments.find((e) => e.isDefault) || environments[0];
  return defaultEnv ? defaultEnv.id : 'none';
}

export function saveActiveEnvironmentId(envId: string): void {
  localStorage.setItem(STORAGE_KEYS.activeEnvId, envId);
}

export async function fetchEnvironments(): Promise<{
  environments: Environment[];
  syncedFromBackend: boolean;
}> {
  try {
    const res = await backendClient.get<Environment[]>(API_ENDPOINTS.environments, {
      timeout: 3000,
    });
    if (Array.isArray(res.data) && res.data.length > 0) {
      saveLocalEnvironments(res.data);
      return { environments: res.data, syncedFromBackend: true };
    }
  } catch {
    // Fallback to localStorage
  }
  return { environments: loadLocalEnvironments(), syncedFromBackend: false };
}

export async function syncSaveEnvironment(env: Environment): Promise<boolean> {
  try {
    await backendClient.put(`${API_ENDPOINTS.environments}/${env.id}`, env, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function syncDeleteEnvironment(envId: string): Promise<boolean> {
  try {
    await backendClient.delete(`${API_ENDPOINTS.environments}/${envId}`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
