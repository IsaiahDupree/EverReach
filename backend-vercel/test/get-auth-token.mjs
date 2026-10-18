// Get Supabase Auth Token
// Usage: node get-auth-token.mjs email password

const SUPABASE_URL = 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY);

const email = process.argv[2] || 'isaiahdupree33@gmail.com';
const password = process.argv[3] || 'Frogger12';

console.log('🔐 Getting Supabase Auth Token...\n');
console.log(`Email: ${email}`);

try {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });

  const data = await response.json();

  if (response.ok && data.access_token) {
    console.log('\n✅ Successfully authenticated!\n');
    console.log('Access Token:');
    console.log(data.access_token);
    console.log('\n💡 To use in tests:');
    console.log(`$env:TEST_AUTH_TOKEN="${data.access_token}"`);
    console.log(`node test/paywall-config-changes-integration.mjs`);
    
    // Also save to file for easy use
    const fs = await import('fs');
    fs.writeFileSync('.test-token', data.access_token);
    console.log('\n📝 Token saved to .test-token file');
    
    process.exit(0);
  } else {
    console.error('\n❌ Authentication failed:');
    console.error(data);
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
