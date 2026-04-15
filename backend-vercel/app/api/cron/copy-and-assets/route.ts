/**
 * Copy-and-Assets Cron Route
 *
 * Chains: (1) copy generation, (2) asset rendering
 * Uses job_runs for idempotency
 *
 * Trigger: daily at 00:55 UTC
 * GET /api/cron/copy-and-assets
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

async function copyAndAssets() {
  const supabase = getServiceClient();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  // Check if already run today
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'copy-and-assets')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    return { ok: true, copy_generated: 0, assets_rendered: 0, note: 'Already ran today' };
  }

  let copyGenerated = 0;
  let assetsRendered = 0;

  // Step 1: Generate copy for top 5 scored candidates
  const { data: candidates } = await supabase
    .from('content_candidates')
    .select('id, total_score, pillar, format, hook_type, cta_type, concept_text, target_emotion')
    .eq('status', 'scored')
    .gte('created_at', `${dateKey}T00:00:00Z`)
    .order('total_score', { ascending: false })
    .limit(5);

  if (candidates && candidates.length > 0) {
    for (const candidate of candidates) {
      try {
        const copyPrompt = `Generate Instagram post copy for this EverReach concept:
- Pillar: ${candidate.pillar}
- Hook Type: ${candidate.hook_type}
- Concept: ${candidate.concept_text}
- CTA: ${candidate.cta_type}

JSON response:
{
  "hook_sentence": "...",
  "caption": "...",
  "cta_line": "...",
  "alt_text": "..."
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

        if (!copyResponse.ok) continue;
        const copyData = await copyResponse.json();
        const copyContent = copyData.choices[0].message.content;
        const jsonMatch = copyContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const copy = JSON.parse(jsonMatch[0]);
        const fullCaption = `${copy.hook_sentence}\n\n${copy.caption}\n\n${copy.cta_line}`;

        if (fullCaption.length >= 50 && fullCaption.length <= 2200) {
          const { error } = await supabase
            .from('content_copy_variants')
            .insert({
              candidate_id: candidate.id,
              variant_type: 'primary',
              hook_sentence: copy.hook_sentence,
              caption: fullCaption,
              cta_line: copy.cta_line,
              alt_text: copy.alt_text,
            });

          if (!error) {
            await supabase.from('content_candidates').update({ status: 'copy_done' }).eq('id', candidate.id);
            copyGenerated++;
          }
        }
      } catch (error) {
        console.error(`Copy generation failed for candidate ${candidate.id}:`, error);
      }
    }
  }

  // Step 2: Render assets for copy_done candidates
  const { data: copyDone } = await supabase
    .from('content_candidates')
    .select('id, format, content_copy_variants(caption, hook_sentence, cta_line)')
    .eq('status', 'copy_done')
    .gte('created_at', `${dateKey}T00:00:00Z`);

  if (copyDone && copyDone.length > 0) {
    for (const candidate of copyDone) {
      const variant = candidate.content_copy_variants?.[0];
      if (!variant) continue;

      try {
        if (['static_truth', 'founder_note'].includes(candidate.format)) {
          const { error } = await supabase.from('content_assets').insert({
            candidate_id: candidate.id,
            asset_type: candidate.format,
            render_status: 'pending_render',
            render_spec: { format: candidate.format, caption: variant.caption },
          });

          if (!error) {
            await supabase.from('content_candidates').update({ status: 'assets_done' }).eq('id', candidate.id);
            assetsRendered++;
          }
        } else {
          const { error } = await supabase.from('content_assets').insert({
            candidate_id: candidate.id,
            asset_type: candidate.format,
            render_status: 'spec_ready',
            render_spec: { format: candidate.format, caption: variant.caption },
          });

          if (!error) {
            await supabase.from('content_candidates').update({ status: 'assets_done' }).eq('id', candidate.id);
            assetsRendered++;
          }
        }
      } catch (error) {
        console.error(`Asset rendering failed for candidate ${candidate.id}:`, error);
      }
    }
  }

  // Record job run
  const { error: jobRunErr } = await supabase.from('job_runs').insert({
    job_name: 'copy-and-assets',
    run_key: dateKey,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (jobRunErr) throw jobRunErr;

  return { ok: true, copy_generated: copyGenerated, assets_rendered: assetsRendered };
}

export async function GET() {
  try {
    const result = await copyAndAssets();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Copy-and-assets cron failed:', error);
    const msg = (error as any)?.message || JSON.stringify(error); return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
