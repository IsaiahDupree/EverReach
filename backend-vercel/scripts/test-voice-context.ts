/**
 * Voice Context Testing Script
 * 
 * This script tests if voice context affects message generation by:
 * 1. Generating a message WITHOUT voice context
 * 2. Generating a message WITH different voice contexts
 * 3. Comparing the results to show the difference
 * 
 * Run with: npx tsx scripts/test-voice-context.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestCase {
  name: string;
  voiceContext?: string;
  expectedStyle: string;
}

const testCases: TestCase[] = [
  {
    name: 'Baseline (No Voice Context)',
    voiceContext: undefined,
    expectedStyle: 'Default professional tone'
  },
  {
    name: 'Gen Z Casual',
    voiceContext: 'Gen Z casual with tech startup vibes - use contemporary slang, keep it real and friendly',
    expectedStyle: 'Casual, modern slang, emojis possible'
  },
  {
    name: 'Professional Fintech',
    voiceContext: 'Professional fintech executive - data-driven, concise, businesslike but friendly',
    expectedStyle: 'Short, precise, business-focused'
  },
  {
    name: 'Southern Charm',
    voiceContext: 'Southern US style - warm, friendly, use regional phrases like "y\'all", genuine hospitality',
    expectedStyle: 'Warm, regional dialect, hospitable'
  },
  {
    name: 'Arizona Local',
    voiceContext: 'Arizona native - casual desert state pride, mention heat/weather, southwest vibe',
    expectedStyle: 'Regional references, casual'
  },
  {
    name: 'Direct NYC',
    voiceContext: 'New York City direct - fast-paced, no fluff, get to the point quickly',
    expectedStyle: 'Very brief, direct, efficient'
  }
];

async function testVoiceContext() {
  console.log('\n🧪 VOICE CONTEXT MESSAGE GENERATION TEST\n');
  console.log('=' .repeat(70));
  console.log('Testing how voice context affects AI message generation');
  console.log('=' .repeat(70) + '\n');

  const testPurpose = 'follow up about our meeting last week and schedule a call';
  const testContext = 'We discussed the Q4 marketing strategy and they seemed interested';
  const recipient = { name: 'Sarah', email: 'sarah@example.com' };

  const results: Array<{ testCase: TestCase; message: string; error?: string }> = [];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`   Voice Context: ${testCase.voiceContext || '(none)'}`);
    console.log(`   Expected Style: ${testCase.expectedStyle}`);
    console.log('   ' + '-'.repeat(65));

    try {
      const requestBody = {
        purpose: testPurpose,
        context: testContext,
        to: recipient,
        tone: 'friendly',
        ...(testCase.voiceContext && { voiceContext: testCase.voiceContext })
      };

      const response = await fetch(`${API_URL}/api/messages/craft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`   ❌ Error: ${response.status} - ${error}\n`);
        results.push({ testCase, message: '', error: `${response.status}: ${error}` });
        continue;
      }

      const data = await response.json();
      const message = data.message || data;
      
      console.log(`   ✅ Generated Message:\n`);
      console.log('   ' + message.split('\n').join('\n   '));
      console.log('');

      results.push({ testCase, message });
    } catch (error) {
      console.log(`   ❌ Failed: ${error}\n`);
      results.push({ testCase, message: '', error: String(error) });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70) + '\n');

  const successCount = results.filter(r => !r.error).length;
  const failCount = results.filter(r => r.error).length;

  console.log(`✅ Successful: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failCount}/${testCases.length}\n`);

  // Analysis
  console.log('🔍 VOICE CONTEXT IMPACT ANALYSIS\n');
  
  const baseline = results[0];
  if (baseline && !baseline.error) {
    console.log('Baseline message (no voice context):');
    console.log(baseline.message.substring(0, 150) + '...\n');

    results.slice(1).forEach((result, idx) => {
      if (!result.error) {
        const lengthDiff = result.message.length - baseline.message.length;
        const lengthChange = lengthDiff > 0 ? `+${lengthDiff}` : `${lengthDiff}`;
        
        console.log(`${testCases[idx + 1].name}:`);
        console.log(`  - Length change: ${lengthChange} characters`);
        console.log(`  - Preview: ${result.message.substring(0, 100)}...`);
        console.log('');
      }
    });
  }

  // Observations
  console.log('💡 OBSERVATIONS:\n');
  console.log('1. Compare tone and language style across different voice contexts');
  console.log('2. Check if regional phrases appear (e.g., "y\'all" for Southern)');
  console.log('3. Notice formality differences (Gen Z vs Professional)');
  console.log('4. Observe message length variations (NYC direct vs others)');
  console.log('5. Look for personality in phrasing that matches voice context\n');

  console.log('='.repeat(70) + '\n');

  return results;
}

// Run tests
testVoiceContext()
  .then(() => {
    console.log('✅ Test completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
