#!/usr/bin/env node
/**
 * Test warmth score changes with a REAL contact from your account
 * 
 * Usage:
 *   node test-warmth-with-real-contact.mjs <contact-name-or-email>
 * 
 * Example:
 *   node test-warmth-with-real-contact.mjs "John Doe"
 *   node test-warmth-with-real-contact.mjs john@example.com
 * 
 * This will:
 * 1. Find the contact by name or email
 * 2. Show current warmth score
 * 3. Add a test interaction
 * 4. Recompute warmth
 * 5. Show new warmth score
 * 6. Clean up the test interaction
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://backend-vercel-pfwtbpnw0-isaiahduprees-projects.vercel.app';

console.log('👤 Real Contact Warmth Test');
console.log('API Base:', API_BASE);
console.log('==========================================\n');

async function main() {
  const token = await getAccessToken();
  
  // Get search query from command line args
  const searchQuery = process.argv[2];
  
  if (!searchQuery) {
    console.log('❌ Please provide a contact name or email:');
    console.log('   node test-warmth-with-real-contact.mjs "John Doe"');
    console.log('   node test-warmth-with-real-contact.mjs john@example.com');
    process.exit(1);
  }
  
  console.log(`🔍 Searching for contact: "${searchQuery}"\n`);
  
  // Search for contact
  const searchRes = await fetch(`${API_BASE}/api/v1/contacts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!searchRes.ok) {
    console.log(`❌ Failed to fetch contacts: ${searchRes.status}`);
    process.exit(1);
  }
  
  const contactsData = await searchRes.json();
  const contacts = Array.isArray(contactsData) ? contactsData : (contactsData.contacts || []);
  
  // Find matching contact
  const contact = contacts.find(c => 
    c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.primary_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (!contact) {
    console.log(`❌ No contact found matching "${searchQuery}"`);
    console.log('\nAvailable contacts:');
    contacts.slice(0, 10).forEach(c => {
      console.log(`   • ${c.display_name || 'No name'} (${c.primary_email || 'No email'})`);
    });
    process.exit(1);
  }
  
  const contactId = contact.id;
  console.log(`✅ Found contact: ${contact.display_name || contact.primary_email}`);
  console.log(`   ID: ${contactId}`);
  console.log(`   Email: ${contact.primary_email || 'N/A'}\n`);
  
  // Get current warmth
  console.log('📊 BEFORE Changes');
  console.log('─'.repeat(50));
  const beforeRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const beforeData = await beforeRes.json();
  const beforeContact = beforeData.contact || beforeData;
  
  console.log(`   Warmth Score: ${beforeContact.warmth || 'Not computed yet'}`);
  console.log(`   Warmth Band: ${beforeContact.warmth_band || 'Not computed yet'}`);
  console.log(`   Last interaction: ${beforeContact.last_interaction_at || 'Never'}`);
  
  // Get existing interactions count
  const interactionsRes = await fetch(`${API_BASE}/api/v1/interactions?contact_id=${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const interactionsData = await interactionsRes.json();
  const interactions = Array.isArray(interactionsData) ? interactionsData : (interactionsData.interactions || []);
  console.log(`   Total interactions: ${interactions.length}\n`);
  
  // Add a test interaction
  console.log('➕ Adding test interaction (email sent today)...');
  const addInterRes = await fetch(`${API_BASE}/api/v1/interactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_id: contactId,
      kind: 'email',
      direction: 'outbound',
      occurred_at: new Date().toISOString(),
      summary: '🧪 Test interaction for warmth scoring demo (will be deleted)'
    })
  });
  
  if (!addInterRes.ok) {
    console.log(`❌ Failed to add interaction: ${addInterRes.status}`);
    process.exit(1);
  }
  
  const newInteraction = await addInterRes.json();
  const newInteractionId = newInteraction.id || newInteraction.interaction?.id;
  console.log(`✅ Test interaction added: ${newInteractionId}\n`);
  
  // Recompute warmth
  console.log('🔄 Recomputing warmth score...');
  const recomputeRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!recomputeRes.ok) {
    const errorText = await recomputeRes.text();
    console.log(`❌ Failed to recompute: ${recomputeRes.status}`);
    console.log(`   Error: ${errorText.substring(0, 200)}`);
  } else {
    console.log(`✅ Warmth recomputed\n`);
  }
  
  // Get new warmth
  console.log('📈 AFTER Changes');
  console.log('─'.repeat(50));
  const afterRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const afterData = await afterRes.json();
  const afterContact = afterData.contact || afterData;
  
  console.log(`   Warmth Score: ${afterContact.warmth || 'Not computed'}`);
  console.log(`   Warmth Band: ${afterContact.warmth_band || 'Not computed'}`);
  console.log(`   Last interaction: ${afterContact.last_interaction_at || 'Never'}`);
  console.log(`   Total interactions: ${interactions.length + 1}\n`);
  
  // Show comparison
  const warmthBefore = beforeContact.warmth || 0;
  const warmthAfter = afterContact.warmth || 0;
  const change = warmthAfter - warmthBefore;
  
  console.log('💡 COMPARISON');
  console.log('─'.repeat(50));
  console.log(`   Before: ${warmthBefore} (${beforeContact.warmth_band || 'none'})`);
  console.log(`   After:  ${warmthAfter} (${afterContact.warmth_band || 'none'})`);
  console.log(`   Change: ${change > 0 ? '+' : ''}${change} points`);
  
  if (change > 0) {
    console.log(`   ✅ Warmth INCREASED!`);
  } else if (change < 0) {
    console.log(`   📉 Warmth DECREASED`);
  } else {
    console.log(`   ⚠️  No change`);
  }
  
  // Ask user if they want to keep or delete the test interaction
  console.log('\n🤔 Cleanup Options:');
  console.log('   The test interaction will be automatically deleted.');
  console.log('   You can view this contact in your app to see the warmth change!\n');
  
  // Wait a moment so user can check their app
  console.log('⏳ Waiting 5 seconds so you can check your app...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Delete test interaction
  console.log('\n🧹 Deleting test interaction...');
  await fetch(`${API_BASE}/api/v1/interactions/${newInteractionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✅ Test interaction deleted');
  
  // Recompute again to restore original state
  console.log('\n🔄 Recomputing warmth to restore original state...');
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✅ Warmth restored to original state\n');
  
  console.log('✨ Test complete! Your contact is back to its original state.');
  console.log('\n📝 Next Steps:');
  console.log('   1. Open your app and find this contact');
  console.log('   2. Add a REAL interaction (email, call, etc.)');
  console.log('   3. Watch the warmth score update!');
  console.log('   4. Try not contacting them for a while to see decay');
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
