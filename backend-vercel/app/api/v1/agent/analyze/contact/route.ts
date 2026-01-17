import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, ADVANCED_MODEL, SYSTEM_PROMPTS } from "@/lib/openai";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const analyzeSchema = z.object({
  contact_id: z.string().uuid(),
  analysis_type: z.enum(['relationship_health', 'engagement_suggestions', 'context_summary', 'full_analysis']).default('context_summary'),
  include_voice_notes: z.boolean().default(true),
  include_interactions: z.boolean().default(true)
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { contact_id, analysis_type, include_voice_notes, include_interactions } = parsed.data;

    const supabase = getClientOrThrow(req);

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .maybeSingle();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Gather context
    const contextData: any = {
      contact: {
        name: contact.display_name,
        emails: contact.emails,
        phones: contact.phones,
        company: contact.company,
        tags: contact.tags,
        warmth: contact.warmth,
        warmth_band: contact.warmth_band,
        last_interaction: contact.last_interaction_at,
        notes: contact.notes
      }
    };

    // Get interactions if requested
    if (include_interactions) {
      const { data: interactions } = await supabase
        .from('interactions')
        .select('kind, content, created_at')
        .eq('contact_id', contact_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.interactions = interactions?.map(i => ({
        type: i.kind,
        date: i.created_at,
        snippet: i.content?.substring(0, 200)
      })) || [];
    }

    // Get voice notes if requested
    if (include_voice_notes) {
      const { data: personaNotes } = await supabase
        .from('persona_notes')
        .select('type, title, body_text, transcript, tags, created_at')
        .contains('tags', [contact.display_name])
        .order('created_at', { ascending: false })
        .limit(5);
      
      contextData.persona_notes = personaNotes?.map(n => ({
        type: n.type,
        title: n.title,
        content: (n.transcript || n.body_text || '').substring(0, 300),
        tags: n.tags,
        date: n.created_at
      })) || [];
    }

    // Get user's active goals for context
    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('id, goal_category, goal_text, priority, target_count, current_progress')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: false})
      .limit(10);

    // Get goal associations for this contact
    const { data: goalAssociations } = await supabase
      .from('goal_contact_associations')
      .select('goal_id, relevance_score, notes')
      .eq('contact_id', contact_id);

    contextData.user_goals = userGoals?.map(g => ({
      category: g.goal_category,
      text: g.goal_text,
      priority: g.priority,
      progress: g.target_count ? `${g.current_progress}/${g.target_count}` : undefined
    })) || [];

    contextData.goal_associations = goalAssociations?.map(ga => ({
      goal_id: ga.goal_id,
      relevance: ga.relevance_score,
      notes: ga.notes
    })) || [];

    // Build analysis prompt based on type
    const goalsContext = userGoals && userGoals.length > 0 
      ? `\n\nUser's Active Goals:\n${userGoals.map(g => `- [${g.goal_category}] ${g.goal_text} (${g.priority} priority)`).join('\n')}`
      : '';

    const prompts = {
      relationship_health: `Analyze the relationship health with ${contact.display_name}.
      
Consider:
1. Warmth score (${contact.warmth}/100) and trend
2. Interaction frequency and recency
3. Quality of engagement
4. Relationship depth indicators
5. How this contact relates to user's goals${goalsContext}

Provide:
- Health score (1-10)
- Key strengths
- Warning signs (if any)
- Specific recommendations to strengthen the relationship
- How to align this relationship with user's goals

Be honest, specific, and actionable.`,

      engagement_suggestions: `Suggest 3-5 specific engagement actions for ${contact.display_name}.

Consider:
- Their current warmth level and relationship context
- Time since last interaction
- Shared interests or topics (from notes/tags)
- Appropriate channels (email/phone/etc)
- User's goals and how this contact can help achieve them${goalsContext}

Make suggestions:
- Specific and actionable
- Personalized to this contact
- Appropriately timed
- Goal-aligned where relevant
- With clear reasoning`,

      context_summary: `Create a comprehensive context summary for ${contact.display_name} to help with future interactions.

Include:
- Relationship overview
- Key topics and interests
- Communication patterns
- Important context from voice notes
- Best practices for engaging with them

Format as a brief but informative reference guide.`,

      full_analysis: `Provide a complete relationship intelligence analysis for ${contact.display_name}.

Cover:
1. Relationship Health Assessment (score + analysis)
2. Engagement History & Patterns  
3. Key Topics & Interests
4. Recommended Next Actions (3-5 specific)
5. Long-term Relationship Strategy

Be comprehensive, data-driven, and highly actionable.`
    };

    // Call OpenAI for analysis
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: ADVANCED_MODEL, // Use advanced model for better analysis
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.analyzer },
        { role: 'user', content: `${prompts[analysis_type]}\n\nContext Data:\n${JSON.stringify(contextData, null, 2)}` }
      ],
      temperature: 0.5,
      max_tokens: analysis_type === 'full_analysis' ? 1200 : 600
    });

    const analysis = response.choices[0]?.message?.content || '';

    // Store analysis result
    await supabase
      .from('contact_analysis')
      .insert({
        contact_id,
        user_id: user.id,
        analysis_type,
        analysis_content: analysis,
        context_snapshot: contextData,
        created_at: new Date().toISOString()
      });

    return ok({
      contact: {
        id: contact.id,
        name: contact.display_name
      },
      analysis_type,
      analysis,
      context_used: {
        interactions: contextData.interactions?.length || 0,
        persona_notes: contextData.persona_notes?.length || 0
      },
      usage: response.usage
    }, req);

  } catch (error: any) {
    console.error('[Contact Analysis Error]', error);
    return serverError(error.message, req);
  }
}
