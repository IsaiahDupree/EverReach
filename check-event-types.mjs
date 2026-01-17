import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEventTypes() {
  console.log('🔍 Checking actual event types in database\n');

  const { data, error } = await supabase
    .from('user_event')
    .select('etype')
    .limit(1000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Count occurrences
  const counts = {};
  data.forEach(row => {
    counts[row.etype] = (counts[row.etype] || 0) + 1;
  });

  console.log('Event types in database:');
  console.log(JSON.stringify(counts, null, 2));
  
  // Check what funnel endpoint is looking for
  console.log('\n📋 Funnel endpoint searches for:');
  const funnelEvents = ['page_view', 'signup_completed', 'trial_started', 'activated', 'subscription_started'];
  funnelEvents.forEach(event => {
    const exists = counts[event] !== undefined;
    console.log(`  ${exists ? '✅' : '❌'} ${event}: ${counts[event] || 0} records`);
  });
}

checkEventTypes().catch(console.error);
