import { ApiResponse } from '../types';

let cachedCsrfToken: string | null = null;

export function setCsrfToken(token: string) {
  cachedCsrfToken = token;
}

export function getCsrfToken(): string | null {
  if (cachedCsrfToken) return cachedCsrfToken;
  // Fallback to cookie
  const match = document.cookie.match(new RegExp('(^| )csrfToken=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Set CSRF token for mutating methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send and receive cookies
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err: unknown) {
    throw new ApiError('Network connection error. Please verify backend is running.', 0);
  }

  // Handle 401 Unauthorized by attempting session refresh once
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.data?.csrfToken) {
            setCsrfToken(refreshData.data.csrfToken);
          }
          isRefreshing = false;
          onRefreshed(refreshData.data?.csrfToken || '');
          // Retry original request
          return apiClient<T>(endpoint, options);
        } else {
          isRefreshing = false;
          // Refresh failed; clear cache and redirect or re-throw
          throw new ApiError('Session expired. Please log in again.', 401);
        }
      } catch (e) {
        isRefreshing = false;
        throw e;
      }
    } else {
      // Queue requests until refresh completes
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(() => {
          apiClient<T>(endpoint, options).then(resolve).catch(reject);
        });
      });
    }
  }

  // Handle CSV and binary downloads
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.error || json.message || `Request failed with status ${response.status}`,
      response.status,
      json.details
    );
  }

  return json.data as T;
}
