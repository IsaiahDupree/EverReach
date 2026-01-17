import OpenAI from 'openai';

const isServer = typeof window === 'undefined' && typeof document === 'undefined';
if (!isServer) {
  throw new Error('backend-vercel/lib/openai.ts was imported in a client bundle. Move calls server-side.');
}

let openaiClient: OpenAI | null = null;

function initializeOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  if (typeof OpenAI !== 'function') {
    throw new Error('OpenAI constructor is not available (bad import or wrong build target)');
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
    maxRetries: 2,
  });

  const guards = [
    ['chat', typeof client.chat?.completions?.create === 'function'],
    ['embeddings', typeof client.embeddings?.create === 'function'],
    ['models', typeof client.models?.list === 'function'],
  ];

  for (const [name, ok] of guards) {
    if (!ok) throw new Error(`OpenAI client missing required interface: ${name}`);
  }

  openaiClient = client;
  return client;
}

export function getOpenAIClient(): OpenAI {
  return openaiClient ?? initializeOpenAI();
}

export function openai(): OpenAI {
  return getOpenAIClient();
}
