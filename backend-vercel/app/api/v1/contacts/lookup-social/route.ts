import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { socialLookupSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /api/v1/contacts/lookup-social
 * Query params: platform, handle (or profile_url for facebook)
 * Returns: { found: bool, contact_id?, display_name?, warmth?, social_channels? }
 */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });

  const parsed = socialLookupSchema.safeParse(params);
  if (!parsed.success) {
    return badRequest('validation_error', req);
  }

  const { platform, handle, profile_url } = parsed.data;
  const supabase = getServiceClient();

  try {
    let query = supabase
      .from('contacts')
      .select('id, display_name, warmth, warmth_band, social_channels')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Query by platform + handle (case-insensitive for handle)
    if (handle) {
      const handleLower = handle.toLowerCase();
      // Use JSONB path query for matching handle
      query = query.filter('social_channels', 'cs', `{"${platform}":{"handle":"${handleLower}"}}`)
        .or(`social_channels->>${platform}->>'handle'.ilike.${handleLower}`);
    } else if (profile_url && platform === 'facebook') {
      // Fallback to profile_url for Facebook
      query = query.filter('social_channels', 'cs', `{"facebook":{"profile_url":"${profile_url}"}}`);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('[lookup-social] db error:', error);
      return serverError('Database query failed', req);
    }

    if (!data) {
      return ok({ found: false }, req);
    }

    return ok({
      found: true,
      contact_id: data.id,
      display_name: data.display_name,
      warmth: data.warmth,
      warmth_band: data.warmth_band,
      social_channels: data.social_channels,
    }, req);

  } catch (e: any) {
    console.error('[lookup-social] error:', e?.message);
    return serverError('Internal error', req);
  }
}
