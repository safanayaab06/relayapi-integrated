import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_BACKEND_BASE_URL, STORAGE_KEYS } from '../config/apiConfig';
import { SEED_COLLECTIONS, SEED_ENVIRONMENTS } from '../data/seedData';
import { checkBackendHealth } from '../services/apiClient';
import {
  fetchCollections,
  loadLocalCollections,
  saveLocalCollections,
  syncCreateCollection,
  syncDeleteCollection,
  syncUpdateCollection,
} from '../services/collectionService';
import {
  fetchEnvironments,
  loadActiveEnvironmentId,
  loadLocalEnvironments,
  saveActiveEnvironmentId,
  saveLocalEnvironments,
  syncDeleteEnvironment,
  syncSaveEnvironment,
} from '../services/environmentService';
import {
  fetchHistory,
  loadLocalHistory,
  saveLocalHistory,
  syncClearHistory,
  syncHistoryEntry,
} from '../services/historyService';
import {
  buildSampleDemoResponse,
  executeApiRequest,
  executeDirectBrowserRequest,
} from '../services/requestService';
import {
  ApiRequestConfig,
  ApiResponseData,
  AppSettings,
  Collection,
  Environment,
  HistoryItem,
  SavedRequest,
  ToastNotification,
} from '../types/api';
import { buildResolvedUrl, createEmptyRequest, createId } from '../utils/requestUtils';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  backendBaseUrl: DEFAULT_BACKEND_BASE_URL,
  executionPreference: 'backend-first',
  requestTimeoutMs: 15000,
  autoValidateBeforeSend: true,
  enforceSecurityGuard: true,
  jsonIndentSpaces: 2,
  compactTables: false,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function loadDraftRequest(): ApiRequestConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.draftRequest);
    if (raw) {
      const parsed = JSON.parse(raw) as ApiRequestConfig;
      if (parsed && parsed.method) return parsed;
    }
  } catch {
    // ignore
  }
  const starter = createEmptyRequest();
  starter.name = 'Get Sample Posts';
  starter.method = 'GET';
  starter.url = '{{baseUrl}}/posts';
  starter.params = [{ id: createId('p'), key: '_limit', value: '5', enabled: true }];
  return starter;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface WorkspaceContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleTheme: () => void;

  backendStatus: {
    checking: boolean;
    available: boolean;
    message: string;
    latencyMs?: number;
  };
  refreshBackendStatus: () => Promise<void>;

  activeRequest: ApiRequestConfig;
  setActiveRequest: React.Dispatch<React.SetStateAction<ApiRequestConfig>>;
  resetActiveRequest: () => void;
  loadRequestIntoBuilder: (req: ApiRequestConfig) => void;

  activeResponse: ApiResponseData | null;
  setActiveResponse: React.Dispatch<React.SetStateAction<ApiResponseData | null>>;
  isSendingRequest: boolean;
  sendActiveRequest: (overrideMode?: 'direct' | 'demo') => Promise<ApiResponseData>;

  collections: Collection[];
  createCollection: (name: string, description: string) => Collection;
  updateCollection: (collection: Collection) => void;
  deleteCollection: (collectionId: string) => void;
  addFolderToCollection: (collectionId: string, folderName: string) => void;
  deleteFolderFromCollection: (collectionId: string, folderId: string) => void;
  saveRequestToCollection: (
    request: ApiRequestConfig,
    collectionId: string,
    folderId?: string,
    requestName?: string
  ) => SavedRequest;
  deleteRequestFromCollection: (collectionId: string, requestId: string, folderId?: string) => void;

  history: HistoryItem[];
  addHistoryEntry: (item: HistoryItem) => void;
  clearAllHistory: () => void;

  environments: Environment[];
  activeEnvironmentId: string;
  activeEnvironment: Environment | null;
  setActiveEnvironmentId: (envId: string) => void;
  saveEnvironment: (env: Environment) => void;
  deleteEnvironment: (envId: string) => void;

  errorExplainerTargetCode: number;
  setErrorExplainerTargetCode: (code: number) => void;
  securityInspectorUrl: string;
  setSecurityInspectorUrl: (url: string) => void;

  toasts: ToastNotification[];
  notify: (toast: Omit<ToastNotification, 'id'>) => void;
  dismissToast: (id: string) => void;

  confirmDialog: {
    open: boolean;
    options: ConfirmDialogOptions;
    onConfirm: () => void;
    close: () => void;
  };
  requestConfirm: (options: ConfirmDialogOptions, onConfirm: () => void) => void;
  resetDemoWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [activeRequest, setActiveRequest] = useState<ApiRequestConfig>(loadDraftRequest);
  const [activeResponse, setActiveResponse] = useState<ApiResponseData | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const [collections, setCollections] = useState<Collection[]>(loadLocalCollections);
  const [history, setHistory] = useState<HistoryItem[]>(loadLocalHistory);
  const [environments, setEnvironments] = useState<Environment[]>(loadLocalEnvironments);
  const [activeEnvironmentId, setActiveEnvIdState] = useState<string>(() =>
    loadActiveEnvironmentId(loadLocalEnvironments())
  );

  const [errorExplainerTargetCode, setErrorExplainerTargetCode] = useState<number>(404);
  const [securityInspectorUrl, setSecurityInspectorUrl] = useState<string>(
    'https://api.example.com/v1/users'
  );

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [backendStatus, setBackendStatus] = useState<{
    checking: boolean;
    available: boolean;
    message: string;
    latencyMs?: number;
  }>({
    checking: false,
    available: false,
    message: 'Not checked yet',
  });

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: ConfirmDialogOptions;
    action: (() => void) | null;
  }>({
    open: false,
    options: { title: '', message: '' },
    action: null,
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<ToastNotification, 'id'>) => {
      const id = createId('toast');
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  // Sync theme to documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  // Persist draft request
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.draftRequest, JSON.stringify(activeRequest));
  }, [activeRequest]);

  const refreshBackendStatus = useCallback(async () => {
    setBackendStatus((prev) => ({ ...prev, checking: true }));
    const res = await checkBackendHealth();
    setBackendStatus({
      checking: false,
      available: res.available,
      message: res.message,
      latencyMs: res.latencyMs,
    });
  }, []);

  // Initial sync attempt with Express backend (graceful local fallback)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const health = await checkBackendHealth();
      if (!mounted) return;
      setBackendStatus({
        checking: false,
        available: health.available,
        message: health.message,
        latencyMs: health.latencyMs,
      });

      if (health.available) {
        const [colRes, histRes, envRes] = await Promise.all([
          fetchCollections(),
          fetchHistory(),
          fetchEnvironments(),
        ]);
        if (!mounted) return;
        if (colRes.syncedFromBackend) setCollections(colRes.collections);
        if (histRes.syncedFromBackend) setHistory(histRes.items);
        if (envRes.syncedFromBackend) setEnvironments(envRes.environments);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const activeEnvironment = useMemo(() => {
    if (activeEnvironmentId === 'none') return null;
    return environments.find((e) => e.id === activeEnvironmentId) || null;
  }, [environments, activeEnvironmentId]);

  const setActiveEnvironmentId = useCallback((envId: string) => {
    setActiveEnvIdState(envId);
    saveActiveEnvironmentId(envId);
  }, []);

  const addHistoryEntry = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 200);
      saveLocalHistory(next);
      return next;
    });
    void syncHistoryEntry(item);
  }, []);

  const sendActiveRequest = useCallback(
    async (overrideMode?: 'direct' | 'demo'): Promise<ApiResponseData> => {
      setIsSendingRequest(true);
      try {
        let response: ApiResponseData;
        if (overrideMode === 'demo') {
          response = buildSampleDemoResponse(activeRequest, activeEnvironment);
        } else if (overrideMode === 'direct') {
          response = await executeDirectBrowserRequest(
            activeRequest,
            activeEnvironment,
            settings.requestTimeoutMs
          );
        } else {
          response = await executeApiRequest(activeRequest, activeEnvironment, {
            timeoutMs: settings.requestTimeoutMs,
            executionPreference: settings.executionPreference,
            enforceSecurityGuard: settings.enforceSecurityGuard,
          });
        }

        setActiveResponse(response);

        const resolvedUrl = buildResolvedUrl(
          activeRequest.url,
          activeRequest.params,
          activeRequest.auth,
          activeEnvironment
        );

        addHistoryEntry({
          id: createId('hist'),
          request: JSON.parse(JSON.stringify(activeRequest)),
          resolvedUrl: resolvedUrl || activeRequest.url,
          status: response.status,
          statusText: response.statusText,
          durationMs: response.durationMs,
          sizeBytes: response.sizeBytes,
          success: !response.isError && response.status > 0 && response.status < 400,
          source: response.source,
          executedAt: response.timestamp,
          errorMessage: response.errorMessage,
        });

        if (response.securityBlocked) {
          notify({
            type: 'error',
            title: 'Blocked by API Security Guard',
            message: response.securityReason || 'Target URL failed SSRF safety verification.',
          });
        } else if (response.backendUnavailable) {
          notify({
            type: 'warning',
            title: 'Express Backend Unavailable',
            message: 'You can test CORS-enabled URLs directly in the browser or view a Sample Demo Response.',
          });
        } else if (response.isError) {
          notify({
            type: 'error',
            title: `Request Returned ${response.status || 'Error'}`,
            message: response.statusText,
          });
        } else {
          notify({
            type: 'success',
            title: `${response.status} ${response.statusText}`,
            message: `Completed in ${response.durationMs} ms`,
          });
        }

        return response;
      } finally {
        setIsSendingRequest(false);
      }
    },
    [activeRequest, activeEnvironment, settings, addHistoryEntry, notify]
  );

  const resetActiveRequest = useCallback(() => {
    setActiveRequest(createEmptyRequest());
    setActiveResponse(null);
  }, []);

  const loadRequestIntoBuilder = useCallback((req: ApiRequestConfig) => {
    setActiveRequest(JSON.parse(JSON.stringify(req)));
    setActiveResponse(null);
  }, []);

  const createCollection = useCallback((name: string, description: string): Collection => {
    const now = new Date().toISOString();
    const newCol: Collection = {
      id: createId('col'),
      name: name.trim(),
      description: description.trim(),
      folders: [],
      requests: [],
      createdAt: now,
      updatedAt: now,
    };
    setCollections((prev) => {
      const next = [newCol, ...prev];
      saveLocalCollections(next);
      return next;
    });
    void syncCreateCollection(newCol);
    return newCol;
  }, []);

  const updateCollection = useCallback((updated: Collection) => {
    const nextItem = { ...updated, updatedAt: new Date().toISOString() };
    setCollections((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? nextItem : c));
      saveLocalCollections(next);
      return next;
    });
    void syncUpdateCollection(nextItem);
  }, []);

  const deleteCollection = useCallback((collectionId: string) => {
    setCollections((prev) => {
      const next = prev.filter((c) => c.id !== collectionId);
      saveLocalCollections(next);
      return next;
    });
    void syncDeleteCollection(collectionId);
  }, []);

  const addFolderToCollection = useCallback((collectionId: string, folderName: string) => {
    setCollections((prev) => {
      const next = prev.map((col) => {
        if (col.id !== collectionId) return col;
        const updated = {
          ...col,
          updatedAt: new Date().toISOString(),
          folders: [
            ...col.folders,
            { id: createId('fld'), name: folderName.trim(), requests: [] },
          ],
        };
        void syncUpdateCollection(updated);
        return updated;
      });
      saveLocalCollections(next);
      return next;
    });
  }, []);

  const deleteFolderFromCollection = useCallback((collectionId: string, folderId: string) => {
    setCollections((prev) => {
      const next = prev.map((col) => {
        if (col.id !== collectionId) return col;
        const updated = {
          ...col,
          updatedAt: new Date().toISOString(),
          folders: col.folders.filter((f) => f.id !== folderId),
        };
        void syncUpdateCollection(updated);
        return updated;
      });
      saveLocalCollections(next);
      return next;
    });
  }, []);

  const saveRequestToCollection = useCallback(
    (
      request: ApiRequestConfig,
      collectionId: string,
      folderId?: string,
      requestName?: string
    ): SavedRequest => {
      const now = new Date().toISOString();
      const savedReq: SavedRequest = {
        ...JSON.parse(JSON.stringify(request)),
        id: request.id || createId('req'),
        name: (requestName || request.name || 'Untitled Request').trim(),
        collectionId,
        folderId: folderId || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setCollections((prev) => {
        const next = prev.map((col) => {
          if (col.id !== collectionId) return col;

          // Remove previous instance if updating
          const cleanedRoot = col.requests.filter((r) => r.id !== savedReq.id);
          const cleanedFolders = col.folders.map((f) => ({
            ...f,
            requests: f.requests.filter((r) => r.id !== savedReq.id),
          }));

          let updatedCol: Collection;
          if (folderId) {
            updatedCol = {
              ...col,
              updatedAt: now,
              requests: cleanedRoot,
              folders: cleanedFolders.map((f) =>
                f.id === folderId ? { ...f, requests: [...f.requests, savedReq] } : f
              ),
            };
          } else {
            updatedCol = {
              ...col,
              updatedAt: now,
              requests: [...cleanedRoot, savedReq],
              folders: cleanedFolders,
            };
          }
          void syncUpdateCollection(updatedCol);
          return updatedCol;
        });
        saveLocalCollections(next);
        return next;
      });

      setActiveRequest(savedReq);
      return savedReq;
    },
    []
  );

  const deleteRequestFromCollection = useCallback(
    (collectionId: string, requestId: string, folderId?: string) => {
      setCollections((prev) => {
        const next = prev.map((col) => {
          if (col.id !== collectionId) return col;
          const updated: Collection = {
            ...col,
            updatedAt: new Date().toISOString(),
            requests: folderId ? col.requests : col.requests.filter((r) => r.id !== requestId),
            folders: folderId
              ? col.folders.map((f) =>
                  f.id === folderId
                    ? { ...f, requests: f.requests.filter((r) => r.id !== requestId) }
                    : f
                )
              : col.folders,
          };
          void syncUpdateCollection(updated);
          return updated;
        });
        saveLocalCollections(next);
        return next;
      });
    },
    []
  );

  const clearAllHistory = useCallback(() => {
    setHistory([]);
    saveLocalHistory([]);
    void syncClearHistory();
  }, []);

  const saveEnvironment = useCallback((env: Environment) => {
    const updatedEnv = { ...env, updatedAt: new Date().toISOString() };
    setEnvironments((prev) => {
      const exists = prev.some((e) => e.id === updatedEnv.id);
      const next = exists
        ? prev.map((e) => (e.id === updatedEnv.id ? updatedEnv : e))
        : [...prev, updatedEnv];
      saveLocalEnvironments(next);
      return next;
    });
    void syncSaveEnvironment(updatedEnv);
  }, []);

  const deleteEnvironment = useCallback(
    (envId: string) => {
      setEnvironments((prev) => {
        const next = prev.filter((e) => e.id !== envId);
        saveLocalEnvironments(next);
        if (activeEnvironmentId === envId) {
          const fallback = next[0]?.id || 'none';
          setActiveEnvIdState(fallback);
          saveActiveEnvironmentId(fallback);
        }
        return next;
      });
      void syncDeleteEnvironment(envId);
    },
    [activeEnvironmentId]
  );

  const requestConfirm = useCallback((options: ConfirmDialogOptions, onConfirm: () => void) => {
    setConfirmState({ open: true, options, action: onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, open: false, action: null }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.action) {
      confirmState.action();
    }
    closeConfirm();
  }, [confirmState, closeConfirm]);

  const resetDemoWorkspace = useCallback(() => {
    setCollections(SEED_COLLECTIONS);
    saveLocalCollections(SEED_COLLECTIONS);
    setEnvironments(SEED_ENVIRONMENTS);
    saveLocalEnvironments(SEED_ENVIRONMENTS);
    setActiveEnvIdState('env_local');
    saveActiveEnvironmentId('env_local');
    setHistory([]);
    saveLocalHistory([]);
    notify({
      type: 'info',
      title: 'Workspace Reset',
      message: 'Seed collections and Local/Staging environments restored.',
    });
  }, [notify]);

  return (
    <WorkspaceContext.Provider
      value={{
        settings,
        updateSettings,
        toggleTheme,
        backendStatus,
        refreshBackendStatus,
        activeRequest,
        setActiveRequest,
        resetActiveRequest,
        loadRequestIntoBuilder,
        activeResponse,
        setActiveResponse,
        isSendingRequest,
        sendActiveRequest,
        collections,
        createCollection,
        updateCollection,
        deleteCollection,
        addFolderToCollection,
        deleteFolderFromCollection,
        saveRequestToCollection,
        deleteRequestFromCollection,
        history,
        addHistoryEntry,
        clearAllHistory,
        environments,
        activeEnvironmentId,
        activeEnvironment,
        setActiveEnvironmentId,
        saveEnvironment,
        deleteEnvironment,
        errorExplainerTargetCode,
        setErrorExplainerTargetCode,
        securityInspectorUrl,
        setSecurityInspectorUrl,
        toasts,
        notify,
        dismissToast,
        confirmDialog: {
          open: confirmState.open,
          options: confirmState.options,
          onConfirm: handleConfirm,
          close: closeConfirm,
        },
        requestConfirm,
        resetDemoWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
