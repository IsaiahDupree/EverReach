#!/usr/bin/env node
/**
 * Email Setup Verification Script
 * 
 * Tests Resend integration and email template configuration
 * 
 * Usage:
 *   node test-email-setup.mjs
 *   node test-email-setup.mjs --send-test (actually sends test email)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
const envFiles = ['.env.local', '.env'];
let envLoaded = false;

for (const envFile of envFiles) {
  try {
    const envPath = resolve(envFile);
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        value = value.replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log(`✅ Loaded environment from ${envFile}\n`);
    envLoaded = true;
    break;
  } catch (err) {
    continue;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Could not load any .env file\n');
}

const args = process.argv.slice(2);
const shouldSendTest = args.includes('--send-test');

console.log('═══════════════════════════════════════════════════════════');
console.log('  Email Setup Verification');
console.log('═══════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
let warnings = 0;

// Test 1: Check Resend API Key
console.log('📧 Test 1: Resend API Key Configuration');
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.log('   ❌ RESEND_API_KEY not found in environment');
  console.log('   💡 Add to .env.local: RESEND_API_KEY=re_...\n');
  failed++;
} else if (!resendApiKey.startsWith('re_')) {
  console.log('   ⚠️  RESEND_API_KEY format looks incorrect');
  console.log('   💡 Should start with "re_"\n');
  warnings++;
} else {
  console.log('   ✅ RESEND_API_KEY found');
  console.log(`   Key: ${resendApiKey.substring(0, 10)}...${resendApiKey.substring(resendApiKey.length - 4)}\n`);
  passed++;
}

// Test 2: Check Email From Address
console.log('📬 Test 2: Email From Address');
const emailFrom = process.env.EMAIL_FROM;

if (!emailFrom) {
  console.log('   ⚠️  EMAIL_FROM not configured');
  console.log('   💡 Recommended: EMAIL_FROM=EverReach <noreply@mail.everreach.app>\n');
  warnings++;
} else {
  console.log('   ✅ EMAIL_FROM configured');
  console.log(`   From: ${emailFrom}\n`);
  
  if (emailFrom.includes('onboarding@resend.dev')) {
    console.log('   💡 Using Resend test domain (100 emails/day limit)');
    console.log('   💡 For production, configure custom domain\n');
  }
  passed++;
}

// Test 3: Check Supabase Configuration
console.log('🔐 Test 3: Supabase Configuration');
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('   ❌ Supabase credentials missing');
  console.log('   💡 Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n');
  failed++;
} else {
  console.log('   ✅ Supabase credentials found');
  console.log(`   URL: ${supabaseUrl}\n`);
  passed++;
}

// Test 4: Check Email Library
console.log('📚 Test 4: Email Library Code');
try {
  const emailLibPath = resolve('backend-vercel/lib/email.ts');
  const emailLib = readFileSync(emailLibPath, 'utf8');
  
  if (emailLib.includes('Resend')) {
    console.log('   ✅ Resend import found');
    passed++;
  } else {
    console.log('   ❌ Resend not imported in email.ts');
    failed++;
  }
  
  const functions = [
    'sendWelcomeEmail',
    'sendPasswordResetEmail',
    'sendMagicLinkEmail',
    'sendEmailChangeEmail',
  ];
  
  let foundFunctions = 0;
  functions.forEach(fn => {
    if (emailLib.includes(fn)) {
      foundFunctions++;
    }
  });
  
  console.log(`   Found ${foundFunctions}/${functions.length} email functions\n`);
  
} catch (err) {
  console.log('   ⚠️  Could not read backend-vercel/lib/email.ts');
  console.log(`   Error: ${err.message}\n`);
  warnings++;
}

// Test 5: Send Test Email (if requested)
if (shouldSendTest && resendApiKey) {
  console.log('📤 Test 5: Sending Test Email');
  
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    console.log(`   Sending to: ${testEmail}...`);
    
    const { data, error } = await resend.emails.send({
      from: emailFrom || 'onboarding@resend.dev',
      to: testEmail,
      subject: 'EverReach Email Test',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #7C3AED;">✅ Email Setup Working!</h2>
          <p>Your Resend integration is configured correctly.</p>
          <p><strong>Tested at:</strong> ${new Date().toISOString()}</p>
          <hr style="border: 1px solid #E5E7EB; margin: 24px 0;">
          <p style="color: #6B7280; font-size: 14px;">
            This is a test email from your EverReach backend.
          </p>
        </div>
      `,
    });
    
    if (error) {
      console.log('   ❌ Failed to send test email');
      console.log(`   Error: ${error.message}\n`);
      failed++;
    } else {
      console.log('   ✅ Test email sent successfully!');
      console.log(`   Email ID: ${data.id}`);
      console.log(`   Check inbox: ${testEmail}\n`);
      passed++;
    }
    
  } catch (err) {
    console.log('   ❌ Error sending test email');
    console.log(`   Error: ${err.message}`);
    console.log('   💡 Make sure "resend" package is installed: npm install resend\n');
    failed++;
  }
}

// Test 6: Verify Supabase Email Templates (guidance)
console.log('📝 Test 6: Supabase Email Templates');
console.log('   ℹ️  Manual verification required:');
console.log('   1. Go to Supabase Dashboard → Authentication → Email Templates');
console.log('   2. Check these templates are configured:');
console.log('      - Confirm signup');
console.log('      - Invite user');
console.log('      - Magic link');
console.log('      - Change email address');
console.log('      - Reset password');
console.log('   3. Verify SMTP settings under Authentication → Settings');
console.log('      - Host: smtp.resend.com');
console.log('      - Port: 465');
console.log('      - Username: resend');
console.log('      - Password: [Your Resend API Key]\n');

// Summary
console.log('═══════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Passed: ${passed}`);
if (warnings > 0) console.log(`⚠️  Warnings: ${warnings}`);
if (failed > 0) console.log(`❌ Failed: ${failed}`);
console.log('');

if (failed === 0 && warnings === 0) {
  console.log('🎉 All tests passed! Your email setup looks good.');
} else if (failed === 0) {
  console.log('✅ Core configuration working, but there are some warnings.');
} else {
  console.log('❌ Some tests failed. Please review the issues above.');
}

console.log('');

// Next steps
if (!shouldSendTest && resendApiKey) {
  console.log('💡 Next Steps:');
  console.log('   Run: node test-email-setup.mjs --send-test');
  console.log('   This will send a real test email to verify delivery.\n');
}

if (failed === 0 && passed >= 3) {
  console.log('📖 Documentation:');
  console.log('   - Setup Guide: docs/RESEND_EMAIL_SETUP.md');
  console.log('   - Email Templates: docs/SUPABASE_EMAIL_TEMPLATES.md');
  console.log('   - Resend Dashboard: https://resend.com/emails\n');
}

process.exit(failed > 0 ? 1 : 0);
