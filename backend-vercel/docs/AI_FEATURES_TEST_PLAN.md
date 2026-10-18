# AI Features E2E Test Plan

## Overview
Comprehensive testing strategy for screenshot analysis, voice note processing, transcription with chunking, message composition, and contact attribution from AI-analyzed media.

## Current State Analysis

### ✅ Implemented Features

**Screenshots (`/api/v1/screenshots`)**
- Upload: `POST /api/v1/screenshots` - Multipart upload with thumbnail generation
- List: `GET /api/v1/screenshots` - User's screenshots with signed URLs
- Get: `GET /api/v1/screenshots/:id` - Individual screenshot with analysis
- Delete: `DELETE /api/v1/screenshots/:id` - Remove screenshot and storage
- Analyze: `POST /api/v1/screenshots/:id/analyze` - GPT-4 Vision analysis
  - Extracts: contacts, dates, platforms, handles, emails, phones, action_items
  - Stores: ocr_text, entities, insights (summary, sentiment, category)
  - Status transitions: queued → analyzing → analyzed/error

**Voice Notes & Transcription**
- Transcribe: `POST /api/v1/files/:id/transcribe` - Auto-chunking for >20MB audio
  - Chunks files into 10MB pieces
  - Uses Whisper (20MB limit with 5MB safety margin)
  - Context preservation between chunks (last 200 chars)
  - Cleanup of temporary chunks
  - Stores transcript in `attachments.metadata.transcript`
- Process: `process_voice_note` agent tool
  - Extracts: contacts, actions, sentiment, topics, category
  - Stores: `persona_notes.metadata.extracted_data`

**Message Composition**
- Smart Compose: `POST /api/v1/agent/compose/smart`
  - Multi-source context: contact + interactions + persona notes + goals
  - Channel-optimized (email/sms/dm)
  - Tone control (warm/professional/concise/playful)
  - Logs to `message_generations` table
- Get Goals: `get_message_goals` agent tool
  - Returns relevant goals filtered by category
  - Includes contact context (warmth, tags)

### 🔴 Critical Gaps

1. **Schema Mismatch**
   - Routes use: `screenshot_analysis` (singular)
   - Legacy routes use: `screenshot_analyses` (plural)
   - **Action**: Standardize on `screenshot_analysis`

2. **No Contact Linking from Screenshots**
   - Analysis extracts emails/phones/names but doesn't link to contacts
   - No sender/recipient attribution
   - No interaction creation from screenshot messages
   - **Action**: Implement contact matcher and interaction creator

3. **Missing E2E Test Coverage**
   - No tests for screenshot analysis flow
   - No tests for transcription chunking (25MB+ files)
   - No tests for voice note → persona note flow
   - No tests for compose with multi-source context
   - **Action**: Add comprehensive E2E tests

## Recommended Next Steps

### 1. [IN PROGRESS] Fix Schema Mismatch ⚠️

**Problem**: Inconsistent table naming
- `app/api/v1/screenshots/[id]/analyze/route.ts` uses `screenshot_analysis`
- `app/api/v1/analysis/screenshot/route.ts` uses `screenshot_analyses`

**Solution**: Standardize on `screenshot_analysis` (singular, matches main route)

**Files to Update**:
- `app/api/v1/analysis/screenshot/route.ts` - Change table name
- Verify migration: `migrations/00XX_screenshots.sql` uses correct name
- Update any queries in other files

**Validation**:
- All routes use same table
- No broken references
- Existing data preserved

---

### 2. Add E2E: Screenshots Upload → Analyze

**Test File**: `test/backend/screenshots.mjs`

**Test Coverage**:

**Test 1: Upload Screenshot**
```javascript
POST /api/v1/screenshots (multipart form)
- file: valid JPEG (< 10MB)
- context: 'business_card'

Assert:
- 201 Created
- screenshot_id returned
- analysis_id returned
- status = 'queued'
- Storage: original + thumbnail uploaded
- Database: screenshots + screenshot_analysis records created
```

**Test 2: Analyze Screenshot**
```javascript
POST /api/v1/screenshots/:id/analyze

Assert:
- Status transitions: queued → analyzing → analyzed
- ocr_text extracted (non-empty for text images)
- entities.contacts[] populated if names/emails/phones present
- entities.dates[] if dates mentioned
- entities.emails/phones/platforms/handles populated
- insights.summary (2-3 sentences)
- insights.sentiment in ['positive', 'neutral', 'negative']
- insights.category in [business_card, email, chat, social_post, meeting_notes, document, other]
- processing_time_ms < 30000 (30s timeout)
```

**Test 3: Get Screenshot with Analysis**
```javascript
GET /api/v1/screenshots/:id

Assert:
- Screenshot record with analysis nested
- image_url (signed, valid for 1hr)
- thumbnail_url (signed, valid for 1hr)
- analysis.ocr_text present
- analysis.entities populated
- analysis.insights populated
```

**Test 4: List Screenshots**
```javascript
GET /api/v1/screenshots?limit=10&offset=0

Assert:
- Array of screenshots
- Each has image_url and thumbnail_url (signed)
- Ordered by created_at DESC
- Pagination works
```

**Test 5: Security - Auth Required**
```javascript
All endpoints without Bearer token

Assert:
- 401 Unauthorized
```

**Test 6: Security - User Isolation**
```javascript
User A uploads screenshot
User B tries GET/DELETE on User A's screenshot

Assert:
- 404 Not Found (not 403, for security)
```

**Test 7: Delete Screenshot**
```javascript
DELETE /api/v1/screenshots/:id

Assert:
- 200 OK
- Storage files removed (original + thumbnail)
- Database records deleted (screenshots + screenshot_analysis cascade)
- Subsequent GET returns 404
```

**Test 8: Edge Cases**
```javascript
- File too large (> 10MB) → 400 Bad Request
- Invalid file type (PDF, MP4) → 400 Bad Request
- Missing file → 400 Bad Request
- Analyze non-existent screenshot → 404 Not Found
```

---

### 3. Add Contact Linker + Interaction Creator

**New Module**: `lib/screenshot-linker.ts`

**Functionality**:
```typescript
export async function linkScreenshotToContacts(
  screenshotId: string,
  analysisData: ScreenshotAnalysis,
  supabase: SupabaseClient
): Promise<LinkingResult> {
  // 1. Extract participants from entities
  const participants = extractParticipants(analysisData.entities);
  
  // 2. Match participants to contacts
  const matches = await matchParticipantsToContacts(participants, supabase);
  
  // 3. Determine message direction (incoming/outgoing)
  const direction = inferMessageDirection(analysisData, matches);
  
  // 4. Create interaction record
  const interaction = await createInteractionFromScreenshot(
    screenshotId,
    matches.primary_contact_id,
    direction,
    analysisData,
    supabase
  );
  
  // 5. Link screenshot as attachment
  await linkScreenshotAsAttachment(screenshotId, interaction.id, supabase);
  
  return {
    linked_contacts: matches.all_contact_ids,
    primary_contact_id: matches.primary_contact_id,
    interaction_id: interaction.id,
    direction,
    confidence: matches.confidence
  };
}
```

**Matching Logic**:
- **Email match**: Exact match on `contacts.emails` array (highest confidence: 0.95)
- **Phone match**: Normalize and match on `contacts.phones` (confidence: 0.90)
- **Name match**: Fuzzy match on `contacts.display_name` (confidence: 0.70-0.85)
- **Require confidence > 0.70** to link

**Direction Inference**:
- **Outgoing**: User's name/email in sender field, or analysis.category = 'email' with user context
- **Incoming**: Contact's name/email in sender field
- **Null**: Cannot determine (e.g., business card)

**Interaction Schema**:
```sql
INSERT INTO interactions (
  contact_id,
  kind = 'screenshot_message',
  direction = 'incoming' | 'outgoing' | NULL,
  content = analysis.insights.summary OR analysis.ocr_text (first 500 chars),
  metadata = {
    screenshot_id,
    category: analysis.insights.category,
    sentiment: analysis.insights.sentiment,
    action_items: analysis.entities.action_items,
    platforms: analysis.entities.platforms,
    confidence: match_confidence
  },
  occurred_at = screenshot.created_at
)
```

**Schema Updates**:
```sql
-- Add to screenshot_analysis table
ALTER TABLE screenshot_analysis ADD COLUMN linked_contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE screenshot_analysis ADD COLUMN primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE screenshot_analysis ADD COLUMN message_direction TEXT CHECK (message_direction IN ('incoming', 'outgoing'));
CREATE INDEX idx_screenshot_analysis_primary_contact ON screenshot_analysis(primary_contact_id);
```

**E2E Test**: `test/backend/screenshot-linking.mjs`
```javascript
Test 1: Match by Email
- Create contact with email test@example.com
- Upload screenshot with test@example.com visible
- Analyze
- Assert: primary_contact_id = contact.id, confidence > 0.9

Test 2: Match by Phone
- Create contact with phone +1234567890
- Upload screenshot with (123) 456-7890 visible
- Assert: phone normalized and matched

Test 3: Match by Name (Fuzzy)
- Create contact "John Smith"
- Upload screenshot with "john smith" (lowercase)
- Assert: matched with confidence 0.70-0.85

Test 4: Create Interaction - Incoming
- Screenshot shows message FROM contact TO user
- Assert: interaction created with direction='incoming'

Test 5: Create Interaction - Outgoing
- Screenshot shows message FROM user TO contact
- Assert: interaction created with direction='outgoing'

Test 6: Multi-Contact Screenshot
- Screenshot mentions 3 contacts
- Assert: linked_contacts contains all 3, primary is highest confidence

Test 7: No Match
- Screenshot with unknown email
- Assert: analysis completes, linked_contacts empty, no interaction created

Test 8: Attachment Linking
- After interaction created
- Assert: screenshot linked via attachments table
- GET /api/v1/interactions/:id/files returns screenshot
```

---

### 4. Add E2E: Transcribe 25MB with Chunking

**Test File**: `test/backend/transcription-chunking.mjs`

**Test Coverage**:

**Test 1: Small File (No Chunking)**
```javascript
Upload 1MB audio
POST /api/v1/files/:id/transcribe

Assert:
- 200 OK
- transcript returned (non-empty)
- metadata.was_chunked = false
- metadata.chunks_processed = 1
- metadata.total_size_mb = "1.00"
```

**Test 2: Large File (With Chunking)**
```javascript
Upload 25MB audio (generated silence with MP3 headers)
POST /api/v1/files/:id/transcribe

Assert:
- 200 OK
- transcript returned
- metadata.was_chunked = true
- metadata.chunks_processed >= 3
- metadata.total_size_mb = "25.00"
- Processing time < 300s (5min max)
```

**Test 3: Chunk Cleanup**
```javascript
After Test 2 completes

Assert:
- No files matching *_chunk*.mp3 in storage
- Only original file remains
```

**Test 4: Context Preservation**
```javascript
Upload 25MB audio with repeated phrase across chunks

Assert:
- Transcript doesn't have chunk boundary artifacts
- Context flows naturally
- (Manual inspection or keyword search)
```

**Test 5: Store Transcript in Metadata**
```javascript
After transcription

GET /api/v1/files/:id

Assert:
- file.metadata.transcript = full transcript
- file.metadata.transcribed_at timestamp
- file.metadata.chunked boolean
```

**Test 6: Edge Cases**
```javascript
- Non-audio file → 400 Bad Request
- File > 50MB → Consider chunking or reject
- Empty audio → Empty transcript OK
```

---

### 5. Add E2E: Voice Note Processing

**Test File**: `test/backend/voice-note.mjs`

**Full Flow**:
```
1. Upload audio → /api/v1/files
2. Transcribe → /api/v1/files/:id/transcribe
3. Create persona note with transcript → /api/v1/me/persona-notes
4. Process voice note → /api/v1/agent/voice-note/process (or direct tool call)
```

**Test Coverage**:

**Test 1: Upload Voice Note**
```javascript
POST /api/v1/files (audio upload)

Assert:
- Presigned URL received
- Upload successful
- File linked to user (not contact)
```

**Test 2: Transcribe Voice Note**
```javascript
POST /api/v1/files/:id/transcribe

Assert:
- Transcript extracted
- Stored in file metadata
```

**Test 3: Create Persona Note**
```javascript
POST /api/v1/me/persona-notes
{
  type: 'voice',
  title: 'Voice note about John',
  transcript: <transcript from step 2>,
  tags: ['john', 'follow-up']
}

Assert:
- 201 Created
- persona_note.id returned
```

**Test 4: Process Voice Note (Extract Structured Data)**
```javascript
POST /api/v1/agent/voice-note/process
{
  note_id: <from step 3>,
  extract_contacts: true,
  extract_actions: true
}

Assert:
- 200 OK
- extracted.contacts[] contains mentioned names
- extracted.actions[] contains action items
- extracted.sentiment in ['positive', 'neutral', 'negative']
- extracted.category in ['personal', 'networking', 'business']
- extracted.topics/tags array

GET /api/v1/me/persona-notes/:id

Assert:
- metadata.ai_processed = true
- metadata.extracted_data matches response
- metadata.processed_at timestamp
```

**Test 5: Use in Composition**
```javascript
POST /api/v1/agent/compose/smart
{
  contact_id: <john's id>,
  goal_type: 'follow_up',
  include_voice_context: true
}

Assert:
- Message generated references voice note context
- context_sources.voice_notes_used = true
```

---

### 6. Add E2E: Compose Smart with Multi-Source Context

**Test File**: `test/backend/compose-smart.mjs`

**Setup**:
```javascript
// Create test data
1. Contact: John Doe (warmth 75, tags: [client, important])
2. Interactions (3):
   - Email from 5 days ago about project
   - DM from 2 days ago checking in
   - Call from today about deadline
3. Persona Notes (2):
   - "John prefers morning emails"
   - "Working on mobile app launch"
4. Goals (2):
   - follow_up: "Check in on ongoing projects"
   - networking: "Maintain warm relationships"
```

**Test Coverage**:

**Test 1: Basic Composition**
```javascript
POST /api/v1/agent/compose/smart
{
  contact_id: john.id,
  goal_type: 'follow_up',
  channel: 'email',
  tone: 'warm'
}

Assert:
- 200 OK
- message.subject present (for email)
- message.body non-empty (realistic length)
- message.body references context (project, deadline, etc.)
- message.tone matches 'warm'
- contact.name = "John Doe"
```

**Test 2: Context Sources Validation**
```javascript
POST /api/v1/agent/compose/smart
{
  contact_id: john.id,
  goal_type: 'networking',
  include_voice_context: true,
  include_interaction_history: true
}

Assert:
- context_sources.voice_notes_used = true
- context_sources.interactions_used = true
- context_sources.contact_warmth = 75
```

**Test 3: Message Generation Logged**
```javascript
After Test 2

Query: SELECT * FROM message_generations WHERE contact_id = john.id ORDER BY created_at DESC LIMIT 1

Assert:
- Row exists
- user_id = current user
- goal_type = 'networking'
- channel = 'email'
- tone = 'warm'
- generated_subject non-null
- generated_body matches response
- context_used.interactions = true
- context_used.voice_notes = true
- context_used.contact_warmth = 75
```

**Test 4: Channel-Specific Constraints**
```javascript
Test SMS:
POST with channel='sms'

Assert:
- message.body.length < 200 chars
- No subject line
- Concise tone

Test Email:
POST with channel='email'

Assert:
- message.subject present
- message.body.length 300-700 chars
```

**Test 5: Goals Integration**
```javascript
POST /api/v1/agent/compose/smart
{
  contact_id: john.id,
  goal_type: 'follow_up'
}

Assert:
- Message aligns with 'follow_up' goal
- GET /api/v1/agent/goals shows follow_up goal used
```

**Test 6: No Context (Fresh Outreach)**
```javascript
New contact with no interactions or persona notes

POST /api/v1/agent/compose/smart
{
  contact_id: new_contact.id,
  goal_type: 'introduction'
}

Assert:
- 200 OK
- Message generated without error
- Generic introduction message
- context_sources.interactions_used = false
- context_sources.voice_notes_used = false
```

---

### 7. Gate OpenAI Tests

**Problem**: OpenAI quota limits cause flaky test failures

**Solution**: Environment variable gating

**Implementation**:

**File**: `test/backend/_shared.mjs`
```javascript
export const OPENAI_TESTS_ENABLED = process.env.RUN_OPENAI_TESTS === '1';

export function skipIfNoOpenAI(testName) {
  if (!OPENAI_TESTS_ENABLED) {
    console.log(`⏭️  Skipped (OpenAI disabled): ${testName}`);
    return true;
  }
  return false;
}
```

**Usage**:
```javascript
// In test files
import { skipIfNoOpenAI } from './_shared.mjs';

async function test_Screenshot_Analysis() {
  if (skipIfNoOpenAI('Screenshot Analysis')) return;
  
  // Test implementation...
}

async function test_Transcription() {
  if (skipIfNoOpenAI('Transcription')) return;
  
  // Test implementation...
}
```

**Run with OpenAI**:
```bash
# Enable OpenAI-dependent tests
$env:RUN_OPENAI_TESTS=1; node test/backend/screenshots.mjs

# Or in unified runner
$env:RUN_OPENAI_TESTS=1; node test/backend/run-all.mjs
```

**Degraded Mode (OpenAI disabled)**:
- Screenshot analysis → Skip (requires GPT-4 Vision)
- Transcription → Skip (requires Whisper)
- Voice note processing → Skip (requires OpenAI)
- Compose smart → Skip (requires GPT-4)
- File CRUD → Run (no OpenAI)
- Config status → Run (no OpenAI)

**Benefits**:
- CI/CD can run without OpenAI quota
- Local dev can disable for faster iteration
- Production tests can enable for full coverage

---

## Test Execution Plan

### Phase 1: Foundation (Week 1)
1. ✅ Fix schema mismatch
2. ✅ Add screenshot upload/analyze E2E
3. ✅ Gate OpenAI tests

### Phase 2: Contact Linking (Week 2)
1. ✅ Implement contact matcher
2. ✅ Implement interaction creator
3. ✅ Add linking E2E tests

### Phase 3: Audio Processing (Week 3)
1. ✅ Add transcription chunking E2E
2. ✅ Add voice note processing E2E

### Phase 4: Composition (Week 4)
1. ✅ Add compose smart E2E
2. ✅ Add goals integration E2E

### Phase 5: Integration & Docs (Week 5)
1. ✅ Run all tests in CI
2. ✅ Document test patterns
3. ✅ Create troubleshooting guide

---

## Success Criteria

### Coverage Targets
- Screenshots: 8 tests covering upload → analyze → link → delete
- Transcription: 6 tests covering small/large files with chunking
- Voice notes: 5 tests covering upload → transcribe → process
- Composition: 6 tests covering multi-source context
- Total: **25+ new E2E tests**

### Performance Targets
- Screenshot analysis: < 30s per image
- Transcription (1MB): < 20s
- Transcription (25MB): < 300s (5min)
- Voice note processing: < 10s
- Compose smart: < 10s

### Quality Targets
- All tests use real data (no mocks)
- All tests clean up after themselves
- All tests isolated (can run in any order)
- All tests documented with clear assertions
- OpenAI tests gated to avoid quota issues

---

## Files to Create/Modify

### New Test Files (6)
- `test/backend/screenshots.mjs` (~400 lines, 8 tests)
- `test/backend/screenshot-linking.mjs` (~300 lines, 8 tests)
- `test/backend/transcription-chunking.mjs` (~250 lines, 6 tests)
- `test/backend/voice-note.mjs` (~300 lines, 5 tests)
- `test/backend/compose-smart.mjs` (~350 lines, 6 tests)
- Total: ~1,600 lines, 33 tests

### New Feature Files (2)
- `lib/screenshot-linker.ts` (~400 lines)
- `migrations/screenshot-linking.sql` (~50 lines)

### Modified Files (3)
- `app/api/v1/analysis/screenshot/route.ts` - Fix table name
- `app/api/v1/screenshots/[id]/analyze/route.ts` - Call linker after analysis
- `test/backend/_shared.mjs` - Add OpenAI gating

### Documentation (1)
- `docs/AI_FEATURES_TEST_PLAN.md` - This document

**Total Effort**: ~2,500 lines across 12 files

---

## Dependencies & Prerequisites

### External Services
- OpenAI API key (`OPENAI_API_KEY`)
- Supabase project with storage bucket
- Test user with valid JWT token

### Database Schema
- `screenshots` table
- `screenshot_analysis` table (unified naming)
- `contacts`, `interactions`, `attachments` tables
- `persona_notes`, `message_generations` tables
- `goals` table

### Environment Variables
```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
TEST_EMAIL=test@example.com
TEST_PASSWORD=password
RUN_OPENAI_TESTS=1  # Optional, defaults to 0
```

---

## Risk Mitigation

### OpenAI Quota Limits
- **Risk**: Tests fail due to rate limits
- **Mitigation**: Gate with `RUN_OPENAI_TESTS`, run in off-peak hours

### Storage Costs
- **Risk**: Test files accumulate in storage
- **Mitigation**: Delete all test files in cleanup, use `test/` prefix for easy bulk delete

### Test Flakiness
- **Risk**: Network/timing issues
- **Mitigation**: Retries with exponential backoff, generous timeouts

### Data Pollution
- **Risk**: Test data pollutes production
- **Mitigation**: Use dedicated test user, cleanup in finally blocks

---

## Monitoring & Alerts

### Test Execution Metrics
- Pass rate by test file
- Average duration per test
- OpenAI token usage
- Storage usage (GB)

### Failure Alerts
- Consecutive failures (3+) → Slack alert
- OpenAI quota exceeded → Skip tests, alert team
- Storage quota exceeded → Cleanup, alert team

---

## Next Steps After Test Implementation

1. **Integrate into CI/CD**
   - Run on every PR
   - Block merge if tests fail
   - Weekly full run with `RUN_OPENAI_TESTS=1`

2. **Expand Coverage**
   - Add screenshot → interaction → warmth update flow
   - Add voice note → contact tagging flow
   - Add compose → send → track delivery

3. **Performance Optimization**
   - Parallel test execution where safe
   - Caching for repeated setup (test contact, etc.)
   - Batch cleanup operations

4. **Documentation**
   - Add test patterns to CONTRIBUTING.md
   - Create video walkthrough of test setup
   - Document common failure modes

---

## Appendix: Test Data Generators

### Generate Valid MP3 (Any Size)
```javascript
export function generateMP3Data(targetSize) {
  const header = new Uint8Array([
    0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ID3v2
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame
  ]);
  const data = new Uint8Array(targetSize);
  data.set(header, 0);
  return data;
}
```

### Generate Valid JPEG (Any Size)
```javascript
export function generateJPEGData(targetSize) {
  const header = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, // JPEG/JFIF
    0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xD9, // End of image
  ]);
  const data = new Uint8Array(targetSize);
  data.set(header, 0);
  data.set(new Uint8Array([0xFF, 0xD9]), targetSize - 2); // EOF marker
  return data;
}
```

### Create Test Screenshot with Text
```javascript
export async function createScreenshotWithText(text, email, phone) {
  // Generate simple image with text overlay using canvas/sharp
  // For E2E, can use pre-made fixtures or generate on-the-fly
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-29  
**Status**: Ready for Implementation  
**Estimated Completion**: 5 weeks
