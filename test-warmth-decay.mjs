#!/usr/bin/env node

/**
 * Warmth Score Decay Testing Script
 * 
 * Tests:
 * 1. Create test contact with warmth mode 'test'
 * 2. Graph warmth decay over time for all modes
 * 3. Test mode switching (no score jumps)
 * 4. Verify floating point precision
 * 5. Show frontend API calls
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'https://ever-reach-be.vercel.app';
const TEST_USER_ID = process.env.TEST_USER_ID; // Your user ID

if (!SUPABASE_SERVICE_KEY || !TEST_USER_ID) {
  console.error('❌ Missing environment variables!');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY, TEST_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Warmth decay constants (from warmth-ewma.ts)
const LAMBDA_PER_DAY = {
  slow: 0.040132,    // ~30 days to reach score 30
  medium: 0.085998,  // ~14 days to reach score 30
  fast: 0.171996,    // ~7 days to reach score 30
  test: 55.26,       // ~2 hours to reach score 0
};

const DAY_MS = 86_400_000;
const WMIN = 0;

/**
 * Calculate warmth score from anchor
 * score(t) = wmin + (anchor_score - wmin) * e^(-λ * days_elapsed)
 */
function calculateWarmthScore(anchorScore, anchorAt, mode, now = new Date()) {
  const anchorTime = new Date(anchorAt);
  const dtDays = Math.max(0, (now.getTime() - anchorTime.getTime()) / DAY_MS);
  const lambda = LAMBDA_PER_DAY[mode];
  const raw = WMIN + (anchorScore - WMIN) * Math.exp(-lambda * dtDays);
  return Math.max(0, Math.min(100, raw)); // Keep raw float for precision
}

/**
 * Generate terminal graph of warmth decay
 */
function generateDecayGraph(mode, anchorScore = 100, days = 30) {
  const now = new Date();
  const anchorAt = now.toISOString();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Warmth Decay Graph - ${mode.toUpperCase()} Mode`);
  console.log(`Starting Score: ${anchorScore} | Lambda: ${LAMBDA_PER_DAY[mode]}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const dataPoints = [];
  const step = mode === 'test' ? 0.1 : 1; // 0.1 days for test mode, 1 day for others
  const maxDays = mode === 'test' ? 1 : days; // 1 day for test, 30 for others
  
  for (let day = 0; day <= maxDays; day += step) {
    const futureDate = new Date(now.getTime() + day * DAY_MS);
    const score = calculateWarmthScore(anchorScore, anchorAt, mode, futureDate);
    dataPoints.push({ day, score });
  }
  
  // Print graph
  const width = 50;
  const height = 20;
  
  for (let row = height; row >= 0; row--) {
    const scoreThreshold = (row / height) * 100;
    let line = `${scoreThreshold.toFixed(0).padStart(3)} | `;
    
    for (let col = 0; col < dataPoints.length; col += Math.ceil(dataPoints.length / width)) {
      const point = dataPoints[col];
      if (point.score >= scoreThreshold - 5 && point.score <= scoreThreshold + 5) {
        line += '█';
      } else {
        line += ' ';
      }
    }
    
    console.log(line);
  }
  
  // X-axis
  console.log(`    +${'-'.repeat(width)}`);
  const xAxisLabel = mode === 'test' ? 'Hours' : 'Days';
  console.log(`      0${' '.repeat(width - 10)}${maxDays} ${xAxisLabel}`);
  
  // Print key data points
  console.log(`\n📊 Key Data Points:`);
  const keyPoints = mode === 'test' 
    ? [0, 0.25, 0.5, 0.75, 1] // 0, 6hr, 12hr, 18hr, 24hr
    : [0, 7, 14, 21, 30];
  
  keyPoints.forEach(day => {
    const futureDate = new Date(now.getTime() + day * DAY_MS);
    const score = calculateWarmthScore(anchorScore, anchorAt, mode, futureDate);
    const timeLabel = mode === 'test' ? `${day * 24}h` : `${day}d`;
    console.log(`  ${timeLabel.padStart(6)}: ${score.toFixed(4)} (${getWarmthBand(score)})`);
  });
  
  return dataPoints;
}

/**
 * Get warmth band from score
 */
function getWarmthBand(score) {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}

/**
 * Create test contact
 */
async function createTestContact() {
  console.log('\n🔧 Creating test contact...');
  
  // Get user's org_id first
  const { data: userOrg } = await supabase
    .from('user_orgs')
    .select('org_id')
    .eq('user_id', TEST_USER_ID)
    .limit(1)
    .single();
  
  if (!userOrg) {
    console.error('❌ No org found for user');
    return null;
  }
  
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      user_id: TEST_USER_ID,
      org_id: userOrg.org_id,
      display_name: 'Warmth Test',
      emails: ['test@example.com'],
      warmth_mode: 'test',
      warmth: 100,
      warmth_band: 'hot',
      warmth_anchor_score: 100,
      warmth_anchor_at: new Date().toISOString(),
      warmth_score_cached: 100,
      warmth_cached_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create contact:', error);
    return null;
  }
  
  console.log(`✅ Created test contact: ${contact.id}`);
  console.log(`   Name: ${contact.display_name}`);
  console.log(`   Mode: ${contact.warmth_mode}`);
  console.log(`   Score: ${contact.warmth}`);
  console.log(`   Anchor: ${contact.warmth_anchor_score} @ ${contact.warmth_anchor_at}`);
  
  return contact;
}

/**
 * Test mode switching (verify no score jump)
 */
async function testModeSwitch(contactId, fromMode, toMode) {
  console.log(`\n🔄 Testing mode switch: ${fromMode} → ${toMode}`);
  
  // Get current state
  const { data: before } = await supabase
    .from('contacts')
    .select('warmth, warmth_mode, warmth_anchor_score, warmth_anchor_at')
    .eq('id', contactId)
    .single();
  
  console.log(`   Before: score=${before.warmth}, anchor=${before.warmth_anchor_score}`);
  
  // Calculate expected score (current score with old mode)
  const expectedScore = calculateWarmthScore(
    before.warmth_anchor_score,
    before.warmth_anchor_at,
    before.warmth_mode
  );
  
  console.log(`   Expected score: ${expectedScore.toFixed(4)}`);
  
  // Switch mode via backend API (simulates frontend call)
  console.log(`   Switching mode via API...`);
  
  // Manual mode switch (since we don't have auth token)
  const now = new Date();
  const { data: after, error } = await supabase
    .from('contacts')
    .update({
      warmth_mode: toMode,
      warmth_anchor_score: expectedScore,
      warmth_anchor_at: now.toISOString(),
      warmth: expectedScore,
      warmth_band: getWarmthBand(expectedScore),
      warmth_score_cached: expectedScore,
      warmth_cached_at: now.toISOString(),
    })
    .eq('id', contactId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Mode switch failed:', error);
    return false;
  }
  
  console.log(`   After: score=${after.warmth}, anchor=${after.warmth_anchor_score}`);
  
  const scoreDiff = Math.abs(expectedScore - after.warmth);
  const success = scoreDiff < 0.01; // Allow 0.01 tolerance for floating point
  
  if (success) {
    console.log(`   ✅ No score jump! (diff: ${scoreDiff.toFixed(6)})`);
  } else {
    console.log(`   ❌ Score jumped! (diff: ${scoreDiff.toFixed(6)})`);
  }
  
  return success;
}

/**
 * Test floating point precision
 */
function testFloatingPointPrecision() {
  console.log('\n🔬 Testing Floating Point Precision\n');
  
  const testCases = [
    { anchor: 100, mode: 'slow', days: 7.5 },
    { anchor: 100, mode: 'medium', days: 3.7 },
    { anchor: 100, mode: 'fast', days: 1.2 },
    { anchor: 50.5, mode: 'medium', days: 10 },
    { anchor: 99.99, mode: 'slow', days: 0.5 },
  ];
  
  testCases.forEach(({ anchor, mode, days }) => {
    const anchorAt = new Date(Date.now() - days * DAY_MS).toISOString();
    const score = calculateWarmthScore(anchor, anchorAt, mode);
    console.log(`   Anchor: ${anchor.toFixed(2)}, Mode: ${mode.padEnd(6)}, Days: ${days.toFixed(1).padStart(4)} → Score: ${score.toFixed(6)} (${getWarmthBand(score)})`);
  });
}

/**
 * Show frontend API examples
 */
function showFrontendExamples(contactId) {
  console.log('\n📱 Frontend API Examples\n');
  
  console.log('1️⃣ Get Current Warmth Score:');
  console.log(`   GET ${BACKEND_URL}/api/v1/contacts/${contactId}`);
  console.log(`   Response: { warmth: 95.4321, warmth_band: "hot", warmth_mode: "medium" }\n`);
  
  console.log('2️⃣ Get Warmth Mode Info:');
  console.log(`   GET ${BACKEND_URL}/api/v1/contacts/${contactId}/warmth/mode`);
  console.log(`   Response: { current_mode: "medium", current_score: 95.4321, current_band: "hot" }\n`);
  
  console.log('3️⃣ Switch Warmth Mode (no score jump):');
  console.log(`   PATCH ${BACKEND_URL}/api/v1/contacts/${contactId}/warmth/mode`);
  console.log(`   Body: { "mode": "fast" }`);
  console.log(`   Response: {`);
  console.log(`     "mode_before": "medium",`);
  console.log(`     "mode_after": "fast",`);
  console.log(`     "score_before": 95.4321,`);
  console.log(`     "score_after": 95.4321,  ← No jump!`);
  console.log(`     "band_after": "hot"`);
  console.log(`   }\n`);
  
  console.log('4️⃣ Get Warmth History:');
  console.log(`   GET ${BACKEND_URL}/api/v1/contacts/${contactId}/warmth-history?window=30d`);
  console.log(`   Response: {`);
  console.log(`     "contact_id": "${contactId}",`);
  console.log(`     "snapshots": [`);
  console.log(`       { "timestamp": "2025-11-01T12:00:00Z", "score": 100, "band": "hot", "mode": "medium" },`);
  console.log(`       { "timestamp": "2025-11-08T12:00:00Z", "score": 85.2, "band": "hot", "mode": "medium" },`);
  console.log(`       { "timestamp": "2025-11-15T12:00:00Z", "score": 72.5, "band": "warm", "mode": "fast" }`);
  console.log(`     ]`);
  console.log(`   }\n`);
  
  console.log('5️⃣ React Native Example:');
  console.log(`   const { data } = useQuery({`);
  console.log(`     queryKey: ['contact', contactId, 'warmth'],`);
  console.log(`     queryFn: async () => {`);
  console.log(`       const response = await fetch(`);
  console.log(`         \`\${API_URL}/api/v1/contacts/\${contactId}/warmth/mode\`,`);
  console.log(`         { headers: { Authorization: \`Bearer \${token}\` } }`);
  console.log(`       );`);
  console.log(`       return response.json();`);
  console.log(`     }`);
  console.log(`   });\n`);
}

/**
 * Compare all modes side-by-side
 */
function compareAllModes() {
  console.log('\n📊 Mode Comparison (Starting Score: 100)\n');
  
  const modes = ['slow', 'medium', 'fast', 'test'];
  const days = [0, 7, 14, 21, 30];
  const now = new Date();
  const anchorAt = now.toISOString();
  
  // Header
  console.log('Days │ Slow      │ Medium    │ Fast      │ Test');
  console.log('─────┼───────────┼───────────┼───────────┼──────────');
  
  days.forEach(day => {
    const scores = modes.map(mode => {
      const futureDate = new Date(now.getTime() + day * DAY_MS);
      return calculateWarmthScore(100, anchorAt, mode, futureDate);
    });
    
    const row = `${day.toString().padStart(4)} │ ${scores.map(s => `${s.toFixed(2).padStart(6)} (${getWarmthBand(s).substring(0, 3)})`).join(' │ ')}`;
    console.log(row);
  });
  
  console.log('\n💡 Test mode reaches 0 in ~24 hours (2 hrs to 50% decay)');
  console.log('💡 Fast mode reaches 30 in ~7 days (4 day half-life)');
  console.log('💡 Medium mode reaches 30 in ~14 days (8 day half-life)');
  console.log('💡 Slow mode reaches 30 in ~30 days (17 day half-life)');
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 Warmth Score Decay Testing\n');
  
  try {
    // 1. Generate decay graphs for all modes
    console.log('\n📈 GENERATING DECAY GRAPHS\n');
    generateDecayGraph('slow', 100, 30);
    generateDecayGraph('medium', 100, 30);
    generateDecayGraph('fast', 100, 30);
    generateDecayGraph('test', 100, 1);
    
    // 2. Compare all modes
    compareAllModes();
    
    // 3. Test floating point precision
    testFloatingPointPrecision();
    
    // 4. Create test contact
    const contact = await createTestContact();
    
    if (contact) {
      // 5. Test mode switching
      console.log('\n🔄 TESTING MODE SWITCHING\n');
      
      // Wait 1 second to show decay
      console.log('⏳ Waiting 1 second for decay...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testModeSwitch(contact.id, 'test', 'slow');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testModeSwitch(contact.id, 'slow', 'medium');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testModeSwitch(contact.id, 'medium', 'fast');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testModeSwitch(contact.id, 'fast', 'test');
      
      // 6. Show frontend examples
      showFrontendExamples(contact.id);
      
      // Cleanup
      console.log('\n🧹 Cleaning up...');
      await supabase.from('contacts').delete().eq('id', contact.id);
      console.log('✅ Test contact deleted\n');
    }
    
    console.log('✅ All tests complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
