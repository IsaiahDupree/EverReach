// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/messages/goals/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '@/backend/trpc/server';
import { supabaseAdmin } from '@/backend/lib/supabase';


const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  template: z.string().min(1).max(2000),
  defaultChannels: z.array(z.enum(['sms', 'email', 'dm'])).default(['sms', 'email', 'dm']),
  styleTags: z.array(z.string()).default([])
});

const updateGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  template: z.string().min(1).max(2000).optional(),
  defaultChannels: z.array(z.enum(['sms', 'email', 'dm'])).optional(),
  styleTags: z.array(z.string()).optional()
});

export const listGoalsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    console.log('📋 Listing message goals');
    
    const userOrgs = ctx.orgId;

    const { data: goals, error } = await supabaseAdmin
      .from('message_goals')
      .select('*')
      .eq('org_id', userOrgs)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching goals:', error);
      throw new Error('Failed to fetch message goals');
    }

    console.log(`✅ Found ${goals?.length || 0} message goals`);
    return goals || [];
  });

export const createGoalProcedure = protectedProcedure
  .input(createGoalSchema)
  .mutation(async ({ input, ctx }) => {
    console.log('🎯 Creating message goal:', input.name);
    
    const orgId = ctx.orgId;

    const { data: goal, error } = await supabaseAdmin
      .from('message_goals')
      .insert({
        org_id: orgId,
        user_id: ctx.user!.id,
        name: input.name,
        template: input.template,
        default_channels: input.defaultChannels,
        style_tags: input.styleTags
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating goal:', error);
      throw new Error('Failed to create message goal');
    }

    console.log('✅ Created message goal:', goal.id);
    return goal;
  });

export const updateGoalProcedure = protectedProcedure
  .input(updateGoalSchema)
  .mutation(async ({ input, ctx }) => {
    console.log('📝 Updating message goal:', input.id);
    
    const { id, ...updates } = input;
    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.template) updateData.template = updates.template;
    if (updates.defaultChannels) updateData.default_channels = updates.defaultChannels;
    if (updates.styleTags) updateData.style_tags = updates.styleTags;
    
    updateData.updated_at = new Date().toISOString();

    const { data: goal, error } = await supabaseAdmin
      .from('message_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating goal:', error);
      throw new Error('Failed to update message goal');
    }

    console.log('✅ Updated message goal:', goal.id);
    return goal;
  });

export const deleteGoalProcedure = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🗑️ Deleting message goal:', input.id);
    
    const { error } = await supabaseAdmin
      .from('message_goals')
      .delete()
      .eq('id', input.id);

    if (error) {
      console.error('❌ Error deleting goal:', error);
      throw new Error('Failed to delete message goal');
    }

    console.log('✅ Deleted message goal:', input.id);
    return { success: true };
  });

export const getDefaultGoalsProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🎯 Getting default message goals');
    
    const defaultGoals = [
      {
        name: 'Check In',
        template: 'Write a friendly check-in message to {contact_first}. Keep it casual and ask how they\'re doing. Reference {recent_notes} if available. 2-3 sentences max.',
        defaultChannels: ['sms', 'dm'] as const,
        styleTags: ['casual', 'friendly']
      },
      {
        name: 'Congratulate',
        template: 'Write a congratulatory message to {contact_first} about their recent achievement. Be genuine and specific. Reference {shared_interests} if relevant. 2-3 sentences max.',
        defaultChannels: ['email', 'dm'] as const,
        styleTags: ['warm', 'professional']
      },
      {
        name: 'Share Resource',
        template: 'Share a helpful resource with {contact_first} related to {goal_name}. Explain why you thought of them and how it might be useful. Include a question to start conversation. 3-4 sentences max.',
        defaultChannels: ['email', 'dm'] as const,
        styleTags: ['helpful', 'thoughtful']
      },
      {
        name: 'Ask for Intro',
        template: 'Ask {contact_first} for an introduction to someone in their network. Be specific about who you\'re looking to meet and why. Offer value in return. 3-4 sentences max.',
        defaultChannels: ['email'] as const,
        styleTags: ['professional', 'respectful']
      },
      {
        name: 'Schedule Meeting',
        template: 'Suggest scheduling a meeting with {contact_first} about {goal_name}. Propose specific times and explain the value for both parties. 2-3 sentences max.',
        defaultChannels: ['email', 'sms'] as const,
        styleTags: ['professional', 'direct']
      }
    ];

    console.log(`✅ Returning ${defaultGoals.length} default goals`);
    return defaultGoals;
  });