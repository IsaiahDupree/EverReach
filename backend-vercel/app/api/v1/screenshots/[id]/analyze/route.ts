/**
 * Screenshot Analysis Endpoint
 * 
 * POST /api/v1/screenshots/:id/analyze - Analyze screenshot with AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { screenshot } from '@/lib/analytics';
import { options } from '@/lib/cors';
import { linkScreenshotToContacts } from '@/lib/screenshot-linker';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const ANALYSIS_PROMPT = `You are analyzing a screenshot to extract structured information for a CRM system.

Analyze the image and extract:
1. **Contacts**: Names, emails, phone numbers, companies, roles, job titles
2. **Dates**: Any mentioned dates, deadlines, meeting times
3. **Platforms**: Social media platforms mentioned (Instagram, Twitter, LinkedIn, etc.)
4. **Handles**: Social media handles/usernames (with @ symbol)
5. **Emails**: All email addresses found
6. **Phones**: All phone numbers found
7. **Action Items**: Tasks, to-dos, or follow-ups mentioned
8. **Summary**: Brief 2-3 sentence summary of what the screenshot contains
9. **Sentiment**: Overall tone (positive, neutral, negative, professional)
10. **Category**: Type of content (business_card, email, chat, social_post, meeting_notes, document, other)

Return JSON in this exact format:
{
  "contacts": [
    {
      "name": "Full Name",
      "email": "email@example.com",
      "phone": "+1234567890",
      "company": "Company Name",
      "role": "Job Title",
      "confidence": 0.95
    }
  ],
  "dates": [
    {
      "date": "2025-10-21",
      "context": "Meeting on Friday"
    }
  ],
  "platforms": ["instagram", "twitter", "linkedin"],
  "handles": ["@username", "@company"],
  "emails": ["email@example.com"],
  "phones": ["+1234567890", "(555) 123-4567"],
  "action_items": [
    "Follow up next week",
    "Send proposal by Friday"
  ],
  "summary": "Brief 2-3 sentence description of the screenshot content.",
  "sentiment": "positive",
  "category": "business_card"
}

Important:
- Extract ALL information you can find
- Use high confidence scores (0.8-1.0) for clearly visible text
- Use lower scores (0.5-0.7) for partially visible or inferred information
- For business cards, extract all contact details carefully
- For emails/chats, capture participants and key points
- For meeting notes, extract attendees and action items
- Return empty arrays for fields with no data (don't omit them)`;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    const startTime = Date.now();
    
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const screenshotId = params.id;
    const { context } = await req.json().catch(() => ({ context: 'general' }));

    // Fetch screenshot record
    const { data: screenshotRecord, error: fetchError } = await supabase
      .from('screenshots')
      .select('*')
      .eq('id', screenshotId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !screenshotRecord) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      );
    }

    // Update analysis status
    await supabase
      .from('screenshot_analysis')
      .update({ status: 'analyzing' })
      .eq('screenshot_id', screenshotId);

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('screenshots')
      .download(screenshotRecord.storage_key);

    if (downloadError || !imageData) {
      throw new Error('Failed to download image');
    }

    // Convert to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = screenshotRecord.mime_type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Call GPT-4 Vision for analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ANALYSIS_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysisText = completion.choices[0].message.content || '{}';
    const analysis = JSON.parse(analysisText);

    // Extract OCR text (combine all extracted text)
    const ocrText = [
      ...(analysis.contacts?.map((c: any) => `${c.name} ${c.email || ''} ${c.phone || ''} ${c.company || ''}`).filter(Boolean) || []),
      ...(analysis.emails || []),
      ...(analysis.phones || []),
      ...(analysis.action_items || []),
      analysis.summary || '',
    ].filter(Boolean).join('\n');

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Update analysis record
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('screenshot_analysis')
      .update({
        status: 'analyzed',
        ocr_text: ocrText,
        ocr_confidence: 0.85, // Average confidence
        entities: {
          contacts: analysis.contacts || [],
          dates: analysis.dates || [],
          platforms: analysis.platforms || [],
          handles: analysis.handles || [],
          emails: analysis.emails || [],
          phones: analysis.phones || [],
        },
        insights: {
          summary: analysis.summary || '',
          action_items: analysis.action_items || [],
          sentiment: analysis.sentiment || 'neutral',
          category: analysis.category || 'other',
        },
        analysis_completed_at: new Date().toISOString(),
      })
      .eq('screenshot_id', screenshotId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Track analytics event
    await screenshot.analyzed(
      user.id,
      screenshotId,
      analysis.contacts?.length || 0,
      analysis.action_items?.length || 0,
      processingTime
    );

    // Link screenshot to contacts (fire and forget - don't block response)
    linkScreenshotToContacts(
      screenshotId,
      {
        id: updatedAnalysis.id,
        screenshot_id: screenshotId,
        ocr_text: ocrText,
        entities: updatedAnalysis.entities as any,
        insights: updatedAnalysis.insights as any,
      },
      user.id,
      supabase
    ).catch(err => {
      console.error('[Screenshot Analysis] Failed to link contacts:', err);
    });

    // Return analysis results
    return NextResponse.json({
      screenshot_id: screenshotId,
      status: 'analyzed',
      analysis: {
        ocr_text: ocrText,
        entities: updatedAnalysis.entities,
        insights: updatedAnalysis.insights,
      },
      processing_time_ms: processingTime,
    });

  } catch (error) {
    console.error('Analysis error:', error);

    // Update status to error
    const supabase = getSupabase();
    await supabase
      .from('screenshot_analysis')
      .update({
        status: 'error',
        error: (error as Error).message,
      })
      .eq('screenshot_id', params.id);

    return NextResponse.json(
      { error: 'Analysis failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return options(req);
}
