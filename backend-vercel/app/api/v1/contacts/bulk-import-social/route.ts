import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { socialBulkImportSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/contacts/bulk-import-social
 * Body: { contacts: SocialContact[] } (max 100)
 * Rate limit: 100/request, 500/day per user
 * Returns: { imported: N, duplicates: N, errors: N, contact_ids: string[] }
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const rl = checkRateLimit(`u:${user.id}:POST:/v1/contacts/bulk-import-social`, 10, 60_000);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }

  const parsed = socialBulkImportSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'validation_error', details: parsed.error.flatten() }), { status: 422 });
  }

  const { contacts } = parsed.data;
  const supabase = getServiceClient();

  try {
    // Check daily rate limit: max 500 imports per day
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('social_sync_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`);

    if ((count || 0) >= 500) {
      return new Response(JSON.stringify({ error: 'daily_limit_exceeded', message: 'Maximum 500 imports per day' }), { status: 429 });
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const contact_ids: string[] = [];

    for (const contactData of contacts) {
      const { platform, handle, display_name, profile_url, bio, followers, following, profile_pic, company, headline, location, website, emails, phones } = contactData;

      try {
        // Dedup check
        if (handle) {
          const handleLower = handle.toLowerCase();
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .or(`social_channels->>${platform}->>'handle'.ilike.${handleLower}`)
            .limit(1)
            .maybeSingle();

          if (existing) {
            duplicates++;
            await supabase.from('social_sync_log').insert({
              user_id: user.id,
              contact_id: existing.id,
              platform,
              handle,
              profile_url,
              action: 'duplicate_skipped',
              raw_data: contactData,
            });
            contact_ids.push(existing.id);
            continue;
          }
        }

        // Create new contact
        const social_channels: any = {
          [platform]: {
            handle,
            profile_url,
            bio,
            followers,
            profile_pic,
            headline,
            company,
            location,
            website,
          }
        };

        // Remove undefined values
        Object.keys(social_channels[platform]).forEach(key => {
          if (social_channels[platform][key] === undefined) {
            delete social_channels[platform][key];
          }
        });

        const now = new Date().toISOString().split('T')[0];
        const notes = `Imported from ${platform} on ${now}`;
        const tags = ['social-import', platform];

        const newContact = {
          user_id: user.id,
          display_name,
          emails: emails || [],
          phones: phones || [],
          company,
          notes,
          tags,
          social_channels,
          warmth: 40,
        };

        const { data: insertedContact, error: insertError } = await supabase
          .from('contacts')
          .insert([newContact])
          .select('id')
          .single();

        if (insertError) {
          console.error('[bulk-import-social] insert error:', insertError);
          errors++;
          continue;
        }

        // Log success
        await supabase.from('social_sync_log').insert({
          user_id: user.id,
          contact_id: insertedContact.id,
          platform,
          handle,
          profile_url,
          action: 'created',
          raw_data: contactData,
        });

        imported++;
        contact_ids.push(insertedContact.id);

      } catch (e: any) {
        console.error('[bulk-import-social] contact error:', e?.message);
        errors++;
      }
    }

    return ok({
      imported,
      duplicates,
      errors,
      contact_ids,
    }, req);

  } catch (e: any) {
    console.error('[bulk-import-social] error:', e?.message);
    return serverError('Internal error', req);
  }
}
