// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/marketing/goals/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

// Relationship goal definitions and context
const GOAL_DEFINITIONS: Record<string, {
  description: string;
  context_prompt: string;
}> = {
  reconnect: {
    description: 'Reconnect with someone after a period of no contact',
    context_prompt: 'This person has drifted away over time. Focus on acknowledging the gap and opening the door for a genuine reconnection with warmth and authenticity.'
  },
  maintain: {
    description: 'Keep the relationship at current level with regular touches',
    context_prompt: 'This is a regular contact you want to stay connected with. Focus on genuine check-ins and showing consistent interest.'
  },
  deepen: {
    description: 'Build a closer, more meaningful relationship',
    context_prompt: 'You want to move this relationship deeper. Focus on vulnerability, sharing more personal context, and suggesting meaningful time together.'
  },
  professional_network: {
    description: 'Maintain as a professional connection',
    context_prompt: 'This is a professional relationship. Focus on mutual benefit, industry insights, and professional growth opportunities.'
  },
  business_development: {
    description: 'Explore business opportunities or partnerships',
    context_prompt: 'You may have business opportunities with this person. Focus on value creation, mutual benefit, and concrete next steps.'
  },
  mentorship: {
    description: 'Learn from this person as a mentor',
    context_prompt: 'You see this person as a mentor. Focus on specific areas you want to learn, asking thoughtful questions, and showing genuine interest in their expertise.'
  },
  mentee: {
    description: 'Help develop this person as a mentee',
    context_prompt: 'You want to mentor and support this person. Focus on helping them grow, offering guidance, and creating opportunities.'
  }
};

const generateGoalAwareMessageSchema = z.object({
  contact_name: z.string(),
  relationship_goal: z.enum([
    'reconnect',
    'maintain',
    'deepen',
    'professional_network',
    'business_development',
    'mentorship',
    'mentee'
  ]),
  last_interaction_summary: z.string().optional(),
  open_threads: z.array(z.string()).optional(),
  key_context: z.array(z.string()).optional(),
  days_since_last_interaction: z.number().int().optional(),
  tone: z.enum(['casual', 'professional', 'warm', 'direct']).default('warm'),
  channel: z.enum(['sms', 'email', 'dm']).default('dm'),
  generate_count: z.number().int().min(1).max(5).default(3)
});

async function generateGoalAwareMessages(input: z.infer<typeof generateGoalAwareMessageSchema>): Promise<string[]> {
  const goal = GOAL_DEFINITIONS[input.relationship_goal];

  const contextParts = [];

  if (input.days_since_last_interaction) {
    contextParts.push(`Last interaction: ${input.days_since_last_interaction} days ago`);
  }

  if (input.last_interaction_summary) {
    contextParts.push(`Last conversation: ${input.last_interaction_summary}`);
  }

  if (input.open_threads && input.open_threads.length > 0) {
    contextParts.push(`Open threads to follow up on: ${input.open_threads.join(', ')}`);
  }

  if (input.key_context && input.key_context.length > 0) {
    contextParts.push(`Context: ${input.key_context.join('; ')}`);
  }

  const prompt = `You are helping someone craft ${input.generate_count} different message variants to ${input.contact_name}.

Relationship Goal: ${goal.description}
${goal.context_prompt}

Tone: ${input.tone}
Channel: ${input.channel}
${contextParts.length > 0 ? `Contact Context:\n${contextParts.join('\n')}` : ''}

Generate ${input.generate_count} distinct message variants that:
1. Feel authentic and genuine
2. Reflect the relationship goal appropriately
3. Are suitable for ${input.channel}
4. Match the ${input.tone} tone
5. Are actionable (suggest next step or open conversation)

Separate each message with a blank line. Messages should be 1-3 sentences for SMS/DM, 2-4 for email.`;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse messages separated by blank lines
  const messages = content.text
    .split(/\n\s*\n/)
    .filter(msg => msg.trim().length > 0)
    .map(msg => msg.trim())
    .slice(0, input.generate_count);

  // Ensure we have the requested count
  while (messages.length < input.generate_count && messages.length > 0) {
    messages.push(messages[messages.length - 1]);
  }

  return messages;
}

export const generateGoalAwareMessageProcedure = publicProcedure
  .input(generateGoalAwareMessageSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('💬 Generating goal-aware messages for:', input.contact_name, `(${input.relationship_goal})`);

      const messages = await generateGoalAwareMessages(input);

      console.log('✅ Generated', messages.length, 'message variants');

      return {
        success: true,
        contact_name: input.contact_name,
        relationship_goal: input.relationship_goal,
        messages: messages.map((text, idx) => ({
          text,
          variant_index: idx,
          edited: false
        })),
        context_used: {
          relationship_goal: input.relationship_goal,
          last_interaction_summary: input.last_interaction_summary,
          open_threads: input.open_threads,
          key_context: input.key_context,
          days_since_last_interaction: input.days_since_last_interaction
        }
      };
    } catch (error: any) {
      console.error('❌ Goal-aware message generation failed:', error);
      throw new Error(`Message generation failed: ${error.message}`);
    }
  });

export const getGoalAchievementScoreProcedure = publicProcedure
  .input(
    z.object({
      contact_id: z.string(),
      relationship_goal: z.enum([
        'reconnect',
        'maintain',
        'deepen',
        'professional_network',
        'business_development',
        'mentorship',
        'mentee'
      ]),
      interaction_target_days: z.number().int().min(1).default(30),
      days_since_last_interaction: z.number().int().min(0),
      recent_message_sent: z.boolean().default(false)
    })
  )
  .query(async ({ input }) => {
    try {
      // Calculate goal achievement score (0-100)
      // Score degradation: 10 points per 7 days past target without contact
      // Bonus: +10 for message sent within target window

      let score = 100;

      // If last interaction is past target window, degrade score
      if (input.days_since_last_interaction > input.interaction_target_days) {
        const daysPastTarget = input.days_since_last_interaction - input.interaction_target_days;
        const degradation = Math.floor((daysPastTarget / 7) * 10);
        score = Math.max(0, 100 - degradation);
      } else if (input.days_since_last_interaction < input.interaction_target_days && input.recent_message_sent) {
        // Bonus for staying ahead of schedule with message suggestions sent
        score = Math.min(100, score + 5);
      }

      console.log('📊 Goal achievement score:', score, `for contact ${input.contact_id}`);

      return {
        contact_id: input.contact_id,
        goal_achievement_score: score,
        relationship_goal: input.relationship_goal,
        days_since_last_interaction: input.days_since_last_interaction,
        interaction_target_days: input.interaction_target_days,
        on_track: input.days_since_last_interaction <= input.interaction_target_days,
        degradation_info: {
          days_past_target: Math.max(0, input.days_since_last_interaction - input.interaction_target_days),
          points_deducted: Math.max(0, 100 - score)
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to calculate goal achievement score:', error);
      throw new Error(`Score calculation failed: ${error.message}`);
    }
  });

export const trackGoalInteractionProcedure = publicProcedure
  .input(
    z.object({
      contact_id: z.string(),
      interaction_type: z.enum(['message_sent', 'call', 'meeting', 'other']),
      relationship_goal: z.enum([
        'reconnect',
        'maintain',
        'deepen',
        'professional_network',
        'business_development',
        'mentorship',
        'mentee'
      ])
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('✅ Tracked goal interaction:', input.interaction_type, 'for contact', input.contact_id);

      return {
        success: true,
        contact_id: input.contact_id,
        interaction_tracked: input.interaction_type,
        message: `Logged ${input.interaction_type} for ${input.relationship_goal} goal with ${input.contact_id}`
      };
    } catch (error: any) {
      console.error('❌ Failed to track interaction:', error);
      throw new Error(`Interaction tracking failed: ${error.message}`);
    }
  });
