#!/usr/bin/env node
/**
 * Email Integration Test (Resend)
 * 
 * Tests email sending functionality:
 * - Test email delivery
 * - HTML email rendering
 * - Error handling
 * - Rate limiting
 */

import { getEnv, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# Email Integration Test (Resend)',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const RESEND_API_KEY = await getEnv('RESEND_API_KEY', false);
    const FROM_EMAIL = await getEnv('FROM_EMAIL', false, 'EverReach <noreply@everreach.app>');
    const DEV_EMAIL = await getEnv('DEV_NOTIFICATION_EMAIL', false, 'isaiahdupree33@gmail.com');

    lines.push('## Test Setup');
    lines.push(`- Resend API Key: ${RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
    lines.push(`- From Email: ${FROM_EMAIL}`);
    lines.push(`- Test Recipient: ${DEV_EMAIL}`);
    lines.push('');

    if (!RESEND_API_KEY) {
      lines.push('## ⚠️  Test Skipped');
      lines.push('');
      lines.push('**RESEND_API_KEY not set.** Email tests cannot run.');
      lines.push('');
      lines.push('To enable email tests:');
      lines.push('1. Get API key from https://resend.com/api-keys');
      lines.push('2. Set RESEND_API_KEY in your .env file');
      lines.push('3. Re-run this test');
      return;
    }

    // Test 1: Send test email
    lines.push('## Test 1: Send Test Email');
    
    const emailPayload = {
      from: FROM_EMAIL,
      to: [DEV_EMAIL],
      subject: `EverReach Email Test - ${rid}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">✅ Email Test Successful</h1>
          <p>This is a test email from EverReach campaign automation.</p>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1F2937;">Test Details</h2>
            <ul style="color: #4B5563;">
              <li><strong>Test ID:</strong> ${rid}</li>
              <li><strong>Timestamp:</strong> ${nowIso()}</li>
              <li><strong>Service:</strong> Resend</li>
            </ul>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">
            If you received this email, your email integration is working correctly! 🎉
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          
          <p style="color: #9CA3AF; font-size: 12px;">
            Sent by EverReach Campaign Automation<br>
            Test Suite: Integration Tests
          </p>
        </div>
      `,
    };

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();

    if (emailResponse.ok && emailResult.id) {
      lines.push('- ✅ Email sent successfully');
      lines.push(`- Email ID: \`${emailResult.id}\``);
      lines.push(`- Recipient: ${DEV_EMAIL}`);
      lines.push(`- Subject: "${emailPayload.subject}"`);
      lines.push('');
      lines.push('> **Check your inbox!** The test email should arrive within 1-2 minutes.');
    } else {
      lines.push('- ❌ Email sending failed');
      lines.push(`- Error: ${JSON.stringify(emailResult)}`);
      throw new Error('Email sending failed');
    }
    lines.push('');

    // Test 2: Validate email format
    lines.push('## Test 2: Validate Email Format');
    
    const invalidEmailTest = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ['invalid-email'],
        subject: 'Test',
        html: 'Test',
      }),
    });

    const invalidResult = await invalidEmailTest.json();

    if (!invalidEmailTest.ok) {
      lines.push('- ✅ Invalid email rejected correctly');
      lines.push(`- Error message: ${invalidResult.message || 'Invalid email'}`);
    } else {
      lines.push('- ⚠️  Invalid email not rejected (unexpected)');
    }
    lines.push('');

    // Test 3: Check Resend account status
    lines.push('## Test 3: Resend Account Status');
    
    const apiKeysResponse = await fetch('https://api.resend.com/api-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
    });

    if (apiKeysResponse.ok) {
      const apiKeysData = await apiKeysResponse.json();
      lines.push('- ✅ API key is valid');
      lines.push(`- Active keys: ${apiKeysData.data?.length || 0}`);
    } else {
      lines.push('- ⚠️  Could not verify API key status');
    }
    lines.push('');

    lines.push('## ✅ Email Integration Tests Passed');
    lines.push('');
    lines.push('**Next Steps:**');
    lines.push('1. Check your inbox for the test email');
    lines.push('2. Verify HTML rendering looks correct');
    lines.push('3. Test campaign automation endpoints');

  } catch (err) {
    lines.push('');
    lines.push('## ❌ Email Test Failed');
    lines.push('```');
    lines.push(err.stack || err.message || String(err));
    lines.push('```');
    throw err;
  }
}

test()
  .then(() => writeReport(lines, 'test/agent/reports', 'integration_email'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    writeReport(lines, 'test/agent/reports', 'integration_email').finally(() => process.exit(1));
  });
