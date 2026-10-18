#!/usr/bin/env node
/**
 * Google Contacts Import Test Script
 * 
 * Tests the Google contacts import endpoints against the deployed backend
 * 
 * Usage:
 *   node test-google-import.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env file (try .env.test from Vercel first, then .env)
const envFiles = ['.env.test', '.env'];
let envLoaded = false;

for (const envFile of envFiles) {
  try {
    const envPath = resolve(envFile);
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        value = value.replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log(`✅ Loaded environment from ${envFile}\n`);
    envLoaded = true;
    break;
  } catch (err) {
    // Continue to next file
  }
}

if (!envLoaded) {
  console.warn('⚠️  Could not load any .env file\n');
}

const BASE_URL = process.env.TEST_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Frogger12';

console.log('═══════════════════════════════════════════════════════════');
console.log('  Google Contacts Import Test');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📍 Backend URL: ${BASE_URL}`);
console.log(`👤 Test User: ${TEST_EMAIL}\n`);

let accessToken = null;
let userId = null;

/**
 * Step 1: Authenticate and get access token
 */
async function authenticate() {
  console.log('🔐 Step 1: Authenticating...');
  
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    }
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    userId = data.user?.id;
    
    console.log(`   ✅ Authenticated successfully`);
    console.log(`   Token: ${accessToken.substring(0, 30)}...`);
    console.log(`   User ID: ${userId}\n`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Authentication failed:`, error.message);
    return false;
  }
}

/**
 * Step 2: Check provider health
 */
async function checkProviderHealth() {
  console.log('🏥 Step 2: Checking provider health...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/contacts/import/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`   ✅ Health check successful\n`);
    console.log('   📋 Provider Status:');
    
    for (const [provider, status] of Object.entries(data.providers)) {
      const configured = status.configured ? '✅' : '⚠️ ';
      const available = status.available ? '✅' : '❌';
      console.log(`      ${provider.padEnd(12)} - Configured: ${configured} | Available: ${available}`);
    }
    
    console.log('');
    return data;
  } catch (error) {
    console.error(`   ❌ Health check failed:`, error.message);
    return null;
  }
}

/**
 * Step 3: Start Google import
 */
async function startGoogleImport() {
  console.log('🚀 Step 3: Starting Google import...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/contacts/import/google/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`   ❌ Failed to start import (${response.status}):`, data.error || JSON.stringify(data));
      
      if (data.error?.includes('not configured')) {
        console.log('\n   💡 Google OAuth is not configured. You need to:');
        console.log('      1. Create OAuth credentials in Google Cloud Console');
        console.log('      2. Add GOOGLE_CLIENT_ID to Vercel environment');
        console.log('      3. Add GOOGLE_CLIENT_SECRET to Vercel environment');
        console.log('      See: GOOGLE_CONTACTS_IMPORT_SETUP.md\n');
      }
      
      return null;
    }

    console.log(`   ✅ Import job created`);
    console.log(`   Job ID: ${data.job_id}`);
    console.log(`   Provider: ${data.provider}`);
    console.log(`\n   🔗 Authorization URL:`);
    console.log(`   ${data.authorization_url}\n`);
    console.log('   📝 Next steps:');
    console.log('      1. Open the URL above in your browser');
    console.log('      2. Sign in with your Google account');
    console.log('      3. Grant permissions to access contacts');
    console.log('      4. You will be redirected back to the app\n');
    
    return data;
  } catch (error) {
    console.error(`   ❌ Start import failed:`, error.message);
    return null;
  }
}

/**
 * Step 4: List import jobs
 */
async function listImportJobs() {
  console.log('📋 Step 4: Listing import jobs...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/contacts/import/list?limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`List jobs failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`   ✅ Found ${data.jobs.length} import job(s)\n`);
    
    if (data.jobs.length > 0) {
      console.log('   Recent imports:');
      data.jobs.slice(0, 5).forEach((job, i) => {
        const status = job.status === 'completed' ? '✅' : 
                      job.status === 'failed' ? '❌' : 
                      job.status === 'processing' ? '⏳' : '⏸️ ';
        console.log(`      ${i + 1}. ${status} ${job.provider} - ${job.status}`);
        if (job.imported_contacts > 0) {
          console.log(`         Imported: ${job.imported_contacts}, Skipped: ${job.skipped_contacts || 0}`);
        }
        console.log(`         Started: ${new Date(job.started_at).toLocaleString()}`);
      });
      console.log('');
    }
    
    return data;
  } catch (error) {
    console.error(`   ❌ List jobs failed:`, error.message);
    return null;
  }
}

/**
 * Step 5: Check job status (if job ID provided)
 */
async function checkJobStatus(jobId) {
  if (!jobId) return null;
  
  console.log(`🔍 Step 5: Checking job status (${jobId})...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/contacts/import/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`   Status: ${data.status}`);
    console.log(`   Progress: ${data.progress_percent || 0}%`);
    
    if (data.total_contacts) {
      console.log(`   Total: ${data.total_contacts}`);
      console.log(`   Imported: ${data.imported_contacts || 0}`);
      console.log(`   Skipped: ${data.skipped_contacts || 0}`);
      console.log(`   Failed: ${data.failed_contacts || 0}`);
    }
    
    if (data.provider_account_name) {
      console.log(`   Account: ${data.provider_account_name}`);
    }
    
    if (data.error_message) {
      console.log(`   ❌ Error: ${data.error_message}`);
    }
    
    console.log('');
    return data;
  } catch (error) {
    console.error(`   ❌ Status check failed:`, error.message);
    return null;
  }
}

/**
 * Step 6: Verify contact was actually created
 */
async function verifyContactCreated(jobId) {
  console.log(`🔍 Step 6: Verifying contact was created in database...`);
  
  try {
    // Note: This requires Supabase service role key to query directly
    // For production, you'd use the API endpoint
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SERVICE_KEY) {
      console.log('   ⚠️  Cannot verify - SUPABASE_SERVICE_ROLE_KEY not set');
      console.log('   Check manually in the frontend or database\n');
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/imported_contacts?import_job_id=eq.${jobId}&select=contact_id,action,contacts(display_name,emails)`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });

    const data = await response.json();
    
    if (data && data.length > 0) {
      console.log(`   ✅ Found ${data.length} imported contact(s):\n`);
      data.forEach((item, i) => {
        const contact = item.contacts;
        console.log(`      ${i + 1}. ${contact?.display_name || 'Unknown'}`);
        console.log(`         Email: ${contact?.emails?.[0] || 'none'}`);
        console.log(`         Action: ${item.action}`);
        console.log(`         Contact ID: ${item.contact_id}`);
      });
      console.log('');
      return data;
    } else {
      console.log('   ⚠️  No contacts found in database');
      console.log('   This may indicate the import failed to save contacts\n');
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Verification failed:`, error.message);
    return null;
  }
}

/**
 * Wait for user to complete OAuth and poll for completion
 */
async function waitForImportCompletion(jobId) {
  console.log('\n⏳ Waiting for you to complete OAuth authorization...');
  console.log('   Press ENTER after you\'ve been redirected back to the app\n');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  console.log('\n🔄 Polling for import completion...\n');
  
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max
  
  while (attempts < maxAttempts) {
    const status = await checkJobStatus(jobId);
    
    if (status?.status === 'completed') {
      console.log('   ✅ Import completed successfully!\n');
      return status;
    } else if (status?.status === 'failed') {
      console.log('   ❌ Import failed\n');
      if (status.error_message) {
        console.log(`   Error: ${status.error_message}\n`);
      }
      return status;
    }
    
    // Still processing
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('   ⏱️  Timeout waiting for import to complete\n');
  return null;
}

/**
 * Main test flow
 */
async function main() {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive') || args.includes('-i');
  
  try {
    // Step 1: Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.log('\n❌ Test failed: Authentication error\n');
      process.exit(1);
    }

    // Step 2: Check health
    const health = await checkProviderHealth();
    
    // Step 3: Start import (if Google is configured)
    const importJob = await startGoogleImport();
    
    // Step 4: List jobs
    const jobs = await listImportJobs();
    
    // Step 5: Check initial status
    if (importJob?.job_id) {
      await checkJobStatus(importJob.job_id);
    }

    // Interactive mode: Wait for OAuth completion
    if (interactive && importJob?.job_id) {
      const finalStatus = await waitForImportCompletion(importJob.job_id);
      
      // Step 6: Verify contact was created
      if (finalStatus?.status === 'completed') {
        await verifyContactCreated(importJob.job_id);
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ Test Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Summary
    if (!health?.providers?.google?.configured) {
      console.log('⚠️  Google OAuth not configured - some tests skipped');
      console.log('   To enable: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Vercel\n');
    } else if (importJob) {
      if (interactive) {
        console.log('✅ Full end-to-end import test completed');
      } else {
        console.log('✅ Google import endpoint working');
        console.log('   Complete the OAuth flow in your browser to import contacts');
        console.log('   Run with --interactive flag to wait for completion\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main();
