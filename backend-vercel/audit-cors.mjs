#!/usr/bin/env node
/**
 * CORS Audit Script
 * Checks all API route files for proper CORS implementation
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const issues = [];
const passed = [];

// Check if a file has proper CORS
async function checkFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  
  const checks = {
    hasOptionsExport: /export\s+(async\s+)?function\s+OPTIONS/.test(content),
    importsCorsHelpers: /import\s+{[^}]*(options|ok|unauthorized|serverError|badRequest|notFound)[^}]*}\s+from\s+['"]@\/lib\/cors['"]/.test(content),
    usesRawResponse: /new Response\(JSON\.stringify/.test(content),
    hasUnauthorizedHelper: /unauthorized\(/.test(content),
    hasServerErrorHelper: /serverError\(/.test(content),
  };
  
  const problems = [];
  
  if (!checks.hasOptionsExport) {
    problems.push('Missing OPTIONS export');
  }
  
  if (!checks.importsCorsHelpers) {
    problems.push('Not importing CORS helpers');
  }
  
  if (checks.usesRawResponse && !checks.hasUnauthorizedHelper && !checks.hasServerErrorHelper) {
    problems.push('Using raw Response instead of CORS helpers');
  }
  
  return { checks, problems };
}

// Recursively find all route.ts files
async function findRouteFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await findRouteFiles(fullPath, files);
    } else if (entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Find all route files
const routes = await findRouteFiles('app/api/v1');

console.log(`\n🔍 Auditing ${routes.length} API routes for CORS compliance\n`);
console.log('='.repeat(80));

for (const route of routes) {
  const result = await checkFile(route);
  
  if (result.problems.length > 0) {
    issues.push({ route, problems: result.problems });
    console.log(`❌ ${route}`);
    result.problems.forEach(p => console.log(`   - ${p}`));
  } else {
    passed.push(route);
    console.log(`✅ ${route}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Summary:`);
console.log(`✅ Passed: ${passed.length}`);
console.log(`❌ Issues: ${issues.length}`);
console.log(`📈 Total: ${routes.length}`);
console.log(`🎯 Success Rate: ${((passed.length / routes.length) * 100).toFixed(1)}%\n`);

if (issues.length > 0) {
  console.log('\n⚠️  Files needing CORS fixes:\n');
  issues.forEach(({ route, problems }) => {
    console.log(`${route}:`);
    problems.forEach(p => console.log(`  - ${p}`));
    console.log('');
  });
  
  process.exit(1);
}
