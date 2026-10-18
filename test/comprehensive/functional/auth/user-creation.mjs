/**
 * Functional Test: User Account Creation & Auth
 * 
 * Tests authentication flows:
 * - User Signup (success, duplicate email)
 * - Login/Logout
 * - Session validation
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

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 FUNCTIONAL TEST: USER ACCOUNT CREATION & AUTH');
    console.log('='.repeat(70));

    const testEmail = `test.user.${Date.now()}@test.everreach.app`;
    const testPassword = 'TestPassword123!';
    let userId;

    // 1. User Signup (Success)
    await test('User Signup (Success)', async () => {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        if (error) throw new Error(`Signup failed: ${error.message}`);
        if (!data.user) throw new Error('No user returned after signup');

        userId = data.user.id;
        log(`User created: ${userId}`);

        // Note: If email confirmation is enabled, user might not be able to login immediately
        // For test env, usually auto-confirm is on or we use admin API to confirm
    });

    // 2. User Signup (Duplicate Email)
    await test('User Signup (Duplicate Email)', async () => {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        // Supabase might return success but send "User already registered" email for security
        // Or return error depending on config.
        // If it returns a user with same ID, that's also a sign (or just existing user ref)

        if (data.user && data.user.id === userId) {
            log('Duplicate signup handled (returned existing user or sent email)');
        } else if (error) {
            log(`Duplicate signup rejected: ${error.message}`);
        } else {
            // If it created a NEW user with same email, that's a bug
            if (data.user && data.user.id !== userId) {
                throw new Error('Created duplicate user with same email!');
            }
        }
    });

    // 3. Login (Success)
    await test('Login (Success)', async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (error) throw new Error(`Login failed: ${error.message}`);
        if (!data.session) throw new Error('No session returned');
        log('Login successful');
    });

    // 4. Login (Invalid Password)
    await test('Login (Invalid Password)', async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'WrongPassword123!',
        });

        if (!error) throw new Error('Login succeeded with wrong password');
        log('Login correctly rejected invalid password');
    });

    // Cleanup (Delete User)
    // Requires service role key usually, or user deleting themselves
    // We'll try to have user delete themselves if endpoint exists, or just leave it (test env)
    // For comprehensive test, we might skip cleanup if we don't have admin key in this script context
    // But we can try to sign out

    await supabase.auth.signOut();

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
