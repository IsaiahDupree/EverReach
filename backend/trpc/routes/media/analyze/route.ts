import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/server';
import { supabaseAdmin } from '@/backend/lib/supabase';
import { openai } from '@/backend/lib/openai';

const analyzeMediaSchema = z.object({
  assetId: z.string()
});

export const analyzeMediaProcedure = protectedProcedure
  .input(analyzeMediaSchema)
  .mutation(async ({ input, ctx }) => {
    console.log('🔍 Analyzing media asset:', input.assetId);
    
    const orgId = ctx.orgId;
    const provider = (process.env.VISION_PROVIDER || 'openai').toLowerCase();

    // Get the asset
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('id', input.assetId)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !asset) {
      throw new Error('Media asset not found');
    }

    if (asset.ocr_text && asset.vision_summary) {
      console.log('✅ Asset already analyzed');
      return asset;
    }

    let ocrText = '';
    let visionSummary = '';
    let labels: string[] = [];

    try {
      if (provider === 'openai') {
        // Use OpenAI Vision for OCR and analysis
        const ocrResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: 'Extract all readable text from this image. Return only the plain text content, no formatting or explanations.' 
                },
                {
                  type: 'image_url',
                  image_url: { url: asset.public_url }
                }
              ]
            }
          ],
          temperature: 0,
          max_tokens: 1000
        });

        ocrText = ocrResponse.choices[0]?.message?.content?.trim() || '';

        // Get high-level summary and labels
        const summaryResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: 'Analyze this image for CRM context. Provide:\n1. A concise 1-2 sentence summary of what this image shows\n2. 3-5 relevant labels/tags (comma-separated)\n\nFormat: SUMMARY: [your summary]\nLABELS: [tag1, tag2, tag3]' 
                },
                {
                  type: 'image_url',
                  image_url: { url: asset.public_url }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 300
        });

        const analysisText = summaryResponse.choices[0]?.message?.content || '';
        const summaryMatch = analysisText.match(/SUMMARY:\s*(.+?)(?=\nLABELS:|$)/s);
        const labelsMatch = analysisText.match(/LABELS:\s*(.+?)$/s);
        
        visionSummary = summaryMatch?.[1]?.trim() || '';
        labels = labelsMatch?.[1]?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) || [];
      } else {
        // Local OCR would go here (tesseract.js, etc.)
        console.log('Local vision analysis not implemented yet');
        ocrText = '';
        visionSummary = '';
        labels = [];
      }

      // Update the asset with analysis results
      const { data: updatedAsset, error: updateError } = await supabaseAdmin
        .from('media_assets')
        .update({
          ocr_text: ocrText,
          vision_summary: visionSummary,
          labels: labels,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.assetId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating asset:', updateError);
        throw new Error('Failed to update asset with analysis');
      }

      // Track analytics
      await supabaseAdmin
        .from('analytics_events')
        .insert({
          org_id: orgId,
          user_id: ctx.user!.id,
          name: 'media_analyzed',
          properties: {
            asset_id: input.assetId,
            provider: provider,
            has_ocr: !!ocrText,
            has_summary: !!visionSummary,
            labels_count: labels.length,
            ocr_length: ocrText.length
          }
        });

      console.log('✅ Media analysis complete:', input.assetId);
      return updatedAsset;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw new Error('Failed to analyze media asset');
    }
  });

export const getMediaAssetProcedure = protectedProcedure
  .input(z.object({
    id: z.string().uuid()
  }))
  .query(async ({ input, ctx }) => {
    console.log('📄 Getting media asset:', input.id);
    
    const orgId = ctx.orgId;

    const { data: asset, error } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('id', input.id)
      .eq('org_id', orgId)
      .single();

    if (error) {
      console.error('❌ Error fetching media asset:', error);
      throw new Error('Media asset not found');
    }

    console.log('✅ Found media asset:', asset.id);
    return asset;
  });