/**
 * Public API Authentication
 * 
 * Verify API keys, check scopes, enforce tenant isolation
 */

import { getSupabaseServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

// Build-safe: do NOT create a Supabase client at module load time. Always
// fetch the client inside functions so Next.js page data collection doesn't
// evaluate env vars during build.

// ============================================================================
// TYPES
// ============================================================================

export interface ApiPrincipal {
  apiKeyId: string;
  orgId: string;
  scopes: string[];
  environment: 'test' | 'live';
}

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public type: string = 'unauthorized'
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

// ============================================================================
// API KEY GENERATION
// ============================================================================

/**
 * Generate a new API key with secure random bytes
 */
export function generateApiKey(environment: 'test' | 'live'): string {
  const prefix = environment === 'test' ? 'evr_test_' : 'evr_live_';
  const randomBytes = crypto.randomBytes(32).toString('hex'); // 64 chars
  return `${prefix}${randomBytes}`;
}

/**
 * Hash API key for storage (Argon2id would be better in production)
 */
export function hashApiKey(key: string): string {
  // In production, use Argon2id
  // For now, use SHA256 (less secure but simpler)
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract key prefix for display (first 12 chars)
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, 12) + '...';
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authenticate API request from Authorization header
 */
export async function authenticateRequest(
  authHeader: string | null,
  ipAddress: string,
  userAgent: string
): Promise<ApiPrincipal> {
  if (!authHeader) {
    throw new ApiAuthError('Missing Authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiAuthError('Invalid Authorization header format');
  }

  const apiKey = authHeader.substring(7).trim();
  
  // Validate key format
  if (!apiKey.startsWith('evr_test_') && !apiKey.startsWith('evr_live_')) {
    throw new ApiAuthError('Invalid API key format');
  }

  const keyHash = hashApiKey(apiKey);

  // Verify key in database
  const { data, error } = await getSupabaseServiceClient().rpc('verify_api_key', {
    p_key_hash: keyHash,
  });

  if (error || !data || data.length === 0) {
    throw new ApiAuthError('Invalid API key');
  }

  const keyData = data[0];

  // Update last used metadata (async, don't await)
  getSupabaseServiceClient().rpc('update_api_key_usage', {
    p_api_key_id: keyData.api_key_id,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  }).then(({ error }) => {
    if (error) console.error('Failed to update key usage:', error);
  });

  return {
    apiKeyId: keyData.api_key_id,
    orgId: keyData.org_id,
    scopes: keyData.scopes,
    environment: apiKey.startsWith('evr_test_') ? 'test' : 'live',
  };
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

/**
 * Check if principal has required scope
 */
export function hasScope(principal: ApiPrincipal, requiredScope: string): boolean {
  const scopes = principal.scopes;

  // Check exact match
  if (scopes.includes(requiredScope)) {
    return true;
  }

  // Check wildcard (e.g., 'contacts:*' covers 'contacts:read')
  const [resource] = requiredScope.split(':');
  if (scopes.includes(`${resource}:*`)) {
    return true;
  }

  // Check full wildcard
  if (scopes.includes('*')) {
    return true;
  }

  return false;
}

/**
 * Require specific scope (throws if missing)
 */
export function requireScope(principal: ApiPrincipal, requiredScope: string): void {
  if (!hasScope(principal, requiredScope)) {
    throw new ApiAuthError(
      `Missing required scope: ${requiredScope}`,
      403,
      'forbidden'
    );
  }
}

/**
 * Require any of the provided scopes
 */
export function requireAnyScope(principal: ApiPrincipal, requiredScopes: string[]): void {
  for (const scope of requiredScopes) {
    if (hasScope(principal, scope)) {
      return;
    }
  }

  throw new ApiAuthError(
    `Missing required scopes: ${requiredScopes.join(' or ')}`,
    403,
    'forbidden'
  );
}

// ============================================================================
// TENANT ISOLATION
// ============================================================================

/**
 * Set tenant context for RLS policies
 * Call this before any database queries
 */
export async function setTenantContext(orgId: string): Promise<void> {
  await getSupabaseServiceClient().rpc('set', {
    config_parameter: 'app.tenant_id',
    value: orgId,
  });
}

/**
 * Verify resource belongs to tenant
 */
export async function verifyResourceOwnership(
  orgId: string,
  table: string,
  resourceId: string
): Promise<boolean> {
  const { data, error } = await getSupabaseServiceClient()
    .from(table)
    .select('org_id')
    .eq('id', resourceId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.org_id === orgId;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogData {
  requestId: string;
  apiKeyId: string;
  orgId: string;
  method: string;
  path: string;
  queryParams?: Record<string, any>;
  statusCode: number;
  responseTimeMs: number;
  errorType?: string;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
}

/**
 * Log API request to audit trail
 */
export async function logApiRequest(data: AuditLogData): Promise<void> {
  try {
    await getSupabaseServiceClient().from('api_audit_logs').insert({
      request_id: data.requestId,
      api_key_id: data.apiKeyId,
      org_id: data.orgId,
      method: data.method,
      path: data.path,
      query_params: data.queryParams,
      status_code: data.statusCode,
      response_time_ms: data.responseTimeMs,
      error_type: data.errorType,
      error_message: data.errorMessage,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      action: data.action,
    });
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  const prefix = 'req_';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}${randomBytes}`;
}

// ============================================================================
// IP ADDRESS EXTRACTION
// ============================================================================

/**
 * Extract real IP address from request headers
 */
export function getIpAddress(request: Request): string {
  // Check X-Forwarded-For header (Vercel, CloudFlare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return '0.0.0.0';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  authenticateRequest,
  hasScope,
  requireScope,
  requireAnyScope,
  setTenantContext,
  verifyResourceOwnership,
  logApiRequest,
  generateRequestId,
  getIpAddress,
};
