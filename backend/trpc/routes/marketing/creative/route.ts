// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/marketing/creative/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/backend/lib/supabase';

const client = new Anthropic();

const generateCreativeSchema = z.object({
  awareness_stage: z.number().int().min(1).max(5),
  format: z.enum(['video_script', 'static_copy', 'carousel_copy']),
  angle: z.enum(['friendship_fade', 'guilt', 'opportunity_loss', 'professional_drift']),
  duration_seconds: z.number().int().optional()
});

const awarenessDescriptions: Record<number, { title: string; description: string }> = {
  1: {
    title: 'Unaware',
    description: 'Audience has no label for their problem. They feel it but don\'t name it.'
  },
  2: {
    title: 'Problem Aware',
    description: 'Audience knows they drift from people and that it\'s a problem.'
  },
  3: {
    title: 'Solution Aware',
    description: 'Audience knows CRM apps exist and that there\'s a solution category.'
  },
  4: {
    title: 'Product Aware',
    description: 'Audience has seen EverReach. Aware of features and social proof.'
  },
  5: {
    title: 'Most Aware',
    description: 'Audience wants EverReach. Offer, urgency, and conversion focused.'
  }
};

interface FATEScore {
  familiarity: number;
  authority: number;
  trust: number;
  emotion: number;
  total: number;
  passes: boolean;
}

async function generateCreativeBrief(input: z.infer<typeof generateCreativeSchema>): Promise<{
  hook_text: string;
  body: string;
  cta: string;
  shot_list?: any;
  character_counts?: any;
}> {
  const awareness = awarenessDescriptions[input.awareness_stage];

  const prompt = `You are an expert copywriter specializing in mobile app marketing. Generate a compelling ad creative brief for EverReach, a personal CRM app that helps users maintain relationships.

Awareness Stage: ${input.awareness_stage} - ${awareness.title}
Stage Description: ${awareness.description}
Format: ${input.format}
Angle: ${input.angle}
Duration: ${input.duration_seconds || 30} seconds

The app's core value: EverReach helps you maintain friendships through AI-powered warmth scoring that shows you who you're drifting from and suggests what to say next.

Angle-specific guidance:
- friendship_fade: "That feeling when you realize you haven't talked to someone in months"
- guilt: Appeal to the feeling of guilt about losing touch
- opportunity_loss: "What opportunities are you missing by not staying connected?"
- professional_drift: "Your professional network is your net worth"

Generate a structured creative brief with:
1. hook_text (max 20 words): The opening line that hooks attention
2. body (max 100 words): Supporting copy that builds the case
3. cta (max 10 words): Clear call-to-action

${
  input.format === 'video_script'
    ? `Also include shot_list with 5-7 scenes describing the visual progression.`
    : input.format === 'carousel_copy'
    ? `Also include character_counts for 3-5 slides, optimized for scrolling.`
    : ''
}

Return ONLY a valid JSON object with hook_text, body, cta, and optionally shot_list or character_counts.`;

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

  // Parse the JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse creative brief from Claude response');
  }

  const brief = JSON.parse(jsonMatch[0]);
  return brief;
}

async function checkFATEScore(brief: {
  hook_text: string;
  body: string;
  cta: string;
}, input: z.infer<typeof generateCreativeSchema>): Promise<FATEScore> {
  const awareness = awarenessDescriptions[input.awareness_stage];

  const prompt = `You are an expert ad creative evaluator. Score this ad creative on the FATE framework (Familiarity, Authority, Trust, Emotion).

Ad Creative:
Hook: "${brief.hook_text}"
Body: "${brief.body}"
CTA: "${brief.cta}"

Context:
- App: EverReach (personal CRM for maintaining relationships)
- Awareness Stage: ${input.awareness_stage} - ${awareness.title}
- Target Angle: ${input.angle}

Score each dimension 0-1 (0=fails, 1=excellent):

1. Familiarity: Does the hook reference a moment the target audience already lives? (Does it feel real to them?)
2. Authority: Is there social proof or credibility signal? (Who's saying this matters?)
3. Trust: Is the CTA low-commitment and believable for this awareness stage?
4. Emotion: Does the copy name an emotion the user already feels? (Does it resonate?)

Return ONLY a JSON object with familiarity, authority, trust, emotion (all 0-1 numbers), and reason (brief explanation). Example:
{"familiarity": 0.8, "authority": 0.6, "trust": 0.7, "emotion": 0.9, "reason": "..."}`;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
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

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse FATE score from Claude response');
  }

  const score = JSON.parse(jsonMatch[0]);
  const total = (score.familiarity || 0) + (score.authority || 0) + (score.trust || 0) + (score.emotion || 0);

  return {
    familiarity: score.familiarity || 0,
    authority: score.authority || 0,
    trust: score.trust || 0,
    emotion: score.emotion || 0,
    total,
    passes: total >= 3.0
  };
}

export const generateCreativeProcedure = publicProcedure
  .input(generateCreativeSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('🎨 Generating ad creative for awareness stage:', input.awareness_stage);

      // Get user_id from context (assumes it's set by middleware)
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Generate the creative brief
      const brief = await generateCreativeBrief(input);

      // Check FATE score
      const fateScore = await checkFATEScore(brief, input);

      // Determine status based on FATE score
      const status = fateScore.passes ? 'approved_for_spend' : 'needs_revision';

      // Save to database
      const { data, error } = await supabaseAdmin
        .from('ad_creative_briefs')
        .insert({
          user_id: userId,
          awareness_stage: input.awareness_stage,
          format: input.format,
          angle: input.angle,
          hook_text: brief.hook_text,
          body: brief.body,
          cta: brief.cta,
          duration_seconds: input.duration_seconds,
          shot_list: brief.shot_list || null,
          character_counts: brief.character_counts || null,
          fate_score: fateScore.total,
          fate_breakdown: {
            familiarity: fateScore.familiarity,
            authority: fateScore.authority,
            trust: fateScore.trust,
            emotion: fateScore.emotion
          },
          status
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('✅ Generated creative:', data.id, 'Status:', status);

      return {
        id: data.id,
        hook_text: brief.hook_text,
        body: brief.body,
        cta: brief.cta,
        duration_seconds: input.duration_seconds,
        shot_list: brief.shot_list,
        character_counts: brief.character_counts,
        fate_score: fateScore.total,
        fate_breakdown: fateScore,
        status
      };
    } catch (error: any) {
      console.error('❌ Creative generation failed:', error);
      throw new Error(`Creative generation failed: ${error.message}`);
    }
  });

export const listCreativesProcedure = publicProcedure
  .input(
    z.object({
      awareness_stage: z.number().int().min(1).max(5).optional(),
      status: z.enum(['draft', 'needs_revision', 'approved_for_spend', 'published', 'archived']).optional(),
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
        .from('ad_creative_briefs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.awareness_stage) {
        query = query.eq('awareness_stage', input.awareness_stage);
      }

      if (input.status) {
        query = query.eq('status', input.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { creatives: data || [] };
    } catch (error: any) {
      console.error('❌ Failed to list creatives:', error);
      throw new Error(`Failed to list creatives: ${error.message}`);
    }
  });

export const updateCreativeStatusProcedure = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      status: z.enum(['draft', 'needs_revision', 'approved_for_spend', 'published', 'archived'])
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabaseAdmin
        .from('ad_creative_briefs')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Updated creative status:', input.id, 'to', input.status);

      return { success: true, creative: data };
    } catch (error: any) {
      console.error('❌ Failed to update creative:', error);
      throw new Error(`Failed to update creative: ${error.message}`);
    }
  });
