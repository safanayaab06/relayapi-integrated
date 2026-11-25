import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import { HistoryItem } from '../types/api';
import { backendClient } from './apiClient';

export function loadLocalHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveLocalHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(items.slice(0, 200)));
}

export async function fetchHistory(): Promise<{ items: HistoryItem[]; syncedFromBackend: boolean }> {
  try {
    const res = await backendClient.get<HistoryItem[]>(API_ENDPOINTS.history, { timeout: 3000 });
    if (Array.isArray(res.data)) {
      saveLocalHistory(res.data);
      return { items: res.data, syncedFromBackend: true };
    }
  } catch {
    // Fallback to localStorage
  }
  return { items: loadLocalHistory(), syncedFromBackend: false };
}

export async function syncHistoryEntry(item: HistoryItem): Promise<boolean> {
  try {
    await backendClient.post(API_ENDPOINTS.history, item, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function syncClearHistory(): Promise<boolean> {
  try {
    await backendClient.delete(API_ENDPOINTS.history, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
