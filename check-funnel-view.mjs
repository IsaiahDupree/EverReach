import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkView() {
  console.log('🔍 Checking if mv_daily_funnel exists\n');

  const { data, error } = await supabase
    .from('mv_daily_funnel')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ View does NOT exist or has error:');
    console.log('   Code:', error.code);
    console.log('   Message:', error.message);
    console.log('\n💡 This explains why funnel endpoint fails!');
    console.log('   The view query throws an error, which is caught and returns 500.');
  } else {
    console.log('✅ View EXISTS');
    console.log('   Data:', data);
  }
}

checkView().catch(console.error);
