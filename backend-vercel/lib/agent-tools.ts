import { SupabaseClient } from '@supabase/supabase-js';
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS } from './openai';

export type ToolExecutionContext = {
  supabase: SupabaseClient;
  userId: string;
};

export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
};

// Tool execution router
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'get_contact':
        return await getContact(args, context);
      case 'search_contacts':
        return await searchContacts(args, context);
      case 'get_contact_interactions':
        return await getContactInteractions(args, context);
      case 'get_persona_notes':
        return await getPersonaNotes(args, context);
      case 'compose_message':
        return await composeMessage(args, context);
      case 'analyze_contact':
        return await analyzeContact(args, context);
      case 'update_contact':
        return await updateContact(args, context);
      case 'get_message_goals':
        return await getMessageGoals(args, context);
      case 'process_voice_note':
        return await processVoiceNote(args, context);
      case 'get_user_goals':
        return await getUserGoals(args, context);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Tool implementations
async function getContact(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, query } = args;
  
  if (contact_id) {
    const { data, error } = await ctx.supabase
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .maybeSingle();
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
  
  if (query) {
    const { data, error } = await ctx.supabase
      .from('contacts')
      .select('*')
      .ilike('display_name', `%${query}%`)
      .limit(5);
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
  
  return { success: false, error: 'contact_id or query required' };
}

async function searchContacts(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { query, filters = {}, limit = 10 } = args;
  
  let q = ctx.supabase
    .from('contacts')
    .select('id, display_name, emails, phones, tags, warmth, warmth_band, last_interaction_at')
    .is('deleted_at', null)
    .limit(limit);
  
  if (query) {
    q = q.or(`display_name.ilike.%${query}%,emails.cs.{${query}}`);
  }
  
  if (filters.tag) q = q.contains('tags', [filters.tag]);
  if (filters.warmth_band) q = q.eq('warmth_band', filters.warmth_band);
  
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  
  return { success: true, data };
}

async function getContactInteractions(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, limit = 10 } = args;
  
  const { data, error } = await ctx.supabase
    .from('interactions')
    .select('id, kind, content, created_at')
    .eq('contact_id', contact_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function getPersonaNotes(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, tags, type, limit = 5 } = args;
  
  let q = ctx.supabase
    .from('persona_notes')
    .select('id, type, title, body_text, transcript, tags, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (type) q = q.eq('type', type);
  if (tags && tags.length > 0) q = q.overlaps('tags', tags);
  
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  
  return { success: true, data };
}

async function composeMessage(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, goal_type, goal_description, channel = 'email', tone = 'warm' } = args;
  
  // Get contact info
  const { data: contact } = await ctx.supabase
    .from('contacts')
    .select('display_name, emails, tags, warmth, notes')
    .eq('id', contact_id)
    .maybeSingle();
  
  if (!contact) return { success: false, error: 'Contact not found' };
  
  // Get recent interactions
  const { data: interactions } = await ctx.supabase
    .from('interactions')
    .select('kind, content, created_at')
    .eq('contact_id', contact_id)
    .order('created_at', { ascending: false })
    .limit(3);
  
  // Get relevant persona notes
  const { data: personaNotes } = await ctx.supabase
    .from('persona_notes')
    .select('body_text, transcript')
    .overlaps('tags', [contact.display_name, goal_type])
    .limit(3);
  
  // Build context for composition
  const contextParts = [
    `Contact: ${contact.display_name}`,
    `Warmth: ${contact.warmth}/100`,
    `Tags: ${contact.tags?.join(', ') || 'none'}`,
    `Goal: ${goal_type} - ${goal_description || 'reach out'}`,
    `Channel: ${channel}`,
    `Tone: ${tone}`
  ];
  
  if (interactions && interactions.length > 0) {
    contextParts.push(`\nRecent Interactions:\n${interactions.map(i => `- ${i.created_at}: ${i.content?.substring(0, 100)}`).join('\n')}`);
  }
  
  if (personaNotes && personaNotes.length > 0) {
    const notes = personaNotes.map(n => n.transcript || n.body_text).filter(Boolean).join('\n');
    contextParts.push(`\nPersonal Context:\n${notes.substring(0, 500)}`);
  }
  
  const prompt = contextParts.join('\n');
  
  // Generate message
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.composer },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: channel === 'sms' ? 150 : 500
  });
  
  const message = response.choices[0]?.message?.content || '';
  
  return {
    success: true,
    data: {
      message,
      context_used: {
        contact: contact.display_name,
        interactions_count: interactions?.length || 0,
        persona_notes_count: personaNotes?.length || 0
      }
    }
  };
}

async function analyzeContact(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, analysis_type = 'context_summary' } = args;

  // Fetch contact and interactions in parallel with slim selects
  const contactSel = ctx.supabase
    .from('contacts')
    .select('display_name, warmth, tags, last_interaction_at, notes')
    .eq('id', contact_id)
    .maybeSingle();

  const interactionsSel = ctx.supabase
    .from('interactions')
    .select('kind, content, created_at')
    .eq('contact_id', contact_id)
    .order('created_at', { ascending: false })
    .limit(5);

  const [{ data: contact }, { data: interactions }] = await Promise.all([contactSel, interactionsSel]);
  if (!contact) return { success: false, error: 'Contact not found' };

  // Build compact analysis context
  const contextData = {
    contact: {
      name: contact.display_name,
      warmth: contact.warmth,
      tags: contact.tags,
      last_interaction: contact.last_interaction_at,
      notes: (contact.notes || '').substring(0, 300)
    },
    recent_interactions: (interactions || []).map(i => ({
      kind: i.kind,
      date: i.created_at,
      content: (i.content || '').substring(0, 120)
    }))
  };

  const prompts = {
    relationship_health: `Analyze the relationship health with ${contact.display_name}. Consider warmth score, interaction frequency, and engagement quality. Provide a health score (1-10) and specific recommendations.`,
    engagement_suggestions: `Suggest 3 specific engagement actions for ${contact.display_name} based on their profile and interaction history. Be actionable and personalized.`,
    context_summary: `Provide a concise context summary for ${contact.display_name}. Include key relationship insights, communication patterns, and important context for future interactions.`
  } as const;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.analyzer },
      { role: 'user', content: `${prompts[analysis_type as keyof typeof prompts]}\n\nContext:\n${JSON.stringify(contextData)}` }
    ],
    temperature: 0.3,
    max_tokens: 250
  });

  const analysis = response.choices[0]?.message?.content || '';
  return { success: true, data: { analysis, contact: contact.display_name } };
}

async function updateContact(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, updates } = args;
  
  const { data, error } = await ctx.supabase
    .from('contacts')
    .update(updates)
    .eq('id', contact_id)
    .select()
    .maybeSingle();
  
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function getMessageGoals(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { contact_id, category } = args;
  
  const { data: contact } = await ctx.supabase
    .from('contacts')
    .select('display_name, tags, warmth_band')
    .eq('id', contact_id)
    .maybeSingle();
  
  if (!contact) return { success: false, error: 'Contact not found' };
  
  // Get goal templates
  const { data: goals } = await ctx.supabase
    .from('goals')
    .select('id, kind, name, description, channel_suggestions')
    .eq('is_active', true)
    .order('name');
  
  // Filter by category if specified
  const filteredGoals = category
    ? goals?.filter(g => g.kind === category)
    : goals;
  
  return {
    success: true,
    data: {
      contact: contact.display_name,
      suggested_goals: filteredGoals || [],
      context: {
        warmth_band: contact.warmth_band,
        tags: contact.tags
      }
    }
  };
}

async function processVoiceNote(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { note_id, extract_contacts = true, extract_actions = true } = args;
  
  const { data: note } = await ctx.supabase
    .from('persona_notes')
    .select('*')
    .eq('id', note_id)
    .maybeSingle();
  
  if (!note) return { success: false, error: 'Note not found' };
  
  const content = note.transcript || note.body_text || '';
  if (!content) return { success: false, error: 'No content to process' };
  
  // Use AI to extract structured information
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.transcriber },
      {
        role: 'user',
        content: `Process this voice note and extract:\n${extract_contacts ? '- Contact names mentioned\n' : ''}${extract_actions ? '- Action items\n' : ''}- Sentiment (positive/neutral/negative)\n- Main topics/tags\n- Category (personal/networking/business)\n\nVoice Note:\n${content}\n\nRespond with valid JSON only.`
      }
    ],
    temperature: 0.3,
    max_tokens: 300,
    response_format: { type: 'json_object' }
  });
  
  const extracted = JSON.parse(response.choices[0]?.message?.content || '{}');
  
  // Update note with extracted metadata
  await ctx.supabase
    .from('persona_notes')
    .update({
      metadata: {
        ...note.metadata,
        ai_processed: true,
        extracted_data: extracted,
        processed_at: new Date().toISOString()
      }
    })
    .eq('id', note_id);
  
  return { success: true, data: { note_id, extracted } };
}

async function getUserGoals(args: any, ctx: ToolExecutionContext): Promise<ToolResult> {
  const { category, active_only = true, contact_id } = args;
  
  // Build query
  let q = ctx.supabase
    .from('user_goals')
    .select('id, goal_category, goal_text, goal_description, priority, target_count, current_progress, tags, created_at')
    .eq('user_id', ctx.userId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (active_only) {
    q = q.eq('is_active', true);
  }
  
  if (category) {
    q = q.eq('goal_category', category);
  }
  
  const { data: goals, error } = await q;
  
  if (error) return { success: false, error: error.message };
  
  // If contact_id provided, also fetch goal associations
  let associations = null;
  if (contact_id && goals && goals.length > 0) {
    const { data: assocData } = await ctx.supabase
      .from('goal_contact_associations')
      .select('goal_id, relevance_score, notes')
      .eq('contact_id', contact_id)
      .eq('user_id', ctx.userId);
    
    associations = assocData || [];
  }
  
  return {
    success: true,
    data: {
      goals: goals || [],
      associations: associations,
      summary: {
        total: goals?.length || 0,
        by_category: goals?.reduce((acc: any, g: any) => {
          acc[g.goal_category] = (acc[g.goal_category] || 0) + 1;
          return acc;
        }, {}),
        by_priority: goals?.reduce((acc: any, g: any) => {
          acc[g.priority] = (acc[g.priority] || 0) + 1;
          return acc;
        }, {})
      }
    }
  };
}
