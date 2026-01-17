import 'server-only';
import { z } from 'zod';
import { router, publicProcedure } from '../server';
import { openai } from '../../../lib/openai';

export const openaiRouter = router({
  test: publicProcedure
    .input(z.object({
      prompt: z.string().min(1).max(1000),
      model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']).default('gpt-4o-mini'),
      maxTokens: z.number().min(1).max(4000).default(150),
      temperature: z.number().min(0).max(2).default(0.7),
      testType: z.enum(['completion', 'structured', 'embedding']).default('completion'),
    }))
    .mutation(async ({ input }) => {
      const t0 = Date.now();
      try {
        if (!process.env.OPENAI_API_KEY) {
          return {
            success: false,
            error: {
              message: 'OpenAI test requires OPENAI_API_KEY in backend/.env. Please configure it and uncomment the tRPC calls in this file.',
              code: 'not_configured',
              type: 'configuration_error',
            },
            responseTime: Date.now() - t0,
          };
        }

        const client = openai();

        if (input.testType === 'embedding') {
          const r = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: input.prompt,
          });
          return {
            success: true,
            result: {
              embedding: r.data[0].embedding.slice(0, 10),
              dimensions: r.data[0].embedding.length,
              usage: r.usage ?? null,
            },
            responseTime: Date.now() - t0,
            model: 'text-embedding-3-small',
          };
        }

        if (input.testType === 'structured') {
          const r = await client.chat.completions.create({
            model: input.model,
            messages: [
              { role: 'system', content: 'You are a helpful assistant that responds with structured JSON data. Return only valid JSON.' },
              { role: 'user', content: input.prompt + ' (Return as JSON with summary, sentiment, keywords, and confidence fields)' },
            ],
            temperature: input.temperature,
            max_tokens: input.maxTokens,
            response_format: { type: 'json_object' },
          });

          let parsed: any = {};
          try {
            const text = r.choices[0]?.message?.content ?? '';
            parsed = text ? JSON.parse(text) : {};
          } catch {
            parsed = { error: 'Failed to parse JSON', raw: r.choices[0]?.message?.content ?? '' };
          }

          return {
            success: true,
            result: parsed,
            responseTime: Date.now() - t0,
            model: input.model,
            usage: r.usage ?? null,
          };
        }

        const r = await client.chat.completions.create({
          model: input.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Provide clear, concise responses.' },
            { role: 'user', content: input.prompt },
          ],
          temperature: input.temperature,
          max_tokens: input.maxTokens,
        });

        return {
          success: true,
          result: { 
            content: r.choices[0]?.message?.content ?? '', 
            finishReason: r.choices[0]?.finish_reason ?? null 
          },
          responseTime: Date.now() - t0,
          model: input.model,
          usage: r.usage ?? null,
        };
      } catch (error: any) {
        return {
          success: false,
          error: {
            message: error?.message || 'Unknown error',
            code: error?.code || 'unknown',
            type: error?.type || 'api_error',
            details: {
              originalError: error?.name,
              hasApiKey: !!process.env.OPENAI_API_KEY,
              clientInitialized: true,
            },
          },
          responseTime: Date.now() - t0,
        };
      }
    }),

  listModels: publicProcedure.query(async () => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return { 
          success: false, 
          error: 'OPENAI_API_KEY not configured',
          models: [] 
        };
      }

      const client = openai();
      const models = await client.models.list();
      const relevant = models.data
        .filter((m: any) => m.id.includes('gpt') || m.id.includes('text-embedding') || m.id.includes('whisper'))
        .map((m: any) => ({ id: m.id, created: m.created, ownedBy: m.owned_by }));
      return { success: true, models: relevant };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to list models', models: [] };
    }
  }),
});
