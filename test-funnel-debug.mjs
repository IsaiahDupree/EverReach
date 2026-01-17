import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://backend-vercel-bs831rmqq-isaiahduprees-projects.vercel.app';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testFunnel() {
  console.log('🧪 Testing Funnel Endpoint (DEBUG)\n');

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

  // Call funnel API
  console.log('\n2. Calling /api/v1/marketing/funnel...');
  const response = await fetch(`${BASE_URL}/api/v1/marketing/funnel`, {
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
    
    // Check if materialized view exists
    console.log('\n3. Checking if mv_daily_funnel exists...');
    const { data: viewData, error: viewError } = await supabase
      .from('mv_daily_funnel')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.error('❌ Materialized view error:', viewError.message);
    } else {
      console.log('✅ View exists, data:', viewData);
    }
    
  } else {
    console.log('\n✅ Success:');
    console.log(JSON.stringify(data, null, 2));
  }
}

testFunnel().catch(console.error);
