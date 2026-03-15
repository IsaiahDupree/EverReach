import { options, ok, created, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow, getServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { socialImportSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/contacts/import-social
 * Body: { platform, handle?, display_name, profile_url, bio?, followers?, ... }
 * Logic:
 * 1. Dedup check by platform+handle
 * 2. If new: create contact with social_channels JSONB, auto tags, auto note
 * 3. Log to social_sync_log
 * 4. Return { status: created|duplicate, contact_id, display_name }
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const rl = checkRateLimit(`u:${user.id}:POST:/v1/contacts/import-social`, 50, 60_000);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }

  const parsed = socialImportSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'validation_error', details: parsed.error.flatten() }), { status: 422 });
  }

  const data = parsed.data;
  const { platform, handle, display_name, profile_url, bio, followers, following, profile_pic, company, headline, location, website, emails, phones } = data;

  const supabase = getServiceClient();

  try {
    // 1. Dedup check by platform + handle (case-insensitive)
    if (handle) {
      const handleLower = handle.toLowerCase();
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, display_name, social_channels')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`social_channels->>${platform}->>'handle'.ilike.${handleLower}`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Log duplicate skip
        await supabase.from('social_sync_log').insert({
          user_id: user.id,
          contact_id: existing.id,
          platform,
          handle,
          profile_url,
          action: 'duplicate_skipped',
          raw_data: data,
        });

        return ok({
          status: 'duplicate',
          contact_id: existing.id,
          display_name: existing.display_name,
        }, req);
      }
    }

    // 2. Create new contact
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

    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
      warmth: 40, // Default warmth
    };

    const { data: insertedContact, error: insertError } = await supabase
      .from('contacts')
      .insert([newContact])
      .select('id, display_name')
      .single();

    if (insertError) {
      console.error('[import-social] insert error:', insertError);
      return serverError('Failed to create contact', req);
    }

    // 3. Log to social_sync_log
    await supabase.from('social_sync_log').insert({
      user_id: user.id,
      contact_id: insertedContact.id,
      platform,
      handle,
      profile_url,
      action: 'created',
      raw_data: data,
    });

    return created({
      status: 'created',
      contact_id: insertedContact.id,
      display_name: insertedContact.display_name,
    }, req);

  } catch (e: any) {
    console.error('[import-social] error:', e?.message);
    return serverError('Internal error', req);
  }
}
