#!/usr/bin/env node
/**
 * Meta Conversion Tracking Tests
 * 
 * Simple Node.js script to verify CompleteRegistration and Activate events are properly implemented.
 * Run with: node scripts/test-meta-conversion-tracking.js
 */

const fs = require('fs');
const path = require('path');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const TITLE = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`  ${PASS} ${name}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${TITLE}${name}${RESET}`);
}

// Read files
const authCallbackPath = path.join(__dirname, '../app/auth/callback.tsx');
const onboardingPath = path.join(__dirname, '../app/onboarding.tsx');
const metaPixelPath = path.join(__dirname, '../lib/metaPixel.ts');
const docPath = path.join(__dirname, '../docs/META_ADS_CONVERSION_MAPPING.md');

let authCallbackContent, onboardingContent, metaPixelContent, docContent;

try {
  authCallbackContent = fs.readFileSync(authCallbackPath, 'utf-8');
} catch (e) {
  console.error(`${FAIL} Could not read auth/callback.tsx: ${e.message}`);
  process.exit(1);
}

try {
  onboardingContent = fs.readFileSync(onboardingPath, 'utf-8');
} catch (e) {
  console.error(`${FAIL} Could not read onboarding.tsx: ${e.message}`);
  process.exit(1);
}

try {
  metaPixelContent = fs.readFileSync(metaPixelPath, 'utf-8');
} catch (e) {
  console.error(`${FAIL} Could not read metaPixel.ts: ${e.message}`);
  process.exit(1);
}

try {
  docContent = fs.readFileSync(docPath, 'utf-8');
} catch (e) {
  console.error(`${FAIL} Could not read META_ADS_CONVERSION_MAPPING.md: ${e.message}`);
  process.exit(1);
}

console.log('\n=== Meta Conversion Tracking Tests ===\n');

// CompleteRegistration Tests
section('CompleteRegistration Event (auth/callback.tsx)');
test('Imports trackEvent from metaPixel', authCallbackContent.includes("import { trackEvent } from '@/lib/metaPixel'"));
test('Has dedupe key COMPLETE_REGISTRATION_FIRED_KEY', authCallbackContent.includes('COMPLETE_REGISTRATION_FIRED_KEY'));
test('Checks if user is new (created within 10 min)', authCallbackContent.includes('isNewUser') && authCallbackContent.includes('10 * 60 * 1000'));
test('Fires CompleteRegistration event', authCallbackContent.includes("trackEvent('CompleteRegistration'"));
test('Includes content_name: Account Verified', authCallbackContent.includes("content_name: 'Account Verified'"));
test('Includes status: complete', authCallbackContent.includes("status: 'complete'"));
test('Stores userId after firing to prevent duplicates', authCallbackContent.includes('AsyncStorage.setItem(COMPLETE_REGISTRATION_FIRED_KEY, userId)'));
test('Checks alreadyFired before tracking', authCallbackContent.includes('!alreadyFired'));

// Activate Tests
section('Activate Event (onboarding.tsx)');
test('Imports trackEvent from metaPixel', onboardingContent.includes("import { trackEvent } from '@/lib/metaPixel'"));
test('Fires Activate event', onboardingContent.includes("trackEvent('Activate'"));
test('Has activation_type: onboarding_completed', onboardingContent.includes("activation_type: 'onboarding_completed'"));
test('Has content_name: Onboarding Completed', onboardingContent.includes("content_name: 'Onboarding Completed'"));

// Count Activate occurrences - should only be once
const activateMatches = onboardingContent.match(/trackEvent\('Activate'/g);
test('Fires Activate only once (not in handleSkip)', activateMatches && activateMatches.length === 1);

// Deduplication Tests
section('Event Deduplication');
test('Uses AsyncStorage for deduplication', authCallbackContent.includes('AsyncStorage'));
test('Checks existing flag before firing', authCallbackContent.includes('alreadyFired') && authCallbackContent.includes('AsyncStorage.getItem'));
test('Saves flag after firing', authCallbackContent.includes('AsyncStorage.setItem'));

// Meta Pixel Integration
section('Meta Pixel Integration (lib/metaPixel.ts)');
test('Exports trackEvent function', /export\s+(async\s+)?function\s+trackEvent/.test(metaPixelContent));
test('Has PIXEL_ID configured', /PIXEL_ID|pixelId|pixel_id/i.test(metaPixelContent));

// Documentation Tests
section('Documentation (META_ADS_CONVERSION_MAPPING.md)');
test('Documents CompleteRegistration fires after email verification', docContent.includes('email verification') && docContent.includes('NOT on initial signup'));
test('Documents Activate as single event', docContent.includes('Single Event') || docContent.includes('ONE event'));
test('Does not use URL rules for CompleteRegistration', docContent.includes('Event: CompleteRegistration') && docContent.includes('no URL rule'));
test('Recommends /thank-you-qualified path instead of querystring', docContent.includes('/thank-you-qualified'));
test('Documents AEM priority order', docContent.includes('AEM') && docContent.includes('CompleteRegistration') && docContent.includes('Activate'));

// Summary
console.log('\n=== Summary ===\n');
console.log(`  ${PASS} Passed: ${passed}`);
console.log(`  ${FAIL} Failed: ${failed}`);
console.log(`  Total: ${passed + failed}\n`);

if (failed > 0) {
  console.log('\x1b[31mSome tests failed. Please review the implementation.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32mAll tests passed! Meta conversion tracking is properly implemented.\x1b[0m\n');
  process.exit(0);
}
