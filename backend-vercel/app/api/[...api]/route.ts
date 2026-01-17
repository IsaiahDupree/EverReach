// Catch-all API route - removed Hono dependency
// This backend uses tRPC at /api/trpc and specific route handlers

import { buildCorsHeaders, options as corsOptions } from "@/lib/cors";

export const runtime = 'edge';

function notFound(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  const headers = { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) } as HeadersInit;
  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: 'Use /api/trpc for tRPC calls or /api/health for health checks',
    }),
    { status: 404, headers }
  );
}

export async function GET(req: Request) { return notFound(req); }
export async function POST(req: Request) { return notFound(req); }
export async function PUT(req: Request) { return notFound(req); }
export async function DELETE(req: Request) { return notFound(req); }
export async function PATCH(req: Request) { return notFound(req); }
export async function OPTIONS(req: Request) { return corsOptions(req); }
