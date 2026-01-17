#!/usr/bin/env node
/**
 * Wrapper script to run feature requests integration tests with env vars loaded
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');

// Load .env file
try {
  const envPath = resolve(rootDir, '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (!key) return;
    
    let value = valueParts.join('=');
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    process.env[key.trim()] = value;
  });
  
  console.log('✓ Environment variables loaded from .env');
} catch (err) {
  console.warn('⚠ Could not load .env file:', err.message);
}

// Set test credentials if not already set
if (!process.env.TEST_EMAIL) {
  process.env.TEST_EMAIL = 'isaiahdupree33@gmail.com';
}
if (!process.env.TEST_PASSWORD) {
  process.env.TEST_PASSWORD = 'frogger12';
}

console.log(`Running tests with:`);
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
console.log(`  TEST_EMAIL: ${process.env.TEST_EMAIL}`);
console.log('');

// Run the actual test file
const testFile = resolve(__dirname, 'feature-requests-integration.mjs');
const child = spawn('node', [testFile], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
