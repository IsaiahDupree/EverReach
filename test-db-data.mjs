import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('🔍 Checking database data...\n');

  // Check user_event
  const { data: events, error: eventsError } = await supabase
    .from('user_event')
    .select('*', { count: 'exact' });
  
  console.log('user_event:', events?.length || 0, 'records');
  if (eventsError) console.log('  Error:', eventsError.message);

  // Check campaign
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaign')
    .select('*', { count: 'exact' });
  
  console.log('campaign:', campaigns?.length || 0, 'records');
  if (campaignsError) console.log('  Error:', campaignsError.message);

  // Check user_magnetism_index
  const { data: magnetism, error: magnetismError } = await supabase
    .from('user_magnetism_index')
    .select('*', { count: 'exact' });
  
  console.log('user_magnetism_index:', magnetism?.length || 0, 'records');
  if (magnetismError) console.log('  Error:', magnetismError.message);

  // Check user_intent_score
  const { data: intent, error: intentError } = await supabase
    .from('user_intent_score')
    .select('*', { count: 'exact' });
  
  console.log('user_intent_score:', intent?.length || 0, 'records');
  if (intentError) console.log('  Error:', intentError.message);

  // Check conversation_thread (Meta)
  const { data: threads, error: threadsError } = await supabase
    .from('conversation_thread')
    .select('*', { count: 'exact' });
  
  console.log('conversation_thread:', threads?.length || 0, 'records');
  if (threadsError) console.log('  Error:', threadsError.message);

  // Check if views exist
  const { data: viewData, error: viewError } = await supabase
    .from('vw_last_touch_before_conversion')
    .select('*', { count: 'exact' })
    .limit(5);
  
  console.log('\nvw_last_touch_before_conversion:', viewData?.length || 0, 'records');
  if (viewError) console.log('  Error:', viewError.message);

  console.log('\n✅ Database check complete');
}

checkData().catch(console.error);
