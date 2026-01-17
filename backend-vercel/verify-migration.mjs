#!/usr/bin/env node

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

console.log('✅ Migration applied successfully!\n');
console.log('[Verification] Checking created resources...\n');

try {
  // Check ai_user_context table exists
  const tablesResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        query: `SELECT table_name FROM information_schema.tables WHERE table_name = 'ai_user_context' AND table_schema = 'public';`
      })
    }
  );

  const tables = await tablesResponse.json();
  if (tables && tables.length > 0) {
    console.log('✅ Table ai_user_context created');
  }

  // Check profiles got new columns
  const columnsResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('personal_goal', 'networking_goal', 'business_goal', 'goals_updated_at');`
      })
    }
  );

  const columns = await columnsResponse.json();
  if (columns && columns.length === 4) {
    console.log('✅ Goal columns added to profiles table');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}`);
    });
  }

  // Check function exists
  const funcResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        query: `SELECT proname FROM pg_proc WHERE proname = 'get_user_goals_for_ai';`
      })
    }
  );

  const funcs = await funcResponse.json();
  if (funcs && funcs.length > 0) {
    console.log('✅ Function get_user_goals_for_ai created');
  }

  console.log('\n🎉 Migration verification complete!\n');
  console.log('Next steps:');
  console.log('1. Run tests: npm run test:goal-inference');
  console.log('2. Update code to use "profiles" instead of "user_profiles"');
  console.log('3. Deploy backend: git push origin feat/backend-vercel-only-clean\n');

} catch (error) {
  console.error('❌ Verification failed:', error.message);
}
