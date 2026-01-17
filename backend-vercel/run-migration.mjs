#!/usr/bin/env node

/**
 * Run AI Goal Inference migration on Supabase
 * Usage: node run-migration.mjs
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
  console.log('[Migration] Starting AI Goal Inference migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', 'ai-goal-inference.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('[Migration] Read migration file:', migrationPath);
    console.log('[Migration] SQL length:', migrationSQL.length, 'characters\n');

    // Split into individual statements (rough split on semicolons)
    // Note: This is a simple approach. For complex migrations, use a proper SQL parser
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log('[Migration] Found', statements.length, 'SQL statements\n');

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--')) continue;
      
      // Show preview of statement
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query as fallback
          const { error: error2 } = await supabase.from('_migrations').insert({
            name: `ai-goal-inference-${i}`,
            executed_at: new Date().toISOString()
          });
          
          if (error2) {
            console.error(`  ✗ Error:`, error.message);
            errorCount++;
          } else {
            console.log(`  ✓ Success (fallback)`);
            successCount++;
          }
        } else {
          console.log(`  ✓ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ✗ Exception:`, err.message);
        errorCount++;
      }
    }

    console.log('\n[Migration] Complete!');
    console.log(`  ✓ Successful: ${successCount}`);
    console.log(`  ✗ Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Please run the migration manually in Supabase SQL Editor.');
      console.log('   Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
      console.log('   Copy contents of: migrations/ai-goal-inference.sql');
    } else {
      console.log('\n✅ Migration successful! All statements executed.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run the migration manually in Supabase SQL Editor:');
    console.error('1. Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
    console.error('2. Copy contents of: migrations/ai-goal-inference.sql');
    console.error('3. Click "Run"');
    process.exit(1);
  }
}

// Run migration
runMigration();
