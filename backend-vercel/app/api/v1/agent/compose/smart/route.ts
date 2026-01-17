import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS } from "@/lib/openai";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const smartComposeSchema = z.object({
  contact_id: z.string().uuid(),
  goal: z.enum(['personal', 'networking', 'business']).optional(), // Accept 'goal' for test compatibility
  goal_type: z.enum(['personal', 'networking', 'business']).optional(), // Also accept 'goal_type'
  goal_description: z.string().optional(),
  channel: z.enum(['email', 'sms', 'dm']).default('email'),
  tone: z.enum(['concise', 'warm', 'professional', 'playful']).default('warm'),
  include_context: z.boolean().default(true), // Accept 'include_context' for test compatibility
  include_voice_context: z.boolean().optional(),
  include_interaction_history: z.boolean().optional(),
  max_length: z.number().int().min(50).max(2000).optional()
}).refine(data => data.goal || data.goal_type, {
  message: "Either 'goal' or 'goal_type' must be provided",
  path: ['goal']
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const payload = await req.json();
    const parsed = smartComposeSchema.safeParse(payload);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { contact_id, goal, goal_type, goal_description, channel, tone, include_context, include_voice_context, include_interaction_history, max_length } = parsed.data;

    // Use 'goal' or 'goal_type', prefer 'goal' for test compatibility
    const finalGoalType = goal || goal_type || 'networking';
    const finalIncludeContext = include_context !== undefined ? include_context : true;
    const finalIncludeVoice = include_voice_context !== undefined ? include_voice_context : finalIncludeContext;
    const finalIncludeHistory = include_interaction_history !== undefined ? include_interaction_history : finalIncludeContext;

    const supabase = getClientOrThrow(req);

    // Get contact details
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .maybeSingle();

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Get user profile (for bio)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('bio, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // Build rich context for composition
    const contextParts = [
      `Contact: ${contact.display_name}`,
      `Channel: ${channel}`,
      `Goal Type: ${finalGoalType}`,
      goal_description ? `Goal: ${goal_description}` : '',
      `Tone: ${tone}`,
      `Warmth: ${contact.warmth}/100 (${contact.warmth_band})`,
      contact.company ? `Company: ${contact.company}` : '',
      contact.tags?.length > 0 ? `Tags: ${contact.tags.join(', ')}` : '',
      userProfile?.bio ? `\nAbout You: ${userProfile.bio}` : ''
    ].filter(Boolean);

    // Get interaction history
    if (finalIncludeHistory) {
      const { data: interactions } = await supabase
        .from('interactions')
        .select('kind, content, created_at')
        .eq('contact_id', contact_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (interactions && interactions.length > 0) {
        const interactionSummary = interactions
          .map(i => `- ${i.created_at.split('T')[0]}: ${i.content?.substring(0, 100)}`)
          .join('\n');
        contextParts.push(`\nRecent Interactions:\n${interactionSummary}`);
      } else {
        contextParts.push('\nNo recent interactions - this is a fresh outreach');
      }
    }

    // Get voice notes/persona context
    if (finalIncludeVoice) {
      const { data: personaNotes } = await supabase
        .from('persona_notes')
        .select('type, title, body_text, transcript, tags')
        .or(`tags.cs.{${contact.display_name}},tags.cs.{${finalGoalType}}`)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (personaNotes && personaNotes.length > 0) {
        const notesSummary = personaNotes
          .map(n => {
            const content = n.transcript || n.body_text || '';
            return `- ${n.title || 'Note'}: ${content.substring(0, 200)}`;
          })
          .join('\n');
        contextParts.push(`\nYour Personal Context/Voice Notes:\n${notesSummary}`);
      }
    }

    // Get relevant message goals from database
    const { data: messageGoals } = await supabase
      .from('goals')
      .select('name, description, kind')
      .eq('kind', finalGoalType)
      .eq('is_active', true)
      .limit(3);
    
    if (messageGoals && messageGoals.length > 0) {
      const goalsSummary = messageGoals
        .map(g => `- ${g.name}: ${g.description}`)
        .join('\n');
      contextParts.push(`\nRelevant Message Goals:\n${goalsSummary}`);
    }

    // Get user's compose settings
    const { data: settings } = await supabase
      .from('compose_settings')
      .select('tone, max_length')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const finalTone = tone || settings?.tone || 'warm';
    const finalMaxLength = max_length || settings?.max_length || (channel === 'sms' ? 150 : 500);

    // Build the composition prompt
    const compositionPrompt = `Compose a ${finalTone} ${channel} message for the following context:\n\n${contextParts.join('\n')}\n\nRequirements:
- Be authentic and natural
- Reference relevant shared context
- Match the specified tone (${finalTone})
- Appropriate length for ${channel} (target ~${finalMaxLength} chars)
- Include a clear call-to-action if appropriate
- ${channel === 'email' ? 'Include a subject line on the first line as "Subject: ..."' : ''}

Generate the message now:`;

    // Generate message with OpenAI
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.composer },
        { role: 'user', content: compositionPrompt }
      ],
      temperature: 0.7,
      max_tokens: channel === 'sms' ? 200 : 700
    });

    const generatedMessage = response.choices[0]?.message?.content || '';

    // Parse email subject if present
    let subject = null;
    let body = generatedMessage;
    if (channel === 'email' && generatedMessage.startsWith('Subject:')) {
      const lines = generatedMessage.split('\n');
      subject = lines[0].replace('Subject:', '').trim();
      body = lines.slice(1).join('\n').trim();
    }

    // Log the composition
    await supabase
      .from('message_generations')
      .insert({
        user_id: user.id,
        contact_id,
        goal_type: finalGoalType,
        channel,
        tone: finalTone,
        generated_subject: subject,
        generated_body: body,
        context_used: {
          interactions: finalIncludeHistory,
          voice_notes: finalIncludeVoice,
          contact_warmth: contact.warmth
        },
        created_at: new Date().toISOString()
      });

    // Build draft response matching test expectations
    const draft: any = {};
    if (channel === 'email') {
      draft.email = { subject, body };
    } else if (channel === 'sms') {
      draft.sms = { body };
    } else if (channel === 'dm') {
      draft.dm = { body };
    }

    return ok({
      draft,
      contact: {
        id: contact.id,
        name: contact.display_name
      },
      message: {
        channel,
        subject,
        body,
        tone: finalTone,
        estimated_length: body.length
      },
      context_used: finalIncludeHistory || finalIncludeVoice ? ['interactions', 'voice_notes', 'contact'] : [],
      context_sources: {
        voice_notes_used: finalIncludeVoice,
        interactions_used: finalIncludeHistory,
        contact_warmth: contact.warmth
      },
      usage: response.usage
    }, req);

  } catch (error: any) {
    console.error('[Smart Compose Error]', error);
    return serverError(error.message, req);
  }
}
