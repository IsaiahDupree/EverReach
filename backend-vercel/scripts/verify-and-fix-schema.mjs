#!/usr/bin/env node

/**
 * Verify and Fix Personal Profile Schema
 * Uses Supabase Management API to check and repair schema
 */

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database`;

async function executeSQL(sql) {
  const response = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`SQL execution failed: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

async function checkTableExists(tableName) {
  const sql = `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = '${tableName}'
    ) as exists;
  `;
  
  const result = await executeSQL(sql);
  return result.result?.[0]?.exists || false;
}

async function checkColumnExists(tableName, columnName) {
  const sql = `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = '${tableName}' 
        AND column_name = '${columnName}'
    ) as exists;
  `;
  
  const result = await executeSQL(sql);
  return result.result?.[0]?.exists || false;
}

async function checkIndexExists(indexName) {
  const sql = `
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname = '${indexName}'
    ) as exists;
  `;
  
  const result = await executeSQL(sql);
  return result.result?.[0]?.exists || false;
}

async function addMissingColumn() {
  console.log('  → Adding linked_contacts column...');
  
  const sql = `
    ALTER TABLE persona_notes 
    ADD COLUMN IF NOT EXISTS linked_contacts UUID[];
  `;
  
  await executeSQL(sql);
  console.log('  ✅ Column added');
}

async function createMissingIndex() {
  console.log('  → Creating GIN index on linked_contacts...');
  
  const sql = `
    CREATE INDEX IF NOT EXISTS idx_persona_notes_contacts 
    ON persona_notes USING GIN(linked_contacts);
  `;
  
  await executeSQL(sql);
  console.log('  ✅ Index created');
}

async function verifySchema() {
  console.log('\n📋 Schema Verification\n');
  
  const checks = [
    { name: 'compose_settings table', check: () => checkTableExists('compose_settings') },
    { name: 'persona_notes table', check: () => checkTableExists('persona_notes') },
    { name: 'profiles.display_name column', check: () => checkColumnExists('profiles', 'display_name') },
    { name: 'profiles.preferences column', check: () => checkColumnExists('profiles', 'preferences') },
    { name: 'persona_notes.linked_contacts column', check: () => checkColumnExists('persona_notes', 'linked_contacts') },
    { name: 'idx_persona_notes_contacts index', check: () => checkIndexExists('idx_persona_notes_contacts') },
    { name: 'idx_persona_notes_user index', check: () => checkIndexExists('idx_persona_notes_user') },
    { name: 'idx_persona_notes_type index', check: () => checkIndexExists('idx_persona_notes_type') },
    { name: 'idx_persona_notes_tags index', check: () => checkIndexExists('idx_persona_notes_tags') },
    { name: 'idx_persona_notes_created index', check: () => checkIndexExists('idx_persona_notes_created') },
  ];

  const results = [];
  for (const { name, check } of checks) {
    const exists = await check();
    results.push({ name, exists });
    console.log(`${exists ? '✅' : '❌'} ${name}`);
  }

  return results;
}

async function main() {
  try {
    console.log('========================================');
    console.log('Personal Profile Schema Verification');
    console.log('========================================\n');
    console.log(`Project: ${PROJECT_REF}\n`);

    // Initial verification
    const initialResults = await verifySchema();
    const failures = initialResults.filter(r => !r.exists);

    if (failures.length === 0) {
      console.log('\n✅ All schema checks passed!');
      console.log('\nMigration is complete and verified.');
      return;
    }

    console.log(`\n⚠️  Found ${failures.length} missing items. Attempting repair...\n`);

    // Fix missing items
    const needsColumn = !await checkColumnExists('persona_notes', 'linked_contacts');
    const needsIndex = !await checkIndexExists('idx_persona_notes_contacts');

    if (needsColumn) {
      await addMissingColumn();
    }

    if (needsIndex) {
      await createMissingIndex();
    }

    // Re-verify
    console.log('\n📋 Re-verification after repair\n');
    const finalResults = await verifySchema();
    const stillFailing = finalResults.filter(r => !r.exists);

    if (stillFailing.length === 0) {
      console.log('\n✅ All schema checks passed!');
      console.log('\n========================================');
      console.log('✅ Schema Repair Complete!');
      console.log('========================================\n');
      console.log('Next steps:');
      console.log('  1. Run smoke tests: node test/profile-smoke.mjs');
      console.log('  2. Test endpoints in your app\n');
    } else {
      console.log('\n❌ Some checks still failing:');
      stillFailing.forEach(r => console.log(`  - ${r.name}`));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();
