import { ok, options } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";

export const runtime = 'nodejs';

const startTime = Date.now();

function getSupabase() { return getServiceClient(); }

async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now();
    const supabase = getSupabase();
    await supabase.from('profiles').select('count').limit(1).maybeSingle();
    const latency = Date.now() - start;
    return { status: 'healthy', latency };
  } catch (e) {
    return { status: 'unhealthy' };
  }
}

async function checkStripe(): Promise<{ status: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  return { status: key ? 'configured' : 'unconfigured' };
}

async function checkOpenAI(): Promise<{ status: string }> {
  const key = process.env.OPENAI_API_KEY;
  return { status: key ? 'configured' : 'unconfigured' };
}

export async function GET(req: Request) {
  const [database, stripe, openai] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkOpenAI(),
  ]);

  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const overallHealthy = database.status === 'healthy';

  return ok({
    status: overallHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database: database.status,
      database_latency_ms: database.latency,
      stripe: stripe.status,
      openai: openai.status,
    },
  }, req, { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=5' });
}

export async function OPTIONS(req: Request) {
  return options(req);
}
