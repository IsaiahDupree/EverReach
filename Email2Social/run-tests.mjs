/**
 * Test runner that loads environment variables from .env file
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Load .env file
try {
  const envFile = readFileSync('.env', 'utf-8');
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  console.log('✅ Loaded environment variables from .env file\n');
} catch (error) {
  console.error('⚠️  No .env file found, using system environment variables\n');
}

console.log('🔑 API Keys Status:');
console.log(`   RAPIDAPI_KEY: ${process.env.RAPIDAPI_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`   PERPLEXITY_API_KEY: ${process.env.PERPLEXITY_API_KEY ? '✓ Set' : '✗ Not set'}`);

// Run Social Links tests
console.log('\n' + '═'.repeat(60));
console.log('SOCIAL LINKS SEARCH API TESTS');
console.log('═'.repeat(60));

try {
  execSync('node test-social-links-search.mjs', { 
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Social Links tests failed');
}

// Run Perplexity tests
console.log('\n' + '═'.repeat(60));
console.log('PERPLEXITY AI API TESTS');
console.log('═'.repeat(60));

try {
  execSync('node test-perplexity.mjs', { 
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Perplexity tests failed');
}

console.log('\n✅ All test suites completed!');
