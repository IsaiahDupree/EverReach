import { ok, options } from "@/lib/cors";

export const runtime = 'edge';

export async function GET(req: Request) {
  return ok({
    status: 'ok',
    message: 'Ever Reach Backend API is running',
    time: new Date().toISOString(),
  }, req);
}

export async function OPTIONS(req: Request) {
  return options(req);
}
