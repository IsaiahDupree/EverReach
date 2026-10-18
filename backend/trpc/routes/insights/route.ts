import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/server';
import { extractInsights } from '@/backend/lib/openai';
import { supabaseAdmin } from '@/backend/lib/supabase';

export const extractInsightsProcedure = protectedProcedure
  .input(z.object({
    transcript: z.string(),
    personId: z.string().uuid(),
    sourceId: z.string().uuid(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { transcript, personId, sourceId } = input;
    const { orgId } = ctx;

    try {
      // Extract insights using OpenAI
      const insights = await extractInsights(transcript);
      
      // Create pending insight record
      const { data: insight, error } = await supabaseAdmin
        .from('insights')
        .insert({
          org_id: orgId,
          person_id: personId,
          source_id: sourceId,
          proposal: insights,
          confidence: insights.confidence || 0.85,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        insightId: insight.id,
        proposal: insights
      };
    } catch (error) {
      console.error('Insight extraction error:', error);
      throw new Error('Failed to extract insights');
    }
  });

export const approveInsightProcedure = protectedProcedure
  .input(z.object({
    insightId: z.string().uuid(),
    edits: z.record(z.any()).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { insightId, edits } = input;
    const { user } = ctx;

    try {
      // Get the insight
      const { data: insight, error: fetchError } = await supabaseAdmin
        .from('insights')
        .select('*')
        .eq('id', insightId)
        .single();

      if (fetchError) throw fetchError;
      if (insight.status !== 'pending') {
        throw new Error('Insight is not pending');
      }

      // Get the person
      const { data: person, error: personError } = await supabaseAdmin
        .from('people')
        .select('*')
        .eq('id', insight.person_id)
        .single();

      if (personError) throw personError;

      // Apply the insight with any edits
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

      // Update person if there are changes
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
            created_by: user.id
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
          actor_id: user.id
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
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', insightId);
      
      if (approveError) throw approveError;

      return { success: true };
    } catch (error) {
      console.error('Insight approval error:', error);
      throw new Error('Failed to approve insight');
    }
  });

export const rejectInsightProcedure = protectedProcedure
  .input(z.object({
    insightId: z.string().uuid(),
    reason: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { insightId, reason } = input;
    const { user } = ctx;

    try {
      const { error } = await supabaseAdmin
        .from('insights')
        .update({
          status: 'rejected',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', insightId);
      
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Insight rejection error:', error);
      throw new Error('Failed to reject insight');
    }
  });