import { NextRequest, NextResponse } from 'next/server';
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, unauthorized, notFound, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * GET /v1/contacts/import/status/[jobId]
 * 
 * Get status of an import job
 * 
 * Returns job details including progress, status, and results
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);

  try {
    // Get job summary using helper function
    const { data, error } = await supabase
      .rpc('get_import_job_summary', { p_job_id: params.jobId });

    if (error) {
      console.error('[Import Status] Database error:', error);
      return serverError(`Failed to get import status: ${error.message}`, req);
    }

    if (!data) {
      return notFound('Import job not found', req);
    }

    return ok(data, req);

  } catch (error: any) {
    console.error('[Import Status] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
