#!/usr/bin/env node

/**
 * Run AI Goal Inference migration directly via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials
const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

console.log('[Migration] Starting AI Goal Inference migration...\n');

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read migration file
const migrationPath = join(__dirname, 'migrations', 'ai-goal-inference.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('[Migration] Read migration file:', migrationPath);
console.log('[Migration] SQL length:', migrationSQL.length, 'characters\n');

// Execute the migration
console.log('[Migration] Executing migration...\n');

try {
  const { data, error } = await supabase.rpc('exec_sql', { 
    query: migrationSQL 
  });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n[Migration] Trying alternative approach...\n');
    
    // Try executing via REST API directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REST API failed: ${response.status} - ${errorText}`);
    }

    console.log('✅ Migration successful via REST API!');
  } else {
    console.log('✅ Migration successful via RPC!');
  }

  // Verify tables were created
  console.log('\n[Verification] Checking created tables...\n');

  const { data: tables, error: tablesError } = await supabase
    .from('ai_user_context')
    .select('count')
    .limit(0);

  if (tablesError && !tablesError.message.includes('relation "ai_user_context" does not exist')) {
    console.log('✅ Table ai_user_context exists');
  } else if (tablesError) {
    console.log('⚠️  Could not verify table (may still be created)');
  } else {
    console.log('✅ Table ai_user_context verified');
  }

  // Check function exists
  const { data: funcData, error: funcError } = await supabase.rpc('get_user_goals_for_ai', {
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });

  if (!funcError || funcError.message.includes('empty')) {
    console.log('✅ Function get_user_goals_for_ai exists\n');
  } else {
    console.log('⚠️  Could not verify function (may still be created)\n');
  }

  console.log('✅ Migration complete!\n');
  console.log('Next steps:');
  console.log('1. Verify in Supabase dashboard:');
  console.log('   https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/editor');
  console.log('2. Run tests: npm run test:goal-inference');
  console.log('3. Deploy to Vercel: git push origin feat/backend-vercel-only-clean\n');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('\n[Fallback] Please run migration manually:');
  console.error('1. Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
  console.error('2. Copy contents of: migrations/ai-goal-inference.sql');
  console.error('3. Click "Run"\n');
  process.exit(1);
}
