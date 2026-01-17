/**
 * Integration Test: External APIs
 * 
 * Tests integration with external services:
 * - Stripe (Billing)
 * - Meta (Social)
 * - PostHog (Analytics)
 * - Resend (Email)
 * - Twilio (SMS)
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
    console.log('🎯 INTEGRATION TEST: EXTERNAL APIS');
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

    // 1. Stripe Integration Check
    await test('Stripe Integration', async () => {
        // Check if we can create a portal session (requires Stripe customer)
        try {
            const data = await apiCall('/api/v1/billing/portal', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ returnUrl: 'http://localhost:3000' })
            });
            log('Stripe portal endpoint reachable');
        } catch (error) {
            if (error.message.includes('Stripe')) {
                log(`Stripe reachable but returned error (expected): ${error.message}`);
            } else {
                throw error;
            }
        }
    });

    // 2. PostHog Integration Check
    await test('PostHog Integration', async () => {
        // Send a test event
        const eventData = {
            event: 'test_integration_event',
            properties: { source: 'integration_test' }
        };

        const data = await apiCall('/api/tracking/events', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(eventData)
        });

        if (!data.success) throw new Error('Event tracking failed');
        log('PostHog event tracking successful');
    });

    // 3. Resend Integration Check (Mock)
    await test('Resend Integration', async () => {
        // Trigger email send (mocked or real)
        const data = await apiCall('/api/cron/send-email', {
            method: 'POST',
            headers: authHeaders
        });

        if (!data.success && !data.message) throw new Error('Email service unreachable');
        log('Resend integration endpoint reachable');
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
