/**
 * API Endpoint Constants
 * 
 * Centralized endpoint definitions to make it clear exactly which
 * URLs we're hitting and make them easy to change per environment.
 */

import { backendBase } from '@/lib/api';

/**
 * Get the full backend base URL
 * Reads from EXPO_PUBLIC_API_URL or EXPO_PUBLIC_BACKEND_BASE env vars
 * 
 * Default (production): https://ever-reach-be.vercel.app
 */
export function getBackendBase(): string {
  const base = backendBase();
  
  // Log the base URL on first access for debugging
  if (!getBackendBase.logged) {
    console.log('[ENDPOINTS] Backend Base URL:', base || '(not set - using relative paths)');
    getBackendBase.logged = true;
  }
  
  return base;
}
getBackendBase.logged = false;

/**
 * API v1 Endpoints
 * These are the current stable API routes
 */
export const API_ENDPOINTS = {
  // Auth & User
  ME: '/api/v1/me',
  ME_ENTITLEMENTS: '/api/v1/me/entitlements',
  
  // Contacts
  CONTACTS: '/api/v1/contacts',
  CONTACTS_SEARCH: '/api/v1/contacts/search',
  CONTACT_BY_ID: (id: string) => `/api/v1/contacts/${id}`,
  
  // Pipelines
  PIPELINES: '/api/v1/pipelines',
  PIPELINE_STAGES: (key: string) => `/api/v1/pipelines/${key}/stages`,
  
  // Templates
  TEMPLATES: '/api/v1/templates',
  TEMPLATE_BY_ID: (id: string) => `/api/v1/templates/${id}`,
  
  // Persona Notes
  PERSONA_NOTES: '/api/v1/me/persona-notes',
  
  // Health
  HEALTH: '/api/health',
  VERSION: '/api/version',
} as const;

/**
 * Get the full URL for an endpoint
 * ALWAYS returns an absolute URL starting with https://
 */
export function getFullUrl(endpoint: string): string {
  const base = getBackendBase();
  
  // Ensure we never return a relative URL
  if (!base || !base.startsWith('http')) {
    console.error('❌ CRITICAL: No valid backend base URL! Cannot make API calls.');
    console.error('👉 Check .env file for EXPO_PUBLIC_API_URL');
    // Return a URL that will fail obviously
    return `https://NO-BACKEND-URL-CONFIGURED${endpoint}`;
  }
  
  // Build absolute URL
  const fullUrl = `${base}${endpoint}`;
  
  // Validate it's an absolute URL
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    console.error('❌ Generated URL is not absolute:', fullUrl);
    return `https://ever-reach-be.vercel.app${endpoint}`; // Fallback to production
  }
  
  return fullUrl;
}

/**
 * Log API endpoint details for debugging
 */
export function logEndpointInfo(endpoint: string, method: string = 'GET') {
  const fullUrl = getFullUrl(endpoint);
  console.log('═════════════════════════════════════════');
  console.log('🎯 ENDPOINT INFO');
  console.log('═════════════════════════════════════════');
  console.log('📍 Endpoint:', endpoint);
  console.log('🌐 Full URL:', fullUrl);
  console.log('📤 Method:', method);
  console.log('🔗 Base:', getBackendBase() || '(none - relative)');
  console.log('═════════════════════════════════════════');
}
