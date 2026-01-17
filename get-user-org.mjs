import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY'
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
