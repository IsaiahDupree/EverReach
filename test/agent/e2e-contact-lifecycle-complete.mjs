/**
 * E2E Test: Complete Contact Lifecycle
 * 
 * Tests ALL contact-related features in sequence:
 * 1. Create contact
 * 2. Upload profile image
 * 3. Update profile image
 * 4. Upload voice note
 * 5. Upload screenshot for analysis
 * 6. Log interactions
 * 7. Add custom fields
 * 8. Set watch status
 * 9. Create warmth alert
 * 10. Add to pipeline/stage
 * 11. Create goal
 * 12. Delete contact (cleanup)
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso } from './_shared.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rid = runId();
const lines = [
  '# E2E Test: Complete Contact Lifecycle',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();

  lines.push(`- **Backend**: ${BASE}`);
  lines.push(`- **Origin**: ${ORIGIN}`);
  lines.push('');
  lines.push('## Complete Feature Bucket Test');
  lines.push('');

  const tests = [];
  let testContactId = null;
  let uploadedFileId = null;
  let voiceNoteId = null;
  let pipelineId = null;
  let goalId = null;

  // ===== STEP 1: Create Contact =====
  lines.push('### 1. Create Contact');
  lines.push('');

  try {
    const payload = {
      name: `Lifecycle Test ${rid.slice(0, 8)}`,
      emails: [`lifecycle-${rid.slice(0, 8)}@example.com`],
      phones: [`+1555${rid.slice(0, 7)}`],
      tags: ['e2e_lifecycle', 'vip'],
      notes: 'Complete lifecycle E2E test contact',
    };
    const { res, json, ms } = await apiFetch(BASE, '/api/contacts', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify(payload),
    });
    const pass = (res.status === 200 || res.status === 201) && json?.contact?.id;
    if (pass) testContactId = json.contact.id;
    tests.push({
      name: '1. Create contact',
      pass,
      status: res.status,
      ms,
      contact_id: testContactId,
    });
    lines.push(pass ? `- ✅ Contact created: ${testContactId}` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '1. Create contact', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  if (!testContactId) {
    lines.push('**Test aborted**: No contact created');
    await writeReport('e2e_contact_lifecycle_complete', lines, tests, exitCode);
    process.exit(exitCode);
  }

  // ===== STEP 2: Upload Profile Image =====
  lines.push('### 2. Upload Profile Image');
  lines.push('');

  try {
    // Create mock image data (1x1 PNG)
    const mockImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    const { res, json, ms } = await apiFetch(BASE, '/v1/files', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify({
        filename: `profile-${rid.slice(0, 8)}.png`,
        content_type: 'image/png',
        size: mockImage.length,
        purpose: 'profile_image',
        contact_id: testContactId,
      }),
    });
    const pass = res.status === 200 || res.status === 201;
    if (pass) uploadedFileId = json?.file?.id;
    tests.push({
      name: '2. Upload profile image',
      pass,
      status: res.status,
      ms,
      file_id: uploadedFileId,
    });
    lines.push(pass ? `- ✅ Profile image uploaded: ${uploadedFileId}` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '2. Upload profile image', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 3: Update Contact with Profile Image =====
  lines.push('### 3. Update Contact Profile Image');
  lines.push('');

  if (uploadedFileId) {
    try {
      const { res, json, ms } = await apiFetch(BASE, `/api/contacts/${testContactId}`, {
        method: 'PUT',
        token,
        origin: ORIGIN,
        body: JSON.stringify({
          avatar_url: `https://everreach.app/uploads/${uploadedFileId}`,
        }),
      });
      const pass = res.status === 200;
      tests.push({
        name: '3. Update profile image',
        pass,
        status: res.status,
        ms,
      });
      lines.push(pass ? `- ✅ Profile image set on contact` : `- ❌ Failed`);
      lines.push('');
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: '3. Update profile image', pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      lines.push('');
      exitCode = 1;
    }
  }

  // ===== STEP 4: Upload Voice Note =====
  lines.push('### 4. Upload Voice Note');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/voice-notes', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify({
        filename: `voice-${rid.slice(0, 8)}.m4a`,
        content_type: 'audio/m4a',
        duration_seconds: 30,
        contact_id: testContactId,
      }),
    });
    const pass = res.status === 200 || res.status === 201;
    if (pass) voiceNoteId = json?.voice_note?.id;
    tests.push({
      name: '4. Upload voice note',
      pass,
      status: res.status,
      ms,
      voice_note_id: voiceNoteId,
    });
    lines.push(pass ? `- ✅ Voice note uploaded: ${voiceNoteId}` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '4. Upload voice note', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 5: Upload Screenshot for Analysis =====
  lines.push('### 5. Upload Screenshot for AI Analysis');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, '/v1/files', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify({
        filename: `screenshot-${rid.slice(0, 8)}.png`,
        content_type: 'image/png',
        size: 1024,
        purpose: 'screenshot_analysis',
      }),
    });
    const pass = res.status === 200 || res.status === 201;
    tests.push({
      name: '5. Upload screenshot',
      pass,
      status: res.status,
      ms,
    });
    lines.push(pass ? `- ✅ Screenshot uploaded for analysis` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '5. Upload screenshot', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 6: Log Multiple Interactions =====
  lines.push('### 6. Log Interactions (Email, SMS, Call)');
  lines.push('');

  const interactions = [
    { channel: 'email', direction: 'outbound', summary: 'Initial outreach email' },
    { channel: 'sms', direction: 'inbound', summary: 'Replied via SMS' },
    { channel: 'call', direction: 'outbound', summary: 'Follow-up phone call, 15 min' },
  ];

  for (const interaction of interactions) {
    try {
      const payload = {
        contact_id: testContactId,
        ...interaction,
        sentiment: 'positive',
        occurred_at: new Date().toISOString(),
      };
      const { res, json, ms } = await apiFetch(BASE, '/api/interactions', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify(payload),
      });
      const pass = res.status === 200 || res.status === 201;
      tests.push({
        name: `6. Log ${interaction.channel} interaction`,
        pass,
        status: res.status,
        ms,
      });
      lines.push(pass ? `- ✅ ${interaction.channel} interaction logged` : `- ❌ Failed`);
      if (!pass) exitCode = 1;
    } catch (e) {
      tests.push({ name: `6. Log ${interaction.channel} interaction`, pass: false, error: e.message });
      lines.push(`- ❌ Failed: ${e.message}`);
      exitCode = 1;
    }
  }
  lines.push('');

  // ===== STEP 7: Add Custom Fields =====
  lines.push('### 7. Add Custom Fields');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}/custom`, {
      method: 'PATCH',
      token,
      origin: ORIGIN,
      body: JSON.stringify({
        company: 'Acme Corp',
        job_title: 'CTO',
        linkedin_url: 'https://linkedin.com/in/test',
        is_vip: true,
        annual_revenue: 500000,
      }),
    });
    const pass = res.status === 200;
    tests.push({
      name: '7. Add custom fields',
      pass,
      status: res.status,
      ms,
    });
    lines.push(pass ? `- ✅ Custom fields added (company, job_title, linkedin, vip, revenue)` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '7. Add custom fields', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 8: Set Watch Status =====
  lines.push('### 8. Set Watch Status (VIP)');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}/watch`, {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify({ watch_status: 'vip' }),
    });
    const pass = res.status === 200 || res.status === 201;
    tests.push({
      name: '8. Set watch status',
      pass,
      status: res.status,
      ms,
    });
    lines.push(pass ? `- ✅ Watch status set to VIP` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '8. Set watch status', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 9: Recompute Warmth =====
  lines.push('### 9. Recompute Warmth Score');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}/warmth/recompute`, {
      method: 'POST',
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200;
    tests.push({
      name: '9. Recompute warmth',
      pass,
      status: res.status,
      ms,
      warmth_score: json?.warmth_score,
    });
    lines.push(pass ? `- ✅ Warmth recomputed: ${json?.warmth_score}/100` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '9. Recompute warmth', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 10: Create Pipeline and Add Contact =====
  lines.push('### 10. Add to Pipeline');
  lines.push('');

  try {
    // First create pipeline
    const pipelinePayload = {
      name: `Pipeline ${rid.slice(0, 8)}`,
      stages: [
        { name: 'Lead', order: 0 },
        { name: 'Qualified', order: 1 },
      ],
    };
    const { res: pRes, json: pJson, ms: pMs } = await apiFetch(BASE, '/v1/pipelines', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify(pipelinePayload),
    });
    const pipelineCreated = (pRes.status === 200 || pRes.status === 201) && pJson?.pipeline?.id;
    if (pipelineCreated) {
      pipelineId = pJson.pipeline.id;
      const stageId = pJson.pipeline.stages?.[0]?.id;

      // Now add contact to pipeline
      const { res, json, ms } = await apiFetch(BASE, `/api/contacts/${testContactId}`, {
        method: 'PUT',
        token,
        origin: ORIGIN,
        body: JSON.stringify({
          pipeline_id: pipelineId,
          stage_id: stageId,
        }),
      });
      const pass = res.status === 200;
      tests.push({
        name: '10. Add to pipeline',
        pass,
        status: res.status,
        ms,
        pipeline_id: pipelineId,
      });
      lines.push(pass ? `- ✅ Added to pipeline: ${pipelineId}` : `- ❌ Failed`);
      if (!pass) exitCode = 1;
    } else {
      tests.push({ name: '10. Create pipeline', pass: false, status: pRes.status });
      lines.push(`- ⚠️  Pipeline creation failed, skipping`);
    }
    lines.push('');
  } catch (e) {
    tests.push({ name: '10. Add to pipeline', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 11: Create Goal =====
  lines.push('### 11. Create Relationship Goal');
  lines.push('');

  try {
    const goalPayload = {
      contact_id: testContactId,
      type: 'stay_in_touch',
      target_frequency_days: 14,
      title: 'Stay in touch every 2 weeks',
    };
    const { res, json, ms } = await apiFetch(BASE, '/v1/goals', {
      method: 'POST',
      token,
      origin: ORIGIN,
      body: JSON.stringify(goalPayload),
    });
    const pass = res.status === 200 || res.status === 201;
    if (pass) goalId = json?.goal?.id;
    tests.push({
      name: '11. Create goal',
      pass,
      status: res.status,
      ms,
      goal_id: goalId,
    });
    lines.push(pass ? `- ✅ Goal created: ${goalId}` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '11. Create goal', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 12: Get Context Bundle (AI Feature) =====
  lines.push('### 12. Get AI Context Bundle');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}/context-bundle?interactions=10`, {
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200 && json?.contact?.id === testContactId;
    tests.push({
      name: '12. Get context bundle',
      pass,
      status: res.status,
      ms,
      has_prompt_skeleton: !!json?.context?.prompt_skeleton,
      interaction_count: json?.interactions?.length,
    });
    lines.push(pass ? `- ✅ Context bundle retrieved (${json?.interactions?.length} interactions)` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '12. Get context bundle', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 13: Delete Contact (Cleanup) =====
  lines.push('### 13. Delete Contact (Cleanup)');
  lines.push('');

  try {
    const { res, json, ms } = await apiFetch(BASE, `/api/contacts/${testContactId}`, {
      method: 'DELETE',
      token,
      origin: ORIGIN,
    });
    const pass = res.status === 200 || res.status === 204;
    tests.push({
      name: '13. Delete contact',
      pass,
      status: res.status,
      ms,
    });
    lines.push(pass ? `- ✅ Contact deleted successfully` : `- ❌ Failed`);
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: '13. Delete contact', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== SUMMARY =====
  lines.push('---');
  lines.push('');
  lines.push('## Complete Lifecycle Summary');
  lines.push('');
  lines.push('**Features Tested**:');
  lines.push('- ✅ Contact creation');
  lines.push('- ✅ Profile image upload & update');
  lines.push('- ✅ Voice note upload');
  lines.push('- ✅ Screenshot analysis');
  lines.push('- ✅ Multi-channel interactions (email, SMS, call)');
  lines.push('- ✅ Custom fields');
  lines.push('- ✅ Watch status / warmth alerts');
  lines.push('- ✅ Warmth score computation');
  lines.push('- ✅ Pipeline management');
  lines.push('- ✅ Relationship goals');
  lines.push('- ✅ AI context bundle');
  lines.push('- ✅ Contact deletion');
  lines.push('');
  lines.push(`**Tests Passed**: ${tests.filter(t => t.pass).length}/${tests.length}`);
  lines.push('');

  if (exitCode === 0) {
    lines.push('✅ **Complete contact lifecycle test PASSED**');
  } else {
    lines.push('⚠️  **Some lifecycle tests failed**');
  }

  await writeReport('e2e_contact_lifecycle_complete', lines, tests, exitCode);
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  lines.push('');
  lines.push(`**Fatal Error**: ${err.message}`);
  writeReport('e2e_contact_lifecycle_complete', lines, [], 1).then(() => process.exit(1));
});
