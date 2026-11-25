export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthType = 'none' | 'api-key' | 'bearer' | 'basic';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
  isSecret?: boolean;
}

export interface AuthConfig {
  type: AuthType;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: 'header' | 'query';
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
}

export interface ApiRequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  auth: AuthConfig;
  bodyType: 'none' | 'json' | 'raw';
  body: string;
  collectionId?: string;
  folderId?: string;
}

export type ResponseSource = 'backend-proxy' | 'direct-browser' | 'demo-preview';

export interface ApiResponseData {
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  body: unknown;
  rawBody: string;
  timestamp: string;
  source: ResponseSource;
  url: string;
  method: HttpMethod;
  isError: boolean;
  errorMessage?: string;
  backendUnavailable?: boolean;
  securityBlocked?: boolean;
  securityReason?: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'pass';

export interface ValidationIssue {
  id: string;
  field: 'url' | 'method' | 'headers' | 'body' | 'auth' | 'params' | 'environment';
  severity: ValidationSeverity;
  title: string;
  message: string;
  suggestion?: string;
  autoFixType?: 'add-content-type' | 'trim-url' | 'format-json' | 'add-https' | 'clear-get-body';
}

export interface ValidationResult {
  status: 'valid' | 'warning' | 'invalid';
  scoreLabel: string;
  issues: ValidationIssue[];
  checkedAt: string;
  evaluatedBy: 'backend' | 'client-preview';
}

export type SecurityVerdict = 'safe' | 'warning' | 'blocked';

export interface SecurityRuleCheck {
  id: string;
  rule: string;
  status: SecurityVerdict;
  detail: string;
}

export interface SecurityCheckResult {
  verdict: SecurityVerdict;
  allowed: boolean;
  targetUrl: string;
  resolvedHostname?: string;
  reason: string;
  ssrfRiskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  checks: SecurityRuleCheck[];
  evaluatedBy: 'backend' | 'client-preview';
  checkedAt: string;
}

export interface ErrorExplanation {
  statusCode: number;
  title: string;
  category: 'Client Error (4xx)' | 'Server Error (5xx)' | 'Network / Transport';
  summary: string;
  beginnerExplanation: string;
  possibleCauses: string[];
  practicalSolutions: string[];
  troubleshootingSteps: string[];
  exampleFix?: string;
}

export interface SavedRequest extends ApiRequestConfig {
  createdAt: string;
  updatedAt: string;
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: SavedRequest[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  folders: CollectionFolder[];
  requests: SavedRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  request: ApiRequestConfig;
  resolvedUrl: string;
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  success: boolean;
  source: ResponseSource;
  executedAt: string;
  errorMessage?: string;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  variables: EnvVariable[];
  isDefault?: boolean;
  updatedAt: string;
}

export type ExecutionPreference = 'backend-first' | 'direct-only';

export interface AppSettings {
  theme: 'dark' | 'light';
  backendBaseUrl: string;
  executionPreference: ExecutionPreference;
  requestTimeoutMs: number;
  autoValidateBeforeSend: boolean;
  enforceSecurityGuard: boolean;
  jsonIndentSpaces: 2 | 4;
  compactTables: boolean;
}

export type RunnerItemStatus = 'pending' | 'running' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface RunnerExecutionItem {
  requestId: string;
  requestName: string;
  folderName?: string;
  method: HttpMethod;
  url: string;
  status: RunnerItemStatus;
  httpStatus?: number;
  statusText?: string;
  durationMs?: number;
  errorMessage?: string;
  source?: ResponseSource;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}
