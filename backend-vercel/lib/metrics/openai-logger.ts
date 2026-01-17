import { createClient } from '@supabase/supabase-js';

type OpenAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type LogOpenAIUsageParams = {
  feature: string;
  user_id?: string;
  model: string;
  usage: OpenAIUsage;
  cost_usd?: number;
};

// Pricing per 1M tokens (as of Nov 2024)
const PRICING = {
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4-turbo-preview': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'gpt-3.5-turbo-16k': { input: 3, output: 4 },
};

function calculateCost(model: string, usage: OpenAIUsage): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-3.5-turbo'];
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export async function logOpenAIUsage(params: LogOpenAIUsageParams) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[OpenAI Logger] Missing Supabase credentials, skipping metrics');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const cost = params.cost_usd || calculateCost(params.model, params.usage);
  const ts = new Date().toISOString();
  const labels = {
    feature: params.feature,
    user_id: params.user_id,
    model: params.model
  };

  // Log multiple metrics in parallel
  const metrics = [
    {
      metric_name: 'openai.tokens_in',
      value: params.usage.prompt_tokens,
      ts,
      labels
    },
    {
      metric_name: 'openai.tokens_out',
      value: params.usage.completion_tokens,
      ts,
      labels
    },
    {
      metric_name: 'openai.cost_usd',
      value: cost,
      ts,
      labels
    }
  ];

  const { error } = await supabase.from('metrics_timeseries').insert(metrics);

  if (error) {
    console.error('[OpenAI Logger] Failed to log metrics:', error);
  } else {
    console.log(`[OpenAI Logger] Logged ${params.usage.total_tokens} tokens, $${cost.toFixed(4)} for ${params.feature}`);
  }
}

// Wrapper for OpenAI client to auto-log usage
export function wrapOpenAIResponse(feature: string, user_id?: string) {
  return async (response: any) => {
    if (response.usage) {
      await logOpenAIUsage({
        feature,
        user_id,
        model: response.model,
        usage: response.usage
      });
    }
    return response;
  };
}
