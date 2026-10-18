// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/messages/generate/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { FLAGS } from '@/constants/flags';
import { openai } from '@/backend/lib/openai';

const generateMessageSchema = z.object({
  personId: z.string().min(1), // Allow any non-empty string, not just UUID
  goalId: z.string(), // Allow any string, not just UUID
  channel: z.enum(['sms', 'email', 'dm']),
  context: z.object({
    goal_name: z.string(),
    contact_first: z.string().optional(),
    contact_last: z.string().optional(),
    contact_role: z.string().optional(),
    company: z.string().optional(),
    recent_notes: z.string().optional(),
    shared_interests: z.string().optional(),
    tone: z.enum(['Casual', 'Professional', 'Warm', 'Direct']).optional(),
    length: z.string().optional()
  })
});

const updateMessageSchema = z.object({
  id: z.string().min(1), // Allow any non-empty string, not just UUID
  status: z.enum(['draft', 'copied', 'sent_inferred', 'sent_confirmed']).optional(),
  chosenIndex: z.number().min(0).max(2).optional(),
  channelSelected: z.enum(['sms', 'email', 'dm']).optional(),
  variants: z.array(z.object({
    text: z.string(),
    edited: z.boolean()
  })).length(3).optional()
});

function fillTemplateAll(template: string, context: any, channel: string): string {
  return template
    .replaceAll('{goal_name}', context.goal_name || '')
    .replaceAll('{contact_first}', context.contact_first || '')
    .replaceAll('{contact_last}', context.contact_last || '')
    .replaceAll('{contact_role}', context.contact_role || '')
    .replaceAll('{company}', context.company || '')
    .replaceAll('{recent_notes}', context.recent_notes || '')
    .replaceAll('{shared_interests}', context.shared_interests || '')
    .replaceAll('{tone}', context.tone?.toLowerCase() || 'friendly')
    .replaceAll('{length}', context.length || 'concise')
    .replaceAll('{channel}', channel);
}

function buildPrompt(goalTemplate: string, context: any, channel: string): string {
  const base = goalTemplate || 
    `Write 3 concise ${channel.toUpperCase()} messages to {contact_first} about {goal_name}.
Tone: friendly, efficient, confident. 2–3 short sentences each. Include one open-ended nudge.`;

  return fillTemplateAll(base, context, channel);
}

function normalizeToThree(raw: string | string[]): string[] {
  const list = Array.isArray(raw) ? raw : raw.split(/\n{2,}|\r\n{2,}/).filter(Boolean);
  while (list.length < 3) list.push(list[list.length-1] ?? 'Follow-up?');
  return list.slice(0, 3).map(s => s.trim());
}

async function callLLM(prompt: string): Promise<string[]> {
  try {
    console.log('🤖 Generating messages with prompt:', prompt.slice(0, 100) + '...');
    
    if (FLAGS.LOCAL_ONLY) {
      console.log('📱 Local-only mode: Using template-based messages');
      
      // Check if this is a screenshot response
      if (prompt.includes('screenshot context:')) {
        // Screenshot-specific templates
        const screenshotTemplates = [
          "Hey {contact_first}, saw your screenshot and wanted to follow up. {goal_name} Let me know your thoughts!",
          "Hi {contact_first}! Thanks for sharing that screenshot. {goal_name} Would love to discuss this further.",
          "Hello {contact_first}, regarding the screenshot you shared - {goal_name} Happy to chat about this anytime!"
        ];
        console.log('✅ Local screenshot template messages generated');
        return screenshotTemplates;
      }
      
      // Default templates for other goals
      const templates = [
        "Hey {contact_first}, hope you're doing well! {recent_notes} Would love to catch up soon.",
        "Hi {contact_first}! Been thinking about our last conversation. {shared_interests} How have things been?",
        "Hello {contact_first}, wanted to reach out and see how you're doing. {recent_notes} Let's connect soon!"
      ];
      
      console.log('✅ Local template messages generated');
      return templates;
    }
    
    // Cloud mode: Try OpenAI directly first to avoid rate limits on external API
    console.log('☁️ Cloud mode: Using OpenAI directly for message generation');
    
    try {
      const client = openai();
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that writes professional, friendly messages. Generate exactly 3 different message variants separated by double newlines. Each message should be 2-3 sentences and have a clear call-to-action.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const content = completion.choices[0]?.message?.content || '';
      const variants = content.split(/\n\s*\n/).filter((v: string) => v.trim()).slice(0, 3);
      
      // Ensure we have exactly 3 variants
      while (variants.length < 3) {
        variants.push(variants[variants.length - 1] || 'Thanks for connecting! Looking forward to hearing from you.');
      }
      
      console.log('✅ OpenAI direct messages generated:', variants.length, 'variants');
      return variants;
    } catch (openaiError) {
      console.error('❌ OpenAI direct failed, trying external API as fallback:', openaiError);
      
      // Fallback to external API
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that writes professional, friendly messages. Generate exactly 3 different message variants separated by double newlines. Each message should be 2-3 sentences and have a clear call-to-action.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
        }),
      });
      
      const data = await response.json();
      const completion: string | undefined = data?.completion;
      
      if (completion) {
        const variants = completion.split(/\n\s*\n/).filter((v: string) => v.trim()).slice(0, 3);
        
        // Ensure we have exactly 3 variants
        while (variants.length < 3) {
          variants.push(variants[variants.length - 1] || 'Thanks for connecting! Looking forward to hearing from you.');
        }
        
        console.log('✅ External API fallback messages generated:', variants.length, 'variants');
        return variants;
      } else {
        throw new Error('No completion from external API');
      }
    }
  } catch (error) {
    console.error('❌ Message generation failed completely:', error);
    // Fallback messages
    return [
      `Hey there, quick check-in on our last conversation. How are things going?`,
      `Thinking about our chat earlier. Any updates you'd like to share?`,
      `Hope you're doing well! Wanted to follow up and see how I can help.`
    ];
  }
}

export const generateMessageProcedure = publicProcedure
  .input(generateMessageSchema)
  .mutation(async ({ input, ctx }: { input: z.infer<typeof generateMessageSchema>; ctx: any }) => {
    console.log('🎯 Generating message for person:', input.personId);
    
    try {
      // Use default goals for now
      const defaultGoals = {
        'check_in': {
          id: 'check_in',
          name: 'Check In',
          template: 'Write a friendly {channel} message to {contact_first} for a casual check-in. Reference {shared_interests} or {recent_notes} if relevant. Keep it {tone} and {length}. End with an open question.',
        },
        'congratulate': {
          id: 'congratulate',
          name: 'Congratulate',
          template: 'Write a {tone} {channel} message to {contact_first} congratulating them on a recent achievement. Reference {recent_notes} if available. Keep it {length} and genuine.',
        },
        'share_resource': {
          id: 'share_resource',
          name: 'Share Resource',
          template: 'Write a {channel} message to {contact_first} sharing a helpful resource. Connect it to {shared_interests} or {recent_notes}. Be {tone} and explain why it\'s relevant. Keep it {length}.',
        },
        'ask_intro': {
          id: 'ask_intro',
          name: 'Ask for Intro',
          template: 'Write a {tone} {channel} message to {contact_first} requesting an introduction. Reference your relationship and {shared_interests}. Be specific about who and why. Keep it {length}.',
        },
        'schedule_meet': {
          id: 'schedule_meet',
          name: 'Schedule Meeting',
          template: 'Write a {channel} message to {contact_first} proposing a meeting or call. Reference {recent_notes} or {shared_interests} for context. Be {tone} and suggest specific times. Keep it {length}.',
        },
        'follow_up': {
          id: 'follow_up',
          name: 'Follow Up',
          template: 'Write a {tone} {channel} follow-up message to {contact_first} about a previous conversation. Reference {recent_notes} and next steps. Keep it {length} and actionable.',
        },
        'thank_you': {
          id: 'thank_you',
          name: 'Thank You',
          template: 'Write a {tone} {channel} thank you message to {contact_first}. Reference what you\'re thanking them for from {recent_notes}. Be specific and genuine. Keep it {length}.',
        },
        'custom': {
          id: 'custom',
          name: 'Custom',
          template: 'Write a {channel} message to {contact_first} about: {goal_name}. Keep it {tone} and {length}.',
        },
        'screenshot_response': {
          id: 'screenshot_response',
          name: 'Screenshot Response',
          template: 'Write a {channel} message to {contact_first} responding to this screenshot context: {goal_name}. Keep it {tone} and {length}.',
        }
      };
      
      const goal = defaultGoals[input.goalId as keyof typeof defaultGoals];
      
      if (!goal) {
        console.error('❌ Goal not found:', input.goalId);
        throw new Error(`Goal not found: ${input.goalId}`);
      }

      // Build prompt and generate variants
      const prompt = buildPrompt(goal.template, input.context, input.channel);
      let variants = await callLLM(prompt);
      
      // Ensure all placeholders are resolved in variants
      variants = variants.map(text => fillTemplateAll(text, input.context, input.channel));

      // Return simplified response
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdVariants = variants.map((text, index) => ({
        text,
        variant_index: index,
        edited: false
      }));

      console.log('✅ Generated message with', variants.length, 'variants');
      return {
        id: messageId,
        variants: createdVariants
      };
    } catch (error) {
      console.error('❌ Message generation error:', error);
      throw new Error(`Message generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

export const updateMessageProcedure = publicProcedure
  .input(updateMessageSchema)
  .mutation(async ({ input, ctx }: { input: z.infer<typeof updateMessageSchema>; ctx: any }) => {
    console.log('📝 Updating message:', input.id);
    
    // For now, just return success
    console.log('✅ Updated message:', input.id);
    return { success: true, id: input.id };
  });

export const trackEventProcedure = publicProcedure
  .input(z.object({
    name: z.string(),
    properties: z.record(z.string(), z.any()).default({})
  }))
  .mutation(async ({ input, ctx }: { input: { name: string; properties: Record<string, any> }; ctx: any }) => {
    console.log('📊 Tracking event:', input.name);
    
    // For now, just log and return success
    console.log('✅ Tracked event:', input.name);
    return { success: true };
  });

export const listMessagesProcedure = publicProcedure
  .input(z.object({
    personId: z.string().min(1).optional(), // Allow any non-empty string, not just UUID
    limit: z.number().min(1).max(100).default(20)
  }))
  .query(async ({ input, ctx }: { input: { personId?: string; limit: number }; ctx: any }) => {
    console.log('📋 Listing generated messages');
    
    // For now, return empty array
    console.log(`✅ Found 0 messages`);
    return [];
  });