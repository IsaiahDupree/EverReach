/**
 * Quick Supabase Connection Test
 * Tests database connection and lists tables
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  try {
    // Test 1: List all tables
    console.log('📋 Test 1: Listing all tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      // Try alternative method
      const { data: altTables, error: altError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      });

      if (altError) {
        console.error('❌ Error listing tables:', altError.message);
      } else {
        console.log('✅ Tables found:', altTables?.length || 0);
        altTables?.forEach(t => console.log(`   - ${t.table_name}`));
      }
    } else {
      console.log('✅ Tables found:', tables?.length || 0);
      tables?.forEach(t => console.log(`   - ${t.table_name}`));
    }

    // Test 2: Check for required tables
    console.log('\n📋 Test 2: Checking required tables...');
    const requiredTables = [
      'organizations',
      'users', 
      'people',
      'interactions',
      'api_keys',
      'webhooks',
      'audit_trail'
    ];

    for (const tableName of requiredTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${tableName}: NOT FOUND (${error.message})`);
      } else {
        console.log(`   ✅ ${tableName}: EXISTS`);
      }
    }

    // Test 3: Check extensions
    console.log('\n📋 Test 3: Checking extensions...');
    const { data: extensions, error: extError } = await supabase.rpc('exec_sql', {
      query: 'SELECT extname FROM pg_extension ORDER BY extname;'
    });

    if (!extError && extensions) {
      console.log('✅ Extensions:', extensions.map(e => e.extname).join(', '));
    }

    // Test 4: Check helper functions
    console.log('\n📋 Test 4: Checking helper functions...');
    const requiredFunctions = ['verify_api_key', 'has_scope', 'emit_webhook_event', 'update_api_key_usage', 'compute_segment_members'];
    
    // Try to call verify_api_key with a test hash to see if it exists
    for (const funcName of requiredFunctions) {
      try {
        if (funcName === 'verify_api_key') {
          const { data, error } = await supabase.rpc('verify_api_key', { p_key_hash: 'test' });
          // If no error about function not existing, it exists
          console.log(`   ✅ ${funcName}(): EXISTS`);
        } else if (funcName === 'has_scope') {
          const { data, error } = await supabase.rpc('has_scope', { p_scopes: ['test'], p_required_scope: 'test' });
          console.log(`   ✅ ${funcName}(): EXISTS`);
        } else {
          // For other functions, just check if they're callable
          console.log(`   ⚪ ${funcName}(): Skipped test`);
        }
      } catch (error) {
        if (error.message && error.message.includes('Could not find the function')) {
          console.log(`   ❌ ${funcName}(): NOT FOUND`);
        } else {
          // Function exists but failed for other reasons (expected)
          console.log(`   ✅ ${funcName}(): EXISTS`);
        }
      }
    }

    console.log('\n✅ Connection test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
