/**
 * Functional Test: Campaign Automation
 * 
 * Tests campaign functionality:
 * - Campaign scheduling
 * - Email/SMS sending (mocked/dry-run)
 * - Metrics tracking
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

async function authenticateTestUser() {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

    const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });

    if (error) throw new Error(`Auth failed: ${error.message}`);
    return data.session.access_token;
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

    if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${data.error || data.message || 'Unknown'}`);
    }

    return data;
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 FUNCTIONAL TEST: CAMPAIGN AUTOMATION');
    console.log('='.repeat(70));

    let token;

    try {
        log('Authenticating test user...');
        token = await authenticateTestUser();
        success('Authenticated successfully');
    } catch (error) {
        fail(`Authentication failed: ${error.message}`);
        process.exit(1);
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 1. Trigger Campaign Run (Manual)
    await test('Trigger Campaign Run', async () => {
        // This endpoint triggers the campaign runner manually
        const data = await apiCall('/api/cron/run-campaigns', {
            method: 'POST',
            headers: authHeaders
        });

        if (!data.success && !data.message) throw new Error('Campaign run failed');
        log('Campaign runner triggered successfully');
    });

    // 2. Schedule Email (Mock)
    await test('Schedule Email', async () => {
        // Assuming an endpoint to schedule or send email exists or using the cron
        // For functional test, we might check if the cron endpoint accepts the request
        const data = await apiCall('/api/cron/send-email', {
            method: 'POST',
            headers: authHeaders
        });

        if (!data.success && !data.message) throw new Error('Email sender failed');
        log('Email sender triggered successfully');
    });

    // 3. Sync Metrics
    await test('Sync Campaign Metrics', async () => {
        const data = await apiCall('/api/cron/sync-email-metrics', {
            method: 'POST',
            headers: authHeaders
        });

        if (!data.success && !data.message) throw new Error('Metrics sync failed');
        log('Metrics sync triggered successfully');
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
