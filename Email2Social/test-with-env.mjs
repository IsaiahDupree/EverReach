/**
 * Simple test runner that loads .env and runs both test suites
 */

import dotenv from 'dotenv';

// Load .env file
dotenv.config();

console.log('🔑 Loaded environment variables');
console.log(`RAPIDAPI_KEY: ${process.env.RAPIDAPI_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`PERPLEXITY_API_KEY: ${process.env.PERPLEXITY_API_KEY ? '✓ Set' : '✗ Not set'}\n`);

// Import and run Social Links tests
console.log('═'.repeat(60));
console.log('SOCIAL LINKS SEARCH API - LIVE TESTS');
console.log('═'.repeat(60) + '\n');

import('./test-social-links-search.mjs');
