// backend/lib/openai.ts
import OpenAI from "openai";

const isServer = typeof window === "undefined" && typeof document === "undefined";
if (!isServer) {
  throw new Error("backend/lib/openai.ts was imported in a client bundle. Move calls server-side.");
}

// —————————————————————————————————————
// Singleton client (ESM import, server-only)
// —————————————————————————————————————
let openaiClient: OpenAI | null = null;

function initializeOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  // ESM default import is required in v5
  if (typeof OpenAI !== "function") {
    throw new Error("OpenAI constructor is not available (bad import or wrong build target)");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
    maxRetries: 2,
  });

  // Verify the objects we actually use in this file (v5)
  const guards = [
    ["responses", typeof (client as any).responses !== "undefined"],
    ["embeddings", typeof (client as any).embeddings?.create === "function"],
    ["models", typeof (client as any).models?.list === "function"],
  ];

  for (const [name, ok] of guards) {
    if (!ok) throw new Error(`OpenAI client missing required interface: ${name}`);
  }

  openaiClient = client;
  return client;
}

function getOpenAIClient(): OpenAI {
  return openaiClient ?? initializeOpenAI();
}

export { getOpenAIClient as openai };

// —————————————————————————————————————
// JSON Schemas for structured output
// —————————————————————————————————————
export const INSIGHT_SCHEMA = {
  name: "contact_insights",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      notes: { type: "string" },
      goals: { type: "array", items: { type: "string" } },
      interests: { type: "array", items: { type: "string" } },
      values: { type: "array", items: { type: "string" } },
      keyDates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            dateISO: { type: "string" },
            note: { type: "string" },
          },
          required: ["type", "dateISO"],
          additionalProperties: false,
        },
      },
      tasks: { type: "array", items: { type: "string" } },
    },
    required: [],
  },
} as const;

export const CONTEXT_CARD_SCHEMA = {
  name: "contact_context_card",
  schema: {
    type: "object",
    properties: {
      hook: { type: "string" },
      bullets: { type: "array", items: { type: "string" } },
      highlights: { type: "array", items: { type: "string" } },
    },
    required: ["hook", "bullets"],
    additionalProperties: false,
  },
} as const;

export const MESSAGE_DRAFTS_SCHEMA = {
  name: "message_drafts",
  schema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      variants: { type: "array", items: { type: "string" } },
      reasons: { type: "array", items: { type: "string" } },
    },
    required: ["variants"],
    additionalProperties: false,
  },
} as const;

// —————————————————————————————————————
// Helpers
// NOTE: Keep these server-only. Don’t import this file in RN/UI.
// —————————————————————————————————————

/** Whisper transcription (server-side) */
export async function transcribeAudio(file: File): Promise<{ text: string; language?: string }> {
  const client = getOpenAIClient();
  const transcription = await client.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
  });
  return { text: transcription.text, language: "en" };
}

/** Extract structured insights using Responses API + JSON Schema */
export async function extractInsights(transcript: string): Promise<any> {
  const client = getOpenAIClient();

  const systemPrompt =
    `Extract concise, non-sensitive relationship insights for a personal CRM.
Only use facts present in the text. Focus on goals, interests, values, important dates, tasks, and a short note.
Return JSON only.`;

  const resp = await (client as any).responses.create({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Text:\n${transcript}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: INSIGHT_SCHEMA,
    },
  });

  try {
    // v5 helper: returns concatenated text from output content
    const jsonText = (resp as any).output_text ?? "";
    return jsonText ? JSON.parse(jsonText) : {};
  } catch (e) {
    console.error("Failed to parse insights JSON:", e);
    return {};
  }
}

/** Build small context card (structured) */
export async function buildContextCard(contact: any, myContext?: any): Promise<any> {
  const client = getOpenAIClient();

  const systemPrompt =
    `Create a concise, action-oriented context card for a mobile contact page.
Return: hook (one line), 3 bullets (current goal • shared interest • next step), optional highlights tags.`;

  const resp = await (client as any).responses.create({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify({ contact, myContext }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: CONTEXT_CARD_SCHEMA,
    },
  });

  try {
    const jsonText = (resp as any).output_text ?? "";
    return jsonText ? JSON.parse(jsonText) : {};
  } catch (e) {
    console.error("Failed to parse context-card JSON:", e);
    return {};
  }
}

/** Draft outreach + moderation */
export async function craftMessage(
  contactCard: any,
  myContext: any,
  messageGoal: any
): Promise<{ drafts: any; flagged: boolean }> {
  const client = getOpenAIClient();

  const systemPrompt =
    `You write short, respectful outreach aligned to the user's goal, channel, tone, and brevity.
One clear CTA. Output 2–3 options. Avoid sensitive topics.`;

  const resp = await (client as any).responses.create({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify({ contactCard, myContext, messageGoal }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: MESSAGE_DRAFTS_SCHEMA,
    },
  });

  let drafts: any = {};
  try {
    const jsonText = (resp as any).output_text ?? "";
    drafts = jsonText ? JSON.parse(jsonText) : {};
  } catch (e) {
    console.error("Failed to parse message drafts JSON:", e);
  }

  const joined = [drafts.subject, ...(drafts.variants || [])]
    .filter(Boolean)
    .join("\n\n");

  const moderation = await client.moderations.create({
    model: "omni-moderation-latest",
    input: joined || "empty",
  });

  const flagged = moderation.results?.[0]?.flagged ?? false;
  return { drafts, flagged };
}

/** Embeddings */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  const r = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return r.data.map((d) => d.embedding);
}

/** Placeholder; implement per Realtime docs when needed */
export async function createRealtimeSession(): Promise<any> {
  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";
  return {
    id: `session_${Date.now()}`,
    model,
    voice: "verse",
    instructions:
      "You are a helpful assistant for a personal CRM app. Help users take notes about their contacts and relationships.",
    client_secret: { value: "mock_token_" + Date.now() },
  };
}
