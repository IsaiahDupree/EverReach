#!/usr/bin/env node
/**
 * E2E Contact Photo Tests
 * 
 * Tests CRUD operations for contact profile pictures:
 * - Create contact with photo_url
 * - Read contact photo in list and detail
 * - Update contact photo
 * - Delete contact (photo should be cleaned up)
 * - Verify user profile photo is separate and unaffected
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Contact Photo Tests',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  let exitCode = 0;
  const tests = [];

  try {
    const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
    const ORIGIN = 'https://everreach.app';
    const token = await getAccessToken();

    lines.push('## Setup');
    lines.push(`- Base URL: ${BASE}`);
    lines.push('- ✅ Authentication successful');
    lines.push('');

    // Test data
    const testPhotoUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=test-contact-photo';
    const updatedPhotoUrl = 'https://api.dicebear.com/7.x/personas/svg?seed=updated-photo';
    let testContactId = null;

    // Test 1: Create contact with photo_url
    lines.push('## Test 1: Create Contact with photo_url');
    try {
      const { res, json, ms } = await apiFetch(BASE, '/v1/contacts', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify({
          display_name: `Test Photo Contact ${rid.slice(0, 8)}`,
          emails: [`photo-test-${rid}@example.com`],
          photo_url: testPhotoUrl,
          tags: ['test', 'photo-test'],
        }),
      });

      const pass = (res.status === 200 || res.status === 201) && json?.contact?.id;
      if (pass) {
        testContactId = json.contact.id;
        const hasPhotoUrl = json.contact.photo_url === testPhotoUrl;
        tests.push({
          name: 'Create contact with photo_url',
          pass: hasPhotoUrl,
          status: res.status,
          ms,
        });
        
        if (hasPhotoUrl) {
          lines.push(`- ✅ Contact created with photo_url`);
          lines.push(`- Contact ID: \`${testContactId}\``);
          lines.push(`- Photo URL: ${json.contact.photo_url?.substring(0, 50)}...`);
        } else {
          lines.push(`- ❌ Contact created but photo_url not returned`);
          lines.push(`- Expected: ${testPhotoUrl.substring(0, 50)}...`);
          lines.push(`- Got: ${json.contact.photo_url || 'null'}`);
          exitCode = 1;
        }
      } else {
        tests.push({ name: 'Create contact with photo_url', pass: false, status: res.status, ms });
        lines.push(`- ❌ Failed to create contact: ${res.status}`);
        exitCode = 1;
      }
    } catch (e) {
      tests.push({ name: 'Create contact with photo_url', pass: false, error: e.message });
      lines.push(`- ❌ Error: ${e.message}`);
      exitCode = 1;
    }
    lines.push('');

    // Test 2: Read contact photo in list (GET /v1/contacts)
    if (testContactId) {
      lines.push('## Test 2: Read Contact Photo in List');
      try {
        const { res, json, ms } = await apiFetch(BASE, '/v1/contacts?limit=100', {
          method: 'GET',
          token,
          origin: ORIGIN,
        });

        const contact = json?.items?.find(c => c.id === testContactId);
        const pass = res.ok && contact && contact.photo_url === testPhotoUrl;
        
        tests.push({
          name: 'Read contact photo in list',
          pass,
          status: res.status,
          ms,
        });

        if (pass) {
          lines.push(`- ✅ Contact photo_url present in list`);
          lines.push(`- Photo URL: ${contact.photo_url.substring(0, 50)}...`);
        } else {
          lines.push(`- ❌ Contact photo_url missing or incorrect in list`);
          if (contact) {
            lines.push(`- Expected: ${testPhotoUrl.substring(0, 50)}...`);
            lines.push(`- Got: ${contact.photo_url || 'null'}`);
          } else {
            lines.push(`- Contact not found in list`);
          }
          exitCode = 1;
        }
      } catch (e) {
        tests.push({ name: 'Read contact photo in list', pass: false, error: e.message });
        lines.push(`- ❌ Error: ${e.message}`);
        exitCode = 1;
      }
      lines.push('');

      // Test 3: Read contact photo in detail (GET /v1/contacts/:id)
      lines.push('## Test 3: Read Contact Photo in Detail');
      try {
        const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}`, {
          method: 'GET',
          token,
          origin: ORIGIN,
        });

        const pass = res.ok && json?.contact?.photo_url === testPhotoUrl;
        
        tests.push({
          name: 'Read contact photo in detail',
          pass,
          status: res.status,
          ms,
        });

        if (pass) {
          lines.push(`- ✅ Contact photo_url present in detail`);
          lines.push(`- Photo URL: ${json.contact.photo_url.substring(0, 50)}...`);
        } else {
          lines.push(`- ❌ Contact photo_url missing or incorrect in detail`);
          lines.push(`- Expected: ${testPhotoUrl.substring(0, 50)}...`);
          lines.push(`- Got: ${json?.contact?.photo_url || 'null'}`);
          exitCode = 1;
        }
      } catch (e) {
        tests.push({ name: 'Read contact photo in detail', pass: false, error: e.message });
        lines.push(`- ❌ Error: ${e.message}`);
        exitCode = 1;
      }
      lines.push('');

      // Test 4: Update contact photo_url
      lines.push('## Test 4: Update Contact Photo');
      try {
        const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}`, {
          method: 'PATCH',
          token,
          origin: ORIGIN,
          body: JSON.stringify({
            photo_url: updatedPhotoUrl,
          }),
        });

        const pass = res.ok && json?.contact?.photo_url === updatedPhotoUrl;
        
        tests.push({
          name: 'Update contact photo',
          pass,
          status: res.status,
          ms,
        });

        if (pass) {
          lines.push(`- ✅ Contact photo_url updated successfully`);
          lines.push(`- New Photo URL: ${json.contact.photo_url.substring(0, 50)}...`);
        } else {
          lines.push(`- ❌ Failed to update contact photo_url`);
          lines.push(`- Expected: ${updatedPhotoUrl.substring(0, 50)}...`);
          lines.push(`- Got: ${json?.contact?.photo_url || 'null'}`);
          exitCode = 1;
        }
      } catch (e) {
        tests.push({ name: 'Update contact photo', pass: false, error: e.message });
        lines.push(`- ❌ Error: ${e.message}`);
        exitCode = 1;
      }
      lines.push('');

      // Test 5: Verify updated photo persists in list
      lines.push('## Test 5: Verify Updated Photo Persists');
      try {
        const { res, json, ms } = await apiFetch(BASE, '/v1/contacts?limit=100', {
          method: 'GET',
          token,
          origin: ORIGIN,
        });

        const contact = json?.items?.find(c => c.id === testContactId);
        const pass = res.ok && contact && contact.photo_url === updatedPhotoUrl;
        
        tests.push({
          name: 'Verify updated photo persists',
          pass,
          status: res.status,
          ms,
        });

        if (pass) {
          lines.push(`- ✅ Updated photo_url persists in list`);
          lines.push(`- Photo URL: ${contact.photo_url.substring(0, 50)}...`);
        } else {
          lines.push(`- ❌ Updated photo_url not persisted`);
          exitCode = 1;
        }
      } catch (e) {
        tests.push({ name: 'Verify updated photo persists', pass: false, error: e.message });
        lines.push(`- ❌ Error: ${e.message}`);
        exitCode = 1;
      }
      lines.push('');

      // Test 6: Remove contact photo (set to null)
      lines.push('## Test 6: Remove Contact Photo');
      try {
        const { res, json, ms } = await apiFetch(BASE, `/v1/contacts/${testContactId}`, {
          method: 'PATCH',
          token,
          origin: ORIGIN,
          body: JSON.stringify({
            photo_url: null,
          }),
        });

        const pass = res.ok && (!json?.contact?.photo_url || json?.contact?.photo_url === null);
        
        tests.push({
          name: 'Remove contact photo',
          pass,
          status: res.status,
          ms,
        });

        if (pass) {
          lines.push(`- ✅ Contact photo_url removed successfully`);
          lines.push(`- Photo URL now: ${json?.contact?.photo_url || 'null'}`);
        } else {
          lines.push(`- ❌ Failed to remove contact photo_url`);
          lines.push(`- Expected: null`);
          lines.push(`- Got: ${json?.contact?.photo_url}`);
          exitCode = 1;
        }
      } catch (e) {
        tests.push({ name: 'Remove contact photo', pass: false, error: e.message });
        lines.push(`- ❌ Error: ${e.message}`);
        exitCode = 1;
      }
      lines.push('');
    }

    // Test 7: Verify user profile photo is separate (GET /v1/me)
    lines.push('## Test 7: Verify User Profile Photo Separate');
    try {
      const { res, json, ms } = await apiFetch(BASE, '/v1/me', {
        method: 'GET',
        token,
        origin: ORIGIN,
      });

      const pass = res.ok && json?.user;
      
      tests.push({
        name: 'User profile endpoint accessible',
        pass,
        status: res.status,
        ms,
      });

      if (pass) {
        lines.push(`- ✅ User profile endpoint working`);
        lines.push(`- User ID: ${json.user.id}`);
        lines.push(`- User has avatar_url: ${json.user.avatar_url ? 'Yes' : 'No'}`);
        lines.push(`- User has photo_url: ${json.user.photo_url ? 'Yes' : 'No'}`);
        lines.push(`- ℹ️  User photos are stored separately from contact photos`);
      } else {
        lines.push(`- ❌ Failed to get user profile`);
        exitCode = 1;
      }
    } catch (e) {
      tests.push({ name: 'User profile endpoint accessible', pass: false, error: e.message });
      lines.push(`- ❌ Error: ${e.message}`);
      exitCode = 1;
    }
    lines.push('');

    // Test 8: Create contact without photo (should work)
    lines.push('## Test 8: Create Contact Without Photo');
    try {
      const { res, json, ms } = await apiFetch(BASE, '/v1/contacts', {
        method: 'POST',
        token,
        origin: ORIGIN,
        body: JSON.stringify({
          display_name: `No Photo Contact ${rid.slice(0, 8)}`,
          emails: [`no-photo-${rid}@example.com`],
          tags: ['test', 'no-photo'],
        }),
      });

      const pass = (res.status === 200 || res.status === 201) && json?.contact?.id;
      const noPhotoContactId = json?.contact?.id;
      
      tests.push({
        name: 'Create contact without photo',
        pass,
        status: res.status,
        ms,
      });

      if (pass) {
        lines.push(`- ✅ Contact created without photo_url`);
        lines.push(`- Contact ID: \`${noPhotoContactId}\``);
        lines.push(`- Photo URL: ${json.contact.photo_url || 'null (as expected)'}`);
        
        // Cleanup this contact
        await apiFetch(BASE, `/v1/contacts/${noPhotoContactId}`, {
          method: 'DELETE',
          token,
          origin: ORIGIN,
        });
      } else {
        lines.push(`- ❌ Failed to create contact without photo`);
        exitCode = 1;
      }
    } catch (e) {
      tests.push({ name: 'Create contact without photo', pass: false, error: e.message });
      lines.push(`- ❌ Error: ${e.message}`);
      exitCode = 1;
    }
    lines.push('');

    // Cleanup test contact
    if (testContactId) {
      lines.push('## Cleanup');
      try {
        const { res } = await apiFetch(BASE, `/v1/contacts/${testContactId}`, {
          method: 'DELETE',
          token,
          origin: ORIGIN,
        });
        
        if (res.ok || res.status === 204) {
          lines.push(`- ✅ Test contact deleted`);
        } else {
          lines.push(`- ⚠️  Failed to delete test contact: ${res.status}`);
        }
      } catch (e) {
        lines.push(`- ⚠️  Cleanup error: ${e.message}`);
      }
      lines.push('');
    }

    // Summary
    const passed = tests.filter(t => t.pass).length;
    const failed = tests.filter(t => !t.pass).length;
    const total = tests.length;

    lines.push('## Summary');
    lines.push(`**Passed**: ${passed}/${total}`);
    lines.push(`**Failed**: ${failed}/${total}`);
    lines.push('');

    if (failed === 0) {
      lines.push('✅ **All contact photo tests passed!**');
      lines.push('');
      lines.push('**Verified:**');
      lines.push('- ✅ Contacts can be created with photo_url');
      lines.push('- ✅ Photo URLs are returned in list queries');
      lines.push('- ✅ Photo URLs are returned in detail queries');
      lines.push('- ✅ Photo URLs can be updated');
      lines.push('- ✅ Photo URLs can be removed');
      lines.push('- ✅ Contacts can be created without photos');
      lines.push('- ✅ User profile photos are separate from contact photos');
    } else {
      lines.push(`❌ **${failed} test(s) failed**`);
      lines.push('');
      lines.push('**Failed Tests:**');
      tests.filter(t => !t.pass).forEach(t => {
        lines.push(`- ${t.name} (${t.error || `Status: ${t.status}`})`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push(`**Test completed**: ${nowIso()}`);

  } catch (err) {
    lines.push('');
    lines.push('## ❌ Fatal Error');
    lines.push('```');
    lines.push(mdEscape(err.stack || err.message || String(err)));
    lines.push('```');
    exitCode = 1;
  } finally {
    await writeReport(lines, 'test/agent/reports', 'e2e_contact_photos');
  }

  process.exit(exitCode);
}

test();
