import { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized, notFound, badRequest, serverError } from '@/lib/cors';

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /v1/contacts/import/jobs/{id}/preview
 * 
 * Returns list of fetched contacts for user to review before importing
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const jobId = params.id;

  try {
    const supabase = getClientOrThrow(req);
    
    // Verify job belongs to user and is in correct status
    const { data: job, error: jobError } = await supabase
      .from('contact_import_jobs')
      .select('id, status, provider, total_contacts')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    
    if (jobError || !job) {
      return notFound('Import job not found', req);
    }
    
    if (job.status !== 'contacts_fetched') {
      return badRequest(`Job not ready for preview. Current status: ${job.status}`, req);
    }

    // Get preview contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('import_preview_contacts')
      .select(`
        id,
        external_id,
        display_name,
        given_name,
        family_name,
        emails,
        phones,
        organization,
        job_title
      `)
      .eq('job_id', jobId)
      .order('display_name', { ascending: true });

    if (contactsError) {
      console.error('[Preview] Error fetching contacts:', contactsError);
      return serverError(contactsError.message, req);
    }

    return ok({
      job_id: job.id,
      provider: job.provider,
      total_contacts: contacts?.length || 0,
      contacts: contacts || [],
    }, req);
    
  } catch (e: any) {
    console.error('[Preview] Error:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
