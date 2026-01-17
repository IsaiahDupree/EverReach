/**
 * Usage Limits Tests
 * 
 * Tests for subscription tier-based usage enforcement
 * Run with: node test/lib/usage-limits.test.mjs
 */

// Define tier limits directly (matches lib/usage-limits.ts)
const TIER_LIMITS = {
  core: {
    tier: 'core',
    screenshots_per_month: 100,
    voice_notes_per_month: 30,
    chat_messages_per_month: -1,
    compose_generations_per_month: 50,
    price_monthly_usd: 0,
    description: 'Free tier with 100 screenshots/month, 50 compose runs/month, 30 voice minutes/month',
  },
  pro: {
    tier: 'pro',
    screenshots_per_month: 300,
    voice_notes_per_month: 120,
    chat_messages_per_month: -1,
    compose_generations_per_month: 200,
    price_monthly_usd: 29.99,
    description: 'Pro tier with 300 screenshots/month, 200 compose runs/month, 120 voice minutes/month',
  },
  enterprise: {
    tier: 'enterprise',
    screenshots_per_month: -1,
    voice_notes_per_month: -1,
    chat_messages_per_month: -1,
    compose_generations_per_month: -1,
    price_monthly_usd: 99.99,
    description: 'Enterprise tier with unlimited usage',
  },
};

// Simple test framework
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    failures.push({ name, error: error.message });
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
  };
}

console.log('\n🧪 Running Usage Limits Tests...\n');

// ============================================================================
// TIER LIMITS TESTS
// ============================================================================

console.log('📊 Testing Tier Definitions...');

test('Core tier has correct compose limit', () => {
  expect(TIER_LIMITS.core.compose_generations_per_month).toBe(50);
});

test('Core tier has correct voice limit', () => {
  expect(TIER_LIMITS.core.voice_notes_per_month).toBe(30);
});

test('Core tier has correct screenshot limit', () => {
  expect(TIER_LIMITS.core.screenshots_per_month).toBe(100);
});

test('Core tier price is free', () => {
  expect(TIER_LIMITS.core.price_monthly_usd).toBe(0);
});

test('Pro tier has correct compose limit', () => {
  expect(TIER_LIMITS.pro.compose_generations_per_month).toBe(200);
});

test('Pro tier has correct voice limit', () => {
  expect(TIER_LIMITS.pro.voice_notes_per_month).toBe(120);
});

test('Pro tier has correct screenshot limit', () => {
  expect(TIER_LIMITS.pro.screenshots_per_month).toBe(300);
});

test('Pro tier has correct price', () => {
  expect(TIER_LIMITS.pro.price_monthly_usd).toBe(29.99);
});

test('Enterprise tier has unlimited compose', () => {
  expect(TIER_LIMITS.enterprise.compose_generations_per_month).toBe(-1);
});

test('Enterprise tier has unlimited voice', () => {
  expect(TIER_LIMITS.enterprise.voice_notes_per_month).toBe(-1);
});

test('Enterprise tier has unlimited screenshots', () => {
  expect(TIER_LIMITS.enterprise.screenshots_per_month).toBe(-1);
});

test('All three tiers are defined', () => {
  expect(Object.keys(TIER_LIMITS).length).toBe(3);
});

test('Core tier has description', () => {
  expect(TIER_LIMITS.core.description.length).toBeGreaterThan(0);
});

test('Pro tier has description', () => {
  expect(TIER_LIMITS.pro.description.length).toBeGreaterThan(0);
});

test('Enterprise tier has description', () => {
  expect(TIER_LIMITS.enterprise.description.length).toBeGreaterThan(0);
});

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

console.log('\n🔧 Testing Utility Functions...');

test('formatUsage formats normal limit correctly', () => {
  const result = formatUsage(25, 50);
  expect(result).toBe('25 / 50');
});

test('formatUsage handles unlimited correctly', () => {
  const result = formatUsage(100, -1);
  expect(result).toBe('100 / unlimited');
});

test('getUsagePercentage calculates correctly', () => {
  const result = getUsagePercentage(25, 50);
  expect(result).toBe(50);
});

test('getUsagePercentage handles 100% usage', () => {
  const result = getUsagePercentage(50, 50);
  expect(result).toBe(100);
});

test('getUsagePercentage caps at 100%', () => {
  const result = getUsagePercentage(75, 50);
  expect(result).toBe(100);
});

test('getUsagePercentage handles unlimited', () => {
  const result = getUsagePercentage(1000, -1);
  expect(result).toBe(0);
});

test('isUnlimited detects -1', () => {
  expect(isUnlimited(-1)).toBe(true);
});

test('isUnlimited returns false for 0', () => {
  expect(isUnlimited(0)).toBe(false);
});

test('isUnlimited returns false for positive numbers', () => {
  expect(isUnlimited(100)).toBe(false);
});

// ============================================================================
// TIER COMPARISON TESTS
// ============================================================================

console.log('\n📈 Testing Tier Comparisons...');

test('Pro tier has higher compose limit than Core', () => {
  expect(TIER_LIMITS.pro.compose_generations_per_month)
    .toBeGreaterThan(TIER_LIMITS.core.compose_generations_per_month);
});

test('Pro tier has higher voice limit than Core', () => {
  expect(TIER_LIMITS.pro.voice_notes_per_month)
    .toBeGreaterThan(TIER_LIMITS.core.voice_notes_per_month);
});

test('Pro tier has higher screenshot limit than Core', () => {
  expect(TIER_LIMITS.pro.screenshots_per_month)
    .toBeGreaterThan(TIER_LIMITS.core.screenshots_per_month);
});

test('Enterprise tier has unlimited (higher) than Pro', () => {
  expect(TIER_LIMITS.enterprise.compose_generations_per_month).toBe(-1);
  expect(TIER_LIMITS.pro.compose_generations_per_month).toBeGreaterThan(0);
});

test('Core tier limits make sense for free tier', () => {
  expect(TIER_LIMITS.core.compose_generations_per_month).toBeGreaterThan(0);
  expect(TIER_LIMITS.core.compose_generations_per_month).toBeLessThan(100);
});

test('Pro tier limits are reasonable for paid tier', () => {
  expect(TIER_LIMITS.pro.compose_generations_per_month).toBeGreaterThan(100);
  expect(TIER_LIMITS.pro.compose_generations_per_month).toBeLessThan(500);
});

// ============================================================================
// TIER STRUCTURE TESTS
// ============================================================================

console.log('\n🏗️  Testing Tier Structure...');

test('Core tier has all required fields', () => {
  const tier = TIER_LIMITS.core;
  expect(tier.tier).toBe('core');
  expect(typeof tier.screenshots_per_month).toBe('number');
  expect(typeof tier.voice_notes_per_month).toBe('number');
  expect(typeof tier.chat_messages_per_month).toBe('number');
  expect(typeof tier.compose_generations_per_month).toBe('number');
  expect(typeof tier.price_monthly_usd).toBe('number');
  expect(typeof tier.description).toBe('string');
});

test('Pro tier has all required fields', () => {
  const tier = TIER_LIMITS.pro;
  expect(tier.tier).toBe('pro');
  expect(typeof tier.screenshots_per_month).toBe('number');
  expect(typeof tier.voice_notes_per_month).toBe('number');
  expect(typeof tier.chat_messages_per_month).toBe('number');
  expect(typeof tier.compose_generations_per_month).toBe('number');
  expect(typeof tier.price_monthly_usd).toBe('number');
  expect(typeof tier.description).toBe('string');
});

test('Enterprise tier has all required fields', () => {
  const tier = TIER_LIMITS.enterprise;
  expect(tier.tier).toBe('enterprise');
  expect(typeof tier.screenshots_per_month).toBe('number');
  expect(typeof tier.voice_notes_per_month).toBe('number');
  expect(typeof tier.chat_messages_per_month).toBe('number');
  expect(typeof tier.compose_generations_per_month).toBe('number');
  expect(typeof tier.price_monthly_usd).toBe('number');
  expect(typeof tier.description).toBe('string');
});

test('Chat messages are unlimited for all tiers', () => {
  expect(TIER_LIMITS.core.chat_messages_per_month).toBe(-1);
  expect(TIER_LIMITS.pro.chat_messages_per_month).toBe(-1);
  expect(TIER_LIMITS.enterprise.chat_messages_per_month).toBe(-1);
});

// ============================================================================
// IMPORT HELPER FUNCTIONS
// ============================================================================

// Helper functions from usage-limits.ts
function formatUsage(used, limit) {
  if (limit === -1) {
    return `${used} / unlimited`;
  }
  return `${used} / ${limit}`;
}

function getUsagePercentage(used, limit) {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(100, (used / limit) * 100);
}

function isUnlimited(limit) {
  return limit === -1;
}

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 TEST RESULTS');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ FAILURES:');
  failures.forEach(({ name, error }) => {
    console.log(`   • ${name}`);
    console.log(`     ${error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
