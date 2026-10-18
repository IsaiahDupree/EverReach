/**
 * Embeddings & AI Clustering Helper
 * 
 * Handles OpenAI embeddings and vector similarity for feature bucketing
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding vector for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000), // Limit input size
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[Embeddings] Failed to generate embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Generate AI-suggested bucket title from requests
 */
export async function generateBucketTitle(
  requests: Array<{ title: string; description?: string }>
): Promise<string> {
  try {
    const examples = requests.slice(0, 5).map(r => 
      `- ${r.title}${r.description ? `: ${r.description.substring(0, 100)}` : ''}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product manager analyzing feature requests. Generate a short, catchy title (2-5 words) that captures the theme of similar requests.',
        },
        {
          role: 'user',
          content: `Generate a short title for this group of related feature requests:\n\n${examples}\n\nTitle:`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || 'Feature Bucket';
  } catch (error) {
    console.error('[Embeddings] Failed to generate title:', error);
    return 'Feature Bucket';
  }
}

/**
 * Generate AI-suggested bucket summary
 */
export async function generateBucketSummary(
  requests: Array<{ title: string; description?: string }>
): Promise<string> {
  try {
    const examples = requests.slice(0, 5).map(r => 
      `- ${r.title}${r.description ? `: ${r.description.substring(0, 150)}` : ''}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product manager. Summarize what users want in 1-2 sentences (max 150 chars).',
        },
        {
          role: 'user',
          content: `Summarize what users want from these related requests:\n\n${examples}`,
        },
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || 'Users requested this feature';
  } catch (error) {
    console.error('[Embeddings] Failed to generate summary:', error);
    return 'Users requested this feature';
  }
}

/**
 * Calculate mean vector (centroid) from array of vectors
 */
export function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

/**
 * Format vector for PostgreSQL
 */
export function formatVectorForPostgres(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * Parse vector from PostgreSQL
 */
export function parseVectorFromPostgres(pgVector: string): number[] {
  return pgVector
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map(v => parseFloat(v));
}
