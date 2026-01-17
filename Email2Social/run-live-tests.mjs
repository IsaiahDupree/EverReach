/**
 * Test runner that loads .env file and runs tests with live API calls
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Load .env file
const envFile = readFileSync('.env', 'utf-8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('🔑 Loaded API keys from .env file\n');
console.log('Running Social Links Search tests with live API...\n');

// Run Social Links tests
const socialTest = spawn('node', ['test-social-links-search.mjs'], {
  env: { ...process.env, ...envVars },
  stdio: 'inherit',
  shell: true
});

socialTest.on('close', (code) => {
  console.log('\n\n' + '='.repeat(60));
  console.log('Running Perplexity AI tests with live API...\n');
  
  // Run Perplexity tests
  const perplexityTest = spawn('node', ['test-perplexity.mjs'], {
    env: { ...process.env, ...envVars },
    stdio: 'inherit',
    shell: true
  });
  
  perplexityTest.on('close', (code) => {
    console.log('\n✅ All live API tests completed!');
    process.exit(code);
  });
});
