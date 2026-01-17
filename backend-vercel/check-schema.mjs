#!/usr/bin/env node

const PROJECT_REF = 'utasetfxiqcrnwyfforx';
const ACCESS_TOKEN = 'sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a';

console.log('[Schema Check] Checking existing tables...\n');

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
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`API error: ${response.status} - ${JSON.stringify(result)}`);
  }

  console.log('✅ Existing tables:');
  if (result.result && result.result.length > 0) {
    result.result.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
  } else {
    console.log('  (No tables found or different response format)');
    console.log('  Response:', JSON.stringify(result, null, 2));
  }

} catch (error) {
  console.error('❌ Schema check failed:', error.message);
}
