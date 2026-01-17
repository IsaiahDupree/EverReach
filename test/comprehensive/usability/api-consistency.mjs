/**
 * Usability Test: API Consistency
 * 
 * Tests API usability and consistency:
 * - Error message format consistency
 * - Status code usage (200 vs 201 vs 404)
 * - Data structure consistency (snake_case vs camelCase)
 */

import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.TEST_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(msg) {
    console.log(`  ${msg}`);
}

function success(msg) {
    console.log(`  ✅ ${msg}`);
    testResults.passed++;
}

function fail(msg) {
    console.error(`  ❌ ${msg}`);
    testResults.failed++;
}

async function test(name, fn) {
    console.log(`\n🧪 ${name}`);
    const start = Date.now();
    try {
        await fn();
        const duration = Date.now() - start;
        testResults.tests.push({ name, passed: true, duration });
        success(`Passed (${duration}ms)`);
    } catch (error) {
        const duration = Date.now() - start;
        testResults.tests.push({ name, passed: false, duration, error: error.message });
        fail(`Failed: ${error.message}`);
    }
}

async function apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    const data = await response.json();
    return { response, data };
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 USABILITY TEST: API CONSISTENCY');
    console.log('='.repeat(70));

    // 1. Error Format Consistency
    await test('Error Format Consistency', async () => {
        // Trigger 404
        const { response, data } = await apiCall('/api/non-existent-endpoint');

        if (response.status !== 404) {
            throw new Error(`Expected 404, got ${response.status}`);
        }

        // Check if error follows standard format { error: "message" } or { message: "message" }
        if (!data.error && !data.message) {
            throw new Error('Error response missing standard "error" or "message" field');
        }
        log(`Error format verified: ${JSON.stringify(data)}`);
    });

    // 2. Success Status Code Consistency
    await test('Success Status Code (GET)', async () => {
        const { response } = await apiCall('/api/health');

        if (response.status !== 200) {
            throw new Error(`Expected 200 for GET success, got ${response.status}`);
        }
        log('GET success returns 200 OK');
    });

    // 3. Data Structure Consistency (Case Check)
    await test('Data Structure Consistency (Snake Case)', async () => {
        // Check a standard endpoint for consistent casing (assuming snake_case for DB fields)
        const { data } = await apiCall('/api/health');

        // Health usually returns { status: 'ok' } or similar
        // Let's check keys
        const keys = Object.keys(data);
        const hasCamelCase = keys.some(k => /[a-z][A-Z]/.test(k));

        if (hasCamelCase) {
            log('⚠️ Warning: Response contains camelCase keys (DB usually snake_case)');
        } else {
            log('Response keys appear consistent (no camelCase detected)');
        }
    });

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);

    if (testResults.failed > 0) process.exit(1);
}

main().catch(console.error);
