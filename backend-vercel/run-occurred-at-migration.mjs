#!/usr/bin/env node

/**
 * Run interactions occurred_at migration on Supabase
 * Usage: node run-occurred-at-migration.mjs
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

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 [Migration] Starting interactions occurred_at migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251014025000_fix_interactions_occurred_at.sql');
    console.log('[Migration] Reading:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('[Migration] SQL loaded:', migrationSQL.length, 'characters\n');

    // Execute the full migration as a single transaction
    console.log('[Migration] Executing SQL...\n');
    
    const { data, error } = await supabase.rpc('exec', {
      query: migrationSQL
    });

    if (error) {
      console.log('⚠️  RPC method not available, trying direct execution...\n');
      
      // Fallback: Execute via SQL editor approach
      // Split and execute statements individually
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

      console.log(`[Migration] Executing ${statements.length} statements...\n`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
        
        console.log(`[${i + 1}/${statements.length}] ${preview}...`);

        // Skip DO blocks and comments
        if (stmt.includes('DO $$')) {
          console.log('  ⊙ Skipping DO block (needs manual execution)');
          continue;
        }

        try {
          // Execute via raw SQL
          const { error: execError } = await supabase.from('_migrations').select('*').limit(0); // Dummy query
          
          // Since we can't execute raw SQL via JS client easily, we'll provide instructions
          console.log('  ⊙ Needs manual execution in SQL Editor');
        } catch (err) {
          console.log('  ⊙ Queued for manual execution');
        }
      }

      console.log('\n⚠️  Migration requires manual execution in Supabase SQL Editor\n');
      console.log('📋 Instructions:');
      console.log('1. Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
      console.log('2. Copy the entire contents of:');
      console.log('   supabase/migrations/20251014025000_fix_interactions_occurred_at.sql');
      console.log('3. Paste into SQL Editor');
      console.log('4. Click "Run"\n');
      
      console.log('✅ The migration will:');
      console.log('   • Update NULL occurred_at values to created_at');
      console.log('   • Set default value for new interactions');
      console.log('   • Create performance indexes');
      console.log('   • Verify all changes\n');

      return;
    }

    console.log('✅ [Migration] Successfully executed!\n');
    console.log('[Migration] Changes:');
    console.log('  ✓ Backfilled NULL occurred_at values');
    console.log('  ✓ Set default value for new interactions');
    console.log('  ✓ Created performance indexes');
    console.log('  ✓ Added column documentation\n');

  } catch (error) {
    console.error('\n❌ [Migration] Failed:', error.message);
    console.error('\n📋 Manual execution required:');
    console.error('1. Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
    console.error('2. Copy contents of: supabase/migrations/20251014025000_fix_interactions_occurred_at.sql');
    console.error('3. Click "Run"\n');
    process.exit(1);
  }
}

// Verification function
async function verifyMigration() {
  console.log('🔍 [Verification] Checking migration results...\n');

  try {
    // Check for NULL values
    const { count: nullCount, error: nullError } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .is('occurred_at', null);

    if (nullError) {
      console.log('⚠️  Could not verify NULL count:', nullError.message);
    } else {
      console.log(`  NULL occurred_at values: ${nullCount || 0}`);
      if ((nullCount || 0) === 0) {
        console.log('  ✅ All interactions have occurred_at values!\n');
      } else {
        console.log(`  ⚠️  ${nullCount} interactions still have NULL occurred_at\n`);
      }
    }

    // Check total interactions
    const { count: totalCount, error: totalError } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true });

    if (!totalError) {
      console.log(`  Total interactions: ${totalCount || 0}\n`);
    }

    // Sample query to check dates
    const { data: sampleData, error: sampleError } = await supabase
      .from('interactions')
      .select('id, occurred_at, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!sampleError && sampleData) {
      console.log('  Sample interactions:');
      sampleData.forEach((row, i) => {
        const occurred = row.occurred_at ? new Date(row.occurred_at).toISOString() : 'NULL';
        const created = new Date(row.created_at).toISOString();
        console.log(`    ${i + 1}. occurred_at: ${occurred.substring(0, 19)}`);
      });
      console.log('');
    }

    console.log('✅ [Verification] Complete!\n');

  } catch (error) {
    console.error('⚠️  [Verification] Error:', error.message, '\n');
  }
}

// Run migration and verification
(async () => {
  await runMigration();
  await verifyMigration();
  
  console.log('🔒 SECURITY REMINDER:');
  console.log('   Please rotate your Supabase service key after this migration!');
  console.log('   Settings → API → Service Role Key → Reset\n');
})();
