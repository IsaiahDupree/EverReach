/**
 * Screenshot Ingestion Endpoint
 *
 * POST /api/contacts/:id/ingest-screenshots
 *
 * Accepts multipart form data with screenshot images and extracts conversation history
 * using Claude Vision. Extracted interactions are merged into the contact record.
 *
 * Rate limit: 10 batches per user per hour
 * Max batch size: 50 screenshots at 20MB each
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { ok, badRequest, unauthorized, serverError } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for file processing

// Rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface ExtractionResult {
  contact_name: string;
  interactions: Array<{
    date_approximate: string;
    sender: 'me' | 'contact';
    message_summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    topics: string[];
    action_items: string[];
  }>;
  relationship_signals: {
    last_meaningful_exchange: string;
    conversation_tone: 'warm' | 'professional' | 'distant' | 'strained';
    open_threads: string[];
    key_context: string[];
  };
}

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ingest:${userId}`;
  const now = Date.now();
  const limit = rateLimitStore.get(key);

  if (!limit || now > limit.resetAt) {
    // Reset the limit window (1 hour)
    rateLimitStore.set(key, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (limit.count >= 10) {
    return false;
  }

  limit.count++;
  return true;
}

async function extractFromScreenshots(
  screenshots: Buffer[],
  contactName: string
): Promise<ExtractionResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Convert screenshots to base64
  const base64Images = screenshots.map(buf => buf.toString('base64'));

  // Build message with all images
  const imageContent = base64Images.map(base64 => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: base64,
    },
  }));

  const extractionPrompt = `You are analyzing conversation screenshots to extract relationship history for a personal CRM contact.

Contact name: ${contactName}

Extract the following information from the conversation screenshots:

1. **interactions** - List of individual messages or message groups with:
   - date_approximate: When the interaction happened (ISO8601 format or 'unknown')
   - sender: Who sent it ('me' or 'contact')
   - message_summary: 1-2 sentence summary (max 120 chars)
   - sentiment: 'positive', 'neutral', or 'negative'
   - topics: Topics discussed (e.g., ['work', 'personal'])
   - action_items: Any open tasks or follow-ups

2. **relationship_signals** - Meta-information about the relationship:
   - last_meaningful_exchange: ISO8601 timestamp of the most recent meaningful interaction
   - conversation_tone: Overall tone ('warm', 'professional', 'distant', 'strained')
   - open_threads: Unresolved topics that need follow-up (array of strings)
   - key_context: Important facts about this person (e.g., ["recently changed jobs", "has 2 kids", "interested in AI"])

Return ONLY valid JSON, no markdown or extra text.`;

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
      },
    ],
  });

  // Extract JSON from response
  const responseText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  // Parse JSON (handle potential markdown wrapping)
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const result = JSON.parse(jsonStr) as ExtractionResult;
  return result;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;

    // Auth check
    const user = await getUser(req);
    if (!user) {
      return unauthorized('Missing or invalid authentication');
    }

    // Rate limit check
    const withinLimit = await checkRateLimit(user.id);
    if (!withinLimit) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded (10 batches per hour)' }),
        { status: 429 }
      );
    }

    // Get form data
    const formData = await req.formData();
    const screenshotFiles = formData.getAll('screenshots') as File[];

    if (!screenshotFiles || screenshotFiles.length === 0) {
      return badRequest('No screenshots provided');
    }

    if (screenshotFiles.length > 50) {
      return badRequest('Maximum 50 screenshots per batch');
    }

    // Validate file sizes
    const maxSize = 20 * 1024 * 1024; // 20MB
    for (const file of screenshotFiles) {
      if (file.size > maxSize) {
        return badRequest(`Screenshot too large: ${file.name} (max 20MB)`);
      }
    }

    const supabase = getServiceClient();

    // Verify contact exists and user owns it
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, user_id, ingestion_count')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError || !contact) {
      return new NextResponse(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404 }
      );
    }

    // Convert files to buffers
    const screenshotBuffers = await Promise.all(
      screenshotFiles.map(file => file.arrayBuffer().then(ab => Buffer.from(ab)))
    );

    // Extract using Claude Vision
    const extractionResult = await extractFromScreenshots(
      screenshotBuffers,
      contact.name
    );

    // Store interactions in database
    const interactions = extractionResult.interactions.map(interaction => ({
      contact_id: contactId,
      user_id: user.id,
      date_approximate: interaction.date_approximate === 'unknown' ? null : interaction.date_approximate,
      sender: interaction.sender,
      message_summary: interaction.message_summary,
      sentiment: interaction.sentiment,
      topics: interaction.topics,
      action_items: interaction.action_items,
      source: 'screenshot_ingestion',
      raw_extraction: interaction,
    }));

    const { error: insertError } = await supabase
      .from('contact_interactions')
      .insert(interactions);

    if (insertError) {
      console.error('[Screenshot Ingestion] Insert error:', insertError);
      return serverError('Failed to save extracted interactions');
    }

    // Update contact with relationship signals
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        key_context: extractionResult.relationship_signals.key_context,
        open_threads: extractionResult.relationship_signals.open_threads,
        last_ingestion_at: new Date().toISOString(),
        ingestion_count: (contact.ingestion_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[Screenshot Ingestion] Update error:', updateError);
      // Don't fail - interactions were already inserted
    }

    return ok({
      merged_count: interactions.length,
      new_interactions: interactions.length,
      warmth_delta: 0, // Will be calculated by warmth service
      key_context: extractionResult.relationship_signals.key_context,
      open_threads: extractionResult.relationship_signals.open_threads,
    });
  } catch (error: any) {
    console.error('[Screenshot Ingestion] Error:', error);

    if (error.message?.includes('JSON')) {
      return serverError('Failed to parse Claude response - invalid JSON format');
    }

    return serverError('Screenshot ingestion failed: ' + error.message);
  }
}
