// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/lib/supabase.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Client-side Supabase client with publishable key (RLS enabled)
export const supabaseClient = createClient(
  process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Database types
export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          org_id: string;
          full_name: string;
          title?: string;
          company?: string;
          emails: string[];
          phones: string[];
          timezone?: string;
          locale?: string;
          location?: any;
          comms: any;
          tags: string[];
          interests: string[];
          goals: string[];
          values: string[];
          key_dates: any[];
          last_interaction?: string;
          last_interaction_summary?: string;
          warmth: number;
          last_suggest_copy_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          full_name: string;
          title?: string;
          company?: string;
          emails?: string[];
          phones?: string[];
          timezone?: string;
          locale?: string;
          location?: any;
          comms?: any;
          tags?: string[];
          interests?: string[];
          goals?: string[];
          values?: string[];
          key_dates?: any[];
          last_interaction?: string;
          last_interaction_summary?: string;
          warmth?: number;
          last_suggest_copy_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          full_name?: string;
          title?: string;
          company?: string;
          emails?: string[];
          phones?: string[];
          timezone?: string;
          locale?: string;
          location?: any;
          comms?: any;
          tags?: string[];
          interests?: string[];
          goals?: string[];
          values?: string[];
          key_dates?: any[];
          last_interaction?: string;
          last_interaction_summary?: string;
          warmth?: number;
          last_suggest_copy_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      voice_calls: {
        Row: {
          id: string;
          org_id: string;
          person_id?: string;
          source_id: string;
          media_id?: string;
          scenario?: string;
          context_scope: 'about_person' | 'about_me';
          started_at?: string;
          ended_at?: string;
          lang?: string;
          stt_model?: string;
          stt_confidence?: number;
          transcript?: string;
          transcript_json?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          person_id?: string;
          source_id: string;
          media_id?: string;
          scenario?: string;
          context_scope?: 'about_person' | 'about_me';
          started_at?: string;
          ended_at?: string;
          lang?: string;
          stt_model?: string;
          stt_confidence?: number;
          transcript?: string;
          transcript_json?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          person_id?: string;
          source_id?: string;
          media_id?: string;
          scenario?: string;
          context_scope?: 'about_person' | 'about_me';
          started_at?: string;
          ended_at?: string;
          lang?: string;
          stt_model?: string;
          stt_confidence?: number;
          transcript?: string;
          transcript_json?: any;
          created_at?: string;
        };
      };
      insights: {
        Row: {
          id: string;
          org_id: string;
          person_id: string;
          source_id?: string;
          proposal: any;
          confidence?: number;
          status: 'pending' | 'approved' | 'rejected';
          reviewer_id?: string;
          reviewed_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          person_id: string;
          source_id?: string;
          proposal: any;
          confidence?: number;
          status?: 'pending' | 'approved' | 'rejected';
          reviewer_id?: string;
          reviewed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          person_id?: string;
          source_id?: string;
          proposal?: any;
          confidence?: number;
          status?: 'pending' | 'approved' | 'rejected';
          reviewer_id?: string;
          reviewed_at?: string;
          created_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          org_id: string;
          kind: string;
          uri?: string;
          sha256?: string;
          meta?: any;
          retention_policy?: string;
          created_by?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          kind: string;
          uri?: string;
          sha256?: string;
          meta?: any;
          retention_policy?: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          kind?: string;
          uri?: string;
          sha256?: string;
          meta?: any;
          retention_policy?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      media_files: {
        Row: {
          id: string;
          org_id: string;
          source_id: string;
          kind: 'audio' | 'video' | 'doc' | 'image';
          storage_url: string;
          mime_type?: string;
          duration_seconds?: number;
          tracks?: any;
          deleted_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          source_id: string;
          kind: 'audio' | 'video' | 'doc' | 'image';
          storage_url: string;
          mime_type?: string;
          duration_seconds?: number;
          tracks?: any;
          deleted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          source_id?: string;
          kind?: 'audio' | 'video' | 'doc' | 'image';
          storage_url?: string;
          mime_type?: string;
          duration_seconds?: number;
          tracks?: any;
          deleted_at?: string;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          source_id?: string;
          person_id?: string;
          title?: string;
          kind?: string;
          raw?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          source_id?: string;
          person_id?: string;
          title?: string;
          kind?: string;
          raw?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          source_id?: string;
          person_id?: string;
          title?: string;
          kind?: string;
          raw?: string;
          created_at?: string;
        };
      };
      doc_chunks: {
        Row: {
          id: string;
          org_id: string;
          doc_id: string;
          ord: number;
          text: string;
          embedding?: number[];
          meta?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          doc_id: string;
          ord: number;
          text: string;
          embedding?: number[];
          meta?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          doc_id?: string;
          ord?: number;
          text?: string;
          embedding?: number[];
          meta?: any;
          created_at?: string;
        };
      };
      interactions: {
        Row: {
          id: string;
          org_id: string;
          person_id: string;
          occurred_at: string;
          channel: 'sms' | 'email' | 'dm' | 'call' | 'meet' | 'note' | 'webhook';
          direction: 'inbound' | 'outbound' | 'internal';
          summary?: string;
          sentiment?: 'pos' | 'neu' | 'neg';
          action_items: string[];
          source_id?: string;
          created_by?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          person_id: string;
          occurred_at?: string;
          channel: 'sms' | 'email' | 'dm' | 'call' | 'meet' | 'note' | 'webhook';
          direction?: 'inbound' | 'outbound' | 'internal';
          summary?: string;
          sentiment?: 'pos' | 'neu' | 'neg';
          action_items?: string[];
          source_id?: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          person_id?: string;
          occurred_at?: string;
          channel?: 'sms' | 'email' | 'dm' | 'call' | 'meet' | 'note' | 'webhook';
          direction?: 'inbound' | 'outbound' | 'internal';
          summary?: string;
          sentiment?: 'pos' | 'neu' | 'neg';
          action_items?: string[];
          source_id?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      ux_events: {
        Row: {
          id: string;
          org_id?: string;
          user_id?: string;
          person_id?: string;
          kind: string;
          payload?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string;
          user_id?: string;
          person_id?: string;
          kind: string;
          payload?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          person_id?: string;
          kind?: string;
          payload?: any;
          created_at?: string;
        };
      };
      field_changes: {
        Row: {
          id: string;
          org_id: string;
          entity_type: string;
          entity_id: string;
          field_path: string;
          old_value?: any;
          new_value?: any;
          reason?: string;
          source_id?: string;
          sha256?: string;
          confidence?: number;
          actor_id?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          entity_type: string;
          entity_id: string;
          field_path: string;
          old_value?: any;
          new_value?: any;
          reason?: string;
          source_id?: string;
          sha256?: string;
          confidence?: number;
          actor_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          entity_type?: string;
          entity_id?: string;
          field_path?: string;
          old_value?: any;
          new_value?: any;
          reason?: string;
          source_id?: string;
          sha256?: string;
          confidence?: number;
          actor_id?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Helper functions
export async function createOrg(name: string) {
  const { data, error } = await supabaseAdmin
    .from('orgs')
    .insert({ name })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPersonById(orgId: string, personId: string) {
  const { data, error } = await supabaseAdmin
    .from('people')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', personId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function listPeople(orgId: string, options: {
  warmthFilter?: 'hot' | 'warm' | 'cool' | 'cold';
  limit?: number;
  offset?: number;
} = {}) {
  let query = supabaseAdmin
    .from('people')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });

  if (options.warmthFilter) {
    const warmthRanges = {
      hot: [60, 100],
      warm: [30, 59],
      cool: [10, 29],
      cold: [0, 9]
    };
    const [min, max] = warmthRanges[options.warmthFilter];
    query = query.gte('warmth', min).lte('warmth', max);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updatePersonWarmth(personId: string, warmth: number) {
  const { error } = await supabaseAdmin
    .from('people')
    .update({ warmth, updated_at: new Date().toISOString() })
    .eq('id', personId);
  
  if (error) throw error;
}

export async function createVoiceCall(data: Database['public']['Tables']['voice_calls']['Insert']) {
  const { data: result, error } = await supabaseAdmin
    .from('voice_calls')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function createInsight(data: Database['public']['Tables']['insights']['Insert']) {
  const { data: result, error } = await supabaseAdmin
    .from('insights')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function getPendingInsights(orgId: string) {
  const { data, error } = await supabaseAdmin
    .from('insights')
    .select(`
      *,
      people!inner(full_name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function approveInsight(insightId: string, reviewerId: string, edits?: any) {
  const { data: insight, error: fetchError } = await supabaseAdmin
    .from('insights')
    .select('*')
    .eq('id', insightId)
    .single();
  
  if (fetchError) throw fetchError;
  if (insight.status !== 'pending') throw new Error('Insight is not pending');

  const { data: person, error: personError } = await supabaseAdmin
    .from('people')
    .select('*')
    .eq('id', insight.person_id)
    .single();
  
  if (personError) throw personError;

  const proposal = { ...insight.proposal, ...edits };
  const changes: any[] = [];

  // Helper to merge arrays
  const mergeArrays = (oldArr: string[] = [], newArr: string[] = []) => 
    Array.from(new Set([...oldArr, ...newArr]));

  // Apply changes
  const updates: any = { updated_at: new Date().toISOString() };
  
  if (proposal.interests?.length) {
    const merged = mergeArrays(person.interests, proposal.interests);
    updates.interests = merged;
    changes.push({
      field_path: 'interests[+]',
      old_value: person.interests,
      new_value: merged
    });
  }

  if (proposal.goals?.length) {
    const merged = mergeArrays(person.goals, proposal.goals);
    updates.goals = merged;
    changes.push({
      field_path: 'goals[+]',
      old_value: person.goals,
      new_value: merged
    });
  }

  if (proposal.values?.length) {
    const merged = mergeArrays(person.values, proposal.values);
    updates.values = merged;
    changes.push({
      field_path: 'values[+]',
      old_value: person.values,
      new_value: merged
    });
  }

  if (proposal.keyDates?.length) {
    const merged = [...(person.key_dates || []), ...proposal.keyDates];
    updates.key_dates = merged;
    changes.push({
      field_path: 'key_dates[+]',
      old_value: person.key_dates,
      new_value: merged
    });
  }

  // Update person
  if (Object.keys(updates).length > 1) {
    const { error: updateError } = await supabaseAdmin
      .from('people')
      .update(updates)
      .eq('id', person.id);
    
    if (updateError) throw updateError;
  }

  // Create interaction for notes
  if (proposal.notes) {
    const { error: interactionError } = await supabaseAdmin
      .from('interactions')
      .insert({
        org_id: person.org_id,
        person_id: person.id,
        channel: 'note',
        direction: 'internal',
        summary: proposal.notes,
        source_id: insight.source_id,
        created_by: reviewerId
      });
    
    if (interactionError) throw interactionError;
  }

  // Log field changes
  if (changes.length > 0) {
    const changeRows = changes.map(change => ({
      org_id: person.org_id,
      entity_type: 'person',
      entity_id: person.id,
      field_path: change.field_path,
      old_value: change.old_value,
      new_value: change.new_value,
      reason: 'insight_approved',
      source_id: insight.source_id,
      actor_id: reviewerId
    }));

    const { error: changesError } = await supabaseAdmin
      .from('field_changes')
      .insert(changeRows);
    
    if (changesError) throw changesError;
  }

  // Mark insight as approved
  const { error: approveError } = await supabaseAdmin
    .from('insights')
    .update({
      status: 'approved',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', insightId);
  
  if (approveError) throw approveError;

  return { success: true };
}

export async function rejectInsight(insightId: string, reviewerId: string, reason?: string) {
  const { error } = await supabaseAdmin
    .from('insights')
    .update({
      status: 'rejected',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', insightId);
  
  if (error) throw error;
  return { success: true };
}

export async function logUXEvent(data: Database['public']['Tables']['ux_events']['Insert']) {
  const { error } = await supabaseAdmin
    .from('ux_events')
    .insert(data);
  
  if (error) throw error;
}

export async function updatePersonLastCopy(personId: string, channel: string, preview: string, userId: string) {
  // Update person
  const { error: personError } = await supabaseAdmin
    .from('people')
    .update({
      last_suggest_copy_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
      last_interaction_summary: preview.slice(0, 180)
    })
    .eq('id', personId);
  
  if (personError) throw personError;

  // Get person's org_id
  const { data: person, error: fetchError } = await supabaseAdmin
    .from('people')
    .select('org_id')
    .eq('id', personId)
    .single();
  
  if (fetchError) throw fetchError;

  // Create interaction
  const { error: interactionError } = await supabaseAdmin
    .from('interactions')
    .insert({
      org_id: person.org_id,
      person_id: personId,
      channel: channel as any,
      direction: 'outbound',
      summary: preview,
      created_by: userId
    });
  
  if (interactionError) throw interactionError;

  return { success: true };
}