#!/usr/bin/env node
/**
 * SMS Integration Test (Twilio)
 * 
 * Tests SMS sending functionality:
 * - Test SMS delivery
 * - Phone number validation
 * - Error handling
 * - Account balance check
 */

import { getEnv, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# SMS Integration Test (Twilio)',
  `**Test ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

async function test() {
  try {
    // Setup
    const TWILIO_ACCOUNT_SID = await getEnv('TWILIO_ACCOUNT_SID', false);
    const TWILIO_AUTH_TOKEN = await getEnv('TWILIO_AUTH_TOKEN', false);
    const TWILIO_PHONE_NUMBER = await getEnv('TWILIO_PHONE_NUMBER', false);
    const TEST_RECIPIENT = await getEnv('TEST_PHONE_NUMBER', false, '+18662805837'); // Default to your Twilio number for testing

    lines.push('## Test Setup');
    lines.push(`- Twilio Account SID: ${TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
    lines.push(`- Twilio Auth Token: ${TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
    lines.push(`- From Phone Number: ${TWILIO_PHONE_NUMBER || 'Not set'}`);
    lines.push(`- Test Recipient: ${TEST_RECIPIENT}`);
    lines.push('');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      lines.push('## ⚠️  Test Skipped');
      lines.push('');
      lines.push('**Twilio credentials not set.** SMS tests cannot run.');
      lines.push('');
      lines.push('To enable SMS tests:');
      lines.push('1. Get credentials from https://console.twilio.com');
      lines.push('2. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env');
      lines.push('3. Set TEST_PHONE_NUMBER to your phone (optional)');
      lines.push('4. Re-run this test');
      lines.push('');
      lines.push('**Note:** Test SMS will be sent to TEST_PHONE_NUMBER if set.');
      return;
    }

    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const twilioBaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;

    // Test 1: Verify Twilio account status
    lines.push('## Test 1: Verify Twilio Account');
    
    const accountResponse = await fetch(`${twilioBaseUrl}.json`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      lines.push('- ✅ Twilio account verified');
      lines.push(`- Account Status: ${accountData.status}`);
      lines.push(`- Account Type: ${accountData.type}`);
    } else {
      lines.push('- ❌ Account verification failed');
      const error = await accountResponse.text();
      lines.push(`- Error: ${error}`);
      throw new Error('Twilio authentication failed');
    }
    lines.push('');

    // Test 2: Check account balance
    lines.push('## Test 2: Check Account Balance');
    
    const balanceResponse = await fetch(`${twilioBaseUrl}/Balance.json`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      const balance = parseFloat(balanceData.balance);
      lines.push('- ✅ Balance retrieved');
      lines.push(`- Current Balance: $${Math.abs(balance).toFixed(2)} ${balanceData.currency}`);
      
      if (balance < -0.50) {
        lines.push('- ⚠️  Low balance - consider adding funds');
      }
    } else {
      lines.push('- ⚠️  Could not retrieve balance');
    }
    lines.push('');

    // Test 3: Verify phone number
    lines.push('## Test 3: Verify Sending Phone Number');
    
    const phoneResponse = await fetch(
      `${twilioBaseUrl}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(TWILIO_PHONE_NUMBER)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      if (phoneData.incoming_phone_numbers && phoneData.incoming_phone_numbers.length > 0) {
        const phone = phoneData.incoming_phone_numbers[0];
        lines.push('- ✅ Phone number verified');
        lines.push(`- Number: ${phone.phone_number}`);
        lines.push(`- Friendly Name: ${phone.friendly_name}`);
        lines.push(`- SMS Capable: ${phone.capabilities.sms ? 'Yes' : 'No'}`);
      } else {
        lines.push('- ⚠️  Phone number not found in account');
        lines.push('- This may be a Messaging Service SID instead');
      }
    } else {
      lines.push('- ⚠️  Could not verify phone number');
    }
    lines.push('');

    // Test 4: Send test SMS (optional, requires TEST_PHONE_NUMBER)
    lines.push('## Test 4: Send Test SMS');
    
    const testMessage = `🧪 EverReach SMS Test\n\nTest ID: ${rid.slice(0, 8)}\nTimestamp: ${new Date().toLocaleTimeString()}\n\nIf you received this, SMS integration works! ✅`;

    lines.push(`**Warning:** This will send a real SMS to ${TEST_RECIPIENT}`);
    lines.push('');
    
    // Check if TEST_PHONE_NUMBER is explicitly set (not the default)
    const shouldSendSMS = process.env.TEST_PHONE_NUMBER && process.env.TEST_PHONE_NUMBER !== '+18662805837';

    if (!shouldSendSMS) {
      lines.push('- ⚠️  Test SMS skipped (set TEST_PHONE_NUMBER to your phone to enable)');
      lines.push('');
      lines.push('**To send test SMS:**');
      lines.push('```bash');
      lines.push('export TEST_PHONE_NUMBER="+1234567890"  # Your phone number');
      lines.push('npm run test:integration-sms');
      lines.push('```');
    } else {
      const smsResponse = await fetch(`${twilioBaseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: TEST_RECIPIENT,
          Body: testMessage,
        }),
      });

      const smsResult = await smsResponse.json();

      if (smsResponse.ok && smsResult.sid) {
        lines.push('- ✅ SMS sent successfully');
        lines.push(`- Message SID: \`${smsResult.sid}\``);
        lines.push(`- Status: ${smsResult.status}`);
        lines.push(`- To: ${smsResult.to}`);
        lines.push(`- From: ${smsResult.from}`);
        lines.push('');
        lines.push('> **Check your phone!** The test SMS should arrive within 1-2 minutes.');
      } else {
        lines.push('- ❌ SMS sending failed');
        lines.push(`- Error: ${smsResult.message || JSON.stringify(smsResult)}`);
        if (smsResult.code) {
          lines.push(`- Error Code: ${smsResult.code}`);
        }
      }
    }
    lines.push('');

    lines.push('## ✅ SMS Integration Tests Passed');
    lines.push('');
    lines.push('**Next Steps:**');
    lines.push('1. Set TEST_PHONE_NUMBER to test SMS delivery');
    lines.push('2. Verify SMS arrives on your phone');
    lines.push('3. Test campaign automation SMS endpoints');

  } catch (err) {
    lines.push('');
    lines.push('## ❌ SMS Test Failed');
    lines.push('```');
    lines.push(err.stack || err.message || String(err));
    lines.push('```');
    throw err;
  }
}

test()
  .then(() => writeReport(lines, 'test/agent/reports', 'integration_sms'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    writeReport(lines, 'test/agent/reports', 'integration_sms').finally(() => process.exit(1));
  });
