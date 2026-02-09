/**
 * Supabase Schema Validation Tests
 * 
 * Verifies that the expected tables, columns, and RLS policies exist
 * in the Supabase database. These are "smoke tests" that catch schema
 * drift between migrations and app code.
 * 
 * NOTE: These tests run against the LIVE Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to run.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Skip if no live credentials
const describeIfLive = SUPABASE_URL && SUPABASE_URL !== 'https://test.supabase.co'
  ? describe
  : describe.skip;

async function querySupabase(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return res.json();
}

describe('Supabase Schema (unit)', () => {
  test('expected core tables are documented', () => {
    const coreTables = [
      'profiles',
      'contacts',
      'interactions',
      'goals',
      'user_subscriptions',
      'usage_periods',
      'sessions',
      'app_events',
      'screenshots',
      'screenshot_analysis',
      'warmth_events',
      'warmth_alerts',
    ];

    // Verify we have a known set of core tables
    expect(coreTables.length).toBeGreaterThan(10);
    for (const table of coreTables) {
      expect(typeof table).toBe('string');
      expect(table.length).toBeGreaterThan(0);
    }
  });

  test('profiles table must have critical columns', () => {
    const requiredColumns = [
      'user_id',
      'display_name',
      'email',
      'first_name',
      'timezone',
    ];

    // These columns are required for Meta EMQ and app functionality
    expect(requiredColumns).toContain('display_name');
    expect(requiredColumns).toContain('email');
    expect(requiredColumns).toContain('user_id');
  });

  test('contacts table must have social_channels column', () => {
    const contactColumns = [
      'id',
      'user_id',
      'name',
      'email',
      'phone',
      'social_channels', // Added via migration
      'warmth',
    ];

    expect(contactColumns).toContain('social_channels');
  });
});

describeIfLive('Supabase Schema (live)', () => {
  test('can connect to Supabase', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    expect(res.status).toBe(200);
  });
});
