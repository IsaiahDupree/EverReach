# Media CRUD Tests Documentation

## Overview

Comprehensive test suite for file upload, storage, and management operations including images, audio files, and profile pictures.

## Test Coverage

### 🎨 Image Operations (30% coverage)
1. **Request Presigned Upload URL** - Generate signed URL for image upload
2. **Upload Image File** - Upload actual PNG file to Supabase Storage
3. **List Images** - Query and filter image files

### 🎵 Audio Operations (30% coverage)
4. **Request Presigned Upload URL** - Generate signed URL for audio upload
5. **Upload Audio File** - Upload actual WAV file to Supabase Storage
6. **List Audio Files** - Query and filter audio files

### 👤 Profile Picture Operations (20% coverage)
7. **Get/Create Contact** - Ensure test contact exists
8. **Update Profile Picture** - Update contact's `avatar_url` field

### ⚠️ Error Handling (20% coverage)
9. **Invalid Path Handling** - Reject empty/invalid file paths
10. **File Type Filtering** - Test multiple filter types (image, audio, all)

## Running the Tests

```bash
# Run media CRUD tests
node test/backend/test-media-crud.mjs

# Expected output: 10/10 tests passing
```

## Test Flow

```
User Authentication
       ↓
[Image Tests]
  ├── Request presigned upload URL
  ├── Upload PNG file (50KB)
  └── List uploaded images
       ↓
[Audio Tests]
  ├── Request presigned upload URL
  ├── Upload WAV file (100KB)
  └── List uploaded audio files
       ↓
[Profile Picture Tests]
  ├── Get/create test contact
  └── Update contact avatar_url
       ↓
[Error Handling]
  ├── Test invalid paths
  └── Test file type filtering
```

## API Endpoints Tested

### File Upload & Management
- `POST /api/v1/files` - Request presigned upload URL
- `GET /api/v1/files?type=<type>&limit=<n>` - List files with filters

### Contact Management
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact
- `PATCH /api/v1/contacts/:id` - Update contact (avatar_url)

### Storage Operations
- `PUT <presigned-url>` - Direct upload to Supabase Storage

## File Types Supported

### Images
- **MIME Types**: `image/png`, `image/jpeg`, `image/gif`, `image/webp`
- **Max Size**: Configurable (default: 15MB)
- **Storage Path**: `users/{userId}/images/*`

### Audio
- **MIME Types**: `audio/wav`, `audio/mpeg`, `audio/ogg`, `audio/webm`
- **Max Size**: Configurable (default: 15MB)
- **Storage Path**: `users/{userId}/audio/*`

### Video (supported but not tested yet)
- **MIME Types**: `video/mp4`, `video/webm`, `video/quicktime`
- **Storage Path**: `users/{userId}/videos/*`

### Documents (supported but not tested yet)
- **MIME Types**: `application/pdf`, `application/msword`, `text/plain`
- **Storage Path**: `users/{userId}/documents/*`

## Test Data

### Image Test File
- **Type**: PNG
- **Size**: 50KB
- **Header**: Valid PNG signature (`\x89PNG\r\n\x1a\n`)

### Audio Test File
- **Type**: WAV
- **Size**: 100KB
- **Header**: Valid WAV/RIFF header

## Expected Results

### Success Criteria
✅ All presigned URLs generated successfully
✅ All file uploads complete without errors
✅ File listings return correct filtered results
✅ Profile picture updates persist in database
✅ Invalid inputs properly rejected

### Performance Benchmarks
- Presigned URL generation: < 500ms
- File upload (50-100KB): < 2s
- File listing: < 300ms
- Contact update: < 200ms

## Error Scenarios Tested

1. **Empty Path** - Should return 400 Bad Request
2. **Missing Content Type** - Should default to `application/octet-stream`
3. **Invalid File Format** - Handled by Supabase Storage validation
4. **Unauthorized Access** - Requires valid auth token

## Database Schema

### `attachments` Table
```sql
- id: uuid (primary key)
- file_path: text
- mime_type: text
- size_bytes: bigint
- contact_id: uuid (nullable, FK to contacts)
- created_at: timestamp
- updated_at: timestamp
```

### `contacts` Table (avatar field)
```sql
- avatar_url: text (nullable)
```

## Environment Variables Required

```env
# Supabase Storage
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SUPABASE_STORAGE_BUCKET=attachments

# Optional: S3 Direct Access
SUPABASE_S3_ENDPOINT=https://[project].storage.supabase.co/storage/v1/s3
SUPABASE_S3_ACCESS_KEY_ID=your-access-key
SUPABASE_S3_SECRET_ACCESS_KEY=your-secret-key
```

## Debugging

### Common Issues

**Issue**: `Storage bucket not found`
- **Solution**: Create the `attachments` bucket in Supabase Dashboard
- **Check**: Environment variable `SUPABASE_STORAGE_BUCKET` is set

**Issue**: `403 Forbidden on upload`
- **Solution**: Check Supabase Storage RLS policies
- **Action**: Ensure authenticated users can upload to their folders

**Issue**: `File not appearing in list`
- **Solution**: Check if file was committed to database
- **Action**: Verify `attachments` table has proper records

### Logs

The test suite provides detailed logging:
- ✅ Success messages with response data
- ❌ Failure messages with error details
- ℹ️  Info messages for skipped tests

### Manual Verification

1. **Check Supabase Storage Dashboard**
   - Navigate to Storage → attachments bucket
   - Verify files exist at: `users/{userId}/images/` and `users/{userId}/audio/`

2. **Check Database**
   ```sql
   SELECT * FROM attachments 
   WHERE file_path LIKE '%test-%' 
   ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check Contact Avatar**
   ```sql
   SELECT id, display_name, avatar_url 
   FROM contacts 
   WHERE avatar_url IS NOT NULL 
   LIMIT 10;
   ```

## Future Enhancements

### Not Yet Implemented
- ❌ File deletion endpoint and tests
- ❌ File download/retrieval endpoint and tests
- ❌ Video upload and tests
- ❌ Document upload and tests
- ❌ File size limit enforcement tests
- ❌ Virus scanning integration
- ❌ Image resizing/optimization
- ❌ Audio transcription tests
- ❌ Bulk upload tests
- ❌ File versioning tests

### Planned Tests
1. **DELETE /api/v1/files/:id** - Delete file from storage and database
2. **GET /api/v1/files/:id/download** - Generate presigned download URL
3. **POST /api/v1/files/bulk** - Bulk upload multiple files
4. **GET /api/v1/contacts/:id/files** - List files for specific contact
5. **Error tests** - Test file size limits, unsupported types, etc.

## Related Documentation

- [File Upload API](../../docs/api/FILE_UPLOADS.md)
- [Storage Configuration](../../docs/STORAGE_SETUP.md)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

## Test Maintenance

### Updating Tests
- When adding new file types, update `createTestFile()` helper
- When changing storage paths, update path generation logic
- When adding new filters, add to TEST 10

### Cleanup
Tests create temporary files but do not clean them up automatically. Consider:
1. Running cleanup script periodically
2. Implementing TTL on test files
3. Using separate test bucket

## Status

**Current**: 10 tests, ~500 lines
**Coverage**: Images ✅ | Audio ✅ | Profile Pics ✅ | Delete ❌ | Download ❌
**Last Updated**: November 1, 2025
**Maintainer**: Backend Team
