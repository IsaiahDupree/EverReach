#!/usr/bin/env node
/**
 * Cleanup Invalid Contacts Script
 * 
 * Finds and optionally deletes contacts that:
 * - Have no display_name
 * - Have no emails or phones (no contact info)
 * - Are marked as test contacts
 * - Have corrupted data
 * 
 * Usage:
 *   node cleanup-invalid-contacts.mjs --dry-run    (preview only)
 *   node cleanup-invalid-contacts.mjs --delete     (actually delete)
 */

import { getEnv, getAccessToken, apiFetch, nowIso } from './agent/_shared.mjs';

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--delete');
const deleteMode = process.argv.includes('--delete');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         INVALID CONTACTS CLEANUP SCRIPT                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();
console.log(`Mode: ${deleteMode ? '🗑️  DELETE MODE' : '👁️  DRY RUN (preview only)'}`);
console.log(`Time: ${nowIso()}`);
console.log();

async function main() {
  try {
    const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
    const token = await getAccessToken();
    const ORIGIN = 'https://everreach.app';

    console.log('✅ Authentication successful');
    console.log(`📡 API Base: ${BASE}`);
    console.log();

    // Step 1: Fetch all contacts
    console.log('📥 Fetching all contacts...');
    const { res, json } = await apiFetch(BASE, '/v1/contacts?limit=1000', {
      method: 'GET',
      token,
      origin: ORIGIN,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch contacts: ${res.status}`);
    }

    const allContacts = json.items || [];
    console.log(`✅ Found ${allContacts.length} total contacts`);
    console.log();

    // Step 2: Identify problematic contacts
    console.log('🔍 Analyzing contacts for issues...');
    console.log();

    const problematicContacts = [];

    for (const contact of allContacts) {
      const issues = [];

      // Check 1: No display name or empty name
      if (!contact.display_name || contact.display_name.trim() === '') {
        issues.push('Missing display_name');
      }

      // Check 2: No contact info (no emails AND no phones)
      const hasEmails = contact.emails && contact.emails.length > 0;
      const hasPhones = contact.phones && contact.phones.length > 0;
      if (!hasEmails && !hasPhones) {
        issues.push('No contact info (no emails or phones)');
      }

      // Check 3: Test contacts (if tagged as test)
      if (contact.tags && contact.tags.some(tag => 
        tag.toLowerCase().includes('test') || 
        tag.toLowerCase().includes('photo-test') ||
        tag.toLowerCase().includes('avatar-test')
      )) {
        issues.push('Test contact');
      }

      // Check 4: Display name contains "Test" or "Avatar Test" or "Photo Test"
      if (contact.display_name && (
        contact.display_name.includes('Test Contact') ||
        contact.display_name.includes('Avatar Test') ||
        contact.display_name.includes('Photo Test') ||
        contact.display_name.includes('No Photo Contact')
      )) {
        issues.push('Test name pattern');
      }

      // Check 5: Email contains test patterns
      if (hasEmails && contact.emails.some(email => 
        email.includes('test-') || 
        email.includes('avatar-test') ||
        email.includes('photo-test') ||
        email.includes('@example.com')
      )) {
        issues.push('Test email pattern');
      }

      if (issues.length > 0) {
        problematicContacts.push({
          id: contact.id,
          display_name: contact.display_name || '(no name)',
          emails: contact.emails || [],
          phones: contact.phones || [],
          tags: contact.tags || [],
          created_at: contact.created_at,
          issues,
        });
      }
    }

    console.log(`🔍 Found ${problematicContacts.length} problematic contacts`);
    console.log();

    if (problematicContacts.length === 0) {
      console.log('✅ No problematic contacts found! Your account is clean.');
      return;
    }

    // Step 3: Display problematic contacts
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PROBLEMATIC CONTACTS FOUND:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    problematicContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.display_name}`);
      console.log(`   ID: ${contact.id}`);
      console.log(`   Issues: ${contact.issues.join(', ')}`);
      if (contact.emails.length > 0) {
        console.log(`   Emails: ${contact.emails.join(', ')}`);
      }
      if (contact.phones.length > 0) {
        console.log(`   Phones: ${contact.phones.join(', ')}`);
      }
      if (contact.tags.length > 0) {
        console.log(`   Tags: ${contact.tags.join(', ')}`);
      }
      console.log(`   Created: ${contact.created_at}`);
      console.log();
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    // Step 4: Delete if in delete mode
    if (deleteMode) {
      console.log('🗑️  DELETING PROBLEMATIC CONTACTS...');
      console.log();

      let deleted = 0;
      let failed = 0;

      for (const contact of problematicContacts) {
        try {
          const { res: delRes } = await apiFetch(BASE, `/v1/contacts/${contact.id}`, {
            method: 'DELETE',
            token,
            origin: ORIGIN,
          });

          if (delRes.ok || delRes.status === 204) {
            deleted++;
            console.log(`✅ Deleted: ${contact.display_name} (${contact.id})`);
          } else {
            failed++;
            console.log(`❌ Failed to delete: ${contact.display_name} (${res.status})`);
          }
        } catch (error) {
          failed++;
          console.log(`❌ Error deleting ${contact.display_name}: ${error.message}`);
        }
      }

      console.log();
      console.log('═══════════════════════════════════════════════════════════');
      console.log('DELETION SUMMARY:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`✅ Successfully deleted: ${deleted}`);
      console.log(`❌ Failed to delete: ${failed}`);
      console.log(`📊 Total processed: ${problematicContacts.length}`);
      console.log();

    } else {
      console.log('👁️  DRY RUN MODE - No contacts were deleted');
      console.log();
      console.log('To actually delete these contacts, run:');
      console.log('  node cleanup-invalid-contacts.mjs --delete');
      console.log();
    }

    // Step 5: Summary by issue type
    console.log('═══════════════════════════════════════════════════════════');
    console.log('ISSUES BREAKDOWN:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const issueCount = {};
    problematicContacts.forEach(contact => {
      contact.issues.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    });

    Object.entries(issueCount).sort((a, b) => b[1] - a[1]).forEach(([issue, count]) => {
      console.log(`  ${issue}: ${count} contact(s)`);
    });
    console.log();

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
