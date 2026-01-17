import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY'
);

const { data, error } = await supabase.auth.admin.listUsers();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const user = data.users.find(u => u.email === 'isaiahdupree33@gmail.com');
if (user) {
  console.log(user.id);
} else {
  console.log('User not found');
}
