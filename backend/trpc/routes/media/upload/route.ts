// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/media/upload/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/server';
import { supabaseAdmin } from '@/backend/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const uploadMediaSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  base64Data: z.string(),
  personId: z.string().optional(),
  goalId: z.string().optional(),
  messageId: z.string().optional(),
  kind: z.enum(['screenshot', 'profile', 'photo', 'document', 'other']).default('other'),
  width: z.number().optional(),
  height: z.number().optional()
});

export const uploadMediaProcedure = protectedProcedure
  .input(uploadMediaSchema)
  .mutation(async ({ input, ctx }) => {
    console.log('📤 Uploading media asset:', input.fileName);
    
    const orgId = ctx.orgId;
    const maxSize = (parseInt(process.env.MAX_UPLOAD_MB || '15') * 1024 * 1024);
    
    if (input.fileSize > maxSize) {
      throw new Error(`File too large. Maximum size is ${Math.floor(maxSize / 1024 / 1024)}MB`);
    }

    // Validate MIME type
    if (!input.mimeType.startsWith('image/')) {
      throw new Error('Only image files are supported');
    }

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(input.base64Data, 'base64');
      
      // Generate unique file path
      const fileExtension = input.mimeType.split('/')[1] || 'jpg';
      const fileName = `${orgId}/${ctx.user!.id}/${uuidv4()}.${fileExtension}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media-assets')
        .upload(fileName, buffer, {
          contentType: input.mimeType,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error('Failed to upload file to storage');
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media-assets')
        .getPublicUrl(fileName);

      // Save media asset record
      const { data: asset, error: dbError } = await supabaseAdmin
        .from('media_assets')
        .insert({
          org_id: orgId,
          user_id: ctx.user!.id,
          person_id: input.personId || null,
          goal_id: input.goalId || null,
          message_id: input.messageId || null,
          kind: input.kind,
          mime_type: input.mimeType,
          file_size: input.fileSize,
          width: input.width || null,
          height: input.height || null,
          storage_path: fileName,
          public_url: urlData.publicUrl
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        // Clean up uploaded file
        await supabaseAdmin.storage
          .from(process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media-assets')
          .remove([fileName]);
        throw new Error('Failed to save media asset record');
      }

      // Track analytics
      await supabaseAdmin
        .from('analytics_events')
        .insert({
          org_id: orgId,
          user_id: ctx.user!.id,
          name: 'media_uploaded',
          properties: {
            asset_id: asset.id,
            kind: input.kind,
            mime_type: input.mimeType,
            file_size: input.fileSize,
            person_id: input.personId,
            goal_id: input.goalId,
            message_id: input.messageId
          }
        });

      console.log('✅ Media asset uploaded:', asset.id);
      return asset;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  });

export const listMediaAssetsProcedure = protectedProcedure
  .input(z.object({
    personId: z.string().uuid().optional(),
    goalId: z.string().uuid().optional(),
    messageId: z.string().uuid().optional(),
    kind: z.enum(['screenshot', 'profile', 'photo', 'document', 'other']).optional(),
    limit: z.number().min(1).max(50).default(20)
  }))
  .query(async ({ input, ctx }) => {
    console.log('📋 Listing media assets');
    
    const orgId = ctx.orgId;

    let query = supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(input.limit);

    if (input.personId) {
      query = query.eq('person_id', input.personId);
    }
    if (input.goalId) {
      query = query.eq('goal_id', input.goalId);
    }
    if (input.messageId) {
      query = query.eq('message_id', input.messageId);
    }
    if (input.kind) {
      query = query.eq('kind', input.kind);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error('❌ Error fetching media assets:', error);
      throw new Error('Failed to fetch media assets');
    }

    console.log(`✅ Found ${assets?.length || 0} media assets`);
    return assets || [];
  });

export const deleteMediaAssetProcedure = protectedProcedure
  .input(z.object({
    id: z.string().uuid()
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🗑️ Deleting media asset:', input.id);
    
    const orgId = ctx.orgId;

    // Get asset details first
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('id', input.id)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !asset) {
      throw new Error('Media asset not found');
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from(process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media-assets')
      .remove([asset.storage_path]);

    if (storageError) {
      console.warn('⚠️ Failed to delete from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('media_assets')
      .delete()
      .eq('id', input.id)
      .eq('org_id', orgId);

    if (dbError) {
      console.error('❌ Error deleting media asset:', dbError);
      throw new Error('Failed to delete media asset');
    }

    // Track analytics
    await supabaseAdmin
      .from('analytics_events')
      .insert({
        org_id: orgId,
        user_id: ctx.user!.id,
        name: 'media_deleted',
        properties: {
          asset_id: input.id,
          kind: asset.kind,
          mime_type: asset.mime_type
        }
      });

    console.log('✅ Media asset deleted:', input.id);
    return { success: true };
  });