/**
 * Copy Generation API Route
 * POST /api/v1/content/copy/generate
 *
 * Generates captions for top 5 scored candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { brief_id, limit = 5 } = await req.json();
    const supabase = getServiceClient();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    // Get top N scored candidates
    const { data: candidates } = await supabase
      .from('content_candidates')
      .select('*')
      .eq('status', 'scored')
      .gte('created_at', `${dateKey}T00:00:00Z`)
      .order('total_score', { ascending: false })
      .limit(limit);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ ok: true, variants: [] });
    }

    const variants = [];

    for (const candidate of candidates) {
      try {
        // Generate copy for this candidate
        const copyPrompt = `You are a copywriter for EverReach, an app helping people maintain relationships.
Generate Instagram post copy for this concept:
- Pillar: ${candidate.pillar}
- Format: ${candidate.format}
- Hook Type: ${candidate.hook_type}
- CTA: ${candidate.cta_type}
- Concept: ${candidate.concept_text}
- Target Emotion: ${candidate.target_emotion}

Respond as JSON (no markdown):
{
  "hook_sentence": "Opening sentence that stops scrollers",
  "caption": "Main body (150-2200 chars, engaging)",
  "cta_line": "Call-to-action matching cta_type",
  "alt_text": "Accessibility text for the image"
}`;

        const copyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: copyPrompt }],
            temperature: 0.8,
            max_tokens: 1000,
          }),
        });

        if (!copyResponse.ok) throw new Error('Failed to generate copy from OpenAI');
        const copyData = await copyResponse.json();
        const copyContent = copyData.choices[0].message.content;
        const jsonMatch = copyContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Failed to parse copy');

        const copy = JSON.parse(jsonMatch[0]);

        // Combine hook + caption + CTA
        const fullCaption = `${copy.hook_sentence}\n\n${copy.caption}\n\n${copy.cta_line}`;

        // Validate caption length
        if (fullCaption.length < 50 || fullCaption.length > 2200) {
          console.warn(`Caption length out of range for candidate ${candidate.id}, using template`);
          continue;
        }

        // Insert copy variant
        const { data: variant, error: insertErr } = await supabase
          .from('content_copy_variants')
          .insert({
            content_candidate_id: candidate.id,
            variant_type: 'primary',
            hook_sentence: copy.hook_sentence,
            caption: fullCaption,
            cta_line: copy.cta_line,
            alt_text: copy.alt_text,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        // Update candidate status
        await supabase.from('content_candidates').update({ status: 'copy_done' }).eq('id', candidate.id);

        variants.push({ candidate_id: candidate.id, variant_id: variant?.id });
      } catch (error) {
        console.error(`Failed to generate copy for candidate ${candidate.id}:`, error);
      }
    }

    return NextResponse.json({ ok: true, variants });
  } catch (error) {
    console.error('Copy generate API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
