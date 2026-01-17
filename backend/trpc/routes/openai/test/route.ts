// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/openai/test/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

// backend/trpc/routes/openai/test/route.ts
import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/server";
import { openai } from "@/backend/lib/openai";

export const testOpenAIProcedure = publicProcedure
  .input(z.object({
    prompt: z.string().min(1).max(1000),
    model: z.enum(["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]).default("gpt-4o-mini"),
    maxTokens: z.number().min(1).max(4000).default(150),
    temperature: z.number().min(0).max(2).default(0.7),
    testType: z.enum(["completion", "structured", "embedding"]).default("completion"),
  }))
  .mutation(async ({ input }) => {
    const t0 = Date.now();
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
      const client = openai();

      // Embeddings test (unchanged)
      if (input.testType === "embedding") {
        const r = await client.embeddings.create({
          model: "text-embedding-3-small",
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
          model: "text-embedding-3-small",
        };
      }

      // Structured JSON via Responses API
      if (input.testType === "structured") {
        const r = await (client as any).responses.create({
          model: input.model,
          input: [
            { role: "system", content: "You are a helpful assistant that responds with structured JSON data. Return only valid JSON." },
            { role: "user", content: input.prompt + " (Return as JSON with summary, sentiment, keywords, and confidence fields)" },
          ],
          temperature: input.temperature,
          max_output_tokens: input.maxTokens,
        });

        let parsed: any = {};
        try {
          const text = (r as any).output_text ?? "";
          parsed = text ? JSON.parse(text) : {};
        } catch {
          parsed = { error: "Failed to parse JSON", raw: (r as any).output_text ?? "" };
        }

        return {
          success: true,
          result: parsed,
          responseTime: Date.now() - t0,
          model: input.model,
          usage: (r as any).usage ?? null,
        };
      }

      // Plain completion via Responses API
      const r = await (client as any).responses.create({
        model: input.model,
        input: [
          { role: "system", content: "You are a helpful assistant. Provide clear, concise responses." },
          { role: "user", content: input.prompt },
        ],
        temperature: input.temperature,
        max_output_tokens: input.maxTokens,
      });

      return {
        success: true,
        result: { content: (r as any).output_text ?? "", finishReason: (r as any).choices?.[0]?.finish_reason ?? null },
        responseTime: Date.now() - t0,
        model: input.model,
        usage: (r as any).usage ?? null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error?.message || "Unknown error",
          code: error?.code || "unknown",
          type: error?.type || "api_error",
          details: {
            originalError: error?.name,
            hasApiKey: !!process.env.OPENAI_API_KEY,
            clientInitialized: true,
          },
        },
        responseTime: Date.now() - t0,
      };
    }
  });

export const listOpenAIModelsProcedure = publicProcedure.query(async () => {
  try {
    const client = openai();
    const models = await client.models.list();
    const relevant = models.data
      .filter((m: any) => m.id.includes("gpt") || m.id.includes("text-embedding") || m.id.includes("whisper"))
      .map((m: any) => ({ id: m.id, created: m.created, ownedBy: m.owned_by }));
    return { success: true, models: relevant };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to list models" };
  }
});
