// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/marketing/ugc/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { supabaseAdmin } from '@/backend/lib/supabase';

// Pre-built UGC concept templates
const UGC_CONCEPTS = [
  {
    concept: 'The Text Prompt',
    description: 'Give a stranger $25 to text someone they\'ve been meaning to reach out to. Film the moment they decide who to text and what to say.',
    awareness_stage: 1,
    location_type: 'street',
    participant_incentive: '$25 cash',
    hook_script: 'Hey, do you have someone you\'ve been thinking about hitting up? What if I gave you $25 to do it right now?',
    filming_notes: 'Capture the moment they realize who to text. Show genuine emotion. Get their message on screen.',
    expected_duration_seconds: 30,
    expected_ctr_min: 0.04,
    expected_ctr_max: 0.08
  },
  {
    concept: 'The 30-Day Challenge',
    description: 'Ask someone when was the last time they reached out to a close friend. Film the pause and realization.',
    awareness_stage: 2,
    location_type: 'street',
    participant_incentive: '$25 gift card',
    hook_script: 'Quick question - when was the last time you reached out to someone you really care about, just to check in?',
    filming_notes: 'Capture the hesitation and realization. The pause is the key emotion.',
    expected_duration_seconds: 45,
    expected_ctr_min: 0.05,
    expected_ctr_max: 0.09
  },
  {
    concept: 'The Drift Check',
    description: 'Show someone their phone\'s last contacted dates for their top 5 friends. Film their reaction.',
    awareness_stage: 3,
    location_type: 'office',
    participant_incentive: '$30 app credit',
    hook_script: 'Can I show you something about your phone that might surprise you?',
    filming_notes: 'Show the screen of last contact times. Capture the "oh no" moment when they see how long it\'s been.',
    expected_duration_seconds: 60,
    expected_ctr_min: 0.06,
    expected_ctr_max: 0.10
  },
  {
    concept: 'The Guilt Reveal',
    description: 'Ask strangers if there\'s someone they feel guilty about not calling back. Who and why?',
    awareness_stage: 2,
    location_type: 'coffee_shop',
    participant_incentive: '$25 coffee credit',
    hook_script: 'Can I ask you something real? Is there someone you feel bad about losing touch with?',
    filming_notes: 'Let them talk. This is about emotional honesty. Capture the vulnerability.',
    expected_duration_seconds: 30,
    expected_ctr_min: 0.07,
    expected_ctr_max: 0.11
  }
];

export const initializeUGCBriefsProcedure = publicProcedure
  .mutation(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('🎬 Initializing UGC briefs for user:', userId);

      // Check if user already has briefs
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('ugc_briefs')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        console.log('✅ User already has UGC briefs');
        return { message: 'UGC briefs already initialized' };
      }

      // Insert template concepts
      const briefs = UGC_CONCEPTS.map(concept => ({
        user_id: userId,
        concept: concept.concept,
        awareness_stage: concept.awareness_stage,
        location_type: concept.location_type,
        participant_incentive: concept.participant_incentive,
        hook_script: concept.hook_script,
        filming_notes: concept.filming_notes,
        expected_duration_seconds: concept.expected_duration_seconds,
        expected_ctr_min: concept.expected_ctr_min,
        expected_ctr_max: concept.expected_ctr_max,
        status: 'draft'
      }));

      const { data, error } = await supabaseAdmin
        .from('ugc_briefs')
        .insert(briefs)
        .select();

      if (error) throw error;

      console.log('✅ Initialized', data?.length || 0, 'UGC concept templates');

      return {
        success: true,
        initialized: data?.length || 0,
        concepts: data || []
      };
    } catch (error: any) {
      console.error('❌ UGC briefs initialization failed:', error);
      throw new Error(`Failed to initialize UGC briefs: ${error.message}`);
    }
  });

export const listUGCBriefsProcedure = publicProcedure
  .input(
    z.object({
      status: z.enum(['draft', 'in_production', 'raw_footage', 'edited', 'published', 'archived']).optional(),
      awareness_stage: z.number().int().min(1).max(5).optional(),
      limit: z.number().int().min(1).max(100).default(20)
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      let query = supabaseAdmin
        .from('ugc_briefs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      if (input.awareness_stage) {
        query = query.eq('awareness_stage', input.awareness_stage);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { briefs: data || [] };
    } catch (error: any) {
      console.error('❌ Failed to list UGC briefs:', error);
      throw new Error(`Failed to list UGC briefs: ${error.message}`);
    }
  });

export const updateUGCBriefStatusProcedure = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      status: z.enum(['draft', 'in_production', 'raw_footage', 'edited', 'published', 'archived']),
      meta_ad_id: z.string().optional(),
      performance_ctr: z.number().min(0).optional(),
      performance_cpc: z.number().min(0).optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        status: input.status,
        updated_at: new Date().toISOString()
      };

      if (input.meta_ad_id) {
        updateData.meta_ad_id = input.meta_ad_id;
      }

      if (input.performance_ctr !== undefined) {
        updateData.performance_ctr = input.performance_ctr;
      }

      if (input.performance_cpc !== undefined) {
        updateData.performance_cpc = input.performance_cpc;
      }

      const { data, error } = await supabaseAdmin
        .from('ugc_briefs')
        .update(updateData)
        .eq('id', input.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Updated UGC brief status:', input.id, 'to', input.status);

      return { success: true, brief: data };
    } catch (error: any) {
      console.error('❌ Failed to update UGC brief:', error);
      throw new Error(`Failed to update UGC brief: ${error.message}`);
    }
  });
