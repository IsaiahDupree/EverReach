#!/usr/bin/env node

/**
 * Get Supabase auth token for testing
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';

const email = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
const password = process.env.TEST_PASSWORD || 'Frogger12';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔐 Authenticating...');
console.log(`   Email: ${email}`);

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  console.error('❌ Authentication failed:', error.message);
  process.exit(1);
}

if (!data.session) {
  console.error('❌ No session returned');
  process.exit(1);
}

console.log('✅ Authentication successful!');
console.log(`   User ID: ${data.user.id}`);
console.log(`   Email: ${data.user.email}`);
console.log(`   Token expires: ${new Date(data.session.expires_at * 1000).toISOString()}`);
console.log('');
console.log('📋 Access Token:');
console.log(data.session.access_token);
console.log('');
console.log('📋 Refresh Token:');
console.log(data.session.refresh_token);
