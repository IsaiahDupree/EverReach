import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/server';
import { supabaseAdmin } from '@/backend/lib/supabase';
import { buildContextCard, craftMessage } from '@/backend/lib/openai';

export const craftMessageProcedure = protectedProcedure
  .input(z.object({
    personId: z.string().uuid(),
    messageGoal: z.object({
      goal: z.enum(['check_in', 'congratulate', 'share_resource', 'ask_intro', 'schedule_meet']),
      channel: z.enum(['sms', 'email', 'dm']),
      tone: z.enum(['casual', 'neutral', 'formal']),
      brevity: z.enum(['short', 'medium', 'long']),
    }),
    myContext: z.record(z.any()).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { personId, messageGoal, myContext } = input;
    const { user, orgId } = ctx;

    try {
      // Get person details
      const { data: person, error: personError } = await supabaseAdmin
        .from('people')
        .select('*')
        .eq('id', personId)
        .eq('org_id', orgId)
        .single();

      if (personError) throw personError;

      // Build context card
      const contextCard = await buildContextCard(person, myContext);

      // Craft message
      const { drafts, flagged } = await craftMessage(contextCard, myContext, messageGoal);

      // Log UX event
      await supabaseAdmin
        .from('ux_events')
        .insert({
          org_id: orgId,
          user_id: user.id,
          person_id: personId,
          kind: 'message_suggested',
          payload: { messageGoal, preview: drafts.variants?.[0] }
        });

      return { drafts, flagged };
    } catch (error) {
      console.error('Message crafting error:', error);
      throw new Error('Failed to craft message');
    }
  });

export const copyMessageProcedure = protectedProcedure
  .input(z.object({
    personId: z.string().uuid(),
    channel: z.enum(['sms', 'email', 'dm']),
    preview: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { personId, channel, preview } = input;
    const { user, orgId } = ctx;

    try {
      // Log copy event
      await supabaseAdmin
        .from('ux_events')
        .insert({
          org_id: orgId,
          user_id: user.id,
          person_id: personId,
          kind: 'message_copied',
          payload: { channel, preview }
        });

      // Update person's last interaction
      await supabaseAdmin
        .from('people')
        .update({
          last_suggest_copy_at: new Date().toISOString(),
          last_interaction: new Date().toISOString(),
          last_interaction_summary: preview.slice(0, 180)
        })
        .eq('id', personId);

      // Create interaction record
      await supabaseAdmin
        .from('interactions')
        .insert({
          org_id: orgId,
          person_id: personId,
          channel,
          direction: 'outbound',
          summary: preview,
          created_by: user.id
        });

      return { success: true };
    } catch (error) {
      console.error('Copy message error:', error);
      throw new Error('Failed to log message copy');
    }
  });

export const getContextCardProcedure = protectedProcedure
  .input(z.object({
    personId: z.string().uuid(),
    myContext: z.record(z.any()).optional(),
  }))
  .query(async ({ input, ctx }) => {
    const { personId, myContext } = input;
    const { orgId } = ctx;

    try {
      // Get person details
      const { data: person, error: personError } = await supabaseAdmin
        .from('people')
        .select('*')
        .eq('id', personId)
        .eq('org_id', orgId)
        .single();

      if (personError) throw personError;

      // Build context card
      const contextCard = await buildContextCard(person, myContext);

      return { contextCard };
    } catch (error) {
      console.error('Context card error:', error);
      throw new Error('Failed to build context card');
    }
  });