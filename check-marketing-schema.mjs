/**
 * Check Marketing Intelligence Schema
 * 
 * Verifies that all required tables exist for marketing intelligence features
 * 
 * Usage:
 *   node check-marketing-schema.mjs
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n' + '═'.repeat(70));
console.log('🔍 CHECKING MARKETING INTELLIGENCE SCHEMA');
console.log('═'.repeat(70));
console.log('');

const requiredTables = [
  { name: 'funnel_stage', description: 'Conversion funnel stages' },
  { name: 'persona_bucket', description: 'User persona definitions' },
  { name: 'magnetism_score', description: 'User engagement scores' },
  { name: 'funnel_user_progress', description: 'User funnel progress tracking' },
  { name: 'user_persona', description: 'User persona assignments' },
  { name: 'user_event', description: 'User event tracking (should exist)' },
  { name: 'attribution_data', description: 'Marketing attribution (should exist)' }
];

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      // Check if error is because table doesn't exist
      if (error.message.includes('does not exist') || error.code === 'PGRST116' || error.code === '42P01') {
        return { exists: false, error: error.message };
      }
      return { exists: true, error: error.message };
    }
    
    return { exists: true, error: null };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) return 0;
    return count || 0;
  } catch (error) {
    return 0;
  }
}

async function main() {
  const results = {
    exists: [],
    missing: [],
    errors: []
  };

  for (const table of requiredTables) {
    process.stdout.write(`Checking ${table.name}... `);
    
    const result = await checkTable(table.name);
    
    if (result.exists) {
      const count = await getTableCount(table.name);
      console.log(`✅ EXISTS (${count} rows)`);
      results.exists.push({ ...table, count });
    } else {
      console.log(`❌ MISSING`);
      results.missing.push(table);
    }
    
    if (result.error && result.exists) {
      results.errors.push({ table: table.name, error: result.error });
    }
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('📊 SCHEMA CHECK RESULTS');
  console.log('═'.repeat(70));
  console.log('');
  
  console.log(`✅ Tables Found: ${results.exists.length}/${requiredTables.length}`);
  console.log(`❌ Tables Missing: ${results.missing.length}/${requiredTables.length}`);
  console.log('');

  if (results.exists.length > 0) {
    console.log('✅ EXISTING TABLES:');
    results.exists.forEach(table => {
      console.log(`   - ${table.name}: ${table.count} rows (${table.description})`);
    });
    console.log('');
  }

  if (results.missing.length > 0) {
    console.log('❌ MISSING TABLES:');
    results.missing.forEach(table => {
      console.log(`   - ${table.name}: ${table.description}`);
    });
    console.log('');
    console.log('🔧 ACTION REQUIRED:');
    console.log('   These tables need to be created before seeding data.');
    console.log('   See: create-marketing-schema.sql');
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log('⚠️  ERRORS ENCOUNTERED:');
    results.errors.forEach(err => {
      console.log(`   - ${err.table}: ${err.error}`);
    });
    console.log('');
  }

  // Summary
  console.log('═'.repeat(70));
  if (results.missing.length === 0) {
    console.log('✅ SCHEMA CHECK PASSED');
    console.log('');
    console.log('All required tables exist. You can now run:');
    console.log('  ./run-seed-marketing-data.ps1');
  } else {
    console.log('❌ SCHEMA CHECK FAILED');
    console.log('');
    console.log('Missing tables must be created first. Run:');
    console.log('  1. Review create-marketing-schema.sql');
    console.log('  2. Execute in Supabase SQL Editor');
    console.log('  3. Re-run this check');
  }
  console.log('═'.repeat(70));
  console.log('');

  process.exit(results.missing.length > 0 ? 1 : 0);
}

main();
