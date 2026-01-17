#!/usr/bin/env node

/**
 * Get Auth Token for Testing
 * Uses Supabase Auth API to get JWT token
 */

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';

const email = 'isaiahdupree33@gmail.com';
const password = 'Frogger12';

async function getAuthToken() {
  console.log('========================================');
  console.log('Getting Auth Token');
  console.log('========================================\n');
  console.log(`Email: ${email}`);
  console.log('');

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Auth failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const jwt = data.access_token;

    console.log('✅ JWT obtained!\n');
    console.log('JWT Token:');
    console.log(jwt);
    console.log('\n========================================');
    console.log('To use in tests:');
    console.log('========================================\n');
    console.log('PowerShell:');
    console.log(`  $env:TEST_JWT = "${jwt}"`);
    console.log('  node test/profile-smoke.mjs\n');
    console.log('Or run E2E test:');
    console.log(`  $env:TEST_JWT = "${jwt}"`);
    console.log('  node test/e2e-user-profile-journey.mjs\n');

    // Save to file
    const fs = await import('fs');
    fs.writeFileSync('test-jwt.txt', jwt);
    console.log('✅ JWT saved to test-jwt.txt\n');

    return jwt;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

getAuthToken();
