/**
 * Comprehensive Test Runner
 * 
 * Runs all comprehensive test suites:
 * 1. Functional
 * 2. Integration
 * 3. System
 * 4. Security
 * 5. Performance
 * 6. Usability
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
    // Functional
    'functional/contacts-crm.mjs',
    'functional/campaigns.mjs',
    'functional/billing.mjs',

    // Integration
    'integration/external-apis.mjs',
    'integration/database.mjs',

    // System
    'system/user-journeys.mjs',

    // Security
    'security/api-security.mjs',

    // Performance
    'performance/load-latency.mjs',

    // Usability
    'usability/api-consistency.mjs',

    // Efficiency
    'efficiency/query-performance.mjs',

    // Functional - Auth & Subscription
    'functional/auth/user-creation.mjs',
    'functional/subscription/enforcement.mjs'
];

async function runTest(testFile) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Running: ${testFile}`);

        const testProcess = spawn('node', [path.join(__dirname, testFile)], {
            stdio: 'inherit',
            env: process.env
        });

        testProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Test failed with code ${code}`));
            }
        });
    });
}

async function main() {
    console.log('='.repeat(70));
    console.log('🧪 STARTING COMPREHENSIVE BACKEND TEST SUITE');
    console.log('='.repeat(70));

    const results = {
        passed: [],
        failed: []
    };

    for (const test of tests) {
        try {
            await runTest(test);
            results.passed.push(test);
        } catch (error) {
            console.error(`❌ FAILURE: ${test}`);
            results.failed.push(test);
            // Continue running other tests? Or stop? 
            // Usually good to run all to see full picture.
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(70));

    console.log(`Total Suites: ${tests.length}`);
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log('\nFailed Suites:');
        results.failed.forEach(t => console.log(`  - ${t}`));
        process.exit(1);
    } else {
        console.log('\n✨ All comprehensive tests passed!');
        process.exit(0);
    }
}

main().catch(console.error);
