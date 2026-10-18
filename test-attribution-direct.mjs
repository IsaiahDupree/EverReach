import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://backend-vercel-c5yhv6zup-isaiahduprees-projects.vercel.app';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testAttribution() {
  console.log('🧪 Testing Attribution Endpoint\n');

  // Authenticate
  console.log('1. Authenticating...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'isaiahdupree33@gmail.com',
    password: 'frogger12'
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    process.exit(1);
  }

  console.log('✅ Authenticated');
  const token = authData.session.access_token;

  // Call attribution API
  console.log('\n2. Calling /api/v1/marketing/attribution...');
  const response = await fetch(`${BASE_URL}/api/v1/marketing/attribution`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Response status:', response.status);
  const data = await response.json();
  
  if (!response.ok) {
    console.error('\n❌ Error Response:');
    console.error(JSON.stringify(data, null, 2));
  } else {
    console.log('\n✅ Success:');
    console.log(JSON.stringify(data, null, 2));
  }
}

testAttribution().catch(console.error);
