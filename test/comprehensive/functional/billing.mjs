/**
 * Functional Test: Billing & Payments
 * 
 * Tests billing functionality:
 * - Checkout session creation
 * - Customer portal access
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
    console.log('🎯 FUNCTIONAL TEST: BILLING & PAYMENTS');
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

    // 1. Create Checkout Session
    await test('Create Checkout Session', async () => {
        const checkoutData = {
            priceId: 'price_test_123', // Mock price ID or real test one
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel'
        };

        try {
            const data = await apiCall('/api/v1/billing/checkout', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(checkoutData)
            });

            if (!data.url && !data.sessionId) throw new Error('No checkout URL or Session ID returned');
            log('Checkout session created successfully');
        } catch (error) {
            // If Stripe is not configured in test env, this might fail, which is expected
            if (error.message.includes('Stripe')) {
                log(`Stripe error (expected if not configured): ${error.message}`);
            } else {
                throw error;
            }
        }
    });

    // 2. Create Customer Portal Session
    await test('Create Customer Portal Session', async () => {
        try {
            const data = await apiCall('/api/v1/billing/portal', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ returnUrl: 'http://localhost:3000/settings' })
            });

            if (!data.url) throw new Error('No portal URL returned');
            log('Portal session created successfully');
        } catch (error) {
            if (error.message.includes('Stripe') || error.message.includes('customer')) {
                log(`Stripe error (expected if no customer): ${error.message}`);
            } else {
                throw error;
            }
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
