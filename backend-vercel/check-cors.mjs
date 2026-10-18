import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllFiles(dir, ext) {
  let results = [];
  const files = readdirSync(dir);
  files.forEach(file => {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  });
  return results;
}

const routes = getAllFiles('app/api', 'route.ts');
let hasCors = 0;
let noCors = 0;
let hasOptions = 0;
let noOptions = 0;
const missingCors = [];
const missingOptions = [];

routes.forEach(f => {
  const content = readFileSync(f, 'utf8');
  const hasImport = content.includes('from') && (content.includes('@/lib/cors') || content.includes('../lib/cors'));
  const hasOptionsExport = /export\s+(async\s+)?(function|const)\s+OPTIONS/m.test(content);
  
  if (hasImport) {
    hasCors++;
  } else {
    noCors++;
    missingCors.push(f);
  }
  
  // Skip cron and webhooks - they don't need OPTIONS
  if (!f.includes('cron') && !f.includes('webhooks') && !f.includes('trpc')) {
    if (hasOptionsExport) {
      hasOptions++;
    } else {
      noOptions++;
      missingOptions.push(f);
    }
  }
});

console.log(`\n📊 CORS Audit Results for Main Branch`);
console.log(`=====================================\n`);
console.log(`Total routes: ${routes.length}`);
console.log(`With CORS import: ${hasCors} ✅`);
console.log(`Without CORS import: ${noCors} ❌`);
console.log(`With OPTIONS handler: ${hasOptions} ✅`);
console.log(`Without OPTIONS (user-facing): ${noOptions} ⚠️\n`);

if (missingCors.length > 0) {
  console.log(`❌ Endpoints missing CORS import (${missingCors.length}):`);
  missingCors.forEach(f => console.log(`   - ${f}`));
  console.log('');
}

if (missingOptions.length > 0 && missingOptions.length <= 20) {
  console.log(`⚠️ User-facing endpoints missing OPTIONS (${missingOptions.length}):`);
  missingOptions.forEach(f => console.log(`   - ${f}`));
  console.log('');
}

console.log(`\n✨ Summary: ${hasCors === routes.length ? 'All endpoints have CORS! ✅' : `${noCors} endpoints need CORS ❌`}\n`);
