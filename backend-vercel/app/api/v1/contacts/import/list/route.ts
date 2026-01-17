/**
 * GET /api/v1/contacts/import/list
 * List recent import jobs for the current user
 */

import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { listImportJobs } from "@/lib/import-jobs";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  const jobs = await listImportJobs(req, user.id, limit);

  return ok({ jobs }, req);
}
