import { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';
import { options, ok, unauthorized, notFound, badRequest, serverError } from '@/lib/cors';
import { z } from 'zod';

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

const confirmSchema = z.object({
  contact_ids: z.array(z.string()).optional(),
  import_all: z.boolean().optional(),
}).refine(data => data.contact_ids || data.import_all, {
  message: 'Either contact_ids or import_all must be provided',
});

/**
 * POST /v1/contacts/import/jobs/{id}/confirm
 * 
 * Import selected contacts from preview
 * Body: { contact_ids: string[] } or { import_all: true }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const jobId = params.id;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    // Use service client for RLS bypass
    const supabase = getServiceClient();
    
    // Verify job belongs to user
    const { data: job, error: jobError } = await supabase
      .from('contact_import_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    
    if (jobError || !job) {
      return notFound('Import job not found', req);
    }
    
    if (job.status !== 'contacts_fetched') {
      return badRequest(`Job not ready for import. Current status: ${job.status}`, req);
    }

    // Get user's org_id
    const { data: orgRow } = await supabase
      .from('user_orgs')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!orgRow) {
      return serverError('User organization not found', req);
    }

    const orgId = orgRow.org_id;

    // Update job status to processing
    await supabase
      .from('contact_import_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Get contacts to import
    let query = supabase
      .from('import_preview_contacts')
      .select('*')
      .eq('job_id', jobId);
    
    if (!parsed.data.import_all && parsed.data.contact_ids) {
      query = query.in('id', parsed.data.contact_ids);
    }

    const { data: previewContacts } = await query;
    
    if (!previewContacts || previewContacts.length === 0) {
      return badRequest('No contacts selected', req);
    }

    // Import contacts
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const previewContact of previewContacts) {
      try {
        // Check if contact already exists (by email)
        if (previewContact.emails && Array.isArray(previewContact.emails) && previewContact.emails.length > 0) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', user.id)
            .contains('emails', previewContact.emails)
            .limit(1)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }
        }

        // Insert contact
        const { data: newContact, error: insertError } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            org_id: orgId,
            display_name: previewContact.display_name,
            emails: previewContact.emails || [],
            phones: previewContact.phones || [],
            company: previewContact.organization || null,
            notes: previewContact.notes || null,
            avatar_url: previewContact.photo_url || null, // Store external photo URL initially
            metadata: {
              import_source: `${job.provider}_import`,
              import_job_id: jobId,
              external_id: previewContact.external_id,
            },
          })
          .select('id, avatar_url')
          .single();

        if (insertError) {
          console.error('[Confirm] Failed to insert contact:', insertError);
          failed++;
        } else {
          imported++;

          // Queue photo download job if contact has a photo URL
          if (newContact?.avatar_url && newContact.avatar_url.startsWith('http')) {
            try {
              await supabase.rpc('queue_contact_photo_download', {
                p_contact_id: newContact.id,
                p_external_url: newContact.avatar_url,
              });
              console.log(`[Confirm] Queued photo download for contact ${newContact.id}`);
            } catch (photoErr) {
              console.error('[Confirm] Failed to queue photo download:', photoErr);
              // Don't fail the import if photo queueing fails
            }
          }
        }
      } catch (err) {
        console.error('[Confirm] Error processing contact:', err);
        failed++;
      }
    }

    // Update job status to completed
    await supabase
      .from('contact_import_jobs')
      .update({
        status: 'completed',
        imported_contacts: imported,
        skipped_contacts: skipped,
        failed_contacts: failed,
        processed_contacts: previewContacts.length,
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Clean up preview contacts
    await supabase
      .from('import_preview_contacts')
      .delete()
      .eq('job_id', jobId);

    console.log(`[Confirm] Job ${jobId}: imported=${imported}, skipped=${skipped}, failed=${failed}`);

    return ok({
      job_id: job.id,
      status: 'completed',
      imported_contacts: imported,
      skipped_contacts: skipped,
      failed_contacts: failed,
      total_processed: previewContacts.length,
    }, req);
    
  } catch (e: any) {
    console.error('[Confirm] Error:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
