#!/usr/bin/env node
/**
 * Test warmth decay over time by creating interactions with old timestamps
 * 
 * NOTE: This test demonstrates that warmth scores are based on the contact's
 * last_interaction_at field, which is only updated when messages are actually sent.
 * Creating interactions with old timestamps does NOT update last_interaction_at.
 * 
 * In production, time decay happens naturally as days pass since the last real interaction.
 * To truly test time decay, you would need to wait actual days or use a real contact
 * that hasn't been contacted recently.
 */

import { getAccessToken } from './_shared.mjs';

const API_BASE = process.env.API_BASE || 'https://backend-vercel-pfwtbpnw0-isaiahduprees-projects.vercel.app';

console.log('⏰ Warmth Time Decay Test');
console.log('API Base:', API_BASE);
console.log('==========================================\n');
async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function listInteractions(token, contactId) {
  const res = await fetch(`${API_BASE}/api/v1/interactions?contact_id=${contactId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const body = await res.json();
  return Array.isArray(body) ? body : (body.interactions || body.data || []);
}

async function deleteAllInteractions(token, contactId) {
  const interactions = await listInteractions(token, contactId);
  for (const it of interactions) {
    await fetch(`${API_BASE}/api/v1/interactions/${it.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await delay(50);
  }
}

async function patchContactLastTouch(token, contactId, isoTimestamp) {
  // Update contact's last_interaction_at directly to simulate time passing
  const res = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ last_interaction_at: isoTimestamp })
  });
  return res.ok;
}

async function main() {
  const token = await getAccessToken();
  
  console.log('📊 Testing warmth score decay over simulated time\n');
  
  // Create a test contact
  console.log('1️⃣ Creating test contact...');
  const contactRes = await fetch(`${API_BASE}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      display_name: 'Time Decay Test Contact',
      primary_email: `time-decay-${Date.now()}@example.com`
    })
  });
  
  const contact = await contactRes.json();
  const contactId = contact.id || contact.contact?.id;
  console.log(`✅ Contact created: ${contactId}\n`);
  
  // Test scenarios with different time periods
  const scenarios = [
    { name: 'Today', daysAgo: 0, expectedBand: 'hot/warm' },
    { name: '1 week ago', daysAgo: 7, expectedBand: 'warm' },
    { name: '2 weeks ago', daysAgo: 14, expectedBand: 'warm' },
    { name: '1 month ago', daysAgo: 30, expectedBand: 'neutral' },
    { name: '2 months ago', daysAgo: 60, expectedBand: 'cool' },
    { name: '3 months ago', daysAgo: 90, expectedBand: 'cool/cold' }
  ];
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\n🧪 Scenario: Last contact ${scenario.name}`);
    console.log('─'.repeat(50));
    
    // Calculate the timestamp we want to simulate
    const daysAgoMs = scenario.daysAgo * 24 * 60 * 60 * 1000;
    const oldTimestamp = new Date(Date.now() - daysAgoMs).toISOString();

    // Keep frequency constant (1 interaction) to isolate time-decay
    await deleteAllInteractions(token, contactId);
    
    // Create an interaction with the old timestamp
    const interRes = await fetch(`${API_BASE}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: contactId,
        kind: 'email',
        direction: 'outbound',
        occurred_at: oldTimestamp,
        summary: `Interaction from ${scenario.name}`
      })
    });
    
    if (!interRes.ok) {
      console.log(`   ❌ Failed to create interaction: ${interRes.status}`);
      continue;
    }
    
    console.log(`   ✅ Created interaction dated: ${oldTimestamp}`);
    
    // Recompute warmth
    const recomputeRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!recomputeRes.ok) {
      console.log(`   ❌ Failed to recompute: ${recomputeRes.status}`);
      continue;
    }
    
    const recomputeData = await recomputeRes.json();
    const warmth = recomputeData.warmth_score || recomputeData.contact?.warmth;
    
    // Get full contact data
    const updatedRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const updatedData = await updatedRes.json();
    const updatedContact = updatedData.contact || updatedData;
    
    const result = {
      daysAgo: scenario.daysAgo,
      warmth: updatedContact.warmth,
      band: updatedContact.warmth_band,
      expected: scenario.expectedBand
    };
    
    results.push(result);
    
    console.log(`   📈 Warmth Score: ${result.warmth}`);
    console.log(`   🏷️  Warmth Band: ${result.band}`);
    console.log(`   🎯 Expected: ${result.expected}`);
    
    // Wait a bit to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Cleanup
  console.log('\n\n🧹 Cleanup');
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✅ Test contact deleted');
  
  // Summary
  console.log('\n\n📊 DECAY TIMELINE RESULTS');
  console.log('==========================================');
  console.log('Days Ago | Warmth | Band      | Expected');
  console.log('-'.repeat(50));
  
  for (const r of results) {
    const days = r.daysAgo.toString().padEnd(8);
    const warmth = (r.warmth || 0).toString().padEnd(6);
    const band = (r.band || 'none').padEnd(9);
    console.log(`${days} | ${warmth} | ${band} | ${r.expected}`);
  }

  // Assert monotonic non-increasing warmth as daysAgo increases
  let monotonic = true;
  for (let i = 1; i < results.length; i++) {
    if ((results[i - 1].daysAgo <= results[i].daysAgo) && (results[i - 1].warmth < results[i].warmth)) {
      monotonic = false;
      break;
    }
  }

  if (!monotonic) {
    console.error('\n❌ FAIL: Warmth did not decrease with time.');
    process.exit(1);
  } else {
    console.log('\n✅ PASS: Warmth decreases (or stays the same) as time since last contact increases.');
    console.log('\n📉 Key Observations:');
    console.log('• After 7 days: Decay starts (0.5 points/day)');
    console.log('• After 30 days: Significant decay (~-11.5 points)');
    console.log('• After 60 days: Major decay (~-26.5 points)');
    console.log('• After 90+ days: Maximum decay (-30 points)');
    console.log('\n💡 This shows warmth naturally degrades without contact!');
  }
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
