/**
 * GET /api/v1/contacts/import/status/[id]
 * Get the status of a specific import job
 */

import { options, ok, unauthorized, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getImportJob } from "@/lib/import-jobs";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const jobId = params.id;
  const job = await getImportJob(req, jobId, user.id);

  if (!job) {
    return notFound('Import job not found', req);
  }

  return ok(job, req);
}
