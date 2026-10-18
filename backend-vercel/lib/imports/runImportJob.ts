import { getServiceClient } from '@/lib/supabase';
import { getProvider } from '@/lib/imports/provider';
import type { ImportProvider } from '@/lib/imports/types';

/**
 * Run a contact import job
 * 
 * This is the core processing logic shared by:
 * - Callback route (deprecated - should use cron)
 * - Cron route (production - reliable on Vercel)
 * 
 * @param jobId - The import job ID
 * @param providerName - The provider name (google, microsoft)
 * @param accessToken - The OAuth access token
 */
export async function runImportJob(
  jobId: string,
  providerName: ImportProvider,
  accessToken: string
): Promise<void> {
  console.log(`[Import Job ${jobId}] Starting (${providerName})...`);

  const provider = getProvider(providerName);
  const supabase = getServiceClient();

  try {
    // Load job user_id
    const { data: jobRow, error: jobLoadErr } = await supabase
      .from('contact_import_jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (jobLoadErr || !jobRow) {
      console.error(`[Import Job ${jobId}] Failed to load job:`, jobLoadErr);
      throw new Error('Import job not found');
    }

    const userId = jobRow.user_id;

    // Get user's org_id (required for contacts table)
    const { data: orgRow, error: orgErr } = await supabase
      .from('user_orgs')
      .select('org_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (orgErr || !orgRow) {
      console.error(`[Import Job ${jobId}] Failed to load user org:`, orgErr);
      throw new Error('User organization not found');
    }

    const orgId = orgRow.org_id;
    let allContacts: any[] = [];
    let pageToken: string | undefined;
    let totalContacts = 0;

    // Fetch all pages from provider
    console.log(`[Import Job ${jobId}] Fetching contacts from ${providerName}...`);
    
    do {
      const result = await provider.fetchContacts(accessToken, pageToken);
      allContacts = allContacts.concat(result.contacts);
      pageToken = result.nextPageToken;
      totalContacts = result.totalContacts || allContacts.length;

      // Update progress
      const { error: progErr } = await supabase
        .from('contact_import_jobs')
        .update({
          total_contacts: totalContacts,
          processed_contacts: allContacts.length,
        })
        .eq('id', jobId);

      if (progErr) {
        console.error(`[Import Job ${jobId}] Progress update failed:`, progErr);
      }

      console.log(`[Import Job ${jobId}] Fetched ${allContacts.length}/${totalContacts} contacts`);
    } while (pageToken);

    // Save contacts to preview table for user selection
    console.log(`[Import Job ${jobId}] Saving ${allContacts.length} contacts to preview table...`);
    
    const previewContacts = allContacts.map(contact => ({
      job_id: jobId,
      external_id: contact.provider_contact_id,
      display_name: contact.display_name,
      given_name: contact.given_name || null,
      family_name: contact.family_name || null,
      emails: contact.emails || [],
      phones: contact.phones || [],
      organization: contact.company || null,
      job_title: contact.job_title || null,
      notes: contact.notes || null,
      raw_data: contact.raw_data || {},
    }));

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < previewContacts.length; i += batchSize) {
      const batch = previewContacts.slice(i, i + batchSize);
      const { error: batchErr } = await supabase
        .from('import_preview_contacts')
        .insert(batch);

      if (batchErr) {
        console.error(`[Import Job ${jobId}] Failed to insert preview batch ${i}:`, batchErr);
        throw new Error(`Failed to save contacts to preview: ${batchErr.message}`);
      }
    }

    // Mark job as contacts_fetched (user needs to review and select)
    console.log(`[Import Job ${jobId}] Contacts fetched and saved to preview. Awaiting user selection.`);
    
    const { error: completeErr } = await supabase
      .from('contact_import_jobs')
      .update({
        status: 'contacts_fetched',
        total_contacts: allContacts.length,
        processed_contacts: allContacts.length,
        progress_percent: 100,
      })
      .eq('id', jobId);

    if (completeErr) {
      console.error(`[Import Job ${jobId}] Failed to update status:`, completeErr);
    }

  } catch (error: any) {
    console.error(`[Import Job ${jobId}] Fatal error:`, error);
    
    // Mark job as failed
    const { error: failErr } = await supabase
      .from('contact_import_jobs')
      .update({
        status: 'failed',
        error_message: error.message || 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (failErr) {
      console.error(`[Import Job ${jobId}] Failed to mark job as failed:`, failErr);
    }

    throw error; // Re-throw for caller to handle
  }
}
