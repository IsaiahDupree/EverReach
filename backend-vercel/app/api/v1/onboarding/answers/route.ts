import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// Validation schema for onboarding answers
const onboardingAnswersSchema = z.object({
  segment: z.enum(['business', 'networking', 'personal', 'all']).optional(),
  goal: z.string().optional(),
  cadence: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'custom']).optional(),
  channels: z.array(z.string()).optional(), // ['SMS', 'Email', 'Call', 'LinkedIn', 'Instagram', 'Twitter', 'WhatsApp']
  ai_comfort: z.enum(['help_write', 'just_remind', 'mix']).optional(),
  privacy_mode: z.boolean().optional(),
  analytics_consent: z.boolean().optional(),
  first_contact_name: z.string().optional(),
  import_source: z.enum(['phone', 'google', 'csv', 'manual', 'skip']).optional(),
  relationship_count: z.enum(['5-10', '10-25', '25-50', '50-100', '100+']).optional(),
  last_outreach: z.enum(['week', 'month', 'few_months', 'cant_remember']).optional(),
  friction_points: z.array(z.string()).optional(), // what stops them from reaching out
  has_system: z.enum(['yes', 'sort_of', 'no', 'tried_apps']).optional(),
  warmth_receptive: z.enum(['yes', 'maybe', 'no']).optional(),
  answers: z.record(z.string(), z.any()).optional(), // flexible storage for all answers
});

/**
 * POST /v1/onboarding/answers
 * 
 * Saves user's onboarding questionnaire responses and applies defaults to their profile
 */
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }

  const parsed = onboardingAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message, req);
  }

  const data = parsed.data;
  const supabase = getClientOrThrow(req);

  try {
    // 1. Save onboarding responses to database
    const { error: insertError } = await supabase
      .from('onboarding_responses')
      .insert({
        user_id: user.id,
        segment: data.segment,
        goal: data.goal,
        cadence: data.cadence,
        channels: data.channels,
        ai_comfort: data.ai_comfort,
        privacy_mode: data.privacy_mode ?? false,
        analytics_consent: data.analytics_consent ?? false,
        first_contact_name: data.first_contact_name,
        import_source: data.import_source,
        relationship_count: data.relationship_count,
        last_outreach: data.last_outreach,
        friction_points: data.friction_points,
        has_system: data.has_system,
        warmth_receptive: data.warmth_receptive,
        all_answers: data.answers ?? {},
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Onboarding] Insert error:', insertError);
      return serverError(`Failed to save onboarding answers: ${insertError.message}`, req);
    }

    // 2. Apply defaults to user profile based on onboarding answers
    const profileUpdates: any = {};
    
    // Set default cadence based on answer
    if (data.cadence) {
      profileUpdates.default_cadence = data.cadence;
    }

    // Set preferred channels
    if (data.channels && data.channels.length > 0) {
      profileUpdates.preferred_channels = data.channels;
    }

    // Set privacy mode
    if (data.privacy_mode !== undefined) {
      profileUpdates.privacy_mode = data.privacy_mode;
    }

    // Set AI preferences
    if (data.ai_comfort) {
      profileUpdates.ai_assistance_level = data.ai_comfort;
    }

    // Set analytics consent
    if (data.analytics_consent !== undefined) {
      profileUpdates.analytics_consent = data.analytics_consent;
    }

    // Update profile if we have changes
    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Onboarding] Profile update error:', updateError);
        // Don't fail the request if profile update fails, just log it
      }
    }

    // 3. Tag user for marketing segmentation (if segment provided)
    if (data.segment) {
      // You can add tags to a user_tags table or use metadata
      const { error: tagError } = await supabase
        .from('user_tags')
        .insert({
          user_id: user.id,
          tag: `segment:${data.segment}`,
          source: 'onboarding',
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      // Ignore errors if table doesn't exist yet
      if (tagError && !tagError.message.includes('does not exist')) {
        console.error('[Onboarding] Tag error:', tagError);
      }
    }

    // 4. Create first contact if name was provided
    let firstContactId = null;
    if (data.first_contact_name && data.first_contact_name.trim()) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          display_name: data.first_contact_name.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (contactError) {
        console.error('[Onboarding] Contact creation error:', contactError);
      } else if (contact) {
        firstContactId = contact.id;
      }
    }

    return ok({
      success: true,
      message: 'Onboarding answers saved successfully',
      profile_updated: Object.keys(profileUpdates).length > 0,
      first_contact_created: !!firstContactId,
      first_contact_id: firstContactId,
      applied_defaults: {
        cadence: data.cadence,
        channels: data.channels,
        privacy_mode: data.privacy_mode,
        ai_comfort: data.ai_comfort,
      },
    }, req);

  } catch (error: any) {
    console.error('[Onboarding] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
