import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/etl/openai-usage
 * Daily ETL job to pull OpenAI usage and cost metrics
 * 
 * Fetches:
 * - Token usage (prompt + completion) by model
 * - API call counts
 * - Estimated costs in USD
 * - Usage by feature (chat, voice-notes, analysis, composition)
 * 
 * Can poll OpenAI Usage API or calculate from local logs
 * Should be called daily via cron
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID;

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI not configured',
        message: 'Set OPENAI_API_KEY' 
      }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    const results: Record<string, any> = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Helper to log metrics
    async function logMetric(metric_name: string, value: number, labels: Record<string, any> = {}) {
      const { error } = await supabase.from('metrics_timeseries').insert({
        metric_name,
        value,
        ts: yesterday.toISOString(),
        labels: {
          ...labels,
          date: yesterdayStr
        }
      });
      if (error) throw error;
    }

    // Update service status
    async function updateServiceStatus(status: 'healthy' | 'degraded' | 'down', latency_ms: number, message?: string) {
      await supabase.from('service_status').upsert({
        service: 'openai',
        status,
        latency_ms,
        last_check: now.toISOString(),
        last_success: status === 'healthy' ? now.toISOString() : undefined,
        last_failure: status !== 'healthy' ? now.toISOString() : undefined,
        message,
        updated_at: now.toISOString()
      }, { onConflict: 'service' });
    }

    const startTime = Date.now();

    try {
      // =============================================
      // Option 1: Query local agent_conversations for usage
      // This is faster and doesn't require OpenAI API quota
      // =============================================
      
      // Get all AI calls from yesterday
      const { data: conversations, error: convError } = await supabase
        .from('agent_conversations')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', now.toISOString());

      if (convError) throw convError;

      // Aggregate by model and feature
      const usageByModel: Record<string, { calls: number, tokens_in: number, tokens_out: number, cost_usd: number }> = {};
      const usageByFeature: Record<string, { calls: number, tokens_in: number, tokens_out: number, cost_usd: number }> = {};

      // OpenAI pricing (as of Nov 2024)
      const pricing: Record<string, { input: number, output: number }> = {
        'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
        'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
        'gpt-4-turbo': { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000 },
        'gpt-3.5-turbo': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 },
        'text-embedding-3-small': { input: 0.02 / 1_000_000, output: 0 },
        'text-embedding-3-large': { input: 0.13 / 1_000_000, output: 0 },
        'whisper-1': { input: 0.006 / 60, output: 0 }, // $0.006 per minute
        'tts-1': { input: 15.00 / 1_000_000, output: 0 }, // characters
        'tts-1-hd': { input: 30.00 / 1_000_000, output: 0 }
      };

      for (const conv of conversations || []) {
        const model = conv.model || 'gpt-4o-mini';
        const feature = conv.feature || 'unknown'; // e.g., 'chat', 'voice-note', 'analysis'
        const tokensIn = conv.tokens_in || 0;
        const tokensOut = conv.tokens_out || 0;
        
        // Calculate cost
        const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
        const cost = (tokensIn * modelPricing.input) + (tokensOut * modelPricing.output);

        // Aggregate by model
        if (!usageByModel[model]) {
          usageByModel[model] = { calls: 0, tokens_in: 0, tokens_out: 0, cost_usd: 0 };
        }
        usageByModel[model].calls += 1;
        usageByModel[model].tokens_in += tokensIn;
        usageByModel[model].tokens_out += tokensOut;
        usageByModel[model].cost_usd += cost;

        // Aggregate by feature
        if (!usageByFeature[feature]) {
          usageByFeature[feature] = { calls: 0, tokens_in: 0, tokens_out: 0, cost_usd: 0 };
        }
        usageByFeature[feature].calls += 1;
        usageByFeature[feature].tokens_in += tokensIn;
        usageByFeature[feature].tokens_out += tokensOut;
        usageByFeature[feature].cost_usd += cost;
      }

      // Log metrics by model
      for (const [model, usage] of Object.entries(usageByModel)) {
        await logMetric('openai.api_calls', usage.calls, { model });
        await logMetric('openai.tokens_in', usage.tokens_in, { model });
        await logMetric('openai.tokens_out', usage.tokens_out, { model });
        await logMetric('openai.cost_usd', usage.cost_usd, { model });
      }

      // Log metrics by feature
      for (const [feature, usage] of Object.entries(usageByFeature)) {
        await logMetric('openai.api_calls_by_feature', usage.calls, { feature });
        await logMetric('openai.tokens_by_feature', usage.tokens_in + usage.tokens_out, { feature });
        await logMetric('openai.cost_by_feature', usage.cost_usd, { feature });
      }

      // Calculate totals
      const totalCalls = Object.values(usageByModel).reduce((sum, u) => sum + u.calls, 0);
      const totalTokensIn = Object.values(usageByModel).reduce((sum, u) => sum + u.tokens_in, 0);
      const totalTokensOut = Object.values(usageByModel).reduce((sum, u) => sum + u.tokens_out, 0);
      const totalCost = Object.values(usageByModel).reduce((sum, u) => sum + u.cost_usd, 0);

      await logMetric('openai.total_calls', totalCalls);
      await logMetric('openai.total_tokens_in', totalTokensIn);
      await logMetric('openai.total_tokens_out', totalTokensOut);
      await logMetric('openai.total_cost_usd', totalCost);

      results.by_model = usageByModel;
      results.by_feature = usageByFeature;
      results.totals = {
        calls: totalCalls,
        tokens_in: totalTokensIn,
        tokens_out: totalTokensOut,
        cost_usd: totalCost.toFixed(4)
      };

      // =============================================
      // Option 2: Query OpenAI Usage API (alternative)
      // Requires OPENAI_ORG_ID and uses API quota
      // =============================================
      /*
      if (OPENAI_ORG_ID) {
        const usageUrl = `https://api.openai.com/v1/usage?date=${yesterdayStr}`;
        const response = await fetch(usageUrl, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Organization': OPENAI_ORG_ID
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Process data.data array
          // Each entry has: timestamp, model, tokens, etc.
        }
      }
      */

      const latency = Date.now() - startTime;
      await updateServiceStatus('healthy', latency, 'Usage tracking completed');

      return NextResponse.json({
        success: true,
        date: yesterdayStr,
        results,
        message: 'OpenAI usage ETL completed'
      });

    } catch (error: any) {
      const latency = Date.now() - startTime;
      await updateServiceStatus('degraded', latency, error.message);
      throw error;
    }

  } catch (error: any) {
    console.error('[openai-usage-etl] Error:', error);
    return NextResponse.json({
      error: 'ETL failed',
      details: error.message
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'openai-usage-etl',
    description: 'Daily ETL job for OpenAI usage and cost tracking',
    schedule: 'Call via cron daily at 03:00 UTC',
    timestamp: new Date().toISOString()
  });
}

/**
 * Production Implementation Guide:
 * 
 * Local Tracking (Recommended):
 * 1. Log all OpenAI calls to agent_conversations table
 * 2. Include: model, tokens_in, tokens_out, feature, user_id
 * 3. Calculate costs using current pricing
 * 4. Benefits: No API quota usage, instant access, feature-level breakdown
 * 
 * OpenAI Usage API (Alternative):
 * 1. Endpoint: GET https://api.openai.com/v1/usage?date=YYYY-MM-DD
 * 2. Requires organization ID and higher API tier
 * 3. Returns aggregated data by model
 * 4. Limitations: No feature-level breakdown, delayed data
 * 
 * Cost Optimization:
 * 1. Track by feature to identify expensive use cases
 * 2. Set budget alerts (e.g., > $100/day)
 * 3. Monitor token efficiency (output/input ratio)
 * 4. Use cheaper models where appropriate (gpt-4o-mini vs gpt-4o)
 * 
 * Pricing Updates:
 * 1. Update pricing table quarterly
 * 2. Store in database config table for easy updates
 * 3. Track pricing changes over time for cost trend analysis
 * 
 * Advanced Metrics:
 * - Average cost per user per day
 * - Cost per conversation
 * - Model performance vs cost tradeoffs
 * - Feature ROI (value generated vs cost)
 */
