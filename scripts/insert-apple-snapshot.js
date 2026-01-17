#!/usr/bin/env node

/**
 * Insert Apple subscription snapshot for testing
 * 
 * This script:
 * 1. Finds user by email
 * 2. Inserts a test Apple subscription snapshot
 * 3. Calls backend to recompute entitlements
 * 
 * Usage: node scripts/insert-apple-snapshot.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const USER_EMAIL = 'isaiahdupree33@gmail.com';
const PRODUCT_ID = 'pro_monthly';
const STORE = 'app_store';
const STORE_ACCOUNT_ID = 'sandbox@isaiahdupree.com';
const STATUS = 'active';
const DAYS_VALID = 30;

async function main() {
  console.log('🔍 Connecting to Supabase...\n');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Error: Missing environment variables');
    console.error('   Please ensure .env contains:');
    console.error('   - EXPO_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role key (admin access)
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`🔍 Step 1: Finding user with email: ${USER_EMAIL}\n`);

  // Get user from auth.users
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('❌ Error fetching users:', userError.message);
    process.exit(1);
  }

  const user = users.find(u => u.email === USER_EMAIL);

  if (!user) {
    console.error(`❌ Error: No user found with email ${USER_EMAIL}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.id}\n`);

  console.log('📝 Step 2: Inserting Apple subscription snapshot...\n');

  const periodEnd = new Date(Date.now() + DAYS_VALID * 24 * 60 * 60 * 1000).toISOString();

  // First, check if a subscription already exists for this user and store
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('store', STORE)
    .eq('store_account_id', STORE_ACCOUNT_ID)
    .maybeSingle();

  let subscription;
  let insertError;

  if (existing) {
    // Update existing subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        product_id: PRODUCT_ID,
        status: STATUS,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    subscription = data;
    insertError = error;
    console.log('   (Updated existing subscription)\n');
  } else {
    // Insert new subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        product_id: PRODUCT_ID,
        store: STORE,
        store_account_id: STORE_ACCOUNT_ID,
        status: STATUS,
        current_period_end: periodEnd
      })
      .select()
      .single();
    subscription = data;
    insertError = error;
    console.log('   (Inserted new subscription)\n');
  }

  if (insertError) {
    console.error('❌ Error inserting subscription:', insertError.message);
    process.exit(1);
  }

  console.log('✅ Subscription snapshot inserted:');
  console.log(`   - User: ${user.id}`);
  console.log(`   - Store: ${STORE}`);
  console.log(`   - Product: ${PRODUCT_ID}`);
  console.log(`   - Status: ${STATUS}`);
  console.log(`   - Valid until: ${periodEnd}\n`);

  console.log('🔄 Step 3: Recomputing entitlements...\n');

  // Call the recompute function (same as backend /api/v1/billing/restore)
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, store')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(25);

  const now = new Date().toISOString();
  const activeSub = subs?.find(s => 
    s.status && ['trial', 'active', 'grace', 'paused'].includes(s.status) &&
    s.current_period_end && s.current_period_end >= now
  );

  const isPro = Boolean(activeSub);
  const source = activeSub?.store || 'manual';
  const validUntil = activeSub?.current_period_end || null;

  const { error: entError } = await supabase
    .from('entitlements')
    .upsert({
      user_id: user.id,
      plan: isPro ? 'pro' : 'free',
      valid_until: validUntil,
      source: source,
      updated_at: new Date().toISOString()
    });

  if (entError) {
    console.error('❌ Error updating entitlements:', entError.message);
    process.exit(1);
  }

  console.log('✅ Entitlements recomputed:');
  console.log(`   - Plan: ${isPro ? 'pro' : 'free'}`);
  console.log(`   - Source: ${source}`);
  console.log(`   - Valid until: ${validUntil || 'N/A'}\n`);

  console.log('✨ Done!\n');
  console.log('Next steps:');
  console.log('1. Open the app');
  console.log('2. Go to Settings → Subscription Plans');
  console.log('3. You should see "Active" with Apple as the payment platform\n');
}

main().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
