import { publicProcedure, router } from "../server";
import { z } from "zod";
import OpenAI from 'openai';

export const messagesRouter = router({
  craft: publicProcedure
    .input(z.object({ prompt: z.string().min(1), tone: z.string().optional() }))
    .mutation(async ({ input }) => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      if (!client.apiKey) throw new Error('Missing OPENAI_API_KEY');
      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an assistant helping craft messages. Be concise, helpful, and authentic.' },
          { role: 'user', content: `${input.prompt}\nTone: ${input.tone ?? 'friendly'}` }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
      return { message: resp.choices[0]?.message?.content ?? '' };
    }),
});
