/**
 * Content Engine Health Endpoint
 * GET /api/v1/content/health
 *
 * Checks: Supabase connectivity via direct HTTP call and OpenAI API key
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const issues = [];

    // 1. Check Supabase connectivity via HTTP
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      issues.push('SUPABASE_URL not configured');
    } else {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          },
        });
        if (!response.ok && response.status !== 401) {
          issues.push(`Supabase HTTP check failed: ${response.status}`);
        }
      } catch (e) {
        issues.push(`Supabase connectivity error: ${String(e)}`);
      }
    }

    // 2. Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      issues.push('OPENAI_API_KEY not configured');
    }

    // 3. Check required environment variables
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      issues.push('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const isHealthy = issues.length === 0;

    return NextResponse.json(
      {
        ok: isHealthy,
        supabase: supabaseUrl ? 'configured' : 'missing',
        openai_key: apiKey ? 'present' : 'missing',
        service_key: serviceKey ? 'present' : 'missing',
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
