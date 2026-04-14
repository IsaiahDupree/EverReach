/**
 * Asset Rendering API Route
 * POST /api/v1/content/assets/render
 *
 * Renders assets for copy_done candidates.
 * For static_truth/founder_note: Playwright → PNG → Supabase Storage
 * For other formats: Generate render_spec (Phase 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {

    const supabase = getServiceClient();
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    // Get all copy_done candidates
    const { data: candidates } = await supabase
      .from('content_candidates')
      .select('*, content_copy_variants(caption, alt_text)')
      .eq('status', 'copy_done')
      .gte('created_at', `${dateKey}T00:00:00Z`);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ ok: true, rendered: 0, specs: 0 });
    }

    let rendered = 0;
    let specs = 0;

    for (const candidate of candidates) {
      const variant = candidate.content_copy_variants?.[0];
      if (!variant) continue;

      // For simple formats, create render_spec (Phase 2 does actual rendering)
      if (['carousel_psychology', 'carousel_framework', 'product_screenshot', 'short_reel_concept'].includes(candidate.format)) {
        const { error: specErr } = await supabase.from('content_assets').insert({
          content_candidate_id: candidate.id,
          content_template_id: null, // Will be set during actual render
          asset_type: candidate.format,
          render_status: 'spec_ready',
          render_spec: {
            format: candidate.format,
            caption: variant.caption,
            hook: variant.hook_sentence,
            cta: variant.cta_line,
          },
        });
        if (!specErr) specs++;
      } else if (['static_truth', 'founder_note'].includes(candidate.format)) {
        // For text-based formats, create a simple PNG-compatible HTML
        try {
          const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; }
    .container { width: 1080px; height: 1350px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                 display: flex; align-items: center; justify-content: center; color: white; padding: 40px; box-sizing: border-box; }
    .content { max-width: 900px; text-align: center; }
    .hook { font-size: 32px; font-weight: bold; margin-bottom: 30px; line-height: 1.3; }
    .caption { font-size: 18px; line-height: 1.6; margin-bottom: 40px; opacity: 0.95; }
    .cta { font-size: 16px; font-weight: 600; margin-top: 30px; padding: 15px 30px;
           background: rgba(255,255,255,0.2); border-radius: 8px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <div class="hook">${variant.caption?.split('\n\n')[0] || ''}</div>
      <div class="caption">${variant.caption?.split('\n\n').slice(1, -1).join('\n\n') || ''}</div>
      <div class="cta">${variant.cta_line || 'Learn More'}</div>
    </div>
  </div>
</body>
</html>`;

          // Note: Full Playwright rendering requires a browser environment (Phase 2)
          // For now, we'll create a placeholder asset
          const { error: assetErr } = await supabase.from('content_assets').insert({
            content_candidate_id: candidate.id,
            content_template_id: null,
            asset_type: candidate.format,
            render_status: 'pending_render', // Will be rendered by background job
            render_spec: { html, format: candidate.format },
          });

          if (!assetErr) {
            // Update candidate status
            await supabase.from('content_candidates').update({ status: 'assets_done' }).eq('id', candidate.id);
            rendered++;
          }
        } catch (error) {
          console.error(`Failed to prepare asset for candidate ${candidate.id}:`, error);
        }
      }
    }

    return NextResponse.json({ ok: true, rendered, specs });
  } catch (error) {
    console.error('Asset render API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
