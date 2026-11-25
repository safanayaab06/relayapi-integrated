import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_ENDPOINTS, getEffectiveBackendUrl } from '../config/apiConfig';

export class BackendUnavailableError extends Error {
  public readonly attemptedUrl: string;

  constructor(message: string, attemptedUrl: string) {
    super(message);
    this.name = 'BackendUnavailableError';
    this.attemptedUrl = attemptedUrl;
  }
}

export class ApiServiceError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createBackendClient(timeoutMs = 15000): AxiosInstance {
  const client = axios.create({
    baseURL: getEffectiveBackendUrl(),
    timeout: timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    config.baseURL = getEffectiveBackendUrl();
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; error?: string }>) => {
      if (!error.response) {
        const baseUrl = getEffectiveBackendUrl();
        const url = `${baseUrl}${error.config?.url || ''}`;
        return Promise.reject(
          new BackendUnavailableError(
            `Unable to reach Express backend at ${baseUrl}. Ensure your Node.js/Express server is running and CORS is enabled.`,
            url
          )
        );
      }

      const status = error.response.status;
      const serverMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        error.message ||
        `Request failed with status ${status}`;

      return Promise.reject(new ApiServiceError(serverMessage, status, error.response.data));
    }
  );

  return client;
}

export const backendClient = createBackendClient();

export async function checkBackendHealth(): Promise<{
  available: boolean;
  baseUrl: string;
  latencyMs?: number;
  message: string;
}> {
  const baseUrl = getEffectiveBackendUrl();
  const start = performance.now();
  try {
    await backendClient.get(API_ENDPOINTS.health, { timeout: 3500 });
    const latencyMs = Math.round(performance.now() - start);
    return {
      available: true,
      baseUrl,
      latencyMs,
      message: `Connected to Express backend (${latencyMs} ms)`,
    };
  } catch (err) {
    if (err instanceof ApiServiceError && err.statusCode < 500) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        available: true,
        baseUrl,
        latencyMs,
        message: `Backend reachable (${err.statusCode})`,
      };
    }
    return {
      available: false,
      baseUrl,
      message:
        err instanceof Error
          ? err.message
          : `Express backend unavailable at ${baseUrl}`,
    };
  }
}
