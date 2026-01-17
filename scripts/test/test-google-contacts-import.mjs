/**
 * Test Google Contacts Import from Backend
 * 
 * This script tests the Google People API to import contacts
 * Requires Google OAuth2 credentials
 * 
 * Usage:
 *   node test-google-contacts-import.mjs
 */

import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/contacts/import/google/callback';

// Test user credentials (OAuth refresh token)
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

console.log('========================================');
console.log('  Google Contacts Import Test');
console.log('========================================\n');

// Step 1: Check environment variables
console.log('📋 Step 1: Checking Configuration...\n');

if (!GOOGLE_CLIENT_ID) {
  console.error('❌ Missing GOOGLE_CLIENT_ID environment variable');
  console.log('   Get it from: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

if (!GOOGLE_CLIENT_SECRET) {
  console.error('❌ Missing GOOGLE_CLIENT_SECRET environment variable');
  process.exit(1);
}

if (!GOOGLE_REFRESH_TOKEN) {
  console.log('⚠️  No GOOGLE_REFRESH_TOKEN provided');
  console.log('   You need to complete OAuth flow first to get a refresh token');
  console.log('\n   Authorization URL:');
  const authUrl = getAuthorizationUrl();
  console.log(`   ${authUrl}\n`);
  console.log('   After authorizing, exchange the code for tokens');
  process.exit(0);
}

console.log('✅ Configuration loaded');
console.log(`   Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
console.log(`   Redirect URI: ${GOOGLE_REDIRECT_URI}\n`);

// Step 2: Get access token using refresh token
console.log('🔑 Step 2: Getting Access Token...\n');

let accessToken;
try {
  accessToken = await refreshAccessToken(GOOGLE_REFRESH_TOKEN);
  console.log('✅ Access token obtained\n');
} catch (error) {
  console.error('❌ Failed to get access token:', error.message);
  process.exit(1);
}

// Step 3: Fetch contacts from Google People API
console.log('📥 Step 3: Fetching Contacts from Google...\n');

try {
  const contacts = await fetchGoogleContacts(accessToken);
  console.log(`✅ Fetched ${contacts.length} contacts\n`);
  
  // Step 4: Display sample contacts
  console.log('👥 Step 4: Sample Contacts:\n');
  
  if (contacts.length === 0) {
    console.log('   No contacts found in Google account\n');
  } else {
    const sample = contacts.slice(0, 5);
    sample.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.name || '(No name)'}`);
      if (contact.emails?.length) {
        console.log(`      Email: ${contact.emails[0]}`);
      }
      if (contact.phones?.length) {
        console.log(`      Phone: ${contact.phones[0]}`);
      }
      console.log('');
    });
    
    if (contacts.length > 5) {
      console.log(`   ... and ${contacts.length - 5} more\n`);
    }
  }
  
  // Step 5: Show statistics
  console.log('📊 Step 5: Import Statistics:\n');
  const stats = analyzeContacts(contacts);
  console.log(`   Total Contacts: ${stats.total}`);
  console.log(`   With Email: ${stats.withEmail} (${Math.round(stats.withEmail / stats.total * 100)}%)`);
  console.log(`   With Phone: ${stats.withPhone} (${Math.round(stats.withPhone / stats.total * 100)}%)`);
  console.log(`   With Address: ${stats.withAddress} (${Math.round(stats.withAddress / stats.total * 100)}%)`);
  console.log(`   With Photo: ${stats.withPhoto} (${Math.round(stats.withPhoto / stats.total * 100)}%)`);
  console.log('');
  
  console.log('========================================');
  console.log('✅ Test Complete!');
  console.log('========================================\n');
  
} catch (error) {
  console.error('❌ Failed to fetch contacts:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate OAuth authorization URL
 */
function getAuthorizationUrl() {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/contacts.readonly');
  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent`;
}

/**
 * Exchange refresh token for access token
 */
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Exchange authorization code for tokens (for initial setup)
 */
async function exchangeCodeForTokens(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      code: code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return await response.json();
}

/**
 * Fetch contacts from Google People API
 */
async function fetchGoogleContacts(accessToken) {
  let contacts = [];
  let pageToken = null;
  let pageNum = 1;

  do {
    console.log(`   Fetching page ${pageNum}...`);
    
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.append('personFields', 'names,emailAddresses,phoneNumbers,addresses,photos,organizations,birthdays');
    url.searchParams.append('pageSize', '1000'); // Max allowed
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.connections) {
      const pageContacts = data.connections.map(parseContact);
      contacts = contacts.concat(pageContacts);
      console.log(`   ✓ Page ${pageNum}: ${pageContacts.length} contacts`);
    }

    pageToken = data.nextPageToken;
    pageNum++;
  } while (pageToken);

  return contacts;
}

/**
 * Parse Google contact into simplified format
 */
function parseContact(person) {
  const contact = {
    resourceName: person.resourceName,
    etag: person.etag,
    name: null,
    emails: [],
    phones: [],
    addresses: [],
    organization: null,
    title: null,
    photoUrl: null,
    birthday: null,
  };

  // Name
  if (person.names && person.names.length > 0) {
    const name = person.names[0];
    contact.name = name.displayName;
    contact.givenName = name.givenName;
    contact.familyName = name.familyName;
  }

  // Emails
  if (person.emailAddresses) {
    contact.emails = person.emailAddresses
      .map(e => e.value)
      .filter(Boolean);
  }

  // Phone numbers
  if (person.phoneNumbers) {
    contact.phones = person.phoneNumbers
      .map(p => p.value)
      .filter(Boolean);
  }

  // Addresses
  if (person.addresses) {
    contact.addresses = person.addresses
      .map(a => a.formattedValue)
      .filter(Boolean);
  }

  // Organization
  if (person.organizations && person.organizations.length > 0) {
    const org = person.organizations[0];
    contact.organization = org.name;
    contact.title = org.title;
  }

  // Photo
  if (person.photos && person.photos.length > 0) {
    contact.photoUrl = person.photos[0].url;
  }

  // Birthday
  if (person.birthdays && person.birthdays.length > 0) {
    const bd = person.birthdays[0].date;
    if (bd) {
      contact.birthday = `${bd.year || '0000'}-${String(bd.month || 1).padStart(2, '0')}-${String(bd.day || 1).padStart(2, '0')}`;
    }
  }

  return contact;
}

/**
 * Analyze contacts for statistics
 */
function analyzeContacts(contacts) {
  return {
    total: contacts.length,
    withEmail: contacts.filter(c => c.emails?.length > 0).length,
    withPhone: contacts.filter(c => c.phones?.length > 0).length,
    withAddress: contacts.filter(c => c.addresses?.length > 0).length,
    withPhoto: contacts.filter(c => c.photoUrl).length,
  };
}

/**
 * CLI helper to exchange authorization code
 */
if (process.argv[2] === '--exchange-code' && process.argv[3]) {
  const code = process.argv[3];
  console.log('🔑 Exchanging authorization code for tokens...\n');
  
  exchangeCodeForTokens(code)
    .then(tokens => {
      console.log('✅ Tokens obtained!\n');
      console.log('Add these to your .env file:\n');
      console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('');
      console.log('Note: You only need the refresh_token for long-term use');
    })
    .catch(error => {
      console.error('❌ Failed to exchange code:', error.message);
      process.exit(1);
    });
}
