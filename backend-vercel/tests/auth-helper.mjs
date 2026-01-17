/**
 * Auth Helper for Backend Tests
 * Provides authentication utilities for test suite
 */

import fetch from 'node-fetch';

const TEST_USER_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_USER_PASSWORD = 'Frogger12';
const BACKEND_BASE_URL = process.env.TEST_BACKEND_URL || 'https://ever-reach-be.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';

// Cache the auth token to avoid rate limiting
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get authentication token for test user via Supabase (cached)
 * @returns {Promise<string>} JWT access token
 */
export async function getAuthToken() {
  // Return cached token if still valid (tokens last 1 hour)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Use Supabase auth API directly
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase auth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Cache for 50 minutes (tokens last 1 hour)
  tokenExpiry = Date.now() + (50 * 60 * 1000);
  
  return cachedToken;
}

/**
 * Create authenticated fetch wrapper
 * @param {string} token - JWT token
 * @returns {Function} Authenticated fetch function
 */
export function createAuthenticatedFetch(token) {
  return async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };
}

/**
 * Helper to make authenticated API requests
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function authenticatedRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  const authFetch = createAuthenticatedFetch(token);
  
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${BACKEND_BASE_URL}${endpoint}`;
    
  return authFetch(url, options);
}

/**
 * Parse response as JSON with error handling
 * @param {Response} response
 * @returns {Promise<Object>}
 */
export async function parseJsonResponse(response) {
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

/**
 * Assert response status
 * @param {Response} response
 * @param {number} expectedStatus
 */
export function assertStatus(response, expectedStatus) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

export {
  getAuthToken,
  createAuthenticatedFetch,
  authenticatedRequest,
  parseJsonResponse,
  assertStatus,
  BACKEND_BASE_URL,
};

export default {
  getAuthToken,
  createAuthenticatedFetch,
  authenticatedRequest,
  parseJsonResponse,
  assertStatus,
  BACKEND_BASE_URL,
};
