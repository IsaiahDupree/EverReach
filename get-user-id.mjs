import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  (process.env.SUPABASE_SERVICE_ROLE_KEY)
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
