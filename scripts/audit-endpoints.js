#!/usr/bin/env node

/**
 * API Endpoint Audit Script
 * 
 * Compares available backend endpoints vs actual frontend usage
 * 
 * Usage: node scripts/audit-endpoints.js
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../backend-vercel/app/api');
const FRONTEND_DIRS = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../components'),
  path.join(__dirname, '../hooks'),
  path.join(__dirname, '../lib'),
  path.join(__dirname, '../repos'),
];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Find all backend route files
 */
function findBackendEndpoints(dir, basePath = '/api') {
  const endpoints = [];

  if (!fs.existsSync(dir)) {
    console.warn(`${colors.yellow}Warning: Backend directory not found: ${dir}${colors.reset}`);
    return endpoints;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      const subPath = path.join(basePath, entry.name);
      endpoints.push(...findBackendEndpoints(fullPath, subPath));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      // Found a route file
      const content = fs.readFileSync(fullPath, 'utf-8');
      const methods = [];

      // Detect HTTP methods
      if (content.includes('export async function GET')) methods.push('GET');
      if (content.includes('export async function POST')) methods.push('POST');
      if (content.includes('export async function PUT')) methods.push('PUT');
      if (content.includes('export async function PATCH')) methods.push('PATCH');
      if (content.includes('export async function DELETE')) methods.push('DELETE');

      endpoints.push({
        path: basePath,
        methods,
        file: fullPath.replace(process.cwd(), '.'),
      });
    }
  }

  return endpoints;
}

/**
 * Find all frontend API calls
 */
function findFrontendAPICalls(dirs) {
  const apiCalls = new Map();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    scanDirectory(dir, apiCalls);
  }

  return apiCalls;
}

function scanDirectory(dir, apiCalls) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name !== 'node_modules' && entry.name !== '.git' && !entry.name.startsWith('.')) {
        scanDirectory(fullPath, apiCalls);
      }
    } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const relativePath = fullPath.replace(process.cwd(), '.');

      // Match API calls
      const patterns = [
        // apiFetch('/api/...')
        /apiFetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // fetch('/api/...')
        /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/g,
        // axios.get('/api/...')
        /axios\.\w+\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/g,
        // router.push with /api
        /['"`](\/api\/v\d+\/[^'"`]+)['"`]/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const endpoint = match[1];
          if (endpoint.startsWith('/api')) {
            if (!apiCalls.has(endpoint)) {
              apiCalls.set(endpoint, []);
            }
            apiCalls.get(endpoint).push(relativePath);
          }
        }
      }
    }
  }
}

/**
 * Normalize endpoint paths for comparison
 */
function normalizeEndpoint(endpoint) {
  // Remove query parameters
  let cleaned = endpoint.split('?')[0];
  // Lowercase for consistency
  cleaned = cleaned.toLowerCase();
  // Normalize backend dynamic segments like [id], [key], [...slug]
  cleaned = cleaned.replace(/\/\[(?:\.\.\.)?[^/]+\]/g, '/:id');
  // Replace template strings ${...} with a param placeholder
  cleaned = cleaned.replace(/\$\{[^}]+\}/g, ':id');
  // Replace explicit :param with :id
  cleaned = cleaned.replace(/:\w+/g, ':id');
  // Replace UUIDs and numeric segments with :id
  cleaned = cleaned.replace(/\/[a-f0-9-]{36}/gi, '/:id').replace(/\/\d+/g, '/:id');
  // Collapse multiple /:id in a row if any accidental duplicates
  cleaned = cleaned.replace(/(:id)(?=\/:id)/g, ':id');
  // Remove trailing slashes (except root)
  cleaned = cleaned.replace(/\/$/, '');
  // Collapse duplicate slashes
  cleaned = cleaned.replace(/\/{2,}/g, '/');
  return cleaned;
}

/**
 * Generate audit report
 */
function generateAuditReport() {
  console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   API Endpoint Audit Report${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

  // Find backend endpoints
  console.log(`${colors.blue}Scanning backend endpoints...${colors.reset}`);
  const backendEndpoints = findBackendEndpoints(BACKEND_DIR);
  console.log(`${colors.green}✓ Found ${backendEndpoints.length} backend endpoints${colors.reset}\n`);

  // Find frontend API calls
  console.log(`${colors.blue}Scanning frontend API calls...${colors.reset}`);
  const frontendCalls = findFrontendAPICalls(FRONTEND_DIRS);
  console.log(`${colors.green}✓ Found ${frontendCalls.size} unique API calls${colors.reset}\n`);

  // Normalize endpoints for comparison
  const backendMap = new Map();
  backendEndpoints.forEach(ep => {
    const normalized = normalizeEndpoint(ep.path);
    if (!backendMap.has(normalized)) {
      backendMap.set(normalized, []);
    }
    backendMap.get(normalized).push(ep);
  });

  const frontendMap = new Map();
  frontendCalls.forEach((files, endpoint) => {
    const normalized = normalizeEndpoint(endpoint);
    if (!frontendMap.has(normalized)) {
      frontendMap.set(normalized, { calls: [], files: new Set() });
    }
    frontendMap.get(normalized).calls.push(endpoint);
    files.forEach(f => frontendMap.get(normalized).files.add(f));
  });

  // Analysis
  const used = [];
  const unused = [];
  const missing = [];

  // Check which backend endpoints are used
  backendMap.forEach((endpoints, normalizedPath) => {
    if (frontendMap.has(normalizedPath)) {
      used.push({ normalizedPath, endpoints, usage: frontendMap.get(normalizedPath) });
    } else {
      unused.push({ normalizedPath, endpoints });
    }
  });

  // Check which frontend calls don't have backends
  frontendMap.forEach((usage, normalizedPath) => {
    if (!backendMap.has(normalizedPath)) {
      missing.push({ normalizedPath, usage });
    }
  });

  // Print Used Endpoints
  console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}✓ USED ENDPOINTS (${used.length})${colors.reset}`);
  console.log(`${colors.bright}${colors.green}========================================${colors.reset}\n`);

  used.sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath));
  used.forEach(({ normalizedPath, endpoints, usage }) => {
    console.log(`${colors.green}✓${colors.reset} ${colors.bright}${normalizedPath}${colors.reset}`);
    endpoints.forEach(ep => {
      console.log(`  ${colors.cyan}Methods:${colors.reset} ${ep.methods.join(', ')}`);
      console.log(`  ${colors.cyan}Backend:${colors.reset} ${ep.file}`);
    });
    console.log(`  ${colors.cyan}Used in ${usage.files.size} file(s):${colors.reset}`);
    Array.from(usage.files).slice(0, 3).forEach(f => {
      console.log(`    - ${f}`);
    });
    if (usage.files.size > 3) {
      console.log(`    ... and ${usage.files.size - 3} more`);
    }
    console.log('');
  });

  // Print Unused Endpoints
  console.log(`${colors.bright}${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}⚠ UNUSED ENDPOINTS (${unused.length})${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}========================================${colors.reset}\n`);

  if (unused.length === 0) {
    console.log(`${colors.green}✓ No unused endpoints found!${colors.reset}\n`);
  } else {
    unused.sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath));
    unused.forEach(({ normalizedPath, endpoints }) => {
      console.log(`${colors.yellow}⚠${colors.reset} ${colors.bright}${normalizedPath}${colors.reset}`);
      endpoints.forEach(ep => {
        console.log(`  ${colors.cyan}Methods:${colors.reset} ${ep.methods.join(', ')}`);
        console.log(`  ${colors.cyan}Backend:${colors.reset} ${ep.file}`);
      });
      console.log('');
    });
  }

  // Print Missing Endpoints
  console.log(`${colors.bright}${colors.red}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.red}✗ MISSING BACKEND ENDPOINTS (${missing.length})${colors.reset}`);
  console.log(`${colors.bright}${colors.red}========================================${colors.reset}\n`);

  if (missing.length === 0) {
    console.log(`${colors.green}✓ No missing endpoints found!${colors.reset}\n`);
  } else {
    missing.sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath));
    missing.forEach(({ normalizedPath, usage }) => {
      console.log(`${colors.red}✗${colors.reset} ${colors.bright}${normalizedPath}${colors.reset}`);
      console.log(`  ${colors.cyan}Called from ${usage.files.size} file(s):${colors.reset}`);
      Array.from(usage.files).slice(0, 3).forEach(f => {
        console.log(`    - ${f}`);
      });
      if (usage.files.size > 3) {
        console.log(`    ... and ${usage.files.size - 3} more`);
      }
      console.log(`  ${colors.cyan}Example calls:${colors.reset}`);
      usage.calls.slice(0, 2).forEach(call => {
        console.log(`    ${call}`);
      });
      console.log('');
    });
  }

  // Summary
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);
  console.log(`${colors.green}✓ Used Endpoints:${colors.reset}        ${used.length}`);
  console.log(`${colors.yellow}⚠ Unused Endpoints:${colors.reset}      ${unused.length}`);
  console.log(`${colors.red}✗ Missing Endpoints:${colors.reset}     ${missing.length}`);
  console.log(`${colors.blue}  Total Backend:${colors.reset}         ${backendEndpoints.length}`);
  console.log(`${colors.blue}  Total Frontend Calls:${colors.reset}  ${frontendCalls.size}\n`);

  // Recommendations
  console.log(`${colors.bright}${colors.cyan}RECOMMENDATIONS${colors.reset}\n`);
  
  if (unused.length > 0) {
    console.log(`${colors.yellow}1. Consider removing or documenting unused endpoints${colors.reset}`);
    console.log(`   They may be dead code or planned for future use.\n`);
  }
  
  if (missing.length > 0) {
    console.log(`${colors.red}2. Implement missing backend endpoints${colors.reset}`);
    console.log(`   Frontend is calling APIs that don't exist!\n`);
  }

  if (unused.length === 0 && missing.length === 0) {
    console.log(`${colors.green}✓ Your API is clean! All endpoints are properly used.${colors.reset}\n`);
  }

  // Return data for programmatic use
  return {
    used,
    unused,
    missing,
    summary: {
      usedCount: used.length,
      unusedCount: unused.length,
      missingCount: missing.length,
      totalBackend: backendEndpoints.length,
      totalFrontendCalls: frontendCalls.size,
    },
  };
}

// Run the audit
if (require.main === module) {
  try {
    generateAuditReport();
  } catch (error) {
    console.error(`${colors.red}Error running audit:${colors.reset}`, error);
    process.exit(1);
  }
}

module.exports = { generateAuditReport, findBackendEndpoints, findFrontendAPICalls };
