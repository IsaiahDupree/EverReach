/**
 * System Test: User Journeys
 * 
 * Tests full end-to-end user flows:
 * - Signup (simulated via auth)
 * - Core usage (Create Contact -> Interaction)
 * - Search & Retrieval
 * - Cleanup
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
    console.log('🎯 SYSTEM TEST: USER JOURNEY (CORE FLOW)');
    console.log('='.repeat(70));

    let token;
    let contactId;

    try {
        log('Authenticating test user...');
        token = await authenticateTestUser();
        success('Authenticated successfully');
    } catch (error) {
        fail(`Authentication failed: ${error.message}`);
        process.exit(1);
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // E2E Flow: New Contact -> Interaction -> Search -> Delete
    await test('E2E Flow: Contact Lifecycle', async () => {
        // 1. Create Contact
        log('Step 1: Creating Contact...');
        const contactData = {
            first_name: 'Journey',
            last_name: `User_${Date.now()}`,
            email: `journey.${Date.now()}@example.com`
        };

        const createRes = await apiCall('/api/v1/contacts', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(contactData)
        });

        contactId = createRes.id;
        if (!contactId) throw new Error('Failed to create contact');
        log(`Contact created: ${contactId}`);

        // 2. Add Interaction
        log('Step 2: Adding Interaction...');
        const interactionData = {
            contact_id: contactId,
            type: 'call',
            content: 'Intro call',
            date: new Date().toISOString()
        };

        const interactRes = await apiCall('/api/interactions', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(interactionData)
        });

        if (!interactRes.id) throw new Error('Failed to add interaction');
        log('Interaction added');

        // 3. Search to Verify
        log('Step 3: Searching...');
        const searchRes = await apiCall('/api/v1/contacts/search?query=Journey', {
            headers: authHeaders
        });

        const found = searchRes.results.find(c => c.id === contactId);
        if (!found) throw new Error('Contact not found in search');
        log('Contact found in search');

        // 4. Delete Contact
        log('Step 4: Deleting Contact...');
        await apiCall(`/api/v1/contacts/${contactId}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        log('Contact deleted');

        // Verify Deletion
        try {
            await apiCall(`/api/v1/contacts/${contactId}`, { headers: authHeaders });
            throw new Error('Contact still exists after deletion');
        } catch (e) {
            if (e.message.includes('404')) {
                log('Deletion verified (404 returned)');
            } else {
                throw e;
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
