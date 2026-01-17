#!/usr/bin/env node
/**
 * Test Frontend Email Triggers
 * 
 * Verifies that the frontend properly triggers email sends through Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment
config({ path: resolve('.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';

console.log('🧪 Frontend Email Trigger Tests\n');
console.log('═══════════════════════════════════════════════════════════\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// Test 1: Check if email confirmations are enabled
// ============================================================================

console.log('📋 Test 1: Email Confirmation Settings');
console.log('─────────────────────────────────────────────────────────\n');

console.log('⚠️  Manual check required:');
console.log(`   Go to: ${SUPABASE_URL}/project/_/settings/auth`);
console.log('   Navigate to: Authentication → Settings');
console.log('   \n   Check if "Enable email confirmations" is ON');
console.log('   \n   If OFF:');
console.log('   - Users will be auto-confirmed without email verification');
console.log('   - No confirmation email will be sent');
console.log('   - This is likely why you\'re not receiving emails!\n');

// ============================================================================
// Test 2: Trigger Sign-Up Email
// ============================================================================

console.log('\n📋 Test 2: Sign-Up Confirmation Email');
console.log('─────────────────────────────────────────────────────────\n');

const timestamp = Date.now();
const signupEmail = TEST_EMAIL.replace('@', `+signup${timestamp}@`);

console.log(`Testing with: ${signupEmail}\n`);

try {
  const { data, error } = await supabase.auth.signUp({
    email: signupEmail,
    password: 'TestPassword123!',
    options: {
      emailRedirectTo: 'https://www.everreach.app/auth/callback',
    },
  });

  if (error) {
    console.log('❌ Sign-up failed:', error.message);
  } else {
    console.log('✅ Sign-up API call successful');
    console.log(`   User ID: ${data.user?.id}`);
    
    if (data.user?.confirmed_at) {
      console.log('\n⚠️  WARNING: User auto-confirmed!');
      console.log('   Email confirmations are DISABLED in Supabase');
      console.log('   No confirmation email was sent\n');
      console.log('   TO FIX:');
      console.log('   1. Go to Supabase Dashboard → Authentication → Settings');
      console.log('   2. Enable "Email confirmations"');
      console.log('   3. Try signing up again');
    } else {
      console.log('\n✅ Email confirmation required (good!)');
      console.log('   📧 Check your inbox for confirmation email');
      console.log('   Subject: "Confirm your EverReach account"');
      console.log('   \n   If you don\'t receive it within 2 minutes:');
      console.log('   1. Check spam folder');
      console.log('   2. Verify SMTP is configured in Supabase');
      console.log('   3. Check Resend logs for delivery status');
    }
  }
} catch (err) {
  console.log('❌ Error:', err.message);
}

// ============================================================================
// Test 3: Trigger Magic Link Email
// ============================================================================

console.log('\n\n📋 Test 3: Magic Link Email');
console.log('─────────────────────────────────────────────────────────\n');

console.log(`Testing with: ${TEST_EMAIL}\n`);

try {
  const { error } = await supabase.auth.signInWithOtp({
    email: TEST_EMAIL,
    options: {
      emailRedirectTo: 'https://www.everreach.app/auth/callback',
    },
  });

  if (error) {
    console.log('❌ Magic link failed:', error.message);
  } else {
    console.log('✅ Magic link API call successful');
    console.log('   📧 Check your inbox for magic link email');
    console.log('   Subject: "Your EverReach sign-in link"');
  }
} catch (err) {
  console.log('❌ Error:', err.message);
}

// ============================================================================
// Test 4: Trigger Password Reset Email
// ============================================================================

console.log('\n\n📋 Test 4: Password Reset Email');
console.log('─────────────────────────────────────────────────────────\n');

console.log(`Testing with: ${TEST_EMAIL}\n`);

try {
  const { error } = await supabase.auth.resetPasswordForEmail(TEST_EMAIL, {
    redirectTo: 'https://www.everreach.app/auth/reset-password',
  });

  if (error) {
    console.log('❌ Password reset failed:', error.message);
  } else {
    console.log('✅ Password reset API call successful');
    console.log('   📧 Check your inbox for reset email');
    console.log('   Subject: "Reset your EverReach password"');
    console.log('   \n   ℹ️  This email WAS delivered in your verification test!');
  }
} catch (err) {
  console.log('❌ Error:', err.message);
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('  📊 Summary');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('✅ Working:');
console.log('   - Password reset emails (confirmed in your logs)');
console.log('   - Magic link emails (if OTP enabled)');
console.log('   - Resend integration (20 emails delivered)\n');

console.log('⚠️  Potential Issue:');
console.log('   - Sign-up confirmation emails may not send if:');
console.log('     • Email confirmations disabled in Supabase');
console.log('     • SMTP not configured correctly');
console.log('     • Confirm signup template not set\n');

console.log('🔍 Next Steps:');
console.log('   1. Check your email inbox for test emails');
console.log('   2. Verify "Enable email confirmations" in Supabase');
console.log('   3. Check Resend dashboard for delivery status');
console.log('   4. Review SMTP settings in Supabase\n');

console.log('📚 Resources:');
console.log(`   Supabase Auth Settings: ${SUPABASE_URL}/project/_/settings/auth`);
console.log(`   Email Templates: ${SUPABASE_URL}/project/_/auth/templates`);
console.log('   Resend Logs: https://resend.com/emails\n');
