/**
 * List All API Endpoints
 * Scans all route.ts files and extracts HTTP methods
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function findRouteFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let routes = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      routes = routes.concat(await findRouteFiles(fullPath, baseDir));
    } else if (entry.name === 'route.ts') {
      routes.push(fullPath);
    }
  }

  return routes;
}

async function extractMethods(filePath) {
  const content = await readFile(filePath, 'utf8');
  const methods = [];
  
  // Look for exported async functions (GET, POST, PATCH, PUT, DELETE, OPTIONS)
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE|OPTIONS)/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    if (!methods.includes(match[1])) {
      methods.push(match[1]);
    }
  }
  
  return methods.filter(m => m !== 'OPTIONS').sort();
}

function pathToEndpoint(filePath) {
  // Convert file path to API endpoint
  const parts = filePath.split('app\\api\\')[1] || filePath.split('app/api/')[1];
  if (!parts) return null;
  
  let endpoint = parts
    .replace(/\\/g, '/')
    .replace(/\/route\.ts$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1'); // Convert [id] to :id
  
  return '/' + endpoint;
}

async function main() {
  const apiDir = 'app/api';
  console.log('🔍 Scanning for all API endpoints...\n');
  
  const routeFiles = await findRouteFiles(apiDir);
  const endpoints = [];
  
  for (const file of routeFiles) {
    const endpoint = pathToEndpoint(file);
    if (endpoint) {
      const methods = await extractMethods(file);
      endpoints.push({ endpoint, methods, file });
    }
  }
  
  // Sort by endpoint
  endpoints.sort((a, b) => a.endpoint.localeCompare(b.endpoint));
  
  // Group by category
  const categories = {
    'Health & System': [],
    'Billing': [],
    'Webhooks': [],
    'Cron Jobs': [],
    'User/Me': [],
    'Contacts': [],
    'Interactions': [],
    'Templates': [],
    'Goals': [],
    'Pipelines': [],
    'Warmth': [],
    'Agent/AI': [],
    'Alerts': [],
    'Feature Requests': [],
    'Custom Fields': [],
    'Search': [],
    'Push Tokens': [],
    'Files': [],
    'Analysis': [],
    'Compose': [],
    'Messages': [],
    'Recommendations': [],
    'Telemetry': [],
    'Other': [],
  };
  
  for (const { endpoint, methods } of endpoints) {
    const entry = `${endpoint} — ${methods.join(', ')}`;
    
    if (endpoint.includes('/health')) categories['Health & System'].push(entry);
    else if (endpoint.includes('/billing')) categories['Billing'].push(entry);
    else if (endpoint.includes('/webhooks')) categories['Webhooks'].push(entry);
    else if (endpoint.includes('/cron')) categories['Cron Jobs'].push(entry);
    else if (endpoint.includes('/v1/me')) categories['User/Me'].push(entry);
    else if (endpoint.includes('/contacts')) categories['Contacts'].push(entry);
    else if (endpoint.includes('/interactions')) categories['Interactions'].push(entry);
    else if (endpoint.includes('/templates')) categories['Templates'].push(entry);
    else if (endpoint.includes('/goals')) categories['Goals'].push(entry);
    else if (endpoint.includes('/pipelines')) categories['Pipelines'].push(entry);
    else if (endpoint.includes('/warmth')) categories['Warmth'].push(entry);
    else if (endpoint.includes('/agent')) categories['Agent/AI'].push(entry);
    else if (endpoint.includes('/alerts')) categories['Alerts'].push(entry);
    else if (endpoint.includes('/feature')) categories['Feature Requests'].push(entry);
    else if (endpoint.includes('/custom-fields')) categories['Custom Fields'].push(entry);
    else if (endpoint.includes('/search')) categories['Search'].push(entry);
    else if (endpoint.includes('/push-tokens')) categories['Push Tokens'].push(entry);
    else if (endpoint.includes('/files') || endpoint.includes('/uploads')) categories['Files'].push(entry);
    else if (endpoint.includes('/analysis')) categories['Analysis'].push(entry);
    else if (endpoint.includes('/compose')) categories['Compose'].push(entry);
    else if (endpoint.includes('/messages')) categories['Messages'].push(entry);
    else if (endpoint.includes('/recommendations')) categories['Recommendations'].push(entry);
    else if (endpoint.includes('/telemetry') || endpoint.includes('/trending')) categories['Telemetry'].push(entry);
    else categories['Other'].push(entry);
  }
  
  // Print results
  console.log(`Found ${endpoints.length} endpoints\n`);
  console.log('='.repeat(80));
  
  for (const [category, items] of Object.entries(categories)) {
    if (items.length > 0) {
      console.log(`\n## ${category} (${items.length})`);
      for (const item of items) {
        console.log(`  ${item}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal: ${endpoints.length} endpoints across ${Object.values(categories).filter(arr => arr.length > 0).length} categories`);
}

main().catch(console.error);
