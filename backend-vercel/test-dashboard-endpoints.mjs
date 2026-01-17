#!/usr/bin/env node

/**
 * Test script for dashboard endpoints
 * Tests:
 * 1. GET /v1/warmth/summary
 * 2. GET /v1/interactions with sorting
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1NzY2MDMsImV4cCI6MjA0MzE1MjYwM30.TFfMxtdDhpjBT6c5E9AjSZAR_3_xTh3h9UX44Sy4iKw';
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-vercel-e59p3ndi7-isaiahduprees-projects.vercel.app';

console.log('\n🧪 Testing Dashboard Endpoints\n');
console.log(`Backend: ${BACKEND_URL}\n`);

// Get test user token
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getTestToken() {
  // Try to sign in with test credentials
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });
  
  if (error) {
    console.error('❌ Failed to get test token:', error.message);
    console.log('\n💡 Please create a test user or provide SUPABASE_TOKEN env var');
    return process.env.SUPABASE_TOKEN || null;
  }
  
  return data.session?.access_token;
}

async function testWarmthSummary(token) {
  console.log('📊 Testing GET /v1/warmth/summary...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/v1/warmth/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed:', response.status, data);
      return false;
    }
    
    console.log('✅ Success!');
    console.log(`   Total Contacts: ${data.total_contacts}`);
    console.log(`   By Band:`);
    console.log(`     - Hot: ${data.by_band.hot}`);
    console.log(`     - Warm: ${data.by_band.warm}`);
    console.log(`     - Cooling: ${data.by_band.cooling}`);
    console.log(`     - Cold: ${data.by_band.cold}`);
    console.log(`   Average Score: ${data.average_score}`);
    console.log(`   Need Attention: ${data.contacts_needing_attention}`);
    console.log(`   Last Updated: ${data.last_updated_at}\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testInteractions(token) {
  console.log('📝 Testing GET /v1/interactions with sorting...');
  
  try {
    const response = await fetch(
      `${BACKEND_URL}/v1/interactions?limit=5&sort=created_at:desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed:', response.status, data);
      return false;
    }
    
    console.log('✅ Success!');
    console.log(`   Returned: ${data.items?.length || 0} interactions`);
    console.log(`   Limit: ${data.limit}`);
    console.log(`   Sort: ${data.sort}`);
    console.log(`   Next Cursor: ${data.nextCursor ? 'Yes' : 'No'}\n`);
    
    if (data.items && data.items.length > 0) {
      console.log('   Sample Interaction:');
      const item = data.items[0];
      console.log(`     - ID: ${item.id}`);
      console.log(`     - Contact: ${item.contact_name || 'Unknown'}`);
      console.log(`     - Type: ${item.kind}`);
      console.log(`     - Content: ${(item.content || '').substring(0, 50)}...`);
      console.log(`     - Created: ${item.created_at}\n`);
    } else {
      console.log('   ℹ️ No interactions found (empty database)\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testInteractionsWithFilters(token) {
  console.log('🔍 Testing GET /v1/interactions with date filter...');
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `${BACKEND_URL}/v1/interactions?start=${sevenDaysAgo}&limit=10&sort=created_at:desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed:', response.status, data);
      return false;
    }
    
    console.log('✅ Success!');
    console.log(`   Found: ${data.items?.length || 0} interactions from last 7 days\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  const token = await getTestToken();
  
  if (!token) {
    console.error('❌ No authentication token available');
    console.log('\n💡 Set SUPABASE_TOKEN environment variable with a valid JWT token');
    process.exit(1);
  }
  
  console.log('🔑 Token obtained\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const results = {
    warmthSummary: await testWarmthSummary(token),
    interactions: await testInteractions(token),
    interactionsFiltered: await testInteractionsWithFilters(token),
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Test Summary:');
  console.log(`   Warmth Summary: ${results.warmthSummary ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Interactions List: ${results.interactions ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Interactions Filtered: ${results.interactionsFiltered ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}\n`);
  
  process.exit(allPassed ? 0 : 1);
})();
