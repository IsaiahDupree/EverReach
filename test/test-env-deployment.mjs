/**
 * Test Environment Variables Deployment
 * 
 * Verifies that all environment variables are properly configured in Vercel
 * 
 * Usage:
 *   node test/test-env-deployment.mjs
 *   node test/test-env-deployment.mjs https://your-custom-domain.vercel.app
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.argv[2] || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 process.env.TEST_BASE_URL || 
                 'http://localhost:3001';

console.log('\n' + '═'.repeat(70));
console.log('🧪 TESTING ENVIRONMENT VARIABLES DEPLOYMENT');
console.log('═'.repeat(70));
console.log(`Target: ${BASE_URL}`);
console.log(`Time: ${new Date().toISOString()}`);
console.log('');

async function testEnvVariables() {
  try {
    console.log('📡 Checking environment variables...\n');
    
    const response = await fetch(`${BASE_URL}/api/test/env-check`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('📊 RESULTS');
    console.log('─'.repeat(70));
    console.log(`Status: ${data.status === 'success' ? '✅ SUCCESS' : '⚠️ WARNING'}`);
    console.log(`Message: ${data.message}`);
    console.log(`Environment: ${data.environment}`);
    console.log('');
    
    console.log('📈 SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Total Variables: ${data.summary.total}`);
    console.log(`✅ Configured: ${data.summary.existing} (${data.summary.percentage}%)`);
    console.log(`❌ Missing: ${data.summary.missing}`);
    console.log(`📝 Optional: ${data.summary.optional}`);
    console.log(`🔴 Required Missing: ${data.summary.required_missing}`);
    console.log('');

    // Show by category
    console.log('📦 BY CATEGORY');
    console.log('─'.repeat(70));
    Object.entries(data.by_category).forEach(([category, vars]) => {
      const existing = vars.filter(v => v.exists).length;
      const total = vars.length;
      const status = existing === total ? '✅' : '⚠️';
      
      console.log(`\n${status} ${category} (${existing}/${total})`);
      vars.forEach(v => {
        const icon = v.exists ? '  ✓' : '  ✗';
        console.log(`${icon} ${v.name}`);
      });
    });

    // Show missing variables
    if (data.missing_variables.length > 0) {
      console.log('\n❌ MISSING VARIABLES');
      console.log('─'.repeat(70));
      data.missing_variables.forEach(v => {
        const priority = v.required ? '🔴 REQUIRED' : '📝 OPTIONAL';
        console.log(`${priority} - ${v.name} (${v.category})`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    
    if (data.status === 'success') {
      console.log('✅ All required environment variables are configured!');
      console.log('🚀 Your deployment is ready to use');
      process.exit(0);
    } else {
      console.log('⚠️  Some required environment variables are missing');
      console.log('📝 Add missing variables to Vercel and redeploy');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR');
    console.error('─'.repeat(70));
    console.error(error.message);
    console.error('');
    console.error('Possible issues:');
    console.error('  1. Backend is not running or not deployed');
    console.error('  2. Wrong URL (check BASE_URL)');
    console.error('  3. Network connectivity issue');
    console.error('');
    console.error('To test local: node test/test-env-deployment.mjs http://localhost:3001');
    console.error('To test prod:  node test/test-env-deployment.mjs https://your-domain.vercel.app');
    process.exit(1);
  }
}

// Run test
testEnvVariables();
