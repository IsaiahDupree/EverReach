/**
 * API Endpoint Constants
 * 
 * Centralized endpoint definitions to make it clear exactly which
 * URLs we're hitting and make them easy to change per environment.
 */

import { backendBase } from '@/lib/api';
import { Platform } from 'react-native';

/**
 * Get the full backend base URL
 * Reads from EXPO_PUBLIC_API_URL or EXPO_PUBLIC_BACKEND_BASE env vars
 * 
 * Default (production): https://ever-reach-be.vercel.app
 */
let hasLoggedBackendBase = false;

export function getBackendBase(): string {
  const base = backendBase();
  
  // Log the base URL on first access for debugging
  if (!hasLoggedBackendBase) {
    console.log('[ENDPOINTS] Backend Base URL:', base || '(not set - using relative paths)');
    console.log('[ENDPOINTS] Platform:', Platform.OS);
    hasLoggedBackendBase = true;
  }
  
  return base;
}

/**
 * API v1 Endpoints
 * These are the current stable API routes
 */
export const API_ENDPOINTS = {
  // Auth & User
  ME: '/api/v1/me',
  ME_ENTITLEMENTS: '/api/v1/me/entitlements',
  ME_ACCOUNT: '/api/v1/me/account',
  ME_COMPOSE_SETTINGS: '/api/v1/me/compose-settings',
  
  // Contacts
  CONTACTS: '/api/v1/contacts',
  // Note: No /contacts/search endpoint - use POST /api/v1/search instead
  CONTACT_BY_ID: (id: string) => `/api/v1/contacts/${id}`,
  CONTACT_NOTES: (id: string) => `/api/v1/contacts/${id}/notes`,
  CONTACT_MESSAGES: (id: string) => `/api/v1/contacts/${id}/messages`,
  CONTACT_FILES: (id: string) => `/api/v1/contacts/${id}/files`,
  CONTACT_TAGS: (id: string) => `/api/v1/contacts/${id}/tags`,
  CONTACT_PIPELINE: (id: string) => `/api/v1/contacts/${id}/pipeline`,
  CONTACT_WARMTH: (id: string) => `/api/v1/contacts/${id}/warmth`,
  
  // Pipelines
  PIPELINES: '/api/v1/pipelines',
  PIPELINE_STAGES: (key: string) => `/api/v1/pipelines/${key}/stages`,
  
  // Templates
  TEMPLATES: '/api/v1/templates',
  TEMPLATE_BY_ID: (id: string) => `/api/v1/templates/${id}`,
  
  // Messages
  MESSAGES: '/api/v1/messages',
  MESSAGE_BY_ID: (id: string) => `/api/v1/messages/${id}`,
  MESSAGE_PREPARE: '/api/v1/messages/prepare',
  MESSAGE_SEND: '/api/v1/messages/send',
  
  // Interactions
  INTERACTIONS: '/api/v1/interactions',
  INTERACTION_BY_ID: (id: string) => `/api/v1/interactions/${id}`,
  
  // Goals
  GOALS: '/api/v1/goals',
  GOAL_BY_ID: (id: string) => `/api/v1/goals/${id}`,
  GOAL_PIN: (id: string) => `/api/v1/goals/${id}/pin`,
  
  // Persona Notes
  PERSONA_NOTES: '/api/v1/me/persona-notes',
  PERSONA_NOTE_BY_ID: (id: string) => `/api/v1/me/persona-notes/${id}`,
  
  // Files
  FILES: '/api/v1/files',
  
  // Search
  SEARCH: '/api/v1/search',
  
  // Operations
  OPS_HEALTH: '/api/v1/ops/health',
  OPS_CONFIG_STATUS: '/api/v1/ops/config-status',
  
  // Screenshot Analysis
  SCREENSHOTS: '/api/v1/screenshots',
  SCREENSHOT_BY_ID: (id: string) => `/api/v1/screenshots/${id}`,
  SCREENSHOT_ANALYZE: (id: string) => `/api/v1/screenshots/${id}/analyze`,
  
  // Billing & Subscription
  BILLING_RESTORE: '/api/v1/billing/restore',
  BILLING_PLAY_TRANSACTIONS: '/api/v1/billing/play/transactions',
  BILLING_APPSTORE_TRANSACTIONS: '/api/v1/billing/app-store/transactions',
  
  // Config
  CONFIG_PAYWALL_LIVE: '/api/v1/config/paywall-live',
  CONFIG_PAYWALL_STRATEGY: '/api/v1/config/paywall-strategy',
  
  // Onboarding
  ONBOARDING_STATUS: '/api/v1/me/onboarding-status',
  
  // Compose
  COMPOSE: '/api/v1/compose',
  
  // Events/Analytics
  EVENTS_TRACK: '/api/v1/events/track',
  
  // Transcription
  TRANSCRIBE: '/api/v1/transcribe',
  
  // Health
  HEALTH: '/api/health',
  VERSION: '/api/version',
} as const;

/**
 * Get the full URL for an endpoint
 * ALWAYS returns an absolute URL starting with https://
 */
export function getFullUrl(endpoint: string): string {
  // Validate endpoint parameter
  if (!endpoint || typeof endpoint !== 'string') {
    console.error('❌ Invalid endpoint provided to getFullUrl:', endpoint);
    return 'https://ever-reach-be.vercel.app/api/v1/invalid';
  }
  
  const base = getBackendBase();
  
  // Ensure we never return a relative URL
  if (!base || !base.startsWith('http')) {
    console.error('❌ CRITICAL: No valid backend base URL! Cannot make API calls.');
    console.error('👉 Check .env file for EXPO_PUBLIC_API_URL');
    console.error('👉 Platform:', Platform.OS);
    // Return a URL that will fail obviously
    return `https://NO-BACKEND-URL-CONFIGURED${endpoint}`;
  }
  
  // Build absolute URL - ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${base}${normalizedEndpoint}`;
  
  // Validate it's an absolute URL
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    console.error('❌ Generated URL is not absolute:', fullUrl);
    console.error('👉 Platform:', Platform.OS);
    return `https://ever-reach-be.vercel.app${normalizedEndpoint}`; // Fallback to production
  }
  
  return fullUrl;
}

/**
 * Check if an endpoint is available on the current platform
 * Some endpoints may have CORS issues on web
 */
export function isEndpointAvailable(endpoint: string): boolean {
  // On web, some endpoints might have CORS issues
  if (Platform.OS === 'web') {
    // List of endpoints known to have CORS issues on web
    const corsBlockedEndpoints: string[] = [
      // Add any endpoints that are blocked by CORS here
    ];
    
    return !corsBlockedEndpoints.some(blocked => endpoint.includes(blocked));
  }
  
  return true;
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
