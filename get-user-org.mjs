import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  (process.env.SUPABASE_SERVICE_ROLE_KEY)
);

const userId = 'e5eaa347-9c72-4190-bace-ec7a2063f69a';

// Get user's org
const { data, error } = await supabase
  .from('user_orgs')
  .select('org_id')
  .eq('user_id', userId)
  .limit(1)
  .single();

if (error) {
  console.error('Error:', error);
} else if (data) {
  console.log(data.org_id);
} else {
  console.log('No org found');
}
