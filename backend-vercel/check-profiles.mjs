#!/usr/bin/env node

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

console.log('[Schema Check] Checking profiles table structure...\n');

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'profiles'
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`API error: ${response.status} - ${JSON.stringify(result)}`);
  }

  console.log('✅ Profiles table columns:');
  result.forEach(row => {
    console.log(`  - ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
  });

} catch (error) {
  console.error('❌ Check failed:', error.message);
}
