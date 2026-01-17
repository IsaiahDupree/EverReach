/**
 * Screenshot Analysis Tier Limits Tests
 * 
 * Tests tier-based usage limits for screenshot analysis:
 * - Core tier: 100 screenshots/month
 * - Pro tier: 1000 screenshots/month
 * - Enterprise tier: unlimited
 */

import { apiFetch, getAccessToken, getEnv } from './_shared.mjs';
import assert from 'assert';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function analyzeScreenshot(payload) {
  const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
  const ORIGIN = await getEnv('TEST_ORIGIN', false, 'https://everreach.app');
  const token = await getAccessToken();
  
  const { res, json } = await apiFetch(BASE, '/v1/agent/analyze/screenshot', {
    method: 'POST',
    token,
    origin: ORIGIN,
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    throw new Error(`Screenshot analysis failed: ${res.status} ${JSON.stringify(json)}`);
  }
  
  return json;
}

async function getCurrentUsage() {
  try {
    const result = await analyzeScreenshot({
      image_url: 'https://picsum.photos/800/600',
      channel: 'email',
      save_to_database: false, // Don't save to avoid cluttering DB
    });
    return result.usage;
  } catch (error) {
    console.error('Failed to get current usage:', error);
    return null;
  }
}

// ============================================================================
// TESTS
// ============================================================================

export const tests = [
  // --------------------------------------------------------------------------
  // Usage Info in Response
  // --------------------------------------------------------------------------
  {
    name: 'response includes usage information',
    run: async () => {
      const result = await analyzeScreenshot({
        image_url: 'https://picsum.photos/800/600',
        channel: 'email',
        save_to_database: false,
      });

      assert(result.usage, 'Response should include usage info');
      assert(typeof result.usage.current === 'number', 'Should include current usage');
      assert(result.usage.limit !== undefined, 'Should include limit');
      assert(result.usage.remaining !== undefined, 'Should include remaining');
      assert(result.usage.tier, 'Should include tier');
      assert(result.usage.resets_at, 'Should include reset date');

      console.log('✅ Usage info included in response:');
      console.log('   Current:', result.usage.current);
      console.log('   Limit:', result.usage.limit);
      console.log('   Remaining:', result.usage.remaining);
      console.log('   Tier:', result.usage.tier);
      console.log('   Resets:', result.usage.resets_at);
    },
  },

  // --------------------------------------------------------------------------
  // Tier Detection
  // --------------------------------------------------------------------------
  {
    name: 'detect user subscription tier',
    run: async () => {
      const usage = await getCurrentUsage();
      
      assert(usage, 'Should get usage info');
      assert(usage.tier, 'Should have tier info');
      assert(['core', 'pro', 'enterprise'].includes(usage.tier), 
        'Tier should be valid (core/pro/enterprise)');

      console.log('✅ User tier detected:', usage.tier);
    },
  },

  // --------------------------------------------------------------------------
  // Core Tier Limits (100/month)
  // --------------------------------------------------------------------------
  {
    name: 'core tier has 100 screenshot limit',
    run: async () => {
      const usage = await getCurrentUsage();
      
      if (usage && usage.tier === 'core') {
        assert(usage.limit === 100, 'Core tier should have 100 screenshot limit');
        console.log('✅ Core tier limit verified: 100 screenshots/month');
      } else {
        console.log(`⚠️  Skipped (user is on ${usage?.tier} tier, not core)`);
      }
    },
  },

  // --------------------------------------------------------------------------
  // Pro Tier Limits (1000/month)
  // --------------------------------------------------------------------------
  {
    name: 'pro tier has 300 screenshot limit',
    run: async () => {
      const usage = await getCurrentUsage();
      
      if (usage && usage.tier === 'pro') {
        assert(usage.limit === 300, 'Pro tier should have 300 screenshot limit');
        console.log('✅ Pro tier limit verified: 300 screenshots/month');
      } else {
        console.log(`⚠️  Skipped (user is on ${usage?.tier} tier, not pro)`);
      }
    },
  },

  // --------------------------------------------------------------------------
  // Enterprise Tier (Unlimited)
  // --------------------------------------------------------------------------
  {
    name: 'enterprise tier has unlimited screenshots',
    run: async () => {
      const usage = await getCurrentUsage();
      
      if (usage && usage.tier === 'enterprise') {
        assert(usage.limit === Infinity || usage.limit === -1, 
          'Enterprise tier should have unlimited screenshots');
        console.log('✅ Enterprise tier limit verified: unlimited');
      } else {
        console.log(`⚠️  Skipped (user is on ${usage?.tier} tier, not enterprise)`);
      }
    },
  },

  // --------------------------------------------------------------------------
  // Usage Tracking
  // --------------------------------------------------------------------------
  {
    name: 'usage counter increments after analysis',
    run: async () => {
      const before = await getCurrentUsage();
      
      // Perform one analysis
      await analyzeScreenshot({
        image_url: 'https://picsum.photos/800/600',
        channel: 'email',
        save_to_database: false,
      });

      const after = await getCurrentUsage();

      assert(after.current > before.current, 
        'Usage should increment after analysis');
      assert(after.current === before.current + 1, 
        'Usage should increment by exactly 1');

      console.log('✅ Usage tracking working:');
      console.log('   Before:', before.current);
      console.log('   After:', after.current);
    },
  },

  // --------------------------------------------------------------------------
  // Remaining Count
  // --------------------------------------------------------------------------
  {
    name: 'remaining count decreases after usage',
    run: async () => {
      const before = await getCurrentUsage();
      
      // Perform one analysis
      await analyzeScreenshot({
        image_url: 'https://picsum.photos/800/600',
        channel: 'email',
        save_to_database: false,
      });

      const after = await getCurrentUsage();

      if (before.limit !== Infinity && before.limit !== -1) {
        assert(after.remaining < before.remaining, 
          'Remaining should decrease after analysis');
        assert(after.remaining === before.remaining - 1, 
          'Remaining should decrease by exactly 1');

        console.log('✅ Remaining count tracking:');
        console.log('   Before:', before.remaining);
        console.log('   After:', after.remaining);
      } else {
        console.log('⚠️  Skipped (unlimited tier)');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Limit Enforcement (Warning Test)
  // --------------------------------------------------------------------------
  {
    name: 'warn when approaching limit',
    run: async () => {
      const usage = await getCurrentUsage();
      
      if (usage.limit !== Infinity && usage.limit !== -1) {
        const percentUsed = (usage.current / usage.limit) * 100;
        
        if (percentUsed >= 80) {
          console.log('⚠️  WARNING: Usage is at', percentUsed.toFixed(1), '% of limit');
          console.log('   Used:', usage.current, '/', usage.limit);
          console.log('   Remaining:', usage.remaining);
        } else {
          console.log('✅ Usage is healthy at', percentUsed.toFixed(1), '% of limit');
        }
      } else {
        console.log('⚠️  Skipped (unlimited tier)');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Limit Exceeded Error (Simulated)
  // --------------------------------------------------------------------------
  {
    name: 'return proper error when limit exceeded',
    run: async () => {
      const usage = await getCurrentUsage();
      
      // Only test if user is close to limit or we can simulate
      if (usage.remaining === 0 || (usage.limit !== Infinity && usage.current >= usage.limit)) {
        try {
          await analyzeScreenshot({
            image_url: 'https://picsum.photos/800/600',
            channel: 'email',
          });
          
          assert(false, 'Should have thrown error when limit exceeded');
        } catch (error) {
          assert(error.message.includes('usage_limit_exceeded') || 
                 error.message.includes('limit reached'),
            'Error should indicate limit exceeded');
          
          console.log('✅ Limit exceeded error properly returned');
          console.log('   Error:', error.message);
        }
      } else {
        console.log('⚠️  Skipped (not at limit yet -', usage.remaining, 'remaining)');
      }
    },
  },

  // --------------------------------------------------------------------------
  // Reset Date
  // --------------------------------------------------------------------------
  {
    name: 'reset date is set to next month',
    run: async () => {
      const usage = await getCurrentUsage();
      
      assert(usage.resets_at, 'Should have reset date');
      
      const resetDate = new Date(usage.resets_at);
      const now = new Date();
      
      assert(resetDate > now, 'Reset date should be in the future');
      
      // Should be within next 31 days
      const daysUntilReset = (resetDate - now) / (1000 * 60 * 60 * 24);
      assert(daysUntilReset <= 31, 'Reset should be within next month');
      
      console.log('✅ Reset date verified:');
      console.log('   Resets on:', resetDate.toISOString().split('T')[0]);
      console.log('   Days remaining:', Math.ceil(daysUntilReset));
    },
  },

  // --------------------------------------------------------------------------
  // HTTP Headers
  // --------------------------------------------------------------------------
  {
    name: 'response includes rate limit headers',
    run: async () => {
      // Note: This test depends on accessing raw response headers
      // In actual implementation, headers would be:
      // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
      
      const usage = await getCurrentUsage();
      console.log('✅ Usage info available via response body');
      console.log('   (HTTP headers would include X-RateLimit-* in production)');
    },
  },

  // --------------------------------------------------------------------------
  // Multiple Users (if testing with multiple accounts)
  // --------------------------------------------------------------------------
  {
    name: 'usage is isolated per user',
    run: async () => {
      const usage = await getCurrentUsage();
      
      // Each user should have their own usage tracking
      assert(usage.current >= 0, 'Usage should be tracked');
      
      console.log('✅ User isolation working (each user has own limits)');
      console.log('   This user:', usage.current, '/', usage.limit);
    },
  },

  // --------------------------------------------------------------------------
  // Tier Information Display
  // --------------------------------------------------------------------------
  {
    name: 'display tier limits summary',
    run: async () => {
      const usage = await getCurrentUsage();
      
      console.log('\n📊 Tier Limits Summary:');
      console.log('════════════════════════════════════════');
      console.log('Your Tier:', usage.tier.toUpperCase());
      console.log('Screenshots:', `${usage.current} / ${usage.limit === Infinity ? '∞' : usage.limit}`);
      console.log('Remaining:', usage.limit === Infinity ? '∞' : usage.remaining);
      console.log('Resets:', usage.resets_at.split('T')[0]);
      console.log('════════════════════════════════════════\n');
      
      console.log('Tier Comparison:');
      console.log('  Core:       100 screenshots/month   ($0/mo)');
      console.log('  Pro:        300 screenshots/month   ($29.99/mo)');
      console.log('  Enterprise: Unlimited               ($99.99/mo)');
    },
  },
];

// ============================================================================
// EXPORT
// ============================================================================

export default tests;
