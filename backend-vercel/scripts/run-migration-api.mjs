#!/usr/bin/env node

// Run Personal Profile Migration via Supabase Management API

import { readFileSync } from 'fs';

const PROJECT_REF = 'bvhqolnytimehzpwdiqd';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

console.log('[Migration] Reading SQL file...\n');

const sql = readFileSync('migrations/personal-profile-api.sql', 'utf8');

console.log('[Migration] Executing via Supabase API...\n');

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Migration failed:', response.status);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!\n');
  console.log('Result:', JSON.stringify(result, null, 2));

  // Now verify
  console.log('\n[Verification] Running schema checks...\n');
  
  const verifySQL = readFileSync('scripts/verify-personal-profile.sql', 'utf8');
  
  const verifyResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({ query: verifySQL })
    }
  );

  const verifyResult = await verifyResponse.json();

  if (!verifyResponse.ok) {
    console.error('❌ Verification failed:', verifyResponse.status);
    console.error(JSON.stringify(verifyResult, null, 2));
  } else {
    console.log('✅ Verification completed!\n');
    if (verifyResult.result) {
      verifyResult.result.forEach(row => {
        const status = row.ok ? '✅' : '❌';
        console.log(`${status} ${row.check || row.section || 'check'}: ${row.ok !== undefined ? row.ok : row.polname || 'ok'}`);
      });
    }
  }

  console.log('\n========================================');
  console.log('✅ Migration & Verification Complete!');
  console.log('========================================\n');
  console.log('Next: Run smoke tests with:');
  console.log('  $env:API_BASE = "https://ever-reach-be.vercel.app"');
  console.log('  $env:TEST_JWT = "<paste-jwt>"');
  console.log('  node test/profile-smoke.mjs\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
