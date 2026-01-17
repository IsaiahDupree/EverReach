#!/usr/bin/env node
/**
 * Quick Email Test
 * 
 * Tests Resend email sending
 * 
 * Usage:
 *   cd backend-vercel
 *   node test-email.mjs your-email@example.com
 */

import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment
const envPath = resolve(__dirname, '..', '.env');
try {
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
} catch (err) {
  console.error('Failed to load .env file');
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';

console.log('═══════════════════════════════════════════════════════════');
console.log('  Resend Email Test');
console.log('═══════════════════════════════════════════════════════════\n');

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in environment');
  console.error('   Add to .env: RESEND_API_KEY=re_...\n');
  process.exit(1);
}

console.log(`📧 From: ${EMAIL_FROM}`);
console.log(`📬 To: ${testEmail}`);
console.log(`🔑 API Key: ${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}\n`);

const resend = new Resend(RESEND_API_KEY);

console.log('📤 Sending test email...\n');

try {
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: testEmail,
    subject: '✅ EverReach Email Test',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <div style="text-align: center; margin-bottom: 32px;">
          <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0;">
            ✅ Email Setup Working!
          </h2>
          <p style="color: #6B7280; font-size: 16px; margin: 0;">
            Your Resend integration is configured correctly
          </p>
        </div>

        <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
            <strong>Configuration Details:</strong>
          </p>
          <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>API Key: ${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}</li>
            <li>From: ${EMAIL_FROM}</li>
            <li>Tested at: ${new Date().toISOString()}</li>
          </ul>
        </div>

        <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
          <p style="color: #6B7280; font-size: 14px; margin: 0;">
            <strong style="color: #374151;">✨ Next Steps:</strong><br>
            1. Configure SMTP in Supabase Dashboard<br>
            2. Apply email templates<br>
            3. Test auth flows (signup, password reset)
          </p>
        </div>

        <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
          <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
            This is a test email from your EverReach backend
          </p>
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            💜 Stay connected with the people who matter most
          </p>
        </div>

      </div>
    `,
  });

  if (error) {
    console.error('❌ Failed to send email\n');
    console.error('Error:', error);
    console.error('');
    process.exit(1);
  }

  console.log('✅ Email sent successfully!\n');
  console.log('📋 Details:');
  console.log(`   Email ID: ${data.id}`);
  console.log(`   To: ${testEmail}`);
  console.log(`   From: ${EMAIL_FROM}\n`);
  
  console.log('💡 Next Steps:');
  console.log('   1. Check your inbox (might be in spam)');
  console.log('   2. View in Resend Dashboard: https://resend.com/emails');
  console.log(`   3. Email ID: ${data.id}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ Test Complete');
  console.log('═══════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('❌ Unexpected error:\n');
  console.error(error);
  console.error('');
  process.exit(1);
}
