/**
 * Carousel Render — Cron Job
 *
 * For each top carousel candidate from today:
 *   1. Uses GPT-4o to generate structured slide content (6 slides).
 *   2. Calls DALL-E 3 per slide with hand-drawn psychology visual style.
 *   3. Downloads each image and uploads to Supabase Storage.
 *   4. Inserts a CAROUSEL_ALBUM row into instagram_post_queue.
 *   5. Updates candidate status to 'ready_to_publish'.
 *
 * Visual style: off-white paper (#f5f0e8), black marker linework, simple
 * stick-figure / geometric illustrations — EverReach hand-drawn psychology.
 *
 * Trigger: daily at 00:58 UTC (after copy-and-assets, before qa-and-queue-fill)
 * GET /api/cron/carousel-render
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — DALL-E calls stack up

const SLIDE_STYLE =
  'Hand-drawn educational Instagram carousel slide. ' +
  'Style: warm off-white paper texture background, black fine-tip marker linework, ' +
  'simple minimalist line-art figures, clean sans-serif text overlay. ' +
  'Relationship psychology / self-help illustration. 1:1 square format. ' +
  'No watermarks, no borders, no photo-realism. Soft hand-sketched aesthetic.';

interface SlideSpec {
  slide_number: number;
  headline: string;          // 3-8 words, bold
  body_text: string;         // 10-20 words max
  visual_description: string; // what to draw
}

async function generateSlides(
  candidate: Record<string, unknown>,
  caption: string,
  apiKey: string
): Promise<SlideSpec[]> {
  const isFramework = candidate.format === 'carousel_framework';
  const slideCount = isFramework ? 5 : 6;

  const prompt = `You are a relationship psychology content strategist for EverReach app.
Generate ${slideCount} Instagram carousel slides for this concept:

Pillar: ${candidate.pillar}
Concept: ${candidate.concept_text}
Hook type: ${candidate.hook_type}
Caption hook: ${(caption as string).split('\n')[0]}

Rules:
- Slide 1: Attention hook (bold claim/question that stops the scroll)
${isFramework
  ? '- Slides 2-4: One framework step each (numbered, clear action)\n- Slide 5: CTA slide'
  : '- Slide 2: Relatable problem/situation\n- Slide 3: The psychology insight\n- Slide 4: How it shows up in real life\n- Slide 5: What to do differently\n- Slide 6: CTA (save this + follow EverReach)'}
- headline: max 8 words, bold statement
- body_text: max 20 words, conversational
- visual_description: 1 sentence describing a simple hand-drawn diagram or figure

Return JSON array only:
[
  {
    "slide_number": 1,
    "headline": "...",
    "body_text": "...",
    "visual_description": "..."
  }
]`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });
  if (!res.ok) throw new Error(`GPT-4o failed: ${res.status}`);
  const data = await res.json();
  const content = data.choices[0].message.content as string;
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse slide JSON from GPT-4o');
  return JSON.parse(match[0]) as SlideSpec[];
}

async function renderSlide(slide: SlideSpec, apiKey: string): Promise<string> {
  const dallePrompt =
    `${SLIDE_STYLE}\n\n` +
    `Slide ${slide.slide_number}: "${slide.headline}"\n` +
    `Text body: "${slide.body_text}"\n` +
    `Visual element: ${slide.visual_description}\n` +
    `Place the headline text prominently at top or center. ` +
    `Body text below the illustration. Warm, approachable tone.`;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`DALL-E 3 failed (${res.status}): ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data[0].url as string; // expires in ~1 hour
}

async function fetchAndUploadToStorage(
  imageUrl: string,
  path: string,
  supabase: ReturnType<typeof getServiceClient>
): Promise<string> {
  // Download the DALL-E image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('content-assets')
    .upload(path, buffer, { contentType: 'image/png', upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('content-assets')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function carouselRender() {
  const supabase = getServiceClient();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  // Idempotency check
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'carousel-render')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    return { ok: true, rendered: 0, note: 'Already ran today' };
  }

  // Find top carousel candidates with copy done (up to 2 per day)
  const { data: candidates } = await supabase
    .from('content_candidates')
    .select(
      'id, total_score, pillar, format, hook_type, cta_type, concept_text, target_emotion, ' +
      'content_copy_variants(caption, hook_sentence, cta_line)'
    )
    .in('status', ['copy_done', 'assets_done'])
    .in('format', ['carousel_psychology', 'carousel_framework'])
    .gte('created_at', `${dateKey}T00:00:00Z`)
    .order('total_score', { ascending: false })
    .limit(2);

  if (!candidates || candidates.length === 0) {
    // Record run so we don't spam logs
    await supabase.from('job_runs').insert({
      job_name: 'carousel-render',
      run_key: dateKey,
      status: 'completed',
      result: { rendered: 0, note: 'no_carousel_candidates' },
      completed_at: now.toISOString(),
    });
    return { ok: true, rendered: 0, note: 'no carousel candidates today' };
  }

  let rendered = 0;
  const errors: string[] = [];

  for (const candidate of (candidates as any[])) {
    const variant = (candidate.content_copy_variants as any[])?.[0];
    if (!variant?.caption) {
      errors.push(`candidate ${candidate.id}: missing caption variant`);
      continue;
    }

    try {
      // 1. Generate slide structure
      const slides = await generateSlides(candidate, variant.caption as string, apiKey);

      // 2. Render each slide via DALL-E 3 + upload to storage
      const childUrls: string[] = [];
      for (const slide of slides) {
        const dalleUrl = await renderSlide(slide, apiKey);
        const storagePath = `carousels/${dateKey}/${candidate.id}/slide-${slide.slide_number}.png`;
        const publicUrl = await fetchAndUploadToStorage(dalleUrl, storagePath, supabase);
        childUrls.push(publicUrl);
      }

      // 3. Build CAROUSEL_ALBUM children structure
      const children = childUrls.map(url => ({ image_url: url }));

      // 4. Insert into instagram_post_queue
      const { error: qErr } = await supabase.from('instagram_post_queue').insert({
        media_type: 'CAROUSEL_ALBUM',
        children,
        caption: variant.caption as string,
        auto_schedule: true,
        priority: 1,
        status: 'queued',
      });

      if (qErr) {
        errors.push(`candidate ${candidate.id}: queue insert failed — ${qErr.message}`);
        continue;
      }

      // 5. Update content_assets render_status
      await supabase
        .from('content_assets')
        .update({ render_status: 'rendered', public_url: childUrls[0] })
        .eq('candidate_id', candidate.id);

      // 6. Advance candidate status
      await supabase
        .from('content_candidates')
        .update({ status: 'ready_to_publish' })
        .eq('id', candidate.id);

      rendered++;
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[carousel-render] candidate ${candidate.id}:`, msg);
      errors.push(`${candidate.id}: ${msg}`);
    }
  }

  // Record job run
  await supabase.from('job_runs').insert({
    job_name: 'carousel-render',
    run_key: dateKey,
    status: errors.length === 0 ? 'completed' : 'partial',
    result: { rendered, errors },
    completed_at: new Date().toISOString(),
  });

  return { ok: true, rendered, errors };
}

export async function GET() {
  try {
    const result = await carouselRender();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[carousel-render] cron failed:', error);
    const msg = (error as Error).message || JSON.stringify(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
