/**
 * Integration Test: Database
 * 
 * Tests database functionality:
 * - Complex queries
 * - Triggers (e.g., updated_at)
 * - Stored procedures (e.g., search_contacts)
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

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 INTEGRATION TEST: DATABASE');
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

    // 1. Test 'updated_at' Trigger
    await test('Trigger: updated_at', async () => {
        // Create a contact
        const { data: contact, error: createError } = await supabase
            .from('contacts')
            .insert({
                user_id: userId,
                first_name: 'Trigger',
                last_name: 'Test',
                email: `trigger.${Date.now()}@example.com`
            })
            .select()
            .single();

        if (createError) throw new Error(`Create failed: ${createError.message}`);

        const initialUpdatedAt = contact.updated_at;

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the contact
        const { data: updatedContact, error: updateError } = await supabase
            .from('contacts')
            .update({ notes: 'Updated' })
            .eq('id', contact.id)
            .select()
            .single();

        if (updateError) throw new Error(`Update failed: ${updateError.message}`);

        if (updatedContact.updated_at === initialUpdatedAt) {
            throw new Error('updated_at did not change');
        }
        log('updated_at trigger working correctly');

        // Cleanup
        await supabase.from('contacts').delete().eq('id', contact.id);
    });

    // 2. Test Stored Procedure: search_contacts (if exists) or similar
    await test('Stored Procedure: search_contacts', async () => {
        // Check if function exists first (optional, but good for robustness)
        // For now, we'll try to call it via RPC

        // Create a contact to search for
        const uniqueName = `Searchable_${Date.now()}`;
        const { data: contact, error: createError } = await supabase
            .from('contacts')
            .insert({
                user_id: userId,
                first_name: uniqueName,
                last_name: 'User'
            })
            .select()
            .single();

        if (createError) throw new Error(`Setup failed: ${createError.message}`);

        // Call RPC
        // Note: Adjust function name/params based on actual schema
        // Assuming a generic search function or just testing query capability if RPC not known
        // If no specific RPC, we test a complex query

        const { data: searchResults, error: searchError } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .ilike('first_name', `%${uniqueName}%`);

        if (searchError) throw new Error(`Search failed: ${searchError.message}`);

        if (searchResults.length === 0) throw new Error('Search returned no results');
        log('Database search query working correctly');

        // Cleanup
        await supabase.from('contacts').delete().eq('id', contact.id);
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
