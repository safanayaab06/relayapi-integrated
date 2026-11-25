import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import { SEED_COLLECTIONS } from '../data/seedData';
import { Collection, RunnerExecutionItem } from '../types/api';
import { backendClient } from './apiClient';

export function loadLocalCollections(): Collection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.collections);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  localStorage.setItem(STORAGE_KEYS.collections, JSON.stringify(SEED_COLLECTIONS));
  return SEED_COLLECTIONS;
}

export function saveLocalCollections(collections: Collection[]): void {
  localStorage.setItem(STORAGE_KEYS.collections, JSON.stringify(collections));
}

export async function fetchCollections(): Promise<{ collections: Collection[]; syncedFromBackend: boolean }> {
  try {
    const res = await backendClient.get<Collection[]>(API_ENDPOINTS.collections, { timeout: 3000 });
    if (Array.isArray(res.data)) {
      saveLocalCollections(res.data);
      return { collections: res.data, syncedFromBackend: true };
    }
  } catch {
    // Fallback to localStorage when backend is not connected
  }
  return { collections: loadLocalCollections(), syncedFromBackend: false };
}

export async function syncCreateCollection(collection: Collection): Promise<boolean> {
  try {
    await backendClient.post(API_ENDPOINTS.collections, collection, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function syncUpdateCollection(collection: Collection): Promise<boolean> {
  try {
    await backendClient.put(`${API_ENDPOINTS.collections}/${collection.id}`, collection, {
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function syncDeleteCollection(collectionId: string): Promise<boolean> {
  try {
    await backendClient.delete(`${API_ENDPOINTS.collections}/${collectionId}`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function runCollectionOnBackend(
  collectionId: string,
  environmentVariables: Record<string, string>
): Promise<{ supported: boolean; results?: RunnerExecutionItem[] }> {
  try {
    const res = await backendClient.post<{ results: RunnerExecutionItem[] }>(
      API_ENDPOINTS.runCollection(collectionId),
      { environmentVariables },
      { timeout: 30000 }
    );
    if (Array.isArray(res.data?.results)) {
      return { supported: true, results: res.data.results };
    }
  } catch {
    // Caller falls back to sequential frontend execution via requestService
  }
  return { supported: false };
}
