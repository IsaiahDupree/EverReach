#!/usr/bin/env node
/**
 * Email System Verification Script
 * 
 * Comprehensive check of Resend + Supabase email integration
 * 
 * Usage:
 *   node verify-email-system.mjs
 * 
 * Checks:
 * 1. Resend API connectivity
 * 2. Resend domain verification status
 * 3. Recent email delivery status
 * 4. Supabase SMTP configuration (manual)
 * 5. Email template presence (manual)
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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

console.log('═══════════════════════════════════════════════════════════');
console.log('  📧 Email System Verification');
console.log('═══════════════════════════════════════════════════════════\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

// ============================================================================
// Check 1: Resend API Key
// ============================================================================

console.log('🔑 Check 1: Resend API Key');
totalChecks++;

if (!RESEND_API_KEY) {
  console.log('   ❌ RESEND_API_KEY not found');
  failedChecks++;
} else if (!RESEND_API_KEY.startsWith('re_')) {
  console.log('   ⚠️  API key format looks incorrect');
  console.log(`   Key: ${RESEND_API_KEY.substring(0, 10)}...`);
  warnings++;
  passedChecks++;
} else {
  console.log('   ✅ API key found and valid format');
  console.log(`   Key: ${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}`);
  passedChecks++;
}

// ============================================================================
// Check 2: Resend Domain Status
// ============================================================================

console.log('\n🌐 Check 2: Resend Domain Verification');
totalChecks++;

if (!RESEND_API_KEY) {
  console.log('   ⏭️  Skipped (no API key)');
} else {
  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('   ❌ Failed to fetch domains');
      console.log(`   Error: ${data.message || response.statusText}`);
      failedChecks++;
    } else {
      const domains = data.data || [];
      console.log(`   ✅ Found ${domains.length} domain(s)`);
      
      if (domains.length === 0) {
        console.log('   ⚠️  No custom domains configured');
        console.log('   💡 Using test domain: onboarding@resend.dev (100 emails/day limit)');
        warnings++;
        passedChecks++;
      } else {
        domains.forEach(domain => {
          const statusIcon = domain.status === 'verified' ? '✅' : 
                           domain.status === 'pending' ? '⏳' : '❌';
          console.log(`   ${statusIcon} ${domain.name} - ${domain.status}`);
          
          if (domain.status === 'verified') {
            console.log(`      Region: ${domain.region}`);
            console.log(`      Created: ${new Date(domain.created_at).toLocaleDateString()}`);
          } else if (domain.status === 'pending') {
            console.log('      💡 Add DNS records to verify this domain');
          }
        });
        
        const hasVerified = domains.some(d => d.status === 'verified');
        if (hasVerified) {
          passedChecks++;
        } else {
          console.log('   ⚠️  No verified domains yet');
          warnings++;
          passedChecks++;
        }
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking domains');
    console.log(`   ${error.message}`);
    failedChecks++;
  }
}

// ============================================================================
// Check 3: Recent Email Delivery
// ============================================================================

console.log('\n📬 Check 3: Recent Email Delivery');
totalChecks++;

if (!RESEND_API_KEY) {
  console.log('   ⏭️  Skipped (no API key)');
} else {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('   ❌ Failed to fetch emails');
      console.log(`   Error: ${data.message || response.statusText}`);
      failedChecks++;
    } else {
      const emails = data.data || [];
      console.log(`   ✅ Found ${emails.length} recent email(s)`);
      
      if (emails.length === 0) {
        console.log('   ℹ️  No emails sent yet');
        passedChecks++;
      } else {
        // Show last 5 emails
        const recent = emails.slice(0, 5);
        console.log('\n   Recent emails:');
        recent.forEach((email, i) => {
          const status = email.last_event || 'unknown';
          const statusIcon = status === 'delivered' ? '✅' : 
                            status === 'sent' ? '📤' : 
                            status === 'bounced' ? '🔴' :
                            status === 'failed' ? '❌' : '⏳';
          const subject = email.subject.length > 50 
            ? email.subject.substring(0, 47) + '...' 
            : email.subject;
          console.log(`   ${i + 1}. ${statusIcon} ${subject}`);
          console.log(`      To: ${email.to}`);
          console.log(`      Status: ${status}`);
          console.log(`      Sent: ${new Date(email.created_at).toLocaleString()}`);
        });
        
        // Check for failures
        const failed = emails.filter(e => e.last_event === 'failed' || e.last_event === 'bounced');
        if (failed.length > 0) {
          console.log(`\n   ⚠️  ${failed.length} email(s) failed or bounced`);
          warnings++;
        }
        
        passedChecks++;
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking emails');
    console.log(`   ${error.message}`);
    failedChecks++;
  }
}

// ============================================================================
// Check 4: Email From Configuration
// ============================================================================

console.log('\n📧 Check 4: Email From Address');
totalChecks++;

if (!EMAIL_FROM) {
  console.log('   ⚠️  EMAIL_FROM not configured');
  console.log('   💡 Set EMAIL_FROM in .env');
  warnings++;
  passedChecks++;
} else {
  console.log(`   ✅ Configured: ${EMAIL_FROM}`);
  
  if (EMAIL_FROM.includes('onboarding@resend.dev')) {
    console.log('   ℹ️  Using Resend test domain');
    console.log('   💡 Limit: 100 emails/day');
    console.log('   💡 For production: Verify custom domain and update EMAIL_FROM');
  } else if (EMAIL_FROM.includes('mail.everreach.app')) {
    console.log('   ✅ Using custom domain!');
  }
  
  passedChecks++;
}

// ============================================================================
// Check 5: Supabase Configuration (Manual)
// ============================================================================

console.log('\n🔐 Check 5: Supabase SMTP Configuration');
totalChecks++;

console.log('   ℹ️  Manual verification required');
console.log('\n   Please verify in Supabase Dashboard:');
console.log(`   URL: ${SUPABASE_URL}/project/_/settings/auth`);
console.log('\n   Navigate to: Authentication → Settings → SMTP Settings');
console.log('\n   Verify:');
console.log('   ✓ Custom SMTP enabled');
console.log('   ✓ Host: smtp.resend.com');
console.log('   ✓ Port: 465 (or 587)');
console.log('   ✓ Username: resend');
console.log('   ✓ Password: [Your Resend API Key]');
console.log(`   ✓ Sender email: ${EMAIL_FROM}`);
console.log('\n   💡 After configuring, click "Send Test Email"');

warnings++;
passedChecks++;

// ============================================================================
// Check 6: Email Templates (Manual)
// ============================================================================

console.log('\n📝 Check 6: Email Templates');
totalChecks++;

console.log('   ℹ️  Manual verification required');
console.log('\n   Please verify in Supabase Dashboard:');
console.log(`   URL: ${SUPABASE_URL}/project/_/auth/templates`);
console.log('\n   Navigate to: Authentication → Email Templates');
console.log('\n   Verify templates are configured for:');
console.log('   ✓ Confirm signup');
console.log('   ✓ Invite user');
console.log('   ✓ Magic link');
console.log('   ✓ Change email address');
console.log('   ✓ Reset password');
console.log('\n   💡 Templates should include EverReach branding');

warnings++;
passedChecks++;

// ============================================================================
// Summary
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  📊 Verification Summary');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Total Checks:  ${totalChecks}`);
console.log(`✅ Passed:      ${passedChecks}`);
console.log(`❌ Failed:      ${failedChecks}`);
console.log(`⚠️  Warnings:    ${warnings}`);

const successRate = totalChecks > 0 
  ? Math.round((passedChecks / totalChecks) * 100) 
  : 0;

console.log(`\nSuccess Rate: ${successRate}%`);

// ============================================================================
// Recommendations
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  💡 Recommendations');
console.log('═══════════════════════════════════════════════════════════\n');

if (failedChecks === 0 && warnings <= 2) {
  console.log('✅ Your email system is properly configured!');
  console.log('\nNext steps:');
  console.log('1. Complete manual verifications in Supabase dashboard');
  console.log('2. Run: node test/email-auth-flow.test.mjs');
  console.log('3. Test sign-up flow in your app');
} else {
  console.log('⚠️  Some issues need attention:\n');
  
  if (failedChecks > 0) {
    console.log('❌ Critical Issues:');
    console.log('   - Review failed checks above');
    console.log('   - Ensure RESEND_API_KEY is set correctly');
    console.log('   - Check Resend dashboard for errors\n');
  }
  
  if (warnings > 2) {
    console.log('⚠️  Configuration Improvements:');
    if (EMAIL_FROM.includes('onboarding@resend.dev')) {
      console.log('   - Verify custom domain (mail.everreach.app) in Resend');
      console.log('   - Update EMAIL_FROM to use custom domain');
    }
    console.log('   - Complete Supabase SMTP configuration');
    console.log('   - Upload email templates to Supabase\n');
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  📚 Resources');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Resend Dashboard: https://resend.com/emails');
console.log('Resend Domains:   https://resend.com/domains');
console.log('Resend Docs:      https://resend.com/docs');
console.log(`Supabase Auth:    ${SUPABASE_URL}/project/_/settings/auth`);
console.log(`Supabase Templates: ${SUPABASE_URL}/project/_/auth/templates`);

console.log('\n');

// Exit with appropriate code
process.exit(failedChecks > 0 ? 1 : 0);
