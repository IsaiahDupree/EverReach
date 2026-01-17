import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS } from "@/lib/openai";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const suggestSchema = z.object({
  context: z.enum(['dashboard', 'contact_view', 'goals']).default('dashboard'),
  contact_id: z.string().uuid().optional(),
  focus: z.enum(['engagement', 'networking', 'follow_ups', 'all']).default('all'),
  limit: z.number().int().min(1).max(10).default(5)
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const parsed = suggestSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { context, contact_id, focus, limit } = parsed.data;

    const supabase = getClientOrThrow(req);
    const client = getOpenAIClient();

    // Gather relevant data based on context
    let contextData: any = { user_id: user.id };

    if (contact_id) {
      // Single contact suggestions
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, display_name, warmth, warmth_band, last_interaction_at, tags')
        .eq('id', contact_id)
        .maybeSingle();
      
      if (!contact) {
        return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }

      const { data: interactions } = await supabase
        .from('interactions')
        .select('kind, created_at')
        .eq('contact_id', contact_id)
        .order('created_at', { ascending: false })
        .limit(5);

      contextData.contact = contact;
      contextData.recent_interactions = interactions;
    } else {
      // Global suggestions - get contacts needing attention
      const { data: coldContacts } = await supabase
        .from('contacts')
        .select('id, display_name, warmth, last_interaction_at')
        .in('warmth_band', ['cold', 'cool'])
        .is('deleted_at', null)
        .order('last_interaction_at', { ascending: true, nullsFirst: true })
        .limit(5);

      const { data: hotContacts } = await supabase
        .from('contacts')
        .select('id, display_name, warmth, last_interaction_at')
        .eq('warmth_band', 'hot')
        .is('deleted_at', null)
        .order('last_interaction_at', { ascending: true })
        .limit(3);

      contextData.contacts_needing_attention = coldContacts;
      contextData.hot_contacts = hotContacts;
    }

    // Get recent persona notes for additional context
    const { data: recentNotes } = await supabase
      .from('persona_notes')
      .select('title, tags, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    contextData.recent_persona_notes = recentNotes;

    // Build prompt based on focus
    const prompts = {
      engagement: `Suggest ${limit} specific actions to improve engagement and strengthen relationships.`,
      networking: `Suggest ${limit} networking actions to expand connections and build new relationships.`,
      follow_ups: `Suggest ${limit} follow-up actions for pending conversations or relationships that need attention.`,
      all: `Suggest ${limit} high-impact relationship management actions across engagement, networking, and follow-ups.`
    };

    const fullPrompt = `You are a proactive relationship intelligence assistant. Based on the user's CRM data, ${prompts[focus]}

Context:
${JSON.stringify(contextData, null, 2)}

For each suggestion, provide:
1. Action title (brief, actionable)
2. Description (why this action matters)
3. Priority (high/medium/low)
4. Contact(s) involved (if applicable)
5. Estimated time investment

Format as JSON array of suggestion objects.`;

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.assistant },
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0.6,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions": []}');

    return ok({
      context,
      focus,
      suggestions: result.suggestions || [],
      generated_at: new Date().toISOString(),
      usage: response.usage
    }, req);

  } catch (error: any) {
    console.error('[Action Suggestions Error]', error);
    return serverError(error.message, req);
  }
}
