/**
 * Integration Health Check API
 * GET /api/integrations/health
 * 
 * Check health status of integrated services
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized, badRequest, serverError } from '@/lib/cors';
import { getAdapter, getRegisteredServices } from '@/lib/dashboard/adapter-registry';
import type { HealthCheckResponse, ServiceHealth, IntegrationAccount } from '@/lib/dashboard/types';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/integrations/health
 * 
 * Query params:
 * - services: Comma-separated list of services to check (optional, defaults to all)
 * 
 * Example: /api/integrations/health?services=stripe,revenuecat
 */
export async function GET(req: NextRequest) {
  const supabase = getClientOrThrow(req);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return unauthorized('Authentication required', req);
    }

    // Get user's workspace
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.workspace_id) {
      return badRequest('No workspace found for user', req);
    }

    const workspaceId = profile.workspace_id;

    // Get services to check from query params
    const url = new URL(req.url);
    const servicesParam = url.searchParams.get('services');
    
    let servicesToCheck: string[];
    if (servicesParam) {
      servicesToCheck = servicesParam.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      // Check all registered services
      servicesToCheck = getRegisteredServices();
    }

    // Fetch integration accounts for these services
    const { data: accounts, error: accountsError } = await supabase
      .from('integration_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('service', servicesToCheck)
      .eq('is_active', true);

    if (accountsError) {
      console.error('[HealthCheck] Error fetching accounts:', accountsError);
      return serverError('Failed to fetch integration accounts', req);
    }

    // Check health for each service
    const results: ServiceHealth[] = [];
    
    for (const service of servicesToCheck) {
      const account = accounts?.find(a => a.service === service);
      
      if (!account) {
        // Service not configured
        results.push({
          service,
          status: 'UNKNOWN',
          latency_ms: null,
          last_success: null,
          last_check: new Date().toISOString(),
          message: 'Service not configured',
        });
        continue;
      }

      const adapter = getAdapter(service);
      
      if (!adapter) {
        // No adapter available
        results.push({
          service,
          status: 'UNKNOWN',
          latency_ms: null,
          last_success: null,
          last_check: new Date().toISOString(),
          message: 'Adapter not implemented',
        });
        continue;
      }

      try {
        // Check health
        const health = await adapter.fetchHealth(account as IntegrationAccount);
        results.push(health);

        // Update service_status table
        await supabase
          .from('service_status')
          .upsert({
            workspace_id: workspaceId,
            service,
            status: health.status,
            latency_ms: health.latency_ms,
            last_success: health.last_success,
            last_check: health.last_check,
            message: health.message || null,
            error_details: health.error_details || null,
          });

      } catch (error: any) {
        console.error(`[HealthCheck] Error checking ${service}:`, error);
        
        const failedHealth: ServiceHealth = {
          service,
          status: 'DOWN',
          latency_ms: null,
          last_success: null,
          last_check: new Date().toISOString(),
          message: error.message || 'Health check failed',
          error_details: {
            error: error.toString(),
          },
        };
        
        results.push(failedHealth);

        // Update service_status table
        await supabase
          .from('service_status')
          .upsert({
            workspace_id: workspaceId,
            service,
            status: 'DOWN',
            latency_ms: null,
            last_success: null,
            last_check: new Date().toISOString(),
            message: error.message || 'Health check failed',
            error_details: { error: error.toString() },
          });
      }
    }

    const response: HealthCheckResponse = {
      workspace_id: workspaceId,
      results,
    };

    return ok(response, req);

  } catch (error: any) {
    console.error('[HealthCheck] Unexpected error:', error);
    return serverError("Internal server error", req);
  }
}
