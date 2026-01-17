import { publicProcedure, router } from "../server";
import { z } from "zod";
import OpenAI from 'openai';

export const messagesRouter = router({
  craft: publicProcedure
    .input(z.object({ prompt: z.string().min(1), tone: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      if (!client.apiKey) throw new Error('Missing OPENAI_API_KEY');
      const resp = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: `${input.prompt}\nTone: ${input.tone ?? 'friendly'}`,
        temperature: 0.7,
        max_output_tokens: 300,
      });
      // @ts-ignore helper
      return { message: (resp as any).output_text ?? '' };
    }),
});
