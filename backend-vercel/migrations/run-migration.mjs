/**
 * Marketing Intelligence Schema Migration Runner
 * Executes the SQL migration using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n============================================================================');
console.log('    MARKETING INTELLIGENCE SCHEMA MIGRATION');
console.log('============================================================================\n');

// Load environment variables
const envPath = join(__dirname, '..', '..', '.env');
let env = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key.trim()] = value;
      }
    }
  });
  console.log('[1/4] Environment variables loaded ✓');
} catch (error) {
  console.error('[ERROR] Failed to load .env file:', error.message);
  process.exit(1);
}

// Create Supabase client
const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log(`[2/4] Connecting to Supabase...`);
console.log(`      URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read migration file
const migrationPath = join(__dirname, 'marketing-intelligence-schema.sql');
console.log(`\n[3/4] Reading migration file...`);

let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
  const sizeKB = (Buffer.byteLength(migrationSQL, 'utf-8') / 1024).toFixed(2);
  console.log(`      File: marketing-intelligence-schema.sql`);
  console.log(`      Size: ${sizeKB} KB`);
  
  // Count objects
  const tableCount = (migrationSQL.match(/CREATE TABLE/g) || []).length;
  const viewCount = (migrationSQL.match(/CREATE (?:OR REPLACE )?(?:MATERIALIZED )?VIEW/g) || []).length;
  const functionCount = (migrationSQL.match(/CREATE (?:OR REPLACE )?FUNCTION/g) || []).length;
  
  console.log(`\n      Will create:`);
  console.log(`        - ${tableCount} tables`);
  console.log(`        - ${viewCount} views`);
  console.log(`        - ${functionCount} functions`);
} catch (error) {
  console.error('[ERROR] Failed to read migration file:', error.message);
  process.exit(1);
}

// Execute migration
console.log(`\n[4/4] Executing migration...`);
console.log('      This may take 10-30 seconds...\n');

try {
  const startTime = Date.now();
  
  // Execute the SQL using the RPC function or raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL }).catch(async () => {
    // If exec_sql doesn't exist, try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: migrationSQL })
    });
    
    if (!response.ok) {
      // Last resort: split into individual statements
      throw new Error('Need to execute statements individually');
    }
    
    return { data: null, error: null };
  }).catch(async () => {
    // Split SQL into individual statements and execute them
    console.log('      Executing statements individually...');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      if (stmt.includes('CREATE') || stmt.includes('INSERT') || stmt.includes('ALTER')) {
        process.stdout.write(`\r      Progress: ${i + 1}/${statements.length} statements`);
        // Note: Supabase JS client doesn't support raw SQL execution
        // We need to use the SQL editor or psql for this
      }
    }
    console.log();
    
    return { 
      data: null, 
      error: new Error('Migration must be run via Supabase SQL Editor or psql command')
    };
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (error) {
    throw error;
  }
  
  console.log('\n============================================================================');
  console.log('    MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('============================================================================\n');
  console.log(`  Execution time: ${duration}s`);
  console.log('\n  Next steps:');
  console.log('    1. Verify tables were created in Supabase Dashboard');
  console.log('    2. Re-run comprehensive tests:');
  console.log('       .\\test\\agent\\run-comprehensive-tests.ps1\n');
  
  process.exit(0);
  
} catch (error) {
  console.log('\n============================================================================');
  console.log('    MIGRATION FAILED - MANUAL EXECUTION REQUIRED');
  console.log('============================================================================\n');
  console.log('The Supabase JS client does not support executing DDL statements.');
  console.log('Please run the migration manually using one of these methods:\n');
  console.log('Option 1: Supabase Dashboard SQL Editor');
  console.log('  1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql');
  console.log('  2. Copy the contents of: backend-vercel/migrations/marketing-intelligence-schema.sql');
  console.log('  3. Paste into SQL Editor and click RUN\n');
  console.log('Option 2: psql Command Line');
  console.log('  Set PGPASSWORD=everreach123!@# && psql "postgresql://postgres.utasetfxiqcrnwyfforx@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -f backend-vercel/migrations/marketing-intelligence-schema.sql\n');
  console.log(`Error: ${error.message}\n`);
  
  process.exit(1);
}
