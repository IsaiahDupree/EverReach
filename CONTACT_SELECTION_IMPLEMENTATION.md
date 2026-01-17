# Contact Selection Feature - Implementation Guide

## Overview

This document contains all the code needed to implement the contact selection feature for imports.

**Status:** Ready to implement  
**Estimated Time:** 4-6 hours  
**Priority:** Medium

---

## ✅ Completed

1. ✅ Database migration created (`20251103_add_contact_preview.sql`)
2. ✅ Tests created for recent fixes

---

## 📋 Implementation Checklist

### Step 1: Database Setup
- [ ] Run migration in Supabase: `supabase/migrations/20251103_add_contact_preview.sql`
- [ ] Verify table created with: `SELECT * FROM import_preview_contacts LIMIT 1;`

### Step 2: Backend - Preview Endpoint
- [ ] Create `backend-vercel/app/api/v1/contacts/import/jobs/[id]/preview/route.ts`
- [ ] Test endpoint with: `GET /api/v1/contacts/import/jobs/{id}/preview`

### Step 3: Backend - Confirm Endpoint  
- [ ] Create `backend-vercel/app/api/v1/contacts/import/jobs/[id]/confirm/route.ts`
- [ ] Test endpoint with: `POST /api/v1/contacts/import/jobs/{id}/confirm`

### Step 4: Backend - Modify Import Flow
- [ ] Update `runImportJob.ts` to save to preview table
- [ ] Update job status to `'contacts_fetched'` instead of `'completed'`

### Step 5: Testing
- [ ] Test full import flow
- [ ] Verify contacts saved to preview table
- [ ] Test preview endpoint returns contacts
- [ ] Test confirm endpoint imports selected contacts
- [ ] Test cleanup of preview contacts

---

## Code Files

### 1. Preview Endpoint

**File:** `backend-vercel/app/api/v1/contacts/import/jobs/[id]/preview/route.ts`

```typescript
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
```

### 2. Confirm Endpoint

**File:** `backend-vercel/app/api/v1/contacts/import/jobs/[id]/confirm/route.ts`

```typescript
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
        const { error: insertError } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            org_id: orgId,
            display_name: previewContact.display_name,
            emails: previewContact.emails || [],
            phones: previewContact.phones || [],
            company: previewContact.organization || null,
            notes: previewContact.notes || null,
            metadata: {
              import_source: `${job.provider}_import`,
              import_job_id: jobId,
              external_id: previewContact.external_id,
            },
          });

        if (insertError) {
          console.error('[Confirm] Failed to insert contact:', insertError);
          failed++;
        } else {
          imported++;
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
```

### 3. Modify runImportJob.ts

Add this function to save contacts to preview table instead of directly importing:

```typescript
// Add after imports in runImportJob.ts

/**
 * Save contacts to preview table for user selection
 */
async function saveContactsToPreview(
  jobId: string,
  providerName: ImportProvider,
  contacts: any[]
): Promise<void> {
  const supabase = getServiceClient();
  
  const previewContacts = contacts.map(contact => ({
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
    const { error } = await supabase
      .from('import_preview_contacts')
      .insert(batch);

    if (error) {
      console.error(`[Import Preview] Failed to insert batch ${i}:`, error);
      throw new Error(`Failed to save contacts to preview: ${error.message}`);
    }
  }

  console.log(`[Import Preview] Saved ${previewContacts.length} contacts to preview table`);
}
```

Then modify the end of `runImportJob` function:

```typescript
// Replace the section that imports contacts with:

// Save to preview table instead of importing directly
await saveContactsToPreview(jobId, providerName, allContacts);

// Mark job as contacts_fetched (user needs to review and select)
const { error: statusErr } = await supabase
  .from('contact_import_jobs')
  .update({
    status: 'contacts_fetched', // Changed from 'completed'
    total_contacts: allContacts.length,
    processed_contacts: allContacts.length,
    progress_percent: 100,
  })
  .eq('id', jobId);

if (statusErr) {
  console.error(`[Import Job ${jobId}] Failed to update status:`, statusErr);
}

console.log(`[Import Job ${jobId}] Contacts fetched and saved to preview. Awaiting user selection.`);
```

---

## Testing Guide

### 1. Test Preview Endpoint

```bash
# Start import
curl -X POST https://ever-reach-be.vercel.app/api/v1/contacts/import/google/start \
  -H "Authorization: Bearer YOUR_TOKEN"

# Complete OAuth flow in browser

# Get preview
curl https://ever-reach-be.vercel.app/api/v1/contacts/import/jobs/JOB_ID/preview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Confirm Endpoint

```bash
# Import selected contacts
curl -X POST https://ever-reach-be.vercel.app/api/v1/contacts/import/jobs/JOB_ID/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contact_ids": ["contact-id-1", "contact-id-2"]}'

# Or import all
curl -X POST https://ever-reach-be.vercel.app/api/v1/contacts/import/jobs/JOB_ID/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"import_all": true}'
```

---

## Deployment Steps

1. **Run Database Migration**
   ```sql
   -- In Supabase SQL Editor
   -- Paste contents of 20251103_add_contact_preview.sql
   ```

2. **Deploy Backend Code**
   ```bash
   cd backend-vercel
   git add app/api/v1/contacts/import/jobs/
   git add lib/imports/runImportJob.ts
   git commit -m "feat: Add contact selection for imports"
   git push
   vercel --prod
   ```

3. **Test End-to-End**
   - Start Google import
   - Complete OAuth
   - Verify contacts in preview table
   - Call preview endpoint
   - Call confirm endpoint with selected IDs
   - Verify contacts imported to contacts table
   - Verify preview contacts cleaned up

---

## Future Enhancements

- [ ] Add duplicate detection in preview
- [ ] Add bulk tagging before import
- [ ] Add conflict resolution UI
- [ ] Add export to CSV option
- [ ] Add smart filtering/suggestions

---

**Status:** Ready for implementation  
**Next Step:** Run database migration in Supabase
