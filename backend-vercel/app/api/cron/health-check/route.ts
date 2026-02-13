/**
 * Cron Job - Automated Health Checks
 * GET /api/cron/health-check
 * 
 * Runs health checks for all active integrations across all workspaces
 * Should be called by Vercel Cron or external scheduler every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getAdapter } from '@/lib/dashboard/adapter-registry';
import type { IntegrationAccount, ServiceHealth } from '@/lib/dashboard/types';

export const runtime = 'edge';
export const maxDuration = 60; // Max 60 seconds for cron job

/**
 * GET /api/cron/health-check
 * 
 * Protected by Vercel Cron Secret or API key
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    // Create Supabase admin client
    const supabase = getServiceClient();

    // Fetch all active integrations across all workspaces
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_accounts')
      .select('*')
      .eq('is_active', true);

    if (integrationsError) {
      console.error('[Cron] Error fetching integrations:', integrationsError);
      return NextResponse.json({ 
        error: 'Failed to fetch integrations',
        details: integrationsError.message 
      }, { status: 500 });
    }

    const results: { workspace_id: string; service: string; status: string; error?: string }[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Check health for each integration
    for (const integration of integrations || []) {
      const adapter = getAdapter(integration.service);
      
      if (!adapter) {
        results.push({
          workspace_id: integration.workspace_id,
          service: integration.service,
          status: 'UNKNOWN',
          error: 'No adapter available',
        });
        continue;
      }

      try {
        // Perform health check
        const health: ServiceHealth = await adapter.fetchHealth(integration as IntegrationAccount);
        
        // Update service_status table
        const { error: upsertError } = await supabase
          .from('service_status')
          .upsert({
            workspace_id: integration.workspace_id,
            service: integration.service,
            status: health.status,
            latency_ms: health.latency_ms,
            last_success: health.last_success,
            last_check: health.last_check,
            message: health.message || null,
            error_details: health.error_details || null,
          }, {
            onConflict: 'workspace_id,service'
          });
        
        if (upsertError) {
          console.error(`[Cron] Failed to upsert status for ${integration.service}:`, upsertError);
        }

        results.push({
          workspace_id: integration.workspace_id,
          service: integration.service,
          status: health.status,
        });

        if (health.status === 'UP') {
          successCount++;
        } else {
          failureCount++;
        }

      } catch (error: any) {
        console.error(`[Cron] Health check failed for ${integration.service}:`, error);
        
        // Update with failure
        const { error: upsertError } = await supabase
          .from('service_status')
          .upsert({
            workspace_id: integration.workspace_id,
            service: integration.service,
            status: 'DOWN',
            latency_ms: null,
            last_success: null,
            last_check: new Date().toISOString(),
            message: error.message || 'Health check failed',
            error_details: { error: error.toString() },
          }, {
            onConflict: 'workspace_id,service'
          });
        
        if (upsertError) {
          console.error(`[Cron] Failed to upsert failure status for ${integration.service}:`, upsertError);
        }

        results.push({
          workspace_id: integration.workspace_id,
          service: integration.service,
          status: 'DOWN',
          error: error.message,
        });

        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
      },
      results,
    });

  } catch (error: any) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
