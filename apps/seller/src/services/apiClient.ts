import {
  ApiSuccessResponse,
  ApiErrorResponse,
  HealthCheckData,
} from '@fixme/api-contracts';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

let csrfTokenCache: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfTokenCache = token;
  if (token) {
    try {
      sessionStorage.setItem('fixme_csrf_token', token);
    } catch {
      // ignore
    }
  } else {
    try {
      sessionStorage.removeItem('fixme_csrf_token');
    } catch {
      // ignore
    }
  }
}

export function getCsrfToken(): string | null {
  if (!csrfTokenCache) {
    try {
      csrfTokenCache = sessionStorage.getItem('fixme_csrf_token');
    } catch {
      // ignore
    }
  }
  return csrfTokenCache;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const activeCsrfToken = getCsrfToken();
  if (
    activeCsrfToken &&
    options.method &&
    !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())
  ) {
    headers['X-CSRF-Token'] = activeCsrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const payload = (await response.json()) as
    | ApiSuccessResponse<T>
    | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    const errPayload = payload as ApiErrorResponse;
    throw new ApiClientError(
      errPayload?.error?.message || `HTTP Error ${response.status}`,
      errPayload?.error?.code || 'HTTP_ERROR',
      response.status,
      errPayload?.error?.details,
      errPayload?.requestId
    );
  }

  return payload.data;
}

export const apiFetch = apiRequest;

export function formatINRFromPaise(paise: number | undefined | null): string {
  const safePaise = typeof paise === 'number' && !Number.isNaN(paise) ? paise : 0;
  return `₹${(safePaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const healthService = {
  checkHealth: () => apiRequest<HealthCheckData>('/health'),
};

