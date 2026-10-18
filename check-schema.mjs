import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Try to query user_event to see what error we get
  const { data, error } = await supabase
    .from('user_event')
    .select('*')
    .limit(1);
  
  console.log('user_event query result:', { data, error });

  // Check if we can insert with 'web' source
  const testUserId = 'e5eaa347-9c72-4190-bace-ec7a2063f69a'; // From the error output
  
  const { data: insertData, error: insertError } = await supabase
    .from('user_event')
    .insert({
      user_id: testUserId,
      etype: 'test_event',
      occurred_at: new Date().toISOString(),
      source: 'web',
      intent_weight: 5
    })
    .select();
  
  console.log('\nInsert test result:', { insertData, insertError });

  // If that worked, delete it
  if (!insertError && insertData?.[0]?.event_id) {
    await supabase
      .from('user_event')
      .delete()
      .eq('event_id', insertData[0].event_id);
    console.log('Test record cleaned up');
  }
}

checkSchema().catch(console.error);
