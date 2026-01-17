#!/usr/bin/env node

/**
 * Verify Personal Profile Schema
 * Connects directly to Supabase to verify all schema elements
 */

import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.utasetfxiqcrnwyfforx:everreach123!@#@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const checks = [
  { name: 'compose_settings table', query: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compose_settings')` },
  { name: 'persona_notes table', query: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='persona_notes')` },
  { name: 'persona_notes.linked_contacts column', query: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='persona_notes' AND column_name='linked_contacts')` },
  { name: 'profiles.display_name column', query: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name')` },
  { name: 'profiles.preferences column', query: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='preferences')` },
  { name: 'idx_persona_notes_contacts index', query: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_contacts')` },
  { name: 'idx_persona_notes_user index', query: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_user')` },
  { name: 'idx_persona_notes_type index', query: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_type')` },
  { name: 'idx_persona_notes_tags index', query: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_tags')` },
  { name: 'idx_persona_notes_created index', query: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_created')` },
];

async function main() {
  const client = new Client({ connectionString });
  
  try {
    console.log('========================================');
    console.log('Personal Profile Schema Verification');
    console.log('========================================\n');
    
    await client.connect();
    console.log('✅ Connected to database\n');
    
    const results = [];
    
    for (const check of checks) {
      try {
        const result = await client.query(check.query);
        const exists = result.rows[0].exists;
        results.push({ name: check.name, exists });
        
        console.log(`${exists ? '✅' : '❌'} ${check.name}`);
      } catch (error) {
        console.log(`❌ ${check.name} (error: ${error.message})`);
        results.push({ name: check.name, exists: false });
      }
    }
    
    const failures = results.filter(r => !r.exists);
    
    console.log('\n========================================');
    if (failures.length === 0) {
      console.log('✅ All Checks Passed!');
      console.log('========================================\n');
      console.log('Schema is complete and ready to use.\n');
    } else {
      console.log(`⚠️  ${failures.length} Checks Failed`);
      console.log('========================================\n');
      console.log('Missing items:');
      failures.forEach(f => console.log(`  - ${f.name}`));
      console.log('\nRun: .\\scripts\\migrate-and-verify.ps1\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
