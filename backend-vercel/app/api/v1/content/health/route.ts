/**
 * Content Engine Health Endpoint
 * GET /api/v1/content/health
 *
 * Checks: Supabase connectivity, OpenAI API key, content_templates count,
 * active model_weights exists
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getServiceClient();
    const issues = [];

    // 1. Check Supabase connectivity
    const { data: templateCount, error: countErr } = await supabase
      .from('content_templates')
      .select('id', { count: 'exact', head: true });

    if (countErr || !templateCount || templateCount.length === 0) {
      issues.push('Supabase connectivity failed or no templates found');
    }

    // 2. Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      issues.push('OPENAI_API_KEY not configured');
    }

    // 3. Check active model weights
    const { data: activeWeights, error: weightsErr } = await supabase
      .from('model_weights')
      .select('id')
      .eq('is_active', true)
      .single();

    if (weightsErr || !activeWeights) {
      issues.push('No active model_weights found');
    }

    const isHealthy = issues.length === 0;

    return NextResponse.json(
      {
        ok: isHealthy,
        supabase: 'connected',
        openai_key: apiKey ? 'present' : 'missing',
        templates: templateCount?.length || 0,
        model_weights: activeWeights ? 'active' : 'missing',
        issues: issues.length > 0 ? issues : undefined,
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { ok: false, error: String(error), issues: ['Unexpected error during health check'] },
      { status: 503 }
    );
  }
}
