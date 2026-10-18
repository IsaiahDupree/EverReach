/**
 * Functional Test: Contacts & CRM
 * 
 * Tests core CRM functionality:
 * - Contact CRUD operations
 * - Contact Search
 * - Interaction logging
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
    console.log('🎯 FUNCTIONAL TEST: CONTACTS & CRM');
    console.log('='.repeat(70));

    let token;
    let createdContactId;

    try {
        log('Authenticating test user...');
        token = await authenticateTestUser();
        success('Authenticated successfully');
    } catch (error) {
        fail(`Authentication failed: ${error.message}`);
        process.exit(1);
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 1. Create Contact
    await test('Create Contact', async () => {
        const contactData = {
            first_name: 'Test',
            last_name: `User_${Date.now()}`,
            email: `test.user.${Date.now()}@example.com`,
            phone: '+15551234567',
            notes: 'Created via functional test'
        };

        const data = await apiCall('/api/v1/contacts', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(contactData)
        });

        if (!data.id) throw new Error('No contact ID returned');
        createdContactId = data.id;
        log(`Created contact ID: ${createdContactId}`);
    });

    // 2. Get Contact
    await test('Get Contact', async () => {
        if (!createdContactId) throw new Error('No contact ID to fetch');

        const data = await apiCall(`/api/v1/contacts/${createdContactId}`, {
            headers: authHeaders
        });

        if (data.id !== createdContactId) throw new Error('ID mismatch');
        log(`Fetched contact: ${data.first_name} ${data.last_name}`);
    });

    // 3. Update Contact
    await test('Update Contact', async () => {
        if (!createdContactId) throw new Error('No contact ID to update');

        const updateData = {
            notes: 'Updated via functional test'
        };

        const data = await apiCall(`/api/v1/contacts/${createdContactId}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify(updateData)
        });

        if (data.notes !== updateData.notes) throw new Error('Notes not updated');
        log('Contact updated successfully');
    });

    // 4. Search Contacts
    await test('Search Contacts', async () => {
        const data = await apiCall('/api/v1/contacts/search?query=Test', {
            headers: authHeaders
        });

        if (!Array.isArray(data.results)) throw new Error('Invalid search results format');
        log(`Found ${data.results.length} contacts matching 'Test'`);
    });

    // 5. Add Interaction
    await test('Add Interaction', async () => {
        if (!createdContactId) throw new Error('No contact ID for interaction');

        const interactionData = {
            contact_id: createdContactId,
            type: 'note',
            content: 'Test interaction',
            date: new Date().toISOString()
        };

        const data = await apiCall('/api/interactions', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(interactionData)
        });

        if (!data.id) throw new Error('No interaction ID returned');
        log('Interaction added successfully');
    });

    // 6. Delete Contact
    await test('Delete Contact', async () => {
        if (!createdContactId) throw new Error('No contact ID to delete');

        await apiCall(`/api/v1/contacts/${createdContactId}`, {
            method: 'DELETE',
            headers: authHeaders
        });

        log('Contact deleted successfully');
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
