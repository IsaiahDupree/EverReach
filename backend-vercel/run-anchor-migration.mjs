#!/usr/bin/env node

/**
 * Run warmth anchor model migration using Supabase Management API
 * Adds warmth_anchor_score and warmth_anchor_at columns to prevent score jumps
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

console.log('⚓ [Migration] Starting Warmth Anchor Model migration...\n');

// Read migration file
const migrationPath = join(__dirname, 'supabase', 'migrations', '20251102_warmth_anchor_model.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('[Migration] Read migration file:', migrationPath);
console.log('[Migration] SQL length:', migrationSQL.length, 'characters\n');

try {
  console.log('[Migration] Executing migration via Supabase API...');
  
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

  console.log('\n📋 [Success] Warmth anchor model migration complete!');
  console.log('\nWhat was added:');
  console.log('  ✅ warmth_anchor_score column (score at anchor time)');
  console.log('  ✅ warmth_anchor_at column (time when anchor was set)');
  console.log('  ✅ warmth_score_from_anchor() SQL function');
  console.log('  ✅ Updated warmth_score_for_mode() to use anchor model');
  console.log('  ✅ Backfilled existing contacts with current scores as anchors');

  console.log('\n🎯 [Behavior Change]:');
  console.log('  ⚡ Mode switching NO LONGER causes score jumps');
  console.log('  ⚡ Score stays same, only future decay rate changes');
  console.log('  ⚡ Preserves C⁰ continuity at switch instant');

  console.log('\n🧪 [Next Steps]:');
  console.log('  1. Redeploy backend: vercel --prod');
  console.log('  2. Run tests: npm run test:warmth:modes:all');
  console.log('  3. Test mode switching - score should NOT jump!');

  console.log('\n📊 [View in Dashboard]:');
  console.log('  https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/editor\n');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('\n[Fallback Options]');
  console.error('\n1. Run manually in Supabase SQL Editor:');
  console.error('   • Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
  console.error('   • Copy contents of: supabase/migrations/20251102_warmth_anchor_model.sql');
  console.error('   • Click "Run"\n');
  process.exit(1);
}
