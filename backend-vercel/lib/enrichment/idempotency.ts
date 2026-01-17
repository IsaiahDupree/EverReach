// lib/enrichment/idempotency.ts
// Idempotency system to prevent duplicate enrichments

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate idempotency key based on workspace, identifier, template, and date
 * 
 * Format: SHA-256(workspace|identifier|template|YYYY-MM-DD)
 * 
 * This ensures:
 * - Same enrichment request on same day returns cached result
 * - Different days get fresh enrichments
 * - Different templates are treated separately
 */
export function generateIdempotencyKey(
  workspaceId: string,
  payload: {
    email?: string;
    domain?: string;
    template: string;
  }
): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const identifier = payload.email || payload.domain || 'unknown';
  
  const input = `${workspaceId}|${identifier}|${payload.template}|${today}`;
  
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('hex');
}

/**
 * Check if enrichment with this key already exists (cached)
 */
export async function checkIdempotency(
  key: string
): Promise<{ exists: boolean; result?: any }> {
  try {
    const { data, error } = await supabase
      .from('enrichment_results')
      .select('result, created_at, expires_at')
      .eq('idempotency_key', key)
      .single();

    if (error || !data) {
      return { exists: false };
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Expired, delete it
      await supabase
        .from('enrichment_results')
        .delete()
        .eq('idempotency_key', key);
      
      return { exists: false };
    }

    return { 
      exists: true, 
      result: data.result 
    };
  } catch (error) {
    console.error('[Idempotency] Check failed:', error);
    return { exists: false };
  }
}

/**
 * Store enrichment result with idempotency key
 */
export async function storeIdempotencyResult(
  key: string,
  workspaceId: string,
  result: any,
  ttlDays: number = 7
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await supabase
      .from('enrichment_results')
      .upsert({
        idempotency_key: key,
        workspace_id: workspaceId,
        result,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'idempotency_key'
      });
  } catch (error) {
    console.error('[Idempotency] Store failed:', error);
    throw error;
  }
}

/**
 * Delete expired idempotency records
 * Should be run as a cron job
 */
export async function cleanupExpiredResults(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('enrichment_results')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('idempotency_key');

    if (error) {
      console.error('[Idempotency] Cleanup failed:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('[Idempotency] Cleanup failed:', error);
    return 0;
  }
}

/**
 * Generate a unique job ID for tracking
 */
export function generateJobId(): string {
  return crypto.randomUUID();
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Must be 64-character hex string (SHA-256)
  return /^[a-f0-9]{64}$/i.test(key);
}

/**
 * Get all cached results for a workspace (for debugging)
 */
export async function getCachedResults(
  workspaceId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('enrichment_results')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Idempotency] Get cached results failed:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Idempotency] Get cached results failed:', error);
    return [];
  }
}

/**
 * Clear all cached results for a workspace
 */
export async function clearWorkspaceCache(workspaceId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('enrichment_results')
      .delete()
      .eq('workspace_id', workspaceId)
      .select('idempotency_key');

    if (error) {
      console.error('[Idempotency] Clear cache failed:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('[Idempotency] Clear cache failed:', error);
    return 0;
  }
}
