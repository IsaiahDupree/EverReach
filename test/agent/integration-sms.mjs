/**
 * SMS Integration Test (Twilio)
 * 
 * Tests SMS sending via Twilio API:
 * - Account verification
 * - Balance check
 * - Phone number validation
 * - Real SMS delivery
 */

import { getEnv, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const lines = [
  '# SMS Integration Test (Twilio)',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Load environment variables
    const TWILIO_ACCOUNT_SID = await getEnv('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = await getEnv('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = await getEnv('TWILIO_PHONE_NUMBER');
    const TEST_PHONE_NUMBER = await getEnv('TEST_PHONE_NUMBER', false) || '+12177996721';
    
    lines.push('## Test Setup');
    lines.push('- Twilio Account SID: ✅ Set');
    lines.push('- Twilio Auth Token: ✅ Set');
    lines.push(`- From Phone Number: ${TWILIO_PHONE_NUMBER}`);
    lines.push(`- Test Recipient: ${TEST_PHONE_NUMBER}`);
    lines.push('');
    
    // Dynamically import Twilio
    const { default: twilio } = await import('twilio');
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Test 1: Verify Twilio Account
    lines.push('## Test 1: Verify Twilio Account');
    try {
      const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
      lines.push('- ✅ Twilio account verified');
      lines.push(`- Account Status: ${account.status}`);
      lines.push(`- Account Type: ${account.type}`);
    } catch (err) {
      lines.push(`- ❌ Failed to verify account: ${err.message}`);
      throw err;
    }
    lines.push('');
    
    // Test 2: Check Account Balance
    lines.push('## Test 2: Check Account Balance');
    try {
      const balance = await client.balance.fetch();
      lines.push('- ✅ Balance retrieved');
      lines.push(`- Current Balance: $${balance.balance} ${balance.currency}`);
    } catch (err) {
      lines.push(`- ⚠️  Could not retrieve balance: ${err.message}`);
    }
    lines.push('');
    
    // Test 3: Verify Sending Phone Number
    lines.push('## Test 3: Verify Sending Phone Number');
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: TWILIO_PHONE_NUMBER });
      if (phoneNumbers.length > 0) {
        const phone = phoneNumbers[0];
        lines.push('- ✅ Phone number verified');
        lines.push(`- Number: ${phone.phoneNumber}`);
        lines.push(`- Friendly Name: ${phone.friendlyName}`);
        lines.push(`- SMS Capable: ${phone.capabilities.sms ? 'Yes' : 'No'}`);
      } else {
        lines.push('- ⚠️  Phone number not found in account');
      }
    } catch (err) {
      lines.push(`- ⚠️  Could not verify phone number: ${err.message}`);
    }
    lines.push('');
    
    // Test 4: Send Test SMS
    lines.push('## Test 4: Send Test SMS');
    lines.push(`**Warning:** This will send a real SMS to ${TEST_PHONE_NUMBER}`);
    lines.push('');
    
    try {
      const message = await client.messages.create({
        body: `🎉 EverReach Test SMS - ${nowIso()} - This is a test message from your SMS integration test. Everything is working!`,
        from: TWILIO_PHONE_NUMBER,
        to: TEST_PHONE_NUMBER
      });
      
      lines.push('- ✅ SMS sent successfully');
      lines.push(`- Message SID: \`${message.sid}\``);
      lines.push(`- Status: ${message.status}`);
      lines.push(`- To: ${message.to}`);
      lines.push(`- From: ${message.from}`);
      lines.push('');
      lines.push('> **Check your phone!** The test SMS should arrive within 1-2 minutes.');
    } catch (err) {
      lines.push(`- ❌ Failed to send SMS: ${err.message}`);
      if (err.code) {
        lines.push(`- Error Code: ${err.code}`);
      }
      throw err;
    }
    lines.push('');
    
    lines.push('## ✅ SMS Integration Tests Passed');
    lines.push('');
    lines.push('**Next Steps:**');
    lines.push('1. Set TEST_PHONE_NUMBER to test SMS delivery');
    lines.push('2. Verify SMS arrives on your phone');
    lines.push('3. Test campaign automation SMS endpoints');
    
    process.exit(0);
    
  } catch (err) {
    lines.push('');
    lines.push('## ❌ Test Failed');
    lines.push('```');
    lines.push(mdEscape(err.stack || err.message || String(err)));
    lines.push('```');
    process.exit(1);
  } finally {
    await writeReport(lines, 'test/agent/reports', 'integration_sms');
  }
}

test();
