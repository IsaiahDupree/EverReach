import { ok, options } from "@/lib/cors";

export const runtime = 'edge';

export function OPTIONS(req: Request){ return options(req); }

export function GET(req: Request){
  const commit = process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.NEXT_PUBLIC_COMMIT_SHA
    || process.env.COMMIT_SHA
    || '';
  const branch = process.env.VERCEL_GIT_COMMIT_REF
    || process.env.NEXT_PUBLIC_COMMIT_REF
    || process.env.COMMIT_REF
    || process.env.BRANCH
    || '';

  return ok({
    ok: true,
    ts: Date.now(),
    commit: commit || null,
    buildId: process.env.NEXT_BUILD_ID ?? null,
    branch: branch || null,
    deploymentUrl: process.env.VERCEL_URL ?? null,
    source: process.env.VERCEL ? 'vercel' : 'local',
  }, req);
}
