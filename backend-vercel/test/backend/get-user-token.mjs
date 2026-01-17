/**
 * Get User Token from Supabase
 * 
 * Helper script to authenticate and get a JWT token for testing
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMDA5NDMsImV4cCI6MjA0MzY3Njk0M30.c7s75xhVJVkHQgAo-a4_Xs8F1BQO8mSV2uqBGUhBQKY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('🔐 Supabase Authentication\n');

(async () => {
  try {
    const email = await question('Email: ');
    const password = await question('Password: ');
    
    console.log('\n🔄 Signing in...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error('\n❌ Authentication failed:', error.message);
      process.exit(1);
    }

    if (!data.session) {
      console.error('\n❌ No session returned');
      process.exit(1);
    }

    console.log('\n✅ Authentication successful!\n');
    console.log('📋 Your token:\n');
    console.log(data.session.access_token);
    console.log('\n📝 Copy and use it like this:\n');
    console.log(`export TEST_TOKEN="${data.session.access_token}"\n`);
    console.log('Or on Windows PowerShell:\n');
    console.log(`$env:TEST_TOKEN="${data.session.access_token}"\n`);
    console.log('Then run:\n');
    console.log(`node test/backend/test-contact-import.mjs\n`);
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
})();
