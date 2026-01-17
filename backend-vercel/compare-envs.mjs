#!/usr/bin/env node
/**
 * Compare Local .env with Vercel .env
 */

import { readFile } from 'fs/promises';

function parseEnv(content) {
  const vars = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      vars[key] = value;
    }
  }
  
  return vars;
}

function maskValue(value, key) {
  if (!value) return '<empty>';
  
  // Mask sensitive values
  const sensitive = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD'];
  if (sensitive.some(s => key.includes(s))) {
    if (value.length <= 10) return '***';
    return value.substring(0, 10) + '***' + value.substring(value.length - 4);
  }
  
  if (value.length > 50) {
    return value.substring(0, 30) + '...' + value.substring(value.length - 10);
  }
  
  return value;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 Environment Variables Comparison                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Read both files
  const localContent = await readFile('.env', 'utf-8');
  const vercelContent = await readFile('.env.vercel', 'utf-8');
  
  const localVars = parseEnv(localContent);
  const vercelVars = parseEnv(vercelContent);
  
  const allKeys = new Set([...Object.keys(localVars), ...Object.keys(vercelVars)]);
  const sortedKeys = Array.from(allKeys).sort();
  
  console.log('📊 Critical Variables:\n');
  
  const critical = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'REVENUECAT_V2_API_KEY',
    'STRIPE_SECRET_KEY',
    'TEST_EMAIL',
    'TEST_PASSWORD',
  ];
  
  let mismatches = 0;
  let missing = 0;
  
  for (const key of critical) {
    const localVal = localVars[key];
    const vercelVal = vercelVars[key];
    
    if (!localVal && !vercelVal) continue;
    
    const status = 
      !localVal ? '❌ Missing Local' :
      !vercelVal ? '⚠️  Missing Vercel' :
      localVal === vercelVal ? '✅ Match' :
      '⚠️  Mismatch';
    
    if (status.includes('❌') || status.includes('Mismatch')) {
      if (!localVal || !vercelVal) missing++;
      else mismatches++;
    }
    
    console.log(`${status.padEnd(20)} ${key}`);
    if (localVal && vercelVal && localVal !== vercelVal) {
      console.log(`   Local:  ${maskValue(localVal, key)}`);
      console.log(`   Vercel: ${maskValue(vercelVal, key)}`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📈 Summary:');
  console.log(`   Mismatches: ${mismatches}`);
  console.log(`   Missing:    ${missing}`);
  console.log(`   Status:     ${mismatches === 0 && missing === 0 ? '✅ All Good!' : '⚠️  Issues Found'}\n`);
  
  if (mismatches > 0 || missing > 0) {
    console.log('💡 Recommendations:');
    if (missing > 0) {
      console.log('   - Add missing variables to both .env files');
    }
    if (mismatches > 0) {
      console.log('   - Sync mismatched values between local and Vercel');
      console.log('   - Run: vercel env add <VAR_NAME> to update Vercel');
    }
    console.log('');
  }
  
  // Check for all variables
  console.log('═'.repeat(70));
  console.log('\n📋 All Variables:\n');
  console.log('   Local Only:  ' + Object.keys(localVars).filter(k => !vercelVars[k]).length);
  console.log('   Vercel Only: ' + Object.keys(vercelVars).filter(k => !localVars[k]).length);
  console.log('   Shared:      ' + Object.keys(localVars).filter(k => vercelVars[k]).length);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
