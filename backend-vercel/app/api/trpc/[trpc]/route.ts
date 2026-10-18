import 'server-only';
import { buildCorsHeaders, options as corsOptions } from "@/lib/cors";

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const [{ fetchRequestHandler }, { appRouter }, { createContext }] = await Promise.all([
      import('@trpc/server/adapters/fetch'),
      import('@/backend/trpc/app-router'),
      import('@/backend/trpc/server'),
    ]);

    const res = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext,
      onError: ({ path, error }) => {
        console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
      },
    });

    // Append dynamic CORS headers
    const origin = request.headers.get('origin') ?? undefined;
    const cors = buildCorsHeaders(origin);
    const headers = new Headers(res.headers);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v as string));
    // Ensure JSON content type is preserved
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return new Response(res.body, { status: res.status, headers });
  } catch (error: any) {
    console.error('[tRPC API] Handler error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(request.headers.get('origin') ?? undefined) }
      }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

