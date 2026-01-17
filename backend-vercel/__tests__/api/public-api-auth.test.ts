/**
 * Public API Authentication Tests
 * 
 * Tests API key generation, verification, scopes, and tenant isolation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  authenticateRequest,
  hasScope,
  requireScope,
  requireAnyScope,
  verifyResourceOwnership,
  ApiAuthError,
} from '@/lib/api/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testUserId: string;
let testContactId: string;
let testApiKeyId: string;
let testApiKey: string;

beforeAll(async () => {
  // Create test org and user
  const { data: org } = await supabase.from('orgs').insert({
    name: 'Test Org - Public API',
  }).select().single();
  testOrgId = org!.id;

  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `publicapi-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // Create test contact
  const { data: contact, error: contactError } = await supabase.from('contacts').insert({
    org_id: testOrgId,
    display_name: 'Test Contact',
    emails: ['test@example.com'],
    user_id: testUserId,
  }).select().single();
  
  if (contactError || !contact) {
    console.error('Failed to create test contact:', contactError);
    throw new Error(`Failed to create test contact: ${contactError?.message || 'No data returned'}`);
  }
  
  testContactId = contact.id;

  // Create test API key
  testApiKey = generateApiKey('test');
  const keyHash = hashApiKey(testApiKey);
  const { data: apiKey } = await supabase.from('api_keys').insert({
    org_id: testOrgId,
    key_prefix: getKeyPrefix(testApiKey),
    key_hash: keyHash,
    name: 'Test API Key',
    environment: 'test',
    scopes: ['contacts:read', 'contacts:write', 'warmth:read'],
    created_by: testUserId,
  }).select().single();
  testApiKeyId = apiKey!.id;
});

afterAll(async () => {
  // Cleanup
  await supabase.from('api_keys').delete().eq('id', testApiKeyId);
  await supabase.from('contacts').delete().eq('id', testContactId);
  await supabase.from('orgs').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// API KEY GENERATION TESTS
// ============================================================================

describe('API Key Generation', () => {
  test('should generate test key with correct prefix', () => {
    const key = generateApiKey('test');
    expect(key).toMatch(/^evr_test_[a-f0-9]{64}$/);
  });

  test('should generate live key with correct prefix', () => {
    const key = generateApiKey('live');
    expect(key).toMatch(/^evr_live_[a-f0-9]{64}$/);
  });

  test('should generate unique keys', () => {
    const key1 = generateApiKey('test');
    const key2 = generateApiKey('test');
    expect(key1).not.toBe(key2);
  });

  test('should hash keys consistently', () => {
    const key = generateApiKey('test');
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 produces 64 hex chars
  });

  test('should extract key prefix for display', () => {
    const key = 'evr_test_abcdef1234567890';
    const prefix = getKeyPrefix(key);
    expect(prefix).toBe('evr_test_abc...');
  });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('API Authentication', () => {
  test('should authenticate valid API key', async () => {
    const authHeader = `Bearer ${testApiKey}`;
    const principal = await authenticateRequest(authHeader, '192.168.1.1', 'test-agent');

    expect(principal).toBeDefined();
    expect(principal.orgId).toBe(testOrgId);
    expect(principal.apiKeyId).toBe(testApiKeyId);
    expect(principal.scopes).toContain('contacts:read');
    expect(principal.environment).toBe('test');
  });

  test('should reject missing Authorization header', async () => {
    await expect(
      authenticateRequest(null, '192.168.1.1', 'test-agent')
    ).rejects.toThrow(ApiAuthError);
  });

  test('should reject invalid Authorization header format', async () => {
    await expect(
      authenticateRequest('InvalidFormat', '192.168.1.1', 'test-agent')
    ).rejects.toThrow('Invalid Authorization header format');
  });

  test('should reject invalid API key format', async () => {
    await expect(
      authenticateRequest('Bearer invalid_key_format', '192.168.1.1', 'test-agent')
    ).rejects.toThrow('Invalid API key format');
  });

  test('should reject non-existent API key', async () => {
    const fakeKey = generateApiKey('test');
    await expect(
      authenticateRequest(`Bearer ${fakeKey}`, '192.168.1.1', 'test-agent')
    ).rejects.toThrow('Invalid API key');
  });

  test('should reject revoked API key', async () => {
    // Create and immediately revoke a key
    const revokedKey = generateApiKey('test');
    const keyHash = hashApiKey(revokedKey);
    
    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(revokedKey),
      key_hash: keyHash,
      display_name: 'Revoked Key',
      environment: 'test',
      scopes: ['contacts:read'],
      revoked: true,
      revoked_reason: 'Test revocation',
      user_id: testUserId,
    }).select().single();

    await expect(
      authenticateRequest(`Bearer ${revokedKey}`, '192.168.1.1', 'test-agent')
    ).rejects.toThrow('Invalid API key');

    // Cleanup
    await supabase.from('api_keys').delete().eq('id', apiKey!.id);
  });

  test('should reject expired API key', async () => {
    // Create key that expired yesterday
    const expiredKey = generateApiKey('test');
    const keyHash = hashApiKey(expiredKey);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(expiredKey),
      key_hash: keyHash,
      display_name: 'Expired Key',
      environment: 'test',
      scopes: ['contacts:read'],
      expires_at: yesterday.toISOString(),
      user_id: testUserId,
    }).select().single();

    await expect(
      authenticateRequest(`Bearer ${expiredKey}`, '192.168.1.1', 'test-agent')
    ).rejects.toThrow('Invalid API key');

    // Cleanup
    if (apiKey?.id) {
      await supabase.from('api_keys').delete().eq('id', apiKey.id);
    }
  });

  test('should update key usage metadata', async () => {
    const authHeader = `Bearer ${testApiKey}`;
    await authenticateRequest(authHeader, '10.0.0.1', 'custom-agent/1.0');

    // Wait a bit for async update
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: key } = await supabase
      .from('api_keys')
      .select('last_used_at, last_used_ip, last_used_user_agent, usage_count')
      .eq('id', testApiKeyId)
      .single();

    expect(key).toBeDefined();
    expect(key!.last_used_at).toBeTruthy();
    expect(key!.last_used_ip).toBe('10.0.0.1');
    expect(key!.last_used_user_agent).toBe('custom-agent/1.0');
    expect(key!.usage_count).toBeGreaterThan(0);
  });
});

// ============================================================================
// AUTHORIZATION (SCOPES) TESTS
// ============================================================================

describe('Authorization & Scopes', () => {
  const principal = {
    apiKeyId: testApiKeyId,
    orgId: testOrgId,
    scopes: ['contacts:read', 'contacts:write', 'warmth:read'],
    environment: 'test' as const,
  };

  test('should allow access with exact scope match', () => {
    expect(hasScope(principal, 'contacts:read')).toBe(true);
    expect(hasScope(principal, 'contacts:write')).toBe(true);
    expect(hasScope(principal, 'warmth:read')).toBe(true);
  });

  test('should deny access without required scope', () => {
    expect(hasScope(principal, 'contacts:delete')).toBe(false);
    expect(hasScope(principal, 'warmth:write')).toBe(false);
    expect(hasScope(principal, 'outbox:write')).toBe(false);
  });

  test('should support wildcard scopes', () => {
    const wildcardPrincipal = {
      ...principal,
      scopes: ['contacts:*', 'warmth:read'],
    };

    expect(hasScope(wildcardPrincipal, 'contacts:read')).toBe(true);
    expect(hasScope(wildcardPrincipal, 'contacts:write')).toBe(true);
    expect(hasScope(wildcardPrincipal, 'contacts:delete')).toBe(true);
    expect(hasScope(wildcardPrincipal, 'warmth:write')).toBe(false);
  });

  test('should support full wildcard scope', () => {
    const fullAccessPrincipal = {
      ...principal,
      scopes: ['*'],
    };

    expect(hasScope(fullAccessPrincipal, 'contacts:read')).toBe(true);
    expect(hasScope(fullAccessPrincipal, 'warmth:write')).toBe(true);
    expect(hasScope(fullAccessPrincipal, 'outbox:approve')).toBe(true);
  });

  test('should throw on missing required scope', () => {
    expect(() => requireScope(principal, 'contacts:delete')).toThrow(ApiAuthError);
    expect(() => requireScope(principal, 'contacts:delete')).toThrow('Missing required scope');
  });

  test('should not throw on present required scope', () => {
    expect(() => requireScope(principal, 'contacts:read')).not.toThrow();
  });

  test('should require any of multiple scopes', () => {
    expect(() => requireAnyScope(principal, ['contacts:read', 'warmth:read'])).not.toThrow();
    expect(() => requireAnyScope(principal, ['contacts:delete', 'outbox:write'])).toThrow();
  });
});

// ============================================================================
// TENANT ISOLATION TESTS
// ============================================================================

describe('Tenant Isolation', () => {
  test('should verify resource ownership for owned resource', async () => {
    const owned = await verifyResourceOwnership(testOrgId, 'contacts', testContactId);
    expect(owned).toBe(true);
  });

  test('should deny resource ownership for non-owned resource', async () => {
    // Create another org and contact
    const { data: otherOrg } = await supabase.from('orgs').insert({
    name: 'Other Org',
    }).select().single();

    const { data: otherContact } = await supabase.from('contacts').insert({
      org_id: otherOrg!.id,
      display_name: 'Other Contact',
      email: 'other@example.com',
    }).select().single();

    const owned = await verifyResourceOwnership(testOrgId, 'contacts', otherContact!.id);
    expect(owned).toBe(false);

    // Cleanup
    await supabase.from('contacts').delete().eq('id', otherContact!.id);
    await supabase.from('orgs').delete().eq('id', otherOrg!.id);
  });

  test('should deny ownership for non-existent resource', async () => {
    const owned = await verifyResourceOwnership(testOrgId, 'contacts', '00000000-0000-0000-0000-000000000000');
    expect(owned).toBe(false);
  });
});

// ============================================================================
// IP ALLOWLIST TESTS
// ============================================================================

describe('IP Allowlists', () => {
  test('should allow request from allowed IP', async () => {
    // Create key with IP allowlist
    const restrictedKey = generateApiKey('test');
    const keyHash = hashApiKey(restrictedKey);

    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(restrictedKey),
      key_hash: keyHash,
      display_name: 'IP Restricted Key',
      environment: 'test',
      scopes: ['contacts:read'],
      ip_allowlist: ['192.168.1.0/24', '10.0.0.1'],
      user_id: testUserId,
    }).select().single();

    // This test assumes IP checking is implemented in authenticateRequest
    // Currently it's not, so this is a placeholder for future implementation
    
    // Cleanup
    await supabase.from('api_keys').delete().eq('id', apiKey!.id);
  });
});

// ============================================================================
// KEY ROTATION TESTS
// ============================================================================

describe('API Key Rotation', () => {
  test('should support key rotation workflow', async () => {
    // 1. Create original key
    const originalKey = generateApiKey('test');
    const originalHash = hashApiKey(originalKey);

    const { data: original } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(originalKey),
      key_hash: originalHash,
      display_name: 'Original Key',
      environment: 'test',
      scopes: ['contacts:read'],
      user_id: testUserId,
    }).select().single();

    // 2. Verify original works
    const principal1 = await authenticateRequest(
      `Bearer ${originalKey}`,
      '192.168.1.1',
      'test-agent'
    );
    expect(principal1.apiKeyId).toBe(original!.id);

    // 3. Create new key (rotation)
    const newKey = generateApiKey('test');
    const newHash = hashApiKey(newKey);

    const { data: rotated } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(newKey),
      key_hash: newHash,
      display_name: 'Rotated Key',
      environment: 'test',
      scopes: ['contacts:read'],
      user_id: testUserId,
    }).select().single();

    // 4. Verify new key works
    const principal2 = await authenticateRequest(
      `Bearer ${newKey}`,
      '192.168.1.1',
      'test-agent'
    );
    expect(principal2.apiKeyId).toBe(rotated!.id);

    // 5. Revoke old key
    await supabase.from('api_keys').update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: 'Rotated to new key',
    }).eq('id', original!.id);

    // 6. Verify old key no longer works
    await expect(
      authenticateRequest(`Bearer ${originalKey}`, '192.168.1.1', 'test-agent')
    ).rejects.toThrow('Invalid API key');

    // Cleanup
    await supabase.from('api_keys').delete().eq('id', original!.id);
    await supabase.from('api_keys').delete().eq('id', rotated!.id);
  });
});

// ============================================================================
// SCOPE COMBINATIONS TESTS
// ============================================================================

describe('Complex Scope Scenarios', () => {
  test('should handle read-only agent correctly', async () => {
    const readOnlyKey = generateApiKey('test');
    const keyHash = hashApiKey(readOnlyKey);

    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(readOnlyKey),
      key_hash: keyHash,
      display_name: 'Read-Only Agent',
      environment: 'test',
      scopes: ['contacts:read', 'interactions:read', 'warmth:read'],
      user_id: testUserId,
    }).select().single();

    const principal = await authenticateRequest(
      `Bearer ${readOnlyKey}`,
      '192.168.1.1',
      'readonly-agent'
    );

    // Should have read access
    expect(hasScope(principal, 'contacts:read')).toBe(true);
    expect(hasScope(principal, 'interactions:read')).toBe(true);
    
    // Should NOT have write access
    expect(hasScope(principal, 'contacts:write')).toBe(false);
    expect(hasScope(principal, 'warmth:write')).toBe(false);
    expect(hasScope(principal, 'outbox:write')).toBe(false);

    // Cleanup
    await supabase.from('api_keys').delete().eq('id', apiKey!.id);
  });

  test('should handle autonomous agent correctly', async () => {
    const agentKey = generateApiKey('live');
    const keyHash = hashApiKey(agentKey);

    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: getKeyPrefix(agentKey),
      key_hash: keyHash,
      display_name: 'Autonomous Agent',
      environment: 'live',
      scopes: [
        'contacts:read',
        'interactions:read',
        'interactions:write',
        'warmth:read',
        'warmth:recompute',
        'outbox:write',
        // Note: outbox:approve intentionally excluded (requires human)
      ],
      user_id: testUserId,
    }).select().single();

    const principal = await authenticateRequest(
      `Bearer ${agentKey}`,
      '192.168.1.1',
      'autonomous-agent'
    );

    // Should be able to read and log interactions
    expect(hasScope(principal, 'interactions:read')).toBe(true);
    expect(hasScope(principal, 'interactions:write')).toBe(true);
    
    // Should be able to queue messages
    expect(hasScope(principal, 'outbox:write')).toBe(true);
    
    // Should NOT be able to approve (human-in-the-loop)
    expect(hasScope(principal, 'outbox:approve')).toBe(false);

    // Cleanup
    await supabase.from('api_keys').delete().eq('id', apiKey!.id);
  });
});

console.log('✅ Public API Authentication Tests Complete');
