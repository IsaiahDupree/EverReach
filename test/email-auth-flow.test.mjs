#!/usr/bin/env node
/**
 * Automated Tests for Resend + Supabase Email Authentication Flow
 * 
 * Tests:
 * 1. Sign-up confirmation email
 * 2. Password reset email
 * 3. Magic link email
 * 4. Email template rendering
 * 5. Resend delivery
 * 
 * Usage:
 *   node test/email-auth-flow.test.mjs
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 *   - RESEND_API_KEY (for direct Resend tests)
 *   - TEST_EMAIL (email to receive test emails)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';

// Test configuration
const TEST_PASSWORD = 'TestPassword123!';
const TEST_TIMEOUT = 30000; // 30 seconds

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logTest(name) {
  log(`\n📝 Test: ${name}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  warnings: 0,
};

function recordResult(passed, testName, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    logSuccess(`PASS: ${testName}`);
  } else {
    results.failed++;
    logError(`FAIL: ${testName}`);
  }
  if (details) {
    logInfo(details);
  }
}

function recordSkipped(testName, reason) {
  results.total++;
  results.skipped++;
  logWarning(`SKIP: ${testName} - ${reason}`);
}

// ============================================================================
// Test 1: Environment Configuration Check
// ============================================================================

async function testEnvironmentConfig() {
  logTest('Environment Configuration');
  
  const checks = [
    { name: 'SUPABASE_URL', value: SUPABASE_URL },
    { name: 'SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'RESEND_API_KEY', value: RESEND_API_KEY },
    { name: 'TEST_EMAIL', value: TEST_EMAIL },
  ];

  let allPresent = true;
  for (const check of checks) {
    if (!check.value) {
      logError(`Missing: ${check.name}`);
      allPresent = false;
    } else {
      logSuccess(`Found: ${check.name}`);
    }
  }

  recordResult(allPresent, 'Environment variables present');
  return allPresent;
}

// ============================================================================
// Test 2: Supabase Connection
// ============================================================================

async function testSupabaseConnection() {
  logTest('Supabase Connection');

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      logError(`Connection error: ${error.message}`);
      recordResult(false, 'Supabase connection', error.message);
      return false;
    }

    logSuccess('Connected to Supabase');
    recordResult(true, 'Supabase connection');
    return true;
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    recordResult(false, 'Supabase connection', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Sign-Up Confirmation Email
// ============================================================================

async function testSignUpEmail() {
  logTest('Sign-Up Confirmation Email');

  // Use base email without alias to avoid Resend sandbox restrictions
  const testEmail = TEST_EMAIL;

  logInfo(`Testing with email: ${testEmail}`);
  logWarning('Note: Using base email (no +alias) due to Resend sandbox mode');

  try {
    // Attempt sign-up
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: TEST_PASSWORD,
    });

    if (error) {
      // Check for specific Resend sandbox error
      if (error.message.includes('testing emails to your own email address')) {
        logWarning('Resend sandbox mode detected');
        logInfo('💡 To fix: Verify custom domain (mail.everreach.app) in Resend');
        logInfo('   Then update EMAIL_FROM to use custom domain');
        recordResult(false, 'Sign-up confirmation email (sandbox limitation)', error.message);
        return false;
      }
      
      logError(`Sign-up error: ${error.message}`);
      recordResult(false, 'Sign-up confirmation email', error.message);
      return false;
    }

    // Check if user was created
    if (!data.user) {
      logError('User not created');
      recordResult(false, 'Sign-up confirmation email', 'No user returned');
      return false;
    }

    logSuccess(`User created: ${data.user.id}`);
    
    // Check if email confirmation is required
    if (data.user.confirmed_at) {
      logWarning('Email confirmations are DISABLED in Supabase');
      logWarning('User was auto-confirmed without email verification');
      logInfo('💡 To enable: Supabase → Auth → Settings → Enable email confirmations');
      results.warnings++;
      recordResult(true, 'Sign-up flow works (but confirmations disabled)');
      return true;
    }

    logSuccess('Email confirmation required (good!)');
    logInfo('📧 Check your inbox for confirmation email');
    logInfo(`Subject: "Confirm your EverReach account"`);
    logInfo(`Template should include: "Welcome to EverReach! 🎉"`);
    
    recordResult(true, 'Sign-up confirmation email triggered');
    
    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    recordResult(false, 'Sign-up confirmation email', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Password Reset Email
// ============================================================================

async function testPasswordResetEmail() {
  logTest('Password Reset Email');

  const testEmail = TEST_EMAIL;
  logInfo(`Testing with email: ${testEmail}`);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'https://www.everreach.app/auth/reset-password',
    });

    if (error) {
      // Check for SMTP configuration errors
      if (error.message.includes('Error sending recovery email')) {
        logWarning('SMTP not configured in Supabase');
        logInfo('💡 To fix: Supabase → Auth → Settings → SMTP Settings');
        logInfo('   Host: smtp.resend.com, Port: 465');
        logInfo('   Username: resend, Password: [Resend API Key]');
        recordResult(false, 'Password reset email (SMTP not configured)', error.message);
        return false;
      }
      
      logError(`Password reset error: ${error.message}`);
      recordResult(false, 'Password reset email', error.message);
      return false;
    }

    logSuccess('Password reset email sent');
    logInfo('📧 Check your inbox for password reset email');
    logInfo(`Subject: "Reset your EverReach password"`);
    logInfo(`Template should include: "Reset Your Password 🔐"`);
    
    recordResult(true, 'Password reset email triggered');
    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    recordResult(false, 'Password reset email', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Magic Link Email
// ============================================================================

async function testMagicLinkEmail() {
  logTest('Magic Link Email');

  const testEmail = TEST_EMAIL;
  logInfo(`Testing with email: ${testEmail}`);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: 'https://www.everreach.app/auth/callback',
      },
    });

    if (error) {
      // Check for rate limiting
      if (error.message.includes('rate limit exceeded') || error.message.includes('after')) {
        logWarning('Rate limit exceeded');
        logInfo('💡 Supabase throttles auth emails to prevent abuse');
        logInfo('   Wait 15 minutes and re-run this test');
        logInfo('   Or increase limits: Supabase → Auth → Settings → Email rate limit');
        recordResult(false, 'Magic link email (rate limited)', error.message);
        return false;
      }
      
      logError(`Magic link error: ${error.message}`);
      recordResult(false, 'Magic link email', error.message);
      return false;
    }

    logSuccess('Magic link email sent');
    logInfo('📧 Check your inbox for magic link email');
    logInfo(`Subject: "Your EverReach sign-in link"`);
    logInfo(`Template should include: "Your Magic Link is Ready ✨"`);
    
    recordResult(true, 'Magic link email triggered');
    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    recordResult(false, 'Magic link email', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Resend API Integration (Direct Test)
// ============================================================================

async function testResendIntegration() {
  logTest('Resend API Integration');

  if (!RESEND_API_KEY) {
    recordSkipped('Resend API integration', 'RESEND_API_KEY not set');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'EverReach <onboarding@resend.dev>',
        to: TEST_EMAIL,
        subject: '[TEST] EverReach Email System Test',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111827;">✅ Email System Test</h2>
            <p style="color: #6B7280;">This is an automated test email from the EverReach email testing suite.</p>
            <p style="color: #6B7280;">Timestamp: ${new Date().toISOString()}</p>
            <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-top: 20px;">
              <p style="color: #374151; margin: 0;">If you received this email, it means:</p>
              <ul style="color: #6B7280;">
                <li>✅ Resend API is working</li>
                <li>✅ Email delivery is functional</li>
                <li>✅ Templates can render HTML</li>
              </ul>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logError(`Resend API error: ${data.message || response.statusText}`);
      recordResult(false, 'Resend API integration', JSON.stringify(data));
      return false;
    }

    logSuccess(`Email sent via Resend: ${data.id}`);
    logInfo('📧 Check your inbox for test email');
    logInfo(`Subject: "[TEST] EverReach Email System Test"`);
    
    recordResult(true, 'Resend API integration');
    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    recordResult(false, 'Resend API integration', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Check Recent Resend Emails (if API key available)
// ============================================================================

async function checkRecentEmails() {
  logTest('Recent Resend Emails');

  if (!RESEND_API_KEY) {
    recordSkipped('Recent emails check', 'RESEND_API_KEY not set');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logError(`Resend API error: ${data.message || response.statusText}`);
      recordResult(false, 'Recent emails check', JSON.stringify(data));
      return false;
    }

    const emails = data.data || [];
    logInfo(`Found ${emails.length} recent emails`);

    if (emails.length > 0) {
      const recent = emails.slice(0, 5);
      logInfo('\nRecent emails:');
      recent.forEach((email, i) => {
        const status = email.last_event || 'unknown';
        const statusIcon = status === 'delivered' ? '✅' : 
                          status === 'sent' ? '📤' : 
                          status === 'failed' ? '❌' : '⏳';
        console.log(`  ${statusIcon} ${email.subject} (${email.to}) - ${status}`);
      });
    }

    recordResult(true, 'Recent emails check', `${emails.length} emails found`);
    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    recordResult(false, 'Recent emails check', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Email Template Validation
// ============================================================================

async function validateEmailTemplates() {
  logTest('Email Template Validation');

  const templateChecks = [
    {
      name: 'Confirm Sign Up',
      keywords: ['Welcome to EverReach', '🎉', 'Confirm Email Address'],
    },
    {
      name: 'Password Reset',
      keywords: ['Reset Your Password', '🔐', 'Reset Password'],
    },
    {
      name: 'Magic Link',
      keywords: ['Your Magic Link is Ready', '✨', 'Sign In to EverReach'],
    },
  ];

  logInfo('This test requires manual verification in Supabase dashboard');
  logInfo('Go to: Authentication → Email Templates');
  logInfo('\nVerify each template contains:');
  
  templateChecks.forEach(({ name, keywords }) => {
    console.log(`\n  📧 ${name}:`);
    keywords.forEach(keyword => {
      console.log(`     - "${keyword}"`);
    });
  });

  logInfo('\n⚠️  Manual verification required - marking as warning');
  results.warnings++;
  
  return true;
}

// ============================================================================
// Test 9: SMTP Configuration Check
// ============================================================================

async function checkSMTPConfig() {
  logTest('SMTP Configuration Check');

  logInfo('This test requires manual verification in Supabase dashboard');
  logInfo('Go to: Authentication → Settings → SMTP Settings');
  logInfo('\nVerify configuration:');
  console.log('  ✅ Custom SMTP enabled');
  console.log('  ✅ Host: smtp.resend.com');
  console.log('  ✅ Port: 465 (or 587)');
  console.log('  ✅ Username: resend');
  console.log('  ✅ Password: [Your Resend API Key]');
  console.log('  ✅ Sender email configured');

  logInfo('\n⚠️  Manual verification required - marking as warning');
  results.warnings++;
  
  return true;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  logSection('🧪 EverReach Email Authentication Tests');

  logInfo(`Test Email: ${TEST_EMAIL}`);
  logInfo(`Supabase URL: ${SUPABASE_URL}`);
  logInfo(`Timeout: ${TEST_TIMEOUT}ms\n`);

  // Run tests sequentially
  const tests = [
    { name: 'Environment Config', fn: testEnvironmentConfig },
    { name: 'Supabase Connection', fn: testSupabaseConnection },
    { name: 'Sign-Up Email', fn: testSignUpEmail },
    { name: 'Password Reset Email', fn: testPasswordResetEmail },
    { name: 'Magic Link Email', fn: testMagicLinkEmail },
    { name: 'Resend Integration', fn: testResendIntegration },
    { name: 'Recent Emails', fn: checkRecentEmails },
    { name: 'Email Templates', fn: validateEmailTemplates },
    { name: 'SMTP Config', fn: checkSMTPConfig },
  ];

  for (const test of tests) {
    try {
      await test.fn();
    } catch (error) {
      logError(`Unhandled error in ${test.name}: ${error.message}`);
      recordResult(false, test.name, error.message);
    }
  }

  // Print summary
  logSection('📊 Test Summary');
  
  console.log(`Total Tests:  ${results.total}`);
  logSuccess(`Passed:       ${results.passed}`);
  logError(`Failed:       ${results.failed}`);
  logWarning(`Skipped:      ${results.skipped}`);
  logWarning(`Warnings:     ${results.warnings}`);
  
  const successRate = results.total > 0 
    ? Math.round((results.passed / results.total) * 100) 
    : 0;
  
  console.log(`\nSuccess Rate: ${successRate}%`);

  if (results.failed === 0) {
    logSection('✅ All Tests Passed!');
    logInfo('\nNext Steps:');
    console.log('1. Check your inbox for test emails');
    console.log('2. Verify email templates in Supabase dashboard');
    console.log('3. Test sign-up flow in production');
  } else {
    logSection('❌ Some Tests Failed');
    logError('\nPlease review the errors above and:');
    console.log('1. Check Supabase SMTP configuration');
    console.log('2. Verify Resend API key is correct');
    console.log('3. Enable email confirmations in Supabase');
    console.log('4. Review error messages for specific issues');
  }

  console.log('\n');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
