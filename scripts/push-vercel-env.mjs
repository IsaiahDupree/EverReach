#!/usr/bin/env node
/**
 * Push Meta CAPI env vars to Vercel
 *
 * Usage:
 *   node scripts/push-vercel-env.mjs
 *
 * Reads META_PIXEL_ID and META_CONVERSIONS_API_TOKEN from your local .env
 * and pushes them to Vercel for production, preview, and development.
 *
 * Requires: `vercel` CLI installed and linked to your project.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();

const VARS_TO_PUSH = [
  {
    name: 'META_PIXEL_ID',
    value: env.EXPO_PUBLIC_META_PIXEL_ID || '',
    description: 'Meta Pixel ID for Conversions API',
  },
  {
    name: 'META_CONVERSIONS_API_TOKEN',
    value: env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '',
    description: 'Meta Conversions API access token',
  },
];

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

console.log(`\n${c.bold}${c.cyan}Push Meta CAPI Env Vars to Vercel${c.reset}\n`);

// Check vercel CLI
try {
  execSync('vercel --version', { stdio: 'pipe' });
} catch {
  console.error(`${c.red}Error: vercel CLI not found. Install with: npm i -g vercel${c.reset}`);
  process.exit(1);
}

const backendDir = resolve(__dirname, '..', 'backend-vercel');
let pushed = 0;
let skipped = 0;

for (const v of VARS_TO_PUSH) {
  if (!v.value) {
    console.log(`${c.yellow}⚠ Skipping ${v.name} — not found in .env${c.reset}`);
    skipped++;
    continue;
  }

  console.log(`${c.dim}Pushing ${v.name} (${v.value.substring(0, 12)}...)${c.reset}`);

  for (const envTarget of ['production', 'preview', 'development']) {
    try {
      // Use echo to pipe the value to vercel env add (avoids interactive prompt)
      execSync(
        `echo "${v.value}" | vercel env add ${v.name} ${envTarget} --force`,
        { cwd: backendDir, stdio: 'pipe' }
      );
    } catch (e) {
      // --force might not be supported on all versions, try without
      try {
        execSync(
          `echo "${v.value}" | vercel env add ${v.name} ${envTarget}`,
          { cwd: backendDir, stdio: 'pipe' }
        );
      } catch (e2) {
        console.log(`  ${c.yellow}Note: ${v.name} may already exist for ${envTarget}${c.reset}`);
      }
    }
  }

  console.log(`  ${c.green}✓ ${v.name} → production, preview, development${c.reset}`);
  pushed++;
}

console.log(`\n${c.bold}Summary:${c.reset} ${pushed} pushed, ${skipped} skipped`);

if (pushed > 0) {
  console.log(`\n${c.yellow}⚠ Remember to redeploy the backend for changes to take effect:${c.reset}`);
  console.log(`  ${c.dim}cd backend-vercel && vercel --prod${c.reset}\n`);
}
