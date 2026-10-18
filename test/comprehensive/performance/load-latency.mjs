/**
 * Performance Test: Load & Latency
 * 
 * Tests API performance:
 * - Latency checks (response time < 500ms)
 * - Load simulation (concurrent requests)
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
    const start = Date.now();
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    const duration = Date.now() - start;

    return { response, duration };
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 PERFORMANCE TEST: LOAD & LATENCY');
    console.log('='.repeat(70));

    // 1. Latency Check (Health Endpoint)
    await test('Latency Check (Health)', async () => {
        const { duration } = await apiCall('/api/health');

        log(`Response time: ${duration}ms`);
        if (duration > 500) {
            throw new Error(`Latency too high: ${duration}ms > 500ms`);
        }
    });

    // 2. Load Simulation (Concurrent Requests)
    await test('Load Simulation (10 Concurrent Requests)', async () => {
        const CONCURRENT_REQUESTS = 10;
        const promises = [];

        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            promises.push(apiCall('/api/health'));
        }

        const results = await Promise.all(promises);

        const avgDuration = results.reduce((acc, curr) => acc + curr.duration, 0) / CONCURRENT_REQUESTS;
        const maxDuration = Math.max(...results.map(r => r.duration));

        log(`Average duration: ${avgDuration.toFixed(2)}ms`);
        log(`Max duration: ${maxDuration}ms`);

        if (avgDuration > 1000) {
            throw new Error(`Average load latency too high: ${avgDuration}ms > 1000ms`);
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
