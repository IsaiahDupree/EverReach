/**
 * Quick test to see actual Perplexity API response format
 */

import PerplexityClient from './perplexity-client.js';
import { readFileSync } from 'fs';

// Load API key from .env
const envFile = readFileSync('.env', 'utf-8');
let apiKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('PERPLEXITY_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
});

const client = new PerplexityClient({
  apiKey,
  requestsPerSecond: 0.5,
  maxTokens: 50
});

console.log('🧪 Testing Perplexity API response format...\n');

try {
  const result = await client.chat({
    messages: 'What is 2+2? Answer with just the number.',
    maxTokens: 10
  });
  
  console.log('✅ API Response received!');
  console.log('\nFull response structure:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n\nResponse keys:', Object.keys(result));
  console.log('Has choices?:', 'choices' in result);
  console.log('Has usage?:', 'usage' in result);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nFull error:', error);
}
