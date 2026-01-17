#!/usr/bin/env node

/**
 * Run migration using Supabase Management API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';
const DB_PASSWORD = 'everreach123!@#';

console.log('[Migration] Starting AI Goal Inference migration via Management API...\n');

// Read migration file
const migrationPath = join(__dirname, 'migrations', 'ai-goal-inference.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('[Migration] Read migration file:', migrationPath);
console.log('[Migration] SQL length:', migrationSQL.length, 'characters\n');

try {
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
    throw new Error(`API error: ${response.status} - ${JSON.stringify(result)}`);
  }

  console.log('✅ Migration executed successfully!\n');
  console.log('Result:', result);

  console.log('\n[Verification] Run these commands to verify:');
  console.log('1. Check tables: npm run test:goal-inference');
  console.log('2. View in dashboard: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/editor');
  console.log('3. Deploy backend: git push origin feat/backend-vercel-only-clean\n');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('\n[Fallback] Please run migration manually in Supabase SQL Editor:');
  console.error('1. Open: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new');
  console.error('2. Copy contents of: migrations/ai-goal-inference.sql');
  console.error('3. Click "Run"\n');
  process.exit(1);
}
