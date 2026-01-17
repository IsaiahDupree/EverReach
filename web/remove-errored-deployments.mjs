#!/usr/bin/env node
/**
 * Remove all errored/failed Vercel deployments
 * Usage: node remove-errored-deployments.mjs
 */

import { execSync } from 'child_process';

console.log('🔍 Fetching deployments...\n');

try {
  // Get all deployments as JSON
  const output = execSync('vercel ls --json', { encoding: 'utf-8' });
  const data = JSON.parse(output);
  
  if (!data.deployments || data.deployments.length === 0) {
    console.log('✅ No deployments found.');
    process.exit(0);
  }

  // Filter for errored/failed deployments
  const erroredDeployments = data.deployments.filter(d => 
    d.state === 'ERROR' || 
    d.state === 'CANCELED' ||
    d.readyState === 'ERROR' ||
    d.readyState === 'CANCELED'
  );

  if (erroredDeployments.length === 0) {
    console.log('✅ No errored deployments found!');
    process.exit(0);
  }

  console.log(`❌ Found ${erroredDeployments.length} errored deployment(s):\n`);
  
  erroredDeployments.forEach((d, i) => {
    console.log(`${i + 1}. ${d.url}`);
    console.log(`   State: ${d.state || d.readyState}`);
    console.log(`   Created: ${new Date(d.created).toLocaleString()}`);
    console.log('');
  });

  console.log('🗑️  Removing errored deployments...\n');

  let removed = 0;
  let failed = 0;

  for (const deployment of erroredDeployments) {
    try {
      console.log(`Removing: ${deployment.url}`);
      execSync(`vercel rm ${deployment.url} --yes`, { encoding: 'utf-8' });
      removed++;
      console.log(`✅ Removed\n`);
    } catch (error) {
      failed++;
      console.log(`❌ Failed to remove: ${error.message}\n`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Removed: ${removed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total: ${erroredDeployments.length}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nMake sure you are logged in to Vercel:');
  console.error('  vercel login');
  process.exit(1);
}
