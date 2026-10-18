/**
 * Frontend CORS Utility
 * 
 * Helper functions for making cross-origin requests from the web frontend
 * to the backend API with proper headers and error handling.
 */

// Backend API base URL
const getBackendBase = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_BASE || 
         process.env.NEXT_PUBLIC_API_URL || 
         'https://ever-reach-be.vercel.app';
};

// Frontend origin for CORS
const getOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_ORIGIN || 
         process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
         'https://everreach.app';
};

/**
 * Standard fetch headers for API requests
 */
export function getApiHeaders(authToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Origin': getOrigin(),
    'Accept': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

/**
 * Make a CORS-enabled API request
 */
export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: HeadersInit;
    authToken?: string;
  } = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const {
    method = 'GET',
    body,
    headers = {},
    authToken,
  } = options;

  const url = `${getBackendBase()}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...getApiHeaders(authToken),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Send cookies for auth
    });

    let data: T | null = null;
    let error: string | null = null;

    // Try to parse JSON response
    try {
      const json = await response.json();
      if (response.ok) {
        data = json;
      } else {
        error = json.error || json.message || `HTTP ${response.status}`;
      }
    } catch (parseError) {
      if (!response.ok) {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    return { data, error, status: response.status };
  } catch (networkError) {
    return {
      data: null,
      error: networkError instanceof Error ? networkError.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(
  path: string,
  authToken?: string
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiRequest<T>(path, { method: 'GET', authToken });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  path: string,
  body: any,
  authToken?: string
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiRequest<T>(path, { method: 'POST', body, authToken });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = any>(
  path: string,
  body: any,
  authToken?: string
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiRequest<T>(path, { method: 'PATCH', body, authToken });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  path: string,
  authToken?: string
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiRequest<T>(path, { method: 'DELETE', authToken });
}

/**
 * Upload file with multipart/form-data
 */
export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  authToken?: string
): Promise<{ data: T | null; error: string | null; status: number }> {
  const url = `${getBackendBase()}${path}`;

  try {
    const headers: HeadersInit = {
      'Origin': getOrigin(),
      // Don't set Content-Type - browser will set it with boundary for FormData
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    let data: T | null = null;
    let error: string | null = null;

    try {
      const json = await response.json();
      if (response.ok) {
        data = json;
      } else {
        error = json.error || json.message || `HTTP ${response.status}`;
      }
    } catch (parseError) {
      if (!response.ok) {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    return { data, error, status: response.status };
  } catch (networkError) {
    return {
      data: null,
      error: networkError instanceof Error ? networkError.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * Check if backend is reachable
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const { status } = await apiGet('/api/health');
    return status === 200;
  } catch {
    return false;
  }
}

export const BACKEND_BASE = getBackendBase();
export const ORIGIN = getOrigin();
