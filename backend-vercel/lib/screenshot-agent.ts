/**
 * Screenshot Analysis Agent
 * 
 * Uses GPT-4 Vision to analyze screenshots and extract:
 * - OCR text from images
 * - Inferred message goals
 * - Variables (names, companies, topics)
 * - Confidence scores
 * - Template suggestions
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ============================================================================
// TYPES
// ============================================================================

export type MessageGoalType = 
  | 'networking'
  | 'follow_up'
  | 'introduction'
  | 'thank_you'
  | 'meeting_request'
  | 'check_in'
  | 'collaboration'
  | 'support'
  | 'personal'
  | 'business'
  | 'other';

export type ScreenshotAnalysisInput = {
  image_url?: string;
  image_base64?: string;
  contact_id?: string;
  channel?: 'email' | 'sms' | 'dm' | 'linkedin';
  context?: string; // Additional context from user
};

export type ScreenshotAnalysisResult = {
  ocr_text: string;
  inferred_goal: {
    type: MessageGoalType;
    description: string;
    confidence: number; // 0.0 - 1.0
  };
  variables: {
    recipient_name?: string;
    sender_name?: string;
    company?: string;
    topic?: string;
    event?: string;
    date_mentioned?: string;
    project?: string;
    [key: string]: string | undefined;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
  urgency?: 'high' | 'medium' | 'low';
  suggested_template_type?: MessageGoalType;
  key_phrases?: string[];
  processing_metadata: {
    model: string;
    tokens_used: number;
    latency_ms: number;
  };
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SCREENSHOT_ANALYSIS_SYSTEM_PROMPT = `You are an expert CRM assistant specializing in analyzing message screenshots to help users compose effective responses.

Your task is to analyze screenshots of messages (emails, DMs, SMS, LinkedIn, etc.) and extract:

1. **OCR Text**: All visible text in the image, transcribed accurately
2. **Message Goal**: What the sender is trying to accomplish or what response they're seeking
3. **Variables**: Key information like names, companies, topics, events, dates, projects
4. **Sentiment**: Overall tone (positive/neutral/negative)
5. **Urgency**: How time-sensitive the message is (high/medium/low)
6. **Suggested Response Type**: What kind of response would be appropriate

**Goal Types:**
- networking: Building/maintaining professional relationships
- follow_up: Following up on previous conversation or meeting
- introduction: Introducing yourself or making a connection
- thank_you: Expressing gratitude
- meeting_request: Requesting or scheduling a meeting
- check_in: Casual check-in or staying in touch
- collaboration: Proposing or discussing collaboration
- support: Asking for or offering help
- personal: Personal/friendly conversation
- business: Business transaction or formal matter
- other: Doesn't fit above categories

**Output Format (JSON):**
{
  "ocr_text": "Full transcription of visible text",
  "inferred_goal": {
    "type": "goal_type",
    "description": "Brief explanation of what the sender wants",
    "confidence": 0.95
  },
  "variables": {
    "recipient_name": "John Doe",
    "sender_name": "Jane Smith",
    "company": "Acme Corp",
    "topic": "Q1 roadmap discussion",
    "event": "tech conference 2024",
    "date_mentioned": "next Tuesday",
    "project": "mobile app redesign"
  },
  "sentiment": "positive",
  "urgency": "medium",
  "suggested_template_type": "follow_up",
  "key_phrases": ["looking forward", "exciting opportunity", "let's connect"]
}

**Analysis Guidelines:**
- Be precise with OCR - capture all visible text accurately
- Infer goal based on context, not just keywords
- Extract only variables that are clearly present
- Confidence should reflect certainty (0.8+ for clear goals, <0.7 for ambiguous)
- Consider channel norms (email vs SMS vs DM)
- Look for implicit requests and context clues`;

// ============================================================================
// CORE ANALYSIS FUNCTION
// ============================================================================

export async function analyzeScreenshot(
  input: ScreenshotAnalysisInput
): Promise<ScreenshotAnalysisResult> {
  const startTime = Date.now();
  
  if (!input.image_url && !input.image_base64) {
    throw new Error('Either image_url or image_base64 must be provided');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!client.apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Build user message with image
  const imageContent = input.image_url 
    ? { type: 'image_url' as const, image_url: { url: input.image_url } }
    : { type: 'image_url' as const, image_url: { url: `data:image/png;base64,${input.image_base64}` } };

  const userPrompt = buildUserPrompt(input);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SCREENSHOT_ANALYSIS_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        imageContent
      ]
    }
  ];

  // Call GPT-4 Vision
  const response = await client.chat.completions.create({
    model: 'gpt-4o', // Supports vision
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower temp for more consistent extraction
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content);
  
  const latencyMs = Date.now() - startTime;

  return {
    ocr_text: parsed.ocr_text || '',
    inferred_goal: {
      type: parsed.inferred_goal?.type || 'other',
      description: parsed.inferred_goal?.description || 'Unable to determine goal',
      confidence: parsed.inferred_goal?.confidence || 0.5,
    },
    variables: parsed.variables || {},
    sentiment: parsed.sentiment || 'neutral',
    urgency: parsed.urgency || 'medium',
    suggested_template_type: parsed.suggested_template_type,
    key_phrases: parsed.key_phrases || [],
    processing_metadata: {
      model: response.model,
      tokens_used: response.usage?.total_tokens || 0,
      latency_ms: latencyMs,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildUserPrompt(input: ScreenshotAnalysisInput): string {
  let prompt = 'Analyze this message screenshot and extract all the information according to the format.';

  if (input.channel) {
    prompt += `\n\nChannel: ${input.channel}`;
  }

  if (input.contact_id) {
    prompt += `\nNote: This message is related to contact ID: ${input.contact_id}`;
  }

  if (input.context) {
    prompt += `\n\nAdditional context: ${input.context}`;
  }

  return prompt;
}

// ============================================================================
// BATCH ANALYSIS (for multiple screenshots)
// ============================================================================

export async function analyzeScreenshotBatch(
  inputs: ScreenshotAnalysisInput[]
): Promise<ScreenshotAnalysisResult[]> {
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 3; // Avoid rate limits
  const results: ScreenshotAnalysisResult[] = [];

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(input => analyzeScreenshot(input))
    );
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateBase64Image(base64: string): boolean {
  // Check if valid base64 and reasonable size (<10MB)
  try {
    const buffer = Buffer.from(base64, 'base64');
    const sizeInMB = buffer.length / (1024 * 1024);
    return sizeInMB > 0 && sizeInMB < 10;
  } catch {
    return false;
  }
}
