#!/usr/bin/env node

/**
 * Run warmth modes migration using Supabase Management API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';
const DB_PASSWORD = 'everreach123!@#';

console.log('🎯 [Migration] Starting Warmth Modes migration via Management API...\n');

// Read migration file
const migrationPath = join(__dirname, 'supabase', 'migrations', '20251102_warmth_modes.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('[Migration] Read migration file:', migrationPath);
console.log('[Migration] SQL length:', migrationSQL.length, 'characters\n');

try {
  console.log('[Migration] Executing migration via Supabase API...');
  
  // Use Supabase Management API to run migration
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`API error: ${response.status} - ${JSON.stringify(result, null, 2)}`);
  }

  console.log('✅ Migration executed successfully!\n');
  console.log('Result:', JSON.stringify(result, null, 2));

  console.log('\n📋 [Success] Warmth modes migration complete!');
  console.log('\nWhat was added:');
  console.log('  ✅ warmth_mode enum (slow, medium, fast, test)');
  console.log('  ✅ warmth_mode column on contacts table');
  console.log('  ✅ warmth_score_cached column for performance');
  console.log('  ✅ warmth_mode_changes audit table');
  console.log('  ✅ SQL helper functions (warmth_lambda, warmth_score_for_mode, etc.)');
  console.log('  ✅ Automatic warmth_band trigger');
  console.log('  ✅ RLS policies for security');

  console.log('\n🧪 [Next Steps] Run tests to verify:');
  console.log('  npm run test:warmth:modes:all');

  console.log('\n📊 [View in Dashboard]:');
  console.log('  https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/editor');

  console.log('\n🚀 [Deployment Status]:');
  console.log('  Backend deployed via Vercel CLI');
  console.log('  Production URL: https://backend-vercel-76xjmfkh3-isaiahduprees-projects.vercel.app\n');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('\n[Fallback Options]');
  console.error('\n1. Run manually in Supabase SQL Editor:');
  console.error('   • Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
  console.error('   • Copy contents of: supabase/migrations/20251102_warmth_modes.sql');
  console.error('   • Click "Run"');
  console.error('\n2. Run via direct connection:');
  console.error('   • psql "postgresql://postgres:' + DB_PASSWORD + '@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres"');
  console.error('   • Then: \\i supabase/migrations/20251102_warmth_modes.sql\n');
  process.exit(1);
}
