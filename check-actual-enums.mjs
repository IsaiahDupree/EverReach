import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEnums() {
  // Query to get all enum values for 'channel' type
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "SELECT unnest(enum_range(NULL::channel))::text as channel_value"
  }).catch(async () => {
    // Try alternative method - query pg_enum directly
    return await supabase.rpc('exec_sql', {
      sql: `
        SELECT e.enumlabel as channel_value 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'channel'
        ORDER BY e.enumsortorder
      `
    });
  });

  console.log('Channel enum values:', {data, error});
}

checkEnums().catch(console.error);
