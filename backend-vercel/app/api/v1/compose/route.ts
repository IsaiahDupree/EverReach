import { getOpenAIClient } from "@/lib/openai";
import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { composeRequestSchema } from "@/lib/validation";
import { getUserGoalsForAI } from "@/lib/goal-inference";
import { canUseCompose, incrementComposeUsage } from "@/lib/usage-limits";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/compose
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const rl = checkRateLimit(`u:${user.id}:POST:/v1/compose`, 30, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: { code: 'rate_limited', retryAfter: rl.retryAfter } }), { status: 429, headers: { 'Content-Type': 'application/json' } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = composeRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const input = parsed.data;

  try {
    const supabase = getClientOrThrow(req);

    // Check tier-based usage limits for compose
    const usageCheck = await canUseCompose(supabase, user.id);
    
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'usage_limit_exceeded',
            message: usageCheck.reason || 'Monthly compose generation limit reached',
            details: {
              current_usage: usageCheck.current_usage,
              limit: usageCheck.limit,
              remaining: usageCheck.remaining,
              resets_at: usageCheck.resets_at,
              tier: usageCheck.tier,
            },
          },
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(usageCheck.limit),
            'X-RateLimit-Remaining': String(usageCheck.remaining || 0),
            'X-RateLimit-Reset': usageCheck.resets_at || '',
          } 
        }
      );
    }

    // Fetch resources in parallel to reduce latency
    const contactSel = supabase
      .from('contacts')
      .select('id, display_name, company, notes, warmth, warmth_band, last_interaction_at')
      .eq('id', input.contact_id)
      .maybeSingle();

    const settingsSel = supabase
      .from('compose_settings')
      .select('default_channel, auto_use_persona_notes, tone, max_length, guardrails, enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    const notesSel = (input.include?.persona_notes === false)
      ? Promise.resolve({ data: [] } as any)
      : supabase
          .from('persona_notes')
          .select('id, type, title, body_text, transcript, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

    const templateSel = input.template_id
      ? supabase
          .from('templates')
          .select('id, channel, name, subject_tmpl, body_tmpl, closing_tmpl, variables')
          .eq('id', input.template_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any);

    const [
      { data: contact },
      { data: settings },
      { data: _notes },
      { data: _tmpl },
    ] = await Promise.all([contactSel, settingsSel, notesSel, templateSel]);
    
    // Debug: Log what settings were loaded
    console.log('[Compose] Loaded compose_settings:', {
      userId: user.id,
      settingsTone: settings?.tone,
      settingsToneType: typeof settings?.tone,
      settingsEnabled: settings?.enabled,
      hasSettings: !!settings
    });

    const personaNotes: Array<{ id: string; title: string | null; body_text: string | null; transcript: string | null; type: string }> = (_notes ?? []) as any;
    const template: any = _tmpl;

    // Validate template variables if template provided
    if (template) {
      const mustacheVars = new Set<string>();
      const addVars = (s?: string | null) => {
        if (!s) return;
        const re = /{{\s*([a-zA-Z0-9_.]+)\s*}}/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(s)) !== null) {
          mustacheVars.add(m[1]);
        }
      };
      addVars(template.subject_tmpl);
      addVars(template.body_tmpl);
      addVars(template.closing_tmpl);

      const allowedPrefix = [ 'contact.', 'user.' ];
      const allowedExact = new Set([ 'goal', 'channel', 'tone' ]);
      const requiredVars = Array.from(mustacheVars).filter(v => !allowedPrefix.some(p => v.startsWith(p)) && !allowedExact.has(v));
      const provided = new Set(Object.keys(input.variables || {}));
      const missing = requiredVars.filter(v => !provided.has(v));
      if (missing.length > 0) {
        return badRequest(JSON.stringify({ code: 'missing_template_variables', missing }), req);
      }
    }

    let client;
    try {
      client = getOpenAIClient();
    } catch (e: any) {
      return serverError(e?.message || 'Missing OPENAI_API_KEY', req);
    }

    const personaSummaries = personaNotes.map(n => {
      const text = n.type === 'voice' ? (n.transcript || '') : (n.body_text || '');
      return `- ${n.title || n.id}: ${text.slice(0, 200)}`;
    }).join('\n');

    const tmplInfo = template ? `Template: ${template.name}\nSubject: ${template.subject_tmpl || ''}\nBody: ${template.body_tmpl || ''}\nClosing: ${template.closing_tmpl || ''}` : 'No template';

    const contactCtx = contact ? `Contact: ${contact.display_name || contact.id} (${contact.company || ''})\nWarmth: ${contact.warmth} (${contact.warmth_band})\nLast interaction: ${contact.last_interaction_at || 'n/a'}\nNotes: ${(contact.notes || '').slice(0, 200)}` : 'Contact not found';

    // Get AI-inferred goals context (invisible to user, guides AI)
    const goalsContext = await getUserGoalsForAI(user.id, supabase);

    const varsSnippet = input.variables ? JSON.stringify(input.variables) : '{}';
    // Get voice context from compose_settings.tone (which stores the full text like "Casual")
    const toneValue = settings?.tone || input.variables?.voice_context;
    const simpleTones = ['warm', 'concise', 'professional', 'playful'];
    const isSimpleTone = toneValue && simpleTones.includes(toneValue);
    const voiceContext = toneValue && !isSimpleTone ? toneValue : null; // Only use custom text, not enum values
    
    // Debug logging
    console.log('[Compose] Voice & Tone Debug:', {
      settingsTone: settings?.tone,
      toneValue,
      isSimpleTone,
      voiceContext,
      willAddInstructions: !!voiceContext
    });
    
    const defaultMaxTokens = input.channel === 'email' ? 400 : 180;
    const maxOutputTokens = Math.min(defaultMaxTokens, Math.max(120, (settings?.max_length || defaultMaxTokens)));
    
    // Build voice context instruction if custom text provided (like "Casual")
    // Make it VERY prominent in the prompt
    const voiceInstructions = voiceContext 
      ? `\n\n═══════════════════════════════════════════════════════════
🎯 VOICE & TONE REQUIREMENTS (CRITICAL - MUST FOLLOW):
${voiceContext}

You MUST match this voice and tone exactly. This is how the user naturally communicates. 
Use their style, phrasing, energy level, and communication patterns.
Do NOT use formal language if the tone is casual. Do NOT use casual language if the tone is formal.
The message should sound like it was written by the user themselves in this voice.
═══════════════════════════════════════════════════════════\n\n`
      : '';
    
    // Build system message with voice context if available
    const systemMessage = voiceContext 
      ? `You are an assistant helping craft ${input.channel} messages. The user has specified their preferred voice and tone: "${voiceContext}". You MUST match this voice and tone in every message you generate. Be authentic, helpful, and match the user's natural communication style.`
      : `You are an assistant helping craft ${input.channel} messages. Be concise, helpful, and authentic.`;
    
    const prompt = `Goal: ${input.goal}
Channel: ${input.channel}
${voiceInstructions}Compose in a ${isSimpleTone ? toneValue : (voiceContext ? 'natural' : 'warm')} tone. Obey max length if provided (${maxOutputTokens}).
Use persona notes and contact context honestly; do not invent facts. Keep it helpful and actionable.
${goalsContext}
${tmplInfo}

Contact Context
${contactCtx.slice(0, 200)}

Persona Notes (top 3)
${personaSummaries.slice(0, 200) || '- none'}

Variables
${varsSnippet}

Consider how this message can advance relevant goals while maintaining authenticity. DO NOT explicitly mention the user's goals unless it's natural to do so. Return just the message body. If email, include a subject line on the first line as 'Subject: ...'`;

    console.log('[Compose] Prompt includes voice instructions:', voiceInstructions.length > 0);
    if (voiceContext) {
      console.log('[Compose] Voice context being used:', voiceContext);
    }

    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxOutputTokens,
    });

    const text: string = resp.choices[0]?.message?.content ?? '';
    let subject: string | undefined;
    let body = text.trim();
    if (input.channel === 'email') {
      const m = /^Subject:\s*(.*)$/im.exec(body);
      if (m) {
        subject = m[1].trim();
        body = body.replace(/^Subject:.*$/im, '').trim();
      }
    }

    const draft: any = { email: null, sms: null, dm: null };
    if (input.channel === 'email') draft.email = { subject: subject || '', body, closing: '' };
    if (input.channel === 'sms') draft.sms = { body } as any;
    if (input.channel === 'dm') draft.dm = { body } as any;

    // Increment usage counter (after successful generation)
    await incrementComposeUsage(supabase, user.id);

    const sources = {
      persona_note_ids: personaNotes.map(n => n.id),
      contact_context: contact ? { warmth: contact.warmth, last_interaction_at: contact.last_interaction_at } : null,
      template_id: template?.id || null,
    };

    // Starter-lite analytics: increment template uses_count (non-blocking)
    if (template?.id) {
      (async () => {
        try {
          const { data: stat } = await supabase
            .from('templates_stats')
            .select('uses_count')
            .eq('template_id', template.id)
            .maybeSingle();
          if (stat) {
            await supabase
              .from('templates_stats')
              .update({ uses_count: (stat.uses_count ?? 0) + 1 })
              .eq('template_id', template.id);
          } else {
            await supabase
              .from('templates_stats')
              .insert([{ template_id: template.id, user_id: user.id, uses_count: 1 }]);
          }
        } catch {}
      })();
    }

    // Log compose session (non-blocking; table may not exist yet)
    let compose_session_id: string | null = null;
    try {
      (async () => {
        try {
          await supabase
            .from('compose_sessions')
            .insert([{ user_id: user.id, contact_id: input.contact_id, goal_id: null, goal_text: input.goal, channel: input.channel, template_id: template?.id || null, variables: input.variables || {}, sources, draft, safety: { pii_flags: [], spam_risk: 'unknown' } }])
            .select('id')
            .single();
        } catch {}
      })();
    } catch { /* ignore */ }

    // Return response with usage info
    return ok({ 
      compose_session_id, 
      draft, 
      sources, 
      alternatives: [], 
      safety: { pii_flags: [], spam_risk: 'unknown' },
      usage: {
        current: (usageCheck.current_usage || 0) + 1,
        limit: usageCheck.limit,
        remaining: Math.max(0, (usageCheck.remaining || 0) - 1),
        resets_at: usageCheck.resets_at,
        tier: usageCheck.tier,
      },
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
