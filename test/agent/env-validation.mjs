#!/usr/bin/env node
/**
 * Environment Variables Validation Test
 * 
 * Validates that all required environment variables are present
 * and properly formatted before running integration tests.
 */

import { getEnv, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Environment Variables Validation',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

// Required env vars by category
const ENV_REQUIREMENTS = {
  'Core Infrastructure': [
    { key: 'SUPABASE_URL', required: true, pattern: /^https:\/\/.+\.supabase\.co$/ },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, pattern: /^eyJ/ },
    { key: 'SUPABASE_ANON_KEY', required: true, pattern: /^eyJ/ },
  ],
  'API Configuration': [
    { key: 'EXPO_PUBLIC_API_URL', required: true, pattern: /^https?:\/\/.+/ },
    { key: 'OPENAI_API_KEY', required: true, pattern: /^sk-/ },
  ],
  'Cron Security': [
    { key: 'CRON_SECRET', required: true, minLength: 32 },
  ],
  'Email Service (Resend)': [
    { key: 'RESEND_API_KEY', required: false, pattern: /^re_/ },
    { key: 'FROM_EMAIL', required: false, pattern: /.+@.+\..+/ },
  ],
  'SMS Service (Twilio)': [
    { key: 'TWILIO_ACCOUNT_SID', required: false, pattern: /^AC[a-f0-9]{32}$/ },
    { key: 'TWILIO_AUTH_TOKEN', required: false, minLength: 32 },
    { key: 'TWILIO_PHONE_NUMBER', required: false, pattern: /^\+\d{10,15}$/ },
  ],
  'Developer Notifications': [
    { key: 'DEV_NOTIFICATION_EMAIL', required: false, pattern: /.+@.+\..+/ },
  ],
};

async function test() {
  try {
    let totalChecks = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    lines.push('## Environment Variables Status');
    lines.push('');

    for (const [category, vars] of Object.entries(ENV_REQUIREMENTS)) {
      lines.push(`### ${category}`);
      lines.push('');

      for (const { key, required, pattern, minLength } of vars) {
        totalChecks++;
        const value = await getEnv(key, false);

        if (!value) {
          if (required) {
            failed++;
            lines.push(`- ❌ **${key}**: Missing (REQUIRED)`);
          } else {
            warnings++;
            lines.push(`- ⚠️  **${key}**: Not set (optional)`);
          }
          continue;
        }

        // Check pattern
        if (pattern && !pattern.test(value)) {
          failed++;
          lines.push(`- ❌ **${key}**: Invalid format`);
          continue;
        }

        // Check minimum length
        if (minLength && value.length < minLength) {
          failed++;
          lines.push(`- ❌ **${key}**: Too short (min ${minLength} chars)`);
          continue;
        }

        // All checks passed
        passed++;
        const masked = value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-4)}` : value.slice(0, 10) + '***';
        lines.push(`- ✅ **${key}**: ${masked}`);
      }

      lines.push('');
    }

    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total checks: ${totalChecks}`);
    lines.push(`- ✅ Passed: ${passed}`);
    lines.push(`- ❌ Failed: ${failed}`);
    lines.push(`- ⚠️  Warnings: ${warnings}`);
    lines.push('');

    if (failed > 0) {
      lines.push('## ❌ Validation Failed');
      lines.push('');
      lines.push('**Required environment variables are missing or invalid.**');
      lines.push('');
      lines.push('Please set the missing variables before running integration tests.');
      throw new Error(`${failed} required environment variables are missing or invalid`);
    }

    if (warnings > 0) {
      lines.push('## ⚠️  Optional Variables Not Set');
      lines.push('');
      lines.push('Some optional features may not work:');
      lines.push('- Email campaigns require RESEND_API_KEY and FROM_EMAIL');
      lines.push('- SMS campaigns require TWILIO_* credentials');
      lines.push('- Developer notifications require DEV_NOTIFICATION_EMAIL');
      lines.push('');
    }

    lines.push('## ✅ Environment Validation Passed');
    lines.push('');
    lines.push('All required environment variables are properly configured.');

  } catch (err) {
    lines.push('');
    lines.push('## ❌ Validation Failed');
    lines.push('```');
    lines.push(err.stack || err.message || String(err));
    lines.push('```');
    throw err;
  }
}

test()
  .then(() => writeReport(lines, 'test/agent/reports', 'env_validation'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    writeReport(lines, 'test/agent/reports', 'env_validation').finally(() => process.exit(1));
  });
