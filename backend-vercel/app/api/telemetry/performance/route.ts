import { options, ok, serverError, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const runtime = "nodejs";

// CORS preflight
export function OPTIONS(req: Request){ return options(req); }

const performanceSchema = z.object({
  metric_name: z.string().min(1).max(100),
  value: z.number(),
  unit: z.enum(['ms', 'bytes', 'count', 'percent']).optional(),
  route: z.string().max(200).optional(),
  user_agent: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/telemetry/performance
export async function POST(req: Request){
  const origin = req.headers.get('origin') ?? undefined;
  
  const user = await getUser(req);
  if (!user) {
    return new Response(null, { 
      status: 204, // Success but no content (telemetry is optional)
      headers: buildCorsHeaders(origin) 
    });
  }

  // Rate limit: 100 requests per minute per user
  const rl = checkRateLimit(`u:${user.id}:telemetry:perf`, 100, 60_000);
  if (!rl.allowed) {
    return new Response(null, { 
      status: 204, // Still succeed silently
      headers: buildCorsHeaders(origin) 
    });
  }

  let body: unknown;
  try { 
    body = await req.json(); 
  } catch { 
    // Malformed JSON - succeed silently
    return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
  }

  const parsed = performanceSchema.safeParse(body);
  if (!parsed.success) {
    // Invalid data - succeed silently
    return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
  }

  try {
    const supabase = getClientOrThrow(req);

    // Check if user has analytics enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('analytics_opt_in')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!profile?.analytics_opt_in) {
      return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
    }

    // Insert performance metric
    await supabase
      .from('performance_metrics')
      .insert({
        user_id: user.id,
        metric_name: parsed.data.metric_name,
        value: parsed.data.value,
        unit: parsed.data.unit || 'ms',
        route: parsed.data.route,
        user_agent: parsed.data.user_agent || req.headers.get('user-agent'),
        metadata: parsed.data.metadata || {},
      });

    // Always return 204 (success, no content) for telemetry
    return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
  } catch (e: any) {
    // Telemetry failures should never break the app
    console.error('[Telemetry] Performance metric failed:', e);
    return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
  }
}
