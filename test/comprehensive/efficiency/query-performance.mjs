/**
 * Efficiency Test: Query Performance & Data Sourcing
 * 
 * Tests backend efficiency:
 * - Query performance (execution time of complex endpoints)
 * - Data sourcing verification (consistency with Supabase)
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
    const start = Date.now();
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    const duration = Date.now() - start;

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${data.error || data.message || 'Unknown'}`);
    }

    return { data, duration };
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 EFFICIENCY TEST: QUERY PERFORMANCE & DATA SOURCING');
    console.log('='.repeat(70));

    let token;
    let userId;

    try {
        log('Authenticating test user...');
        const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
        const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (error) throw new Error(`Auth failed: ${error.message}`);
        token = data.session.access_token;
        userId = data.user.id;
        success('Authenticated successfully');
    } catch (error) {
        fail(`Authentication failed: ${error.message}`);
        process.exit(1);
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 1. Complex Query Performance (Dashboard Stats)
    await test('Complex Query Performance (Dashboard)', async () => {
        // Dashboard stats usually involve aggregations (counts, sums)
        const { duration } = await apiCall('/api/v1/marketing/analytics', {
            headers: authHeaders
        });

        log(`Dashboard stats query time: ${duration}ms`);

        // Complex queries might take longer than simple ones, but should still be reasonable
        if (duration > 1500) {
            throw new Error(`Query too slow: ${duration}ms > 1500ms`);
        }
    });

    // 2. Data Sourcing Verification (Supabase Consistency)
    await test('Data Sourcing Verification', async () => {
        // 1. Create a contact via Supabase directly
        const uniqueNote = `Consistency_Check_${Date.now()}`;
        const { data: contact, error: createError } = await supabase
            .from('contacts')
            .insert({
                user_id: userId,
                first_name: 'Data',
                last_name: 'Source',
                email: `source.${Date.now()}@example.com`,
                notes: uniqueNote
            })
            .select()
            .single();

        if (createError) throw new Error(`Direct DB insert failed: ${createError.message}`);
        log('Created contact directly in Supabase');

        // 2. Fetch via API immediately
        const { data: apiContact, duration } = await apiCall(`/api/v1/contacts/${contact.id}`, {
            headers: authHeaders
        });

        log(`API fetch time: ${duration}ms`);

        // 3. Verify data matches
        if (apiContact.notes !== uniqueNote) {
            throw new Error('Data mismatch: API returned different data than DB');
        }
        log('API returned correct data sourced from Supabase');

        // Cleanup
        await supabase.from('contacts').delete().eq('id', contact.id);
    });

    // 3. Large Dataset Pagination Efficiency
    await test('Pagination Efficiency', async () => {
        // Fetch page 1
        const { duration: page1Time } = await apiCall('/api/v1/contacts?page=1&limit=10', {
            headers: authHeaders
        });

        // Fetch page 2
        const { duration: page2Time } = await apiCall('/api/v1/contacts?page=2&limit=10', {
            headers: authHeaders
        });

        log(`Page 1 time: ${page1Time}ms`);
        log(`Page 2 time: ${page2Time}ms`);

        // Pagination should be consistently fast (O(limit) with index)
        // If page 2 is significantly slower (e.g. O(offset)), it might be an issue for huge datasets
        // But for now, just check it's not terrible
        if (page2Time > 1000) {
            log('⚠️ Warning: Pagination seems slow');
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
