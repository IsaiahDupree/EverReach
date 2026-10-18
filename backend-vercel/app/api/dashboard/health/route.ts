/**
 * Dashboard Health API
 * GET /api/dashboard/health
 * 
 * Returns service health status for Evidence dashboards
 * Query params: workspace_id, service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * GET /api/dashboard/health
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspace_id = searchParams.get('workspace_id');
    const service = searchParams.get('service');

    const supabase = getServiceClient();

    // Query latest_service_status view
    let query = supabase
      .from('latest_service_status')
      .select('*');

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    }

    if (service) {
      query = query.eq('service', service);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API] Error fetching health:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch health status',
         
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      services: data || [],
    });

  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
       
    }, { status: 500 });
  }
}
