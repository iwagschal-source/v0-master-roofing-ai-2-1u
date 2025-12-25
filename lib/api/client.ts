/**
 * API Client Configuration
 * Centralized HTTP client for all backend API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_NAMESPACE = process.env.NEXT_PUBLIC_API_NAMESPACE || '/v1';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

export const API_CONFIG = {
  baseURL: `${API_URL}${API_NAMESPACE}`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/**
 * API Error class for structured error handling
 */
export class APIError extends Error {
  status: number;
  statusText: string;
  data?: any;

  constructor(message: string, status: number, statusText: string, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Generic fetch wrapper with error handling and timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError('Request timeout', 408, 'Request Timeout');
    }
    throw error;
  }
}

/**
 * Main API request function
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;

  const headers = {
    ...API_CONFIG.headers,
    ...options.headers,
  };

  // Add API key if configured
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || errorData.message || `HTTP ${response.status}`,
        response.status,
        response.statusText,
        errorData
      );
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Network error - check your connection',
        0,
        'Network Error'
      );
    }

    // Handle other errors
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      'Internal Error'
    );
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};