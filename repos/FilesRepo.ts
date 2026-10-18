import { supabase } from '@/lib/supabase';

export type UploadResult = {
  url: string;
  path: string;
  bucket: string;
};

const STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'attachments';
const ATTACHMENTS_FOLDER = 'attachments';

export const FilesRepo = {
  async uploadUri(params: { uri: string; name?: string; contentType?: string }): Promise<UploadResult> {
    const { uri, name, contentType } = params;
    // Convert local file URI to Blob
    const res = await fetch(uri);
    const blob = await res.blob();
    const filename = sanitizeFileName(name || `file-${Date.now()}`);
    const filePath = `${ATTACHMENTS_FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: contentType || blob.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path, bucket: STORAGE_BUCKET };
  },
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
