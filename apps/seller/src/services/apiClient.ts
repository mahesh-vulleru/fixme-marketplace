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
let csrfTokenPromise: Promise<string | null> | null = null;

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

/**
 * Proactively fetches a fresh CSRF token from the server with in-flight deduplication
 */
export async function fetchCsrfToken(): Promise<string | null> {
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as ApiSuccessResponse<{ csrfToken: string }>;
      if (payload.success && payload.data?.csrfToken) {
        setCsrfToken(payload.data.csrfToken);
        return payload.data.csrfToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isLogout = path.includes('/auth/logout');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (isMutating && !isLogout) {
    let token = getCsrfToken();
    if (!token) {
      token = await fetchCsrfToken();
    }
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let payload: (ApiSuccessResponse<T> | ApiErrorResponse) | null = null;
  try {
    payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
  } catch {
    // Non-JSON or empty response
  }

  // Handle CSRF validation failure with a single controlled refresh & retry
  if (
    !isRetry &&
    response.status === 403 &&
    isMutating &&
    !isLogout &&
    (payload as ApiErrorResponse)?.error?.code === 'CSRF_VALIDATION_FAILED'
  ) {
    setCsrfToken(null);
    const freshToken = await fetchCsrfToken();
    if (freshToken) {
      headers['X-CSRF-Token'] = freshToken;
      return apiRequest<T>(path, { ...options, headers }, true);
    }
  }

  if (!response.ok || !payload?.success) {
    const errPayload = payload as ApiErrorResponse;
    throw new ApiClientError(
      errPayload?.error?.message || `HTTP Error ${response.status}`,
      errPayload?.error?.code || 'HTTP_ERROR',
      response.status,
      errPayload?.error?.details,
      errPayload?.requestId
    );
  }

  return (payload as ApiSuccessResponse<T>).data;
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
