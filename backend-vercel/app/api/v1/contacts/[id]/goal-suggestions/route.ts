import { options, ok, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, DEFAULT_MODEL } from "@/lib/openai";
import { getUserGoalsForAI } from "@/lib/goal-inference";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// Validation schema for suggestions
const suggestionSchema = z.object({
  id: z.string(),
  goal: z.string(),
  goal_key: z.string(),
  reason: z.string(),
  category: z.enum(['nurture', 're-engage', 'convert', 'maintain']),
  priority: z.enum(['high', 'medium', 'low']),
  confidence: z.number().min(0).max(1)
});

// GET /v1/contacts/:id/goal-suggestions - AI-powered goal suggestions
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const supabase = getClientOrThrow(req);
    const client = getOpenAIClient();

    // 1. Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, display_name, warmth, warmth_band, last_interaction_at, tags, created_at')
      .eq('id', params.id)
      .maybeSingle();

    if (contactError || !contact) {
      return notFound('Contact not found', req);
    }

    // 2. Get recent interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('kind, created_at, content')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Get pipeline state
    const { data: pipelineState } = await supabase
      .from('contact_pipeline_state')
      .select('pipeline_key, stage_key')
      .eq('contact_id', params.id)
      .maybeSingle();

    // 4. Get user's profile (for bio)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('bio, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // 5. Get user's inferred goals (AI context)
    const goalsContext = await getUserGoalsForAI(user.id, supabase);

    // Check if we have enough data for AI suggestions
    const hasMinimumData = interactions && interactions.length >= 2;
    
    if (!hasMinimumData) {
      // Return generic suggestions with flag
      return ok({
        suggestions: [],
        needs_more_data: true,
        message: "Add more interactions to get AI-powered suggestions",
        minimum_interactions: 2,
        current_interactions: interactions?.length || 0
      }, req);
    }

    // Calculate days since last interaction
    const daysSinceLastInteraction = contact.last_interaction_at 
      ? Math.floor((Date.now() - new Date(contact.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Build AI context
    const contextData = {
      contact: {
        name: contact.display_name,
        warmth: contact.warmth,
        warmth_band: contact.warmth_band,
        days_since_last_interaction: daysSinceLastInteraction,
        interaction_count: interactions?.length || 0,
        tags: contact.tags,
        pipeline: pipelineState?.pipeline_key || 'unknown',
        stage: pipelineState?.stage_key || 'unknown',
        days_in_crm: Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24))
      },
      recent_interactions: interactions?.slice(0, 5).map(i => ({
        type: i.kind,
        days_ago: Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        snippet: i.content?.substring(0, 100)
      }))
    };

    // Generate AI suggestions
    const prompt = `You are a relationship intelligence assistant. Analyze this contact and suggest 2-4 specific next actions to strengthen the relationship.

Contact Data:
${JSON.stringify(contextData, null, 2)}
${userProfile?.bio ? `\nAbout You: ${userProfile.bio}` : ''}
${goalsContext}
Instructions:
1. Consider the contact's warmth, recent interactions, and time since last contact
2. Align suggestions with user's goals where relevant
3. Prioritize based on relationship health and goal alignment
4. Be specific and actionable

For each suggestion, provide:
{
  "id": "unique-id",
  "goal": "Short actionable goal (max 60 chars)",
  "goal_key": "snake_case_key",
  "reason": "Why this action matters (max 150 chars)",
  "category": "nurture|re-engage|convert|maintain",
  "priority": "high|medium|low",
  "confidence": 0.0-1.0
}

Categories:
- nurture: Build deeper relationship
- re-engage: Reconnect after gap
- convert: Move toward business goal
- maintain: Keep relationship healthy

Return JSON: {"suggestions": [array of 2-4 suggestion objects]}`;

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are a CRM relationship intelligence expert. Provide concise, actionable suggestions.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions": []}');
    
    // Validate and sanitize suggestions
    const validatedSuggestions = (result.suggestions || [])
      .map((s: any, index: number) => ({
        id: s.id || `suggestion-${index}`,
        goal: s.goal?.substring(0, 60) || 'Follow up with contact',
        goal_key: s.goal_key || 'follow_up',
        reason: s.reason?.substring(0, 150) || 'Maintain relationship health',
        category: ['nurture', 're-engage', 'convert', 'maintain'].includes(s.category) ? s.category : 'nurture',
        priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
        confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0.5))
      }))
      .slice(0, 5); // Max 5 suggestions

    return ok({
      suggestions: validatedSuggestions,
      context: {
        warmth: contact.warmth,
        warmth_band: contact.warmth_band,
        days_since_last_interaction: daysSinceLastInteraction,
        interaction_count: interactions?.length || 0
      },
      needs_more_data: false,
      generated_at: new Date().toISOString(),
      usage: response.usage
    }, req);

  } catch (e: any) {
    console.error('[Goal Suggestions Error]', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
