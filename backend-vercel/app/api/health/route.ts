import { ok, options } from "@/lib/cors";

export const runtime = 'edge';

export async function GET(req: Request) {
  return ok({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'production',
  }, req);
}

export async function OPTIONS(req: Request) {
  return options(req);
}
