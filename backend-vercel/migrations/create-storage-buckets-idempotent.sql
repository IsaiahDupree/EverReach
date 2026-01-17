-- Migration: Create Storage Buckets (Idempotent)
-- Purpose: Create attachments and screenshots buckets with proper policies
-- Date: 2025-10-31

-- ==============================================
-- 1. CREATE ATTACHMENTS BUCKET (PRIVATE)
-- ==============================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false, -- Private bucket, requires signed URLs
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================
-- 2. ATTACHMENTS BUCKET POLICIES
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Service can manage all attachments" ON storage.objects;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role can manage all files (for signed URLs, cleanup, etc.)
CREATE POLICY "Service can manage all attachments"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments');

-- ==============================================
-- 3. CREATE SCREENSHOTS BUCKET (PRIVATE)
-- ==============================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  false, -- Private bucket, requires signed URLs
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================
-- 4. SCREENSHOTS BUCKET POLICIES
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service can manage all screenshots" ON storage.objects;

-- Policy: Users can upload screenshots to their own folder
CREATE POLICY "Users can upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own screenshots
CREATE POLICY "Users can view own screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own screenshots
CREATE POLICY "Users can delete own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role can manage all screenshots
CREATE POLICY "Service can manage all screenshots"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'screenshots')
WITH CHECK (bucket_id = 'screenshots');

-- ==============================================
-- 5. VERIFICATION & SUCCESS MESSAGE
-- ==============================================

DO $$
DECLARE
  attachments_count int;
  screenshots_count int;
BEGIN
  -- Verify buckets exist
  SELECT COUNT(*) INTO attachments_count FROM storage.buckets WHERE id = 'attachments';
  SELECT COUNT(*) INTO screenshots_count FROM storage.buckets WHERE id = 'screenshots';
  
  IF attachments_count = 0 THEN
    RAISE EXCEPTION 'Failed to create attachments bucket';
  END IF;
  
  IF screenshots_count = 0 THEN
    RAISE EXCEPTION 'Failed to create screenshots bucket';
  END IF;
  
  -- Success message
  RAISE NOTICE '✅ Storage Migration Complete';
  RAISE NOTICE '   - Buckets created: attachments, screenshots';
  RAISE NOTICE '   - Attachments: Private bucket, 50MB limit, 16 allowed MIME types';
  RAISE NOTICE '   - Screenshots: Private bucket, 10MB limit, 5 allowed MIME types';
  RAISE NOTICE '   - RLS policies: Users can only access their own files';
  RAISE NOTICE '   - Service role: Full access for signed URLs and cleanup';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: Both buckets are PRIVATE and require signed URLs';
  RAISE NOTICE '    Use getServiceStorageClient() to generate signed URLs';
END;
$$;
