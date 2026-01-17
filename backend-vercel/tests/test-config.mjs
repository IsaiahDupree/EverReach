/**
 * Test Configuration
 * Centralized config for all backend tests
 */

// Port and URL Configuration - use environment variables with defaults
export const TEST_CONFIG = {
  // Backend URL - configurable via env
  BACKEND_PORT: process.env.TEST_PORT || process.env.PORT || '3333',
  BACKEND_HOST: process.env.TEST_HOST || 'localhost',
  
  // Full URLs
  get LOCAL_URL() {
    return `http://${this.BACKEND_HOST}:${this.BACKEND_PORT}`;
  },
  PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://ever-reach-be.vercel.app',
  
  // Use local or production based on env
  get BASE_URL() {
    const useLocal = process.env.TEST_LOCAL === 'true' || process.env.USE_LOCAL === 'true';
    return process.env.TEST_BASE_URL || process.env.BACKEND_URL || (useLocal ? this.LOCAL_URL : this.PRODUCTION_URL);
  },

  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04',

  // Test Credentials
  TEST_EMAIL: process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com',
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'Frogger12',
};

/**
 * Get auth token automatically using test credentials
 * @returns {Promise<string|null>} Access token or null if auth fails
 */
export async function getAuthToken() {
  try {
    const response = await fetch(
      `${TEST_CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'apikey': TEST_CONFIG.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_CONFIG.TEST_EMAIL,
          password: TEST_CONFIG.TEST_PASSWORD,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Auth] Failed to obtain token:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('[Auth] ✅ Token obtained for:', TEST_CONFIG.TEST_EMAIL);
    return data.access_token;
  } catch (error) {
    console.error('[Auth] ❌ Error obtaining token:', error.message);
    return null;
  }
}

/**
 * Make authenticated API request
 */
export async function authFetch(path, options = {}) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Failed to obtain auth token');
  }

  const url = `${TEST_CONFIG.BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}

/**
 * Make unauthenticated API request
 */
export async function apiFetch(path, options = {}) {
  const url = `${TEST_CONFIG.BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}

// Log configuration on import
console.log('[Test Config] Backend URL:', TEST_CONFIG.BASE_URL);
console.log('[Test Config] Local URL:', TEST_CONFIG.LOCAL_URL);
console.log('[Test Config] Test Email:', TEST_CONFIG.TEST_EMAIL);
