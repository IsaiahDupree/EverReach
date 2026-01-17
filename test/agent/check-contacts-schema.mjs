import { getEnv, getAccessToken } from './_shared.mjs';

async function checkSchema() {
  const SUPABASE_URL = await getEnv('SUPABASE_URL', true);
  const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY', true);
  const token = await getAccessToken();
  
  console.log('Fetching existing contact to see schema...\n');
  
  // Get one existing contact
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?select=*&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const contacts = await res.json();
  
  if (contacts && contacts.length > 0) {
    console.log('✅ Sample Contact Structure:');
    console.log(JSON.stringify(contacts[0], null, 2));
    console.log('\n📋 Fields in contacts table:');
    console.log(Object.keys(contacts[0]).join(', '));
  } else {
    console.log('⚠️  No contacts found in database');
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(contacts, null, 2));
  }
}

checkSchema().catch(console.error);
